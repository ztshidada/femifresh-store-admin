
(function(){
  const BANK = {
    bank:"FNB",
    name:"Femi Fresh (PTY) LTD",
    type:"FNB Business Account",
    number:"63214749822",
    whatsapp:"0632180372",
    email:"femifresh02@gmail.com"
  };

  function isAdminOrAffiliate(){
    return location.pathname.includes("/admin/") || location.hostname.includes("affiliates.");
  }

  function makeHeader(){
    if(isAdminOrAffiliate()) return;
    if(document.querySelector(".ff-clean-header")) return;

    const header = document.createElement("header");
    header.className = "ff-clean-header";
    header.innerHTML = `
      <nav class="ff-clean-nav">
        <a class="ff-clean-brand" href="/">
          <img src="/images/femifresh-logo.jpg" alt="FemiFresh">
          <span>FemiFresh</span>
        </a>

        <div class="ff-clean-search">
          <input placeholder="Search products..." id="ffCleanSearch">
        </div>

        <button class="ff-clean-menu" type="button" aria-label="Menu">☰</button>

        <div class="ff-clean-links">
          <a href="/">Home</a>
          <a href="/products.html">Products</a>
          <a href="/policies.html">Policy</a>
          <a href="/contact.html">Contact</a>
          <a href="/cart.html" class="ff-clean-cart">🛒</a>
        </div>
      </nav>
    `;

    document.body.prepend(header);
    document.body.classList.add("ff-has-clean-header");

    const btn = header.querySelector(".ff-clean-menu");
    const links = header.querySelector(".ff-clean-links");

    if(btn && links){
      btn.addEventListener("click", () => links.classList.toggle("open"));
    }

    const search = header.querySelector("#ffCleanSearch");
    if(search){
      search.addEventListener("keydown", e => {
        if(e.key === "Enter"){
          const q = encodeURIComponent(search.value.trim());
          if(q) location.href = "/products.html?search=" + q;
        }
      });
    }
  }

  function makeFooter(){
    if(isAdminOrAffiliate()) return;
    if(document.querySelector(".ff-clean-footer")) return;

    const footer = document.createElement("footer");
    footer.className = "ff-clean-footer";
    footer.innerHTML = `
      <div class="ff-footer-inner">
        <div>
          <div class="ff-footer-brand">
            <img src="/images/femifresh-logo.jpg" alt="FemiFresh">
            <span>FemiFresh</span>
          </div>
          <p>Premium feminine-care products created for freshness, comfort and everyday confidence.</p>
        </div>

        <div>
          <h3>Need Assistance?</h3>
          <p><a href="/contact.html">Contact us</a></p>
          <p><a href="/policies.html">Policies</a></p>
          <p><a href="/products.html">All Products</a></p>
        </div>

        <div>
          <h3>Manual Payment</h3>
          <p>Send POP to WhatsApp: <strong>0632180372</strong></p>
          <p>Bank: FNB</p>
          <p>Account: 63214749822</p>
        </div>
      </div>
      <div class="ff-footer-bottom">© 2026 FemiFresh. All rights reserved.</div>
    `;

    document.body.appendChild(footer);
    document.body.classList.add("ff-has-clean-footer");
  }

  function manualCard(orderNo){
    return `
      <div class="ff-manual-card">
        <h3>Manual Payment Details</h3>
        <div class="ff-bank-row"><span>Bank</span><span>${BANK.bank}</span></div>
        <div class="ff-bank-row"><span>Account Name</span><span>${BANK.name}</span></div>
        <div class="ff-bank-row"><span>Account Type</span><span>${BANK.type}</span></div>
        <div class="ff-bank-row"><span>Account Number</span><span>${BANK.number}</span></div>
        <div class="ff-bank-row"><span>POP WhatsApp</span><span>${BANK.whatsapp}</span></div>
        <div class="ff-bank-row"><span>Reference</span><span>${orderNo || "Use your order number"}</span></div>
        <p style="font-weight:850;margin:14px 0 0;">
          Please make immediate payment. If payment is delayed, your approval process may take up to 7 working days.
        </p>
      </div>
    `;
  }

  function addCheckoutManualCard(){
    if(!location.pathname.includes("checkout")) return;
    if(document.querySelector(".ff-manual-card")) return;

    const target =
      document.querySelector(".payment") ||
      document.querySelector("#payment") ||
      document.querySelector("form") ||
      document.querySelector("main");

    if(target){
      const div = document.createElement("div");
      div.innerHTML = manualCard("");
      target.appendChild(div.firstElementChild);
    }
  }

  function orderNumberFrom(order){
    const raw = order && (order.orderNumber || order.orderNo || order.reference || order.id);
    if(!raw) return "FF-10001";
    const s = String(raw);
    if(s.startsWith("FF-")) return s;
    const digits = s.match(/\d+/);
    if(!digits) return "FF-10001";
    const n = Number(digits[0]);
    if(n >= 10000) return "FF-" + n;
    return "FF-" + String(10000 + n).padStart(5,"0");
  }

  function saveOrder(order){
    if(!order) return;
    const no = orderNumberFrom(order);
    localStorage.setItem("femiLastOrder", JSON.stringify({...order, cleanOrderNumber:no}));
    localStorage.setItem("femiLastOrderNumber", no);
  }

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async function(input, init){
    const res = await nativeFetch(input, init);

    try{
      const url = String(typeof input === "string" ? input : (input && input.url) || "");

      if(url.includes("/api/orders") || url.includes("/api/checkout")){
        const clone = res.clone();
        const data = await clone.json().catch(() => null);

        if(data && typeof data === "object"){
          const order = data.order || data.data || data;
          const orderNo = orderNumberFrom(order);
          saveOrder(order);

          const thankUrl = "/thank-you.html?order=" + encodeURIComponent(orderNo);

          return new Response(JSON.stringify({
            ...data,
            checkoutUrl: thankUrl,
            paymentUrl: thankUrl,
            redirectUrl: thankUrl,
            yocoUrl: null,
            paymentMode:"manual",
            paymentStatus:"pending",
            manualPayment:{
              bank:BANK.bank,
              accountName:BANK.name,
              accountNumber:BANK.number,
              whatsapp:BANK.whatsapp,
              reference:orderNo
            },
            message:"Order created. Please make manual payment and send POP to WhatsApp " + BANK.whatsapp + "."
          }), {
            status:res.status,
            statusText:res.statusText,
            headers:{"Content-Type":"application/json"}
          });
        }
      }
    }catch(e){}

    return res;
  };

  function renderThankYou(){
    if(!location.pathname.includes("thank")) return;

    const params = new URLSearchParams(location.search);
    let orderNo = params.get("order") || localStorage.getItem("femiLastOrderNumber") || "FF-10001";

    if(orderNo === "null" || orderNo === "undefined"){
      orderNo = localStorage.getItem("femiLastOrderNumber") || "FF-10001";
    }

    let order = {};
    try{ order = JSON.parse(localStorage.getItem("femiLastOrder") || "{}"); }catch(e){}

    document.body.innerHTML = "";
    makeHeader();

    const page = document.createElement("main");
    page.className = "ff-thankyou-page";
    page.innerHTML = `
      <section class="ff-thankyou-card">
        <h1>Thank you.</h1>
        <p style="color:#6f6372;font-size:18px;line-height:1.65;">
          Your order has been created successfully. Please complete manual payment and send proof of payment.
        </p>

        <div class="ff-order-chip">Order Number: ${orderNo}</div>

        <div style="margin-top:22px;">
          <h2 style="color:#35112f;">Order Summary</h2>
          <p><strong>Total:</strong> ${order.total ? "R" + Number(order.total).toLocaleString("en-ZA",{minimumFractionDigits:2}) : "Check your order total"}</p>
          <p><strong>Payment Method:</strong> Manual Payment</p>
          <p><strong>Status:</strong> Pending payment confirmation</p>
        </div>

        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:24px;">
          <a class="ff-primary-btn" href="https://wa.me/27632180372">Send POP on WhatsApp</a>
          <a class="ff-light-btn" href="/products.html">Continue Shopping</a>
        </div>
      </section>

      <aside class="ff-thankyou-card">
        ${manualCard(orderNo)}
      </aside>
    `;

    document.body.appendChild(page);
    makeFooter();
  }

  function boot(){
    if(!document.body) return setTimeout(boot, 30);

    if(location.pathname.includes("thank")){
      renderThankYou();
      return;
    }

    makeHeader();
    makeFooter();
    addCheckoutManualCard();
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
