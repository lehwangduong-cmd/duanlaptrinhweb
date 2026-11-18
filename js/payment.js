'use strict';

const PAYMENT_HISTORY_KEY = 'sportzone_orders';
const PAYMENT_STATUS = {
    unpaid: 'Chưa thanh toán',
    pending: 'Chờ xác nhận thanh toán',
    paid: 'Đã thanh toán',
};
const BANK_QR_IMAGE_URL = 'https://img.vietqr.io/image/TCB-88888808042007-compact2.png';

const paymentState = {
    order: null,
    method: null,
    toastTimer: null,
    isSaving: false,
};

document.addEventListener('DOMContentLoaded', initializePaymentPage);

function initializePaymentPage() {
    const orderId = new URLSearchParams(window.location.search).get('orderId');
    const order = loadOrder(orderId);

    if (!order) {
        showMissingOrder();
        return;
    }

    paymentState.order = order;
    paymentState.method = order.paymentMethod === 'transfer' ? 'transfer' : 'cod';
    renderOrder(order);
    bindPaymentEvents();
    setupRealtimePaymentListener();

    if (isPaid(order)) {
        showResult(true);
    }
}

function loadOrder(orderId) {
    if (!orderId) return null;

    try {
        const history = JSON.parse(localStorage.getItem(PAYMENT_HISTORY_KEY) || '[]');
        if (!Array.isArray(history)) {
            throw new Error('Dữ liệu lịch sử đơn hàng không hợp lệ.');
        }

        const order = history.find(item => item && item.orderId === orderId);
        const validItems = Array.isArray(order?.items) && order.items.length > 0 &&
            order.items.every(item =>
                item &&
                typeof item.name === 'string' &&
                Number.isFinite(item.price) && item.price >= 0 &&
                Number.isInteger(item.quantity) && item.quantity > 0
            );
        if (
            !order ||
            !validItems ||
            !Number.isFinite(order.subtotal) || order.subtotal < 0 ||
            !Number.isFinite(order.shipping) || order.shipping < 0 ||
            !Number.isFinite(order.discount || 0) || (order.discount || 0) < 0 ||
            !Number.isFinite(order.total) ||
            order.total < 0
        ) {
            return null;
        }

        return order;
    } catch (error) {
        console.error('[Payment] Không thể đọc lịch sử đơn hàng:', error);
        showToast('Không thể đọc dữ liệu đơn hàng trên thiết bị này.');
        return null;
    }
}

function renderOrder(order) {
    document.getElementById('paymentContent').hidden = false;
    setText('orderCode', order.orderId);
    setText('customerName', order.customer?.fullName || 'Khách hàng');
    setText('orderStatus', order.status || 'Chờ xác nhận');
    setText('subtotal', formatCurrency(order.subtotal || 0));
    setText('shipping', order.shipping > 0 ? formatCurrency(order.shipping) : 'Miễn phí');
    setText('discount', `−${formatCurrency(order.discount || 0)}`);
    setText('total', formatCurrency(order.total));
    setText('bankAmount', formatCurrency(order.total));
    setText('transferContent', `SPORTZONE ${order.orderId}`);

    const promotion = order.promotion || order.coupon;
    setText(
        'discountLabel',
        promotion ? `Giảm giá (${promotion.code || promotion.label})` : 'Giảm giá'
    );

    const discountLine = document.getElementById('discountLine');
    discountLine.hidden = !(order.discount > 0);

    const methodRadio = document.querySelector(`input[name="paymentMethod"][value="${paymentState.method}"]`);
    if (methodRadio) methodRadio.checked = true;

    renderProducts(order.items);
    renderPaymentMethod();
    renderPaymentStatus(order);

    const historyLink = document.getElementById('historyLink');
    historyLink.href = `my-orders.html?orderId=${encodeURIComponent(order.orderId)}`;

    const backLink = document.getElementById('backToCheckout');
    backLink.href = `checkout.html?orderId=${encodeURIComponent(order.orderId)}`;
}

function renderBankQr(order) {
    const image = document.getElementById('bankQr');
    const errorMessage = document.getElementById('bankQrError');
    if (!image || !errorMessage) return;
    if (image.dataset.orderId === order.orderId && image.dataset.status === 'loaded') return;

    if (!Number.isSafeInteger(order.total) || order.total <= 0) {
        image.hidden = true;
        errorMessage.textContent = 'Đơn hàng không có số tiền thanh toán hợp lệ nên không thể tạo mã QR.';
        errorMessage.hidden = false;
        image.dataset.orderId = order.orderId;
        image.dataset.status = 'error';
        return;
    }
    if (image.dataset.orderId === order.orderId && image.dataset.status === 'loading') return;

    const qrUrl = new URL(BANK_QR_IMAGE_URL);
    qrUrl.search = new URLSearchParams({
        amount: String(order.total),
        addInfo: `SPORTZONE ${order.orderId}`,
        accountName: 'LE CONG MINH',
    }).toString();

    image.onload = () => {
        errorMessage.hidden = true;
        image.hidden = false;
        image.dataset.status = 'loaded';
    };
    image.onerror = () => {
        image.hidden = true;
        errorMessage.hidden = false;
        image.dataset.status = 'error';
    };
    image.dataset.orderId = order.orderId;
    image.dataset.status = 'loading';
    image.hidden = true;
    errorMessage.textContent = 'Không tải được mã QR. Bạn có thể nhập số tài khoản, số tiền và nội dung chuyển khoản hiển thị bên trái.';
    errorMessage.hidden = false;
    image.src = qrUrl.toString();
}

function renderProducts(items) {
    const productList = document.getElementById('productList');
    productList.replaceChildren();

    items.forEach(item => {
        const row = document.createElement('article');
        row.className = 'product-row';

        const imageFrame = document.createElement('div');
        imageFrame.className = 'product-image';
        imageFrame.setAttribute('aria-hidden', 'true');
        if (typeof item.image === 'string' && item.image.trim()) {
            try {
                const imageUrl = new URL(item.image, window.location.href);
                if (['http:', 'https:'].includes(imageUrl.protocol)) {
                    const image = document.createElement('img');
                    image.src = imageUrl.href;
                    image.alt = '';
                    image.loading = 'lazy';
                    image.addEventListener('error', () => image.remove(), { once: true });
                    imageFrame.appendChild(image);
                }
            } catch (error) {
                console.warn('[Payment] Bỏ qua URL ảnh không hợp lệ của sản phẩm.');
            }
        }
        if (!imageFrame.childElementCount) {
            const fallbackIcon = document.createElement('i');
            fallbackIcon.className = 'fa-solid fa-shirt';
            imageFrame.appendChild(fallbackIcon);
        }

        const info = document.createElement('div');
        info.className = 'product-info';
        const name = document.createElement('strong');
        name.className = 'product-name';
        name.textContent = item.name || 'Sản phẩm';
        const meta = document.createElement('span');
        meta.className = 'product-meta';
        const attributes = [
            item.brand,
            item.size ? `Size ${item.size}` : '',
            item.color,
            `SL: ${item.quantity}`,
        ].filter(Boolean);
        meta.textContent = attributes.join(' · ');
        info.append(name, meta);

        const price = document.createElement('strong');
        price.className = 'product-price';
        price.textContent = formatCurrency((Number(item.price) || 0) * (Number(item.quantity) || 0));

        row.append(imageFrame, info, price);
        productList.appendChild(row);
    });
}

function bindPaymentEvents() {
    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', event => {
            if (isPaid(paymentState.order)) {
                event.target.checked = false;
                const paidMethod = paymentState.order.paymentMethod === 'transfer' ? 'transfer' : 'cod';
                document.querySelector(`input[name="paymentMethod"][value="${paidMethod}"]`).checked = true;
                return;
            }

            paymentState.method = event.target.value;
            renderPaymentMethod();
            renderPaymentStatus(paymentState.order);
            hideResult();
        });
    });

    document.getElementById('confirmPayment').addEventListener('click', confirmPayment);
    document.getElementById('copyAccount').addEventListener('click', () => copyText(document.getElementById('bankAccount').textContent));
    document.getElementById('copyReference').addEventListener('click', () => copyText(document.getElementById('transferContent').textContent));
    document.getElementById('backToCheckout').addEventListener('click', event => {
        event.preventDefault();
        returnToCheckout();
    });
}

function renderPaymentMethod() {
    const isTransfer = paymentState.method === 'transfer';
    document.getElementById('bankDetails').hidden = !isTransfer;
    if (isTransfer) renderBankQr(paymentState.order);

    const confirmIcon = document.querySelector('#confirmPayment i');
    if (confirmIcon) {
        confirmIcon.className = isTransfer ? 'fa-solid fa-arrows-rotate' : 'fa-solid fa-truck-fast';
    }

    setText(
        'confirmLabel',
        isTransfer ? 'Kiểm tra trạng thái thanh toán' : 'Xác nhận đặt hàng COD'
    );
}

function renderPaymentStatus(order) {
    const state = document.getElementById('paymentState');
    const paid = isPaid(order);
    const isTransfer = paymentState.method === 'transfer';
    const status = paid
        ? PAYMENT_STATUS.paid
        : isTransfer
            ? PAYMENT_STATUS.pending
            : PAYMENT_STATUS.unpaid;
    const statusClass = paid
        ? 'payment-state--paid'
        : isTransfer
            ? 'payment-state--pending'
            : 'payment-state--unpaid';

    state.className = `payment-state is-visible ${statusClass}`;
    if (paid) {
        state.innerHTML = '<i class="fa-solid fa-circle-check"></i> Đơn hàng này đã được hệ thống xác nhận thanh toán thành công.';
    } else if (isTransfer) {
        state.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <strong>Đang chờ chuyển khoản:</strong> Hệ thống sẽ tự động xác nhận ngay khi tiền về tài khoản ngân hàng.';
    } else {
        state.innerHTML = '<i class="fa-solid fa-truck"></i> Bạn sẽ thanh toán cho nhân viên giao hàng khi nhận hàng.';
    }
    setText('summaryPaymentStatus', `Trạng thái: ${status}`);

    document.getElementById('confirmPayment').disabled = paid || paymentState.isSaving;
    document.getElementById('methodOptions').disabled = paid;
    document.querySelectorAll('#methodOptions input').forEach(input => {
        input.disabled = paid;
    });
}

async function confirmPayment() {
    if (paymentState.isSaving || !paymentState.order || isPaid(paymentState.order)) return;

    // NẾU LÀ CHUYỂN KHOẢN: Bắt buộc kiểm tra tiền thật, không cho phép xác nhận ảo
    if (paymentState.method === 'transfer') {
        await verifyBankPaymentLive(true);
        return;
    }

    // NẾU LÀ COD: Cho phép ghi nhận đơn hàng thanh toán khi nhận hàng
    paymentState.isSaving = true;
    renderPaymentStatus(paymentState.order);

    try {
        const history = JSON.parse(localStorage.getItem(PAYMENT_HISTORY_KEY) || '[]');
        if (!Array.isArray(history)) {
            throw new Error('Dữ liệu lịch sử đơn hàng không hợp lệ.');
        }

        const orderIndex = history.findIndex(item => item && (item.orderId === paymentState.order.orderId || item.id === paymentState.order.orderId));
        if (orderIndex < 0) {
            throw new Error('Không tìm thấy đơn hàng trong lịch sử.');
        }

        const storedOrder = history[orderIndex];
        const updatedOrder = {
            ...storedOrder,
            paymentMethod: 'cod',
            paymentLabel: 'Thanh toán khi nhận hàng (COD)',
            paymentStatus: PAYMENT_STATUS.unpaid,
            paymentStatusCode: 'unpaid',
            paymentUpdatedAt: new Date().toISOString(),
        };

        history[orderIndex] = updatedOrder;
        localStorage.setItem(PAYMENT_HISTORY_KEY, JSON.stringify(history));
        saveOrderLocally(updatedOrder);

        paymentState.order = updatedOrder;
        paymentState.isSaving = false;
        renderPaymentStatus(updatedOrder);
        showResult(false);
    } catch (error) {
        paymentState.isSaving = false;
        renderPaymentStatus(paymentState.order);
        console.error('[Payment] Không thể cập nhật trạng thái thanh toán:', error);
        showToast('Không thể lưu trạng thái thanh toán. Vui lòng thử lại.');
    }
}

async function verifyBankPaymentLive(isManualClick = false) {
    if (!paymentState.order) return;
    const currentId = paymentState.order.orderId || paymentState.order.id;

    if (isManualClick) {
        showToast('🔄 Đang kiểm tra giao dịch từ ngân hàng...');
    }

    try {
        // 1. Kiểm tra trực tiếp API server Railway (cực nhanh, hoạt động 100% không phụ thuộc quota)
        const srvRes = await fetch(`/api/orders/webhook/payment-status?orderId=${encodeURIComponent(currentId)}`);
        if (srvRes.ok) {
            const srvData = await srvRes.json();
            if (srvData && srvData.paid) {
                const freshOrder = {
                    ...paymentState.order,
                    paymentStatus: 'Đã thanh toán',
                    paymentStatusCode: 'paid',
                    status: paymentState.order.status === 'Chờ xác nhận' ? 'Đã thanh toán' : paymentState.order.status,
                    paymentUpdatedAt: new Date().toISOString(),
                };
                saveOrderLocally(freshOrder);
                paymentState.order = freshOrder;
                renderPaymentStatus(freshOrder);
                showResult(true);
                playPaymentSuccessSound();
                showToast('🎉 Đã nhận được chuyển khoản thành công!');
                return;
            }
        }
    } catch (err) {
        // Bỏ qua nếu chạy thuần static hoặc offline
    }

    try {
        // 2. Kiểm tra trực tiếp Firestore REST API từ Cloud
        const res = await fetch(`https://firestore.googleapis.com/v1/projects/sportzone-sync-v2/databases/(default)/documents/sz_orders/${encodeURIComponent(currentId)}`);
        if (res.ok) {
            const data = await res.json();
            const fields = data.fields || {};
            const pStatus = fields.paymentStatus?.stringValue || '';
            const pCode = fields.paymentStatusCode?.stringValue || '';
            const mStatus = fields.status?.stringValue || fields.orderStatus?.stringValue || '';

            if (pCode === 'paid' || pStatus === 'Đã thanh toán' || pStatus === 'paid' || mStatus === 'paid' || mStatus === 'Đã thanh toán') {
                // TIỀN ĐÃ VỀ THẬT!
                const freshOrder = {
                    ...paymentState.order,
                    paymentStatus: 'Đã thanh toán',
                    paymentStatusCode: 'paid',
                    status: paymentState.order.status === 'Chờ xác nhận' ? 'Đã thanh toán' : paymentState.order.status,
                    paymentUpdatedAt: fields.paymentUpdatedAt?.stringValue || new Date().toISOString(),
                };
                saveOrderLocally(freshOrder);
                paymentState.order = freshOrder;
                renderPaymentStatus(freshOrder);
                showResult(true);
                playPaymentSuccessSound();
                showToast('🎉 Đã nhận được chuyển khoản thành công!');
                return;
            }
        }
    } catch (err) {
        console.warn('[Payment] Không thể kiểm tra trực tiếp Firestore REST:', err);
    }

    // 2. Kiểm tra bộ nhớ local (nếu realtime listener hoặc cloud-sync đã cập nhật)
    const local = loadOrder(currentId);
    if (local && isPaid(local)) {
        paymentState.order = local;
        renderPaymentStatus(local);
        showResult(true);
        playPaymentSuccessSound();
        showToast('🎉 Đã nhận được chuyển khoản thành công!');
        return;
    }

    // NẾU CHƯA CÓ TIỀN VỀ: Tuyệt đối KHÔNG hiển thị thành công!
    if (isManualClick) {
        showToast('⚠️ Hệ thống chưa nhận được tiền chuyển khoản. Vui lòng quét mã VietQR và kiểm tra lại sau ít giây.');
        const state = document.getElementById('paymentState');
        if (state) {
            state.className = 'payment-state is-visible payment-state--pending';
            state.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <strong>Đang chờ chuyển khoản:</strong> Chưa nhận được tiền từ ngân hàng. Vui lòng quét mã VietQR bên trên để thanh toán.';
        }
    }
}

function saveOrderLocally(order) {
    if (!order) return;
    const targetId = order.orderId || order.id;
    if (!targetId) return;

    try {
        const history = JSON.parse(localStorage.getItem(PAYMENT_HISTORY_KEY) || '[]');
        if (Array.isArray(history)) {
            const idx = history.findIndex(o => o && (o.orderId === targetId || o.id === targetId));
            if (idx >= 0) {
                history[idx] = { ...history[idx], ...order };
            } else {
                history.unshift(order);
            }
            localStorage.setItem(PAYMENT_HISTORY_KEY, JSON.stringify(history));
        }

        const szRaw = localStorage.getItem('sz_orders');
        const szHistory = szRaw ? JSON.parse(szRaw) : [];
        if (Array.isArray(szHistory)) {
            const sIdx = szHistory.findIndex(o => o && (o.orderId === targetId || o.id === targetId));
            if (sIdx >= 0) {
                szHistory[sIdx] = { ...szHistory[sIdx], ...order };
            } else {
                szHistory.unshift(order);
            }
            localStorage.setItem('sz_orders', JSON.stringify(szHistory));
        }
    } catch (e) {
        console.warn('[Payment] Lỗi ghi lưu đơn hàng cục bộ:', e);
    }
}

function showResult(alreadyPaid) {
    const method = paymentState.order ? paymentState.order.paymentMethod : null;
    const isTransfer = method === 'transfer';

    if (alreadyPaid) {
        setText('resultHeading', 'Thanh toán thành công!');
        setText(
            'resultMessage',
            'Đơn hàng của bạn đã được hệ thống xác nhận thanh toán thành công qua ngân hàng Techcombank. SportZone đang chuẩn bị đơn hàng để giao đến bạn sớm nhất!'
        );
    } else {
        setText('resultHeading', 'Đã ghi nhận đơn hàng COD');
        setText(
            'resultMessage',
            'Đơn hàng COD của bạn đã được ghi nhận. Bạn sẽ thanh toán bằng tiền mặt cho nhân viên giao hàng khi nhận hàng.'
        );
    }

    document.getElementById('paymentContent').hidden = true;
    document.getElementById('paymentResult').hidden = false;
}

function hideResult() {
    document.getElementById('paymentResult').hidden = true;
    document.getElementById('paymentContent').hidden = false;
}

function showMissingOrder() {
    document.getElementById('missingOrder').hidden = false;
    document.getElementById('paymentContent').hidden = true;
}

function returnToCheckout() {
    if (document.referrer) {
        try {
            const previousUrl = new URL(document.referrer);
            if (previousUrl.pathname.endsWith('/checkout.html')) {
                window.history.back();
                return;
            }
        } catch (error) {
            console.warn('[Payment] Không đọc được trang trước đó; điều hướng bằng URL.');
        }
    }
    window.location.href = `checkout.html?orderId=${encodeURIComponent(paymentState.order.orderId)}`;
}

function isPaid(order) {
    if (!order) return false;
    const statusCode = String(order.paymentStatusCode || '').toLowerCase().trim();
    const status = String(order.paymentStatus || '').toLowerCase().trim();
    const mainStatus = String(order.status || order.orderStatus || '').toLowerCase().trim();
    return statusCode === 'paid' || 
           status === 'đã thanh toán' || 
           status === 'paid' || 
           status === 'thành công' ||
           mainStatus === 'paid' ||
           mainStatus === 'đã thanh toán';
}

let _realtimeListenerBound = false;

function setupRealtimePaymentListener() {
    if (_realtimeListenerBound) return;
    _realtimeListenerBound = true;

    // 1. Sự kiện bắn từ cloud-sync.js khi Firestore có cập nhật mới
    window.addEventListener('sz:orders-updated', (event) => {
        handleIncomingOrders(event.detail);
    });

    // 2. Sự kiện khi tab/thiết bị khác cập nhật localStorage
    window.addEventListener('storage', (event) => {
        if (event.key === PAYMENT_HISTORY_KEY || event.key === 'sz_orders') {
            try {
                const list = JSON.parse(event.newValue || '[]');
                handleIncomingOrders(list);
            } catch (e) {}
        }
    });

    // 3. Lắng nghe trực tiếp Firestore collection sz_orders cho chính đơn hàng này
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
        try {
            const db = firebase.firestore();
            const currentOrderId = paymentState.order?.orderId;
            if (currentOrderId) {
                db.collection('sz_orders').doc(currentOrderId).onSnapshot((doc) => {
                    if (doc.exists) {
                        const data = doc.data();
                        if (data) handleIncomingOrders([data]);
                    }
                }, (err) => console.warn('[Payment] Realtime order listener:', err));
            }
        } catch (e) {
            console.warn('[Payment] Không thể gắn Firestore listener trực tiếp:', e);
        }
    }

    // 4. Polling dự phòng mỗi 3 giây kiểm tra lại cả Cloud Firestore và localStorage
    setInterval(() => {
        if (!paymentState.order || isPaid(paymentState.order)) return;
        verifyBankPaymentLive(false);
    }, 3000);
}

function handleIncomingOrders(orders) {
    if (!paymentState.order || !Array.isArray(orders)) return;
    const currentId = paymentState.order.orderId || paymentState.order.id;
    const updated = orders.find(o => o && (o.orderId === currentId || o.id === currentId));
    if (!updated) return;

    const wasPaid = isPaid(paymentState.order);
    const nowPaid = isPaid(updated);

    paymentState.order = updated;

    if (!wasPaid && nowPaid) {
        // Vừa nhận được thanh toán thành công!
        renderPaymentStatus(updated);
        showResult(true);
        playPaymentSuccessSound();
        showToast('🎉 Đã nhận được chuyển khoản! Thanh toán đơn hàng thành công.');
    } else if (nowPaid) {
        renderPaymentStatus(updated);
        showResult(true);
    } else {
        renderPaymentStatus(updated);
    }
}

function playPaymentSuccessSound() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        
        // Nốt 1 (E5 - 659Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(659.25, now);
        gain1.gain.setValueAtTime(0.15, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.2);

        // Nốt 2 (G#5 - 830Hz)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(830.61, now + 0.15);
        gain2.gain.setValueAtTime(0.2, now + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.15);
        osc2.stop(now + 0.5);
    } catch (e) {
        // Bỏ qua nếu trình duyệt chặn autoplay
    }
}

async function copyText(value) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(value);
        } else {
            const temporaryInput = document.createElement('textarea');
            temporaryInput.value = value;
            temporaryInput.style.position = 'fixed';
            temporaryInput.style.opacity = '0';
            document.body.appendChild(temporaryInput);
            temporaryInput.select();
            const copied = document.execCommand('copy');
            temporaryInput.remove();
            if (!copied) throw new Error('Clipboard copy was rejected.');
        }
        showToast('Đã sao chép vào bộ nhớ tạm.');
    } catch (error) {
        console.error('[Payment] Không thể sao chép nội dung:', error);
        showToast('Không thể sao chép. Vui lòng chọn và sao chép thủ công.');
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(amount);
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(paymentState.toastTimer);
    paymentState.toastTimer = window.setTimeout(() => {
        toast.classList.remove('is-visible');
    }, 3000);
}
