/**
 * ============================================================
 * SportZone - Wishlist & Favorites System (Quản lý Yêu thích)
 * ============================================================
 */
const Wishlist = (function () {
  const STORAGE_KEY = 'sz_wishlist';

  // Dữ liệu mẫu danh sách yêu thích
  const DEFAULT_WISHLIST = [
    {
      id: 'PROD-1',
      name: 'Giày chạy bộ Run Active Pro',
      brand: 'Kalenji',
      price: '699.000đ',
      oldPrice: '999.000đ',
      badge: '-30%',
      iconClass: 'fas fa-shoe-prints',
      iconColor: '#0082c3',
      bgGradient: 'linear-gradient(135deg,#e3f2fd,#bbdefb)'
    },
    {
      id: 'PROD-2',
      name: 'Áo bóng đá thi đấu CLB 2025',
      brand: 'Kipsta',
      price: '349.000đ',
      oldPrice: '',
      badge: 'Mới',
      iconClass: 'fas fa-tshirt',
      iconColor: '#43a047',
      bgGradient: 'linear-gradient(135deg,#e8f5e9,#c8e6c9)'
    },
    {
      id: 'PROD-3',
      name: 'Thảm Yoga TPE 6mm cao cấp',
      brand: 'Domyos',
      price: '299.000đ',
      oldPrice: '499.000đ',
      badge: '-40%',
      iconClass: 'fas fa-tape',
      iconColor: '#7b1fa2',
      bgGradient: 'linear-gradient(135deg,#f3e5f5,#e1bee7)'
    }
  ];

  function getItems() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_WISHLIST));
        return DEFAULT_WISHLIST;
      }
      return JSON.parse(data) || [];
    } catch (e) {
      return [];
    }
  }

  function saveItems(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    updateBadges();
  }

  function add(product) {
    const items = getItems();
    if (!items.some(p => p.id === product.id || p.name === product.name)) {
      items.push(product);
      saveItems(items);
      return true;
    }
    return false;
  }

  function remove(productIdOrName) {
    let items = getItems();
    items = items.filter(p => p.id !== productIdOrName && p.name !== productIdOrName);
    saveItems(items);
    return items;
  }

  function toggle(product) {
    const items = getItems();
    const index = items.findIndex(p => p.id === product.id || p.name === product.name);
    if (index > -1) {
      items.splice(index, 1);
      saveItems(items);
      return { added: false, count: items.length, product };
    } else {
      items.push(product);
      saveItems(items);
      return { added: true, count: items.length, product };
    }
  }

  function has(productIdOrName) {
    return getItems().some(p => p.id === productIdOrName || p.name === productIdOrName);
  }

  function count() {
    return getItems().length;
  }

  function updateBadges() {
    if (typeof document === 'undefined') return;
    const c = count();
    document.querySelectorAll('#wishlist-count, .nav-action-btn[aria-label="Yêu thích"] .badge').forEach(badge => {
      badge.textContent = c;
    });
  }

  function init() {
    updateBadges();
    if (typeof document !== 'undefined') {
      const items = getItems();
      document.querySelectorAll('.product-card').forEach(card => {
        const name = card.querySelector('.product-name')?.textContent.trim();
        const btn = card.querySelector('.btn-wishlist');
        if (btn && name && items.some(p => p.name === name)) {
          btn.classList.add('active');
          btn.innerHTML = '<i class="fas fa-heart"></i>';
          btn.style.borderColor = '#e53935';
          btn.style.color = '#e53935';
        }
      });
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  return {
    getItems,
    saveItems,
    add,
    remove,
    toggle,
    has,
    count,
    updateBadges,
    init
  };
})();

if (typeof window !== 'undefined') {
  window.Wishlist = Wishlist;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Wishlist;
}

