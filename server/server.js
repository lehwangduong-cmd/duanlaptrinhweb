/**
 * ============================================================
 * SportZone - Fullstack Express & SQLite Backend Server
 * ============================================================
 * Cung cấp toàn bộ RESTful API cho dự án SportZone:
 *  - /api/auth     : Đăng ký, Đăng nhập, Profile, Google OAuth, Đổi mật khẩu
 *  - /api/products : Lấy danh sách, Tìm kiếm, Lọc, Chi tiết, Thêm/Sửa/Xóa (Admin)
 *  - /api/orders   : Đặt hàng, Lịch sử đơn hàng, Quản lý đơn hàng (Admin)
 *  - /api/admin    : Thống kê doanh thu, Quản lý người dùng
 * ============================================================
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Đọc cấu hình từ .env
dotenv.config();

// Khởi tạo và nạp database SQLite
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Cho phép gọi từ Live Server (5500), Python server, hoặc file://
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// Hỗ trợ nhận webhook thanh toán từ điện thoại (chấp nhận cả text thô, json có xuống dòng từ MacroDroid)
app.use('/api/orders/webhook/payment', express.text({ type: '*/*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SportZone SQLite & Express Fullstack Backend',
    database: 'SQLite (sportzone.db)',
    timestamp: new Date().toISOString()
  });
});

// Import các routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');

// Đăng ký routes vào app
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// Xử lý 404 cho API
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint không tồn tại: ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Lỗi hệ thống:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Lỗi máy chủ nội bộ.'
  });
});

// Khởi động server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🏆 SportZone Fullstack Backend đang chạy tại: http://localhost:${PORT}`);
  console.log(`📦 Database: SQLite (${path.join(__dirname, 'sportzone.db')})`);
  console.log(`📡 Endpoints khả dụng:`);
  console.log(`   - Auth     : http://localhost:${PORT}/api/auth`);
  console.log(`   - Products : http://localhost:${PORT}/api/products`);
  console.log(`   - Orders   : http://localhost:${PORT}/api/orders`);
  console.log(`   - Admin    : http://localhost:${PORT}/api/admin/stats`);
  console.log(`   - Health   : http://localhost:${PORT}/api/health`);
  console.log(`=======================================================`);
});
