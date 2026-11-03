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
    'minhgialapnhua2k7@gmail.com',
    'nhomanhdangcapso1vn@gmail.com',
    'abcdxyz@gmail.com',
    'admin@sportzone.vn'
  ];

  const ADMIN_CONFIG = {
    fullName: 'Minh',
    email: 'minhgialapnhua2k7@gmail.com',
    phone: '0912345678',
    password: 'admin123',
    secretKey: 'SPORTZONE@ADMIN'
  };

  const STORAGE_KEYS = {
    USERS: 'sz_users',
    CURRENT_USER: 'sz_currentUser',
    ORDERS: 'sz_orders'
  };

  // Mẫu dữ liệu khởi tạo (Seed Data)
  const DEFAULT_USERS = [
    {
      id: 'USR-000',
      fullName: 'Minh Lê',
      email: 'minhgialapnhua2k7@gmail.com',
      phone: '0912345678',
      password: 'admin123',
      role: 'admin',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      gender: 'male',
      birthday: '1995-05-15',
      membership: 'Quản trị viên cấp cao',
      joinedDate: '2024-01-10',
      addresses: [
        {
          id: 'ADDR-0',
          recipientName: 'Minh Lê',
          phone: '0912345678',
          city: 'Hồ Chí Minh',
          district: 'Quận 1',
          ward: 'Phường Bến Nghé',
          addressDetail: '123 Nguyễn Huệ',
          isDefault: true
        }
      ]
    },
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
          isDefault: false
        }
      ]
    },
    {
      id: 'USR-GGL-02',
      fullName: 'Minh Lê',
      email: '4gkhongnen2k7@gmail.com',
      phone: '0922334455',
      password: 'user123',
      role: 'user',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      gender: 'male',
      birthday: '1997-03-20',
      membership: 'Thành viên Google',
      joinedDate: '2024-02-15',
      addresses: [
        {
          id: 'ADDR-G2',
          recipientName: 'Minh Lê',
          phone: '0922334455',
          city: 'Hồ Chí Minh',
          district: 'Quận 3',
          ward: 'Phường Võ Thị Sáu',
          addressDetail: '88 Nam Kỳ Khởi Nghĩa',
          isDefault: true
        }
      ]
    },
    {
      id: 'USR-GGL-03',
      fullName: 'Cong Minh',
      email: 'congm3180@gmail.com',
      phone: '0933445566',
      password: 'user123',
      role: 'user',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      gender: 'male',
      birthday: '1999-07-10',
      membership: 'Thành viên Google',
      joinedDate: '2024-03-01',
      addresses: [
        {
          id: 'ADDR-G3',
          recipientName: 'Cong Minh',
          phone: '0933445566',
          city: 'Đà Nẵng',
          district: 'Hải Châu',
          ward: 'Phường Thạch Thang',
          addressDetail: '24 Bạch Đằng',
          isDefault: true
        }
      ]
    },
    {
      id: 'USR-GGL-04',
      fullName: 'Le Minh',
      email: 'minhmuonacc07@gmail.com',
      phone: '0944556677',
      password: 'user123',
      role: 'user',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
      gender: 'male',
      birthday: '1998-12-05',
      membership: 'Thành viên Google',
      joinedDate: '2024-04-12',
      addresses: [
        {
          id: 'ADDR-G4',
          recipientName: 'Le Minh',
          phone: '0944556677',
          city: 'Hà Nội',
          district: 'Hoàn Kiếm',
          ward: 'Phường Tràng Tiền',
          addressDetail: '10 Tràng Tiền',
          isDefault: true
        }
      ]
    },
    {
      id: 'USR-002',
      fullName: 'Trần Thị Thu Thảo',
      email: 'user@sportzone.vn',
      phone: '0987654321',
      password: 'user123',
      role: 'user',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      gender: 'female',
      birthday: '1998-08-20',
      membership: 'Thành viên Vàng (Gold Member)',
      joinedDate: '2024-03-15',
      addresses: [
        {
          id: 'ADDR-2',
          recipientName: 'Trần Thị Thu Thảo',
          phone: '0987654321',
          city: 'Hồ Chí Minh',
          district: 'Quận 1',
          ward: 'Phường Bến Thành',
          addressDetail: '456 Lê Lợi',
          isDefault: true
        },
        {
          id: 'ADDR-3',
          recipientName: 'Thu Thảo (Văn phòng)',
          phone: '0987654321',
          city: 'Hồ Chí Minh',
          district: 'Bình Thạnh',
          ward: 'Phường 22',
          addressDetail: 'Tầng 18, Tòa nhà Landmark 81, 720A Điện Biên Phủ',
          isDefault: false
        }
      ]
    },
    {
      id: 'USR-003',
      fullName: 'Lê Hoàng Nam',
      email: 'nam.le@gmail.com',
      phone: '0933112233',
      password: 'user123',
      role: 'user',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      gender: 'male',
      birthday: '2000-11-02',
      membership: 'Thành viên Bạc',
      joinedDate: '2024-06-01',
      addresses: [
        {
          id: 'ADDR-4',
          recipientName: 'Lê Hoàng Nam',
          phone: '0933112233',
          city: 'Hà Nội',
          district: 'Cầu Giấy',
          ward: 'Phường Dịch Vọng',
          addressDetail: 'Số 15 ngõ 86 Duy Tân',
          isDefault: true
        }
      ]
    }
  ];

  // Mẫu đơn hàng giả lập liên kết với người dùng
  const DEFAULT_ORDERS = [
    {
      id: 'SZ-9824',
      userId: 'USR-002',
      createdAt: '2025-05-18 14:30',
      status: 'shipping', // 'pending' | 'shipping' | 'delivered' | 'cancelled'
      statusText: 'Đang vận chuyển',
      paymentMethod: 'Thanh toán khi nhận hàng (COD)',
      shippingAddress: '456 Lê Lợi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
      recipientName: 'Trần Thị Thu Thảo',
      recipientPhone: '0987654321',
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
      userId: 'USR-002',
      createdAt: '2025-04-10 09:15',
      status: 'delivered',
      statusText: 'Giao hàng thành công',
      paymentMethod: 'Ví MoMo',
      shippingAddress: '456 Lê Lợi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
      recipientName: 'Trần Thị Thu Thảo',
      recipientPhone: '0987654321',
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
      userId: 'USR-002',
      createdAt: '2025-03-22 16:45',
      status: 'delivered',
      statusText: 'Giao hàng thành công',
      paymentMethod: 'Chuyển khoản QR VNPay',
      shippingAddress: '456 Lê Lợi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
      recipientName: 'Trần Thị Thu Thảo',
      recipientPhone: '0987654321',
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
      userId: 'USR-002',
      createdAt: '2025-02-05 11:00',
      status: 'cancelled',
      statusText: 'Đã hủy đơn',
      paymentMethod: 'COD',
      shippingAddress: '456 Lê Lợi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
      recipientName: 'Trần Thị Thu Thảo',
      recipientPhone: '0987654321',
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
      userId: 'USR-003',
      createdAt: '2025-05-12 18:20',
      status: 'pending',
      statusText: 'Chờ xác nhận',
      paymentMethod: 'COD',
      shippingAddress: 'Số 15 ngõ 86 Duy Tân, Cầu Giấy, Hà Nội',
      recipientName: 'Lê Hoàng Nam',
      recipientPhone: '0912345678',
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
  function init() {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    }
    // Tự động đồng bộ cấu hình Admin riêng nếu người dùng thay đổi ADMIN_CONFIG
    syncAdminConfig();

    if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(DEFAULT_ORDERS));
    }
  }

  // Đồng bộ thông tin Admin từ ADMIN_CONFIG và ADMIN_EMAILS vào localStorage
  function syncAdminConfig() {
    try {
      let users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];

      // Đồng bộ các tài khoản Google mẫu chuẩn giao diện vào hệ thống
      const PRESET_GOOGLE_ACCOUNTS = [
        { email: 'minhgialapnhua2k7@gmail.com', fullName: 'Minh Lê', role: 'admin' },
        { email: 'nhomanhdangcapso1vn@gmail.com', fullName: 'Minh Dương Anh Diện Phong', role: 'admin' },
        { email: 'abcdxyz@gmail.com', fullName: 'Tài Khoản Thử Nghiệm', role: 'admin' },
        { email: '4gkhongnen2k7@gmail.com', fullName: 'Minh Lê', role: 'user' },
        { email: 'congm3180@gmail.com', fullName: 'Cong Minh', role: 'user' },
        { email: 'minhmuonacc07@gmail.com', fullName: 'Le Minh', role: 'user' }
      ];

      PRESET_GOOGLE_ACCOUNTS.forEach(p => {
        let u = users.find(x => x.email.toLowerCase() === p.email.toLowerCase());
        if (u) {
          u.fullName = p.fullName;
          u.role = p.role;
          u.status = 'active';
        } else {
          users.push({
            id: 'USR-GGL-' + String(Date.now()).slice(-4) + Math.floor(Math.random() * 100),
            fullName: p.fullName,
            email: p.email,
            phone: '0912345678',
            password: 'admin123',
            role: p.role,
            status: 'active',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            gender: 'male',
            birthday: '1995-05-15',
            membership: p.role === 'admin' ? 'Quản trị viên cấp cao' : 'Thành viên Google',
            joinedDate: '2024-01-10',
            addresses: []
          });
        }
      });

      ADMIN_EMAILS.forEach(adminEmail => {
        let u = users.find(x => x.email.toLowerCase() === adminEmail.toLowerCase());
        if (u) {
          u.role = 'admin';
          u.status = 'active';
          if (adminEmail.includes('minhgialapnhua')) {
            u.fullName = 'Minh Lê';
          }
        }
      });

      // Đảm bảo không trùng SĐT với tài khoản mẫu khác nếu đã có trong storage
      const usr3 = users.find(u => u.id === 'USR-003' || u.email === 'nam.le@gmail.com');
      if (usr3 && usr3.phone === '0912345678') {
        usr3.phone = '0933112233';
      }

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
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER));
    } catch (e) {
      return null;
    }
  }

  // Lưu người dùng đang đăng nhập
  function setCurrentUser(user) {
    if (!user) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      try { localStorage.removeItem('sz_user'); } catch (e) {}
    } else {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      try { localStorage.setItem('sz_user', JSON.stringify(user)); } catch (e) {}
    }
    // Cập nhật lại thanh navbar trên trang hiện tại
    renderNavbarAuth();
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
    const targetEmail = (email || 'minhgialapnhua2k7@gmail.com').trim().toLowerCase();
    const users = getUsers();
    let user = users.find(u => u.email.toLowerCase() === targetEmail);

    const KNOWN_MAP = {
      'minhgialapnhua2k7@gmail.com': { fullName: 'Minh Lê', role: 'admin' },
      'abcdxyz@gmail.com': { fullName: 'Tài Khoản Thử Nghiệm', role: 'admin' },
      'nhomanhdangcapso1vn@gmail.com': { fullName: 'Minh Dương Anh Diện Phong', role: 'admin' },
      '4gkhongnen2k7@gmail.com': { fullName: 'Minh Lê', role: 'user' },
      'congm3180@gmail.com': { fullName: 'Cong Minh', role: 'user' },
      'minhmuonacc07@gmail.com': { fullName: 'Le Minh', role: 'user' }
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
        avatar: customAvatar || (targetEmail.includes('minhgialapnhua') ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'),
        gender: 'male',
        birthday: '1995-05-15',
        membership: isAdminEmail ? 'Quản trị viên cấp cao' : 'Thành viên Google',
        joinedDate: new Date().toISOString().slice(0, 10),
        addresses: []
      };
      users.unshift(user);
      saveUsers(users);
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
    const idx = users.findIndex(u => u.id === cur.id);
    if (idx === -1) return { success: false, message: 'Không tìm thấy thông tin tài khoản!' };

    // Cập nhật các trường cho phép
    if (updatedData.fullName) users[idx].fullName = updatedData.fullName.trim();
    if (updatedData.phone) {
      const phoneRegex = /^0\d{9}$/;
      if (!phoneRegex.test(updatedData.phone.trim())) {
        return { success: false, message: 'Số điện thoại không hợp lệ (10 số, bắt đầu số 0)!' };
      }
      // Kiểm tra trùng SĐT với người khác
      const exists = users.some(u => u.phone === updatedData.phone.trim() && u.id !== cur.id);
      if (exists) {
        return { success: false, message: 'Số điện thoại này đã thuộc về người dùng khác!' };
      }
      users[idx].phone = updatedData.phone.trim();
    }
    if (updatedData.gender) users[idx].gender = updatedData.gender;
    if (updatedData.birthday) users[idx].birthday = updatedData.birthday;
    if (updatedData.avatar) users[idx].avatar = updatedData.avatar;

    saveUsers(users);
    setCurrentUser(users[idx]);

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
    const idx = users.findIndex(u => u.id === cur.id);
    if (idx !== -1) {
      users[idx].password = newPassword;
      saveUsers(users);
      setCurrentUser(users[idx]);
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
    const idx = users.findIndex(u => u.id === cur.id);
    if (idx === -1) return { success: false, message: 'Không tìm thấy tài khoản!' };

    if (!users[idx].addresses) users[idx].addresses = [];

    const newAddr = {
      id: 'ADDR-' + Date.now(),
      recipientName: addressData.recipientName.trim(),
      phone: addressData.phone.trim(),
      city: addressData.city.trim(),
      district: addressData.district.trim(),
      ward: addressData.ward.trim(),
      addressDetail: addressData.addressDetail.trim(),
      isDefault: addressData.isDefault || users[idx].addresses.length === 0
    };

    if (newAddr.isDefault) {
      users[idx].addresses.forEach(a => a.isDefault = false);
    }

    users[idx].addresses.push(newAddr);
    saveUsers(users);
    setCurrentUser(users[idx]);

    return { success: true, message: 'Đã thêm địa chỉ giao hàng mới thành công!' };
  }

  function deleteAddress(addressId) {
    const cur = getCurrentUser();
    if (!cur) return { success: false, message: 'Chưa đăng nhập!' };

    const users = getUsers();
    const idx = users.findIndex(u => u.id === cur.id);
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

    return { success: true, message: 'Đã xóa địa chỉ thành công!' };
  }

  function setDefaultAddress(addressId) {
    const cur = getCurrentUser();
    if (!cur) return { success: false, message: 'Chưa đăng nhập!' };

    const users = getUsers();
    const idx = users.findIndex(u => u.id === cur.id);
    if (idx === -1) return { success: false, message: 'Không tìm thấy tài khoản!' };

    (users[idx].addresses || []).forEach(a => {
      a.isDefault = (a.id === addressId);
    });

    saveUsers(users);
    setCurrentUser(users[idx]);

    return { success: true, message: 'Đã thiết lập địa chỉ mặc định!' };
  }

  /**
   * QUẢN LÝ ĐƠN HÀNG CỦA NGƯỜI DÙNG
   */
  function getUserOrders(userId) {
    init();
    try {
      const allOrders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS)) || [];
      const uid = userId || (getCurrentUser() && getCurrentUser().id);
      if (!uid) return [];
      return allOrders.filter(o => o.userId === uid).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (e) {
      return [];
    }
  }

  function getAllOrders() {
    init();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS)) || [];
    } catch (e) {
      return [];
    }
  }

  function updateOrderStatus(orderId, newStatus) {
    const orders = getAllOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) return { success: false, message: 'Không tìm thấy đơn hàng!' };

    orders[idx].status = newStatus;
    const mapText = {
      pending: 'Chờ xác nhận',
      shipping: 'Đang vận chuyển',
      delivered: 'Giao hàng thành công',
      cancelled: 'Đã hủy đơn'
    };
    orders[idx].statusText = mapText[newStatus] || newStatus;

    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    return { success: true, message: `Đã cập nhật trạng thái đơn ${orderId} thành "${orders[idx].statusText}"!` };
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
          <a href="${prefix}account.html?tab=orders" class="user-dropdown-item">
            <i class="fas fa-box-open"></i> Lịch sử đơn hàng
          </a>
          <a href="${prefix}account.html?tab=addresses" class="user-dropdown-item">
            <i class="fas fa-map-marked-alt"></i> Sổ địa chỉ nhận hàng
          </a>
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

