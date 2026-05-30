const jwt = require('jsonwebtoken');
const { read } = require('./db');

const rolePermissions = {
  super_admin: ['*'],
  orders_admin: ['orders:read', 'orders:update', 'orders:print', 'dashboard:read'],
  product_admin: ['products:read', 'products:write', 'delivery:read', 'dashboard:read'],
  support_admin: ['orders:read', 'customers:read', 'dashboard:read']
};

function signUser(user) {
  return jwt.sign({ id: user.id, role: user.role, name: user.name, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function currentUser(req) {
  const token = req.cookies.ff_admin_token || (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return null;
  try { return jwt.verify(token, process.env.JWT_SECRET); }
  catch { return null; }
}

function requireAuth(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ success: false, message: 'Login required' });
  req.user = user;
  next();
}

function hasPermission(role, permission) {
  const allowed = rolePermissions[role] || [];
  return allowed.includes('*') || allowed.includes(permission);
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Login required' });
    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({ success: false, message: 'You do not have permission for this action' });
    }
    next();
  };
}

function sanitizeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

module.exports = { signUser, currentUser, requireAuth, requirePermission, hasPermission, sanitizeUser, rolePermissions };
