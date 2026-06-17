
(function () {
  let settingsPromise = null;

  function getSettings() {
    if (!settingsPromise) {
      settingsPromise = fetch("/api/payment-settings", { cache: "no-store" })
        .then(r => r.json())
        .then(d => d.settings || {})
        .catch(() => ({
          manualAffiliateJoiningFeeEnabled: true,
          online paymentAffiliateJoiningFeeEnabled: false,
          manualPaymentButtonEnabled: true,
          joiningFeeAmount: 100,
          manualPaymentEmail: "femifresh02@gmail.com",
          manualPaymentInstruction: "Pay the once-off R100 joining fee manually and email proof to femifresh02@gmail.com. Use your registered affiliate email as reference."
        }));
    }
    return settingsPromise;
  }

  function showManualBox(s) {
    if (document.getElementById("ffManualPaymentBox")) return;

    const box = document.createElement("div");
    box.id = "ffManualPaymentBox";
    box.style.cssText =
      "max-width:680px;margin:24px auto;padding:18px 20px;border-radius:22px;background:#fff1fa;border:1px solid rgba(104,35,95,.15);color:#35112f;font-family:Inter,system-ui;box-shadow:0 18px 40px rgba(104,35,95,.10);";

    box.innerHTML =
      "<strong>Manual joining fee payment</strong><br>" +
      (s.manualPaymentInstruction || "Pay the once-off R100 joining fee manually and email proof to femifresh02@gmail.com.") +
      "<br><br><strong>Email proof to:</strong> " + (s.manualPaymentEmail || "femifresh02@gmail.com");

    const form = document.querySelector("form");
    if (form && form.parentNode) form.parentNode.insertBefore(box, form.nextSibling);
    else document.body.prepend(box);
  }

  function addManualButton(s) {
    if (!s.manualPaymentButtonEnabled) return;
    if (document.getElementById("ffManualPaymentBtn")) return;

    const btn = document.createElement("button");
    btn.id = "ffManualPaymentBtn";
    btn.type = "button";
    btn.textContent = "Manual R" + (s.joiningFeeAmount || 100) + " Payment Instructions";
    btn.style.cssText =
      "width:100%;margin-top:14px;min-height:52px;border:0;border-radius:999px;background:#68235f;color:#fff;font-weight:900;cursor:pointer;";

    btn.addEventListener("click", () => showManualBox(s));

    const form = document.querySelector("form");
    if (form) form.appendChild(btn);
  }

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async function (input, init) {
    const res = await nativeFetch(input, init);

    try {
      const url = String(typeof input === "string" ? input : (input && input.url) || "");

      if (url.includes("affiliate") || url.includes("register") || url.includes("join")) {
        const s = await getSettings();

        if (s.online paymentAffiliateJoiningFeeEnabled) {
          return res;
        }

        if (s.manualAffiliateJoiningFeeEnabled) {
          const clone = res.clone();
          const data = await clone.json().catch(() => null);

          if (data && typeof data === "object") {
            const cleaned = {
              ...data,
              checkoutUrl: null,
              paymentUrl: null,
              online paymentUrl: null,
              redirectUrl: null,
              paymentMode: "manual",
              manualPayment: {
                amount: s.joiningFeeAmount || 100,
                email: s.manualPaymentEmail || "femifresh02@gmail.com",
                instruction: s.manualPaymentInstruction
              },
              message: data.message || "Account created. Please follow manual payment instructions."
            };

            setTimeout(() => showManualBox(s), 250);

            return new Response(JSON.stringify(cleaned), {
              status: res.status,
              statusText: res.statusText,
              headers: { "Content-Type": "application/json" }
            });
          }
        }
      }
    } catch (e) {}

    return res;
  };

  document.addEventListener("DOMContentLoaded", async function () {
    const s = await getSettings();

    document.querySelectorAll("a, button").forEach(el => {
      const text = (el.textContent || "").toLowerCase();
      const href = (el.getAttribute && (el.getAttribute("href") || "")).toLowerCase();

      if (!s.online paymentAffiliateJoiningFeeEnabled && (href.includes("online payment") || text.includes("pay r100"))) {
        el.remove();
      }
    });

    if (s.manualPaymentButtonEnabled) {
      addManualButton(s);
    }

    const params = new URLSearchParams(location.search);
    if (params.get("payment") === "cancelled") {
      history.replaceState({}, "", location.pathname);
      showManualBox(s);
    }
  });
})();
