// ===== HERO SLIDER =====
(function () {
  const slider = document.querySelector('.hero-slider');
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.slider-dot');
  if (!slider || !slides.length) return; // Guard check nếu trang không có slider

  let current = 0;
  let timer;

  function goTo(idx) {
    current = (idx + slides.length) % slides.length;
    slider.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  function autoPlay() {
    timer = setInterval(() => goTo(current + 1), 5000);
  }

  document.querySelector('.slider-btn.next')?.addEventListener('click', () => { goTo(current + 1); clearInterval(timer); autoPlay(); });
  document.querySelector('.slider-btn.prev')?.addEventListener('click', () => { goTo(current - 1); clearInterval(timer); autoPlay(); });
  dots.forEach((d, i) => d.addEventListener('click', () => { goTo(i); clearInterval(timer); autoPlay(); }));

  // Touch swipe
  let touchX = 0;
  slider?.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  slider?.addEventListener('touchend', e => {
    const diff = touchX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) { goTo(current + (diff > 0 ? 1 : -1)); clearInterval(timer); autoPlay(); }
  });

  goTo(0);
  autoPlay();
})();

// ===== COUNTDOWN TIMER =====
(function () {
  if (!document.getElementById('cd-h')) return; // Guard check nếu trang không có đồng hồ

  const target = new Date();
  target.setHours(target.getHours() + 11);
  target.setMinutes(target.getMinutes() + 45);
  target.setSeconds(target.getSeconds() + 30);

  function update() {
    const now = new Date();
    let diff = Math.max(0, target - now);
    const h = Math.floor(diff / 3600000); diff %= 3600000;
    const m = Math.floor(diff / 60000); diff %= 60000;
    const s = Math.floor(diff / 1000);
    const pad = n => String(n).padStart(2, '0');
    const el = id => document.getElementById(id);
    if (el('cd-h')) el('cd-h').textContent = pad(h);
    if (el('cd-m')) el('cd-m').textContent = pad(m);
    if (el('cd-s')) el('cd-s').textContent = pad(s);
  }
  update();
  setInterval(update, 1000);
})();

// ===== HAMBURGER & MOBILE NAV =====
(function () {
  const hamburger = document.getElementById('hamburger');
  const navMenu = document.getElementById('nav-menu');
  const overlay = document.getElementById('nav-overlay');

  function close() {
    hamburger?.classList.remove('active');
    navMenu?.classList.remove('open');
    overlay?.classList.remove('show');
    document.body.style.overflow = '';
  }

  hamburger?.addEventListener('click', () => {
    const open = navMenu?.classList.toggle('open');
    hamburger.classList.toggle('active', open);
    overlay?.classList.toggle('show', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });

  overlay?.addEventListener('click', close);

  // Mobile dropdown toggle
  document.querySelectorAll('.nav-menu .has-dropdown > a').forEach(a => {
    a.addEventListener('click', e => {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        a.parentElement.classList.toggle('open');
      }
    });
  });

  // Close on resize
  window.addEventListener('resize', () => { if (window.innerWidth > 768) close(); });
})();

// ===== BACK TO TOP =====
(function () {
  const btn = document.getElementById('back-to-top');
  window.addEventListener('scroll', () => {
    btn?.classList.toggle('show', window.scrollY > 380);
  });
  btn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();

// ===== NAVBAR SEARCH (mobile toggle) =====
(function () {
  const searchToggle = document.getElementById('search-toggle');
  const navSearch = document.querySelector('.navbar-search');
  searchToggle?.addEventListener('click', () => {
    navSearch?.classList.toggle('mobile-open');
    if (navSearch?.classList.contains('mobile-open')) navSearch.querySelector('input')?.focus();
  });
})();

// ===== WISHLIST BUTTON TOGGLE (Kết nối API Wishlist & LocalStorage) =====
document.querySelectorAll('.btn-wishlist').forEach(btn => {
  btn.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();

    const card = this.closest('.product-card');
    const name = card?.querySelector('.product-name')?.textContent.trim() || 'Sản phẩm';
    const brand = card?.querySelector('.product-brand')?.textContent.trim() || 'SportZone';
    const price = card?.querySelector('.price-current')?.textContent.trim() || '0đ';
    const oldPrice = card?.querySelector('.price-old')?.textContent.trim() || '';
    const badge = card?.querySelector('.product-badge')?.textContent.trim() || '';
    const imgEl = card?.querySelector('.product-img');
    const iconEl = imgEl?.querySelector('i');
    const iconClass = iconEl?.className || 'fas fa-box';
    const iconColor = iconEl?.style.color || '#0082c3';
    const bgGradient = imgEl?.style.background || 'linear-gradient(135deg,#e3f2fd,#bbdefb)';

    const product = {
      id: 'PROD-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20),
      name,
      brand,
      price,
      oldPrice,
      badge,
      iconClass,
      iconColor,
      bgGradient
    };

    if (typeof Wishlist !== 'undefined') {
      const res = Wishlist.toggle(product);
      const isAdded = typeof res === "object" && res !== null ? res.added : Boolean(res);
      if (isAdded) {
        this.classList.add('active');
        this.innerHTML = '<i class="fas fa-heart"></i>';
        this.style.borderColor = '#e53935';
        this.style.color = '#e53935';
        if (typeof Auth !== 'undefined' && Auth.showToast) {
          Auth.showToast(`Đã thêm "${name}" vào danh sách yêu thích!`, 'success');
        }
      } else {
        this.classList.remove('active');
        this.innerHTML = '<i class="far fa-heart"></i>';
        this.style.borderColor = '';
        this.style.color = '';
        if (typeof Auth !== 'undefined' && Auth.showToast) {
          Auth.showToast(`Đã xóa "${name}" khỏi danh sách yêu thích!`, 'info');
        }
      }
    } else {
      this.classList.toggle('active');
      this.innerHTML = this.classList.contains('active')
        ? '<i class="fas fa-heart"></i>'
        : '<i class="far fa-heart"></i>';
    }
  });
});

// ===== STICKY NAVBAR SHADOW =====
window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.navbar');
  navbar?.classList.toggle('scrolled', window.scrollY > 10);
});

