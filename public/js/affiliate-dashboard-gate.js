
(async function(){
  let settings = {
    joiningFeeAmount: 100,
    popEmail: "femifresh02@gmail.com",
    paymentInstructions: "Pay the once-off R100 joining fee manually and email proof to femifresh02@gmail.com.",
    referenceInstruction: "Use your registered affiliate email as reference."
  };

  async function loadSettings(){
    try{
      const res = await fetch("/api/manual-joining-settings", {cache:"no-store"});
      const data = await res.json();
      settings = {...settings, ...(data.settings || {})};
    }catch(e){}
  }

  function localAffiliate(){
    try{
      return JSON.parse(localStorage.getItem("affiliate") || localStorage.getItem("ffAffiliate") || "{}");
    }catch(e){ return {}; }
  }

  async function fetchAffiliate(){
    const urls = ["/api/affiliate/me", "/api/affiliate/dashboard", "/api/affiliates/me", "/api/me"];
    for(const url of urls){
      try{
        const token = localStorage.getItem("affiliateToken") || localStorage.getItem("ffAffiliateToken") || localStorage.getItem("femifresh_affiliate_token");
        const res = await fetch(url, {
          credentials:"include",
          headers: token ? {Authorization:"Bearer " + token} : {}
        });
        if(!res.ok) continue;
        const data = await res.json();
        return data.affiliate || data.user || data.data || data;
      }catch(e){}
    }
    return localAffiliate();
  }

  function isPaid(a){
    return !!(
      a.joiningFeePaid ||
      a.manualJoiningFeePaid ||
      a.joiningFeeStatus === "paid" ||
      a.paymentStatus === "paid"
    );
  }

  function lockDashboard(a){
    if(document.getElementById("ffDashboardLock")) return;

    const box = document.createElement("section");
    box.id = "ffDashboardLock";
    box.style.cssText =
      "max-width:1100px;margin:24px auto;padding:22px;border-radius:26px;background:#fff1fa;border:1px solid rgba(104,35,95,.16);box-shadow:0 18px 44px rgba(104,35,95,.12);font-family:Inter,system-ui;color:#35112f;";

    box.innerHTML = `
      <h2 style="margin:0 0 8px;">Account awaiting payment approval</h2>
      <p style="margin:0 0 12px;color:#6f6372;">Your account is created, but earning functions are locked until admin confirms your joining fee payment.</p>
      <div style="background:white;border-radius:18px;padding:16px;border:1px solid rgba(104,35,95,.12);">
        <strong>Manual payment instructions</strong><br>
        Amount: <strong>R${settings.joiningFeeAmount || 100}</strong><br>
        ${settings.paymentInstructions || ""}<br><br>
        Email proof to: <strong>${settings.popEmail || "femifresh02@gmail.com"}</strong><br>
        Reference: <strong>${settings.referenceInstruction || "Use your registered affiliate email as reference."}</strong>
      </div>
    `;

    document.body.prepend(box);

    document.querySelectorAll("button,a").forEach(el => {
      const txt = (el.textContent || "").toLowerCase();
      const href = (el.getAttribute && el.getAttribute("href") || "").toLowerCase();

      if(txt.includes("logout") || txt.includes("copy") || href.includes("logout")) return;

      if(txt.includes("buy") || txt.includes("withdraw") || txt.includes("payment") || txt.includes("activate")) {
        el.style.opacity = ".45";
        el.style.pointerEvents = "none";
        el.title = "Locked until admin approves joining fee payment";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", async function(){
    if(!location.pathname.includes("dashboard")) return;

    await loadSettings();

    setTimeout(async () => {
      const a = await fetchAffiliate();
      if(!isPaid(a)) lockDashboard(a);
    }, 700);
  });
})();
