const fs = require("fs");
const path = require("path");

const serverFile = path.join(__dirname, "server.js");
let server = fs.readFileSync(serverFile, "utf8");

const cleanRoutes = `

// ===== Clean public URL routes =====
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

// Redirect old .html links to clean URLs
app.get('/index.html', (req, res) => res.redirect(301, '/'));
app.get('/products.html', (req, res) => res.redirect(301, '/products'));
app.get('/cart.html', (req, res) => res.redirect(301, '/cart'));
app.get('/checkout.html', (req, res) => res.redirect(301, '/checkout'));
app.get('/thank-you.html', (req, res) => {
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect(301, '/thank-you' + query);
});
app.get('/contact.html', (req, res) => res.redirect(301, '/contact'));
app.get('/policies.html', (req, res) => res.redirect(301, '/policies'));

// ===== End clean public URL routes =====
`;

if (!server.includes("===== Clean public URL routes =====")) {
  server = server.replace(/app\.listen\(/, cleanRoutes + "\napp.listen(");
  fs.writeFileSync(serverFile, server);
  console.log("Clean routes added before app.listen.");
} else {
  console.log("Clean routes already exist.");
}
