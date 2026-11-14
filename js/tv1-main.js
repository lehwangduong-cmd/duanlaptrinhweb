// ===== HERO SLIDER =====
(function () {
  const slider = document.querySelector('.hero-slider');
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.slider-dot');
  if (!slider || !slides.length) return;

  const carousel = slider.closest('.hero') || slider;
  let current = 0;
  let timer;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function goTo(idx) {
    current = (idx + slides.length) % slides.length;
    slider.style.transform = `translateX(-${current * 100}%)`;
    slides.forEach((slide, i) => {
      slide.setAttribute('aria-hidden', String(i !== current));
      slide.inert = i !== current;
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === current);
      dot.setAttribute('aria-pressed', String(i === current));
    });
  }

  function stopAutoplay() {
    window.clearInterval(timer);
    timer = undefined;
  }

  function startAutoplay() {
    stopAutoplay();
    if (reducedMotion.matches || slides.length < 2 || document.hidden ||
      carousel.matches(':hover') || carousel.contains(document.activeElement)) return;
    timer = window.setInterval(() => goTo(current + 1), 5000);
  }

  document.querySelector('.slider-btn.next')?.addEventListener('click', () => {
    goTo(current + 1);
    startAutoplay();
  });
  document.querySelector('.slider-btn.prev')?.addEventListener('click', () => {
    goTo(current - 1);
    startAutoplay();
  });
  dots.forEach((dot, i) => dot.addEventListener('click', () => {
    goTo(i);
    startAutoplay();
  }));

  let touchX = 0;
  slider.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  slider.addEventListener('touchend', e => {
    const diff = touchX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      goTo(current + (diff > 0 ? 1 : -1));
      startAutoplay();
    }
  });

  carousel.addEventListener('pointerenter', stopAutoplay);
  carousel.addEventListener('pointerleave', startAutoplay);
  carousel.addEventListener('focusin', stopAutoplay);
  carousel.addEventListener('focusout', event => {
    if (!carousel.contains(event.relatedTarget)) startAutoplay();
  });
  document.addEventListener('visibilitychange', startAutoplay);
  reducedMotion.addEventListener('change', startAutoplay);

  goTo(0);
  startAutoplay();
})();

// ===== PARTNER BRAND CAROUSEL =====
(function () {
  const track = document.querySelector('.brands-track');
  if (!track) return;

  const controls = document.querySelectorAll('.brands-control[data-brands-direction]');
  const previous = document.querySelector('.brands-control[data-brands-direction="-1"]');
  const next = document.querySelector('.brands-control[data-brands-direction="1"]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function updateControls() {
    const maxScroll = track.scrollWidth - track.clientWidth;
    const canScroll = maxScroll > 1;
    controls.forEach(control => {
      control.hidden = !canScroll;
    });
    if (!canScroll) return;
    if (previous) previous.disabled = track.scrollLeft <= 1;
    if (next) next.disabled = track.scrollLeft >= maxScroll - 1;
  }

  function scroll(direction) {
    const firstLogo = track.querySelector('.brand-logo');
    const step = firstLogo
      ? (firstLogo.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || '0')) * 2
      : track.clientWidth * 0.75;
    track.scrollBy({
      left: direction * Math.max(step, track.clientWidth * 0.35),
      behavior: reducedMotion.matches ? 'instant' : 'smooth'
    });
  }

  previous?.addEventListener('click', () => scroll(-1));
  next?.addEventListener('click', () => scroll(1));
  track.addEventListener('scroll', updateControls, { passive: true });
  window.addEventListener('resize', updateControls);
  updateControls();
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
  if (!hamburger || !navMenu) return;

  function setMenuOpen(open) {
    const isMobile = window.innerWidth <= 900;
    if (open) {
      document.querySelector('.navbar-search')?.classList.remove('mobile-open');
      document.getElementById('search-toggle')?.setAttribute('aria-expanded', 'false');
    }
    hamburger.classList.toggle('active', open);
    hamburger.setAttribute('aria-expanded', String(open));
    hamburger.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
    navMenu.classList.toggle('open', open);
    navMenu.setAttribute('aria-hidden', String(isMobile && !open));
    navMenu.inert = isMobile && !open;
    overlay?.classList.remove('show');
    overlay?.classList.toggle('show', open && isMobile);
    if (overlay) overlay.setAttribute('aria-hidden', String(!open || !isMobile));
    document.body.style.overflow = open && isMobile ? 'hidden' : '';
  }

  function close() {
    setMenuOpen(false);
    navMenu.querySelectorAll('.has-dropdown.open').forEach(item => {
      item.classList.remove('open');
      item.querySelector(':scope > a')?.setAttribute('aria-expanded', 'false');
    });
  }

  hamburger?.addEventListener('click', () => {
    setMenuOpen(!navMenu.classList.contains('open'));
  });

  overlay?.addEventListener('click', close);

  document.querySelectorAll('.nav-menu .has-dropdown > a').forEach(a => {
    a.addEventListener('click', e => {
      if (window.innerWidth <= 900) {
        e.preventDefault();
        const isOpen = a.parentElement.classList.toggle('open');
        a.setAttribute('aria-expanded', String(isOpen));
      }
    });
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && navMenu.classList.contains('open')) {
      close();
      hamburger.focus();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) close();
    else setMenuOpen(navMenu.classList.contains('open'));
  });

  setMenuOpen(false);
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
  if (!searchToggle || !navSearch) return;

  function setSearchOpen(open) {
    navSearch.classList.toggle('mobile-open', open);
    searchToggle.setAttribute('aria-expanded', String(open));
  }

  searchToggle.addEventListener('click', () => {
    const open = !navSearch.classList.contains('mobile-open');
    if (open && document.getElementById('nav-menu')?.classList.contains('open')) {
      document.getElementById('hamburger')?.click();
    }
    setSearchOpen(open);
    if (open) navSearch.querySelector('input')?.focus();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && navSearch.classList.contains('mobile-open')) {
      setSearchOpen(false);
      searchToggle.focus();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) setSearchOpen(false);
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
    const productImage = imgEl?.querySelector('img');
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
      image: productImage?.currentSrc || productImage?.src || '',
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

// ===== ADD TO CART BUTTONS =====
document.querySelectorAll('.btn-add-cart').forEach(btn => {
  btn.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();

    const card = btn.closest('.product-card');
    const name = card?.querySelector('.product-name')?.textContent.trim();
    const priceText = card?.querySelector('.price-current')?.textContent || '';
    const price = Number(priceText.replace(/[^\d]/g, ''));
    if (!card || !name || !Number.isFinite(price) || price <= 0) {
      console.error('[Cart] Không thể thêm sản phẩm: thiếu tên hoặc giá hợp lệ.');
      return;
    }

    const image = card.querySelector('.product-img img');
    const productId = card.dataset.productId ||
      `featured-${[...name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')]
        .join('').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const product = {
      id: productId,
      name,
      brand: card.querySelector('.product-brand')?.textContent.trim() || 'SportZone',
      price,
      image: image?.currentSrc || image?.src || '',
      category: card.dataset.category || '',
      quantity: 1,
    };

    if (typeof Cart === 'undefined') {
      console.error('[Cart] API chưa được nạp; không thể thêm sản phẩm.');
      return;
    }
    Cart.addItem(product);
  });
});

// ===== STICKY NAVBAR SHADOW =====
window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.navbar');
  navbar?.classList.toggle('scrolled', window.scrollY > 10);
});
