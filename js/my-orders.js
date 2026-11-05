'use strict';

const ORDER_HISTORY_KEY = 'sportzone_orders';
const ORDER_STATUSES = [
    'Chờ xác nhận',
    'Đã xác nhận',
    'Đang chuẩn bị hàng',
    'Đang giao hàng',
    'Đã giao hàng',
    'Đã hủy',
];
const CANCELLABLE_ORDER_STATUS = 'Chờ xác nhận';
const PAYMENT_STATUS_LABELS = {
    unpaid: 'Chưa thanh toán',
    pending: 'Chờ xác nhận thanh toán',
    paid: 'Đã thanh toán',
};

const historyState = {
    orders: [],
    storageError: false,
    toastTimer: null,
};

document.addEventListener('DOMContentLoaded', initializeOrderHistory);
window.addEventListener('storage', handleStorageChange);
window.addEventListener('sz:orders-updated', () => {
    loadOrders();
    renderOrders();
});

function initializeOrderHistory() {
    const searchInput = document.getElementById('orderSearch');
    const statusFilter = document.getElementById('statusFilter');
    const ordersList = document.getElementById('ordersList');

    searchInput.addEventListener('input', renderOrders);
    statusFilter.addEventListener('change', renderOrders);
    ordersList.addEventListener('click', handleOrderAction);

    loadOrders();
    renderOrders();
}

function loadOrders() {
    try {
        const raw = localStorage.getItem(ORDER_HISTORY_KEY);
        const rawSz = localStorage.getItem('sz_orders');
        const parsed = raw ? JSON.parse(raw) : [];
        const parsedSz = rawSz ? JSON.parse(rawSz) : [];

        // Gộp các đơn hàng từ cả 2 nguồn, tránh trùng lặp
        const map = new Map();
        [...parsed, ...parsedSz].forEach(o => {
            if (!o || typeof o !== 'object') return;
            const key = o.orderId || o.id;
            if (key && !map.has(key)) map.set(key, o);
        });
        const combined = Array.from(map.values());

        historyState.orders = combined.filter(isValidOrder).map(order => ({
            ...order,
            orderId: order.orderId || order.id,
            total: Number(order.total !== undefined ? order.total : order.totalAmount),
            status: order.status || order.statusText || 'Chờ xác nhận',
            items: (order.items || []).map(item => ({
                ...item,
                name: item.name || 'Sản phẩm thể thao',
                price: Number(item.price || 0),
                quantity: Number(item.quantity || 1)
            }))
        }));
        historyState.storageError = false;
    } catch (error) {
        historyState.orders = [];
        historyState.storageError = true;
        console.error('[OrderHistory] Không thể đọc lịch sử đơn hàng:', error);
    }

    document.getElementById('storageError').hidden = !historyState.storageError;
}

function isValidOrder(order) {
    if (!order || typeof order !== 'object') return false;
    const orderId = order.orderId || order.id;
    if (!orderId || typeof orderId !== 'string' || !orderId.trim()) return false;
    const total = Number(order.total !== undefined ? order.total : order.totalAmount);
    if (!Number.isFinite(total) || total < 0) return false;
    if (!Array.isArray(order.items)) return false;
    return true;
}

function renderOrders() {
    const list = document.getElementById('ordersList');
    const emptyState = document.getElementById('emptyState');
    const emptyTitle = document.getElementById('emptyTitle');
    const emptyMessage = document.getElementById('emptyMessage');
    const search = normalizeText(document.getElementById('orderSearch').value);
    const filter = document.getElementById('statusFilter').value;
    const filteredOrders = historyState.orders.filter(order => {
        const matchesSearch = normalizeText(order.orderId).includes(search);
        const status = getOrderStatus(order);
        const matchesStatus = filter === 'all' ||
            (filter === 'other'
                ? !ORDER_STATUSES.includes(status)
                : status === filter);
        return matchesSearch && matchesStatus;
    });

    list.replaceChildren();
    filteredOrders.forEach(order => list.appendChild(createOrderCard(order)));
    document.getElementById('resultCount').textContent =
        `Hiển thị ${filteredOrders.length} / ${historyState.orders.length} đơn hàng`;

    const shouldShowEmpty = filteredOrders.length === 0 && !historyState.storageError;
    emptyState.hidden = !shouldShowEmpty;
    if (shouldShowEmpty) {
        const noOrdersAtAll = historyState.orders.length === 0 && !historyState.storageError;
        emptyTitle.textContent = noOrdersAtAll
            ? 'Bạn chưa có đơn hàng nào'
            : 'Không tìm thấy đơn hàng phù hợp';
        emptyMessage.textContent = noOrdersAtAll
            ? 'Các đơn hàng sau khi Checkout sẽ được lưu và hiển thị tại đây.'
            : 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.';
    }
}

function createOrderCard(order) {
    const card = document.createElement('article');
    card.className = 'order-card';
    card.dataset.orderId = order.orderId;

    const status = getOrderStatus(order);
    const header = document.createElement('header');
    header.className = 'order-card__header';
    const identity = document.createElement('div');
    identity.className = 'order-card__identity';
    const code = document.createElement('strong');
    code.className = 'order-card__code';
    code.textContent = order.orderId;
    const date = document.createElement('time');
    date.className = 'order-card__date';
    const orderDate = parseDate(order.createdAt || order.timestamp);
    if (orderDate) date.dateTime = orderDate.toISOString();
    date.textContent = orderDate ? formatDate(orderDate) : 'Ngày đặt chưa được ghi nhận';
    identity.append(code, date);

    const badge = document.createElement('span');
    badge.className = `status-badge ${getOrderStatusClass(status)}`;
    badge.textContent = status;
    header.append(identity, badge);

    const body = document.createElement('div');
    body.className = 'order-card__body';
    const products = document.createElement('div');
    products.className = 'order-products';
    appendProductPreview(products, order.items);

    const total = document.createElement('div');
    total.className = 'order-total';
    const totalLabel = document.createElement('span');
    totalLabel.textContent = 'Tổng thanh toán';
    const totalValue = document.createElement('strong');
    totalValue.textContent = formatCurrency(order.total);
    total.append(totalLabel, totalValue);
    body.append(products, total);

    const tracking = createTrackingTimeline(status);

    const footer = document.createElement('footer');
    footer.className = 'order-card__footer';
    const payment = createPaymentSummary(order);
    const actions = document.createElement('div');
    actions.className = 'order-actions';

    const detailButton = createActionButton('details', 'Xem chi tiết', 'fa-chevron-down', 'button--secondary');
    detailButton.setAttribute('aria-expanded', 'false');
    actions.appendChild(detailButton);
    if (canCancelOrder(order)) {
        actions.appendChild(createActionButton('cancel', 'Hủy đơn hàng', 'fa-xmark', 'button--danger'));
    }
    footer.append(payment, actions);

    const details = createOrderDetails(order);
    card.append(header, body, tracking, footer, details);
    return card;
}

function createTrackingTimeline(status) {
    const wrapper = document.createElement('div');
    wrapper.className = 'tracking-wrap';
    const timeline = document.createElement('ol');
    timeline.className = 'tracking-timeline';
    timeline.setAttribute('aria-label', `Theo dõi đơn hàng: ${status}`);

    if (!ORDER_STATUSES.includes(status)) {
        const unknown = document.createElement('li');
        unknown.className = 'tracking-step tracking-step--unknown';
        const label = document.createElement('span');
        label.className = 'tracking-step__label';
        label.textContent = `Trạng thái: ${status}`;
        unknown.appendChild(label);
        timeline.appendChild(unknown);
        wrapper.appendChild(timeline);
        return wrapper;
    }

    if (status === 'Đã hủy') {
        const cancelled = document.createElement('li');
        cancelled.className = 'tracking-step tracking-step--cancelled';
        const marker = document.createElement('span');
        marker.className = 'tracking-step__marker';
        marker.textContent = '×';
        const label = document.createElement('span');
        label.className = 'tracking-step__label';
        label.textContent = status;
        cancelled.append(marker, label);
        timeline.appendChild(cancelled);
        wrapper.appendChild(timeline);
        return wrapper;
    }

    const activeIndex = Math.max(0, ORDER_STATUSES.indexOf(status));
    ORDER_STATUSES.slice(0, 5).forEach((step, index) => {
        const item = document.createElement('li');
        item.className = 'tracking-step';
        if (index < activeIndex) item.classList.add('tracking-step--complete');
        if (index === activeIndex) {
            item.classList.add('tracking-step--active');
            item.setAttribute('aria-current', 'step');
        }

        const marker = document.createElement('span');
        marker.className = 'tracking-step__marker';
        marker.textContent = index < activeIndex ? '✓' : String(index + 1);
        const label = document.createElement('span');
        label.className = 'tracking-step__label';
        label.textContent = step;
        item.append(marker, label);
        timeline.appendChild(item);
    });

    wrapper.appendChild(timeline);
    return wrapper;
}

function appendProductPreview(container, items) {
    const previewItems = items.slice(0, 2);
    previewItems.forEach(item => {
        const row = document.createElement('div');
        row.className = 'order-product';
        const name = document.createElement('span');
        name.className = 'order-product__name';
        name.textContent = item.name || 'Sản phẩm';
        const quantity = document.createElement('span');
        quantity.className = 'order-product__qty';
        quantity.textContent = `SL: ${formatQuantity(item.quantity)}`;
        row.append(name, quantity);
        container.appendChild(row);
    });

    if (items.length > previewItems.length) {
        const more = document.createElement('span');
        more.className = 'order-product--more';
        more.textContent = `và ${items.length - previewItems.length} sản phẩm khác`;
        container.appendChild(more);
    }
}

function createPaymentSummary(order) {
    const wrapper = document.createElement('div');
    wrapper.className = 'order-payment';
    const method = document.createElement('span');
    method.className = 'order-payment__method';
    method.textContent = getPaymentMethod(order);
    const status = document.createElement('span');
    const statusInfo = getPaymentStatus(order);
    status.className = `order-payment__status ${statusInfo.className}`;
    status.textContent = `Thanh toán: ${statusInfo.label}`;
    wrapper.append(method, status);
    return wrapper;
}

function createOrderDetails(order) {
    const details = document.createElement('section');
    details.className = 'order-details';
    details.hidden = true;

    const grid = document.createElement('div');
    grid.className = 'order-details__grid';

    const customerBlock = document.createElement('div');
    customerBlock.className = 'detail-block';
    const customerTitle = document.createElement('h3');
    customerTitle.textContent = 'Thông tin nhận hàng';
    customerBlock.appendChild(customerTitle);
    appendDetail(customerBlock, 'Người nhận', order.customer?.fullName);
    appendDetail(customerBlock, 'Điện thoại', order.customer?.phone);
    appendDetail(customerBlock, 'Email', order.customer?.email);
    appendDetail(customerBlock, 'Địa chỉ', order.customer?.address);
    appendDetail(customerBlock, 'Ghi chú', order.customer?.note);
    appendDetail(customerBlock, 'Giao hàng', order.shippingLabel || getShippingLabel(order.shippingMethod));

    const itemsBlock = document.createElement('div');
    itemsBlock.className = 'detail-block';
    const itemsTitle = document.createElement('h3');
    itemsTitle.textContent = 'Sản phẩm trong đơn';
    const items = document.createElement('div');
    items.className = 'detail-items';
    order.items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'detail-item';
        const name = document.createElement('span');
        const attributes = [item.name || 'Sản phẩm', item.size, item.color].filter(Boolean);
        name.textContent = `${attributes.join(' · ')} × ${formatQuantity(item.quantity)}`;
        const price = document.createElement('strong');
        price.textContent = formatCurrency((Number(item.price) || 0) * (Number(item.quantity) || 0));
        row.append(name, price);
        items.appendChild(row);
    });
    itemsBlock.append(itemsTitle, items);
    grid.append(customerBlock, itemsBlock);
    details.appendChild(grid);

    if (order.status === 'Đã hủy' && order.cancelledAt) {
        const cancelledDate = parseDate(order.cancelledAt);
        if (cancelledDate) {
            const note = document.createElement('p');
            note.className = 'cancel-note';
            note.textContent = `Đơn hàng đã được hủy lúc ${formatDate(cancelledDate)}.`;
            details.appendChild(note);
        }
    }

    return details;
}

function appendDetail(container, label, value) {
    if (!value) return;
    const paragraph = document.createElement('p');
    paragraph.textContent = `${label}: ${value}`;
    container.appendChild(paragraph);
}

function createActionButton(action, label, iconName, variant) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `button ${variant}`;
    button.dataset.action = action;
    const icon = document.createElement('i');
    icon.className = `fa-solid ${iconName}`;
    icon.setAttribute('aria-hidden', 'true');
    button.append(icon, document.createTextNode(label));
    return button;
}

function handleOrderAction(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const card = button.closest('.order-card');
    const orderId = card?.dataset.orderId;
    if (!orderId) return;

    if (button.dataset.action === 'details') {
        const details = card.querySelector('.order-details');
        const expanded = button.getAttribute('aria-expanded') === 'true';
        details.hidden = expanded;
        button.setAttribute('aria-expanded', String(!expanded));
        button.lastChild.textContent = expanded ? 'Xem chi tiết' : 'Ẩn chi tiết';
        const icon = button.querySelector('i');
        if (icon) icon.className = `fa-solid ${expanded ? 'fa-chevron-down' : 'fa-chevron-up'}`;
        return;
    }

    if (button.dataset.action === 'cancel') cancelOrder(orderId);
}

function canCancelOrder(order) {
    return order.status === CANCELLABLE_ORDER_STATUS && !isPaymentPendingOrPaid(order);
}

function cancelOrder(orderId) {
    const order = historyState.orders.find(item => item.orderId === orderId);
    if (!order || !canCancelOrder(order)) {
        showToast('Đơn này không thể hủy ở trạng thái hiện tại.');
        return;
    }

    const confirmed = window.confirm(`Bạn có chắc muốn hủy đơn hàng ${orderId}?`);
    if (!confirmed) return;

    try {
        const raw = localStorage.getItem(ORDER_HISTORY_KEY);
        const latestOrders = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(latestOrders)) {
            throw new Error('Dữ liệu lịch sử đơn hàng không hợp lệ.');
        }

        const orderIndex = latestOrders.findIndex(item => item && item.orderId === orderId);
        if (orderIndex < 0 || !canCancelOrder(latestOrders[orderIndex])) {
            loadOrders();
            renderOrders();
            showToast('Trạng thái đơn vừa thay đổi; không thể hủy đơn này.');
            return;
        }

        latestOrders[orderIndex] = {
            ...latestOrders[orderIndex],
            status: 'Đã hủy',
            cancelledAt: new Date().toISOString(),
        };
        localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(latestOrders));

        const savedOrders = JSON.parse(localStorage.getItem(ORDER_HISTORY_KEY) || '[]');
        const savedOrder = Array.isArray(savedOrders)
            ? savedOrders.find(item => item && item.orderId === orderId)
            : null;
        if (!savedOrder || savedOrder.status !== 'Đã hủy') {
            throw new Error('Không xác nhận được trạng thái hủy đã lưu.');
        }

        loadOrders();
        renderOrders();
        showToast('Đơn hàng đã được hủy.');
    } catch (error) {
        console.error('[OrderHistory] Không thể hủy đơn hàng:', error);
        showToast('Không thể lưu trạng thái hủy. Vui lòng thử lại.');
    }
}

function handleStorageChange(event) {
    if (event.key !== ORDER_HISTORY_KEY) return;
    loadOrders();
    renderOrders();
}

function getOrderStatus(order) {
    return typeof order.status === 'string' && order.status.trim()
        ? order.status.trim()
        : 'Chờ xác nhận';
}

function getOrderStatusClass(status) {
    const classes = {
        'Chờ xác nhận': 'status--waiting',
        'Đã xác nhận': 'status--confirmed',
        'Đang chuẩn bị hàng': 'status--preparing',
        'Đang giao hàng': 'status--shipping',
        'Đã giao hàng': 'status--delivered',
        'Đã hủy': 'status--cancelled',
    };
    return classes[status] || 'status--other';
}

function getPaymentMethod(order) {
    if (order.paymentLabel) return order.paymentLabel;
    return order.paymentMethod === 'transfer'
        ? 'Chuyển khoản ngân hàng'
        : order.paymentMethod === 'cod'
            ? 'Thanh toán khi nhận hàng (COD)'
            : 'Chưa xác định';
}

function getPaymentStatus(order) {
    if (order.paymentStatusCode === 'paid' || order.paymentStatus === PAYMENT_STATUS_LABELS.paid) {
        return { label: PAYMENT_STATUS_LABELS.paid, className: 'order-payment__status--paid' };
    }
    if (order.paymentStatusCode === 'pending' || order.paymentStatus === PAYMENT_STATUS_LABELS.pending) {
        return { label: PAYMENT_STATUS_LABELS.pending, className: 'order-payment__status--pending' };
    }
    return { label: PAYMENT_STATUS_LABELS.unpaid, className: 'order-payment__status--unpaid' };
}

function isPaymentPendingOrPaid(order) {
    const payment = getPaymentStatus(order).label;
    return payment === PAYMENT_STATUS_LABELS.pending || payment === PAYMENT_STATUS_LABELS.paid;
}

function getShippingLabel(method) {
    const labels = {
        standard: 'Giao hàng tiêu chuẩn',
        express: 'Giao hàng nhanh',
        pickup: 'Nhận tại cửa hàng',
    };
    return labels[method] || '';
}

function parseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(date) {
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(Number(amount) || 0);
}

function formatQuantity(quantity) {
    return Number.isInteger(quantity) && quantity > 0 ? quantity : 1;
}

function normalizeText(value) {
    return String(value || '').trim().toLocaleUpperCase('vi-VN');
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(historyState.toastTimer);
    historyState.toastTimer = window.setTimeout(() => {
        toast.classList.remove('is-visible');
    }, 3000);
}
