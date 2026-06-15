
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
    copy.innerHTML = `
      <h1>Build with FemiFresh.</h1>
      <p>Login to your affiliate back office, copy your referral link, track your progress and manage your FemiFresh growth.</p>
    `;

    const card = document.createElement("section");
    card.className = "ff-affiliate-login-card";
    card.innerHTML = `
      <img src="/images/femifresh-logo.jpg" alt="FemiFresh">
      <h1>Affiliate Login</h1>
      <p>Welcome back. Continue building your business.</p>
    `;

    form.parentNode.insertBefore(shell, form);
    shell.appendChild(copy);
    shell.appendChild(card);
    card.appendChild(form);

    moveForgotIntoCard(card);
  }

  function cardValueText(el){
    return (el.textContent || "").replace(/\s+/g," ").trim();
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
    hero.innerHTML = `
      <div>
        <p>FemiFresh Affiliate</p>
        <h1>${name}</h1>
      </div>
    `;

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
