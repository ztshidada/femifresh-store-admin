
(function () {
  if (document.getElementById("ff-affiliate-store-buttons")) return;

  const wrap = document.createElement("div");
  wrap.id = "ff-affiliate-store-buttons";
  wrap.innerHTML = `
    <a class="ff-store-aff-btn primary" href="https://affiliates.femifresh.co.za">Become an Affiliate</a>
    <a class="ff-store-aff-btn secondary" href="https://affiliates.femifresh.co.za/login">Affiliate Back Office</a>
  `;

  const style = document.createElement("style");
  style.textContent = `
    #ff-affiliate-store-buttons {
      position: fixed;
      right: 18px;
      bottom: 18px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: flex-end;
      font-family: Arial, sans-serif;
    }

    .ff-store-aff-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      border-radius: 999px;
      padding: 12px 18px;
      font-weight: 900;
      font-size: 14px;
      box-shadow: 0 12px 30px rgba(89, 31, 83, 0.22);
      transition: transform .2s ease, opacity .2s ease;
      white-space: nowrap;
    }

    .ff-store-aff-btn:hover {
      transform: translateY(-2px);
      opacity: .95;
    }

    .ff-store-aff-btn.primary {
      background: #6b1f64;
      color: #fff;
    }

    .ff-store-aff-btn.secondary {
      background: #fff;
      color: #6b1f64;
      border: 1px solid rgba(107, 31, 100, .25);
    }

    @media (max-width: 650px) {
      #ff-affiliate-store-buttons {
        left: 12px;
        right: 12px;
        bottom: 12px;
        align-items: stretch;
      }

      .ff-store-aff-btn {
        width: 100%;
        padding: 12px 14px;
        font-size: 13px;
      }
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(wrap);
})();
