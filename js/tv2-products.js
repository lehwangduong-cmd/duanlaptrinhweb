/**
 * tv2-products.js – JavaScript của TV2
 * Phụ trách: Lọc sản phẩm, tìm kiếm, phân trang,
 *            trang chi tiết sản phẩm (zoom ảnh, chọn size, màu)
 *
 * Nhúng ở cuối file HTML của TV2 (sau shared.js):
 * <script src="js/shared.js"></script>
 * <script src="js/tv2-products.js"></script>
 */

// Danh sách sản phẩm của SportZone
const PRODUCTS = [
  {id:1,name:'Giày chạy bộ JogFlow 500 nam',category:'Chạy bộ',price:899000,oldPrice:1290000,rating:4.7,reviews:128,badge:'-30%',image:'images/products-real/giay-chay-bo.jpg',icon:'fa-person-running',sizes:['39','40','41','42','43'],stock:18,description:'Giày chạy bộ nhẹ, êm ái với đế EVA hỗ trợ tốt cho các buổi tập hàng ngày trên đường trường.'},
  {id:2,name:'Bóng đá UCL Size 5',category:'Bóng đá',price:450000,oldPrice:0,rating:4.8,reviews:94,badge:'Mới',image:'images/products-real/bong-da.jpg',icon:'fa-futbol',sizes:['Size 5'],stock:25,description:'Bóng thi đấu size 5 với lớp da PU chắc chắn, độ bền cao và độ nảy ổn định.'},
  {id:3,name:'Áo chạy bộ Dry Feel nam',category:'Chạy bộ',price:249000,oldPrice:399000,rating:4.5,reviews:76,badge:'-38%',image:'images/products-real/ao-chay-bo.jpg',icon:'fa-shirt',sizes:['S','M','L','XL'],stock:30,description:'Áo thể thao co giãn nhẹ, thoáng khí và thấm hút mồ hôi nhanh trong mọi hoạt động.'},
  {id:4,name:'Bộ vợt cầu lông BR 500',category:'Cầu lông',price:329000,oldPrice:0,rating:4.4,reviews:61,image:'images/products-real/vot-cau-long.jpg',icon:'fa-table-tennis-paddle-ball',sizes:['Cặp vợt'],stock:15,description:'Bộ vợt phù hợp cho người mới bắt đầu, khung nhẹ và dễ điều khiển cú đánh.'},
  {id:5,name:'Kính bơi chống sương mù',category:'Bơi lội',price:189000,oldPrice:290000,rating:4.6,reviews:52,badge:'-35%',image:'images/products-real/kinh-boi.jpg',icon:'fa-glasses',sizes:['Free size'],stock:20,description:'Kính bơi co giãn mềm, tròng chống sương mù và khóa điều chỉnh dễ sử dụng.'},
  {id:6,name:'Bình tập yoga 8mm',category:'Gym',price:399000,oldPrice:599000,rating:4.9,reviews:113,badge:'Bán chạy',image:'images/products-real/tham-yoga.jpg',icon:'fa-person-praying',sizes:['183 x 61 cm'],stock:14,description:'Thảm yoga 8mm giúp tăng độ êm và ổn định, phù hợp cả yoga lẫn luyện sức mạnh.'},
  {id:7,name:'Tạ tay vinyl 2kg',category:'Gym',price:279000,oldPrice:320000,rating:4.3,reviews:38,badge:'-13%',image:'images/products-real/ta-tay.jpg',icon:'fa-dumbbell',sizes:['2 kg','4 kg'],stock:22,description:'Tạ tay bọc vinyl dễ vệ sinh, cầm chắc tay và phù hợp tập sức mạnh tại nhà.'},
  {id:8,name:'Giày đá bóng Viralto III',category:'Bóng đá',price:1190000,oldPrice:1690000,rating:4.8,reviews:87,badge:'-30%',image:'images/products-real/giay-da-bong.jpg',icon:'fa-futbol',sizes:['39','40','41','42','43'],stock:10,description:'Giày sân cỏ nhân tạo có độ bám tốt, thiết kế ôm chân và hỗ trợ tăng tốc.'},
  {id:9,name:'Mũ bơi silicone',category:'Bơi lội',price:99000,oldPrice:0,rating:4.2,reviews:44,image:'images/products-real/mu-boi.jpg',icon:'fa-water',sizes:['Free size'],stock:40,description:'Mũ bơi silicone mềm, bám đầu tốt và phù hợp cho cả tập luyện lẫn thi đấu.'},
  {id:10,name:'Đồng hồ thể thao GPS',category:'Chạy bộ',price:1590000,oldPrice:1990000,rating:4.7,reviews:105,badge:'-20%',image:'images/products-real/dong-ho-gps.jpg',icon:'fa-clock',sizes:['38 mm'],stock:8,description:'Đồng hồ theo dõi quãng đường, nhịp tim, pace và GPS cho mọi buổi luyện chạy.'},
  {id:11,name:'Áo đấu đội tuyển Việt Nam',category:'Bóng đá',price:399000,oldPrice:499000,rating:4.6,reviews:71,badge:'Mới',image:'images/products-real/ao-dau.jpg',icon:'fa-shirt',sizes:['S','M','L','XL','XXL'],stock:16,description:'Áo thi đấu thể thao fabric thoáng mát, sắc đỏ truyền thống và đường may chắc chắn.'},
  {id:12,name:'Balo gym 30L',category:'Gym',price:349000,oldPrice:449000,rating:4.5,reviews:49,image:'images/products-real/balo-gym.jpg',icon:'fa-bag-shopping',sizes:['30L'],stock:19,description:'Balo thể thao nhiều ngăn, quai đeo êm và ngăn riêng chống thấm cho đồ dùng tập luyện.'}
];

const formatMoney = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
const removeAccents = str => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().trim();

const params = new URLSearchParams(location.search);
const categoryMap = {
  // Nhóm danh mục chính
  'chay-bo': 'Chạy bộ',
  'bong-da': 'Bóng đá',
  'boi-loi': 'Bơi lội',
  'gym': 'Gym',
  'yoga': 'Gym',
  'cau-long': 'Cầu lông',
  'xe-dap': 'Xe đạp',
  'bong-ro': 'Bóng rổ',
  
  // Danh mục con từ navbar
  'giay-chay-bo': 'Chạy bộ',
  'ao-chay-bo': 'Chạy bộ',
  'dong-ho-the-thao': 'Chạy bộ',
  'phu-kien-chay-bo': 'Chạy bộ',
  'bong-thi-dau': 'Bóng đá',
  'giay-bong-da': 'Bóng đá',
  'ao-thi-dau': 'Bóng đá',
  'bao-ho': 'Bóng đá',
  'boi-loi': 'Bơi lội',
  'kinh-boi': 'Bơi lội',
  'do-boi': 'Bơi lội',
  'non-boi': 'Bơi lội',
  'ta-tay': 'Gym',
  'tham-yoga': 'Gym',
  'phu-kien-gym': 'Gym'
};

const categoryFromUrl = params.get('category') || (params.get('cat') ? (categoryMap[params.get('cat')] || params.get('cat')) : '');
let state = {
  query: params.get('q') || '',
  category: categoryFromUrl,
  sale: params.get('sale') === '1',
  rating: 0,
  min: 0,
  max: Infinity,
  sort: params.get('sort') || 'featured',
  page: 1
};

function productCard(product) {
  const wished = typeof Wishlist !== 'undefined' && Wishlist.has(product.id);
  const badgeClass = product.badge === 'Mới' ? 'new' : '';
  return `<article class="catalog-card">
    ${product.badge ? `<span class="product-badge ${badgeClass}">${product.badge}</span>`:''}
    <button class="wishlist-btn ${wished?'active':''}" data-wishlist="${product.id}" aria-label="Yêu thích"><i class="${wished?'fas':'far'} fa-heart"></i></button>
    <a href="product-detail.html?id=${product.id}" class="product-image-link"><div class="product-image"><img src="${product.image}" alt="${product.name}" loading="lazy"></div></a>
    <div class="catalog-card-body"><span class="catalog-card-category">${product.category}</span>
      <h3><a href="product-detail.html?id=${product.id}">${product.name}</a></h3>
      <div class="rating-row"><span>${'★'.repeat(Math.round(product.rating))}</span><span>${product.rating} (${product.reviews})</span></div>
      <div class="price-row"><strong class="current-price">${formatMoney(product.price)}</strong>${product.oldPrice?`<span class="old-price">${formatMoney(product.oldPrice)}</span>`:''}</div>
      <button class="add-cart-btn" data-cart="${product.id}"><i class="fas fa-cart-plus"></i> Thêm vào giỏ</button>
    </div>
  </article>`;
}

function initCatalog() {
  if (!document.getElementById('products-grid')) return;
  const categoryFilter = document.getElementById('category-filter');
  const availableCategories = [...new Set(PRODUCTS.map(p => p.category))];
  
  availableCategories.forEach(category => {
    categoryFilter.insertAdjacentHTML('beforeend', `<label class="filter-option"><input type="checkbox" name="category" value="${category}" ${state.category === category ? 'checked' : ''}> ${category}</label>`);
  });

  const searchInput = document.getElementById('navbar-search-input');
  if (searchInput) searchInput.value = state.query;

  const sortSelect = document.getElementById('sort-products');
  if (sortSelect && state.sort) sortSelect.value = state.sort;

  renderCatalog();

  document.querySelectorAll('[name="category"]').forEach(el => el.addEventListener('change', () => {
    state.category = '';
    state.page = 1;
    renderCatalog();
  }));

  document.querySelectorAll('[name="rating"]').forEach(el => el.addEventListener('change', () => {
    state.rating = Number(el.value);
    state.page = 1;
    renderCatalog();
  }));

  const minInput = document.getElementById('price-min');
  const maxInput = document.getElementById('price-max');
  if (minInput) {
    minInput.addEventListener('input', applyPrice);
    minInput.addEventListener('change', applyPrice);
  }
  if (maxInput) {
    maxInput.addEventListener('input', applyPrice);
    maxInput.addEventListener('change', applyPrice);
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', e => {
      state.sort = e.target.value;
      renderCatalog();
    });
  }

  const clearBtn = document.getElementById('clear-filter');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      location.href = 'products.html';
    });
  }

  const searchForm = document.getElementById('navbar-search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', e => {
      e.preventDefault();
      state.query = (document.getElementById('navbar-search-input')?.value || '').trim();
      state.page = 1;
      renderCatalog();
    });
  }

  bindCatalogActions();
  bindMobileFilter();
}

function applyPrice() {
  state.min = Number(document.getElementById('price-min')?.value) || 0;
  state.max = Number(document.getElementById('price-max')?.value) || Infinity;
  state.page = 1;
  renderCatalog();
}

function filteredProducts() {
  const qNorm = removeAccents(state.query);
  let list = PRODUCTS.filter(p => {
    const matchQuery = !qNorm || removeAccents(`${p.name} ${p.category}`).includes(qNorm);
    const matchCategory = !state.category || p.category === state.category;
    const matchSale = !state.sale || Boolean(p.oldPrice && p.oldPrice > p.price);
    const matchRating = p.rating >= state.rating;
    const matchPrice = p.price >= state.min && p.price <= state.max;
    return matchQuery && matchCategory && matchSale && matchRating && matchPrice;
  });

  const checked = [...document.querySelectorAll('[name="category"]:checked')].map(e => e.value);
  if (checked.length) {
    list = list.filter(p => checked.includes(p.category));
  }

  if (state.sort === 'newest') list.sort((a, b) => b.id - a.id);
  if (state.sort === 'price-asc') list.sort((a, b) => a.price - b.price);
  if (state.sort === 'price-desc') list.sort((a, b) => b.price - a.price);
  if (state.sort === 'rating') list.sort((a, b) => b.rating - a.rating);

  return list;
}

function renderCatalog() {
  const list = filteredProducts();
  const perPage = 9;
  const pages = Math.max(1, Math.ceil(list.length / perPage));
  state.page = Math.min(state.page, pages);
  const start = (state.page - 1) * perPage;

  const countEl = document.getElementById('product-count');
  if (countEl) countEl.textContent = `${list.length} sản phẩm`;

  const gridEl = document.getElementById('products-grid');
  if (gridEl) {
    gridEl.innerHTML = list.length
      ? list.slice(start, start + perPage).map(productCard).join('')
      : `<div class="empty-products"><i class="fas fa-box-open"></i><h3>Không tìm thấy sản phẩm</h3><p>Hãy thử từ khóa hoặc bộ lọc khác.</p></div>`;
  }

  const paginationEl = document.getElementById('pagination');
  if (paginationEl) {
    paginationEl.innerHTML = pages > 1
      ? Array.from({ length: pages }, (_, i) => `<button class="page-btn ${i + 1 === state.page ? 'active' : ''}" data-page="${i + 1}">${i + 1}</button>`).join('')
      : '';
  }

  renderTags();
  bindCatalogActions();
}

function renderTags() {
  const tags = [];
  const checked = [...document.querySelectorAll('[name="category"]:checked')].map(e => e.value);
  checked.forEach(c => tags.push({ label: c, type: 'category', value: c }));
  if (state.query) tags.push({ label: `“${state.query}”`, type: 'query' });
  if (state.sale) tags.push({ label: 'Khuyến mãi', type: 'sale' });
  if (state.rating > 0) tags.push({ label: `★ từ ${state.rating} sao`, type: 'rating' });
  if (state.min > 0 || state.max < Infinity) {
    tags.push({
      label: `Giá: ${state.min > 0 ? formatMoney(state.min) : '0đ'} - ${state.max < Infinity ? formatMoney(state.max) : '∞'}`,
      type: 'price'
    });
  }

  const tagsContainer = document.getElementById('active-filter-tags');
  if (!tagsContainer) return;

  tagsContainer.innerHTML = tags.map(t => `<span class="filter-tag">${t.label}<button data-clear-tag="${t.type}" data-value="${t.value || ''}">&times;</button></span>`).join('');

  tagsContainer.querySelectorAll('[data-clear-tag]').forEach(btn => btn.addEventListener('click', () => {
    const type = btn.dataset.clearTag;
    if (type === 'query') {
      state.query = '';
      const sInput = document.getElementById('navbar-search-input');
      if (sInput) sInput.value = '';
    }
    if (type === 'sale') state.sale = false;
    if (type === 'category') {
      const input = [...document.querySelectorAll('[name="category"]')].find(e => e.value === btn.dataset.value);
      if (input) input.checked = false;
      state.category = '';
    }
    if (type === 'rating') {
      state.rating = 0;
      const allRating = document.querySelector('[name="rating"][value="0"]');
      if (allRating) allRating.checked = true;
    }
    if (type === 'price') {
      state.min = 0;
      state.max = Infinity;
      const pMin = document.getElementById('price-min');
      const pMax = document.getElementById('price-max');
      if (pMin) pMin.value = '';
      if (pMax) pMax.value = '';
    }
    state.page = 1;
    renderCatalog();
  }));
}

function bindCatalogActions() {
  document.querySelectorAll('[data-cart]').forEach(btn => {
    btn.onclick = () => {
      const p = PRODUCTS.find(x => x.id === Number(btn.dataset.cart));
      if (p && typeof Cart !== 'undefined') {
        Cart.addItem(p);
      }
    };
  });

  document.querySelectorAll('[data-wishlist]').forEach(btn => {
    btn.onclick = () => {
      const id = Number(btn.dataset.wishlist);
      if (typeof Wishlist !== 'undefined') {
        const added = Wishlist.toggle(id);
        btn.classList.toggle('active', added);
        btn.innerHTML = `<i class="${added ? 'fas' : 'far'} fa-heart"></i>`;
      }
    };
  });

  document.querySelectorAll('[data-page]').forEach(btn => {
    btn.onclick = () => {
      state.page = Number(btn.dataset.page);
      renderCatalog();
      document.querySelector('.catalog-toolbar')?.scrollIntoView({ behavior: 'smooth' });
    };
  });
}

function bindMobileFilter() {
  const panel = document.getElementById('filter-panel');
  const overlay = document.getElementById('filter-overlay');
  if (!panel || !overlay) return;
  const open = () => {
    panel.classList.add('open');
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  };
  const close = () => {
    panel.classList.remove('open');
    overlay.classList.remove('show');
    document.body.style.overflow = '';
  };
  document.getElementById('mobile-filter-btn')?.addEventListener('click', open);
  document.getElementById('close-filter')?.addEventListener('click', close);
  overlay.addEventListener('click', close);
}

function initDetail() {
  const detail = document.getElementById('product-detail');
  if (!detail) return;
  const requestedId = Number(params.get('id'));
  const product = PRODUCTS.find(p => p.id === requestedId);
  if (!product) {
    detail.innerHTML = '<div class="empty-products"><i class="fas fa-box-open"></i><h3>Sản phẩm không tồn tại</h3><a class="add-cart-btn" style="display:inline-block;max-width:200px;margin-top:16px;text-decoration:none;" href="products.html">Quay lại danh sách</a></div>';
    return;
  }

  document.title = `${product.name} | SportZone`;
  const breadcrumb = document.getElementById('detail-breadcrumb');
  if (breadcrumb) breadcrumb.textContent = product.name;

  const wished = typeof Wishlist !== 'undefined' && Wishlist.has(product.id);
  const stock = typeof product.stock === 'number' ? product.stock : 12;

  detail.innerHTML = `<div class="detail-gallery">
    <div class="detail-image" id="detail-image" title="Bấm để phóng to ảnh">
      <img src="${product.image}" alt="${product.name}">
    </div>
  </div>
  <div class="detail-info">
    <div class="catalog-card-category">${product.category}</div>
    <h1>${product.name}</h1>
    <div class="detail-meta">
      <div class="rating-row">
        <span>${'★'.repeat(Math.round(product.rating))}</span>
        <span>${product.rating} (${product.reviews} đánh giá)</span>
      </div>
    </div>
    <div class="detail-price">
      ${formatMoney(product.price)}
      ${product.oldPrice ? `<span class="old">${formatMoney(product.oldPrice)}</span>` : ''}
    </div>
    <p class="detail-desc">${product.description}</p>
    <div class="option-group">
      <span class="option-label">Màu sắc</span>
      <div class="color-options">
        <button class="option-btn active" type="button" aria-label="Xanh">Xanh</button>
        <button class="option-btn" type="button" aria-label="Đen">Đen</button>
        <button class="option-btn" type="button" aria-label="Đỏ">Đỏ</button>
      </div>
    </div>
    <div class="option-group">
      <span class="option-label">Kích thước</span>
      <div class="size-options">
        ${product.sizes.map((s, i) => `<button class="option-btn ${i === 0 ? 'active' : ''}" type="button" data-size="${s}">${s}</button>`).join('')}
      </div>
    </div>
    <div class="detail-actions">
      <div class="quantity-selector" aria-label="Chọn số lượng">
        <button type="button" id="qty-minus" aria-label="Giảm">-</button>
        <input type="number" id="detail-qty" value="1" min="1" max="${stock}" readonly>
        <button type="button" id="qty-plus" aria-label="Tăng">+</button>
      </div>
      <button class="detail-buy" id="detail-add-cart"><i class="fas fa-cart-plus"></i> Thêm vào giỏ hàng</button>
      <button class="detail-wishlist ${wished ? 'active' : ''}" id="detail-wishlist" aria-label="Yêu thích"><i class="${wished ? 'fas' : 'far'} fa-heart"></i></button>
    </div>
    <div class="stock-note"><i class="fas fa-check-circle"></i> Còn ${stock} sản phẩm - giao hàng trong 2-4 ngày</div>
    <div class="detail-specs">
      <div><span>Thương hiệu</span><strong>SportZone</strong></div>
      <div><span>Bảo hành</span><strong>12 tháng</strong></div>
      <div><span>Đổi trả</span><strong>Trong 30 ngày</strong></div>
    </div>
  </div>`;

  // Chọn kích thước
  document.querySelectorAll('.option-btn[data-size]').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.option-btn[data-size]').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
  }));

  // Chọn màu sắc
  document.querySelectorAll('.color-options .option-btn').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.color-options .option-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
  }));

  // Tăng giảm số lượng
  const qtyInput = document.getElementById('detail-qty');
  document.getElementById('qty-minus')?.addEventListener('click', () => {
    if (qtyInput) {
      let val = parseInt(qtyInput.value, 10) || 1;
      if (val > 1) qtyInput.value = val - 1;
    }
  });
  document.getElementById('qty-plus')?.addEventListener('click', () => {
    if (qtyInput) {
      let val = parseInt(qtyInput.value, 10) || 1;
      if (val < stock) qtyInput.value = val + 1;
    }
  });

  // Phóng to ảnh
  document.getElementById('detail-image')?.addEventListener('click', e => e.currentTarget.classList.toggle('zoomed'));

  // Thêm vào giỏ hàng kèm size, màu và số lượng
  document.getElementById('detail-add-cart')?.addEventListener('click', () => {
    if (typeof Cart === 'undefined') return;
    const selectedSize = document.querySelector('.size-options .option-btn.active')?.dataset.size || product.sizes[0];
    const selectedColor = document.querySelector('.color-options .option-btn.active')?.textContent.trim() || 'Xanh';
    const qty = parseInt(qtyInput?.value || '1', 10);
    for (let i = 0; i < qty; i++) {
      Cart.addItem({ ...product, selectedSize, selectedColor });
    }
  });

  // Yêu thích
  document.getElementById('detail-wishlist')?.addEventListener('click', e => {
    if (typeof Wishlist === 'undefined') return;
    const added = Wishlist.toggle(product.id);
    e.currentTarget.classList.toggle('active', added);
    e.currentTarget.querySelector('i').className = `${added ? 'fas' : 'far'} fa-heart`;
  });

  // Sản phẩm liên quan
  const relatedContainer = document.getElementById('related-products');
  if (relatedContainer) {
    const relatedList = PRODUCTS.filter(p => p.category === product.category && p.id !== product.id)
      .concat(PRODUCTS.filter(p => p.category !== product.category && p.id !== product.id))
      .slice(0, 3);
    relatedContainer.innerHTML = relatedList.map(productCard).join('');
  }

  bindCatalogActions();
}

document.addEventListener('DOMContentLoaded', () => {
  initCatalog();
  initDetail();
});
