/**
 * Authentication & Authorization Middlewares
 */

const jwt = require('jsonwebtoken');
const db = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || (
  process.env.NODE_ENV === 'production' ? '' : 'sportzone_super_secret_jwt_key_2026'
);

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production.');
}

// Xác thực JWT token từ Header (Authorization: Bearer <token>)
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Vui lòng đăng nhập để thực hiện hành động này (Thiếu token).'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, email, fullName, phone, role, avatar, address FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản không tồn tại hoặc phiên đăng nhập đã bị hủy.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Token không hợp lệ hoặc đã hết hạn.'
    });
  }
}

// Kiểm tra quyền Quản trị viên (Admin)
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Truy cập bị từ chối: Yêu cầu quyền Quản trị viên (Admin).'
    });
  }
  next();
}

// Middleware tùy chọn (nếu có token thì lấy user, không có thì vẫn cho qua)
function optionalToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = db.prepare('SELECT id, email, fullName, phone, role, avatar, address FROM users WHERE id = ?').get(decoded.id);
      if (user) req.user = user;
    } catch (e) {
      // bỏ qua lỗi nếu token hỏng
    }
  }
  next();
}

module.exports = {
  authenticateToken,
  requireAdmin,
  optionalToken,
  JWT_SECRET
};
