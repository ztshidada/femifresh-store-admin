
(function(){
  const REGISTER_ENDPOINTS = [
    "/api/affiliate/register",
    "/api/affiliates/register",
    "/api/affiliate/signup",
    "/api/affiliates/signup",
    "/api/join",
    "/api/register"
  ];

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

  async function tryRegister(payload){
    let lastError = "Could not create account.";

    for (const endpoint of REGISTER_ENDPOINTS) {
      try {
        const res = await fetch(endpoint, {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          credentials:"include",
          body:JSON.stringify(payload)
        });

        const data = await res.json().catch(() => null);

        if (res.ok && data && (data.success || data.affiliate || data.token)) {
          return data;
        }

        if (data && data.message) lastError = data.message;
      } catch(e) {}
    }

    return {success:false,message:lastError};
  }

  function cleanUrl(){
    if (location.search && /password=|email=|phone=|firstName=|lastName=/i.test(location.search)) {
      history.replaceState({}, document.title, location.pathname);
    }
  }

  document.addEventListener("DOMContentLoaded", function(){
    cleanUrl();

    const form = document.getElementById("signupForm");
    if(!form) return;

    form.addEventListener("submit", async function(e){
      e.preventDefault();

      const fd = new FormData(form);

      const payload = {
        firstName: String(fd.get("firstName") || "").trim(),
        lastName: String(fd.get("lastName") || "").trim(),
        name: (String(fd.get("firstName") || "").trim() + " " + String(fd.get("lastName") || "").trim()).trim(),
        fullName: (String(fd.get("firstName") || "").trim() + " " + String(fd.get("lastName") || "").trim()).trim(),
        phone: String(fd.get("phone") || "").trim(),
        email: String(fd.get("email") || "").trim(),
        password: String(fd.get("password") || ""),
        sponsorCode: String(fd.get("sponsorCode") || "").trim(),
        referralCode: String(fd.get("sponsorCode") || "").trim()
      };

      const btn = form.querySelector("button");
      const success = document.getElementById("successBox");
      const error = document.getElementById("errorBox");

      success.style.display = "none";
      error.style.display = "none";

      btn.disabled = true;
      btn.textContent = "Creating account...";

      const data = await tryRegister(payload);

      btn.disabled = false;
      btn.textContent = "Sign Up";

      if(!data.success && !data.affiliate && !data.token){
        error.style.display = "block";
        error.textContent = data.message || "Could not create account.";
        return;
      }

      saveLoginData(data);

      success.style.display = "block";
      success.innerHTML = "<strong>Account created.</strong><br>Your dashboard will open now. It will unlock after admin approves your joining fee payment.";

      form.reset();

      setTimeout(() => {
        location.href = "/dashboard?manualPayment=pending";
      }, 1200);
    });
  });
})();
