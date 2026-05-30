const fs = require("fs");
const path = require("path");

const serverFile = path.join(__dirname, "server.js");
const storeJsFile = path.join(__dirname, "public/js/store.js");
const thankYouFile = path.join(__dirname, "public/thank-you.html");

let server = fs.readFileSync(serverFile, "utf8");

/* Add Yoco helper functions */
if (!server.includes("async function createYocoCheckout")) {
  server = server.replace(
`function money(n) { return Number(n || 0); }`,
`function money(n) { return Number(n || 0); }

function getAppUrl(req) {
  return (process.env.APP_URL || \`\${req.protocol}://\${req.get("host")}\`).replace(/\\/$/, "");
}

function cents(amount) {
  return Math.round(Number(amount || 0) * 100);
}

function yocoHeaders() {
  const key = process.env.YOCO_SECRET_KEY || "";
  return {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + key
  };
}

async function createYocoCheckout(order, req) {
  if (!process.env.YOCO_SECRET_KEY) {
    return {
      success: false,
      mode: "missing_key",
      checkoutUrl: \`/thank-you.html?order=\${order.orderNumber}\`
    };
  }

  const appUrl = getAppUrl(req);

  const body = {
    amount: cents(order.total),
    currency: "ZAR",
    successUrl: \`\${appUrl}/thank-you.html?order=\${encodeURIComponent(order.orderNumber)}&payment=success\`,
    cancelUrl: \`\${appUrl}/checkout.html?order=\${encodeURIComponent(order.orderNumber)}&payment=cancelled\`,
    failureUrl: \`\${appUrl}/checkout.html?order=\${encodeURIComponent(order.orderNumber)}&payment=failed\`,
    metadata: {
      orderNumber: order.orderNumber,
      orderId: order.id,
      customerEmail: order.customer.email,
      customerName: order.customer.name || ""
    }
  };

  const response = await fetch("https://payments.yoco.com/api/checkouts", {
    method: "POST",
    headers: yocoHeaders(),
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      success: false,
      mode: "yoco_error",
      status: response.status,
      error: data,
      checkoutUrl: \`/thank-you.html?order=\${order.orderNumber}\`
    };
  }

  const redirectUrl =
    data.redirectUrl ||
    data.redirect_url ||
    data.checkoutUrl ||
    data.checkout_url ||
    data.url;

  return {
    success: true,
    data,
    checkoutUrl: redirectUrl || \`/thank-you.html?order=\${order.orderNumber}\`
  };
}

function extractYocoRefs(event) {
  const refs = [
    event?.metadata?.orderNumber,
    event?.payload?.metadata?.orderNumber,
    event?.data?.metadata?.orderNumber,
    event?.data?.object?.metadata?.orderNumber,
    event?.object?.metadata?.orderNumber,
    event?.orderNumber
  ].filter(Boolean);

  return [...new Set(refs)];
}

function isYocoPaidEvent(event) {
  const text = JSON.stringify(event || {}).toLowerCase();

  return (
    text.includes("payment.succeeded") ||
    text.includes("payment_succeeded") ||
    text.includes("checkout.succeeded") ||
    text.includes("checkout_succeeded") ||
    text.includes('"status":"succeeded"') ||
    text.includes('"status":"successful"') ||
    text.includes('"status":"paid"')
  );
}`
  );
}

/* Replace create order response so it creates Yoco checkout */
if (!server.includes("const yocoCheckout = await createYocoCheckout(order, req);")) {
  server = server.replace(
`await notifyOrder(order, 'received');
    res.json({ success: true, order, checkoutUrl: \`/thank-you.html?order=\${order.orderNumber}\` });`,
`await notifyOrder(order, 'received');

    const yocoCheckout = await createYocoCheckout(order, req);

    const paymentLogs = read('paymentLogs', []);
    paymentLogs.unshift({
      id: uuid(),
      provider: 'yoco',
      type: 'checkout_create',
      orderNumber: order.orderNumber,
      success: yocoCheckout.success,
      mode: yocoCheckout.mode || process.env.YOCO_MODE || 'live',
      status: yocoCheckout.status || 200,
      error: yocoCheckout.error || null,
      response: yocoCheckout.data || null,
      createdAt: new Date().toISOString()
    });
    write('paymentLogs', paymentLogs.slice(0, 500));

    res.json({
      success: true,
      order,
      payment: yocoCheckout.success ? 'yoco' : 'placeholder',
      checkoutUrl: yocoCheckout.checkoutUrl,
      yoco: yocoCheckout
    });`
  );
}

/* Replace placeholder Yoco create-checkout route */
server = server.replace(
/app\.post\('\/api\/payments\/yoco\/create-checkout'[\s\S]*?\n\}\);/,
`app.post('/api/payments/yoco/create-checkout', async (req, res) => {
  try {
    const { orderNumber } = req.body;
    const orders = read('orders', []);
    const order = orders.find(o => o.orderNumber === orderNumber);

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const yocoCheckout = await createYocoCheckout(order, req);

    const logs = read('paymentLogs', []);
    logs.unshift({
      id: uuid(),
      provider: 'yoco',
      type: 'manual_checkout_create',
      orderNumber: order.orderNumber,
      success: yocoCheckout.success,
      mode: yocoCheckout.mode || process.env.YOCO_MODE || 'live',
      status: yocoCheckout.status || 200,
      error: yocoCheckout.error || null,
      response: yocoCheckout.data || null,
      createdAt: new Date().toISOString()
    });
    write('paymentLogs', logs.slice(0, 500));

    res.json({
      success: yocoCheckout.success,
      checkoutUrl: yocoCheckout.checkoutUrl,
      yoco: yocoCheckout
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});`
);

/* Replace webhook route with stronger one */
server = server.replace(
/app\.post\('\/api\/webhooks\/yoco'[\s\S]*?\n\}\);/,
`app.post('/api/webhooks/yoco', express.json({ type: '*/*' }), async (req, res) => {
  try {
    const event = req.body || {};

    const logs = read('paymentLogs', []);
    logs.unshift({
      id: uuid(),
      provider: 'yoco',
      type: 'webhook',
      event,
      headers: {
        signature: req.headers['webhook-signature'] || req.headers['x-yoco-signature'] || req.headers['x-signature'] || ''
      },
      createdAt: new Date().toISOString()
    });
    write('paymentLogs', logs.slice(0, 500));

    const refs = extractYocoRefs(event);
    const paid = isYocoPaidEvent(event);

    if (refs.length && paid) {
      const orders = read('orders', []);
      const idx = orders.findIndex(o => refs.includes(o.orderNumber) || refs.includes(o.id));

      if (idx >= 0) {
        orders[idx].paymentStatus = 'paid';
        orders[idx].fulfillmentStatus = orders[idx].fulfillmentStatus || 'new';
        orders[idx].paidAt = new Date().toISOString();
        orders[idx].updatedAt = new Date().toISOString();

        orders[idx].notes = Array.isArray(orders[idx].notes) ? orders[idx].notes : [];
        orders[idx].notes.push({
          type: 'payment',
          message: 'Payment confirmed by Yoco webhook',
          createdAt: new Date().toISOString()
        });

        write('orders', orders);
      }
    }

    res.json({ success: true, received: true, paid, refs });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});`
);

fs.writeFileSync(serverFile, server);

/* Improve thank-you page message */
let thank = fs.readFileSync(thankYouFile, "utf8");
thank = thank.replace(
  "Your FemiFresh order has been received successfully.",
  "Your order has been received. If your payment was successful, the order will be marked as paid automatically."
);
fs.writeFileSync(thankYouFile, thank);

/* Make submitOrder redirect to Yoco checkout URL */
let js = fs.readFileSync(storeJsFile, "utf8");

js = js.replaceAll(
`localStorage.setItem("ff_last_order", JSON.stringify(res.order));
  cart.clear();
  location.href = res.checkoutUrl;`,
`localStorage.setItem("ff_last_order", JSON.stringify(res.order));
  cart.clear();

  if (res.payment === "placeholder") {
    alert("Order created, but Yoco is not fully connected yet. Check Render YOCO_SECRET_KEY.");
  }

  location.href = res.checkoutUrl;`
);

fs.writeFileSync(storeJsFile, js);

console.log("Yoco checkout and webhook patch completed.");
