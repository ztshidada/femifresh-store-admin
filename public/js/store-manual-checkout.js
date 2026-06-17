
(function(){
  const MANUAL_EMAIL = "femifresh02@gmail.com";
  const MESSAGE = "Online payment is paused while Yoco reviews femifresh.co.za. Your order can still be placed. Send POP to WhatsApp 0632180372 with your order number. Please make immediate payment. If payment is delayed, your approval process may take up to 7 working days.";

  function showManualBox(order){
    if (document.getElementById("ffManualStorePaymentBox")) return;

    const box = document.createElement("div");
    box.id = "ffManualStorePaymentBox";
    box.style.cssText = "margin:18px 0;padding:18px 20px;border-radius:22px;background:#fff1fa;border:1px solid rgba(104,35,95,.16);color:#35112f;font-family:Inter,system-ui;box-shadow:0 14px 34px rgba(104,35,95,.10);";

    const orderNo = order && (order.orderNumber || order.orderNo || order.reference || order.id);

    box.innerHTML = `
      <strong>Manual payment for now</strong><br>
      Online payment is paused while Yoco reviews the website.<br><br>
      ${orderNo ? "<strong>Order number:</strong> " + orderNo + "<br>" : ""}
      Bank: <strong>FNB</strong><br>
      Account Name: <strong>Femi Fresh (PTY) LTD</strong><br>
      Account Type: <strong>FNB Business Account</strong><br>
      Account Number: <strong>63214749822</strong><br><br>
      Please send proof of payment to WhatsApp:<br>
      <strong>${MANUAL_EMAIL}</strong><br>
      WhatsApp POP: <strong>0632180372</strong><br><br>
      Use your order number or phone number as reference.<br><br><strong>Please make immediate payment. If payment is delayed, your approval process may take up to 7 working days.</strong>
    `;

    const paymentSection =
      document.querySelector("#payment") ||
      document.querySelector(".payment") ||
      document.querySelector("form") ||
      document.body;

    paymentSection.prepend(box);
  }

  function removeYocoText(){
    document.querySelectorAll("*").forEach(el => {
      if (!el.children.length && el.textContent && el.textContent.includes("Yoco payment will be connected")) {
        el.textContent = "Online payment is paused while Yoco reviews the website. Place your order and send POP to WhatsApp 0632180372.";
      }
    });
  }

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async function(input, init){
    const res = await nativeFetch(input, init);

    try{
      const url = String(typeof input === "string" ? input : (input && input.url) || "");

      if (url.includes("/api/orders") || url.includes("/api/checkout") || url.includes("/checkout")) {
        const clone = res.clone();
        const data = await clone.json().catch(() => null);

        if (data && typeof data === "object") {
          const order = data.order || data.data || data;

          if (data.checkoutUrl || data.paymentUrl || data.yocoUrl || data.redirectUrl) {
            const cleaned = {
              ...data,
              checkoutUrl: null,
              paymentUrl: null,
              yocoUrl: null,
              redirectUrl: null,
              paymentMode: "manual",
              paymentStatus: "pending",
              message: MESSAGE,
              manualPayment: {
                email: MANUAL_EMAIL,
                instruction: MESSAGE
              }
            };

            setTimeout(() => {
              showManualBox(order);
              alert(MESSAGE);
            }, 250);

            return new Response(JSON.stringify(cleaned), {
              status: res.status,
              statusText: res.statusText,
              headers: { "Content-Type": "application/json" }
            });
          }
        }
      }
    }catch(e){}

    return res;
  };

  document.addEventListener("DOMContentLoaded", function(){
    removeYocoText();

    const paymentArea =
      document.querySelector("#payment") ||
      document.querySelector(".payment") ||
      document.querySelector("form");

    if (paymentArea && !document.getElementById("ffManualStorePaymentBox")) {
      showManualBox();
    }
  });
})();
