'use strict';

(() => {
  const PRODUCTS_KEY = 'sportzone_products';
  const ORDERS_KEY = 'sportzone_orders';
  const SHOP_ORDERS_KEY = 'sz_orders';
  const ORDER_STATUSES = [
    'Chờ xác nhận',
    'Đã xác nhận',
    'Đang chuẩn bị hàng',
    'Đang giao hàng',
    'Đã giao hàng',
    'Đã hủy',
  ];
  const STOCK_WARNING_LEVEL = 5;
  const state = { products: [], orders: [], shopOrders: [], toastTimer: null };
  const revenueState = { period: 'day', buckets: [] };
  const titles = {
    dashboard: 'Tổng quan',
    products: 'Sản phẩm & kho',
    orders: 'Đơn hàng',
    customers: 'Khách hàng',
    revenue: 'Doanh thu',
  };

  document.addEventListener('DOMContentLoaded', initialize);
  window.addEventListener('storage', handleStorageChange);

  function initialize() {
    if (typeof Auth === 'undefined' || typeof Auth.isAdmin !== 'function' || !Auth.isAdmin()) {
      window.location.replace('../account.html');
      return;
    }

    const user = Auth.getCurrentUser();
    if (user?.fullName) setText('adminGreeting', `Xin chào, ${user.fullName}`);
    document.getElementById('adminLogout').addEventListener('click', logoutAdmin);
    initializeRevenueSearch();
    bindNavigation();
    bindProductForm();
    bindFilters();
    loadData();
    renderAll();
  }

  function bindNavigation() {
    document.querySelectorAll('[data-view]').forEach(button => {
      button.addEventListener('click', () => showView(button.dataset.view));
    });
    document.querySelectorAll('[data-open-view]').forEach(button => {
      button.addEventListener('click', () => showView(button.dataset.openView));
    });
  }

  function bindFilters() {
    document.getElementById('productSearch').addEventListener('input', renderProducts);
    document.getElementById('stockFilter').addEventListener('change', renderProducts);
    document.getElementById('orderSearch').addEventListener('input', renderOrders);
    document.getElementById('orderStatusFilter').addEventListener('change', renderOrders);
    document.getElementById('customerSearch').addEventListener('input', renderCustomers);
    document.getElementById('revenuePeriod').addEventListener('change', updateRevenueSearchFields);
    document.getElementById('searchRevenue').addEventListener('click', renderRevenue);

    document.getElementById('addProductButton').addEventListener('click', () => openProductDialog());
    document.getElementById('productsTable').addEventListener('click', handleProductAction);
    document.getElementById('ordersTable').addEventListener('change', handleOrderStatusChange);

    document.querySelectorAll('[data-close-dialog]').forEach(button => {
      button.addEventListener('click', () => button.closest('dialog').close());
    });
  }

  function bindProductForm() {
    document.getElementById('productForm').addEventListener('submit', saveProduct);
  }

  function loadData() {
    const warnings = [];
    state.products = readArray(PRODUCTS_KEY, 'sản phẩm', warnings);
    state.orders = readArray(ORDERS_KEY, 'đơn hàng', warnings);
    state.shopOrders = readArray(SHOP_ORDERS_KEY, 'đơn hàng cửa hàng', warnings);
    const notice = document.getElementById('storageNotice');
    notice.hidden = warnings.length === 0;
    notice.textContent = warnings.join(' ');
  }

  function readArray(key, label, warnings) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const value = JSON.parse(raw);
      if (!Array.isArray(value)) throw new Error(`Dữ liệu ${label} không phải danh sách.`);
      return value.filter(item => item && typeof item === 'object' && !Array.isArray(item));
    } catch (error) {
      console.error(`[Admin] Không thể đọc ${label}:`, error);
      warnings.push(`Không thể đọc ${label}; hãy kiểm tra dữ liệu lưu trên trình duyệt.`);
      return [];
    }
  }

  function renderAll() {
    renderDashboard();
    renderProducts();
    renderOrders();
    renderCustomers();
    renderRevenue();
  }

  function showView(name) {
    if (!Object.prototype.hasOwnProperty.call(titles, name)) return;
    document.querySelectorAll('[data-view-panel]').forEach(panel => {
      const active = panel.dataset.viewPanel === name;
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });
    document.querySelectorAll('[data-view]').forEach(button => {
      const active = button.dataset.view === name;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    document.getElementById('pageTitle').textContent = titles[name];
  }

  function renderDashboard() {
    const customers = getCustomers();
    const delivered = getRevenueOrders();
    const revenue = delivered.reduce((sum, order) => sum + getRevenueOrderTotal(order), 0);
    const lowStock = state.products.filter(product => getStock(product) <= STOCK_WARNING_LEVEL);

    setText('statProducts', state.products.length);
    setText('statLowStock', `${lowStock.length} sản phẩm sắp hết hàng`);
    setText('statOrders', state.orders.length);
    setText('statPending', `${state.orders.filter(order => getOrderStatus(order) === 'Chờ xác nhận').length} đơn chờ xác nhận`);
    setText('statCustomers', customers.length);
    setText('statRevenue', formatCurrency(revenue));
    renderDashboardMonthlyChart();
    renderLowStock(lowStock);
    renderRecentOrders();
  }

  function renderLowStock(products) {
    const container = document.getElementById('lowStockList');
    container.replaceChildren();
    if (products.length === 0) {
      container.appendChild(createText('p', 'compact-empty', 'Chưa có sản phẩm hoặc kho đang đủ hàng.'));
      return;
    }
    products.slice(0, 5).forEach(product => {
      const row = createElement('div', 'compact-row');
      row.append(
        createText('strong', '', product.name || 'Sản phẩm chưa đặt tên'),
        createText('span', '', getStock(product) === 0 ? 'Hết hàng' : `Còn ${getStock(product)}`)
      );
      container.appendChild(row);
    });
  }

  function renderRecentOrders() {
    const container = document.getElementById('recentOrders');
    const orders = [...state.orders].sort((a, b) => getTimestamp(b) - getTimestamp(a)).slice(0, 5);
    container.replaceChildren();
    document.getElementById('recentOrdersEmpty').hidden = orders.length > 0;
    orders.forEach(order => {
      const row = document.createElement('tr');
      row.append(
        textCell(order.orderId || '—', true),
        textCell(order.customer?.fullName || 'Khách hàng'),
        textCell(formatDate(order.createdAt || order.timestamp)),
        textCell(formatCurrency(getOrderTotal(order))),
        statusCell(getOrderStatus(order))
      );
      container.appendChild(row);
    });
  }

  function renderProducts() {
    const container = document.getElementById('productsTable');
    const query = normalize(document.getElementById('productSearch').value);
    const filter = document.getElementById('stockFilter').value;
    const products = state.products.filter(product => {
      const matchesQuery = normalize(`${product.name || ''} ${product.category || ''} ${product.sku || ''}`).includes(query);
      const stock = getStock(product);
      const matchesStock = filter === 'all' ||
        (filter === 'low' && stock > 0 && stock <= STOCK_WARNING_LEVEL) ||
        (filter === 'out' && stock === 0);
      return matchesQuery && matchesStock;
    });
    container.replaceChildren();
    document.getElementById('productsEmpty').hidden = products.length > 0;

    products.forEach(product => {
      const row = document.createElement('tr');
      const nameCell = document.createElement('td');
      nameCell.appendChild(createText('span', 'table-primary', product.name || 'Sản phẩm chưa đặt tên'));
      nameCell.appendChild(createText('span', 'table-secondary', product.sku || 'Chưa có mã sản phẩm'));
      const stock = getStock(product);
      const stockCell = document.createElement('td');
      const stockText = createText('span', '', stock === 0 ? 'Hết hàng' : `${stock} sản phẩm`);
      if (stock === 0) stockText.classList.add('stock--out');
      else if (stock <= STOCK_WARNING_LEVEL) stockText.classList.add('stock--low');
      stockCell.appendChild(stockText);
      const actions = document.createElement('td');
      actions.className = 'row-actions';
      actions.append(
        actionButton('edit', product.id, 'Sửa', 'small-button'),
        actionButton('delete', product.id, 'Xóa', 'small-button small-button--danger')
      );
      row.append(
        nameCell,
        textCell(product.category || 'Khác'),
        textCell(formatCurrency(getProductPrice(product))),
        stockCell,
        actions
      );
      container.appendChild(row);
    });
  }

  function handleProductAction(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const product = state.products.find(item => String(item.id) === button.dataset.id);
    if (!product) {
      showToast('Không tìm thấy sản phẩm cần thao tác.');
      return;
    }
    if (button.dataset.action === 'edit') {
      openProductDialog(product);
      return;
    }
    if (button.dataset.action === 'delete' && window.confirm(`Xóa sản phẩm "${product.name || 'Sản phẩm'}"?`)) {
      persistArray(PRODUCTS_KEY, state.products.filter(item => String(item.id) !== button.dataset.id), 'Đã xóa sản phẩm.');
    }
  }

  function openProductDialog(product) {
    const form = document.getElementById('productForm');
    form.reset();
    document.getElementById('productId').value = product ? String(product.id) : '';
    document.getElementById('productName').value = product?.name || '';
    document.getElementById('productCategory').value = product?.category || '';
    document.getElementById('productPrice').value = product ? getProductPrice(product) : '';
    document.getElementById('productStock').value = product ? getStock(product) : '';
    document.getElementById('productSku').value = product?.sku || '';
    document.getElementById('productDialogTitle').textContent = product ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm';
    document.getElementById('productDialog').showModal();
  }

  function saveProduct(event) {
    event.preventDefault();
    const id = document.getElementById('productId').value;
    const sku = document.getElementById('productSku').value.trim();
    const duplicateSku = sku && state.products.some(product =>
      String(product.id) !== id && normalize(product.sku || '') === normalize(sku)
    );
    if (duplicateSku) {
      showToast('Mã sản phẩm này đã được sử dụng.');
      document.getElementById('productSku').focus();
      return;
    }

    const product = {
      id: id || createId(),
      name: document.getElementById('productName').value.trim(),
      category: document.getElementById('productCategory').value,
      price: Number(document.getElementById('productPrice').value),
      stock: Number(document.getElementById('productStock').value),
      sku,
    };
    if (!product.name || !product.category || !Number.isFinite(product.price) || product.price <= 0 ||
      !Number.isInteger(product.stock) || product.stock < 0) {
      showToast('Vui lòng kiểm tra thông tin sản phẩm.');
      return;
    }

    const next = id
      ? state.products.map(item => String(item.id) === id ? { ...item, ...product } : item)
      : [...state.products, product];
    if (persistArray(PRODUCTS_KEY, next, id ? 'Đã cập nhật sản phẩm.' : 'Đã thêm sản phẩm.')) {
      document.getElementById('productDialog').close();
      event.target.reset();
    }
  }

  function renderOrders() {
    const container = document.getElementById('ordersTable');
    const query = normalize(document.getElementById('orderSearch').value);
    const statusFilter = document.getElementById('orderStatusFilter').value;
    const orders = state.orders
      .map((order, index) => ({ order, index }))
      .filter(({ order }) => {
        const customer = order.customer || {};
        const searchable = normalize([
          order.orderId,
          customer.fullName,
          customer.email,
          customer.phone,
        ].join(' '));
        return searchable.includes(query) && (statusFilter === 'all' || getOrderStatus(order) === statusFilter);
      })
      .sort((a, b) => getTimestamp(b.order) - getTimestamp(a.order));
    container.replaceChildren();
    document.getElementById('ordersEmpty').hidden = orders.length > 0;

    orders.forEach(({ order, index }) => {
      const row = document.createElement('tr');
      const items = Array.isArray(order.items) ? order.items : [];
      const itemSummary = items.length
        ? `${items.length} loại · ${items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)} sản phẩm`
        : 'Không có thông tin';
      const status = document.createElement('td');
      const select = document.createElement('select');
      select.dataset.orderIndex = String(index);
      select.setAttribute('aria-label', `Cập nhật trạng thái đơn ${order.orderId || ''}`);
      const currentStatus = getOrderStatus(order);
      if (!ORDER_STATUSES.includes(currentStatus)) {
        const unknownOption = document.createElement('option');
        unknownOption.value = currentStatus;
        unknownOption.textContent = `Khác: ${currentStatus}`;
        unknownOption.selected = true;
        select.appendChild(unknownOption);
      }
      ORDER_STATUSES.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        option.selected = value === currentStatus;
        select.appendChild(option);
      });
      status.appendChild(select);
      row.append(
        textCell(order.orderId || '—', true),
        textCell(order.customer?.fullName || 'Khách hàng'),
        textCell(formatDate(order.createdAt || order.timestamp)),
        textCell(itemSummary),
        textCell(formatCurrency(getOrderTotal(order))),
        status
      );
      container.appendChild(row);
    });
  }

  function handleOrderStatusChange(event) {
    const select = event.target.closest('select[data-order-index]');
    if (!select) return;
    const index = Number(select.dataset.orderIndex);
    const status = select.value;
    if (!Number.isInteger(index) || !state.orders[index] || !ORDER_STATUSES.includes(status)) {
      showToast('Không thể cập nhật trạng thái đơn hàng.');
      renderOrders();
      return;
    }
    const updated = state.orders.map((order, orderIndex) => {
      if (orderIndex !== index) return order;
      const next = { ...order, status };
      if (status === 'Đã hủy' && !next.cancelledAt) next.cancelledAt = new Date().toISOString();
      if (status !== 'Đã hủy') delete next.cancelledAt;
      return next;
    });
    persistArray(ORDERS_KEY, updated, 'Đã cập nhật trạng thái đơn hàng.');
  }

  function renderCustomers() {
    const container = document.getElementById('customersTable');
    const query = normalize(document.getElementById('customerSearch').value);
    const customers = getCustomers().filter(customer =>
      normalize(`${customer.name} ${customer.email} ${customer.phone} ${customer.address}`).includes(query)
    );
    container.replaceChildren();
    document.getElementById('customersEmpty').hidden = customers.length > 0;
    customers.forEach(customer => {
      const contact = document.createElement('td');
      contact.append(
        createText('span', 'table-primary', customer.phone || 'Chưa có số điện thoại'),
        createText('span', 'table-secondary', customer.email || 'Chưa có email')
      );
      const row = document.createElement('tr');
      row.append(
        textCell(customer.name || 'Khách hàng'),
        contact,
        textCell(customer.address || '—'),
        textCell(customer.orders.length),
        textCell(formatCurrency(customer.spent))
      );
      container.appendChild(row);
    });
  }

  function getCustomers() {
    const customers = new Map();
    state.orders.forEach(order => {
      const info = order.customer || {};
      const email = normalize(info.email || '');
      const phone = normalize(info.phone || '');
      const name = normalize(info.fullName || '');
      const id = email || phone || name;
      if (!id) return;
      let customer = customers.get(id);
      if (!customer) {
        customer = {
          name: info.fullName || '',
          email: info.email || '',
          phone: info.phone || '',
          address: info.address || '',
          orders: [],
          spent: 0,
          latest: 0,
        };
        customers.set(id, customer);
      }
      customer.orders.push(order);
      customer.spent += getOrderStatus(order) === 'Đã hủy' ? 0 : getOrderTotal(order);
      if (getTimestamp(order) >= customer.latest) {
        customer.latest = getTimestamp(order);
        customer.address = info.address || customer.address;
      }
    });
    return [...customers.values()].sort((a, b) => b.latest - a.latest);
  }

  function renderRevenue() {
    const period = document.getElementById('revenuePeriod').value;
    const buckets = getRevenueBuckets(period);
    if (!buckets) return;
    revenueState.period = period;
    revenueState.buckets = buckets;

    const total = buckets.reduce((sum, bucket) => sum + bucket.total, 0);
    const orderCount = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
    setText('revenueTotal', formatCurrency(total));
    setText('deliveredCount', `${orderCount} đơn hoàn tất trong kỳ`);

    const labels = {
      day: { chart: 'Doanh thu theo ngày', table: 'Chi tiết doanh thu theo ngày', column: 'Ngày' },
      month: { chart: 'Doanh thu theo tháng', table: 'Chi tiết doanh thu theo tháng', column: 'Tháng' },
      year: { chart: 'Doanh thu theo năm', table: 'Chi tiết doanh thu theo năm', column: 'Năm' },
    }[period];
    setText('revenueChartTitle', labels.chart);
    setText('revenueTableTitle', labels.table);
    setText('revenuePeriodHeader', labels.column);
    setText('revenueChartSubtitle', getRevenuePeriodDescription(period));
    renderRevenueChart();

    const container = document.getElementById('revenueTable');
    container.replaceChildren();
    const visibleBuckets = buckets.filter(bucket => bucket.total > 0 || bucket.count > 0);
    document.getElementById('revenueEmpty').hidden = visibleBuckets.length > 0;
    visibleBuckets.slice().reverse().forEach(bucket => {
      const row = document.createElement('tr');
      row.append(textCell(bucket.label), textCell(bucket.count), textCell(formatCurrency(bucket.total)));
      container.appendChild(row);
    });
  }

  function updateRevenueSearchFields() {
    const period = document.getElementById('revenuePeriod').value;
    document.getElementById('revenueMonthField').hidden = period !== 'day';
    document.getElementById('revenueYearField').hidden = period !== 'month';
    document.getElementById('revenueYearRange').hidden = period !== 'year';
    setText('revenueSearchHint', {
      day: 'Chọn tháng để xem doanh thu từng ngày trong tháng đó.',
      month: 'Chọn năm để xem doanh thu theo từng tháng.',
      year: 'Chọn khoảng năm để xem doanh thu theo từng năm.',
    }[period]);
  }

  function renderRevenueChart() {
    renderChart(document.getElementById('revenueChart'), revenueState.buckets);
  }

  function renderChart(container, buckets) {
    container.replaceChildren();
    const max = Math.max(...buckets.map(bucket => bucket.total), 1);
    buckets.forEach((bucket, index) => {
      const column = createElement('div', 'chart-column');
      const amount = createText('span', 'chart-value', compactCurrency(bucket.total));
      const barWrap = createElement('div', 'chart-bar-wrap');
      const bar = createElement('div', `chart-bar${index === buckets.length - 1 ? ' is-current' : ''}`);
      bar.style.height = `${bucket.total === 0 ? 2 : Math.max(5, (bucket.total / max) * 100)}%`;
      bar.setAttribute('title', `${bucket.label}: ${formatCurrency(bucket.total)} (${bucket.count} đơn)`);
      bar.setAttribute('aria-label', `${bucket.label}: ${formatCurrency(bucket.total)}`);
      barWrap.appendChild(bar);
      column.append(amount, barWrap, createText('span', 'chart-label', bucket.label));
      container.appendChild(column);
    });
  }

  function renderDashboardMonthlyChart() {
    const now = new Date();
    const buckets = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      buckets.push({
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: new Intl.DateTimeFormat('vi-VN', { month: 'short' }).format(date),
        total: 0,
        count: 0,
      });
    }
    getRevenueOrders().forEach(order => {
      const date = parseDate(order.createdAt || order.timestamp);
      if (!date) return;
      const bucket = buckets.find(item => item.key === `${date.getFullYear()}-${date.getMonth()}`);
      if (bucket) {
        bucket.total += getRevenueOrderTotal(order);
        bucket.count += 1;
      }
    });
    renderChart(document.getElementById('dashboardChart'), buckets);
  }

  function initializeRevenueSearch() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    document.getElementById('revenueMonth').value = currentMonth;
    document.getElementById('revenueYear').value = String(currentYear);
    document.getElementById('revenueYearFrom').value = String(currentYear - 4);
    document.getElementById('revenueYearTo').value = String(currentYear);
    updateRevenueSearchFields();
  }

  function getRevenueBuckets(period) {
    const delivered = getRevenueOrders();
    const buckets = [];

    if (period === 'day') {
      const value = document.getElementById('revenueMonth').value;
      const match = /^(\d{4})-(\d{2})$/.exec(value);
      if (!match) {
        showToast('Vui lòng chọn tháng cần tra cứu.');
        return null;
      }
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day += 1) {
        buckets.push({ key: `${year}-${month}-${day}`, label: String(day), total: 0, count: 0 });
      }
    } else if (period === 'month') {
      const year = Number(document.getElementById('revenueYear').value);
      if (!isValidRevenueYear(year)) {
        showToast('Vui lòng nhập năm hợp lệ từ 2000 đến 2100.');
        return null;
      }
      for (let month = 0; month < 12; month += 1) {
        buckets.push({
          key: `${year}-${month}`,
          label: new Intl.DateTimeFormat('vi-VN', { month: 'short' }).format(new Date(year, month, 1)),
          total: 0,
          count: 0,
        });
      }
    } else if (period === 'year') {
      const startYear = Number(document.getElementById('revenueYearFrom').value);
      const endYear = Number(document.getElementById('revenueYearTo').value);
      if (!isValidRevenueYear(startYear) || !isValidRevenueYear(endYear) || startYear > endYear) {
        showToast('Vui lòng chọn khoảng năm hợp lệ (từ năm 2000 đến 2100).');
        return null;
      }
      if (endYear - startYear > 20) {
        showToast('Khoảng tra cứu không được vượt quá 20 năm.');
        return null;
      }
      for (let year = startYear; year <= endYear; year += 1) {
        buckets.push({ key: String(year), label: String(year), total: 0, count: 0 });
      }
    } else {
      showToast('Vui lòng chọn cách thống kê doanh thu.');
      return null;
    }

    delivered.forEach(order => {
      const date = parseDate(order.createdAt || order.timestamp);
      if (!date) return;
      const key = period === 'day'
        ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
        : period === 'month'
          ? `${date.getFullYear()}-${date.getMonth()}`
          : String(date.getFullYear());
      const bucket = buckets.find(item => item.key === key);
      if (bucket) {
        bucket.total += getRevenueOrderTotal(order);
        bucket.count += 1;
      }
    });
    return buckets;
  }

  function getRevenueOrders() {
    return state.shopOrders.filter(order =>
      (order.status === 'delivered' ||
        getOrderStatus(order) === 'Đã giao hàng' ||
        order.statusText === 'Giao hàng thành công') &&
      parseDate(order.createdAt || order.timestamp)
    );
  }

  function getRevenueOrderTotal(order) {
    const value = Number(order.totalAmount ?? order.total);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  function getRevenuePeriodDescription(period) {
    if (period === 'day') {
      const value = document.getElementById('revenueMonth').value;
      const date = value ? new Date(`${value}-01T00:00:00`) : new Date();
      return new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(date);
    }
    if (period === 'month') return `Năm ${document.getElementById('revenueYear').value}`;
    return `Từ năm ${document.getElementById('revenueYearFrom').value} đến năm ${document.getElementById('revenueYearTo').value}`;
  }

  function isValidRevenueYear(year) {
    return Number.isInteger(year) && year >= 2000 && year <= 2100;
  }

  function persistArray(key, value, successMessage) {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      if (localStorage.getItem(key) !== serialized) {
        throw new Error('Dữ liệu lưu không khớp với nội dung vừa ghi.');
      }
      if (key === PRODUCTS_KEY) state.products = value;
      if (key === ORDERS_KEY) state.orders = value;
      document.getElementById('storageNotice').hidden = true;
      renderAll();
      showToast(successMessage);
      return true;
    } catch (error) {
      console.error('[Admin] Không thể lưu dữ liệu:', error);
      showToast('Không thể lưu thay đổi. Vui lòng kiểm tra bộ nhớ trình duyệt.');
      return false;
    }
  }

  function handleStorageChange(event) {
    if (event.key === 'sz_currentUser' || event.key === 'sz_user') {
      if (typeof Auth === 'undefined' || !Auth.isAdmin()) {
        window.location.replace('../account.html');
      }
      return;
    }
    if (event.key !== PRODUCTS_KEY && event.key !== ORDERS_KEY &&
      event.key !== SHOP_ORDERS_KEY && event.key !== null) return;
    loadData();
    renderAll();
  }

  function logoutAdmin() {
    Auth.setCurrentUser(null);
    window.location.replace('../account.html');
  }

  function actionButton(action, id, label, className) {
    const button = createText('button', className, label);
    button.type = 'button';
    button.dataset.action = action;
    button.dataset.id = String(id);
    return button;
  }

  function textCell(value, primary) {
    const cell = document.createElement('td');
    cell.appendChild(createText('span', primary ? 'table-primary' : '', value));
    return cell;
  }

  function statusCell(status) {
    const cell = document.createElement('td');
    const classByStatus = {
      'Chờ xác nhận': 'waiting',
      'Đã xác nhận': 'confirmed',
      'Đang chuẩn bị hàng': 'preparing',
      'Đang giao hàng': 'shipping',
      'Đã giao hàng': 'delivered',
      'Đã hủy': 'cancelled',
    };
    cell.appendChild(createText('span', `status-pill status-pill--${classByStatus[status] || 'waiting'}`, status));
    return cell;
  }

  function createElement(tag, className) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    return element;
  }

  function createText(tag, className, value) {
    const element = createElement(tag, className);
    element.textContent = String(value ?? '');
    return element;
  }

  function setText(id, value) {
    document.getElementById(id).textContent = String(value);
  }

  function getOrderStatus(order) {
    return typeof order.status === 'string' && order.status.trim()
      ? order.status.trim()
      : 'Chờ xác nhận';
  }

  function getOrderTotal(order) {
    const value = Number(order.total);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  function getProductPrice(product) {
    const value = Number(product.price);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  function getStock(product) {
    const value = Number(product.stock ?? product.quantity ?? 0);
    return Number.isInteger(value) && value >= 0 ? value : 0;
  }

  function getTimestamp(order) {
    return parseDate(order.createdAt || order.timestamp)?.getTime() || 0;
  }

  function parseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDate(value) {
    const date = parseDate(value);
    return date
      ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
      : '—';
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(Number.isFinite(value) ? value : 0);
  }

  function compactCurrency(value) {
    if (value >= 1000000) return `${(value / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`;
    if (value >= 1000) return `${Math.round(value / 1000)}k`;
    return formatCurrency(value);
  }

  function normalize(value) {
    return String(value || '').trim().toLocaleLowerCase('vi-VN');
  }

  function createId() {
    return `SZP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
  }

  function showToast(message) {
    const toast = document.getElementById('adminToast');
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 3000);
  }
})();
