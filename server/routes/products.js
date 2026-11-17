/**
 * ============================================================
 * SportZone - Product Routes (/api/products)
 * ============================================================
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Helper format product object
function formatProduct(p) {
  if (!p) return null;
  return {
    ...p,
    sizes: p.sizes ? JSON.parse(p.sizes) : []
  };
}

/**
 * GET /api/products/categories
 * Lấy danh sách tất cả các danh mục thể thao
 */
router.get('/categories', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT category, COUNT(*) as count 
      FROM products 
      GROUP BY category 
      ORDER BY count DESC
    `).all();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/products/brands
 * Lấy danh sách thương hiệu
 */
router.get('/brands', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT DISTINCT brand 
      FROM products 
      WHERE brand IS NOT NULL AND brand != ''
      ORDER BY brand ASC
    `).all().map(r => r.brand);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/products
 * Hỗ trợ lọc theo category, brand, tìm kiếm q, khoảng giá minPrice-maxPrice, sắp xếp sort
 */
router.get('/', (req, res) => {
  try {
    let { q, category, brand, minPrice, maxPrice, sort, page, limit } = req.query;

    let conditions = [];
    let params = [];

    if (q) {
      conditions.push('(name LIKE ? OR description LIKE ? OR category LIKE ? OR brand LIKE ?)');
      const searchPattern = `%${q}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (category && category !== 'all' && category !== 'Tất cả') {
      conditions.push('LOWER(category) = LOWER(?)');
      params.push(category);
    }

    if (brand && brand !== 'all' && brand !== 'Tất cả') {
      conditions.push('LOWER(brand) = LOWER(?)');
      params.push(brand);
    }

    if (minPrice) {
      conditions.push('price >= ?');
      params.push(Number(minPrice));
    }

    if (maxPrice) {
      conditions.push('price <= ?');
      params.push(Number(maxPrice));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Sắp xếp
    let orderBy = 'ORDER BY id ASC';
    if (sort === 'price_asc') orderBy = 'ORDER BY price ASC';
    else if (sort === 'price_desc') orderBy = 'ORDER BY price DESC';
    else if (sort === 'rating') orderBy = 'ORDER BY rating DESC';
    else if (sort === 'name_asc') orderBy = 'ORDER BY name ASC';
    else if (sort === 'newest') orderBy = 'ORDER BY id DESC';

    // Đếm tổng số lượng
    const countSql = `SELECT COUNT(*) as total FROM products ${whereClause}`;
    const total = db.prepare(countSql).get(...params).total;

    // Phân trang
    page = Math.max(1, parseInt(page) || 1);
    limit = Math.max(1, parseInt(limit) || 100);
    const offset = (page - 1) * limit;

    const dataSql = `SELECT * FROM products ${whereClause} ${orderBy} LIMIT ? OFFSET ?`;
    const rows = db.prepare(dataSql).all(...params, limit, offset);

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      count: rows.length,
      data: rows.map(formatProduct)
    });
  } catch (err) {
    console.error('Lỗi lấy danh sách sản phẩm:', err);
    res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
});

/**
 * GET /api/products/:id
 * Lấy chi tiết một sản phẩm
 */
router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm.' });
    }
    res.json({ success: true, data: formatProduct(row) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/products
 * Thêm sản phẩm mới (Chỉ dành cho Quản trị viên)
 */
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  const { name, category, brand, price, oldPrice, badge, image, icon, sizes, stock, description } = req.body;

  if (!name || !price || !category) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập tên sản phẩm, giá và danh mục!'
    });
  }

  try {
    const insert = db.prepare(`
      INSERT INTO products (name, category, brand, price, oldPrice, rating, reviews, badge, image, icon, sizes, stock, description, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      name.trim(),
      category.trim(),
      brand ? brand.trim() : 'SportZone',
      Number(price),
      Number(oldPrice) || 0,
      5.0,
      0,
      badge ? badge.trim() : '',
      image || 'images/products-real/giay-chay-bo.jpg',
      icon || 'fa-box',
      JSON.stringify(Array.isArray(sizes) ? sizes : ['Free size']),
      Number(stock) >= 0 ? Number(stock) : 20,
      description || '',
      new Date().toISOString()
    );

    const newProd = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: 'Thêm sản phẩm thành công!',
      data: formatProduct(newProd)
    });
  } catch (err) {
    console.error('Lỗi thêm sản phẩm:', err);
    res.status(500).json({ success: false, message: 'Không thể thêm sản phẩm.', error: err.message });
  }
});

/**
 * PUT /api/products/:id
 * Sửa sản phẩm (Chỉ dành cho Quản trị viên)
 */
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const id = req.params.id;
  const { name, category, brand, price, oldPrice, badge, image, icon, sizes, stock, description } = req.body;

  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm cần cập nhật!' });
  }

  try {
    db.prepare(`
      UPDATE products
      SET name = COALESCE(?, name),
          category = COALESCE(?, category),
          brand = COALESCE(?, brand),
          price = COALESCE(?, price),
          oldPrice = COALESCE(?, oldPrice),
          badge = COALESCE(?, badge),
          image = COALESCE(?, image),
          icon = COALESCE(?, icon),
          sizes = COALESCE(?, sizes),
          stock = COALESCE(?, stock),
          description = COALESCE(?, description)
      WHERE id = ?
    `).run(
      name !== undefined ? name.trim() : null,
      category !== undefined ? category.trim() : null,
      brand !== undefined ? brand.trim() : null,
      price !== undefined ? Number(price) : null,
      oldPrice !== undefined ? Number(oldPrice) : null,
      badge !== undefined ? badge.trim() : null,
      image !== undefined ? image : null,
      icon !== undefined ? icon : null,
      sizes !== undefined ? JSON.stringify(sizes) : null,
      stock !== undefined ? Number(stock) : null,
      description !== undefined ? description : null,
      id
    );

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.json({
      success: true,
      message: 'Cập nhật sản phẩm thành công!',
      data: formatProduct(updated)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Không thể cập nhật sản phẩm.', error: err.message });
  }
});

/**
 * DELETE /api/products/:id
 * Xóa sản phẩm (Chỉ dành cho Quản trị viên)
 */
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const id = req.params.id;
  try {
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm cần xóa!' });
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ success: true, message: `Đã xóa sản phẩm #${id} thành công!` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Không thể xóa sản phẩm.', error: err.message });
  }
});

module.exports = router;
