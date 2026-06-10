const fs = require("fs");
const path = require("path");

const serverFile = path.join(__dirname, "server.js");
const affPage = path.join(__dirname, "public", "admin", "affiliates.html");
const profilePage = path.join(__dirname, "public", "admin", "affiliate-profile.html");

let server = fs.readFileSync(serverFile, "utf8");

/*
  Fix affiliate admin auth:
  Existing admin login stores token in cookie ff_admin_token.
  Affiliate admin APIs must accept cookie token, not only Authorization header.
*/
server = server.replaceAll(
`const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

    if (!token) {`,
`const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ")
      ? auth.slice(7)
      : (req.cookies && req.cookies.ff_admin_token) || "";

    if (!token) {`
);

/*
  Fix affiliate admin page fetch:
  Send browser cookies with API requests.
*/
if (fs.existsSync(affPage)) {
  let html = fs.readFileSync(affPage, "utf8");

  html = html.replace(
`if (!token) {
    throw new Error("Admin token missing. Please logout and login again as Super Admin.");
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
      ...(options.headers || {})
    }
  });`,
`const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = "Bearer " + token;
  }

  const res = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers
  });`
  );

  fs.writeFileSync(affPage, html);
}

if (fs.existsSync(profilePage)) {
  let html = fs.readFileSync(profilePage, "utf8");

  html = html.replaceAll(
`headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + adminToken(),
      ...(options.headers || {})
    }`,
`credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(adminToken() ? { Authorization: "Bearer " + adminToken() } : {}),
      ...(options.headers || {})
    }`
  );

  fs.writeFileSync(profilePage, html);
}

console.log("Affiliate admin cookie auth fixed.");
