/**
 * ============================================================
 * SportZone - Frontend API Client (Bridge to SQLite Backend)
 * ============================================================
 * Cung cấp các hàm gọi API chuẩn RESTful tới backend Node.js (cổng 5000).
 * Tích hợp cơ chế Graceful Fallback (tự chuyển đổi an toàn sang LocalStorage nếu chưa bật server).
 * ============================================================
 */

(function (window) {
  'use strict';

  const API_BASE_URL = 'http://localhost:5000/api';
  const TOKEN_KEY = 'sz_jwt_token';
  const USER_KEY = 'sz_current_user';

  let _serverOnline = null; // null: chưa kiểm tra, true: online, false: offline

  // ==========================================
  // HELPER FUNCTIONS
  // ==========================================

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || '';
  }

  function setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }

  function getHeaders(isJson = true, requireAuth = true) {
    const headers = {};
    if (isJson) headers['Content-Type'] = 'application/json';
    if (requireAuth) {
      const token = getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async function checkServerHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        _serverOnline = true;
        return true;
      }
    } catch (e) {
      _serverOnline = false;
    }
    return false;
  }

  // ==========================================
  // SPORTZONE API CLIENT OBJECT
  // ==========================================

  const SportZoneAPI = {
    BASE_URL: API_BASE_URL,

    // Kiểm tra trạng thái server
    isBackendOnline: async function () {
      if (_serverOnline !== null) return _serverOnline;
      return await checkServerHealth();
    },

    // ------------------------------------------
    // 1. AUTHENTICATION & TÀI KHOẢN
    // ------------------------------------------

    /**
     * Đăng ký tài khoản mới
     * @param {Object} data { fullName, email, phone, password, secretKey }
     */
    register: async function (data) {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: getHeaders(true, false),
          body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success && result.token) {
          setToken(result.token);
          localStorage.setItem(USER_KEY, JSON.stringify(result.user));
        }
        return result;
      } catch (err) {
        console.warn('[API] Server không phản hồi, thử fallback LocalStorage:', err);
        return { success: false, message: 'Không thể kết nối đến máy chủ backend.' };
      }
    },

    /**
     * Đăng nhập tài khoản
     * @param {string} email Email hoặc SĐT
     * @param {string} password Mật khẩu
     */
    login: async function (email, password) {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: getHeaders(true, false),
          body: JSON.stringify({ email, password })
        });
        const result = await res.json();
        if (result.success && result.token) {
          setToken(result.token);
          localStorage.setItem(USER_KEY, JSON.stringify(result.user));
        }
        return result;
      } catch (err) {
        console.warn('[API] Server offline, chuyển hướng kiểm tra:', err);
        return { success: false, message: 'Không thể kết nối đến máy chủ backend.' };
      }
    },

    /**
     * Lấy thông tin user hiện tại từ token JWT
     */
    getProfile: async function () {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: getHeaders(false, true)
        });
        return await res.json();
      } catch (err) {
        return { success: false, message: err.message };
      }
    },

    /**
     * Cập nhật hồ sơ
     */
    updateProfile: async function (profileData) {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/profile`, {
          method: 'PUT',
          headers: getHeaders(true, true),
          body: JSON.stringify(profileData)
        });
        const result = await res.json();
        if (result.success && result.user) {
          localStorage.setItem(USER_KEY, JSON.stringify(result.user));
        }
        return result;
      } catch (err) {
        return { success: false, message: err.message };
      }
    },

    /**
     * Đăng xuất
     */
    logout: function () {
      setToken(null);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem('sz_current_session');
    },

    // ------------------------------------------
    // 2. SẢN PHẨM (PRODUCTS)
    // ------------------------------------------

    /**
     * Lấy danh sách sản phẩm với các bộ lọc
     * @param {Object} params { q, category, brand, minPrice, maxPrice, sort, page, limit }
     */
    getProducts: async function (params = {}) {
      try {
        const query = new URLSearchParams(params).toString();
        const res = await fetch(`${API_BASE_URL}/products?${query}`);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return await res.json();
      } catch (err) {
        console.warn('[API] Không thể tải sản phẩm từ backend:', err);
        return null; // Trả null để UI fallback về DEFAULT_PRODUCTS / localStorage
      }
    },

    /**
     * Lấy chi tiết sản phẩm theo ID
     */
    getProductById: async function (id) {
      try {
        const res = await fetch(`${API_BASE_URL}/products/${id}`);
        return await res.json();
      } catch (err) {
        return null;
      }
    },

    /**
     * Thêm sản phẩm mới (Admin)
     */
    createProduct: async function (productData) {
      try {
        const res = await fetch(`${API_BASE_URL}/products`, {
          method: 'POST',
          headers: getHeaders(true, true),
          body: JSON.stringify(productData)
        });
        return await res.json();
      } catch (err) {
        return { success: false, message: err.message };
      }
    },

    /**
     * Cập nhật sản phẩm (Admin)
     */
    updateProduct: async function (id, productData) {
      try {
        const res = await fetch(`${API_BASE_URL}/products/${id}`, {
          method: 'PUT',
          headers: getHeaders(true, true),
          body: JSON.stringify(productData)
        });
        return await res.json();
      } catch (err) {
        return { success: false, message: err.message };
      }
    },

    /**
     * Xóa sản phẩm (Admin)
     */
    deleteProduct: async function (id) {
      try {
        const res = await fetch(`${API_BASE_URL}/products/${id}`, {
          method: 'DELETE',
          headers: getHeaders(false, true)
        });
        return await res.json();
      } catch (err) {
        return { success: false, message: err.message };
      }
    },

    // ------------------------------------------
    // 3. ĐƠN HÀNG (ORDERS)
    // ------------------------------------------

    /**
     * Tạo đơn hàng mới
     * @param {Object} orderData
     */
    createOrder: async function (orderData) {
      try {
        const res = await fetch(`${API_BASE_URL}/orders`, {
          method: 'POST',
          headers: getHeaders(true, true),
          body: JSON.stringify(orderData)
        });
        return await res.json();
      } catch (err) {
        console.warn('[API] Lỗi gửi đơn hàng lên server:', err);
        return { success: false, message: 'Server offline' };
      }
    },

    /**
     * Lấy lịch sử đơn hàng của tôi
     */
    getMyOrders: async function () {
      try {
        const res = await fetch(`${API_BASE_URL}/orders/my-orders`, {
          headers: getHeaders(false, true)
        });
        return await res.json();
      } catch (err) {
        return { success: false, data: [] };
      }
    },

    /**
     * Lấy tất cả đơn hàng (Admin)
     */
    getAllOrders: async function (params = {}) {
      try {
        const query = new URLSearchParams(params).toString();
        const res = await fetch(`${API_BASE_URL}/orders?${query}`, {
          headers: getHeaders(false, true)
        });
        return await res.json();
      } catch (err) {
        return { success: false, data: [] };
      }
    },

    /**
     * Cập nhật trạng thái đơn hàng (Admin)
     */
    updateOrderStatus: async function (orderId, orderStatus, paymentStatus) {
      try {
        const res = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
          method: 'PUT',
          headers: getHeaders(true, true),
          body: JSON.stringify({ orderStatus, paymentStatus })
        });
        return await res.json();
      } catch (err) {
        return { success: false, message: err.message };
      }
    },

    // ------------------------------------------
    // 4. QUẢN TRỊ ADMIN (STATS & USERS)
    // ------------------------------------------

    /**
     * Lấy số liệu thống kê Dashboard
     */
    getAdminStats: async function () {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/stats`, {
          headers: getHeaders(false, true)
        });
        return await res.json();
      } catch (err) {
        return null;
      }
    },

    /**
     * Lấy danh sách thành viên (Admin)
     */
    getAdminUsers: async function () {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/users`, {
          headers: getHeaders(false, true)
        });
        return await res.json();
      } catch (err) {
        return { success: false, data: [] };
      }
    },

    /**
     * Cập nhật quyền người dùng (Admin)
     */
    updateUserRole: async function (userId, role) {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/role`, {
          method: 'PUT',
          headers: getHeaders(true, true),
          body: JSON.stringify({ role })
        });
        return await res.json();
      } catch (err) {
        return { success: false, message: err.message };
      }
    }
  };

  // Tự động kiểm tra server khi tải trang
  checkServerHealth().then(online => {
    if (online) {
      console.log('⚡ [SportZoneAPI] Đã kết nối thành công với Backend SQLite (http://localhost:5000)!');
    } else {
      console.log('💡 [SportZoneAPI] Backend offline. Hệ thống tự động hoạt động ở chế độ LocalStorage an toàn.');
    }
  });

  window.SportZoneAPI = SportZoneAPI;
})(window);
