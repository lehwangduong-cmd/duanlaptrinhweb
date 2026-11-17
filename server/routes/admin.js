/**
 * ============================================================
 * SportZone - Admin Dashboard Routes (/api/admin)
 * ============================================================
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Bảo vệ tất cả các endpoint trong router này chỉ dành cho Admin
router.use(authenticateToken, requireAdmin);

/**
 * GET /api/admin/stats
 * Thống kê tổng quan cho Dashboard trang Quản Trị
 */
router.get('/stats', (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;

    // Tổng doanh thu từ các đơn hàng thành công hoặc đã thanh toán
    const revenueRow = db.prepare(`
      SELECT SUM(totalAmount) as total 
      FROM orders 
      WHERE orderStatus != 'cancelled'
    `).get();
    const totalRevenue = revenueRow.total || 0;

    // 5 đơn hàng mới nhất
    const recentOrders = db.prepare(`
      SELECT id, customerName, totalAmount, orderStatus, paymentStatus, createdAt 
      FROM orders 
      ORDER BY createdAt DESC 
      LIMIT 5
    `).all();

    // Thống kê số lượng sản phẩm theo từng danh mục
    const categoryStats = db.prepare(`
      SELECT category, COUNT(*) as count 
      FROM products 
      GROUP BY category 
      ORDER BY count DESC
    `).all();

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalOrders,
        totalProducts,
        totalUsers,
        recentOrders,
        categoryStats
      }
    });
  } catch (err) {
    console.error('Lỗi lấy thống kê admin:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/users
 * Danh sách người dùng
 */
router.get('/users', (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, email, fullName, phone, role, avatar, address, createdAt 
      FROM users 
      ORDER BY createdAt DESC
    `).all();
    res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const SUPER_ADMIN_EMAIL = 'nhomanhdangcapso1vn@gmail.com';

/**
 * PUT /api/admin/users/:id/role
 * Thăng cấp hoặc hạ cấp quyền người dùng (Chỉ duy nhất Admin Chủ mới có quyền)
 */
router.put('/users/:id/role', (req, res) => {
  const { role } = req.body;
  const targetId = req.params.id;

  // 1. Chỉ duy nhất Admin Chủ (Super Admin) mới có quyền thay đổi role của tài khoản khác
  if (req.user.email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()) {
    return res.status(403).json({
      success: false,
      message: 'Từ chối truy cập: Chỉ tài khoản Admin Chủ (nhomanhdangcapso1vn@gmail.com) mới có quyền nâng cấp hoặc hạ cấp người dùng!'
    });
  }

  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Quyền role chỉ có thể là "admin" hoặc "user".' });
  }

  // 2. Không ai được phép hạ quyền của Admin Chủ
  const targetUser = db.prepare('SELECT id, email FROM users WHERE id = ?').get(targetId);
  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng cần phân quyền.' });
  }

  if (targetUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
    return res.status(400).json({ success: false, message: 'Không thể thay đổi vai trò của tài khoản Admin Chủ!' });
  }

  try {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, targetId);
    const updated = db.prepare('SELECT id, email, fullName, role FROM users WHERE id = ?').get(targetId);

    res.json({
      success: true,
      message: `Đã cập nhật vai trò tài khoản thành công!`,
      data: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Xóa tài khoản (Tuyệt đối không ai xóa được Admin Chủ)
 */
router.delete('/users/:id', (req, res) => {
  const targetId = req.params.id;

  if (req.user.id === targetId) {
    return res.status(400).json({ success: false, message: 'Bạn không thể tự xóa tài khoản của chính mình!' });
  }

  const targetUser = db.prepare('SELECT id, email FROM users WHERE id = ? OR LOWER(email) = LOWER(?)').get(targetId, targetId);
  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản cần xóa.' });
  }

  // Bảo vệ Admin Chủ tuyệt đối: Không ai xóa được
  if (targetUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
    return res.status(403).json({
      success: false,
      message: 'Hành động bị cấm: Không thể xóa tài khoản Admin Chủ (nhomanhdangcapso1vn@gmail.com)!'
    });
  }

  try {
    db.prepare('DELETE FROM users WHERE id = ? OR LOWER(email) = LOWER(?)').run(targetId, targetId);
    res.json({ success: true, message: `Đã xóa tài khoản #${targetId} thành công!` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
