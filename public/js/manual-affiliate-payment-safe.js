
(function () {
  const manualMessage =
    "Account created. Please pay the once-off R100 joining fee manually and email proof to femifresh02@gmail.com. Use your registered affiliate email as reference.";

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async function (input, init) {
    const res = await nativeFetch(input, init);

    try {
      const url = String(typeof input === "string" ? input : input && input.url || "");

      if (
        url.includes("affiliate") ||
        url.includes("register") ||
        url.includes("join")
      ) {
        const clone = res.clone();
        const data = await clone.json().catch(() => null);

        if (data && typeof data === "object") {
          if (data.checkoutUrl || data.paymentUrl || data.online paymentUrl || data.redirectUrl) {
            const cleaned = {
              ...data,
              checkoutUrl: null,
              paymentUrl: null,
              online paymentUrl: null,
              redirectUrl: null,
              paymentMode: "manual",
              manualPayment: {
                amount: 100,
                email: "femifresh02@gmail.com",
                instruction: manualMessage
              },
              message: data.message || manualMessage
            };

            setTimeout(() => {
              alert(manualMessage);
            }, 300);

            return new Response(JSON.stringify(cleaned), {
              status: res.status,
              statusText: res.statusText,
              headers: {
                "Content-Type": "application/json"
              }
            });
          }
        }
      }
    } catch (e) {}

    return res;
  };

  document.addEventListener("DOMContentLoaded", function () {
    const params = new URLSearchParams(location.search);

    if (params.get("payment") === "cancelled") {
      history.replaceState({}, "", location.pathname);

      const box = document.createElement("div");
      box.style.cssText =
        "max-width:680px;margin:24px auto;padding:18px 20px;border-radius:22px;background:#fff1fa;border:1px solid rgba(104,35,95,.15);color:#35112f;font-family:Inter,system-ui;box-shadow:0 18px 40px rgba(104,35,95,.10);";

      box.innerHTML =
        "<strong>Manual payment is currently available.</strong><br>Please pay the R100 joining fee manually and email proof to <strong>femifresh02@gmail.com</strong>. Use your registered affiliate email as reference.";

      document.body.prepend(box);
    }

    document.querySelectorAll("a, button").forEach(el => {
      const text = (el.textContent || "").toLowerCase();
      const href = (el.getAttribute && el.getAttribute("href") || "").toLowerCase();

      if (
        text.includes("pay r100") ||
        text.includes("joining fee") ||
        href.includes("online payment") ||
        href.includes("affiliate-fee")
      ) {
        el.remove();
      }
    });
  });
})();
