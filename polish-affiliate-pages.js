const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "public");
const cssDir = path.join(publicDir, "css");
const jsDir = path.join(publicDir, "js");

fs.mkdirSync(cssDir, { recursive: true });
fs.mkdirSync(jsDir, { recursive: true });

const cssFile = path.join(cssDir, "affiliate-premium.css");
const jsFile = path.join(jsDir, "affiliate-premium.js");

fs.writeFileSync(cssFile, `
/* FEMIFRESH_AFFILIATE_PREMIUM_V1 */
body{
  background:
    radial-gradient(circle at 8% 12%, rgba(244,167,216,.32), transparent 28%),
    radial-gradient(circle at 92% 14%, rgba(104,35,95,.16), transparent 26%),
    linear-gradient(180deg,#fff8fd 0%,#fff1fa 48%,#fffaf7 100%) !important;
}

body::before{
  content:"";
  position:fixed;
  inset:0;
  background:url("/images/femifresh-glass-butterfly.png") no-repeat 94% 16% / min(560px,58vw);
  opacity:.07;
  pointer-events:none;
  z-index:-1;
}

.ff-affiliate-login-shell{
  min-height:calc(100vh - 84px);
  display:grid;
  grid-template-columns:1fr 1fr;
  align-items:center;
  gap:44px;
  width:min(1180px,calc(100% - 32px));
  margin:auto;
  padding:70px 0;
}

.ff-affiliate-login-copy h1{
  margin:0 0 18px;
  font-size:clamp(52px,7vw,92px);
  line-height:.96;
  letter-spacing:-.06em;
  background:linear-gradient(120deg,#35112f,#68235f,#d55cbb);
  -webkit-background-clip:text;
  background-clip:text;
  color:transparent;
}

.ff-affiliate-login-copy p{
  font-size:20px;
  max-width:560px;
  color:#6f5e72;
}

.ff-affiliate-login-card{
  background:rgba(255,255,255,.78);
  border:1px solid rgba(104,35,95,.14);
  border-radius:34px;
  padding:38px;
  box-shadow:0 28px 70px rgba(104,35,95,.13);
  backdrop-filter:blur(18px);
  -webkit-backdrop-filter:blur(18px);
}

.ff-affiliate-login-card img{
  width:86px;
  height:86px;
  object-fit:cover;
  border-radius:26px;
  margin-bottom:16px;
  box-shadow:0 18px 34px rgba(104,35,95,.16);
}

.ff-affiliate-login-card h1,
.ff-affiliate-login-card h2{
  margin:0 0 8px;
  font-size:42px;
  color:#35112f;
}

.ff-affiliate-login-card p{
  margin:0 0 22px;
}

.ff-affiliate-login-card form{
  display:grid;
  gap:14px;
}

.ff-affiliate-login-card input{
  width:100%;
  min-height:52px;
  border-radius:16px;
  border:1px solid rgba(104,35,95,.18);
  padding:14px 16px;
  font-size:16px;
}

.ff-affiliate-login-card button{
  width:100%;
  min-height:54px;
  border-radius:999px;
  border:0;
  background:linear-gradient(135deg,#68235f,#8c2e80,#f4a7d8);
  color:white;
  font-weight:900;
  cursor:pointer;
}

.ff-affiliate-login-links{
  display:flex;
  justify-content:space-between;
  gap:14px;
  margin-top:18px;
  flex-wrap:wrap;
}

.ff-affiliate-login-links a{
  color:#68235f;
  font-weight:850;
  text-decoration:none;
}

/* Dashboard */
.ff-affiliate-dashboard{
  width:min(1180px,calc(100% - 32px));
  margin:auto;
  padding:70px 0 90px;
}

.ff-affiliate-dash-hero{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:24px;
  margin-bottom:28px;
}

.ff-affiliate-dash-hero h1{
  margin:0;
  font-size:clamp(44px,6vw,76px);
  line-height:1;
  letter-spacing:-.06em;
  background:linear-gradient(120deg,#35112f,#68235f,#d55cbb);
  -webkit-background-clip:text;
  background-clip:text;
  color:transparent;
}

.ff-affiliate-dash-hero p{
  margin:0 0 10px;
  color:#6f5e72;
  font-weight:700;
}

.ff-affiliate-dash-grid{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:16px;
  margin-bottom:24px;
}

.ff-affiliate-stat{
  background:rgba(255,255,255,.78);
  border:1px solid rgba(104,35,95,.14);
  border-radius:26px;
  padding:22px;
  box-shadow:0 22px 52px rgba(104,35,95,.10);
  backdrop-filter:blur(16px);
}

.ff-affiliate-stat span{
  display:block;
  color:#6f5e72;
  font-weight:750;
  margin-bottom:10px;
}

.ff-affiliate-stat strong{
  display:block;
  color:#68235f;
  font-size:26px;
  letter-spacing:.02em;
}

.ff-affiliate-panel{
  background:rgba(255,255,255,.78);
  border:1px solid rgba(104,35,95,.14);
  border-radius:30px;
  padding:28px;
  box-shadow:0 22px 52px rgba(104,35,95,.10);
  backdrop-filter:blur(16px);
  margin-bottom:22px;
}

.ff-affiliate-panel h2{
  margin-top:0;
  color:#35112f;
  font-size:clamp(32px,4vw,52px);
}

.ff-affiliate-panel input,
.ff-affiliate-panel textarea{
  background:#fff1fa !important;
  border:1px solid rgba(104,35,95,.12) !important;
  color:#68235f !important;
  font-weight:800;
}

.ff-affiliate-panel button,
.ff-affiliate-dashboard button,
.ff-affiliate-dashboard .btn{
  border-radius:999px !important;
  background:linear-gradient(135deg,#68235f,#8c2e80,#f4a7d8) !important;
  color:white !important;
  font-weight:900 !important;
}

@media(max-width:900px){
  .ff-affiliate-login-shell{
    grid-template-columns:1fr;
    padding:44px 0;
  }

  .ff-affiliate-login-copy{
    text-align:center;
  }

  .ff-affiliate-login-card{
    padding:26px;
  }

  .ff-affiliate-login-links{
    display:grid;
  }

  .ff-affiliate-dash-hero{
    display:block;
  }

  .ff-affiliate-dash-grid{
    grid-template-columns:1fr;
  }
}
`);

fs.writeFileSync(jsFile, `
(function(){
  const path = location.pathname;

  function moveForgotIntoCard(card){
    if(!card) return;

    const links = Array.from(document.querySelectorAll("a")).filter(a => {
      const t = (a.textContent || "").toLowerCase();
      const h = (a.getAttribute("href") || "").toLowerCase();
      return t.includes("forgot") || h.includes("reset-password");
    });

    let linkBox = card.querySelector(".ff-affiliate-login-links");
    if(!linkBox){
      linkBox = document.createElement("div");
      linkBox.className = "ff-affiliate-login-links";
      card.appendChild(linkBox);
    }

    links.forEach(a => {
      if(!linkBox.contains(a)) linkBox.appendChild(a);
    });

    const join = Array.from(document.querySelectorAll("a")).find(a => {
      const t = (a.textContent || "").toLowerCase();
      const h = (a.getAttribute("href") || "").toLowerCase();
      return t.includes("join") || h.includes("join");
    });

    if(join && !linkBox.contains(join)) linkBox.prepend(join);
  }

  function polishLogin(){
    if(!path.includes("login")) return;

    const existing = document.querySelector(".ff-affiliate-login-shell");
    if(existing) return;

    const form = document.querySelector("form");
    if(!form) return;

    const shell = document.createElement("main");
    shell.className = "ff-affiliate-login-shell";

    const copy = document.createElement("section");
    copy.className = "ff-affiliate-login-copy";
    copy.innerHTML = \`
      <h1>Build with FemiFresh.</h1>
      <p>Login to your affiliate back office, copy your referral link, track your progress and manage your FemiFresh growth.</p>
    \`;

    const card = document.createElement("section");
    card.className = "ff-affiliate-login-card";
    card.innerHTML = \`
      <img src="/images/femifresh-logo.jpg" alt="FemiFresh">
      <h1>Affiliate Login</h1>
      <p>Welcome back. Continue building your business.</p>
    \`;

    form.parentNode.insertBefore(shell, form);
    shell.appendChild(copy);
    shell.appendChild(card);
    card.appendChild(form);

    moveForgotIntoCard(card);
  }

  function cardValueText(el){
    return (el.textContent || "").replace(/\\s+/g," ").trim();
  }

  function polishDashboard(){
    if(!path.includes("dashboard")) return;

    if(document.querySelector(".ff-affiliate-dashboard")) return;

    const mainContent = document.createElement("main");
    mainContent.className = "ff-affiliate-dashboard";

    const oldChildren = Array.from(document.body.children).filter(el => {
      if(el.tagName === "SCRIPT") return false;
      if(el.tagName === "HEADER") return false;
      return true;
    });

    oldChildren.forEach(el => mainContent.appendChild(el));
    document.body.appendChild(mainContent);

    const h1 = mainContent.querySelector("h1");
    const name = h1 ? h1.textContent : "Welcome";

    const hero = document.createElement("section");
    hero.className = "ff-affiliate-dash-hero";
    hero.innerHTML = \`
      <div>
        <p>FemiFresh Affiliate</p>
        <h1>\${name}</h1>
      </div>
    \`;

    if(h1) h1.remove();
    mainContent.prepend(hero);

    const cards = Array.from(mainContent.querySelectorAll(".card, .panel, div")).filter(el => {
      const txt = cardValueText(el);
      return (
        txt.includes("Referral Code") ||
        txt.includes("Account Status") ||
        txt.includes("Active This Month") ||
        txt.includes("Active Directs") ||
        txt.includes("Referral Bonus") ||
        txt.includes("Target Bonus") ||
        txt.includes("Total Counted") ||
        txt.includes("Total Payable")
      );
    }).slice(0,8);

    if(cards.length){
      const grid = document.createElement("section");
      grid.className = "ff-affiliate-dash-grid";

      cards.forEach(c => {
        c.classList.add("ff-affiliate-stat");
        grid.appendChild(c);
      });

      hero.insertAdjacentElement("afterend", grid);
    }

    Array.from(mainContent.children).forEach(el => {
      const txt = cardValueText(el);
      if(txt.includes("Your referral link") || txt.includes("Copy Referral Link") || txt.includes("Buy Products")){
        el.classList.add("ff-affiliate-panel");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function(){
    polishLogin();
    polishDashboard();
  });
})();
`);

function inject(file){
  if(!fs.existsSync(file)) return;

  let html = fs.readFileSync(file, "utf8");

  if(!html.includes("/css/affiliate-premium.css")){
    html = html.replace("</head>", '  <link rel="stylesheet" href="/css/affiliate-premium.css">\\n</head>');
  }

  if(!html.includes("/js/affiliate-premium.js")){
    html = html.replace("</body>", '  <script src="/js/affiliate-premium.js"></script>\\n</body>');
  }

  fs.writeFileSync(file, html);
}

[
  "affiliate-login.html",
  "join.html",
  "affiliate-dashboard.html",
  "affiliate-reset-password.html"
].forEach(name => inject(path.join(publicDir, name)));

console.log("Affiliate login/dashboard premium polish installed.");
