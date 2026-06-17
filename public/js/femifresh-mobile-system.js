
(function(){
  function cleanLiteralNewlines(){
    try {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);

      nodes.forEach(n => {
        if (n.nodeValue && n.nodeValue.includes("\\n")) {
          n.nodeValue = n.nodeValue.replace(/\\n/g, "");
        }
      });
    } catch(e){}
  }

  function setupMenu(){
    const btn =
      document.getElementById("ffMenuBtn") ||
      document.getElementById("menuBtn") ||
      document.querySelector(".ff-menu") ||
      document.querySelector(".hamb");

    const links =
      document.getElementById("ffNavLinks") ||
      document.getElementById("navLinks") ||
      document.querySelector(".ff-navlinks") ||
      document.querySelector(".navlinks");

    if (btn && links && !btn.dataset.ffMobileReady) {
      btn.dataset.ffMobileReady = "yes";

      btn.addEventListener("click", function(e){
        e.preventDefault();
        links.classList.toggle("open");
        document.body.classList.toggle("ff-mobile-menu-open");
      });
    }
  }

  function wrapTables(){
    document.querySelectorAll("table").forEach(table => {
      if (table.parentElement && table.parentElement.classList.contains("ff-table-scroll")) return;

      const wrap = document.createElement("div");
      wrap.className = "ff-table-scroll";
      wrap.style.cssText = "width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;";

      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });
  }

  function makeAdminUsefulOnPhone(){
    if (!location.pathname.includes("/admin/")) return;

    document.body.classList.add("ff-admin-phone-ready");

    const sidebar = document.querySelector(".sidebar,.ff-admin-sidebar,aside");
    if (sidebar && !document.getElementById("ffAdminMobileHint")) {
      const hint = document.createElement("div");
      hint.id = "ffAdminMobileHint";
      hint.textContent = "Admin menu";
      hint.style.cssText = "font-weight:900;margin:0 0 10px;color:#fff;opacity:.85;";
      sidebar.prepend(hint);
    }
  }

  document.addEventListener("DOMContentLoaded", function(){
    cleanLiteralNewlines();
    setupMenu();
    wrapTables();
    makeAdminUsefulOnPhone();
  });

  window.addEventListener("resize", setupMenu);
})();
