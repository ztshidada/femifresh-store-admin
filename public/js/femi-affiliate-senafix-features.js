
(function(){
  const API = "/api/affiliate/femi-features";

  function getStoredAffiliate(){
    const keys = [
      "affiliate",
      "ff_affiliate",
      "femifresh_affiliate",
      "affiliateUser",
      "user"
    ];

    for (const key of keys) {
      try {
        const value = localStorage.getItem(key);
        if (!value) continue;
        const parsed = JSON.parse(value);
        if (parsed && (parsed.email || parsed.id || parsed.token || parsed.referralCode)) return parsed;
      } catch(e){}
    }

    return {};
  }

  function getIdentity(){
    const a = getStoredAffiliate();

    const params = new URLSearchParams(location.search);

    return {
      id: a.id || params.get("id") || "",
      email: a.email || params.get("email") || "",
      token: a.token || localStorage.getItem("affiliateToken") || localStorage.getItem("ff_affiliate_token") || ""
    };
  }

  async function loadData(){
    const id = getIdentity();

    const qs = new URLSearchParams();
    if (id.id) qs.set("id", id.id);
    if (id.email) qs.set("email", id.email);
    if (id.token) qs.set("token", id.token);

    const res = await fetch(API + "?" + qs.toString(), {credentials:"include"});
    return res.json().catch(() => ({}));
  }

  function copy(text){
    navigator.clipboard.writeText(text).then(() => {
      alert("Copied.");
    }).catch(() => {
      prompt("Copy this:", text);
    });
  }

  function flattenTree(nodes, out = []){
    nodes.forEach(n => {
      out.push(n);
      if (n.children && n.children.length) flattenTree(n.children, out);
    });
    return out;
  }

  function makeDownlineHtml(nodes){
    const flat = flattenTree(nodes);

    if (!flat.length) {
      return `
        <div class="ff-feature-empty">
          <strong>No downline yet.</strong>
          <p>Share your referral link/code to start building your team.</p>
        </div>
      `;
    }

    return `
      <div class="ff-downline-list">
        ${flat.map(a => `
          <div class="ff-downline-row">
            <div>
              <strong>Level ${a.level}: ${a.fullName}</strong>
              <small>${a.phone || ""} ${a.email ? " • " + a.email : ""}</small>
            </div>
            <span>${a.joined ? "Joined" : "Pending"}</span>
          </div>
        `).join("")}
      </div>
    `;
  }

  function featureStyles(){
    if (document.getElementById("ff-senafix-feature-style")) return;

    const style = document.createElement("style");
    style.id = "ff-senafix-feature-style";
    style.innerHTML = `
      .ff-senafix-feature-card{
        background:rgba(255,255,255,.92);
        border:1px solid rgba(104,35,95,.14);
        border-radius:28px;
        box-shadow:0 18px 46px rgba(104,35,95,.08);
        padding:28px;
        margin:24px 0;
        color:#241126;
      }
      .ff-senafix-feature-card h2{
        color:#35112f;
        font-size:clamp(34px,5vw,56px);
        letter-spacing:-.06em;
        line-height:.95;
        margin:0 0 20px;
      }
      .ff-ref-box{
        background:#fff1fa;
        border:1px solid rgba(104,35,95,.12);
        color:#68235f;
        border-radius:18px;
        padding:16px;
        font-weight:900;
        overflow-wrap:anywhere;
        margin:12px 0;
      }
      .ff-feature-actions{
        display:flex;
        gap:10px;
        flex-wrap:wrap;
      }
      .ff-feature-actions button,
      .ff-feature-actions a{
        border:0;
        border-radius:999px;
        min-height:46px;
        padding:12px 18px;
        background:linear-gradient(135deg,#68235f,#9b358e,#f4a7d8);
        color:white;
        font-weight:950;
        text-decoration:none;
        cursor:pointer;
      }
      .ff-feature-actions .whatsapp{
        background:#18b957;
      }
      .ff-feature-table{
        width:100%;
        border-collapse:collapse;
        min-width:760px;
      }
      .ff-feature-table th{
        text-align:left;
        color:#68235f;
        background:#fff7fd;
        padding:14px;
        text-transform:uppercase;
        letter-spacing:.12em;
        font-size:12px;
      }
      .ff-feature-table td{
        padding:14px;
        border-bottom:1px solid rgba(104,35,95,.10);
      }
      .ff-table-scroll{overflow:auto;border-radius:18px}
      .ff-downline-row{
        display:flex;
        justify-content:space-between;
        gap:16px;
        padding:14px;
        border:1px solid rgba(104,35,95,.10);
        border-radius:18px;
        margin:10px 0;
        background:#fffafd;
      }
      .ff-downline-row small{display:block;color:#6f6372;margin-top:4px}
      .ff-downline-row span{
        color:#68235f;
        font-weight:950;
      }
      .ff-feature-empty{
        background:#fff7fd;
        border:1px solid rgba(104,35,95,.10);
        border-radius:18px;
        padding:18px;
      }
      @media(max-width:700px){
        .ff-feature-actions{display:grid}
        .ff-feature-actions button,.ff-feature-actions a{width:100%;text-align:center}
        .ff-downline-row{display:block}
      }
    `;
    document.head.appendChild(style);
  }

  function build(data){
    if (!data.success) return;

    featureStyles();

    if (document.getElementById("ff-senafix-features")) return;

    const affiliate = data.affiliate || {};
    const code = affiliate.referralCode || "";
    const link = data.referralLink || ("https://affiliates.femifresh.co.za/?ref=" + code);

    const whatsappText = encodeURIComponent("Join FemiFresh using my referral link: " + link);

    const directRows = (data.directReferrals || []).map(a => `
      <tr>
        <td><strong>${a.fullName || "Affiliate"}</strong></td>
        <td>${a.phone || ""}</td>
        <td>${a.joined ? "Yes" : "No"}</td>
        <td>${a.monthlyStatus || "Not Yet This Month"}</td>
      </tr>
    `).join("");

    const wrapper = document.createElement("div");
    wrapper.id = "ff-senafix-features";
    wrapper.innerHTML = `
      <section class="ff-senafix-feature-card">
        <h2>Your referral tools</h2>
        <label><strong>Referral Link</strong></label>
        <div class="ff-ref-box">${link}</div>
        <div class="ff-feature-actions">
          <button type="button" id="ffCopyLink">Copy Referral Link</button>
          <button type="button" id="ffCopyCode">Copy Referral Code</button>
          <a class="whatsapp" href="https://wa.me/?text=${whatsappText}" target="_blank">Share on WhatsApp</a>
          <a href="/settings">Payment Settings</a>
        </div>
      </section>

      <section class="ff-senafix-feature-card">
        <h2>Direct Referrals</h2>
        <div class="ff-table-scroll">
          <table class="ff-feature-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Joined</th>
                <th>Monthly Status</th>
              </tr>
            </thead>
            <tbody>
              ${directRows || '<tr><td colspan="4">No direct referrals yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>

      <section class="ff-senafix-feature-card">
        <h2>My Downline Tree (10 Levels)</h2>
        <p>This shows your FemiFresh team structure up to 10 levels deep.</p>
        <div class="ff-ref-box"><strong>Total Team Members:</strong> ${flattenTree(data.downline || []).length}</div>
        ${makeDownlineHtml(data.downline || [])}
      </section>
    `;

    document.body.appendChild(wrapper);

    document.getElementById("ffCopyLink").onclick = () => copy(link);
    document.getElementById("ffCopyCode").onclick = () => copy(code);
  }

  async function boot(){
    if (!location.pathname.includes("dashboard") && !location.pathname.includes("home")) return;

    const data = await loadData();
    build(data);
  }

  document.addEventListener("DOMContentLoaded", boot);
  setTimeout(boot, 1200);
})();
