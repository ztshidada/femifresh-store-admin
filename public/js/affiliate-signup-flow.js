
(async function(){
  let settings = {
    joiningFeeAmount: 100,
    popEmail: "femifresh02@gmail.com",
    paymentTitle: "Manual joining fee payment",
    paymentInstructions: "Pay the once-off R100 joining fee manually and email proof to femifresh02@gmail.com. Use your registered affiliate email as reference.",
    referenceInstruction: "Use your registered affiliate email as reference.",
    online paymentAffiliateJoiningFeeEnabled: false,
    manualAffiliateJoiningFeeEnabled: true
  };

  async function loadSettings(){
    try{
      const res = await fetch("/api/manual-joining-settings", {cache:"no-store"});
      const data = await res.json();
      settings = {...settings, ...(data.settings || {})};
    }catch(e){}
  }

  function renderManualBox(){
    const title = document.getElementById("manualTitle");
    const box = document.getElementById("manualBox");
    if(!box) return;

    if(title) title.textContent = settings.paymentTitle || "Manual joining fee payment";

    box.innerHTML = `
      <p><strong>Amount:</strong> R${settings.joiningFeeAmount || 100}</p>
      <p>${settings.paymentInstructions || ""}</p>
      <p><strong>Email POP to:</strong><br>${settings.popEmail || "femifresh02@gmail.com"}</p>
      ${settings.bankName ? `<p><strong>Bank:</strong> ${settings.bankName}</p>` : ""}
      ${settings.accountHolder ? `<p><strong>Account holder:</strong> ${settings.accountHolder}</p>` : ""}
      ${settings.accountNumber ? `<p><strong>Account number:</strong> ${settings.accountNumber}</p>` : ""}
      ${settings.branchCode ? `<p><strong>Branch code:</strong> ${settings.branchCode}</p>` : ""}
      <p><strong>Reference:</strong><br>${settings.referenceInstruction || "Use your registered affiliate email as reference."}</p>
    `;
  }

  function saveLoginData(data){
    const token = data.token || data.accessToken || data.affiliateToken || data.jwt || "";
    if(token){
      localStorage.setItem("affiliateToken", token);
      localStorage.setItem("ffAffiliateToken", token);
      localStorage.setItem("femifresh_affiliate_token", token);
    }

    if(data.affiliate){
      localStorage.setItem("affiliate", JSON.stringify(data.affiliate));
      localStorage.setItem("ffAffiliate", JSON.stringify(data.affiliate));
    }
  }

  async function postSignup(payload){
    const endpoint = window.FF_REGISTER_ENDPOINT || "/api/affiliate/register";

    const res = await fetch(endpoint, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      credentials:"include",
      body:JSON.stringify(payload)
    });

    const data = await res.json().catch(()=>({success:false,message:"Bad server response"}));
    return data;
  }

  document.addEventListener("DOMContentLoaded", async function(){
    await loadSettings();
    renderManualBox();

    const form = document.getElementById("signupForm");
    if(!form) return;

    form.addEventListener("submit", async function(e){
      e.preventDefault();

      const fd = new FormData(form);
      const payload = {
        firstName: fd.get("firstName"),
        lastName: fd.get("lastName"),
        name: (fd.get("firstName") + " " + fd.get("lastName")).trim(),
        phone: fd.get("phone"),
        email: fd.get("email"),
        password: fd.get("password"),
        sponsorCode: fd.get("sponsorCode") || "",
        referralCode: fd.get("sponsorCode") || ""
      };

      const btn = form.querySelector("button");
      btn.disabled = true;
      btn.textContent = "Creating account...";

      const data = await postSignup(payload);

      btn.disabled = false;
      btn.textContent = "Sign Up";

      const success = document.getElementById("successBox");
      const error = document.getElementById("errorBox");

      if(!data.success && !data.affiliate){
        error.style.display = "block";
        error.textContent = data.message || "Could not create account.";
        return;
      }

      saveLoginData(data);

      success.style.display = "block";
      success.innerHTML =
        "<strong>Account created.</strong><br>Your dashboard will open now. Functions will stay locked until admin approves your R" +
        (settings.joiningFeeAmount || 100) +
        " joining fee payment.";

      setTimeout(() => {
        location.href = "/dashboard?manualPayment=pending";
      }, 1300);
    });
  });
})();
