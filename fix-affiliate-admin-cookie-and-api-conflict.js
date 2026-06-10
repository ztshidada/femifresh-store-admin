const fs = require("fs");
const path = require("path");

const serverFile = path.join(__dirname, "server.js");
const affiliatesPage = path.join(__dirname, "public", "admin", "affiliates.html");
const profilePage = path.join(__dirname, "public", "admin", "affiliate-profile.html");

let server = fs.readFileSync(serverFile, "utf8");

/* Add robust cookie/token reader */
if (!server.includes("AFF_ADMIN_TOKEN_READER_V3")) {
  const helper = `

// AFF_ADMIN_TOKEN_READER_V3
function getAffAdminToken(req) {
  const auth = req.headers.authorization || "";

  if (auth.startsWith("Bearer ")) {
    return auth.slice(7);
  }

  if (req.cookies && req.cookies.ff_admin_token) {
    return req.cookies.ff_admin_token;
  }

  const rawCookie = req.headers.cookie || "";
  const parts = rawCookie.split(";").map(x => x.trim());

  for (const part of parts) {
    const [key, ...rest] = part.split("=");
    if (key === "ff_admin_token") {
      return decodeURIComponent(rest.join("="));
    }
  }

  return "";
}
// END AFF_ADMIN_TOKEN_READER_V3
`;

  server = server.replace(/\/\/ AFFILIATE_SYSTEM_ADMIN_V1/, helper + "\n// AFFILIATE_SYSTEM_ADMIN_V1");
}

/* Replace token extraction inside affiliate admin auth functions */
server = server.replaceAll(
`const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ")
      ? auth.slice(7)
      : (req.cookies && req.cookies.ff_admin_token) || "";

    if (!token) {`,
`const token = getAffAdminToken(req);

    if (!token) {`
);

server = server.replaceAll(
`const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

    if (!token) {`,
`const token = getAffAdminToken(req);

    if (!token) {`
);

fs.writeFileSync(serverFile, server);

/* Fix affiliates page: remove admin.js conflict and rename api() */
let html = fs.readFileSync(affiliatesPage, "utf8");

html = html.replaceAll('<script src="/admin/js/admin.js"></script>', "");
html = html.replaceAll("async function api(", "async function affApi(");
html = html.replaceAll("await api(", "await affApi(");

html = html.replace(
`if (!token) {
    throw new Error("Admin token missing. Please logout and login again as Super Admin.");
  }`,
`// Admin login uses an httpOnly cookie, so localStorage may be empty. That is okay.`
);

html = html.replace(
`const res = await fetch(url, {
    ...options,
    headers: {`,
`const res = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: {`
);

fs.writeFileSync(affiliatesPage, html);

/* Fix affiliate profile page too */
if (fs.existsSync(profilePage)) {
  let profile = fs.readFileSync(profilePage, "utf8");

  profile = profile.replaceAll("async function api(", "async function affProfileApi(");
  profile = profile.replaceAll("await api(", "await affProfileApi(");

  profile = profile.replace(
`const res = await fetch(url, {
    ...options,
    headers: {`,
`const res = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: {`
  );

  fs.writeFileSync(profilePage, profile);
}

console.log("Fixed affiliate admin cookie auth and api conflict.");
