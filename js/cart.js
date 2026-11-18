/**
 * cart.js - Module Giỏ Hàng
 * Dự án: SportZone - Website Bán Đồ Thể Thao
 * Thành viên: Member 4 - Module Shopping Cart
 *
 * Mô tả: Xử lý toàn bộ logic nghiệp vụ của giỏ hàng:
 *  - Hiển thị sản phẩm từ localStorage
 *  - Tăng/giảm số lượng, xóa sản phẩm
 *  - Chọn nhiều / chọn tất cả
 *  - Tính tổng tiền tự động
 *  - Áp dụng mã giảm giá
 *  - Điều hướng sang trang Checkout
 *
 * ============================================================
 * CẤU TRÚC DỮ LIỆU SẢN PHẨM (Thống nhất với Member 2)
 * ============================================================
 * Mỗi sản phẩm trong localStorage['sportzone_cart'] là 1 object:
 * {
 *   id:        String  - Mã sản phẩm duy nhất, VD: "SP001"
 *   name:      String  - Tên sản phẩm
 *   brand:     String  - Thương hiệu
 *   price:     Number  - Đơn giá (VNĐ)
 *   image:     String  - URL ảnh sản phẩm
 *   size:      String  - Kích thước, VD: "L", "42", "M"
 *   color:     String  - Màu sắc
 *   category:  String  - Danh mục, VD: "Bóng đá"
 *   quantity:  Number  - Số lượng trong giỏ (>= 1)
 * }
 * ============================================================
 */

'use strict'; // Bật chế độ strict để dễ phát hiện lỗi

/* ============================================================
   HẰNG SỐ CẤU HÌNH
   ============================================================ */

/** Key trong localStorage để lưu giỏ hàng
 *  QUAN TRỌNG: Tất cả thành viên phải dùng chung key này
 *  - Member 2 (Product page): dùng key này để thêm sản phẩm vào giỏ
 *  - Member 4 (Cart page): đọc và ghi key này
 *  - Member 5 (Checkout page): đọc key này để lấy dữ liệu đặt hàng
 */
const CART_KEY = 'sportzone_cart';

/** Key lưu thông tin đơn hàng để chuyển sang Checkout (Member 5 đọc) */
const ORDER_KEY = 'sportzone_order';

/** Key lưu mã giảm giá đang áp dụng trong giỏ hàng */
const COUPON_KEY = 'sportzone_applied_coupon';

/** Mức giá để được miễn phí vận chuyển (VNĐ) */
const FREE_SHIPPING_THRESHOLD = 500000;

/** Phí vận chuyển mặc định nếu không đủ điều kiện */
const SHIPPING_FEE = 30000;

/**
 * Các mã giảm giá có hiệu lực từ 01/01/2026 đến hết 31/12/2026.
 * Mỗi đơn chỉ dùng một mã hoặc một ưu đãi mua nhiều.
 */
const COUPON_CODES = {
    'SPORT10': {
        discount: 10, label: 'Giảm 10% cho đơn hàng thể thao', minimumSubtotal: 0,
        validFrom: '2026-01-01T00:00:00+07:00', expiresAt: '2027-01-01T00:00:00+07:00',
    },
    'SAVE20': {
        discount: 20, label: 'Giảm 20% dịp khai trương', minimumSubtotal: 0,
        validFrom: '2026-01-01T00:00:00+07:00', expiresAt: '2027-01-01T00:00:00+07:00',
    },
    'VIP50': {
        discount: 50, label: 'Giảm 50% dành cho VIP member', minimumSubtotal: 0,
        validFrom: '2026-01-01T00:00:00+07:00', expiresAt: '2027-01-01T00:00:00+07:00',
    },
    'NEWUSER': {
        discount: 15, label: 'Giảm 15% cho khách hàng mới', minimumSubtotal: 0,
        validFrom: '2026-01-01T00:00:00+07:00', expiresAt: '2027-01-01T00:00:00+07:00',
    },
    'VIP15': {
        discount: 15, label: 'Ưu đãi khách hàng thân thiết', minimumSubtotal: 500000,
        validFrom: '2026-01-01T00:00:00+07:00', expiresAt: '2027-01-01T00:00:00+07:00',
    },
    'WELCOME10': {
        discount: 10, label: 'Ưu đãi chào mừng', minimumSubtotal: 200000,
        validFrom: '2026-01-01T00:00:00+07:00', expiresAt: '2027-01-01T00:00:00+07:00',
    },
};

/* ============================================================
   BIẾN TRẠNG THÁI (State Variables)
   Lưu trạng thái hiện tại của giỏ hàng trong bộ nhớ
   ============================================================ */

/** Danh sách sản phẩm trong giỏ hàng (đọc từ localStorage) */
let cartItems = [];

/** Tập hợp ID các sản phẩm đang được chọn (để tính tổng tiền) */
let selectedIds = new Set();

/** Thông tin mã giảm giá đang áp dụng, null nếu chưa áp dụng */
let appliedCoupon = null; // { code, discount, label }

/** ID timer để delay khi tính tổng (debounce) */
let calcDebounceTimer = null;

function getCartLineId(item) {
    return [
        String(item.id),
        item.size || '',
        item.color || '',
    ].map(value => encodeURIComponent(value).replace(/_/g, '%5F')).join('__');
}

function getCartItemMax(item) {
    if (item.stock === undefined || item.stock === null || item.stock === '') return 99;
    const stock = Number(item.stock);
    if (!Number.isInteger(stock) || stock < 0) return 99;
    return Math.min(99, stock);
}

function getCartPlaceholder(item) {
    const images = {
        'Chạy bộ': '../images/products/ao-chay-bo.svg',
        'Bóng đá': '../images/products/bong-da.svg',
        'Gym': '../images/products/ta-tay.svg',
        'Bơi lội': '../images/products/kinh-boi.svg',
        'Yoga': '../images/products/tham-yoga.svg',
        'Xe đạp': '../images/products/dong-ho-gps.svg',
        'Bóng rổ': '../images/products/bong-da.svg',
        'Cầu lông': '../images/products/vot-cau-long.svg',
    };
    return Object.prototype.hasOwnProperty.call(images, item.category)
        ? images[item.category]
        : '../images/products/balo-gym.svg';
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    })[character]);
}

function getCartImageUrl(item) {
    const fallback = getCartPlaceholder(item);
    const image = typeof item.image === 'string' ? item.image.trim() : '';

    try {
        const siteRoot = new URL('../', window.location.href);
        const imageUrl = new URL(image || fallback, siteRoot);
        return imageUrl.protocol === 'http:' || imageUrl.protocol === 'https:'
            ? imageUrl.href
            : new URL(fallback, siteRoot).href;
    } catch (error) {
        return fallback;
    }
}

function normalizeCartItems(items) {
    const normalizedItems = [];
    const itemsByLineId = new Map();
    let invalidCount = 0;

    items.forEach(item => {
        if (!item || typeof item !== 'object' || item.id === undefined || item.id === null ||
            String(item.id).trim() === '') {
            invalidCount++;
            return;
        }

        const price = Number(item.price);
        const quantity = Number(item.quantity ?? item.qty ?? 1);
        if (item.price === undefined || item.price === null || item.price === '' ||
            !Number.isFinite(price) || price < 0 || !Number.isInteger(quantity) || quantity < 1) {
            invalidCount++;
            return;
        }

        const normalizedItem = {
            ...item,
            id: String(item.id),
            name: String(item.name || 'Sản phẩm'),
            brand: String(item.brand || ''),
            category: String(item.category || ''),
            price,
            quantity,
            size: String(item.size || item.selectedSize || item.sizes?.[0] || ''),
            color: String(item.color || item.selectedColor || ''),
        };
        const lineId = getCartLineId(normalizedItem);
        const existingItem = itemsByLineId.get(lineId);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            itemsByLineId.set(lineId, normalizedItem);
            normalizedItems.push(normalizedItem);
        }
    });

    if (invalidCount > 0) {
        console.warn(`[Cart] Đã bỏ qua ${invalidCount} sản phẩm có dữ liệu không hợp lệ.`);
    }
    return normalizedItems;
}

/* ============================================================
   KHỞI TẠO KHI TRANG TẢI XONG
   ============================================================ */

/**
 * Hàm khởi tạo chính - chạy ngay khi DOM sẵn sàng
 * Thứ tự: Load dữ liệu thật → Render → Gán events
 */
document.addEventListener('DOMContentLoaded', function () {
    // 1. Đọc dữ liệu từ localStorage
    cartItems = loadCartFromStorage();

    // 2. Chọn tất cả sản phẩm mặc định
    cartItems.forEach(item => selectedIds.add(getCartLineId(item)));

    // 3. Khôi phục mã giảm giá đã áp dụng
    restoreAppliedCoupon();

    // 4. Render giao diện
    renderCart();

    // 5. Cập nhật badge số lượng trên icon giỏ hàng
    updateCartBadge();

    // 6. Gán các sự kiện
    bindEvents();
});

window.addEventListener('storage', event => {
    if (event.key === COUPON_KEY) {
        restoreAppliedCoupon();
        calculateTotals();
    } else if (event.key === CART_KEY || event.key === null) {
        cartItems = loadCartFromStorage();
        selectedIds = new Set(cartItems.map(getCartLineId));
        renderCart();
    }
});

/* ============================================================
   LOCALSTORAGE - Đọc / Ghi dữ liệu
   ============================================================ */

/**
 * Đọc giỏ hàng từ localStorage
 * @returns {Array} Mảng sản phẩm, hoặc mảng rỗng nếu không có
 */
function loadCartFromStorage() {
    try {
        const raw = localStorage.getItem(CART_KEY);
        if (raw !== null) {
            const items = JSON.parse(raw);
            return Array.isArray(items) ? normalizeCartItems(items) : [];
        }

        const legacyItems = JSON.parse(localStorage.getItem('sz_cart') || '[]');
        if (!Array.isArray(legacyItems)) return [];
        const migratedItems = normalizeCartItems(legacyItems);
        if (migratedItems.length) saveCartToStorage(migratedItems);
        return migratedItems;
    } catch (err) {
        console.error('[Cart] Lỗi đọc localStorage:', err);
        return [];
    }
}

/**
 * Lưu giỏ hàng vào localStorage
 * @param {Array} items - Mảng sản phẩm cần lưu
 */
function saveCartToStorage(items) {
    try {
        localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch (err) {
        console.error('[Cart] Lỗi ghi localStorage:', err);
        showToast('Không thể lưu giỏ hàng. Dung lượng có thể đầy.', 'error');
    }
}

/* ============================================================
   RENDER - Vẽ giao diện giỏ hàng
   ============================================================ */

/**
 * Render toàn bộ giao diện giỏ hàng
 * Gọi lại mỗi khi dữ liệu thay đổi
 */
function renderCart() {
    const cartEmpty   = document.getElementById('cartEmpty');
    const cartContent = document.getElementById('cartContent');
    const cartItemsEl = document.getElementById('cartItems');

    // Cập nhật tiêu đề
    const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cartItemCount').textContent =
        `${totalQuantity} sản phẩm`;
    document.getElementById('totalItemsCount').textContent = totalQuantity;

    if (cartItems.length === 0) {
        // Giỏ hàng trống: hiện thông báo, ẩn nội dung
        cartEmpty.classList.add('visible');
        cartContent.style.display = 'none';

        // Reset badge
        updateCartBadge();
        return;
    }

    // Có sản phẩm: ẩn thông báo, hiện nội dung
    cartEmpty.classList.remove('visible');
    cartContent.style.display = 'grid';

    // Render từng sản phẩm
    cartItemsEl.innerHTML = cartItems.map(item => renderCartItem(item)).join('');

    // Cập nhật trạng thái "Chọn tất cả"
    updateSelectAllState();

    // Tính và hiển thị tổng tiền
    calculateTotals();

    // Cập nhật badge icon giỏ hàng
    updateCartBadge();

    // Gán events cho các element vừa render (vì innerHTML tạo mới)
    bindItemEvents();
}

/**
 * Tạo HTML cho một sản phẩm trong giỏ hàng
 * @param {Object} item - Object sản phẩm
 * @returns {String} HTML string
 */
function renderCartItem(item) {
    const lineId = getCartLineId(item);
    const imageFallback = getCartPlaceholder(item);
    const imageUrl = getCartImageUrl(item);
    const isChecked = selectedIds.has(lineId) ? 'checked' : '';
    const isSelected = selectedIds.has(lineId) ? 'selected' : '';
    const lineTotal = item.price * item.quantity;
    const maxQuantity = getCartItemMax(item);
    const stockWarning = `
        <p class="cart-item__stock-warning" role="status" ${item.quantity <= maxQuantity ? 'hidden' : ''}>
            Chỉ còn ${maxQuantity} sản phẩm khả dụng. Hãy giảm số lượng hoặc xóa sản phẩm này.
        </p>`;

    return `
    <div class="cart-item ${isSelected}" data-id="${escapeHtml(lineId)}" id="item-${escapeHtml(lineId)}">

        <!-- Nút xóa (góc trên phải) -->
        <button
            class="cart-item__delete"
            data-action="delete"
            data-id="${escapeHtml(lineId)}"
            title="Xóa sản phẩm"
            aria-label="Xóa ${escapeHtml(item.name)}"
        >
            <i class="fas fa-times"></i>
        </button>

        <!-- Checkbox chọn sản phẩm -->
        <div class="cart-item__checkbox">
            <label class="checkbox-label">
                <input
                    type="checkbox"
                    class="checkbox-input item-checkbox"
                    data-id="${escapeHtml(lineId)}"
                    ${isChecked}
                >
                <span class="checkbox-custom"></span>
            </label>
        </div>

        <!-- Ảnh sản phẩm -->
        <div class="cart-item__image">
            <img
                src="${escapeHtml(imageUrl)}"
                data-fallback="${escapeHtml(new URL(imageFallback, new URL('../', window.location.href)).href)}"
                alt="${escapeHtml(item.name)}"
                loading="lazy"
            >
        </div>

        <!-- Thông tin sản phẩm -->
        <div class="cart-item__info">
            <div class="cart-item__brand">${escapeHtml([item.brand, item.category].filter(Boolean).join(' · '))}</div>
            <h3 class="cart-item__name">${escapeHtml(item.name)}</h3>

            <!-- Thuộc tính: màu sắc, kích thước -->
            <div class="cart-item__attrs">
                <span class="cart-item__attr">
                    <i class="fas fa-ruler-combined"></i>
                    ${escapeHtml(item.size || '—')}
                </span>
                <span class="cart-item__attr">
                    <i class="fas fa-palette"></i>
                    ${escapeHtml(item.color || '—')}
                </span>
            </div>
            ${stockWarning}

            <!-- Điều chỉnh số lượng + Giá thành tiền -->
            <div class="cart-item__bottom">

                <!-- Bộ nút tăng giảm số lượng -->
                <div class="quantity-control">
                    <button
                        class="quantity-btn"
                        data-action="decrease"
                        data-id="${escapeHtml(lineId)}"
                        ${item.quantity <= 1 ? 'disabled' : ''}
                        aria-label="Giảm số lượng"
                    >−</button>

                    <input
                        type="number"
                        class="quantity-value"
                        data-id="${escapeHtml(lineId)}"
                        value="${item.quantity}"
                        min="1"
                        max="${Math.max(1, maxQuantity)}"
                        aria-label="Số lượng"
                    >

                    <button
                        class="quantity-btn"
                        data-action="increase"
                        data-id="${escapeHtml(lineId)}"
                        ${item.quantity >= maxQuantity ? 'disabled' : ''}
                        aria-label="Tăng số lượng"
                    >+</button>
                </div>

                <!-- Giá thành tiền -->
                <div class="cart-item__price">
                    <div class="price-unit">${formatCurrency(item.price)} × ${item.quantity}</div>
                    <div class="price-total">${formatCurrency(lineTotal)}</div>
                </div>

            </div>
        </div>

    </div>
    `;
}

/* ============================================================
   GÁN SỰ KIỆN (Event Binding)
   ============================================================ */

/**
 * Gán sự kiện cho các element tĩnh (chỉ gán 1 lần khi khởi tạo)
 * Các element này không bị xóa bởi innerHTML
 */
function bindEvents() {
    // Checkbox "Chọn tất cả"
    document.getElementById('selectAll').addEventListener('change', handleSelectAll);

    // Nút "Xóa đã chọn"
    document.getElementById('deleteSelectedBtn').addEventListener('click', handleDeleteSelected);

    // Nút "Áp dụng mã giảm giá"
    document.getElementById('applyCouponBtn').addEventListener('click', handleApplyCoupon);

    // Nhấn Enter để áp dụng mã giảm giá
    document.getElementById('couponInput').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') handleApplyCoupon();
    });
}

/**
 * Gán sự kiện cho các element động (sau mỗi lần render lại)
 * Dùng event delegation để tối ưu performance
 */
function bindItemEvents() {
    const cartItemsEl = document.getElementById('cartItems');

    // Gỡ event cũ để tránh gán nhiều lần (quan trọng!)
    cartItemsEl.replaceWith(cartItemsEl.cloneNode(true));

    // Lấy lại reference sau khi clone
    const newCartItemsEl = document.getElementById('cartItems');

    // Dùng event delegation: gán 1 lần ở container, xử lý cho tất cả con
    newCartItemsEl.addEventListener('click', handleCartItemClick);
    newCartItemsEl.addEventListener('change', handleCartItemChange);
    newCartItemsEl.addEventListener('input', handleQuantityInput);
    newCartItemsEl.addEventListener('error', event => {
        const image = event.target;
        if (image.matches('.cart-item__image img') && image.src !== image.dataset.fallback) {
            image.src = image.dataset.fallback;
        }
    }, true);
}

/**
 * Xử lý click trong vùng danh sách sản phẩm
 * @param {Event} e
 */
function handleCartItemClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id     = btn.dataset.id;

    if (action === 'increase') {
        changeQuantity(id, 1);     // Tăng 1
    } else if (action === 'decrease') {
        changeQuantity(id, -1);    // Giảm 1
    } else if (action === 'delete') {
        deleteItem(id);            // Xóa sản phẩm
    }
}

/**
 * Xử lý thay đổi checkbox chọn sản phẩm
 * @param {Event} e
 */
function handleCartItemChange(e) {
    if (!e.target.classList.contains('item-checkbox')) return;

    const id      = e.target.dataset.id;
    const checked = e.target.checked;
    const itemEl  = document.getElementById(`item-${id}`);

    if (checked) {
        selectedIds.add(id);
        itemEl.classList.add('selected');
    } else {
        selectedIds.delete(id);
        itemEl.classList.remove('selected');
    }

    updateSelectAllState();
    calculateTotals();
}

/**
 * Xử lý nhập thẳng số lượng vào ô input
 * Dùng debounce để không tính toán liên tục khi đang gõ
 * @param {Event} e
 */
function handleQuantityInput(e) {
    if (!e.target.classList.contains('quantity-value')) return;

    const id = e.target.dataset.id;

    // Debounce: chờ 500ms sau khi dừng gõ mới xử lý
    clearTimeout(calcDebounceTimer);
    calcDebounceTimer = setTimeout(() => {
        let newQty = parseInt(e.target.value, 10);
        if (!Number.isInteger(newQty)) newQty = 1;

        // Giới hạn số lượng theo tồn kho sản phẩm.
        if (newQty < 1)  newQty = 1;
        const item = cartItems.find(product => getCartLineId(product) === id);
        const stockLimit = item ? getCartItemMax(item) : 99;
        if (stockLimit > 0 && newQty > stockLimit) newQty = stockLimit;

        e.target.value = newQty; // Cập nhật lại giá trị đã giới hạn

        setQuantity(id, newQty);
    }, 500);
}

/* ============================================================
   XỬ LÝ CHỌN / BỎ CHỌN SẢN PHẨM
   ============================================================ */

/**
 * Xử lý sự kiện "Chọn tất cả"
 * @param {Event} e
 */
function handleSelectAll(e) {
    const isChecked = e.target.checked;

    if (isChecked) {
        // Chọn tất cả: thêm tất cả ID vào selectedIds
        cartItems.forEach(item => selectedIds.add(getCartLineId(item)));
    } else {
        // Bỏ chọn tất cả: xóa hết selectedIds
        selectedIds.clear();
    }

    // Cập nhật giao diện từng sản phẩm
    document.querySelectorAll('.item-checkbox').forEach(cb => {
        const id     = cb.dataset.id;
        const itemEl = document.getElementById(`item-${id}`);
        cb.checked   = isChecked;
        itemEl.classList.toggle('selected', isChecked);
    });

    calculateTotals();
}

/**
 * Đồng bộ trạng thái checkbox "Chọn tất cả" dựa trên các checkbox con
 * - Nếu tất cả đều được chọn → checked = true
 * - Nếu một số được chọn → indeterminate = true
 * - Nếu không có gì → checked = false
 */
function updateSelectAllState() {
    const selectAllCb = document.getElementById('selectAll');
    if (!selectAllCb) return;

    const total    = cartItems.length;
    const selected = selectedIds.size;

    if (selected === 0) {
        selectAllCb.checked       = false;
        selectAllCb.indeterminate = false;
    } else if (selected === total) {
        selectAllCb.checked       = true;
        selectAllCb.indeterminate = false;
    } else {
        selectAllCb.checked       = false;
        selectAllCb.indeterminate = true; // Một số được chọn (dấu gạch ngang)
    }
}

/* ============================================================
   XỬ LÝ SỐ LƯỢNG SẢN PHẨM
   ============================================================ */

/**
 * Thay đổi số lượng sản phẩm (tăng hoặc giảm)
 * @param {String} id     - ID sản phẩm
 * @param {Number} delta  - Lượng thay đổi: +1 hoặc -1
 */
function changeQuantity(id, delta) {
    const item = cartItems.find(p => getCartLineId(p) === id);
    if (!item) return;

    const newQty = item.quantity + delta;

    // Không cho phép số lượng < 1
    if (newQty < 1) {
        showToast('Số lượng tối thiểu là 1. Muốn xóa? Nhấn vào nút ✕', 'warning');
        return;
    }
    if (newQty > getCartItemMax(item)) {
        showToast(`Chỉ còn ${getCartItemMax(item)} sản phẩm khả dụng với biến thể này.`, 'warning');
        return;
    }

    item.quantity = newQty;
    saveCartToStorage(cartItems);

    // Cập nhật UI ngay lập tức (không render lại toàn bộ, chỉ cập nhật phần liên quan)
    updateItemQuantityUI(id);
    calculateTotals();
}

/**
 * Đặt số lượng cụ thể cho sản phẩm (khi nhập thẳng vào ô input)
 * @param {String} id     - ID sản phẩm
 * @param {Number} newQty - Số lượng mới
 */
function setQuantity(id, newQty) {
    const item = cartItems.find(p => getCartLineId(p) === id);
    if (!item) return;
    if (!Number.isInteger(newQty) || newQty < 1 || newQty > getCartItemMax(item)) {
        showToast(`Chỉ còn ${getCartItemMax(item)} sản phẩm khả dụng với biến thể này.`, 'warning');
        return;
    }

    item.quantity = newQty;
    saveCartToStorage(cartItems);
    updateItemQuantityUI(id);
    calculateTotals();
}

/**
 * Cập nhật UI của một sản phẩm sau khi số lượng thay đổi
 * Không render lại toàn bộ để tránh mất focus và giật lag
 * @param {String} id - ID sản phẩm
 */
function updateItemQuantityUI(id) {
    const item = cartItems.find(p => getCartLineId(p) === id);
    if (!item) return;

    const itemEl = document.getElementById(`item-${id}`);
    if (!itemEl) return;

    // Cập nhật ô input số lượng
    const qtyInput = itemEl.querySelector('.quantity-value');
    if (qtyInput) {
        qtyInput.value = item.quantity;
        qtyInput.max = Math.max(1, getCartItemMax(item));
    }

    // Cập nhật nút giảm (disable khi qty = 1)
    const decreaseBtn = itemEl.querySelector('[data-action="decrease"]');
    if (decreaseBtn) decreaseBtn.disabled = item.quantity <= 1;
    const increaseBtn = itemEl.querySelector('[data-action="increase"]');
    if (increaseBtn) increaseBtn.disabled = item.quantity >= getCartItemMax(item);
    const stockWarning = itemEl.querySelector('.cart-item__stock-warning');
    if (stockWarning) {
        const maxQuantity = getCartItemMax(item);
        stockWarning.hidden = item.quantity <= maxQuantity;
        stockWarning.textContent =
            `Chỉ còn ${maxQuantity} sản phẩm khả dụng. Hãy giảm số lượng hoặc xóa sản phẩm này.`;
    }

    // Cập nhật giá thành tiền
    const lineTotal  = item.price * item.quantity;
    const priceUnit  = itemEl.querySelector('.price-unit');
    const priceTotal = itemEl.querySelector('.price-total');
    if (priceUnit)  priceUnit.textContent  = `${formatCurrency(item.price)} × ${item.quantity}`;
    if (priceTotal) priceTotal.textContent = formatCurrency(lineTotal);
}

/* ============================================================
   XÓA SẢN PHẨM
   ============================================================ */

/**
 * Xóa một sản phẩm khỏi giỏ hàng
 * Có hiệu ứng animation trượt ra trước khi xóa khỏi DOM
 * @param {String} id - ID sản phẩm cần xóa
 */
function deleteItem(id) {
    const itemEl = document.getElementById(`item-${id}`);

    // Thêm class animation xóa
    if (itemEl) {
        itemEl.classList.add('removing');
        // Chờ animation hoàn thành (300ms) mới xóa khỏi data
        setTimeout(() => {
            removeItemFromData(id);
        }, 300);
    } else {
        removeItemFromData(id);
    }
}

/**
 * Thực sự xóa sản phẩm khỏi mảng và localStorage, rồi render lại
 * @param {String} id - ID sản phẩm
 */
function removeItemFromData(id) {
    const item = cartItems.find(p => getCartLineId(p) === id);
    if (!item) return;

    // Xóa khỏi mảng
    cartItems = cartItems.filter(p => getCartLineId(p) !== id);

    // Xóa khỏi tập hợp đã chọn
    selectedIds.delete(id);

    // Lưu lại localStorage
    saveCartToStorage(cartItems);

    // Render lại toàn bộ
    renderCart();

    showToast(`Đã xóa "${item.name}" khỏi giỏ hàng`, 'info');
}

/**
 * Xóa tất cả sản phẩm đang được chọn
 */
function handleDeleteSelected() {
    if (selectedIds.size === 0) {
        showToast('Chưa chọn sản phẩm nào để xóa', 'warning');
        return;
    }

    // Confirm trước khi xóa nhiều sản phẩm
    if (!confirm(`Bạn có chắc muốn xóa ${selectedIds.size} sản phẩm đã chọn?`)) {
        return;
    }

    const count = selectedIds.size;

    // Xóa tất cả sản phẩm đã chọn
    cartItems  = cartItems.filter(item => !selectedIds.has(getCartLineId(item)));
    selectedIds.clear();

    saveCartToStorage(cartItems);
    renderCart();

    showToast(`Đã xóa ${count} sản phẩm khỏi giỏ hàng`, 'info');
}

/* ============================================================
   TÍNH TỔNG TIỀN
   ============================================================ */

function getCouponEligibility(code, subtotal = null) {
    const coupon = COUPON_CODES[code];
    if (!coupon) {
        return { valid: false, reason: 'invalid', message: 'Mã giảm giá không hợp lệ' };
    }

    const now = Date.now();
    if (now < Date.parse(coupon.validFrom)) {
        return { valid: false, reason: 'not-started', message: `Mã ${code} chưa đến thời gian áp dụng` };
    }
    if (now >= Date.parse(coupon.expiresAt)) {
        return { valid: false, reason: 'expired', message: `Mã ${code} đã hết hạn` };
    }
    if (subtotal !== null && subtotal < coupon.minimumSubtotal) {
        return {
            valid: false,
            reason: 'minimum',
            message: `Mã ${code} áp dụng cho đơn từ ${formatCurrency(coupon.minimumSubtotal)}`,
        };
    }

    return { valid: true, coupon };
}

function updateCouponControls() {
    const input = document.getElementById('couponInput');
    const button = document.getElementById('applyCouponBtn');
    if (!input || !button) return;

    input.disabled = Boolean(appliedCoupon);
    if (appliedCoupon) input.value = appliedCoupon.code;
    button.disabled = false;
    button.textContent = appliedCoupon ? 'Gỡ mã' : 'Áp dụng';
}

function persistAppliedCoupon(code) {
    try {
        localStorage.setItem(COUPON_KEY, code);
        return true;
    } catch (err) {
        console.error('[Cart] Lỗi lưu mã giảm giá:', err);
        showToast('Không thể lưu mã giảm giá trên thiết bị này.', 'error');
        return false;
    }
}

function clearAppliedCouponState() {
    appliedCoupon = null;
    try {
        localStorage.removeItem(COUPON_KEY);
    } catch (err) {
        console.error('[Cart] Lỗi xóa mã giảm giá đã lưu:', err);
        showToast('Không thể xóa mã giảm giá đã lưu.', 'error');
    }

    const input = document.getElementById('couponInput');
    if (input) input.value = '';
    updateCouponControls();
}

function restoreAppliedCoupon() {
    let code;
    try {
        code = localStorage.getItem(COUPON_KEY);
    } catch (err) {
        console.error('[Cart] Lỗi đọc mã giảm giá đã lưu:', err);
        showToast('Không thể đọc mã giảm giá đã lưu.', 'error');
        return;
    }

    if (!code) {
        appliedCoupon = null;
        updateCouponControls();
        return;
    }

    code = code.trim().toUpperCase();
    const eligibility = getCouponEligibility(code);
    if (!eligibility.valid) {
        clearAppliedCouponState();
        showCouponMessage(eligibility.message, 'error');
        return;
    }

    appliedCoupon = { code, ...eligibility.coupon };
    updateCouponControls();
}

function getPromotionForCart(subtotal, quantity) {
    if (appliedCoupon) {
        const eligibility = getCouponEligibility(appliedCoupon.code, subtotal);
        if (eligibility.valid) {
            showCouponMessage(
                `Đang áp dụng ${appliedCoupon.code}; không cộng dồn với ưu đãi mua nhiều.`,
                'success'
            );
            return {
                type: 'coupon',
                code: appliedCoupon.code,
                label: eligibility.coupon.label,
                discount: eligibility.coupon.discount,
                minimumSubtotal: eligibility.coupon.minimumSubtotal,
                validFrom: eligibility.coupon.validFrom,
                expiresAt: eligibility.coupon.expiresAt,
            };
        }

        if (eligibility.reason === 'minimum') {
            showCouponMessage(eligibility.message, 'error');
        } else {
            clearAppliedCouponState();
            showCouponMessage(eligibility.message, 'error');
        }
    }

    const discount = quantity >= 5 ? 10 : quantity >= 3 ? 5 : 0;
    return discount > 0
        ? { type: 'quantity', label: 'Mua nhiều', discount }
        : null;
}

/**
 * Tính tổng tiền dựa trên các sản phẩm đang được CHỌN
 * và cập nhật tất cả hiển thị bên phải
 *
 * Logic tính tiền:
 *  subtotal = tổng (price × quantity) của sản phẩm đã chọn
 *  shipping = 30.000đ nếu subtotal < 500.000đ, ngược lại = 0
 *  discount = một trong: ưu đãi mua nhiều hoặc mã giảm giá
 *  total    = subtotal + shipping - discount
 */
function calculateTotals() {
    // Lọc chỉ lấy sản phẩm đang được chọn
    const selectedItems = cartItems.filter(item => selectedIds.has(getCartLineId(item)));

    const selectedQuantity = selectedItems.reduce(
        (sum, item) => sum + item.quantity, 0
    );

    // Tính tổng tiền hàng (subtotal)
    const subtotal = selectedItems.reduce(
        (sum, item) => sum + item.price * item.quantity, 0
    );

    // Tính phí vận chuyển
    const shipping = subtotal === 0
        ? 0                                  // Giỏ trống: không tính phí
        : subtotal >= FREE_SHIPPING_THRESHOLD
            ? 0                              // Đủ điều kiện: miễn phí
            : SHIPPING_FEE;                  // Chưa đủ: tính phí

    // Chỉ áp dụng một chương trình giảm giá trên mỗi đơn hàng.
    const promotion = getPromotionForCart(subtotal, selectedQuantity);
    const discountAmount = promotion
        ? Math.round(subtotal * promotion.discount / 100)
        : 0;
    const stockIssue = getSelectedStockIssue(selectedItems);

    // Tổng thanh toán cuối cùng (không âm)
    const total = Math.max(0, subtotal + shipping - discountAmount);

    // ---- Cập nhật giao diện ----

    // Số sản phẩm đã chọn
    document.getElementById('selectedCount').textContent = selectedQuantity;

    // Tạm tính
    document.getElementById('subtotalDisplay').textContent = formatCurrency(subtotal);

    // Phí vận chuyển
    const shippingDisplay = document.getElementById('shippingDisplay');
    const shippingNote    = document.getElementById('shippingNote');

    if (subtotal === 0) {
        shippingDisplay.textContent = '0 ₫';
        shippingNote.textContent    = '';
    } else if (shipping === 0) {
        shippingDisplay.textContent           = 'Miễn phí';
        shippingDisplay.style.color           = 'var(--success)';
        shippingNote.textContent              = '✓ Đủ điều kiện miễn phí';
    } else {
        shippingDisplay.textContent           = formatCurrency(shipping);
        shippingDisplay.style.color           = '';
        const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
        shippingNote.textContent              = `Mua thêm ${formatCurrency(remaining)} để miễn phí`;
    }

    // Dòng giảm giá (ẩn nếu không có chương trình khuyến mãi)
    const discountRow = document.getElementById('discountRow');
    if (promotion && discountAmount > 0) {
        discountRow.style.display = 'flex';
        document.getElementById('discountProgramName').textContent =
            promotion.code ? `Mã ${promotion.code}` : promotion.label;
        document.getElementById('discountPercent').textContent = promotion.discount;
        document.getElementById('discountDisplay').textContent = `−${formatCurrency(discountAmount)}`;
    } else {
        discountRow.style.display = 'none';
    }

    // Tổng thanh toán
    document.getElementById('totalDisplay').textContent = formatCurrency(total);

    // Badge tiết kiệm
    const savingsBadge  = document.getElementById('savingsBadge');
    const totalSavings  = discountAmount + (shipping === 0 && subtotal > 0 ? SHIPPING_FEE : 0);
    if (totalSavings > 0) {
        savingsBadge.style.display = 'flex';
        document.getElementById('savingsAmount').textContent = formatCurrency(totalSavings);
    } else {
        savingsBadge.style.display = 'none';
    }

    // Nút thanh toán: disable khi không có sản phẩm nào được chọn
    const checkoutBtn  = document.getElementById('checkoutBtn');
    checkoutBtn.disabled = selectedItems.length === 0 || subtotal === 0 || Boolean(stockIssue);
    const stockMessage = document.getElementById('cartStockMessage');
    if (stockMessage) {
        stockMessage.textContent = stockIssue || '';
        stockMessage.hidden = !stockIssue;
    }
}

function getSelectedStockIssue(items) {
    const quantitiesByProduct = new Map();
    items.forEach(item => {
        const stock = Number(item.stock);
        if (item.stock === undefined || item.stock === null || item.stock === '' ||
            !Number.isInteger(stock) || stock < 0) return;

        const id = String(item.id);
        const product = quantitiesByProduct.get(id) || { name: item.name, quantity: 0, stock };
        product.quantity += item.quantity;
        product.stock = Math.min(product.stock, stock);
        quantitiesByProduct.set(id, product);
    });

    for (const product of quantitiesByProduct.values()) {
        if (product.quantity > product.stock) {
            return `${product.name} chỉ còn ${product.stock} sản phẩm trong kho. Hãy giảm số lượng hoặc bỏ chọn sản phẩm này.`;
        }
    }
    return '';
}

/* ============================================================
   MÃ GIẢM GIÁ (COUPON)
   ============================================================ */

/**
 * Xử lý khi người dùng nhấn "Áp dụng" mã giảm giá
 */
function handleApplyCoupon() {
    const input    = document.getElementById('couponInput');
    const code     = input.value.trim().toUpperCase();

    if (appliedCoupon) {
        clearAppliedCouponState();
        showCouponMessage('Đã gỡ mã giảm giá.', 'success');
        calculateTotals();
        return;
    }

    // Kiểm tra ô trống
    if (!code) {
        showCouponMessage('Vui lòng nhập mã giảm giá', 'error');
        return;
    }

    const selectedItems = cartItems.filter(item => selectedIds.has(getCartLineId(item)));
    const subtotal = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const eligibility = getCouponEligibility(code, subtotal);
    if (!eligibility.valid) {
        showCouponMessage(
            eligibility.reason === 'invalid'
                ? 'Mã giảm giá không hợp lệ'
                : eligibility.message,
            'error'
        );
        return;
    }

    if (!persistAppliedCoupon(code)) return;

    appliedCoupon = { code, ...eligibility.coupon };
    updateCouponControls();
    showCouponMessage(
        `Áp dụng thành công ${code} (giảm ${appliedCoupon.discount}%).`,
        'success'
    );
    calculateTotals();
    showToast(`Áp dụng mã "${code}" thành công! Giảm ${appliedCoupon.discount}%`, 'success');
}

/**
 * Hiển thị thông báo kết quả nhập mã giảm giá
 * @param {String} message  - Nội dung thông báo
 * @param {String} type     - 'success' hoặc 'error'
 */
function showCouponMessage(message, type) {
    const msgEl = document.getElementById('couponMessage');
    msgEl.textContent = message;
    msgEl.className   = `coupon-message ${type}`;
}

/**
 * Điền mã gợi ý vào ô input khi click vào tag gợi ý
 * @param {String} code - Mã giảm giá cần điền
 */
function fillCoupon(code) {
    const input = document.getElementById('couponInput');
    if (input.disabled) return; // Đã áp dụng rồi thì không điền nữa
    input.value = code;
    input.focus();
}

/* ============================================================
   THANH TOÁN - Chuyển sang trang Checkout
   ============================================================ */

/**
 * Chuẩn bị dữ liệu đơn hàng và chuyển sang trang Checkout
 *
 * Lưu vào localStorage[ORDER_KEY] để Member 5 (Checkout) đọc:
 * {
 *   items:    [...],    // Sản phẩm đã chọn
 *   subtotal: Number,
 *   shipping: Number,
 *   discount: Number,
 *   total:    Number,
 *   coupon:   Object | null,
 *   promotion: Object | null,
 *   timestamp: String
 * }
 */
function proceedToCheckout() {
    const selectedItems = cartItems.filter(item => selectedIds.has(getCartLineId(item)));

    // Kiểm tra lần nữa trước khi chuyển trang
    if (selectedItems.length === 0) {
        showToast('Vui lòng chọn ít nhất 1 sản phẩm để đặt hàng', 'error');
        return;
    }
    const stockIssue = getSelectedStockIssue(selectedItems);
    if (stockIssue) {
        showToast(stockIssue, 'warning');
        return;
    }

    // Tính lại để đảm bảo số liệu chính xác
    const subtotal = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const selectedQuantity = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
    const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    const promotion = getPromotionForCart(subtotal, selectedQuantity);
    const discountAmount = promotion
        ? Math.round(subtotal * promotion.discount / 100)
        : 0;
    const total         = Math.max(0, subtotal + shipping - discountAmount);

    // Gói dữ liệu đơn hàng
    const orderData = {
        items:       selectedItems,      // Danh sách SP đã chọn
        subtotal:    subtotal,           // Tiền hàng
        shipping:    shipping,           // Phí vận chuyển
        discount:    discountAmount,     // Số tiền được giảm
        total:       total,              // Tổng thanh toán
        coupon:      promotion?.type === 'coupon'
            ? {
                code: promotion.code,
                discount: promotion.discount,
                label: promotion.label,
                minimumSubtotal: appliedCoupon.minimumSubtotal,
                validFrom: appliedCoupon.validFrom,
                expiresAt: appliedCoupon.expiresAt,
            }
            : null,
        promotion:   promotion,          // Coupon hoặc ưu đãi mua nhiều
        timestamp:   new Date().toISOString(), // Thời điểm tạo đơn
    };

    // Lưu vào localStorage để trang Checkout đọc
    try {
        localStorage.setItem(ORDER_KEY, JSON.stringify(orderData));
        console.log('[Cart] Đã lưu đơn hàng:', orderData);
    } catch (err) {
        console.error('[Cart] Lỗi lưu đơn hàng:', err);
        showToast('Không thể lưu đơn hàng để chuyển sang Checkout. Vui lòng thử lại.', 'error');
        return;
    }

    // Chuyển sang trang thanh toán
    // Member 5 cần tạo file checkout.html
    window.location.href = 'checkout.html';
}

/* ============================================================
   CẬP NHẬT BADGE GIỎ HÀNG
   ============================================================ */

/**
 * Cập nhật số hiển thị trên badge icon giỏ hàng (header)
 * Tính tổng số lượng tất cả sản phẩm (không phân biệt chọn hay không)
 */
function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    if (!badge) return;

    // Tổng số lượng (ví dụ: 2 áo + 1 giày = 3)
    const totalQty = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    badge.textContent = totalQty > 99 ? '99+' : totalQty;

    // Animation nhảy khi badge thay đổi
    badge.classList.add('bump');
    setTimeout(() => badge.classList.remove('bump'), 200);
}

/* ============================================================
   TOAST NOTIFICATION - Thông báo nổi
   ============================================================ */

/** Timer để tự ẩn toast */
let toastTimer = null;

/**
 * Hiển thị thông báo toast nổi
 * @param {String} message  - Nội dung thông báo
 * @param {String} type     - 'success' | 'error' | 'info' | 'warning'
 * @param {Number} duration - Thời gian hiển thị (ms), mặc định 3000
 */
function showToast(message, type = 'info', duration = 3000) {
    const toast    = document.getElementById('toast');
    const iconEl   = document.getElementById('toastIcon');
    const messageEl = document.getElementById('toastMessage');

    // Biểu tượng theo loại thông báo
    const icons = {
        success: '✅',
        error:   '❌',
        info:    'ℹ️',
        warning: '⚠️',
    };

    // Gán nội dung
    iconEl.textContent    = icons[type] || 'ℹ️';
    messageEl.textContent = message;

    // Xóa class cũ và thêm class mới
    toast.className = `toast toast--${type} show`;

    // Tự ẩn sau khoảng thời gian
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

/* ============================================================
   TIỆN ÍCH (Utility Functions)
   ============================================================ */

/**
 * Định dạng số tiền sang chuỗi VNĐ
 * @param {Number} amount - Số tiền cần định dạng
 * @returns {String} VD: "1.290.000 ₫"
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style:    'currency',
        currency: 'VND',
    }).format(amount);
}

/* ============================================================
   API CÔNG KHAI (Public API)
   Các hàm này được gọi từ HTML (onclick="...") hoặc từ module khác
   ============================================================ */

/**
 * Thêm sản phẩm vào giỏ hàng
 * Hàm này DÀNH CHO Member 2 (trang sản phẩm) gọi để thêm SP vào giỏ
 *
 * Cách dùng từ trang sản phẩm:
 *   import { addToCart } from './cart.js'  // Nếu dùng modules
 *   hoặc gọi trực tiếp: window.CartAPI.addToCart(product)
 *
 * @param {Object} product - Object sản phẩm theo cấu trúc đã định nghĩa
 */
function addToCart(product) {
    if (!product || typeof product !== 'object' || product.id === undefined || product.id === null ||
        String(product.id).trim() === '') {
        showToast('Không thể thêm sản phẩm không hợp lệ vào giỏ hàng.', 'error');
        return false;
    }

    const price = Number(product.price);
    const requestedQuantity = Number(product.quantity ?? product.qty ?? 1);
    if (product.price === undefined || product.price === null || product.price === '' ||
        !Number.isFinite(price) || price < 0 ||
        !Number.isInteger(requestedQuantity) || requestedQuantity < 1) {
        showToast('Giá hoặc số lượng sản phẩm không hợp lệ.', 'warning');
        return false;
    }

    const normalizedProduct = {
        ...product,
        id: String(product.id),
        price,
        quantity: requestedQuantity,
        size: String(product.size || product.selectedSize || ''),
        color: String(product.color || product.selectedColor || ''),
    };

    // Đọc giỏ hàng hiện tại từ localStorage
    const currentCart = loadCartFromStorage();

    // Kiểm tra xem sản phẩm (cùng id, size, color) đã có trong giỏ chưa
    const lineId = getCartLineId(normalizedProduct);
    const existingIndex = currentCart.findIndex(item => getCartLineId(item) === lineId);
    const currentProductQuantity = currentCart
        .filter(item => String(item.id) === normalizedProduct.id)
        .reduce((sum, item) => sum + item.quantity, 0);
    const hasStockLimit = product.stock !== undefined && product.stock !== null && product.stock !== '';
    const stock = hasStockLimit ? Number(product.stock) : null;
    const requestedTotal = currentProductQuantity + requestedQuantity;

    if (requestedQuantity > 99) {
        showToast('Mỗi sản phẩm chỉ có thể đặt tối đa 99 sản phẩm.', 'warning');
        return false;
    }
    if (hasStockLimit && (!Number.isInteger(stock) || stock < requestedTotal)) {
        showToast(Number.isInteger(stock) && stock > 0
            ? `Chỉ còn ${stock} sản phẩm trong kho.`
            : Number.isInteger(stock) ? 'Sản phẩm đã hết hàng.' : 'Không thể xác nhận tồn kho sản phẩm.', 'warning');
        return false;
    }

    const newQuantity = (existingIndex >= 0 ? currentCart[existingIndex].quantity : 0) + requestedQuantity;
    if (newQuantity > 99) {
        showToast('Mỗi sản phẩm chỉ có thể đặt tối đa 99 sản phẩm.', 'warning');
        return false;
    }

    if (existingIndex >= 0) {
        currentCart[existingIndex] = {
            ...currentCart[existingIndex],
            ...normalizedProduct,
            quantity: newQuantity,
        };
        showToast(`Đã cập nhật số lượng "${product.name}" trong giỏ hàng`, 'info');
    } else {
        currentCart.push(normalizedProduct);
        showToast(`Đã thêm "${product.name}" vào giỏ hàng! 🛒`, 'success');
    }

    // Lưu lại và cập nhật badge
    saveCartToStorage(currentCart);

    // Nếu đang ở trang giỏ hàng: cập nhật UI luôn
    if (document.getElementById('cartItems')) {
        cartItems = currentCart;
        selectedIds.add(lineId);
        renderCart();
    } else {
        // Nếu không ở trang giỏ hàng: chỉ cập nhật badge
        const badge = document.getElementById('cartBadge');
        if (badge) {
            const totalQty = currentCart.reduce((s, i) => s + i.quantity, 0);
            badge.textContent = totalQty > 99 ? '99+' : totalQty;
        }
    }
    return true;
}

/**
 * Lấy số lượng sản phẩm trong giỏ hàng hiện tại
 * Hàm này để các trang khác (header) cập nhật badge
 * @returns {Number} Tổng số lượng
 */
function getCartCount() {
    const cart = loadCartFromStorage();
    return cart.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Xóa toàn bộ giỏ hàng (dùng sau khi đặt hàng thành công)
 * Member 5 (Checkout/Payment) gọi hàm này sau khi thanh toán thành công
 */
function clearCart() {
    cartItems = [];
    selectedIds.clear();
    saveCartToStorage([]);

    if (document.getElementById('cartItems')) {
        renderCart();
    }
}

// Xuất API ra global scope để các trang khác có thể sử dụng
// Tất cả hàm đặt trong namespace CartAPI để tránh xung đột tên
window.CartAPI = {
    addToCart,      // Member 2 dùng: thêm SP từ trang danh sách/chi tiết
    getCartCount,   // Header dùng: lấy số lượng để hiện badge
    clearCart,      // Member 5 dùng: xóa giỏ sau thanh toán thành công
    loadCart:       loadCartFromStorage,   // Đọc giỏ hàng
};

// fillCoupon cần toàn cục vì gọi qua onclick trong HTML
window.fillCoupon        = fillCoupon;
window.proceedToCheckout = proceedToCheckout;
