
(function(){
  const BANK = {
    bank:"FNB",
    name:"Femi Fresh (PTY) LTD",
    type:"FNB Business Account",
    number:"63214749822",
    whatsapp:"0632180372",
    email:"femifresh02@gmail.com"
  };

  function addHeaderSearch(){
    const nav =
      document.querySelector(".ff-nav") ||
      document.querySelector(".nav") ||
      document.querySelector("header");

    if(!nav || document.querySelector(".ff-header-search")) return;

    const links =
      document.querySelector(".ff-navlinks") ||
      document.querySelector(".navlinks");

    const search = document.createElement("div");
    search.className = "ff-header-search";
    search.innerHTML = '<input id="ffGlobalSearch" placeholder="Search products...">';

    if(links) nav.insertBefore(search, links);
    else nav.appendChild(search);

    search.querySelector("input").addEventListener("keydown", function(e){
      if(e.key === "Enter"){
        const q = encodeURIComponent(this.value.trim());
        if(q) location.href = "/products.html?search=" + q;
      }
    });
  }

  function addManualPaymentCard(){
    if(document.querySelector(".ff-manual-payment-card")) return;

    const checkoutArea =
      document.querySelector(".payment") ||
      document.querySelector("#payment") ||
      document.querySelector("form");

    if(!checkoutArea) return;

    const card = document.createElement("div");
    card.className = "ff-manual-payment-card";
    card.innerHTML = `
      <h3>Manual Payment Details</h3>
      <div class="ff-bank-row"><span>Bank</span><span>${BANK.bank}</span></div>
      <div class="ff-bank-row"><span>Account Name</span><span>${BANK.name}</span></div>
      <div class="ff-bank-row"><span>Account Type</span><span>${BANK.type}</span></div>
      <div class="ff-bank-row"><span>Account Number</span><span>${BANK.number}</span></div>
      <div class="ff-bank-row"><span>POP WhatsApp</span><span>${BANK.whatsapp}</span></div>
      <div class="ff-bank-row"><span>Reference</span><span>Use your order number</span></div>
      <p style="margin:14px 0 0;font-weight:800;">Please make immediate payment. If payment is delayed, your order approval process may take up to 7 working days.</p>
    `;

    checkoutArea.appendChild(card);
  }

  function improveThankYou(){
    if(!location.pathname.includes("thank")) return;

    const text = document.body.innerText;
    const match = text.match(/order\s*(number|no|#)?\s*[:#]?\s*([A-Z]*[- ]?\d+)/i);
    const orderNo = match ? match[2].replace(/\s+/g,"") : "";

    if(orderNo && !document.querySelector(".ff-order-number-chip")){
      const chip = document.createElement("div");
      chip.className = "ff-order-number-chip";
      chip.textContent = "Order Number: " + orderNo;

      const target = document.querySelector("h1,h2") || document.body.firstElementChild;
      if(target) target.insertAdjacentElement("afterend", chip);
    }

    if(!document.querySelector(".ff-manual-payment-card")){
      const card = document.createElement("div");
      card.className = "ff-manual-payment-card";
      card.style.maxWidth = "760px";
      card.style.margin = "24px auto";
      card.innerHTML = `
        <h3>Next Step: Send POP</h3>
        <div class="ff-bank-row"><span>Bank</span><span>${BANK.bank}</span></div>
        <div class="ff-bank-row"><span>Account Name</span><span>${BANK.name}</span></div>
        <div class="ff-bank-row"><span>Account Number</span><span>${BANK.number}</span></div>
        <div class="ff-bank-row"><span>POP WhatsApp</span><span>${BANK.whatsapp}</span></div>
        <div class="ff-bank-row"><span>Reference</span><span>${orderNo || "Use your order number"}</span></div>
        <p style="font-weight:800;">Please make immediate payment. If payment is delayed, your order approval process may take up to 7 working days.</p>
      `;
      document.body.appendChild(card);
    }
  }

  function cleanOrderNumbers(){
    document.querySelectorAll("*").forEach(el => {
      if(el.children.length) return;
      const t = el.textContent || "";
      const m = t.match(/Order number[:\s]+(\d{1,4})\b/i);
      if(m){
        const n = Number(m[1]);
        if(n > 0 && n < 10000){
          el.textContent = t.replace(m[1], "FF-" + String(10000 + n).padStart(5,"0"));
        }
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function(){
    addHeaderSearch();

    if(location.pathname.includes("checkout")){
      addManualPaymentCard();
    }

    improveThankYou();
    cleanOrderNumbers();
  });
})();
