(function(){
  const fmt = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });

  function money(value){ return fmt.format(Number(value || 0)); }
  function qs(sel, root=document){ return root.querySelector(sel); }
  function qsa(sel, root=document){ return [...root.querySelectorAll(sel)]; }
  function esc(value){
    return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
  }
  async function api(url, options={}){
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    const res = await fetch(url, { credentials: "include", ...options, headers });
    const data = await res.json().catch(() => ({ success:false, message:"Bad response." }));
    if (!res.ok || data.success === false) throw new Error(data.message || "Request failed.");
    return data;
  }
  function toast(message, type="info"){
    let region = qs(".ff-toast-region");
    if (!region) {
      region = document.createElement("div");
      region.className = "ff-toast-region";
      document.body.appendChild(region);
    }
    const el = document.createElement("div");
    el.className = "ff-toast" + (type === "error" ? " error" : "");
    el.textContent = message;
    region.appendChild(el);
    setTimeout(() => el.remove(), 3800);
  }
  function badge(value){
    const s = String(value || "pending").toLowerCase();
    let cls = "";
    if (["paid","fulfilled","delivered","approved","active","packed"].some(x => s.includes(x))) cls = "green";
    if (["failed","cancelled","refunded","blocked","out"].some(x => s.includes(x))) cls = "red";
    if (["pending","review","new","submitted","packing"].some(x => s.includes(x))) cls = "amber";
    const labels = {
      pop_submitted: "POP Submitted",
      under_review: "Under Review",
      out_of_stock: "Out of Stock",
      tracking_added: "Tracking Added"
    };
    const label = labels[s] || String(value || "--").replace(/_/g, " ").replace(/\b\w/g, ch => ch.toUpperCase());
    return `<span class="ff-badge ${cls}">${esc(label)}</span>`;
  }
  function confirmModal({ title="Confirm", message="", confirmText="Confirm", danger=false } = {}){
    return new Promise(resolve => {
      const wrap = document.createElement("div");
      wrap.className = "ff-modal-backdrop";
      wrap.innerHTML = `
        <div class="ff-modal">
          <h2>${esc(title)}</h2>
          <p class="ff-muted">${esc(message)}</p>
          <div class="ff-row ff-wrap" style="justify-content:flex-end;margin-top:18px">
            <button class="ff-btn secondary" data-cancel>Cancel</button>
            <button class="ff-btn ${danger ? "danger" : ""}" data-confirm>${esc(confirmText)}</button>
          </div>
        </div>`;
      document.body.appendChild(wrap);
      qs("[data-cancel]", wrap).onclick = () => { wrap.remove(); resolve(false); };
      qs("[data-confirm]", wrap).onclick = () => { wrap.remove(); resolve(true); };
    });
  }
  function initNav(){
    const btn = qs("[data-menu]");
    const links = qs("[data-links]");
    if (btn && links) btn.addEventListener("click", () => links.classList.toggle("open"));
    qsa("[data-cart-count]").forEach(el => el.textContent = String((JSON.parse(localStorage.getItem("ff_cart") || "[]")).reduce((s,i)=>s+Number(i.qty||1),0)));
  }
  function fileToData(file){
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve({ fileName: file.name, fileType: file.type, fileData: reader.result });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  function footer(){
    if (document.body.dataset.adminPage || qs(".ff-footer")) return;
    const el = document.createElement("footer");
    el.className = "ff-footer";
    el.innerHTML = `
      <div class="ff-container ff-footer-inner">
        <div>
          <a class="ff-brand" href="/"><img src="/images/femifresh-logo.jpg" alt="">FemiFresh</a>
          <p class="ff-muted">Fresh care, clear orders, stronger distributors.</p>
        </div>
        <div>
          <strong>Support</strong>
          <p><a href="/contact">Contact</a></p>
          <p><a href="/track-order">Track Order</a></p>
          <p><a href="/returns">Returns</a></p>
        </div>
        <div>
          <strong>Distributors</strong>
          <p><a href="/join">Become a Distributor</a></p>
          <p><a href="/affiliate-login">Distributor Login</a></p>
          <p><a href="/products">Buy Products</a></p>
        </div>
      </div>`;
    document.body.appendChild(el);
  }

  window.Femi = { money, qs, qsa, esc, api, toast, badge, confirmModal, initNav, fileToData, footer };
  document.addEventListener("DOMContentLoaded", () => { initNav(); footer(); });
})();
