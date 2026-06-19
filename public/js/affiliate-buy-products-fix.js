
(function(){
  const STORE_PRODUCTS_URL = "https://www.femifresh.co.za/products.html";

  function fixBuyButton(){
    document.querySelectorAll("a, button").forEach(el => {
      const text = (el.innerText || el.textContent || "").trim().toLowerCase();

      if (
        text === "buy products" ||
        text.includes("buy products") ||
        text.includes("buy product")
      ) {
        if (el.tagName.toLowerCase() === "a") {
          el.href = STORE_PRODUCTS_URL;
          el.target = "_self";
          el.removeAttribute("onclick");
        } else {
          el.onclick = function(e){
            e.preventDefault();
            e.stopPropagation();
            window.location.href = STORE_PRODUCTS_URL;
          };
        }
      }
    });
  }

  document.addEventListener("DOMContentLoaded", fixBuyButton);
  setTimeout(fixBuyButton, 300);
  setTimeout(fixBuyButton, 900);
  setTimeout(fixBuyButton, 1800);
})();
