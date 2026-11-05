/**
 * checkout.js - Module Đặt Hàng (Checkout)
 * Dự án: SportZone - Website Bán Đồ Thể Thao
 * Thành viên: Member 4 - Module Checkout
 *
 * Mô tả: Xử lý toàn bộ logic trang đặt hàng:
 *  - Đọc dữ liệu đơn hàng từ localStorage['sportzone_order'] (do cart.js ghi)
 *  - Hiển thị sản phẩm và tổng tiền
 *  - Validate form thông tin người nhận
 *  - Xử lý phương thức giao hàng và thanh toán
 *  - Tạo đơn hàng, lưu localStorage, xóa giỏ hàng
 *  - Hiển thị modal thành công và chuyển trang
 *
 * ============================================================
 * LocalStorage Keys sử dụng trong module này:
 * ============================================================
 *  ĐỌC:
 *    sportzone_order  - Dữ liệu đơn hàng từ cart.js (items, subtotal,
 *                       shipping, discount, total, coupon, timestamp)
 *    sportzone_cart   - Giỏ hàng đầy đủ (để xóa SP đã đặt)
 *  GHI:
 *    sportzone_orders - Lịch sử tất cả đơn hàng (mảng)
 *    sportzone_cart   - Cập nhật lại sau khi xóa SP đã đặt
 *  XÓA:
 *    sportzone_order  - Xóa sau khi tạo đơn hàng thành công
 *
 * ============================================================
 * Cấu trúc đơn hàng lưu vào sportzone_orders:
 * ============================================================
 * {
 *   orderId:       String  - Mã đơn hàng duy nhất, VD: "SZ-20241103-A7B2"
 *   status:        String  - Trạng thái: "Chờ xác nhận"
 *   createdAt:     String  - ISO timestamp ngày đặt hàng
 *   customer: {
 *     fullName:    String,
 *     phone:       String,
 *     email:       String,
 *     address:     String,
 *     note:        String
 *   },
 *   items:         Array   - Danh sách sản phẩm đã đặt
 *   shippingMethod: String - 'standard' | 'express' | 'pickup'
 *   paymentMethod: String  - 'cod' | 'transfer'
 *   subtotal:      Number,
 *   shipping:      Number,
 *   discount:      Number,
 *   total:         Number,
 *   coupon:        Object | null
 * }
 */

'use strict';

/* ============================================================
   HẰNG SỐ - Dùng chung, nhất quán với cart.js
   ============================================================ */

/** Key đọc dữ liệu đơn hàng tạm thời từ giỏ hàng */
const ORDER_KEY = 'sportzone_order';

/** Key đọc/ghi giỏ hàng (để xóa SP đã đặt) */
const CART_KEY = 'sportzone_cart';

/** Key lưu lịch sử tất cả đơn hàng đã đặt */
const ORDERS_HISTORY_KEY = 'sportzone_orders';

/**
 * Phí vận chuyển theo phương thức
 * Phí tiêu chuẩn được tính lại dựa trên subtotal từ giỏ hàng
 * (Nếu giỏ hàng đã miễn phí, giữ nguyên; nếu không, cộng thêm)
 */
const SHIPPING_FEES = {
    standard: 30000,   // Giao tiêu chuẩn: 30.000đ
    express:  60000,   // Giao nhanh: 60.000đ
    pickup:   0,       // Nhận tại cửa hàng: miễn phí
};

/** Mức miễn phí vận chuyển tiêu chuẩn (nhất quán với cart.js) */
const FREE_SHIPPING_THRESHOLD = 500000;

/* ============================================================
   BIẾN TRẠNG THÁI MODULE
   ============================================================ */

/** Dữ liệu đơn hàng đọc từ localStorage['sportzone_order'] */
let orderData = null;

/** Phương thức giao hàng đang được chọn */
let selectedShipping = 'standard';

/** Phương thức thanh toán đang được chọn */
let selectedPayment = 'cod';

/** Timer toast notification */
let toastTimer = null;

/** Ngăn gửi lặp sau khi đơn đã được lưu */
let isSubmittingOrder = false;

/* ============================================================
   KHỞI TẠO KHI DOM LOAD XONG
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {
    const existingOrderId = new URLSearchParams(window.location.search).get('orderId');
    if (existingOrderId) {
        const existingOrder = loadOrderFromHistory(existingOrderId);
        if (existingOrder) {
            showExistingOrderState(existingOrder);
        } else {
            showNoOrderState();
        }
        return;
    }

    // 1. Đọc dữ liệu đơn hàng từ localStorage
    orderData = loadOrderData();

    // 2. Kiểm tra có dữ liệu không
    if (!orderData) {
        // Không có dữ liệu: hiện thông báo, ẩn form
        showNoOrderState();
        return;
    }

    // 3. Cập nhật badge giỏ hàng ở header
    updateCartBadge();

    // 4. Render danh sách sản phẩm (cột phải)
    renderOrderItems();

    // 5. Hiển thị tổng tiền ban đầu (dùng shipping từ giỏ hàng)
    renderTotals();

    // 6. Gán tất cả sự kiện
    bindAllEvents();
    updateShippingOptionPrices();
    syncSelectedOptions();

    // 7. Cập nhật nội dung chuyển khoản với số điện thoại (sau khi nhập)
    updateBankContent();

    // 8. Tự động điền thông tin nếu khách hàng đã đăng nhập tài khoản
    prefillCustomerInfo();
});

/* ============================================================
   ĐỌC / GHI LOCALSTORAGE
   ============================================================ */

/**
 * Đọc dữ liệu đơn hàng tạm thời từ localStorage
 * (Do cart.js lưu vào khi người dùng nhấn "Tiến hành đặt hàng")
 * @returns {Object|null}
 */
function loadOrderData() {
    try {
        const raw = localStorage.getItem(ORDER_KEY);
        if (!raw) return null;

        const data = JSON.parse(raw);
        const validItems = Array.isArray(data?.items) && data.items.length > 0 &&
            data.items.every(item =>
                item &&
                (typeof item.id === 'string' || typeof item.id === 'number') &&
                typeof item.name === 'string' &&
                Number.isFinite(item.price) && item.price >= 0 &&
                Number.isInteger(item.quantity) && item.quantity > 0
            );

        if (
            !validItems ||
            !Number.isFinite(data.subtotal) || data.subtotal < 0 ||
            !Number.isFinite(data.discount || 0) || (data.discount || 0) < 0
        ) {
            console.error('[Checkout] Dữ liệu đơn hàng không hợp lệ.');
            return null;
        }

        return data;
    } catch (err) {
        console.error('[Checkout] Lỗi đọc orderData:', err);
        return null;
    }
}

/**
 * Đọc một đơn hàng đã tạo để Checkout không thể tạo lại đơn khi người dùng quay lại.
 * @param {String} orderId
 * @returns {Object|null}
 */
function loadOrderFromHistory(orderId) {
    try {
        const raw = localStorage.getItem(ORDERS_HISTORY_KEY);
        const history = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(history)) {
            throw new Error('Dữ liệu lịch sử đơn hàng không hợp lệ.');
        }
        return history.find(order => order && order.orderId === orderId) || null;
    } catch (err) {
        console.error('[Checkout] Lỗi đọc lịch sử đơn hàng:', err);
        return null;
    }
}

/**
 * Đọc giỏ hàng đầy đủ (cần để xóa SP đã đặt sau khi đặt hàng)
 * @returns {Array}
 */
function loadFullCart() {
    try {
        const raw = localStorage.getItem(CART_KEY);
        if (!raw) return [];
        const cart = JSON.parse(raw);
        return Array.isArray(cart) ? cart : null;
    } catch (err) {
        console.error('[Checkout] Lỗi đọc giỏ hàng:', err);
        return null;
    }
}

/**
 * Tự động điền thông tin khách hàng từ tài khoản đang đăng nhập
 */
function prefillCustomerInfo() {
    try {
        const rawUser = localStorage.getItem('sz_current_user');
        if (!rawUser) return;
        const user = JSON.parse(rawUser);
        if (!user) return;

        const fullNameInput = document.getElementById('fullName');
        const phoneInput = document.getElementById('phone');
        const emailInput = document.getElementById('email');
        const addressInput = document.getElementById('address');

        if (fullNameInput && !fullNameInput.value && user.fullName) {
            fullNameInput.value = user.fullName;
        }
        if (phoneInput && !phoneInput.value && user.phone) {
            phoneInput.value = user.phone;
        }
        if (emailInput && !emailInput.value && user.email) {
            emailInput.value = user.email;
        }
        if (addressInput && !addressInput.value && Array.isArray(user.addresses) && user.addresses.length > 0) {
            const defAddr = user.addresses.find(a => a.isDefault) || user.addresses[0];
            if (defAddr && defAddr.address) {
                addressInput.value = defAddr.address;
            }
        }
    } catch (e) {
        console.warn('[Checkout] Lỗi tự động điền thông tin người dùng:', e);
    }
}

/**
 * Lưu đơn hàng mới vào lịch sử đơn hàng
 * Đẩy vào đầu mảng để đơn hàng mới nhất hiển thị trước
 * Đồng bộ vào cả sportzone_orders và sz_orders, đồng thời đẩy lên Firebase Cloud
 * @param {Object} newOrder - Đơn hàng vừa tạo
 */
function saveOrderToHistory(newOrder) {
    try {
        const raw      = localStorage.getItem(ORDERS_HISTORY_KEY);
        const history  = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(history)) {
            throw new Error('Dữ liệu lịch sử đơn hàng không hợp lệ.');
        }

        // Thêm đơn mới vào ĐẦU mảng (hiển thị mới nhất trước)
        history.unshift(newOrder);

        localStorage.setItem(ORDERS_HISTORY_KEY, JSON.stringify(history));

        // Đồng thời cập nhật vào sz_orders để trang Account & TV3 nhận ngay lập tức
        try {
            const rawSz = localStorage.getItem('sz_orders');
            const szHistory = rawSz ? JSON.parse(rawSz) : [];
            if (Array.isArray(szHistory)) {
                const filtered = szHistory.filter(o => (o.orderId || o.id) !== (newOrder.orderId || newOrder.id));
                filtered.unshift(newOrder);
                localStorage.setItem('sz_orders', JSON.stringify(filtered));
            }
        } catch (e) {}

        // Đẩy đơn hàng lên Cloud Firestore Realtime
        if (window.SportZoneCloud && typeof window.SportZoneCloud.saveSingleOrder === 'function') {
            window.SportZoneCloud.saveSingleOrder(newOrder);
        }

        console.log('[Checkout] Đã lưu đơn hàng:', newOrder.orderId);
        return true;
    } catch (err) {
        console.error('[Checkout] Lỗi lưu đơn hàng:', err);
        return false;
    }
}

/**
 * Xóa SP đã đặt khỏi giỏ hàng
 * CHỈ xóa các SP có trong đơn hàng, KHÔNG xóa SP chưa được chọn
 * @param {Array} orderedItems - Danh sách SP đã đặt
 */
function removeOrderedItemsFromCart(orderedItems) {
    try {
        const fullCart = loadFullCart();
        if (!fullCart) return false;

        // Tập hợp ID+size+color của các SP đã đặt để xóa chính xác
        const orderedSet = new Set(
            orderedItems.map(item => `${item.id}__${item.size}__${item.color}`)
        );

        // Giữ lại các SP KHÔNG nằm trong đơn hàng
        const remainingCart = fullCart.filter(item => {
            const key = `${item.id}__${item.size}__${item.color}`;
            return !orderedSet.has(key);
        });

        localStorage.setItem(CART_KEY, JSON.stringify(remainingCart));
        console.log(
            `[Checkout] Đã xóa ${orderedItems.length} SP đã đặt, ` +
            `còn lại ${remainingCart.length} SP trong giỏ`
        );
        return true;
    } catch (err) {
        console.error('[Checkout] Lỗi cập nhật giỏ hàng:', err);
        return false;
    }
}

/**
 * Xóa dữ liệu đơn hàng tạm thời sau khi đặt hàng thành công
 */
function clearOrderTemp() {
    try {
        localStorage.removeItem(ORDER_KEY);
        return true;
    } catch (err) {
        console.error('[Checkout] Lỗi xóa dữ liệu đơn hàng tạm:', err);
        return false;
    }
}

/* ============================================================
   HIỂN THỊ GIAO DIỆN
   ============================================================ */

/**
 * Hiển thị màn hình "Không có đơn hàng" khi truy cập trực tiếp
 */
function showNoOrderState() {
    const noOrderEl   = document.getElementById('noOrderData');
    const contentEl   = document.getElementById('checkoutContent');
    if (noOrderEl)  noOrderEl.style.display   = 'block';
    if (contentEl)  contentEl.style.display   = 'none';
}

/**
 * Trạng thái chỉ đọc khi quay lại Checkout từ trang thanh toán.
 * @param {Object} order
 */
function showExistingOrderState(order) {
    const noOrderEl = document.getElementById('noOrderData');
    const contentEl = document.getElementById('checkoutContent');
    if (!noOrderEl || !contentEl) return;

    const icon = noOrderEl.querySelector('.no-order__icon i');
    const title = noOrderEl.querySelector('h2');
    const message = noOrderEl.querySelector('p');
    const action = noOrderEl.querySelector('a');

    if (icon) icon.className = 'fas fa-clipboard-check';
    if (title) title.textContent = `Đơn hàng ${order.orderId} đã được tạo`;
    if (message) {
        message.textContent = 'Đơn hàng đã được lưu, không thể tạo lại tại Checkout. Bạn có thể quay lại bước thanh toán để xem hoặc cập nhật trạng thái.';
    }
    if (action) {
        action.href = `payment.html?orderId=${encodeURIComponent(order.orderId)}`;
        action.innerHTML = '<i class="fas fa-arrow-right"></i> Quay lại thanh toán';
    }
    noOrderEl.style.display = 'block';
    contentEl.style.display = 'none';
}

/**
 * Render danh sách sản phẩm ở cột phải (tóm tắt đơn hàng)
 * Đọc từ orderData.items
 */
function renderOrderItems() {
    const container = document.getElementById('orderItems');
    const countEl   = document.getElementById('previewItemCount');
    if (!container || !orderData) return;

    const items = orderData.items;

    // Cập nhật số lượng sản phẩm
    if (countEl) {
        countEl.textContent = `(${items.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm)`;
    }

    container.replaceChildren();

    items.forEach(item => {
        const lineTotal = item.price * item.quantity;
        const row = document.createElement('div');
        row.className = 'preview-item';

        const imageWrap = document.createElement('div');
        imageWrap.className = 'preview-item__image-wrap';

        const imageFallback = document.createElement('i');
        imageFallback.className = 'fa-solid fa-image preview-item__image-fallback';
        imageFallback.setAttribute('aria-hidden', 'true');
        imageWrap.appendChild(imageFallback);

        if (typeof item.image === 'string' && item.image.trim()) {
            try {
                const imageUrl = new URL(item.image, window.location.href);
                if (imageUrl.protocol === 'http:' || imageUrl.protocol === 'https:') {
                    const image = document.createElement('img');
                    image.className = 'preview-item__image';
                    image.src = imageUrl.href;
                    image.alt = item.name;
                    image.loading = 'lazy';
                    image.addEventListener('load', () => imageFallback.remove(), { once: true });
                    image.addEventListener('error', () => {
                        image.remove();
                        imageFallback.hidden = false;
                    }, { once: true });
                    imageWrap.appendChild(image);
                    imageFallback.hidden = true;
                }
            } catch (err) {
                console.warn('[Checkout] Bỏ qua URL ảnh sản phẩm không hợp lệ.');
            }
        }

        const quantityBadge = document.createElement('span');
        quantityBadge.className = 'preview-item__qty-badge';
        quantityBadge.textContent = item.quantity;
        imageWrap.appendChild(quantityBadge);

        const info = document.createElement('div');
        info.className = 'preview-item__info';

        const name = document.createElement('div');
        name.className = 'preview-item__name';
        name.textContent = item.name;

        const meta = document.createElement('div');
        meta.className = 'preview-item__meta';
        meta.textContent = [item.brand, item.size, item.color].filter(Boolean).join(' · ');

        const price = document.createElement('div');
        price.className = 'preview-item__price';
        price.textContent = formatCurrency(lineTotal);

        info.append(name, meta, price);
        row.append(imageWrap, info);
        container.appendChild(row);
    });
}

/**
 * Tính và hiển thị các dòng tổng tiền ở cột phải
 * Phí vận chuyển có thể thay đổi khi người dùng chọn phương thức giao hàng
 */
function renderTotals() {
    if (!orderData) return;

    // Tính phí ship theo phương thức đã chọn
    const shippingFee = calculateShippingFee();

    // Lấy các giá trị từ orderData (đã tính ở giỏ hàng)
    const subtotal       = orderData.subtotal;
    const discount       = orderData.discount || 0;
    const total          = Math.max(0, subtotal + shippingFee - discount);

    // Cập nhật các element
    setTextContent('checkoutSubtotal', formatCurrency(subtotal));

    // Phí vận chuyển
    const shippingEl = document.getElementById('checkoutShipping');
    if (shippingEl) {
        if (shippingFee === 0) {
            shippingEl.textContent = 'Miễn phí';
            shippingEl.style.color = 'var(--success)';
        } else {
            shippingEl.textContent = formatCurrency(shippingFee);
            shippingEl.style.color = '';
        }
    }

    // Giảm giá (ẩn nếu = 0)
    const discountRow = document.getElementById('checkoutDiscountRow');
    if (discountRow) {
        if (discount > 0 && orderData.coupon) {
            discountRow.style.display = 'flex';
            setTextContent('checkoutDiscount', `−${formatCurrency(discount)}`);
            // Hiện tag mã coupon
            const couponTag = document.getElementById('checkoutCouponTag');
            if (couponTag) couponTag.textContent = orderData.coupon.code;
        } else {
            discountRow.style.display = 'none';
        }
    }

    // Tổng thanh toán
    setTextContent('checkoutTotal', formatCurrency(total));
}

/**
 * Tính phí vận chuyển dựa trên phương thức đang chọn
 * Nếu chọn 'pickup': miễn phí
 * Nếu chọn 'standard': áp dụng logic miễn phí khi ≥ 500.000đ
 * Nếu chọn 'express': luôn tính 60.000đ
 * @returns {Number} Phí vận chuyển
 */
function calculateShippingFee() {
    if (!orderData) return 0;

    if (selectedShipping === 'pickup') return 0;

    if (selectedShipping === 'express') return SHIPPING_FEES.express;

    // standard: kiểm tra ngưỡng miễn phí
    const subtotal = orderData.subtotal;
    return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEES.standard;
}

/* ============================================================
   GÁN SỰ KIỆN
   ============================================================ */

/**
 * Gán tất cả sự kiện cần thiết
 */
function bindAllEvents() {
    // Sự kiện chọn phương thức giao hàng
    document.querySelectorAll('.shipping-radio').forEach(radio => {
        radio.addEventListener('change', handleShippingChange);
    });

    // Sự kiện chọn phương thức thanh toán
    document.querySelectorAll('.payment-radio').forEach(radio => {
        radio.addEventListener('change', handlePaymentChange);
    });

    // Validation thời gian thực khi blur (rời khỏi input)
    bindRealtimeValidation();

    // Đếm ký tự ghi chú
    const noteEl = document.getElementById('note');
    if (noteEl) {
        noteEl.addEventListener('input', function () {
            setTextContent('noteCounter', `${this.value.length} / 500`);
        });
    }

    // Cập nhật nội dung chuyển khoản khi số điện thoại thay đổi
    const phoneEl = document.getElementById('phone');
    if (phoneEl) {
        phoneEl.addEventListener('input', updateBankContent);
    }
}

/**
 * Gán validation thời gian thực cho từng trường
 * Kiểm tra khi người dùng rời khỏi input (blur event)
 */
function bindRealtimeValidation() {
    const fields = [
        { id: 'fullName', validate: validateFullName },
        { id: 'phone',    validate: validatePhone    },
        { id: 'email',    validate: validateEmail    },
        { id: 'address',  validate: validateAddress  },
    ];

    fields.forEach(({ id, validate }) => {
        const el = document.getElementById(id);
        if (!el) return;

        // Khi rời khỏi input: validate
        el.addEventListener('blur', function () {
            validate(this.value);
        });

        // Khi đang gõ: xóa trạng thái lỗi để không làm phiền
        el.addEventListener('input', function () {
            clearFieldError(id);
            this.classList.remove('error', 'valid');
        });
    });
}

/* ============================================================
   XỬ LÝ PHƯƠNG THỨC GIAO HÀNG
   ============================================================ */

/**
 * Xử lý khi thay đổi phương thức giao hàng
 * @param {Event} e
 */
function handleShippingChange(e) {
    selectedShipping = e.target.value;

    // Tính lại và cập nhật tổng tiền
    renderTotals();

    updateShippingOptionPrices();
    syncSelectedOptions();
}

/**
 * Cập nhật phí giao hàng tiêu chuẩn trong danh sách lựa chọn
 */
function updateShippingOptionPrices() {
    const subtotal = orderData ? orderData.subtotal : 0;
    const standardPriceEl = document.getElementById('standardShippingPrice');
    if (standardPriceEl) {
        if (subtotal >= FREE_SHIPPING_THRESHOLD) {
            standardPriceEl.textContent      = 'Miễn phí';
            standardPriceEl.style.color      = 'var(--success)';
        } else {
            standardPriceEl.textContent      = formatCurrency(SHIPPING_FEES.standard);
            standardPriceEl.style.color      = '';
        }
    }
}

/**
 * Đồng bộ trạng thái lựa chọn để không phụ thuộc CSS :has()
 */
function syncSelectedOptions() {
    document.querySelectorAll('.shipping-option').forEach(option => {
        const radio = option.querySelector('.shipping-radio');
        option.classList.toggle('is-selected', Boolean(radio && radio.checked));
    });

    document.querySelectorAll('.payment-option').forEach(option => {
        const radio = option.querySelector('.payment-radio');
        option.classList.toggle('is-selected', Boolean(radio && radio.checked));
    });
}

/* ============================================================
   XỬ LÝ PHƯƠNG THỨC THANH TOÁN
   ============================================================ */

/**
 * Xử lý khi thay đổi phương thức thanh toán
 * @param {Event} e
 */
function handlePaymentChange(e) {
    selectedPayment = e.target.value;

    // Hiện/ẩn thông tin ngân hàng
    const bankInfoEl = document.getElementById('bankInfo');
    if (bankInfoEl) {
        const showBankInfo = selectedPayment === 'transfer';
        bankInfoEl.style.display = showBankInfo ? 'block' : 'none';
        bankInfoEl.setAttribute('aria-hidden', String(!showBankInfo));
    }

    // Cập nhật hiển thị phương thức ở cột phải
    updatePaymentDisplay();
    syncSelectedOptions();
}

/**
 * Cập nhật text phương thức thanh toán ở cột phải (order-totals)
 */
function updatePaymentDisplay() {
    const displayEl = document.getElementById('selectedPaymentDisplay');
    if (!displayEl) return;

    const config = {
        cod:      { icon: 'fa-money-bill-wave', text: 'Thanh toán khi nhận hàng (COD)' },
        transfer: { icon: 'fa-university',      text: 'Chuyển khoản ngân hàng'          },
    };

    const current = config[selectedPayment] || config.cod;
    const icon = document.createElement('i');
    icon.className = `fas ${current.icon}`;
    const text = document.createElement('span');
    text.textContent = current.text;
    displayEl.replaceChildren(icon, text);
}

/**
 * Cập nhật nội dung chuyển khoản với số điện thoại khách hàng
 * Gọi mỗi khi phone input thay đổi
 */
function updateBankContent() {
    const contentEl = document.getElementById('bankContent');
    if (!contentEl) return;

    contentEl.textContent = 'SPORTZONE + Mã đơn hàng (sẽ hiển thị sau khi đặt)';
}

/* ============================================================
   VALIDATION FORM
   ============================================================ */

/**
 * Validate toàn bộ form
 * @returns {Boolean} true nếu hợp lệ, false nếu có lỗi
 */
function validateForm() {
    const fullNameVal = document.getElementById('fullName')?.value || '';
    const phoneVal    = document.getElementById('phone')?.value    || '';
    const emailVal    = document.getElementById('email')?.value    || '';
    const addressVal  = document.getElementById('address')?.value  || '';

    // Chạy tất cả validators, thu thập kết quả
    const results = [
        validateFullName(fullNameVal),
        validatePhone(phoneVal),
        validateEmail(emailVal),
        validateAddress(addressVal),
    ];

    // Hợp lệ khi TẤT CẢ đều true
    return results.every(r => r === true);
}

/**
 * Validate họ tên
 * @param {String} value
 * @returns {Boolean}
 */
function validateFullName(value) {
    const v = value.trim();

    if (!v) {
        setFieldError('fullName', 'Vui lòng nhập họ và tên');
        return false;
    }
    if (v.length < 2) {
        setFieldError('fullName', 'Họ tên phải có ít nhất 2 ký tự');
        return false;
    }
    if (v.length > 100) {
        setFieldError('fullName', 'Họ tên không được quá 100 ký tự');
        return false;
    }
    // Chỉ cho chữ cái và khoảng trắng (bao gồm tiếng Việt)
    if (!/^[\p{L}\s]+$/u.test(v)) {
        setFieldError('fullName', 'Họ tên chỉ được chứa chữ cái và khoảng trắng');
        return false;
    }

    setFieldValid('fullName');
    return true;
}

/**
 * Validate số điện thoại Việt Nam
 * Các đầu số hợp lệ: 03x, 05x, 07x, 08x, 09x (10 chữ số)
 * @param {String} value
 * @returns {Boolean}
 */
function validatePhone(value) {
    const v = value.trim().replace(/\s/g, ''); // Xóa khoảng trắng

    if (!v) {
        setFieldError('phone', 'Vui lòng nhập số điện thoại');
        return false;
    }

    // Regex số điện thoại VN 10 số
    const phoneRegex = /^(0[35789][0-9]{8})$/;
    if (!phoneRegex.test(v)) {
        setFieldError('phone', 'Số điện thoại không hợp lệ (VD: 0901 234 567)');
        return false;
    }

    setFieldValid('phone');
    return true;
}

/**
 * Validate email
 * @param {String} value
 * @returns {Boolean}
 */
function validateEmail(value) {
    const v = value.trim();

    if (!v) {
        setFieldError('email', 'Vui lòng nhập địa chỉ email');
        return false;
    }

    // Regex email cơ bản
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(v)) {
        setFieldError('email', 'Địa chỉ email không hợp lệ (VD: ten@example.com)');
        return false;
    }

    if (v.length > 150) {
        setFieldError('email', 'Email không được quá 150 ký tự');
        return false;
    }

    setFieldValid('email');
    return true;
}

/**
 * Validate địa chỉ nhận hàng
 * @param {String} value
 * @returns {Boolean}
 */
function validateAddress(value) {
    const v = value.trim();

    if (!v) {
        setFieldError('address', 'Vui lòng nhập địa chỉ nhận hàng');
        return false;
    }
    if (v.length < 10) {
        setFieldError('address', 'Địa chỉ quá ngắn, vui lòng nhập đầy đủ');
        return false;
    }
    if (v.length > 300) {
        setFieldError('address', 'Địa chỉ không được quá 300 ký tự');
        return false;
    }

    setFieldValid('address');
    return true;
}

/**
 * Đánh dấu field lỗi: thêm class 'error' và hiện thông báo lỗi
 * @param {String} fieldId - ID của input
 * @param {String} message - Thông báo lỗi
 */
function setFieldError(fieldId, message) {
    const input = document.getElementById(fieldId);
    const error = document.getElementById(`${fieldId}Error`);

    if (input) {
        input.classList.add('error');
        input.classList.remove('valid');
        input.setAttribute('aria-invalid', 'true');
    }
    if (error) error.textContent = message;
}

/**
 * Đánh dấu field hợp lệ: thêm class 'valid', xóa thông báo lỗi
 * @param {String} fieldId
 */
function setFieldValid(fieldId) {
    const input = document.getElementById(fieldId);
    const error = document.getElementById(`${fieldId}Error`);

    if (input) {
        input.classList.remove('error');
        input.classList.add('valid');
        input.setAttribute('aria-invalid', 'false');
    }
    if (error) error.textContent = '';
}

/**
 * Xóa trạng thái lỗi của field (khi đang gõ)
 * @param {String} fieldId
 */
function clearFieldError(fieldId) {
    const input = document.getElementById(fieldId);
    const error = document.getElementById(`${fieldId}Error`);
    if (input) input.setAttribute('aria-invalid', 'false');
    if (error) error.textContent = '';
}

/* ============================================================
   TẠO ĐƠN HÀNG - Hàm chính
   ============================================================ */

/**
 * Xử lý khi người dùng nhấn "Xác nhận đặt hàng"
 * Quy trình:
 *  1. Validate form
 *  2. Tạo mã đơn hàng
 *  3. Tổng hợp dữ liệu đơn hàng
 *  4. Lưu vào lịch sử (sportzone_orders)
 *  5. Xóa SP đã đặt khỏi giỏ hàng
 *  6. Xóa dữ liệu tạm (sportzone_order)
 *  7. Hiển thị modal thành công
 *  8. Chuyển sang trang Payment khi người dùng tiếp tục
 *
 * Hàm này gọi từ onclick trong HTML
 */
function placeOrder() {
    if (isSubmittingOrder) return;

    // Kiểm tra có dữ liệu không
    if (!orderData || !orderData.items || orderData.items.length === 0) {
        showToast('Không có sản phẩm để đặt hàng', 'error');
        return;
    }

    // === Bước 1: Validate form ===
    if (!validateForm()) {
        showToast('Vui lòng điền đầy đủ và chính xác thông tin bắt buộc', 'error');

        // Cuộn lên field lỗi đầu tiên
        const firstError = document.querySelector('.form-input.error');
        if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstError.focus();
        }
        return;
    }

    // === Bước 2: Disable nút để tránh double-submit ===
    const placeBtn = document.getElementById('placeOrderBtn');
    isSubmittingOrder = true;
    if (placeBtn) {
        placeBtn.disabled    = true;
        placeBtn.innerHTML   = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
    }

    // === Bước 3: Thu thập thông tin khách hàng ===
    const customerInfo = {
        fullName: document.getElementById('fullName').value.trim(),
        phone:    document.getElementById('phone').value.trim().replace(/\s/g, ''),
        email:    document.getElementById('email').value.trim(),
        address:  document.getElementById('address').value.trim(),
        note:     document.getElementById('note')?.value.trim() || '',
    };

    // === Bước 4: Tính phí ship theo phương thức đã chọn ===
    const shippingFee = calculateShippingFee();
    const subtotal    = orderData.subtotal;
    const discount    = orderData.discount || 0;
    const total       = Math.max(0, subtotal + shippingFee - discount);

    // === Bước 5: Tạo mã đơn hàng duy nhất ===
    const orderId = generateOrderId();

    // === Bước 6: Lấy tên phương thức giao hàng hiển thị ===
    const shippingLabels = {
        standard: 'Giao hàng tiêu chuẩn (3-5 ngày)',
        express:  'Giao hàng nhanh (1-2 ngày)',
        pickup:   'Nhận tại cửa hàng',
    };

    // === Bước 7: Lấy tên phương thức thanh toán hiển thị ===
    const paymentLabels = {
        cod:      'Thanh toán khi nhận hàng (COD)',
        transfer: 'Chuyển khoản ngân hàng',
    };

    // === Bước 8: Tổng hợp object đơn hàng hoàn chỉnh ===
    // Đọc thông tin người dùng đang đăng nhập nếu có
    let loggedInUser = null;
    try {
        const rawUser = localStorage.getItem('sz_current_user');
        if (rawUser) loggedInUser = JSON.parse(rawUser);
    } catch (e) {}

    const completedOrder = {
        orderId:        orderId,
        id:             orderId,
        userId:         loggedInUser?.id || null,
        status:         'Chờ xác nhận',           // Trạng thái ban đầu
        statusCode:     'pending',
        statusText:     'Chờ xác nhận',
        createdAt:      new Date().toISOString(),  // Thời điểm đặt hàng

        // Thông tin khách hàng
        customer:       customerInfo,
        recipientName:  customerInfo.fullName,
        recipientPhone: customerInfo.phone,
        shippingAddress: customerInfo.address,

        // Sản phẩm
        items:          orderData.items,

        // Phương thức
        shippingMethod: selectedShipping,
        shippingLabel:  shippingLabels[selectedShipping],
        paymentMethod:  selectedPayment,
        paymentLabel:   paymentLabels[selectedPayment],

        // Tài chính
        subtotal:       subtotal,
        shipping:       shippingFee,
        shippingFee:    shippingFee,
        discount:       discount,
        total:          total,
        totalAmount:    total,

        // Thông tin coupon
        coupon:         orderData.coupon || null,
    };

    // === Bước 9: Lưu vào lịch sử đơn hàng ===
    if (!saveOrderToHistory(completedOrder)) {
        isSubmittingOrder = false;
        if (placeBtn) {
            placeBtn.disabled = false;
            placeBtn.innerHTML = '<i class="fas fa-check-circle"></i> Xác nhận đặt hàng <i class="fas fa-arrow-right"></i>';
        }
        showToast('Không thể lưu đơn hàng. Vui lòng thử lại.', 'error');
        return;
    }

    // === Bước 10: Xóa SP đã đặt khỏi giỏ hàng ===
    const cartUpdated = removeOrderedItemsFromCart(orderData.items);

    // === Bước 11: Xóa dữ liệu tạm ===
    const orderTempCleared = clearOrderTemp();

    // === Bước 12: Cập nhật badge giỏ hàng ===
    updateCartBadge();

    // === Bước 13: Hiển thị modal thành công ===
    const cleanupWarning = !cartUpdated || !orderTempCleared
        ? 'Đơn hàng đã được lưu, nhưng giỏ hàng chưa được cập nhật hoàn toàn. Vui lòng không đặt lại đơn này.'
        : '';
    showSuccessModal(completedOrder, cleanupWarning);
}

/* ============================================================
   TẠO MÃ ĐƠN HÀNG
   ============================================================ */

/**
 * Tạo mã đơn hàng duy nhất theo format: SZ-YYYYMMDD-XXXX
 * VD: SZ-20241103-A7B2
 * @returns {String}
 */
function generateOrderId() {
    // Lấy ngày hiện tại định dạng YYYYMMDD
    const now      = new Date();
    const year     = now.getFullYear();
    const month    = String(now.getMonth() + 1).padStart(2, '0');
    const day      = String(now.getDate()).padStart(2, '0');
    const datePart = `${year}${month}${day}`;

    // Tạo 4 ký tự ngẫu nhiên (chữ hoa + số)
    const chars    = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomPart = '';
    for (let i = 0; i < 4; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return `SZ-${datePart}-${randomPart}`;
}

/* ============================================================
   MODAL THÀNH CÔNG
   ============================================================ */

/**
 * Hiển thị modal xác nhận đơn hàng đã được lưu thành công
 * @param {Object} order - Đơn hàng vừa tạo
 */
function showSuccessModal(order, cleanupWarning = '') {
    // Điền thông tin vào modal
    setTextContent('modalOrderCode',  order.orderId);
    setTextContent('modalOrderTotal', formatCurrency(order.total));
    setTextContent('modalPayMethod',  order.paymentLabel);

    // Ghi chú theo phương thức thanh toán
    const noteEl = document.getElementById('modalNote');
    if (noteEl) {
        if (cleanupWarning) {
            noteEl.textContent = cleanupWarning;
        } else if (order.paymentMethod === 'transfer') {
            noteEl.textContent =
                `Vui lòng chuyển khoản với nội dung: SPORTZONE ${order.orderId}`;
        } else if (order.paymentMethod === 'cod') {
            noteEl.textContent =
                'Hãy chuẩn bị tiền mặt khi nhân viên giao hàng đến nhé!';
        }
    }

    // Hiện modal
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        const modalAction = modal.querySelector('button');
        if (modalAction) modalAction.focus();
    }

}

/**
 * Mở trang Payment với mã đơn vừa được lưu vào lịch sử
 * Hàm này cũng được gọi từ onclick trong HTML
 */
function continueToPayment() {
    const orderId = document.getElementById('modalOrderCode')?.textContent.trim();
    if (!orderId || orderId === '---') {
        showToast('Không tìm thấy mã đơn hàng để thanh toán.', 'error');
        return;
    }
    window.location.href = `payment.html?orderId=${encodeURIComponent(orderId)}`;
}

/* ============================================================
   COPY SỐ TÀI KHOẢN NGÂN HÀNG
   ============================================================ */

/**
 * Copy số tài khoản ngân hàng vào clipboard
 * Được gọi từ onclick trong HTML
 */
function copyBankAccount() {
    const accountNumEl = document.getElementById('bankAccountNum');
    if (!accountNumEl) return;

    const accountNum = accountNumEl.textContent.trim();

    // Dùng Clipboard API (hiện đại, yêu cầu HTTPS hoặc localhost)
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(accountNum)
            .then(() => showToast('Đã sao chép số tài khoản!', 'success'))
            .catch(() => fallbackCopy(accountNum));
    } else {
        // Fallback cho môi trường không có HTTPS
        fallbackCopy(accountNum);
    }
}

/**
 * Copy fallback dùng execCommand (hỗ trợ trình duyệt cũ)
 * @param {String} text - Nội dung cần copy
 */
function fallbackCopy(text) {
    const textarea      = document.createElement('textarea');
    textarea.value      = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity  = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
        document.execCommand('copy');
        showToast('Đã sao chép số tài khoản!', 'success');
    } catch (err) {
        showToast('Không thể sao chép. Vui lòng copy thủ công.', 'error');
    }

    document.body.removeChild(textarea);
}

/* ============================================================
   CẬP NHẬT BADGE GIỎ HÀNG (HEADER)
   ============================================================ */

/**
 * Cập nhật số lượng hiển thị trên icon giỏ hàng
 * Đọc trực tiếp từ localStorage['sportzone_cart']
 */
function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    if (!badge) return;

    try {
        const raw  = localStorage.getItem(CART_KEY);
        const cart = raw ? JSON.parse(raw) : [];
        const totalQty = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
        badge.textContent = totalQty > 99 ? '99+' : totalQty;
    } catch (err) {
        badge.textContent = '0';
    }
}

/* ============================================================
   TOAST NOTIFICATION
   ============================================================ */

/**
 * Hiển thị toast notification
 * @param {String} message  - Nội dung
 * @param {String} type     - 'success' | 'error' | 'info' | 'warning'
 * @param {Number} duration - Thời gian hiển thị (ms)
 */
function showToast(message, type = 'info', duration = 3500) {
    const toast     = document.getElementById('toast');
    const iconEl    = document.getElementById('toastIcon');
    const messageEl = document.getElementById('toastMessage');
    if (!toast) return;

    const icons = {
        success: '✅',
        error:   '❌',
        info:    'ℹ️',
        warning: '⚠️',
    };

    iconEl.textContent    = icons[type] || 'ℹ️';
    messageEl.textContent = message;

    toast.className = `toast toast--${type} show`;

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

/* ============================================================
   TIỆN ÍCH (Utilities)
   ============================================================ */

/**
 * Định dạng số tiền VNĐ
 * @param {Number} amount
 * @returns {String} VD: "1.290.000 ₫"
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style:    'currency',
        currency: 'VND',
    }).format(amount);
}

/**
 * Set text content cho element theo ID
 * Gộp null-check để tránh lỗi khi element không tồn tại
 * @param {String} id
 * @param {String} text
 */
function setTextContent(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

/* ============================================================
   API CÔNG KHAI
   Gắn vào window để HTML có thể gọi qua onclick="..."
   ============================================================ */
window.placeOrder       = placeOrder;       // Xác nhận đặt hàng (từ nút HTML)
window.continueToPayment = continueToPayment; // Mở trang Payment (từ nút modal)
window.copyBankAccount  = copyBankAccount;  // Copy số TK ngân hàng (từ nút HTML)
