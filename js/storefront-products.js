'use strict';

(() => {
  const PRODUCTS_KEY = 'sportzone_products';
  const MAX_CARDS = 4;

  function readProducts() {
    try {
      const raw = localStorage.getItem(PRODUCTS_KEY);
      if (raw === null) return null;
      const products = JSON.parse(raw);
      if (!Array.isArray(products)) {
        console.error('[Storefront] Danh sách sản phẩm không hợp lệ.');
        return null;
      }
      return products.filter(product => product && typeof product === 'object');
    } catch (error) {
      console.error('[Storefront] Không thể đọc danh sách sản phẩm:', error);
      return null;
    }
  }

  function renderStorefront() {
    const products = readProducts();
    if (!products) return;

    const featuredGrid = document.querySelector('[data-storefront-products="featured"]');
    const latestGrid = document.querySelector('[data-storefront-products="latest"]');
    const sorted = products.slice().sort((a, b) => {
      const aCreated = Date.parse(a.createdAt || '');
      const bCreated = Date.parse(b.createdAt || '');
      if (Number.isFinite(aCreated) && Number.isFinite(bCreated)) return bCreated - aCreated;
      if (Number.isFinite(aCreated)) return -1;
      if (Number.isFinite(bCreated)) return 1;
      return 0;
    });

    if (featuredGrid) {
      featuredGrid.innerHTML = sorted.slice(0, MAX_CARDS)
        .map(product => renderCard(product, featuredGrid.dataset.productDetailPrefix || '')).join('');
    }
    if (latestGrid) {
      latestGrid.innerHTML = sorted.slice(0, MAX_CARDS)
        .map(product => renderCard(product, latestGrid.dataset.productDetailPrefix || '')).join('');
    }
  }

  function renderCard(product, pathPrefix) {
    const id = String(product.id ?? product.name ?? '');
    const name = escapeHtml(product.name || 'Sản phẩm');
    const category = escapeHtml(product.category || 'Khác');
    const brand = escapeHtml(product.brand || 'SportZone');
    const image = resolveAsset(
      product.image || product.placeholderImage || getPlaceholder(product.category),
      pathPrefix
    );
    const price = Number(product.price) || 0;
    const stock = Number(product.stock ?? product.quantity) || 0;
    const badge = product.badge || (product.createdAt ? 'Mới' : '');
    const wishlist = typeof Wishlist !== 'undefined' && Wishlist.has(product.id);

    return `<article class="product-card" data-product-id="${escapeHtml(id)}" data-category="${category}">
      ${badge ? `<span class="product-badge">${escapeHtml(badge)}</span>` : ''}
      <a class="product-detail-link" href="${pathPrefix}product-detail.html?id=${encodeURIComponent(id)}">
        <div class="product-img"><img src="${escapeHtml(image)}" alt="${name}" loading="lazy" decoding="async"></div>
        <div class="product-body">
          <div class="product-brand">${brand}</div>
          <div class="product-name">${name}</div>
          <div class="product-price"><span class="price-current">${formatMoney(price)}</span></div>
        </div>
      </a>
      <div class="product-actions">
        <button class="btn-add-cart" type="button" data-store-cart="${escapeHtml(id)}" ${stock < 1 ? 'disabled' : ''}>
          ${stock < 1 ? 'Hết hàng' : '<i class="fas fa-cart-plus"></i> Thêm giỏ'}
        </button>
        <button class="btn-wishlist${wishlist ? ' active' : ''}" type="button" data-store-wishlist="${escapeHtml(id)}" aria-label="Yêu thích">
          <i class="${wishlist ? 'fas' : 'far'} fa-heart"></i>
        </button>
      </div>
    </article>`;
  }

  function bindActions() {
    document.addEventListener('click', event => {
      const cartButton = event.target.closest('[data-store-cart]');
      if (cartButton) {
        const product = (readProducts() || []).find(item => String(item.id ?? item.name) === cartButton.dataset.storeCart);
        if (product && typeof Cart !== 'undefined') {
          Cart.addItem({
            ...product,
            selectedSize: product.sizes?.[0] || 'Free size',
            selectedColor: product.colors?.[0] || 'Xanh'
          });
        }
        return;
      }

      const wishlistButton = event.target.closest('[data-store-wishlist]');
      if (!wishlistButton || typeof Wishlist === 'undefined') return;
      const product = (readProducts() || []).find(item => String(item.id ?? item.name) === wishlistButton.dataset.storeWishlist);
      if (!product) return;
      const result = Wishlist.toggle(product);
      wishlistButton.classList.toggle('active', result.added);
      wishlistButton.querySelector('i').className = `${result.added ? 'fas' : 'far'} fa-heart`;
    });
  }

  function formatMoney(value) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  }

  function getPlaceholder(category) {
    return {
      'Chạy bộ': 'images/products/ao-chay-bo.svg',
      'Bóng đá': 'images/products/bong-da.svg',
      'Bơi lội': 'images/products/kinh-boi.svg',
      'Gym': 'images/products/ta-tay.svg',
      'Yoga': 'images/products/tham-yoga.svg',
      'Cầu lông': 'images/products/vot-cau-long.svg'
    }[category] || 'images/products/balo-gym.svg';
  }

  function resolveAsset(path, prefix) {
    if (/^(?:[a-z]+:|\/|data:)/i.test(path)) return path;
    return `${prefix}${path}`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderStorefront();
    bindActions();
  });
  window.addEventListener('storage', event => {
    if (event.key === PRODUCTS_KEY || event.key === null) renderStorefront();
  });
  window.addEventListener('sz:products-updated', renderStorefront);
})();
