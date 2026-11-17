/* ── Quản lý Wishlist (LocalStorage) ── */
var Wishlist = (function() {
  const DEFAULT_WISHLIST = [
    {
      id: 1,
      name: 'Giày Chạy Bộ Nike Air Zoom Pegasus 40',
      brand: 'Nike',
      price: '2.850.000₫',
      oldPrice: '3.200.000₫',
      badge: '-11%',
      iconClass: 'fas fa-shoe-prints',
      iconColor: '#0082c3',
      bgGradient: 'linear-gradient(135deg, #e0f2fe, #bae6fd)'
    },
    {
      id: 2,
      name: 'Áo Bóng Đá Tuyển Việt Nam Chính Hãng Grand Sport',
      brand: 'Grand Sport',
      price: '550.000₫',
      oldPrice: '650.000₫',
      badge: 'Hot',
      iconClass: 'fas fa-tshirt',
      iconColor: '#dc2626',
      bgGradient: 'linear-gradient(135deg, #fee2e2, #fecaca)'
    },
    {
      id: 5,
      name: 'Kính Bơi Chống Mờ & Tia UV Chuyên Nghiệp Speedo',
      brand: 'Speedo',
      price: '380.000₫',
      oldPrice: '',
      badge: 'Bán chạy',
      iconClass: 'fas fa-glasses',
      iconColor: '#0284c7',
      bgGradient: 'linear-gradient(135deg, #e0f2fe, #cbd5e1)'
    }
  ];

  function getItems() {
    try {
      const data = localStorage.getItem('sz_wishlist');
      if (data === null) {
        localStorage.setItem('sz_wishlist', JSON.stringify(DEFAULT_WISHLIST));
        return DEFAULT_WISHLIST;
      }
      return JSON.parse(data) || [];
    } catch (e) {
      return [];
    }
  }

  function saveItems(items) {
    try {
      localStorage.setItem('sz_wishlist', JSON.stringify(items || []));
    } catch (e) {}
    updateBadge();
  }

  function toggle(productOrId) {
    const productId = typeof productOrId === 'object' && productOrId !== null ? productOrId.id : productOrId;
    const items = getItems();
    const idx = items.findIndex(i => (typeof i === 'object' ? i.id === productId : i === productId));
    let added = false;
    if (idx === -1) {
      items.push(productOrId);
      added = true;
    } else {
      items.splice(idx, 1);
      added = false;
    }
    saveItems(items);
    return { added, count: items.length, toString() { return String(added); }, valueOf() { return added; } };
  }

  function remove(productOrId) {
    const id = typeof productOrId === 'object' && productOrId !== null ? productOrId.id : productOrId;
    const items = getItems().filter(i => {
      const curId = typeof i === 'object' && i !== null ? (i.id || i.name) : i;
      return String(curId) !== String(id);
    });
    saveItems(items);
    return true;
  }

  function addItem(product) {
    const items = getItems();
    const productId = typeof product === 'object' && product !== null ? product.id : product;
    const exists = items.some(i => (typeof i === 'object' ? i.id === productId : i === productId));
    if (!exists) {
      items.push(product);
      saveItems(items);
    }
  }

  function clear() {
    saveItems([]);
  }

  function has(productId) {
    return getItems().some(i => (typeof i === 'object' ? i.id === productId : i === productId));
  }

  function getTotalQty() {
    return getItems().length;
  }

  function updateBadge() {
    const qty = getTotalQty();
    if (typeof document !== 'undefined') document.querySelectorAll('#wishlist-count, .wishlist-badge').forEach(el => {
      el.textContent = qty;
      el.style.display = qty > 0 ? 'inline-flex' : 'none';
    });
  }

  return {
    getItems,
    saveItems,
    toggle,
    remove,
    addItem,
    clear,
    has,
    getTotalQty,
    updateBadge
  };
})();

if (typeof window !== "undefined") window.Wishlist = Wishlist;
