/**
 * ============================================================
 * SportZone - Order Routes (/api/orders)
 * ============================================================
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken, requireAdmin, optionalToken } = require('../middleware/auth');

function formatOrder(o) {
  if (!o) return null;
  return {
    ...o,
    items: o.items ? JSON.parse(o.items) : []
  };
}

/**
 * POST /api/orders
 * Tạo đơn hàng mới từ giỏ hàng
 */
router.post('/', optionalToken, (req, res) => {
  const {
    customerName,
    customerEmail,
    customerPhone,
    shippingAddress,
    paymentMethod,
    items,
    shippingFee,
    notes
  } = req.body;

  if (!customerName || !customerPhone || !shippingAddress || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp đầy đủ thông tin nhận hàng và sản phẩm trong giỏ!'
    });
  }

  // Tính tổng tiền từ backend để chống gian lận giá client
  let subtotal = 0;
  for (const item of items) {
    const qty = Math.max(1, parseInt(item.quantity) || 1);
    const price = Number(item.price) || 0;
    subtotal += price * qty;
  }

  const fee = Number(shippingFee) || 0;
  const totalAmount = subtotal + fee;
  const orderId = 'SZ-ORD-' + Math.floor(100000 + Math.random() * 900000);
  const userId = req.user ? req.user.id : (req.body.userId || 'GUEST');
  const createdAt = new Date().toISOString();

  // Thực hiện Transaction: Lưu đơn hàng và trừ tồn kho
  const createOrderTransaction = db.transaction(() => {
    // 1. Trừ số lượng tồn kho sản phẩm
    const updateStock = db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?');
    for (const item of items) {
      if (item.id) {
        updateStock.run(Number(item.quantity) || 1, item.id);
      }
    }

    // 2. Chèn đơn hàng mới
    const insertOrder = db.prepare(`
      INSERT INTO orders (
        id, userId, customerName, customerEmail, customerPhone,
        shippingAddress, paymentMethod, paymentStatus, orderStatus,
        items, subtotal, shippingFee, totalAmount, notes, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertOrder.run(
      orderId,
      userId,
      customerName.trim(),
      customerEmail ? customerEmail.trim() : '',
      customerPhone.trim(),
      shippingAddress.trim(),
      paymentMethod || 'cod',
      paymentMethod === 'bank_transfer' ? 'pending_verification' : 'unpaid',
      'pending',
      JSON.stringify(items),
      subtotal,
      fee,
      totalAmount,
      notes || '',
      createdAt
    );

    return db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  });

  try {
    const newOrder = createOrderTransaction();
    res.status(201).json({
      success: true,
      message: 'Đặt hàng thành công! Mã đơn của bạn là ' + orderId,
      data: formatOrder(newOrder)
    });
  } catch (err) {
    console.error('Lỗi tạo đơn hàng:', err);
    res.status(500).json({
      success: false,
      message: 'Không thể tạo đơn hàng.',
      error: err.message
    });
  }
});

/**
 * GET /api/orders/my-orders
 * Lấy lịch sử đơn hàng của người dùng đang đăng nhập
 */
router.get('/my-orders', authenticateToken, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT * FROM orders 
      WHERE userId = ? OR customerEmail = ? 
      ORDER BY createdAt DESC
    `).all(req.user.id, req.user.email);

    res.json({
      success: true,
      count: rows.length,
      data: rows.map(formatOrder)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/orders
 * Lấy tất cả đơn hàng (Chỉ dành cho Quản trị viên)
 */
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { status, q } = req.query;
    let conditions = [];
    let params = [];

    if (status && status !== 'all') {
      conditions.push('orderStatus = ?');
      params.push(status);
    }

    if (q) {
      conditions.push('(id LIKE ? OR customerName LIKE ? OR customerPhone LIKE ? OR customerEmail LIKE ?)');
      const pattern = `%${q}%`;
      params.push(pattern, pattern, pattern, pattern);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM orders ${whereClause} ORDER BY createdAt DESC`;
    const rows = db.prepare(sql).all(...params);

    res.json({
      success: true,
      count: rows.length,
      data: rows.map(formatOrder)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/orders/:id
 * Xem chi tiết một đơn hàng theo mã đơn
 */
router.get('/:id', (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng này.' });
    }
    res.json({ success: true, data: formatOrder(order) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/orders/:id/status
 * Cập nhật trạng thái đơn hàng (Chỉ dành cho Quản trị viên)
 */
router.put('/:id/status', authenticateToken, requireAdmin, (req, res) => {
  const { orderStatus, paymentStatus } = req.body;
  const id = req.params.id;

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng cần cập nhật!' });
  }

  try {
    db.prepare(`
      UPDATE orders
      SET orderStatus = COALESCE(?, orderStatus),
          paymentStatus = COALESCE(?, paymentStatus)
      WHERE id = ?
    `).run(orderStatus, paymentStatus, id);

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);

    res.json({
      success: true,
      message: 'Cập nhật trạng thái đơn hàng thành công!',
      data: formatOrder(updated)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Không thể cập nhật đơn hàng.', error: err.message });
  }
});

module.exports = router;
