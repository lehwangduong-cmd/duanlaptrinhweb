/**
 * ============================================================
 * SportZone - Auth Routes (/api/auth)
 * ============================================================
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const db = require('../database');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const oauth2Client = new OAuth2Client(CLIENT_ID);

const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean)
);

// Helper tạo JWT Token
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * POST /api/auth/register
 * Body: { fullName, email, phone, password }
 */
router.post('/register', (req, res) => {
  const { fullName, email, phone, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng điền đầy đủ họ tên, email và mật khẩu!'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Mật khẩu phải có độ dài tối thiểu 6 ký tự!'
    });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Kiểm tra tài khoản đã tồn tại chưa
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'Email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác!'
    });
  }

  const role = 'user';

  const userId = 'USR-' + Math.floor(100000 + Math.random() * 900000);
  const passwordHash = bcrypt.hashSync(password, 10);
  const createdAt = new Date().toISOString();
  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0082c3&color=fff&size=150`;

  try {
    db.prepare(`
      INSERT INTO users (id, email, password, fullName, phone, role, avatar, address, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      normalizedEmail,
      passwordHash,
      fullName.trim(),
      phone ? phone.trim() : '',
      role,
      defaultAvatar,
      '',
      createdAt
    );

    const user = {
      id: userId,
      email: normalizedEmail,
      fullName: fullName.trim(),
      phone: phone ? phone.trim() : '',
      role: role,
      avatar: defaultAvatar,
      address: ''
    };

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công!',
      token,
      user
    });
  } catch (err) {
    console.error('Lỗi đăng ký:', err);
    return res.status(500).json({
      success: false,
      message: 'Đã có lỗi xảy ra khi tạo tài khoản.',
      error: err.message
    });
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập email/số điện thoại và mật khẩu!'
    });
  }

  const query = email.toLowerCase().trim();

  // Tìm user theo email hoặc số điện thoại
  const user = db.prepare(`
    SELECT * FROM users WHERE LOWER(email) = ? OR phone = ?
  `).get(query, query);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Tài khoản không tồn tại trong hệ thống!'
    });
  }

  // So sánh mật khẩu
  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Mật khẩu không chính xác!'
    });
  }

  const safeUser = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone || '',
    role: user.role,
    avatar: user.avatar || '',
    address: user.address || ''
  };

  const token = generateToken(safeUser);

  return res.json({
    success: true,
    message: `Đăng nhập thành công! Xin chào ${safeUser.fullName}.`,
    token,
    user: safeUser
  });
});

/**
 * GET /api/auth/me
 * Headers: Authorization: Bearer <token>
 */
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

/**
 * PUT /api/auth/profile
 * Body: { fullName, phone, address, avatar }
 */
router.put('/profile', authenticateToken, (req, res) => {
  const { fullName, phone, address, avatar } = req.body;
  const userId = req.user.id;

  try {
    db.prepare(`
      UPDATE users
      SET fullName = COALESCE(?, fullName),
          phone = COALESCE(?, phone),
          address = COALESCE(?, address),
          avatar = COALESCE(?, avatar)
      WHERE id = ?
    `).run(fullName, phone, address, avatar, userId);

    const updatedUser = db.prepare('SELECT id, email, fullName, phone, role, avatar, address FROM users WHERE id = ?').get(userId);

    res.json({
      success: true,
      message: 'Cập nhật thông tin hồ sơ thành công!',
      user: updatedUser
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Không thể cập nhật hồ sơ.',
      error: err.message
    });
  }
});

/**
 * PUT /api/auth/change-password
 * Body: { oldPassword, newPassword }
 */
router.put('/change-password', authenticateToken, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!oldPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Mật khẩu mới phải có ít nhất 6 ký tự!'
    });
  }

  const user = db.prepare('SELECT password FROM users WHERE id = ?').get(userId);
  if (!bcrypt.compareSync(oldPassword, user.password)) {
    return res.status(400).json({
      success: false,
      message: 'Mật khẩu hiện tại không chính xác!'
    });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(newHash, userId);

  res.json({
    success: true,
    message: 'Đổi mật khẩu thành công!'
  });
});

/**
 * POST /api/auth/google
 * Body: { idToken }
 */
router.post('/google', async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({
      success: false,
      message: 'Không tìm thấy Google ID Token trong request body!'
    });
  }

  try {
    if (!CLIENT_ID || CLIENT_ID.includes('YOUR_GOOGLE_CLIENT_ID')) {
      return res.status(503).json({
        success: false,
        message: 'Đăng nhập Google chưa được cấu hình.'
      });
    }

    const ticket = await oauth2Client.verifyIdToken({
      idToken,
      audience: CLIENT_ID
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email || payload.email_verified !== true) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản Google chưa được xác minh.'
      });
    }

    const email = payload.email.toLowerCase();
    const name = payload['name'] || email.split('@')[0];
    const picture = payload['picture'] || '';
    const googleUserId = payload['sub'] || 'gg-' + Date.now();

    const role = ADMIN_EMAILS.has(email) ? 'admin' : 'user';

    // Tìm hoặc tạo user trong SQLite
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      const userId = 'USR-GGL-' + googleUserId.slice(-6);
      const randomPassword = bcrypt.hashSync(Math.random().toString(36), 10);
      db.prepare(`
        INSERT INTO users (id, email, password, fullName, phone, role, avatar, address, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(userId, email, randomPassword, name, '', role, picture, '', new Date().toISOString());

      user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    } else if (role === 'admin' && user.role !== 'admin') {
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', user.id);
      user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone || '',
      role: user.role,
      avatar: user.avatar || picture,
      address: user.address || ''
    };

    const token = generateToken(safeUser);

    res.json({
      success: true,
      message: `Đăng nhập Google thành công! Xin chào ${safeUser.fullName}.`,
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('Lỗi Google Auth:', err);
    res.status(401).json({
      success: false,
      message: 'Xác thực Google ID Token thất bại!',
      error: err.message
    });
  }
});

module.exports = router;
