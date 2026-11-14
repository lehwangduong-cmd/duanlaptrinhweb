/**
 * ============================================================
 * SportZone - Auth & User Management System (TV3 - Tài khoản)
 * ============================================================
 * Chức năng:
 *  1. Đăng ký & Đăng nhập (Validation, mã hóa lưu trữ localStorage)
 *  2. Đăng xuất & Quản lý phiên làm việc (Session Management)
 *  3. Hồ sơ khách hàng (Cập nhật thông tin, Sổ địa chỉ, Lịch sử đơn hàng, Đổi mật khẩu)
 *  4. Phân quyền Admin và User (Role-Based Access Control - RBAC)
 * ============================================================
 */

// Safe fallback for Node.js
if (typeof localStorage === 'undefined') {
  var _memStore = {};
  var localStorage = {
    getItem: function (k) { return _memStore[k] || null; },
    setItem: function (k, v) { _memStore[k] = String(v); },
    removeItem: function (k) { delete _memStore[k]; },
    clear: function () { _memStore = {}; }
  };
  if (typeof global !== 'undefined') global.localStorage = localStorage;
}

var Auth = (function () {
  // ============================================================
  // CẤU HÌNH TÀI KHOẢN QUẢN TRỊ VIÊN (ADMIN) RIÊNG CỦA BẠN
  // ============================================================
  const ADMIN_EMAILS = [
    'nhomanhdangcapso1vn@gmail.com',
    'admin@sportzone.vn'
  ];

  const ADMIN_CONFIG = {
    fullName: 'Quản Trị Viên SportZone',
    email: 'admin@sportzone.vn',
    phone: '0901234567',
    password: 'admin123',
    secretKey: 'SPORTZONE@ADMIN'
  };

  const BLACKLIST_EMAILS = [
    'cocanhkhong@gmail.com',
    'minhgialapnhua2k7@gmail.com',
    'user@sportzone.vn',
    'nam.le@gmail.com'
  ];
  const BLACKLIST_IDS = [
    'USR-000',
    'USR-163541',
    'USR-189805',
    'USR-423996',
    'USR-002',
    'USR-003'
  ];

  function cleanupBlacklist() {
    try {
      let deletedList = [];
      try {
        deletedList = JSON.parse(localStorage.getItem('sz_deleted_users') || '[]');
      } catch (e) {}

      let updated = false;
      BLACKLIST_EMAILS.forEach(em => {
        if (!deletedList.includes(em.toLowerCase())) {
          deletedList.push(em.toLowerCase());
          updated = true;
        }
      });
      BLACKLIST_IDS.forEach(id => {
        if (!deletedList.includes(id)) {
          deletedList.push(id);
          updated = true;
        }
      });
      if (updated || !localStorage.getItem('sz_deleted_users')) {
        localStorage.setItem('sz_deleted_users', JSON.stringify(deletedList));
      }

      // Xóa khỏi sz_users trong localStorage
      let rawUsers = [];
      try {
        rawUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];
      } catch (e) {}

      if (Array.isArray(rawUsers) && rawUsers.length > 0) {
        const cleaned = rawUsers.filter(u => {
          if (!u) return false;
          const em = (u.email || '').toLowerCase().trim();
          const id = u.id || '';
          return !BLACKLIST_EMAILS.includes(em) && !BLACKLIST_IDS.includes(id);
        });
        if (cleaned.length !== rawUsers.length) {
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(cleaned));
        }
      }

      // Nếu tài khoản hiện tại nằm trong danh sách này thì xóa phiên
      const cur = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null');
      if (cur) {
        const curEmail = (cur.email || '').toLowerCase().trim();
        const curId = cur.id || '';
        if (BLACKLIST_EMAILS.includes(curEmail) || BLACKLIST_IDS.includes(curId)) {
          localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
          try { localStorage.removeItem('sz_user'); } catch (e) {}
        }
      }

      // Xóa triệt để khỏi Cloud Firestore nếu có kết nối
      BLACKLIST_IDS.forEach(id => {
        try { deleteUserFromCloud(id); } catch (e) {}
      });
    } catch (e) {}
  }

  
  // ============================================================
  // CẤU HÌNH & TRẠNG THÁI CLOUD REALTIME SYNC (FIREBASE FIRESTORE)
  // ============================================================
  let _cloudDb = null;
  let _isCloudReady = false;
  let _cloudUnsubscribe = null;
  const STORAGE_KEYS = {
    USERS: 'sz_users',
    CURRENT_USER: 'sz_currentUser',
    ORDERS: 'sz_orders'
  };

  // Mẫu dữ liệu khởi tạo (Seed Data)
  const DEFAULT_USERS = [
    {
      id: 'USR-001',
      fullName: 'Minh Dương Anh Diện Phong',
      email: 'nhomanhdangcapso1vn@gmail.com',
      phone: '0912345678',
      password: 'admin123',
      role: 'admin', // 'admin' | 'user'
      status: 'active', // 'active' | 'locked'
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      gender: 'male',
      birthday: '1995-05-15',
      membership: 'Quản trị viên cấp cao',
      joinedDate: '2024-01-10',
      addresses: [
        {
          id: 'ADDR-1',
          recipientName: 'Minh Dương Anh Diện Phong',
          phone: '0912345678',
          city: 'Hồ Chí Minh',
          district: 'Quận 1',
          ward: 'Phường Bến Nghé',
          addressDetail: '123 Nguyễn Huệ',
          isDefault: true
        }
      ]
    }
  ];

  // Mẫu đơn hàng giả lập liên kết với người dùng
  const DEFAULT_ORDERS = [
    {
      id: 'SZ-9824',
      userId: 'USR-001',
      createdAt: '2025-05-18 14:30',
      status: 'shipping', // 'pending' | 'shipping' | 'delivered' | 'cancelled'
      statusText: 'Đang vận chuyển',
      paymentMethod: 'Thanh toán khi nhận hàng (COD)',
      shippingAddress: '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
      recipientName: 'Minh Dương Anh Diện Phong',
      recipientPhone: '0901234567',
      items: [
        {
          id: 1,
          name: 'Giày Chạy Bộ Nam Nike Air Zoom Pegasus 40',
          image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=120',
          price: 2450000,
          quantity: 1,
          variant: 'Size 42 - Xanh/Đen'
        },
        {
          id: 2,
          name: 'Áo Thun Thể Thao Thoáng Khí Dri-FIT Pro',
          image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=120',
          price: 320000,
          quantity: 1,
          variant: 'Size L - Đen'
        }
      ],
      shippingFee: 30000,
      discount: 50000,
      totalAmount: 2750000
    },
    {
      id: 'SZ-9150',
      userId: 'USR-001',
      createdAt: '2025-04-10 09:15',
      status: 'delivered',
      statusText: 'Giao hàng thành công',
      paymentMethod: 'Ví MoMo',
      shippingAddress: '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
      recipientName: 'Minh Dương Anh Diện Phong',
      recipientPhone: '0901234567',
      items: [
        {
          id: 3,
          name: 'Bình Nước Thể Thao Giữ Nhiệt 1000ml Decathlon',
          image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=120',
          price: 290000,
          quantity: 1,
          variant: 'Màu Xanh Dương'
        },
        {
          id: 4,
          name: 'Băng Cuốn Bảo Vệ Khớp Gối Đa Năng Yonex',
          image: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=120',
          price: 200000,
          quantity: 1,
          variant: 'Size Tiêu chuẩn'
        }
      ],
      shippingFee: 0,
      discount: 0,
      totalAmount: 490000
    },
    {
      id: 'SZ-8830',
      userId: 'USR-001',
      createdAt: '2025-03-22 16:45',
      status: 'delivered',
      statusText: 'Giao hàng thành công',
      paymentMethod: 'Chuyển khoản QR VNPay',
      shippingAddress: '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
      recipientName: 'Minh Dương Anh Diện Phong',
      recipientPhone: '0901234567',
      items: [
        {
          id: 5,
          name: 'Kính Bơi Chống Mờ & Tia UV Chuyên Nghiệp Speedo',
          image: 'https://images.unsplash.com/photo-1576243345690-4e4b79b63288?w=120',
          price: 380000,
          quantity: 1,
          variant: 'Gọng Đen Mắt Khói'
        }
      ],
      shippingFee: 0,
      discount: 0,
      totalAmount: 380000
    },
    {
      id: 'SZ-7542',
      userId: 'USR-001',
      createdAt: '2025-02-05 11:00',
      status: 'cancelled',
      statusText: 'Đang hủy đơn',
      paymentMethod: 'COD',
      shippingAddress: '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
      recipientName: 'Minh Dương Anh Diện Phong',
      recipientPhone: '0901234567',
      items: [
        {
          id: 6,
          name: 'Thảm Tập Yoga TPE Định Tuyến 8mm Chống Trượt',
          image: 'https://images.unsplash.com/photo-1592432678016-e910b452f9a2?w=120',
          price: 350000,
          quantity: 1,
          variant: 'Xanh Lá Tươi'
        }
      ],
      shippingFee: 30000,
      discount: 30000,
      totalAmount: 350000
    },
    {
      id: 'SZ-6102',
      userId: 'USR-001',
      createdAt: '2025-05-12 18:20',
      status: 'pending',
      statusText: 'Chờ xác nhận',
      paymentMethod: 'COD',
      shippingAddress: '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
      recipientName: 'Minh Dương Anh Diện Phong',
      recipientPhone: '0901234567',
      items: [
        {
          id: 7,
          name: 'Quả Bóng Đá Tiêu Chuẩn FIFA Size 5 Molten',
          image: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=120',
          price: 850000,
          quantity: 1,
          variant: 'Size 5 Chuẩn thi đấu'
        }
      ],
      shippingFee: 0,
      discount: 50000,
      totalAmount: 800000
    }
  ];

  // Khởi tạo dữ liệu ban đầu
  
  // ============================================================
  // CÁC HÀM XỬ LÝ ĐỒNG BỘ CLOUD FIRESTORE REALTIME
  // ============================================================

  // Khởi tạo kết nối Firebase Firestore Realtime
  function initCloudSync() {
    if (_isCloudReady) return;
    try {
      if (typeof firebase === 'undefined') {
        return;
      }
      const fbConfig = (typeof window !== 'undefined' && window.SportZoneFirebase && typeof window.SportZoneFirebase.getConfig === 'function')
        ? window.SportZoneFirebase.getConfig()
        : (typeof window !== 'undefined' ? window.FIREBASE_CONFIG : null);

      if (!fbConfig || !fbConfig.projectId || !fbConfig.apiKey || fbConfig.apiKey.includes('YOUR_')) {
        return;
      }

      if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(fbConfig);
      }
      _cloudDb = firebase.firestore();
      _isCloudReady = true;
      console.log('[SportZone Cloud] Đã kích hoạt Firebase Firestore Realtime Sync!');

      setupCloudUsersListener();
    } catch (err) {
      console.warn('[SportZone Cloud] Lỗi khởi tạo Firebase Firestore:', err);
    }
  }

  // Lắng nghe thay đổi Realtime từ Firestore collection 'sz_users'
  function setupCloudUsersListener() {
    if (!_cloudDb) return;
    if (_cloudUnsubscribe) {
      _cloudUnsubscribe();
    }

    let isInitialSnapshot = true;
    _cloudUnsubscribe = _cloudDb.collection('sz_users').onSnapshot(
      snapshot => {
        if (snapshot.empty && isInitialSnapshot) {
          console.log('[SportZone Cloud] Firestore chưa có dữ liệu. Đang tải tài khoản khởi tạo lên Cloud...');
          isInitialSnapshot = false;
          seedCloudUsers();
          return;
        }
        isInitialSnapshot = false;

        const cloudUsers = [];
        let deletedList = [];
        try {
          deletedList = JSON.parse(localStorage.getItem('sz_deleted_users') || '[]');
        } catch (e) {}

        snapshot.forEach(doc => {
          const data = doc.data();
          if (data && data.id) {
            // Không nhận lại tài khoản đã được Admin bấm xóa
            const isDeleted = deletedList.includes(data.id) || (data.email && deletedList.includes(data.email.toLowerCase()));
            if (!isDeleted) {
              cloudUsers.push(data);
            }
          }
        });

        if (cloudUsers.length > 0) {
          // Hợp nhất Cloud users với Local users & DEFAULT_USERS để không làm mất tài khoản cục bộ
          let localUsers = [];
          try {
            localUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];
          } catch (e) {}

          const mergedMap = new Map();
          DEFAULT_USERS.forEach(u => {
            if (!deletedList.includes(u.id) && !deletedList.includes((u.email || '').toLowerCase())) {
              mergedMap.set(u.id, u);
            }
          });
          localUsers.forEach(u => {
            if (u && u.id && !deletedList.includes(u.id) && !deletedList.includes((u.email || '').toLowerCase())) {
              mergedMap.set(u.id, u);
            }
          });
          cloudUsers.forEach(u => {
            if (u && u.id && !deletedList.includes(u.id) && !deletedList.includes((u.email || '').toLowerCase())) {
              mergedMap.set(u.id, u);
            }
          });

          const finalUsers = Array.from(mergedMap.values());
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(finalUsers));

          // Đồng bộ phiên người dùng hiện tại nếu có cập nhật quyền/avatar từ Cloud
          const cur = getCurrentUser();
          if (cur) {
            const freshCur = finalUsers.find(
              u => u.id === cur.id || (u.email && cur.email && u.email.toLowerCase() === cur.email.toLowerCase())
            );
            if (freshCur) {
              localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(freshCur));
              try { localStorage.setItem('sz_current_user', JSON.stringify(freshCur)); } catch (e) {}
            }
          }

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('sz:cloud-sync', { detail: { users: finalUsers } }));
            window.dispatchEvent(new Event('storage'));
          }
        }
      },
      err => {
        console.warn('[SportZone Cloud] Lỗi lắng nghe Firestore Snapshot:', err);
      }
    );
  }

  // Tải danh sách tài khoản mẫu lên Cloud khi Firestore mới tinh
  function seedCloudUsers() {
    if (!_cloudDb) return;
    const currentUsers = getUsers();
    const batch = _cloudDb.batch();
    currentUsers.forEach(u => {
      if (u && u.id) {
        const ref = _cloudDb.collection('sz_users').doc(u.id);
        batch.set(ref, u, { merge: true });
      }
    });
    batch.commit()
      .then(() => console.log('[SportZone Cloud] Đã khởi tạo ' + currentUsers.length + ' tài khoản lên Cloud Firestore thành công!'))
      .catch(err => console.warn('[SportZone Cloud] Lỗi tải dữ liệu mẫu lên Cloud:', err));
  }

  // Đồng bộ một tài khoản người dùng lên Cloud Firestore
  function syncUserToCloud(user) {
    if (!_cloudDb || !user || !user.id) return;
    try {
      const cleanData = JSON.parse(JSON.stringify(user));
      _cloudDb.collection('sz_users').doc(user.id).set(cleanData, { merge: true })
        .then(() => console.log('[SportZone Cloud] Đã đồng bộ tài khoản ' + (user.email || user.id) + ' lên Cloud.'))
        .catch(err => console.warn('[SportZone Cloud] Lỗi đồng bộ tài khoản lên Cloud:', err));
    } catch (e) {
      console.warn('[SportZone Cloud] Lỗi chuẩn bị dữ liệu user đồng bộ:', e);
    }
  }

  // Xóa tài khoản người dùng trên Cloud Firestore
  function deleteUserFromCloud(userId) {
    if (!_cloudDb || !userId) return;
    try {
      _cloudDb.collection('sz_users').doc(userId).delete()
        .then(() => console.log('[SportZone Cloud] Đã xóa tài khoản ' + userId + ' trên Cloud.'))
        .catch(err => console.warn('[SportZone Cloud] Lỗi xóa tài khoản trên Cloud:', err));
    } catch (e) {
      console.warn('[SportZone Cloud] Lỗi gửi yêu cầu xóa tài khoản:', e);
    }
  }

  function isCloudSyncActive() {
    return _isCloudReady;
  }

  function init() {
    // Tự động dọn dẹp các tài khoản rác/tài khoản đã bị yêu cầu xóa
    cleanupBlacklist();

    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    }
    // Tự động đồng bộ cấu hình Admin riêng nếu người dùng thay đổi ADMIN_CONFIG
    syncAdminConfig();

    initCloudSync();

    if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(DEFAULT_ORDERS));
    }
  }

  // Đồng bộ thông tin Admin từ ADMIN_CONFIG và ADMIN_EMAILS vào localStorage
  function syncAdminConfig() {
    try {
      let users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];
      if (!Array.isArray(users) || users.length === 0) {
        return;
      }

      let deletedList = [];
      try {
        deletedList = JSON.parse(localStorage.getItem('sz_deleted_users') || '[]');
      } catch (e) {}

      // Lọc bỏ triệt để mọi tài khoản đã bị xóa bởi Quản trị viên
      users = users.filter(x => !deletedList.includes(x.id) && !deletedList.includes((x.email || '').toLowerCase().trim()));

      ADMIN_EMAILS.forEach(adminEmail => {
        if (deletedList.includes(adminEmail.toLowerCase())) return;
        let u = users.find(x => (x.email || '').toLowerCase() === adminEmail.toLowerCase());
        if (u && !u.role) {
          u.role = 'admin';
        }
      });

      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

      const cur = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER));
      if (cur && ADMIN_EMAILS.some(e => e.toLowerCase() === (cur.email || '').toLowerCase())) {
        cur.role = 'admin';
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(cur));
      }
    } catch (e) {}
  }

  // Lấy mã kích hoạt Admin bí mật
  function getAdminSecretKey() {
    return ADMIN_CONFIG.secretKey || 'SPORTZONE@ADMIN';
  }

  // Thiết lập tài khoản Admin riêng trực tiếp từ JS
  function setCustomAdmin(adminData) {
    init();
    const users = getUsers();
    const fullName = (adminData.fullName || 'Quản Trị Viên').trim();
    const email = (adminData.email || 'admin@sportzone.vn').trim().toLowerCase();
    const phone = (adminData.phone || '0901234567').trim();
    const password = (adminData.password || 'admin123').trim();

    let admin = users.find(u => u.role === 'admin');
    if (admin) {
      admin.fullName = fullName;
      admin.email = email;
      admin.phone = phone;
      admin.password = password;
      admin.status = 'active';
    } else {
      admin = {
        id: 'ADM-' + Date.now().toString().slice(-4),
        fullName: fullName,
        email: email,
        phone: phone,
        password: password,
        role: 'admin',
        status: 'active',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        gender: 'male',
        birthday: '1995-01-01',
        membership: 'Quản trị viên',
        joinedDate: new Date().toISOString().slice(0, 10),
        addresses: []
      };
      users.unshift(admin);
    }
    saveUsers(users);

    const cur = getCurrentUser();
    if (cur && cur.role === 'admin') {
      setCurrentUser(admin);
    }
    return { success: true, message: `Đã thiết lập tài khoản Admin: ${email}`, admin };
  }

  // Lấy danh sách users
  function getUsers() {
    init();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];
    } catch (e) {
      return [];
    }
  }

  // Lưu danh sách users
  function saveUsers(users) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  // Lấy người dùng đang đăng nhập
  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER)
               || localStorage.getItem('sz_current_user')
               || localStorage.getItem('sz_user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  // Lưu người dùng đang đăng nhập
  function setCurrentUser(user) {
    if (!user) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      try { localStorage.removeItem('sz_current_user'); } catch (e) {}
      try { localStorage.removeItem('sz_user'); } catch (e) {}
    } else {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      try { localStorage.setItem('sz_current_user', JSON.stringify(user)); } catch (e) {}
      try { localStorage.setItem('sz_user', JSON.stringify(user)); } catch (e) {}
    }
    // Cập nhật lại thanh navbar trên trang hiện tại
    renderNavbarAuth();
  }

  // Tìm vị trí người dùng hiện tại trong mảng users một cách tuyệt đối an toàn
  function findCurrentUserIndex(users, cur) {
    if (!cur) return -1;
    // 1. Tìm theo ID
    if (cur.id) {
      const idx = users.findIndex(u => u && u.id === cur.id);
      if (idx !== -1) return idx;
    }
    // 2. Tìm theo Email
    if (cur.email) {
      const cleanEmail = cur.email.toLowerCase().trim();
      const idx = users.findIndex(u => u && (u.email || '').toLowerCase().trim() === cleanEmail);
      if (idx !== -1) {
        if (cur.id && users[idx]) users[idx].id = cur.id;
        return idx;
      }
    }
    // 3. Tìm theo SĐT
    if (cur.phone) {
      const cleanPhone = cur.phone.replace(/\s/g, '');
      const idx = users.findIndex(u => u && (u.phone || '').replace(/\s/g, '') === cleanPhone);
      if (idx !== -1) return idx;
    }
    // 4. Nếu chưa có trong users (do Cloud sync làm mất hoặc phiên cục bộ mới tạo),
    // tự động khôi phục user vào mảng users để không bao giờ bị lỗi 'Không tìm thấy tài khoản!'
    users.push(cur);
    saveUsers(users);
    syncUserToCloud(cur);
    return users.length - 1;
  }

  // Kiểm tra đã đăng nhập chưa
  function isLoggedIn() {
    return !!getCurrentUser();
  }

  // Kiểm tra quyền Admin
  function isAdmin() {
    const user = getCurrentUser();
    return !!(user && user.role === 'admin');
  }

  /**
   * ĐĂNG NHẬP NHANH VỚI GOOGLE (Google 1-Click Sign In)
   * @param {string} email - Địa chỉ email Google
   * @returns {Object} { success: boolean, message: string, user: Object }
   */
  function loginWithGoogle(email, customName, customAvatar) {
    init();
    const targetEmail = (email || 'admin@sportzone.vn').trim().toLowerCase();
    const users = getUsers();
    let user = users.find(u => u.email.toLowerCase() === targetEmail);

    const KNOWN_MAP = {
      'admin@sportzone.vn': { fullName: 'Quản Trị Viên SportZone', role: 'admin' },
      'nhomanhdangcapso1vn@gmail.com': { fullName: 'Minh Dương Anh Diện Phong', role: 'admin' },
      'khachhang.sportzone@gmail.com': { fullName: 'Khách Hàng SportZone', role: 'user' }
    };

    const isPreset = KNOWN_MAP[targetEmail];
    const isAdminEmail = (isPreset && isPreset.role === 'admin') || ADMIN_EMAILS.some(e => e.toLowerCase() === targetEmail);

    if (!user) {
      const defaultName = customName || (isPreset ? isPreset.fullName : targetEmail.split('@')[0]);
      user = {
        id: 'USR-' + (isAdminEmail ? 'ADM' : 'GGL') + String(Date.now()).slice(-4),
        fullName: defaultName,
        email: targetEmail,
        phone: '0912345678',
        password: 'google_oauth_pass',
        role: isAdminEmail ? 'admin' : 'user',
        status: 'active',
        avatar: customAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        gender: 'male',
        birthday: '1995-05-15',
        membership: isAdminEmail ? 'Quản trị viên cấp cao' : 'Thành viên Google',
        joinedDate: new Date().toISOString().slice(0, 10),
        addresses: []
      };
      users.unshift(user);
      saveUsers(users);
      syncUserToCloud(user);
    } else {
      if (isPreset) {
        user.fullName = isPreset.fullName;
        user.role = isPreset.role;
        user.membership = isPreset.role === 'admin' ? 'Quản trị viên cấp cao' : (user.membership || 'Thành viên Google');
        saveUsers(users);
      } else if (isAdminEmail) {
        user.role = 'admin';
        user.membership = 'Quản trị viên cấp cao';
        saveUsers(users);
      }
    }

    if (user.status === 'locked') {
      return {
        success: false,
        message: 'Tài khoản Google này đã bị khóa bởi Quản trị viên!'
      };
    }

    setCurrentUser(user);
    return {
      success: true,
      message: `Đăng nhập Google thành công! Xin chào ${user.fullName} (${user.role === 'admin' ? '👑 Admin' : 'Khách hàng'}).`,
      user: user
    };
  }

  /**
   * ĐĂNG NHẬP
   * @param {string} identity - Email hoặc Số điện thoại
   * @param {string} password - Mật khẩu
   * @returns {Object} { success: boolean, message: string, user?: Object }
   */
  
  /**
   * ĐĂNG NHẬP BẰNG GOOGLE CREDENTIAL (Từ Google Identity Services chính thức)
   * @param {Object} data { googleId, email, fullName, avatar, emailVerified, idToken }
   */
  function loginWithGoogleCredential(data) {
    init();
    if (!data) return { success: false, message: 'Dữ liệu đăng nhập Google rỗng!' };

    const googleId = data.googleId || '';
    const cleanEmail = (data.email || '').trim().toLowerCase();
    const fullName = (data.fullName || cleanEmail.split('@')[0] || 'Người dùng Google').trim();
    const avatar = data.avatar || '';
    const idToken = data.idToken || '';

    if (!cleanEmail) {
      return { success: false, message: 'Email Google không hợp lệ!' };
    }

    const users = getUsers();
    let user = users.find(u => u.email.toLowerCase() === cleanEmail);

    const isAdminEmail = ADMIN_EMAILS.some(e => e.toLowerCase() === cleanEmail);

    if (!user) {
      user = {
        id: 'USR-GGL-' + (googleId ? googleId.slice(-6) : String(Date.now()).slice(-6)),
        googleId: googleId,
        fullName: fullName,
        email: cleanEmail,
        phone: '',
        password: 'google_oauth_pass',
        role: isAdminEmail ? 'admin' : 'user',
        status: 'active',
        avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        gender: 'other',
        birthday: '',
        membership: isAdminEmail ? 'Quản trị viên cấp cao' : 'Thành viên Google',
        joinedDate: new Date().toISOString().slice(0, 10),
        addresses: [],
        loginMethod: 'google'
      };
      users.unshift(user);
    } else {
      if (googleId) user.googleId = googleId;
      if (avatar) user.avatar = avatar;
      if (fullName && (!user.fullName || user.fullName === cleanEmail)) user.fullName = fullName;
      user.loginMethod = 'google';
      if (isAdminEmail) user.role = 'admin';
    }

    if (user.status === 'locked') {
      return {
        success: false,
        message: 'Tài khoản Google này đã bị khóa bởi Quản trị viên!'
      };
    }

    saveUsers(users);
    syncUserToCloud(user);
    setCurrentUser(user);

    try {
      if (idToken) localStorage.setItem('sz_google_id_token', idToken);
    } catch (e) {}

    return {
      success: true,
      message: `Đăng nhập Google thành công! Xin chào ${user.fullName} (${user.role === 'admin' ? '👑 Admin' : 'Khách hàng'}).`,
      user: user
    };
  }

  function login(identity, password) {
    init();
    const cleanId = (identity || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (!cleanId || !cleanPass) {
      return { success: false, message: 'Vui lòng nhập đầy đủ Email/SĐT và Mật khẩu!' };
    }

    const users = getUsers();
    const user = users.find(
      u => (u.email.toLowerCase() === cleanId || u.phone === cleanId) && u.password === cleanPass
    );

    if (!user) {
      return {
        success: false,
        message: 'Email, Số điện thoại hoặc Mật khẩu không chính xác. Vui lòng thử lại!'
      };
    }

    if (user.status === 'locked') {
      return {
        success: false,
        message: 'Tài khoản của bạn đã bị tạm khóa bởi Quản trị viên. Vui lòng liên hệ hỗ trợ (1800 9999)!'
      };
    }

    setCurrentUser(user);
    return {
      success: true,
      message: `Đăng nhập thành công! Chào mừng ${user.fullName}.`,
      user: user
    };
  }

  /**
   * ĐĂNG KÝ
   * @param {Object} data { fullName, email, phone, password, role }
   * @returns {Object} { success: boolean, message: string, user?: Object }
   */
  function register(data) {
    init();
    const fullName = (data.fullName || '').trim();
    const email = (data.email || '').trim().toLowerCase();
    const phone = (data.phone || '').trim();
    const password = (data.password || '').trim();
    const role = data.role === 'admin' ? 'admin' : 'user';

    // Validation cơ bản
    if (!fullName) return { success: false, message: 'Họ và tên không được để trống!' };
    if (!email) return { success: false, message: 'Email không được để trống!' };
    
    // Regex email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, message: 'Địa chỉ Email không đúng định dạng!' };
    }

    // Regex SĐT Việt Nam (10 số, bắt đầu bằng 0)
    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return { success: false, message: 'Số điện thoại không hợp lệ (cần 10 chữ số bắt đầu bằng 0)!' };
    }

    if (password.length < 6) {
      return { success: false, message: 'Mật khẩu phải có độ dài tối thiểu 6 ký tự!' };
    }

    const users = getUsers();

    // Kiểm tra trùng lặp email hoặc SĐT
    if (users.some(u => u.email.toLowerCase() === email)) {
      return { success: false, message: 'Địa chỉ Email này đã được đăng ký trong hệ thống!' };
    }
    if (users.some(u => u.phone === phone)) {
      return { success: false, message: 'Số điện thoại này đã được sử dụng cho tài khoản khác!' };
    }

    const newUser = {
      id: 'USR-' + String(Date.now()).slice(-6),
      fullName: fullName,
      email: email,
      phone: phone,
      password: password,
      role: role,
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      gender: 'other',
      birthday: '',
      membership: role === 'admin' ? 'Quản trị viên' : 'Thành viên mới',
      joinedDate: new Date().toISOString().slice(0, 10),
      addresses: []
    };

    users.push(newUser);
    saveUsers(users);
    syncUserToCloud(newUser);

    // Tự động đăng nhập luôn sau khi đăng ký
    setCurrentUser(newUser);

    return {
      success: true,
      message: 'Đăng ký tài khoản thành công! Bạn đã được tự động đăng nhập.',
      user: newUser
    };
  }

  /**
   * ĐĂNG XUẤT
   */
  function logout() {
    setCurrentUser(null);
    showToast('Bạn đã đăng xuất khỏi hệ thống thành công.', 'info');
    // Nếu đang ở trang admin hoặc trang account, load lại trang
    setTimeout(() => {
      if (typeof window === 'undefined') return;
      if (window.location.pathname.includes('admin.html')) {
        window.location.href = 'index.html';
      } else {
        window.location.reload();
      }
    }, 600);
  }

  /**
   * ĐĂNG NHẬP NHANH DEMO (Cho Thầy cô / Giảng viên kiểm thử tiện lợi)
   */
  function quickLogin(role) {
    init();
    const users = getUsers();
    const target = users.find(u => u.role === role && u.status === 'active');
    if (target) {
      setCurrentUser(target);
      showToast(`Đã đăng nhập nhanh với quyền ${role === 'admin' ? '👑 Admin' : '👤 Khách hàng'}!`, 'success');
      setTimeout(() => {
        if (role === 'admin' && !window.location.pathname.includes('admin.html')) {
          // Gợi ý chuyển hướng đến trang Admin
          window.location.href = 'admin.html';
        } else {
          window.location.reload();
        }
      }, 500);
      return true;
    }
    showToast('Không tìm thấy tài khoản demo phù hợp.', 'error');
    return false;
  }

  /**
   * CẬP NHẬT HỒ SƠ NGƯỜI DÙNG
   */
  function updateProfile(updatedData) {
    const cur = getCurrentUser();
    if (!cur) return { success: false, message: 'Bạn chưa đăng nhập!' };

    const users = getUsers();
    const idx = findCurrentUserIndex(users, cur);
    if (idx === -1) return { success: false, message: 'Không tìm thấy thông tin tài khoản!' };

    // Cập nhật các trường cho phép
    if (updatedData.fullName) users[idx].fullName = updatedData.fullName.trim();
    if (updatedData.phone) {
      const cleanPhone = updatedData.phone.trim();
      const phoneRegex = /^0\d{9}$/;
      if (!phoneRegex.test(cleanPhone)) {
        return { success: false, message: 'Số điện thoại không hợp lệ (10 số, bắt đầu số 0)!' };
      }
      // Chỉ kiểm tra trùng SĐT nếu người dùng thay đổi số điện thoại mới
      const currentPhone = (users[idx].phone || '').trim();
      if (cleanPhone !== currentPhone) {
        const exists = users.some(u => (u.phone || '').trim() === cleanPhone && u.id !== cur.id);
        if (exists) {
          return { success: false, message: 'Số điện thoại này đã thuộc về người dùng khác!' };
        }
      }
      users[idx].phone = cleanPhone;
    }
    if (updatedData.gender) users[idx].gender = updatedData.gender;
    if (updatedData.birthday) users[idx].birthday = updatedData.birthday;
    if (updatedData.avatar) users[idx].avatar = updatedData.avatar;

    saveUsers(users);
    setCurrentUser(users[idx]);
    syncUserToCloud(users[idx]);

    return {
      success: true,
      message: 'Cập nhật thông tin hồ sơ cá nhân thành công!',
      user: users[idx]
    };
  }

  /**
   * ĐỔI MẬT KHẨU
   */
  function changePassword(oldPassword, newPassword) {
    const cur = getCurrentUser();
    if (!cur) return { success: false, message: 'Bạn chưa đăng nhập!' };

    if (!oldPassword || !newPassword) {
      return { success: false, message: 'Vui lòng nhập đầy đủ mật khẩu cũ và mới!' };
    }

    if (cur.password !== oldPassword) {
      return { success: false, message: 'Mật khẩu hiện tại không chính xác!' };
    }

    if (newPassword.length < 6) {
      return { success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự!' };
    }

    if (oldPassword === newPassword) {
      return { success: false, message: 'Mật khẩu mới không được trùng với mật khẩu cũ!' };
    }

    const users = getUsers();
    const idx = findCurrentUserIndex(users, cur);
    if (idx !== -1) {
      users[idx].password = newPassword;
      saveUsers(users);
      setCurrentUser(users[idx]);
      syncUserToCloud(users[idx]);
      return { success: true, message: 'Đổi mật khẩu thành công! Hãy ghi nhớ mật khẩu mới của bạn.' };
    }

    return { success: false, message: 'Có lỗi xảy ra khi lưu mật khẩu mới!' };
  }

  /**
   * SỔ ĐỊA CHỈ: THÊM / XÓA / ĐẶT MẶC ĐỊNH
   */
  function addAddress(addressData) {
    const cur = getCurrentUser();
    if (!cur) return { success: false, message: 'Chưa đăng nhập!' };

    const users = getUsers();
    const idx = findCurrentUserIndex(users, cur);
    if (idx === -1) return { success: false, message: 'Không tìm thấy tài khoản!' };

    if (!users[idx].addresses) users[idx].addresses = [];

    const newAddr = {
      id: 'ADDR-' + Date.now(),
      recipientName: (addressData.recipientName || '').trim(),
      phone: (addressData.phone || '').trim(),
      city: (addressData.city || '').trim(),
      district: (addressData.district || '').trim(),
      ward: (addressData.ward || '').trim(),
      addressDetail: (addressData.addressDetail || '').trim(),
      isDefault: addressData.isDefault || users[idx].addresses.length === 0
    };

    if (newAddr.isDefault) {
      users[idx].addresses.forEach(a => a.isDefault = false);
    }

    users[idx].addresses.push(newAddr);
    saveUsers(users);
    setCurrentUser(users[idx]);
    syncUserToCloud(users[idx]);

    return { success: true, message: 'Đã thêm địa chỉ giao hàng mới thành công!' };
  }

  function deleteAddress(addressId) {
    const cur = getCurrentUser();
    if (!cur) return { success: false, message: 'Chưa đăng nhập!' };

    const users = getUsers();
    const idx = findCurrentUserIndex(users, cur);
    if (idx === -1) return { success: false, message: 'Không tìm thấy tài khoản!' };

    const oldAddresses = users[idx].addresses || [];
    const filtered = oldAddresses.filter(a => a.id !== addressId);
    
    // Nếu vừa xóa địa chỉ mặc định, gán cái đầu tiên còn lại làm mặc định
    if (filtered.length > 0 && !filtered.some(a => a.isDefault)) {
      filtered[0].isDefault = true;
    }

    users[idx].addresses = filtered;
    saveUsers(users);
    setCurrentUser(users[idx]);
    syncUserToCloud(users[idx]);

    return { success: true, message: 'Đã xóa địa chỉ thành công!' };
  }

  function setDefaultAddress(addressId) {
    const cur = getCurrentUser();
    if (!cur) return { success: false, message: 'Chưa đăng nhập!' };

    const users = getUsers();
    const idx = findCurrentUserIndex(users, cur);
    if (idx === -1) return { success: false, message: 'Không tìm thấy tài khoản!' };

    (users[idx].addresses || []).forEach(a => {
      a.isDefault = (a.id === addressId);
    });

    saveUsers(users);
    setCurrentUser(users[idx]);
    syncUserToCloud(users[idx]);

    return { success: true, message: 'Đã thiết lập địa chỉ mặc định!' };
  }

  /**
   * Chuẩn hóa cấu trúc bản ghi đơn hàng để tương thích giữa các module TV3, TV4, TV5
   */
  function normalizeOrder(o) {
    if (!o || typeof o !== 'object') return null;
    const id = o.id || o.orderId || ('SZ-' + Math.floor(Math.random() * 100000));
    const total = Number(o.totalAmount !== undefined ? o.totalAmount : (o.total !== undefined ? o.total : 0));

    // Chuẩn hóa trạng thái
    let rawStatus = (o.status || o.statusCode || '').toString().trim().toLowerCase();
    let code = 'pending';
    let text = 'Chờ xác nhận';

    if (rawStatus.includes('hủy') || rawStatus === 'cancelled') {
      code = 'cancelled';
      text = 'Đã hủy đơn';
    } else if (rawStatus.includes('hoàn thành') || rawStatus.includes('đã giao') || rawStatus === 'delivered') {
      code = 'delivered';
      text = 'Giao hàng thành công';
    } else if (rawStatus.includes('giao') || rawStatus.includes('xử lý') || rawStatus === 'shipping') {
      code = 'shipping';
      text = 'Đang giao hàng';
    } else {
      code = 'pending';
      text = 'Chờ xác nhận';
    }

    // Format ngày giờ hiển thị
    let displayDate = o.createdAt || '';
    try {
      if (displayDate && displayDate.includes('T')) {
        const d = new Date(displayDate);
        if (!isNaN(d.getTime())) {
          displayDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        }
      }
    } catch (e) {}

    return {
      ...o,
      id: id,
      orderId: id,
      total: total,
      totalAmount: total,
      status: code,
      statusCode: code,
      statusText: o.statusText || text,
      displayDate: displayDate,
      shippingAddress: o.shippingAddress || o.customer?.address || 'Tại cửa hàng',
      recipientName: o.recipientName || o.customer?.fullName || 'Khách hàng',
      recipientPhone: o.recipientPhone || o.customer?.phone || '',
      paymentMethod: o.paymentMethod || o.paymentLabel || 'Thanh toán khi nhận hàng (COD)',
      items: (o.items || []).map(item => ({
        ...item,
        name: item.name || 'Sản phẩm thể thao',
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 1),
        variant: item.variant || (item.size ? `Size: ${item.size}` : '') + (item.color ? ` - ${item.color}` : ''),
        image: item.image || item.img || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=120'
      }))
    };
  }

  /**
   * QUẢN LÝ ĐƠN HÀNG CỦA NGƯỜI DÙNG
   */
  function getUserOrders(userId) {
    init();
    try {
      // Đọc từ cả 2 nguồn: sz_orders (TV3) và sportzone_orders (TV4/Checkout)
      const rawSz = localStorage.getItem('sz_orders');
      const rawSp = localStorage.getItem('sportzone_orders');
      const listSz = rawSz ? JSON.parse(rawSz) : [];
      const listSp = rawSp ? JSON.parse(rawSp) : [];

      const map = new Map();
      [...listSz, ...listSp].forEach(o => {
        if (!o || typeof o !== 'object') return;
        const key = o.id || o.orderId;
        if (key && !map.has(key)) {
          map.set(key, o);
        }
      });
      const allOrders = Array.from(map.values());

      const cur = getCurrentUser();
      const uid = userId || cur?.id;
      const curEmail = (cur?.email || '').toLowerCase().trim();
      const curPhone = (cur?.phone || '').replace(/\s/g, '');

      if (!uid && !curEmail && !curPhone) return [];

      // Lọc các đơn thuộc về người dùng:
      // Khớp theo userId HOẶC theo email khách đặt HOẶC theo SĐT khách đặt
      const userOrders = allOrders.filter(o => {
        if (uid && o.userId === uid) return true;
        const oEmail = (o.customer?.email || '').toLowerCase().trim();
        if (curEmail && oEmail && oEmail === curEmail) return true;
        const oPhone = (o.customer?.phone || o.recipientPhone || '').replace(/\s/g, '');
        if (curPhone && oPhone && oPhone === curPhone) return true;
        return false;
      });

      return userOrders.map(normalizeOrder).filter(Boolean).sort((a, b) => {
        const tA = new Date(a.createdAt || 0).getTime() || 0;
        const tB = new Date(b.createdAt || 0).getTime() || 0;
        return tB - tA;
      });
    } catch (e) {
      console.warn('[Auth] Lỗi đọc đơn hàng người dùng:', e);
      return [];
    }
  }

  function getAllOrders() {
    init();
    try {
      const rawSz = localStorage.getItem('sz_orders');
      const rawSp = localStorage.getItem('sportzone_orders');
      const listSz = rawSz ? JSON.parse(rawSz) : [];
      const listSp = rawSp ? JSON.parse(rawSp) : [];

      const map = new Map();
      [...listSz, ...listSp].forEach(o => {
        if (!o || typeof o !== 'object') return;
        const key = o.id || o.orderId;
        if (key && !map.has(key)) {
          map.set(key, o);
        }
      });
      return Array.from(map.values()).map(normalizeOrder).filter(Boolean).sort((a, b) => {
        const tA = new Date(a.createdAt || 0).getTime() || 0;
        const tB = new Date(b.createdAt || 0).getTime() || 0;
        return tB - tA;
      });
    } catch (e) {
      return [];
    }
  }

  function updateOrderStatus(orderId, newStatus) {
    const rawOrders = getAllOrders();
    const idx = rawOrders.findIndex(o => o.id === orderId || o.orderId === orderId);
    if (idx === -1) return { success: false, message: 'Không tìm thấy đơn hàng!' };

    const mapText = {
      pending: 'Chờ xác nhận',
      shipping: 'Đang giao hàng',
      delivered: 'Giao hàng thành công',
      cancelled: 'Đã hủy đơn'
    };
    rawOrders[idx].status = newStatus;
    rawOrders[idx].statusCode = newStatus;
    rawOrders[idx].statusText = mapText[newStatus] || newStatus;

    // Lưu đồng bộ vào cả 2 key
    localStorage.setItem('sz_orders', JSON.stringify(rawOrders));
    localStorage.setItem('sportzone_orders', JSON.stringify(rawOrders));

    // Đẩy lên Firestore nếu có Cloud Sync
    if (window.SportZoneCloud && typeof window.SportZoneCloud.saveSingleOrder === 'function') {
      window.SportZoneCloud.saveSingleOrder(rawOrders[idx]);
    }

    return { success: true, message: `Đã cập nhật trạng thái đơn #${orderId} thành "${rawOrders[idx].statusText}"!` };
  }

  /**
   * ============================================================
   * PHÂN QUYỀN & CHỨC NĂNG QUẢN TRỊ VIÊN (ADMIN ONLY)
   * ============================================================
   */

  // Chuyển đổi vai trò Admin <-> User
  function toggleUserRole(userId) {
    const cur = getCurrentUser();
    if (!isAdmin()) {
      return { success: false, message: 'Từ chối truy cập: Bạn không có quyền Quản trị viên!' };
    }

    if (cur.id === userId) {
      return { success: false, message: 'Không thể tự hạ cấp quyền quản trị của chính mình!' };
    }

    const users = getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return { success: false, message: 'Không tìm thấy người dùng!' };

    const newRole = users[idx].role === 'admin' ? 'user' : 'admin';
    users[idx].role = newRole;
    users[idx].membership = newRole === 'admin' ? 'Quản trị viên' : 'Thành viên Bạc';

    saveUsers(users);
    syncUserToCloud(users[idx]);
    return {
      success: true,
      message: `Đã đổi quyền của "${users[idx].fullName}" thành ${newRole === 'admin' ? 'Quản trị viên (Admin)' : 'Khách hàng (User)'}!`
    };
  }

  // Khóa / Mở khóa tài khoản
  function toggleUserStatus(userId) {
    const cur = getCurrentUser();
    if (!isAdmin()) {
      return { success: false, message: 'Từ chối truy cập: Yêu cầu quyền Quản trị viên!' };
    }

    if (cur.id === userId) {
      return { success: false, message: 'Không thể tự khóa tài khoản của chính mình!' };
    }

    const users = getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return { success: false, message: 'Không tìm thấy người dùng!' };

    const newStatus = users[idx].status === 'active' ? 'locked' : 'active';
    users[idx].status = newStatus;

    saveUsers(users);
    syncUserToCloud(users[idx]);
    return {
      success: true,
      message: `Đã ${newStatus === 'locked' ? 'KHÓA' : 'MỞ KHÓA'} tài khoản "${users[idx].fullName}"!`
    };
  }

  // Xóa tài khoản
  function deleteUser(userId) {
    const cur = getCurrentUser();
    if (!isAdmin()) {
      return { success: false, message: 'Từ chối truy cập: Yêu cầu quyền Quản trị viên!' };
    }

    if (cur.id === userId) {
      return { success: false, message: 'Không thể xóa tài khoản bạn đang đăng nhập!' };
    }

    const users = getUsers();
    const target = users.find(u => u.id === userId);
    if (!target) return { success: false, message: 'Không tìm thấy tài khoản!' };

    const filtered = users.filter(u => u.id !== userId);
    saveUsers(filtered);

    // Ghi nhận tài khoản đã xóa để không bao giờ tự ý hồi sinh khi reload
    try {
      const deletedList = JSON.parse(localStorage.getItem('sz_deleted_users') || '[]');
      if (!deletedList.includes(userId)) deletedList.push(userId);
      if (target.email && !deletedList.includes(target.email.toLowerCase())) {
        deletedList.push(target.email.toLowerCase());
      }
      localStorage.setItem('sz_deleted_users', JSON.stringify(deletedList));
    } catch (e) {}

    // Xóa vĩnh viễn trên Cloud Firestore
    deleteUserFromCloud(userId);

    return {
      success: true,
      message: `Đã xóa tài khoản "${target.fullName}" (${target.email}) khỏi hệ thống!`
    };
  }

  // Admin thêm người dùng mới trực tiếp
  function adminCreateUser(userData) {
    if (!isAdmin()) {
      return { success: false, message: 'Từ chối truy cập: Yêu cầu quyền Quản trị viên!' };
    }

    const fullName = (userData.fullName || '').trim();
    const email = (userData.email || '').trim().toLowerCase();
    const phone = (userData.phone || '').trim();
    const password = (userData.password || '').trim();
    const role = userData.role === 'admin' ? 'admin' : 'user';

    if (!fullName || !email || !phone || !password) {
      return { success: false, message: 'Vui lòng điền đầy đủ các thông tin bắt buộc!' };
    }

    const users = getUsers();
    if (users.some(u => u.email.toLowerCase() === email)) {
      return { success: false, message: 'Email này đã tồn tại trong hệ thống!' };
    }

    const newUser = {
      id: 'USR-' + String(Date.now()).slice(-6),
      fullName: fullName,
      email: email,
      phone: phone,
      password: password,
      role: role,
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      gender: userData.gender || 'other',
      birthday: userData.birthday || '',
      membership: role === 'admin' ? 'Quản trị viên' : 'Khách hàng',
      joinedDate: new Date().toISOString().slice(0, 10),
      addresses: []
    };

    users.push(newUser);
    saveUsers(users);
    syncUserToCloud(newUser);

    return {
      success: true,
      message: `Đã tạo mới tài khoản "${fullName}" với vai trò ${role === 'admin' ? 'Admin' : 'Khách hàng'} thành công!`
    };
  }

  // Thống kê hệ thống cho Admin
  function getAdminStats() {
    const users = getUsers();
    const orders = getAllOrders();

    const totalUsers = users.length;
    const adminCount = users.filter(u => u.role === 'admin').length;
    const userCount = users.filter(u => u.role === 'user').length;
    const lockedCount = users.filter(u => u.status === 'locked').length;
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const revenue = orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    return {
      totalUsers,
      adminCount,
      userCount,
      lockedCount,
      totalOrders,
      pendingOrders,
      revenue
    };
  }

  /**
   * HIỂN THỊ THÔNG BÁO TOAST NỔI ĐẸP MẮT
   */
  function showToast(message, type = 'info', duration = 3500) {
    if (typeof document === 'undefined') return;
    let container = document.getElementById('sz-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'sz-toast-container';
      container.className = 'sz-toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `sz-toast sz-toast-${type}`;

    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';

    toast.innerHTML = `
      <div class="sz-toast-icon"><i class="fas fa-${icon}"></i></div>
      <div class="sz-toast-content">${message}</div>
      <button class="sz-toast-close" aria-label="Đóng">&times;</button>
    `;

    container?.appendChild?.(toast);

    // Fade in
    setTimeout(() => toast.classList.add('show'), 10);

    const close = () => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove?.(), 300);
    };

    toast.querySelector?.('.sz-toast-close')?.addEventListener('click', close);
    setTimeout(close, duration);
  }

  /**
   * CẬP NHẬT TỰ ĐỘNG GIAO DIỆN NAVBAR TRÊN MỌI TRANG
   * Tự động biến nút "Tài khoản" thành menu dropdown nếu đã đăng nhập,
   * hiển thị Avatar, Tên và Huy hiệu Admin nếu có quyền Quản trị!
   */
  function renderNavbarAuth() {
    if (typeof document === 'undefined') return;
    const cur = getCurrentUser();
    // Tìm các thẻ a trỏ tới account.html trong navbar
    const accountLinks = document.querySelectorAll('.navbar-actions a[href*="account.html"]');

    accountLinks.forEach(link => {
      // Nếu đã có dropdown bọc thì reset
      const parent = link.closest('.navbar-user-dropdown-wrapper');
      
      if (!cur) {
        // Trạng thái: Chưa đăng nhập
        if (parent) {
          parent.replaceWith(link);
        }
        link.innerHTML = `
          <i class="far fa-user"></i>
          <span>Tài khoản</span>
        `;
        link.href = link.href.includes('../') ? '../account.html' : 'account.html';
        link.classList.remove('user-logged-in');
        return;
      }

      // Trạng thái: ĐÃ ĐĂNG NHẬP
      const isPathRelative = link.getAttribute('href').startsWith('../');
      const prefix = isPathRelative ? '../' : '';

      // Tên hiển thị rút gọn (VD: Nguyễn Văn A -> A)
      const nameParts = cur.fullName.trim().split(' ');
      const shortName = nameParts[nameParts.length - 1] || cur.fullName;

      // Tạo cấu trúc dropdown
      const wrapper = document.createElement('div');
      wrapper.className = 'navbar-user-dropdown-wrapper';

      const roleBadgeHtml = cur.role === 'admin' 
        ? `<span class="nav-admin-badge" title="Tài khoản Quản trị viên"><i class="fas fa-crown"></i> Admin</span>`
        : '';

      const adminMenuItemHtml = cur.role === 'admin'
        ? `<a href="${prefix}admin.html" class="user-dropdown-item admin-link">
             <i class="fas fa-chart-line"></i>
             <div>
               <strong>Trang Quản trị (Admin)</strong>
               <small>Quản lý thành viên & hệ thống</small>
             </div>
           </a>`
        : '';

      wrapper.innerHTML = `
        <button class="nav-action-btn user-logged-in" id="nav-user-btn" aria-haspopup="true" aria-expanded="false">
          <img src="${cur.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" alt="${cur.fullName}" class="nav-user-avatar" />
          <div class="nav-user-text">
            <span class="nav-user-greeting">Chào, <strong>${shortName}</strong></span>
            ${roleBadgeHtml}
          </div>
          <i class="fas fa-chevron-down nav-dropdown-arrow"></i>
        </button>

        <div class="user-dropdown-menu" id="nav-user-menu">
          <div class="user-dropdown-header">
            <img src="${cur.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" alt="${cur.fullName}" />
            <div>
              <div class="user-dropdown-name">${cur.fullName}</div>
              <div class="user-dropdown-email">${cur.email}</div>
              <span class="user-dropdown-role ${cur.role === 'admin' ? 'role-admin' : 'role-user'}">
                <i class="fas ${cur.role === 'admin' ? 'fa-shield-alt' : 'fa-user'}"></i>
                ${cur.role === 'admin' ? 'Quản trị viên' : 'Khách hàng'}
              </span>
            </div>
          </div>

          <div class="user-dropdown-divider"></div>

          ${adminMenuItemHtml}

          <a href="${prefix}account.html?tab=profile" class="user-dropdown-item">
            <i class="far fa-user-circle"></i> Hồ sơ của tôi
          </a>
          ${cur.role !== 'admin' ? `
          <a href="${prefix}account.html?tab=orders" class="user-dropdown-item">
            <i class="fas fa-box-open"></i> Lịch sử đơn hàng
          </a>
          <a href="${prefix}account.html?tab=addresses" class="user-dropdown-item">
            <i class="fas fa-map-marked-alt"></i> Sổ địa chỉ nhận hàng
          </a>
          ` : ''}
          <a href="${prefix}account.html?tab=password" class="user-dropdown-item">
            <i class="fas fa-key"></i> Đổi mật khẩu
          </a>

          <div class="user-dropdown-divider"></div>

          <button type="button" class="user-dropdown-item logout-action" id="dropdown-logout-btn">
            <i class="fas fa-sign-out-alt"></i> Đăng xuất
          </button>
        </div>
      `;

      if (parent) {
        parent.replaceWith(wrapper);
      } else {
        link.replaceWith(wrapper);
      }

      // Event listener cho Dropdown
      const triggerBtn = wrapper.querySelector('#nav-user-btn');
      const menu = wrapper.querySelector('#nav-user-menu');
      const logoutBtn = wrapper.querySelector('#dropdown-logout-btn');

      triggerBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = menu.classList.toggle('show');
        triggerBtn.setAttribute('aria-expanded', isOpen);
      });

      logoutBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        Auth.logout();
      });
    });

    // Bấm ra ngoài thì đóng dropdown
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.navbar-user-dropdown-wrapper')) {
        document.querySelectorAll('.user-dropdown-menu.show').forEach(m => {
          m.classList.remove('show');
          m.previousElementSibling?.setAttribute('aria-expanded', 'false');
        });
      }
    });
  }

  // Tự động khởi chạy khi script được tải
  init();
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', renderNavbarAuth);
    } else {
      renderNavbarAuth();
    }
  }

  // Xuất API công khai
  return {
    init,
    initCloudSync,
    isCloudSyncActive,
    syncUserToCloud,
    deleteUserFromCloud,
    getUsers,
    saveUsers,
    getCurrentUser,
    getUser: getCurrentUser,
    setUser: setCurrentUser,
    setCurrentUser,
    isLoggedIn,
    isAdmin,
    login,
    loginWithGoogle,
    loginWithGoogleCredential,
    register,
    logout,
    quickLogin,
    updateProfile,
    changePassword,
    addAddress,
    deleteAddress,
    setDefaultAddress,
    getUserOrders,
    getAllOrders,
    updateOrderStatus,
    toggleUserRole,
    toggleUserStatus,
    deleteUser,
    adminCreateUser,
    getAdminStats,
    getAdminSecretKey,
    setCustomAdmin,
    showToast,
    renderNavbarAuth
  };
})();

if (typeof window !== 'undefined') {
  window.Auth = Auth;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Auth;
}

