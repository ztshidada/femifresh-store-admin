const fs = require("fs");
const path = require("path");

const serverFile = path.join(__dirname, "server.js");
const publicDir = path.join(__dirname, "public");

let server = fs.readFileSync(serverFile, "utf8");

/* Add clean URL routes */
if (!server.includes("app.get('/products'")) {
  server = server.replace(
    `app.use(express.static(path.join(__dirname, "public")));`,
    `app.use(express.static(path.join(__dirname, "public")));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get('/products', (req, res) => {
  res.sendFile(path.join(__dirname, "public", "products.html"));
});

app.get('/cart', (req, res) => {
  res.sendFile(path.join(__dirname, "public", "cart.html"));
});

app.get('/checkout', (req, res) => {
  res.sendFile(path.join(__dirname, "public", "checkout.html"));
});

app.get('/thank-you', (req, res) => {
  res.sendFile(path.join(__dirname, "public", "thank-you.html"));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, "public", "contact.html"));
});

app.get('/policies', (req, res) => {
  res.sendFile(path.join(__dirname, "public", "policies.html"));
});

app.get('/distributors', (req, res) => {
  res.sendFile(path.join(__dirname, "public", "distributors.html"));
});

app.get('/index.html', (req, res) => res.redirect(301, '/'));
app.get('/products.html', (req, res) => res.redirect(301, '/products'));
app.get('/cart.html', (req, res) => res.redirect(301, '/cart'));
app.get('/checkout.html', (req, res) => res.redirect(301, '/checkout'));
app.get('/thank-you.html', (req, res) => res.redirect(301, '/thank-you' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '')));
app.get('/contact.html', (req, res) => res.redirect(301, '/contact'));
app.get('/policies.html', (req, res) => res.redirect(301, '/policies'));
app.get('/distributors.html', (req, res) => res.redirect(301, '/distributors'));`
  );
}

/* Update public links */
const pages = [
  "index.html",
  "products.html",
  "cart.html",
  "checkout.html",
  "thank-you.html",
  "contact.html",
  "policies.html",
  "distributors.html"
];

for (const page of pages) {
  const file = path.join(publicDir, page);
  if (!fs.existsSync(file)) continue;

  let html = fs.readFileSync(file, "utf8");

  html = html
    .replaceAll('href="/index.html"', 'href="/"')
    .replaceAll('href="index.html"', 'href="/"')
    .replaceAll('href="/products.html"', 'href="/products"')
    .replaceAll('href="products.html"', 'href="/products"')
    .replaceAll('href="/cart.html"', 'href="/cart"')
    .replaceAll('href="cart.html"', 'href="/cart"')
    .replaceAll('href="/checkout.html"', 'href="/checkout"')
    .replaceAll('href="checkout.html"', 'href="/checkout"')
    .replaceAll('href="/thank-you.html"', 'href="/thank-you"')
    .replaceAll('href="thank-you.html"', 'href="/thank-you"')
    .replaceAll('href="/contact.html"', 'href="/contact"')
    .replaceAll('href="contact.html"', 'href="/contact"')
    .replaceAll('href="/policies.html"', 'href="/policies"')
    .replaceAll('href="policies.html"', 'href="/policies"')
    .replaceAll('href="/distributors.html"', 'href="/distributors"')
    .replaceAll('href="distributors.html"', 'href="/distributors"');

  fs.writeFileSync(file, html);
}

/* Update JS redirects */
const storeJs = path.join(publicDir, "js", "store.js");
if (fs.existsSync(storeJs)) {
  let js = fs.readFileSync(storeJs, "utf8");

  js = js
    .replaceAll('"/products.html"', '"/products"')
    .replaceAll("'/products.html'", "'/products'")
    .replaceAll('"/cart.html"', '"/cart"')
    .replaceAll("'/cart.html'", "'/cart'")
    .replaceAll('"/checkout.html"', '"/checkout"')
    .replaceAll("'/checkout.html'", "'/checkout'")
    .replaceAll('"/thank-you.html"', '"/thank-you"')
    .replaceAll("'/thank-you.html'", "'/thank-you'")
    .replaceAll('"/contact.html"', '"/contact"')
    .replaceAll("'/contact.html'", "'/contact'")
    .replaceAll('"/policies.html"', '"/policies"')
    .replaceAll("'/policies.html'", "'/policies'")
    .replaceAll('location.href = res.checkoutUrl;', 'location.href = res.checkoutUrl;');

  fs.writeFileSync(storeJs, js);
}

/* Update Yoco success/cancel/failure URLs in server */
server = server
  .replaceAll('/thank-you.html?order=', '/thank-you?order=')
  .replaceAll('/checkout.html?order=', '/checkout?order=');

fs.writeFileSync(serverFile, server);

console.log("Clean URLs added. .html links removed from public pages.");
