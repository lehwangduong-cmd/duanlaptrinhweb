'use strict';

const PAYMENT_HISTORY_KEY = 'sportzone_orders';
const PAYMENT_STATUS = {
    unpaid: 'Chưa thanh toán',
    pending: 'Chờ xác nhận thanh toán',
    paid: 'Đã thanh toán',
};
const BANK_QR_IMAGE_URL = 'https://img.vietqr.io/image/MB-0337737705-compact2.png';

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
        accountName: document.getElementById('bankOwner').textContent.trim(),
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
    setText(
        'confirmLabel',
        isTransfer ? 'Xác nhận đã chuyển khoản' : 'Xác nhận thanh toán COD'
    );
}

function renderPaymentStatus(order) {
    const state = document.getElementById('paymentState');
    const paid = isPaid(order);
    const status = paid
        ? PAYMENT_STATUS.paid
        : paymentState.method === 'transfer'
            ? PAYMENT_STATUS.pending
            : PAYMENT_STATUS.unpaid;
    const statusClass = paid
        ? 'payment-state--paid'
        : paymentState.method === 'transfer'
            ? 'payment-state--pending'
            : 'payment-state--unpaid';

    state.className = `payment-state is-visible ${statusClass}`;
    state.textContent = paid
        ? 'Đơn hàng này đã được hệ thống xác nhận thanh toán.'
        : paymentState.method === 'transfer'
            ? `${status}. Bấm xác nhận chỉ ghi nhận yêu cầu, không xác nhận tiền đã về tài khoản.`
            : `${status}. Bạn thanh toán cho nhân viên giao hàng khi nhận hàng.`;
    setText('summaryPaymentStatus', `Trạng thái: ${status}`);

    document.getElementById('confirmPayment').disabled = paid || paymentState.isSaving;
    document.getElementById('methodOptions').disabled = paid;
    document.querySelectorAll('#methodOptions input').forEach(input => {
        input.disabled = paid;
    });
}

function confirmPayment() {
    if (paymentState.isSaving || !paymentState.order || isPaid(paymentState.order)) return;
    paymentState.isSaving = true;
    renderPaymentStatus(paymentState.order);

    try {
        const history = JSON.parse(localStorage.getItem(PAYMENT_HISTORY_KEY) || '[]');
        if (!Array.isArray(history)) {
            throw new Error('Dữ liệu lịch sử đơn hàng không hợp lệ.');
        }

        const orderIndex = history.findIndex(item => item && item.orderId === paymentState.order.orderId);
        if (orderIndex < 0) {
            throw new Error('Không tìm thấy đơn hàng trong lịch sử.');
        }

        const storedOrder = history[orderIndex];
        if (isPaid(storedOrder)) {
            paymentState.order = storedOrder;
            paymentState.isSaving = false;
            renderPaymentStatus(storedOrder);
            showResult(true);
            return;
        }

        const nextStatus = paymentState.method === 'transfer'
            ? PAYMENT_STATUS.pending
            : PAYMENT_STATUS.unpaid;
        const updatedOrder = {
            ...storedOrder,
            paymentMethod: paymentState.method,
            paymentLabel: paymentState.method === 'transfer'
                ? 'Chuyển khoản ngân hàng'
                : 'Thanh toán khi nhận hàng (COD)',
            paymentStatus: nextStatus,
            paymentStatusCode: paymentState.method === 'transfer' ? 'pending' : 'unpaid',
            paymentUpdatedAt: new Date().toISOString(),
        };

        history[orderIndex] = updatedOrder;
        localStorage.setItem(PAYMENT_HISTORY_KEY, JSON.stringify(history));
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

function showResult(alreadyPaid) {
    const method = paymentState.order.paymentMethod;
    const isTransfer = method === 'transfer';
    setText('resultHeading', alreadyPaid ? 'Đơn hàng đã được thanh toán' : 'Đã ghi nhận đơn hàng');
    setText(
        'resultMessage',
        alreadyPaid
            ? 'Đơn hàng này đã có trạng thái thanh toán được xác nhận từ hệ thống.'
            : isTransfer
                ? 'Yêu cầu chuyển khoản đã được ghi nhận. Trạng thái hiện tại là “Chờ xác nhận thanh toán”; đơn hàng chưa được đánh dấu đã thanh toán.'
                : 'Đơn hàng COD đã được ghi nhận. Trạng thái thanh toán là “Chưa thanh toán” cho đến khi thu tiền khi giao hàng.'
    );
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
    return order.paymentStatusCode === 'paid' || order.paymentStatus === PAYMENT_STATUS.paid;
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
