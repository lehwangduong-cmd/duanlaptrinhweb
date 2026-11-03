/**
 * ============================================================
 *  shared.js – JavaScript dùng CHUNG toàn dự án
 *  Tất cả thành viên (TV1–TV5) đều nhúng file này
 *  Chứa: quản lý giỏ hàng (localStorage), kiểm tra đăng nhập,
 *         cập nhật badge số lượng trên navbar
 * ============================================================
 */

/* ── Quản lý Giỏ hàng (LocalStorage) ── */
const Cart = {
  getItems() {
    return JSON.parse(localStorage.getItem('sz_cart') || '[]');
  },
  addItem(product) {
    const items = this.getItems();
    const existing = items.find(i => i.id === product.id);
    if (existing) {
      existing.qty = (existing.qty || 1) + 1;
    } else {
      items.push({ ...product, qty: 1 });
    }
    localStorage.setItem('sz_cart', JSON.stringify(items));
    this.updateBadge();
    this.showToast(`Đã thêm "${product.name}" vào giỏ hàng!`);
  },
  removeItem(id) {
    const items = this.getItems().filter(i => i.id !== id);
    localStorage.setItem('sz_cart', JSON.stringify(items));
    this.updateBadge();
  },
  getTotalQty() {
    return this.getItems().reduce((sum, i) => sum + (i.qty || 1), 0);
  },
  updateBadge() {
    const qty = this.getTotalQty();
    document.querySelectorAll('#cart-count, .cart-badge').forEach(el => {
      el.textContent = qty;
      el.style.display = qty > 0 ? 'flex' : 'none';
    });
  }
};

/* ── Quản lý Wishlist (LocalStorage) ── */
const Wishlist = {
  getItems() {
    return JSON.parse(localStorage.getItem('sz_wishlist') || '[]');
  },
  toggle(productId) {
    const items = this.getItems();
    const idx = items.indexOf(productId);
    if (idx === -1) { items.push(productId); }
    else { items.splice(idx, 1); }
    localStorage.setItem('sz_wishlist', JSON.stringify(items));
    this.updateBadge();
    return idx === -1; // true = đã thêm
  },
  has(productId) {
    return this.getItems().includes(productId);
  },
  getTotalQty() {
    return this.getItems().length;
  },
  updateBadge() {
    const qty = this.getTotalQty();
    document.querySelectorAll('#wishlist-count, .wishlist-badge').forEach(el => {
      el.textContent = qty;
      el.style.display = qty > 0 ? 'flex' : 'none';
    });
  }
};

/* ── Quản lý Auth ── */
const Auth = {
  isLoggedIn() {
    return !!localStorage.getItem('sz_user');
  },
  getUser() {
    return JSON.parse(localStorage.getItem('sz_user') || 'null');
  },
  login(user) {
    localStorage.setItem('sz_user', JSON.stringify(user));
  },
  logout() {
    localStorage.removeItem('sz_user');
    window.location.href = '/index.html';
  }
};

/* ── Toast thông báo ── */
Cart.showToast = function (msg, type = 'success') {
  const existing = document.getElementById('sz-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'sz-toast';
  toast.style.cssText = `
    position:fixed; bottom:80px; right:24px; z-index:9999;
    background:${type === 'success' ? '#43a047' : '#e53935'};
    color:#fff; padding:12px 20px; border-radius:8px;
    font-size:14px; font-weight:600; box-shadow:0 4px 16px rgba(0,0,0,0.2);
    animation: slideIn .3s ease; max-width:300px;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
};

/* ── Khởi chạy khi trang load ── */
document.addEventListener('DOMContentLoaded', () => {
  Cart.updateBadge();
  Wishlist.updateBadge();
});
