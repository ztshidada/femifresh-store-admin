const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { read, write } = require("../db");

const ADMIN_COOKIE = "ff_admin_token";
const JWT_SECRET = process.env.JWT_SECRET || "femifresh-dev-secret-change-before-production";

const rolePermissions = {
  super_admin: ["*"],
  orders_admin: [
    "dashboard:read",
    "orders:read",
    "orders:update",
    "orders:print",
    "pop:review",
    "joining_fees:read",
    "joining_fees:update",
    "followups:read"
  ],
  product_admin: ["dashboard:read", "products:read", "products:write", "delivery:read", "delivery:write"],
  support_admin: ["dashboard:read", "orders:read", "customers:read"]
};

function issueAdminToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name, email: user.email, kind: "admin" },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function verifyJwt(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function bearerToken(req) {
  const auth = req.headers.authorization || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
}

function adminPayload(req) {
  return verifyJwt((req.cookies && req.cookies[ADMIN_COOKIE]) || bearerToken(req));
}

function hasPermission(role, permission) {
  const allowed = rolePermissions[role] || [];
  return allowed.includes("*") || allowed.includes(permission);
}

function requireAdmin(req, res, next) {
  const payload = adminPayload(req);
  if (!payload || payload.kind !== "admin") {
    return res.status(401).json({ success: false, message: "Admin login required." });
  }
  req.user = payload;
  next();
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: "Login required." });
    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({ success: false, message: "You do not have permission for this action." });
    }
    next();
  };
}

function requireRole(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: "Login required." });
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "You do not have permission for this action." });
    }
    next();
  };
}

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, token, adminToken, sessionToken, resetPasswordToken, ...safe } = user;
  return safe;
}

function publicCustomer(customer) {
  if (!customer) return null;
  const { passwordHash, token, resetPasswordToken, ...safe } = customer;
  return safe;
}

function publicAffiliate(affiliate, options = {}) {
  if (!affiliate) return null;
  const { passwordHash, token, resetPasswordToken, resetPasswordExpiresAt, ...safe } = affiliate;
  if (!options.includeBankDetails) delete safe.bankDetails;
  return safe;
}

function newToken() {
  return crypto.randomBytes(32).toString("hex");
}

function loginAdmin(email, password) {
  const users = read("users", []);
  const user = users.find(u => String(u.email || "").toLowerCase() === String(email || "").toLowerCase());
  if (!user || !bcrypt.compareSync(password || "", user.passwordHash || "")) return null;
  return user;
}

function findCustomerByToken(token) {
  if (!token) return null;
  return read("customers", []).find(c => c.token === token) || null;
}

function requireCustomer(req, res, next) {
  const customer = findCustomerByToken(bearerToken(req));
  if (!customer) return res.status(401).json({ success: false, message: "Customer login required." });
  req.customer = customer;
  next();
}

function findAffiliateByToken(token) {
  if (!token) return null;
  return read("affiliates", []).find(a => a.token === token) || null;
}

function requireAffiliate(req, res, next) {
  const affiliate = findAffiliateByToken(bearerToken(req));
  if (!affiliate) return res.status(401).json({ success: false, message: "Affiliate login required." });
  req.affiliate = affiliate;
  next();
}

function hashPassword(password) {
  return bcrypt.hashSync(String(password || ""), 10);
}

function comparePassword(password, hash) {
  return bcrypt.compareSync(String(password || ""), String(hash || ""));
}

function setAdminCookie(res, token) {
  res.cookie(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 86400000
  });
}

function clearAdminCookie(res) {
  res.clearCookie(ADMIN_COOKIE);
}

function updateRecord(storeName, id, updater) {
  const rows = read(storeName, []);
  const index = rows.findIndex(row => String(row.id) === String(id));
  if (index < 0) return null;
  rows[index] = updater(rows[index], index, rows);
  write(storeName, rows);
  return rows[index];
}

module.exports = {
  ADMIN_COOKIE,
  rolePermissions,
  issueAdminToken,
  verifyJwt,
  bearerToken,
  requireAdmin,
  requirePermission,
  requireRole,
  sanitizeUser,
  publicCustomer,
  publicAffiliate,
  newToken,
  loginAdmin,
  findCustomerByToken,
  findAffiliateByToken,
  requireCustomer,
  requireAffiliate,
  hashPassword,
  comparePassword,
  setAdminCookie,
  clearAdminCookie,
  updateRecord,
  hasPermission
};
