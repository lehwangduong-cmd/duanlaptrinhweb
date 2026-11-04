/**
 * ============================================================
 * SportZone - Application Configuration (Cấu hình hệ thống)
 * ============================================================
 * Quản lý tập trung thông tin cấu hình Google OAuth Client ID
 * và API Backend, hỗ trợ biến môi trường, không hardcode.
 * ============================================================
 */

(function () {
  // Client ID mặc định (Thay thế bằng Client ID thực tế từ Google Cloud Console)
  const DEFAULT_CLIENT_ID = '928531123456-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com';

  // Lấy Google Client ID theo thứ tự ưu tiên:
  // 1. Cấu hình đã lưu trong localStorage (cho phép nhập nhanh trên web)
  // 2. Biến môi trường window.__ENV (nếu deploy qua server render / Docker)
  // 3. Client ID mặc định
  function getGoogleClientId() {
    try {
      const stored = localStorage.getItem('sz_google_client_id');
      if (stored && stored.trim() && !stored.includes('YOUR_GOOGLE_CLIENT_ID')) {
        return stored.trim();
      }
    } catch (e) {}

    if (typeof window !== 'undefined' && window.__ENV && window.__ENV.GOOGLE_CLIENT_ID) {
      return window.__ENV.GOOGLE_CLIENT_ID;
    }

    return DEFAULT_CLIENT_ID;
  }

  // Lấy URL Backend API xác thực (nếu có)
  function getApiBaseUrl() {
    try {
      const stored = localStorage.getItem('sz_api_base_url');
      if (stored && stored.trim()) return stored.trim();
    } catch (e) {}

    if (typeof window !== 'undefined' && window.__ENV && window.__ENV.API_BASE_URL) {
      return window.__ENV.API_BASE_URL;
    }

    return '';
  }

  window.APP_CONFIG = {
    GOOGLE_CLIENT_ID: getGoogleClientId(),
    API_BASE_URL: getApiBaseUrl(),
    setGoogleClientId: function (clientId) {
      if (clientId && clientId.trim()) {
        const clean = clientId.trim();
        localStorage.setItem('sz_google_client_id', clean);
        this.GOOGLE_CLIENT_ID = clean;
        return true;
      }
      return false;
    },
    resetGoogleClientId: function () {
      localStorage.removeItem('sz_google_client_id');
      this.GOOGLE_CLIENT_ID = DEFAULT_CLIENT_ID;
    }
  };
})();

