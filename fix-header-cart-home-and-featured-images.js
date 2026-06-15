const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "public");

function walk(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, list);
    else if (stat.isFile() && full.endsWith(".html")) list.push(full);
  }
  return list;
}

function cleanPhone(text) {
  return text
    .replace(/\+27\s*61\s*450\s*3120/gi, "femifresh02@gmail.com")
    .replace(/0\s*61\s*450\s*3120/gi, "femifresh02@gmail.com")
    .replace(/061\s*450\s*3120/gi, "femifresh02@gmail.com")
    .replace(/27614503120/gi, "femifresh02@gmail.com")
    .replace(/https:\/\/wa\.me\/[0-9]+/gi, "mailto:femifresh02@gmail.com")
    .replace(/href=["']tel:[^"']+["']/gi, 'href="mailto:femifresh02@gmail.com"')
    .replace(/WhatsApp/gi, "Email");
}

const header = `
<header class="ff-site-header">
  <nav class="ff-nav">
    <a class="ff-brand" href="/">
      <img src="/images/femifresh-logo.jpg" alt="FemiFresh logo">
      <span>FemiFresh</span>
    </a>

    <button class="ff-menu" id="ffMenuBtn" aria-label="Open menu">☰</button>

    <div class="ff-navlinks" id="ffNavLinks">
      <a href="/">Home</a>
      <a href="/products.html">Products</a>
      <a href="/cart.html">Cart</a>
      <a href="/policies.html">Policy</a>
      <a href="/contact.html">Contact</a>
    </div>
  </nav>
</header>`;

const menuScript = `
<script>
  const ffMenuBtn = document.getElementById("ffMenuBtn");
  const ffNavLinks = document.getElementById("ffNavLinks");
  if (ffMenuBtn && ffNavLinks) {
    ffMenuBtn.addEventListener("click", () => ffNavLinks.classList.toggle("open"));
  }
</script>`;

/* 1) Fix header on all public pages except admin */
for (const file of walk(publicDir)) {
  if (file.includes(path.sep + "admin" + path.sep)) continue;

  let html = fs.readFileSync(file, "utf8");
  html = cleanPhone(html);

  if (/<header[\s\S]*?<\/header>/i.test(html)) {
    html = html.replace(/<header[\s\S]*?<\/header>/i, header);
  } else {
    html = html.replace("<body>", "<body>\n" + header);
  }

  /* remove duplicate old menu scripts */
  html = html.replace(/<script>\s*const ffMenuBtn[\s\S]*?<\/script>/gi, "");

  if (!html.includes("ffMenuBtn.addEventListener")) {
    html = html.replace("</body>", menuScript + "\n</body>");
  }

  fs.writeFileSync(file, html);
  console.log("Fixed header:", path.relative(publicDir, file));
}

/* 2) Fix homepage featured products images */
const indexFile = path.join(publicDir, "index.html");
let index = fs.readFileSync(indexFile, "utf8");

/* Add better image styling */
if (!index.includes("FEATURED_IMAGE_FIX_V1")) {
  index = index.replace("</style>", `
    /* FEATURED_IMAGE_FIX_V1 */
    .product-img{
      position:relative;
      overflow:hidden;
      background:#fff1fa;
    }

    .product-img img{
      width:100%;
      height:100%;
      object-fit:cover;
      display:block;
    }

    .product-img.no-image{
      background:
        radial-gradient(circle at center,rgba(244,167,216,.46),transparent 44%),
        linear-gradient(135deg,#5b1b55,#b247a4);
      color:white;
    }

    .product-card .btn,
    .product-card a.btn{
      margin-top:16px;
      width:100%;
    }
  </style>`);
}

/* Replace loadFeaturedProducts with a smarter one */
index = index.replace(/async function loadFeaturedProducts\(\)\{[\s\S]*?\n    loadFeaturedProducts\(\);/, `
    function productImage(p){
      return (
        p.image ||
        p.imageUrl ||
        p.image_url ||
        p.photo ||
        p.photoUrl ||
        p.thumbnail ||
        p.mainImage ||
        p.main_image ||
        p.picture ||
        ""
      );
    }

    function productPrice(p){
      const raw = p.price || p.amount || p.sellingPrice || p.salePrice || 0;
      const num = Number(raw);
      return Number.isFinite(num) && num > 0 ? "R" + num.toFixed(2) : "View product";
    }

    async function loadFeaturedProducts(){
      const box = document.getElementById("featuredProducts");

      try{
        const res = await fetch("/api/products", { cache: "no-store" });
        const data = await res.json();
        const products = Array.isArray(data) ? data : (data.products || data.data || []);

        if(!products.length) return;

        box.innerHTML = products.slice(0,3).map(p => {
          const name = p.name || p.title || "FemiFresh Product";
          const desc = p.description || p.shortDescription || "Premium feminine-care product for freshness and comfort.";
          const img = productImage(p);

          return \`
            <div class="product-card">
              <div class="product-img \${img ? "" : "no-image"}">
                \${img ? \`<img src="\${img}" alt="\${name}" loading="lazy">\` : name}
              </div>
              <div class="product-body">
                <h3>\${name}</h3>
                <p>\${desc}</p>
                <div class="price">\${productPrice(p)}</div>
              </div>
            </div>
          \`;
        }).join("");
      }catch(e){
        console.warn("Could not load featured products", e);
      }
    }

    loadFeaturedProducts();`);

fs.writeFileSync(indexFile, index);

/* 3) Add image fallback CSS globally */
const cssFile = path.join(publicDir, "css", "femifresh-unified.css");
if (fs.existsSync(cssFile)) {
  let css = fs.readFileSync(cssFile, "utf8");

  if (!css.includes("HEADER_AND_PRODUCT_IMAGE_FIX_V1")) {
    css += `

/* HEADER_AND_PRODUCT_IMAGE_FIX_V1 */
.ff-navlinks a[href="/cart.html"]::after {
  content: " 🛒";
}

.product-img {
  position: relative;
  overflow: hidden;
  min-height: 210px;
}

.product-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-img.no-image {
  display: grid;
  place-items: center;
  text-align: center;
  padding: 20px;
  background:
    radial-gradient(circle at center, rgba(244,167,216,.46), transparent 44%),
    linear-gradient(135deg,#5b1b55,#b247a4);
  color: #fff;
  font-weight: 900;
}

@media(max-width:900px){
  .ff-navlinks a {
    width:100%;
  }
}
`;
  }

  fs.writeFileSync(cssFile, css);
}

console.log("Done: header fixed with Home, Products, Cart, Policy, Contact. Featured product images fixed.");
