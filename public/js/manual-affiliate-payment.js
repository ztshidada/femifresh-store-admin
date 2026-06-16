
(function(){
  const manualMessage = "Account created. Please pay the once-off R100 joining fee manually and email proof to femifresh02@gmail.com. Use your registered affiliate email as reference.";

  const oldFetch = window.fetch;
  window.fetch = async function(){
    const res = await oldFetch.apply(this, arguments);

    try {
      const url = String(arguments[0] || "");
      if (url.includes("affiliate") || url.includes("register") || url.includes("join")) {
        const clone = res.clone();
        clone.json().then(data => {
          if (data && (data.checkoutUrl || data.paymentUrl || data.yocoUrl)) {
            data.checkoutUrl = null;
            data.paymentUrl = null;
            data.yocoUrl = null;
            data.paymentMode = "manual";
            data.manualPayment = {
              amount: 100,
              email: "femifresh02@gmail.com",
              instruction: manualMessage
            };
          }
        }).catch(()=>{});
      }
    } catch(e){}

    return res;
  };

  document.addEventListener("DOMContentLoaded", function(){
    const params = new URLSearchParams(location.search);
    if (params.get("payment") === "cancelled") {
      const box = document.createElement("div");
      box.style.cssText = "max-width:640px;margin:20px auto;padding:18px;border-radius:22px;background:#fff1fa;border:1px solid rgba(104,35,95,.15);color:#35112f;font-family:Inter,system-ui;";
      box.innerHTML = "<strong>Online payment is paused.</strong><br>Please use manual payment for the R100 joining fee and email proof to <strong>femifresh02@gmail.com</strong>.";
      document.body.prepend(box);
      history.replaceState({}, "", location.pathname);
    }
  });
})();
