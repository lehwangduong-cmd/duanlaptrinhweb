/**
 * ============================================================
 * SportZone - SQLite Database Manager (better-sqlite3)
 * ============================================================
 * Tự động khởi tạo cấu trúc bảng, khóa ngoại và nạp dữ liệu mẫu
 * ============================================================
 */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { DEFAULT_USERS, getAllSeedProducts, DEFAULT_ORDERS } = require('./seed-data');

const DB_PATH = path.resolve(process.env.DATABASE_PATH || path.join(__dirname, 'sportzone.db'));
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);

// Tối ưu hóa hiệu năng SQLite
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  console.log(`📦 Đang kết nối SQLite Database: ${DB_PATH}`);
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. Tạo bảng USERS
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      fullName TEXT NOT NULL,
      phone TEXT,
      role TEXT DEFAULT 'user',
      avatar TEXT,
      address TEXT,
      createdAt TEXT NOT NULL
    );
  `);

  // 2. Tạo bảng PRODUCTS
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      brand TEXT DEFAULT 'SportZone',
      price REAL NOT NULL,
      oldPrice REAL DEFAULT 0,
      rating REAL DEFAULT 5.0,
      reviews INTEGER DEFAULT 0,
      badge TEXT DEFAULT '',
      image TEXT NOT NULL,
      icon TEXT DEFAULT 'fa-box',
      sizes TEXT DEFAULT '[]',
      stock INTEGER DEFAULT 20,
      description TEXT,
      createdAt TEXT NOT NULL
    );
  `);

  // 3. Tạo bảng ORDERS
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      userId TEXT,
      customerName TEXT NOT NULL,
      customerEmail TEXT NOT NULL,
      customerPhone TEXT NOT NULL,
      shippingAddress TEXT NOT NULL,
      paymentMethod TEXT DEFAULT 'cod',
      paymentStatus TEXT DEFAULT 'unpaid',
      orderStatus TEXT DEFAULT 'pending',
      items TEXT NOT NULL,
      subtotal REAL NOT NULL,
      shippingFee REAL DEFAULT 0,
      totalAmount REAL NOT NULL,
      notes TEXT,
      createdAt TEXT NOT NULL
    );
  `);

  // ==========================================
  // SEED DỮ LIỆU BAN ĐẦU NẾU CHƯA CÓ
  // ==========================================

  // Seed Users
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (!isProduction && userCount === 0) {
    console.log('🌱 Đang khởi tạo tài khoản mặc định vào SQLite...');
    const insertUser = db.prepare(`
      INSERT INTO users (id, email, password, fullName, phone, role, avatar, address, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertManyUsers = db.transaction((users) => {
      for (const u of users) {
        const hash = bcrypt.hashSync(u.password, 10);
        insertUser.run(
          u.id,
          u.email,
          hash,
          u.fullName,
          u.phone,
          u.role,
          u.avatar,
          u.address,
          new Date().toISOString()
        );
      }
    });

    insertManyUsers(DEFAULT_USERS);
    console.log(`✅ Đã nạp thành công ${DEFAULT_USERS.length} tài khoản (Admin & Demo user)!`);
  }

  // Seed Products
  const prodCount = db.prepare('SELECT COUNT(*) AS count FROM products').get().count;
  if (prodCount === 0) {
    console.log('🌱 Đang khởi tạo danh mục và sản phẩm mẫu vào SQLite...');
    const seedProducts = getAllSeedProducts();
    const insertProd = db.prepare(`
      INSERT INTO products (id, name, category, brand, price, oldPrice, rating, reviews, badge, image, icon, sizes, stock, description, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertManyProducts = db.transaction((products) => {
      for (const p of products) {
        insertProd.run(
          p.id,
          p.name,
          p.category,
          p.brand || 'SportZone',
          p.price,
          p.oldPrice || 0,
          p.rating || 5.0,
          p.reviews || 0,
          p.badge || '',
          p.image,
          p.icon || 'fa-box',
          JSON.stringify(p.sizes || []),
          p.stock || 20,
          p.description || '',
          new Date().toISOString()
        );
      }
    });

    insertManyProducts(seedProducts);
    console.log(`✅ Đã nạp thành công ${seedProducts.length} sản phẩm thể thao vào SQLite!`);
  }

  // Seed Orders
  const orderCount = db.prepare('SELECT COUNT(*) AS count FROM orders').get().count;
  if (!isProduction && orderCount === 0) {
    console.log('🌱 Đang khởi tạo đơn hàng mẫu vào SQLite...');
    const insertOrder = db.prepare(`
      INSERT INTO orders (id, userId, customerName, customerEmail, customerPhone, shippingAddress, paymentMethod, paymentStatus, orderStatus, items, subtotal, shippingFee, totalAmount, notes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertManyOrders = db.transaction((orders) => {
      for (const o of orders) {
        insertOrder.run(
          o.id,
          o.userId,
          o.customerName,
          o.customerEmail,
          o.customerPhone,
          o.shippingAddress,
          o.paymentMethod,
          o.paymentStatus,
          o.orderStatus,
          JSON.stringify(o.items || []),
          o.subtotal,
          o.shippingFee,
          o.totalAmount,
          o.notes,
          o.createdAt
        );
      }
    });

    insertManyOrders(DEFAULT_ORDERS);
    console.log(`✅ Đã nạp thành công ${DEFAULT_ORDERS.length} đơn hàng mẫu!`);
  }
}

// Khởi tạo ngay khi module được nạp
initDatabase();

module.exports = db;
