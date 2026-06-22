(function(){
  const { api, qs, esc, money, toast, badge, fileToData } = window.Femi;
  const tokenKey = "ff_affiliate_token";
  const authHeader = () => ({ Authorization: "Bearer " + (localStorage.getItem(tokenKey) || "") });

  async function signup(){
    const form = qs("#affiliateSignup");
    if (!form) return;
    const ref = new URLSearchParams(location.search).get("ref");
    if (ref && form.sponsorCode) form.sponsorCode.value = ref;
    form.addEventListener("submit", async e => {
      e.preventDefault();
      try {
        const data = await api("/api/affiliate/register", { method:"POST", body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) });
        localStorage.setItem(tokenKey, data.token);
        localStorage.setItem("ff_affiliate", JSON.stringify(data.affiliate));
        location.href = "/join-success";
      } catch(err) { toast(err.message, "error"); }
    });
  }

  async function login(){
    const form = qs("#affiliateLogin");
    if (!form) return;
    form.addEventListener("submit", async e => {
      e.preventDefault();
      try {
        const data = await api("/api/affiliate/login", { method:"POST", body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) });
        localStorage.setItem(tokenKey, data.token);
        localStorage.setItem("ff_affiliate", JSON.stringify(data.affiliate));
        location.href = "/dashboard";
      } catch(err) { toast(err.message, "error"); }
    });
  }

  async function dashboard(){
    const root = qs("#affiliateDashboard");
    if (!root) return;
    if (!localStorage.getItem(tokenKey)) return location.href = "/login";
    try {
      const data = await api("/api/affiliate/dashboard", { headers: authHeader() });
      const a = data.affiliate;
      root.innerHTML = `
        <section class="ff-card ff-stack">
          <div class="ff-row ff-wrap"><div><p class="ff-eyebrow" style="color:#68235f">Distributor Dashboard</p><h1 class="ff-page-title">Hi, ${esc(a.firstName || a.fullName || "Distributor")}</h1></div>${badge(data.approved ? "Approved" : "Pending Joining Fee")}</div>
          ${data.approved ? "" : `<div class="ff-empty"><strong>Account awaiting approval.</strong><p>Submit your R100 proof of payment below. Your dashboard tools stay visible so you know what to do next.</p></div>`}
        </section>
        <section class="ff-grid four">
          ${stat("Referral Code", a.referralCode)}
          ${stat("Active This Month", data.stats.selfActive ? "Yes" : "No")}
          ${stat("Direct Referrals", data.stats.directRecruits)}
          ${stat("Payable", money(data.stats.totalPayable))}
        </section>
        <section class="ff-card ff-stack">
          <div class="ff-row ff-wrap">
            <div>
              <p class="ff-eyebrow" style="color:#68235f">Target Bonus Progress</p>
              <h2>${esc(String(data.stats.targetBonusProgress?.current ?? 0))} / ${esc(String(data.stats.targetBonusProgress?.required ?? 10))} Active Direct Referrals</h2>
              <p class="ff-muted">${data.stats.targetBonusProgress?.status === "qualified" ? "You have qualified for the target bonus." : "You need " + String(data.stats.targetBonusProgress?.remaining ?? 10) + " more active direct referral(s)."}</p>
            </div>
            <div>
              ${badge(data.stats.targetBonusProgress?.status || "pending")}
              <p><strong>Target Bonus: ${money(data.stats.targetBonusProgress?.amount || 0)}</strong></p>
            </div>
          </div>
        </section>

        <section class="ff-card ff-stack">
          <h2>Referral Tools</h2>
          <div class="ff-input">${esc(data.referralLink)}</div>
          <div class="ff-row ff-wrap">
            <button class="ff-btn" id="copyLink">Copy Link</button>
            <button class="ff-btn secondary" id="copyCode">Copy Code</button>
            <a class="ff-btn secondary" href="https://wa.me/?text=${encodeURIComponent("Join FemiFresh with my referral link: " + data.referralLink)}">Share on WhatsApp</a>
            <a class="ff-btn secondary" href="/products">Buy Products</a>
          </div>
        </section>
        <section class="ff-grid two">
          <div class="ff-card"><h2>Onboarding Checklist</h2>${data.checklist.map(i => `<p>${badge(i.complete ? "Done" : "Pending")} ${esc(i.label)}</p>`).join("")}</div>
          <div class="ff-card"><h2>Commission Summary</h2><p>Counted: <strong>${money(data.stats.totalCounted)}</strong></p><p>Blocked: <strong>${money(data.stats.totalBlocked)}</strong></p><p class="ff-muted">${esc(data.stats.blockedReason || "No blocked commission reason.")}</p></div>
        </section>
        <section class="ff-card"><h2>Direct Referrals</h2>${table(["Name","Code","Joined","Active"], data.directs.map(d => [d.fullName || d.email, d.referralCode, d.joined ? "Yes" : "No", d.activeThisMonth ? "Yes" : "No"]))}</section>
        <section class="ff-card"><h2>Downline Tree</h2>${downline(data.downline)}</section>
        <section class="ff-card"><h2>My Orders</h2>${table(["Order","Payment","Status","Total"], data.orders.map(o => [o.orderNumber, o.paymentStatus, o.orderStatus || o.fulfillmentStatus, money(o.total)]))}</section>
        <section class="ff-card"><h2>Payout Bank Details</h2>${bankForm(a.bankDetails || {})}</section>
        <section class="ff-card"><h2>Training Resources</h2><div id="resources">Loading...</div></section>
        <section class="ff-card"><h2>Submit Joining Fee POP</h2>${popForm(a.email)}</section>
      `;
      qs("#copyLink").onclick = async () => { await navigator.clipboard.writeText(data.referralLink); await api("/api/affiliate/referral-link-copied", { method:"POST", headers: authHeader() }); toast("Referral link copied."); };
      qs("#copyCode").onclick = async () => { await navigator.clipboard.writeText(a.referralCode || ""); toast("Referral code copied."); };
      bindBank();
      bindPop();
      loadResources();
    } catch(err) {
      localStorage.removeItem(tokenKey);
      location.href = "/login";
    }
  }

  function stat(label, value){ return `<div class="ff-card ff-stat"><span class="ff-muted">${esc(label)}</span><strong>${esc(value)}</strong></div>`; }
  function table(headers, rows){
    if (!rows.length) return `<div class="ff-empty">Nothing to show yet.</div>`;
    return `<div class="ff-table-wrap"><table class="ff-table"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }
  function flatten(nodes, out=[]){ nodes.forEach(n => { out.push(n); flatten(n.children || [], out); }); return out; }
  function downline(nodes){
    const flat = flatten(nodes || []);
    if (!flat.length) return `<div class="ff-empty">No downline yet.</div>`;
    return table(["Level","Name","Code","Joined"], flat.map(n => [n.level, n.fullName || n.email, n.referralCode, n.joined ? "Yes" : "No"]));
  }
  function bankForm(bank){
    return `<form class="ff-form" id="bankForm">
      <label class="ff-field">Account Holder<input name="accountHolderName" value="${esc(bank.accountHolderName || "")}" required></label>
      <label class="ff-field">Bank Name<input name="bankName" value="${esc(bank.bankName || "")}" required></label>
      <label class="ff-field">Account Number<input name="accountNumber" value="${esc(bank.accountNumber || "")}" required></label>
      <label class="ff-field">Branch Code<input name="branchCode" value="${esc(bank.branchCode || "")}"></label>
      <label class="ff-field">Account Type<input name="accountType" value="${esc(bank.accountType || "")}"></label>
      <button class="ff-btn">Save Bank Details</button>
    </form>`;
  }
  function popForm(email){
    return `<form class="ff-form" id="affiliatePop">
      <input type="hidden" name="kind" value="joining_fee">
      <label class="ff-field">Reference<input name="reference" value="${esc(email)}" required></label>
      <label class="ff-field">Contact Email<input name="contact" value="${esc(email)}" required></label>
      <label class="ff-field">Note<textarea name="note" placeholder="Payment reference or bank note"></textarea></label>
      <label class="ff-field">Proof File<input name="file" type="file" accept="image/*,application/pdf"></label>
      <button class="ff-btn">Submit POP</button>
    </form>`;
  }
  function bindBank(){
    qs("#bankForm")?.addEventListener("submit", async e => {
      e.preventDefault();
      try { await api("/api/affiliate/bank-details", { method:"POST", headers: authHeader(), body: JSON.stringify(Object.fromEntries(new FormData(e.target).entries())) }); toast("Bank details saved."); }
      catch(err){ toast(err.message, "error"); }
    });
  }
  function bindPop(){
    qs("#affiliatePop")?.addEventListener("submit", async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const file = await fileToData(fd.get("file"));
      try { await api("/api/pop-submissions", { method:"POST", body: JSON.stringify({ kind: "joining_fee", reference: fd.get("reference"), contact: fd.get("contact"), note: fd.get("note"), ...(file || {}) }) }); toast("POP submitted."); e.target.reset(); }
      catch(err){ toast(err.message, "error"); }
    });
  }
  async function loadResources(){
    const el = qs("#resources");
    if (!el) return;
    const data = await api("/api/affiliate/resources", { headers: authHeader() });
    el.innerHTML = data.resources.map(r => `<p><strong>${esc(r.title)}</strong><br><a href="${esc(r.url || "#")}">${esc(r.description || r.url || "")}</a></p>`).join("") || `<div class="ff-empty">Training resources will appear here.</div>`;
  }
  function resetPassword(){
    const form = qs("#resetPasswordForm");
    if (!form) return;
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const fd = new FormData(form);
      if (fd.get("password") !== fd.get("confirmPassword")) return toast("Passwords do not match.", "error");
      try { await api("/api/affiliate/reset-password", { method:"POST", body: JSON.stringify({ token: new URLSearchParams(location.search).get("token"), password: fd.get("password") }) }); toast("Password updated."); setTimeout(()=>location.href="/login", 1200); }
      catch(err){ toast(err.message, "error"); }
    });
  }
  function logout(){
    localStorage.removeItem(tokenKey);
    localStorage.removeItem("ff_affiliate");
    location.href = "/login";
  }
  window.affiliateLogout = logout;
  document.addEventListener("DOMContentLoaded", () => { signup(); login(); dashboard(); resetPassword(); });
})();
