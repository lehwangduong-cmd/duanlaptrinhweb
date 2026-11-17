/**
 * ============================================================
 * SPORTZONE - CẤU HÌNH KẾT NỐI FIREBASE CHO TOÀN BỘ HỆ THỐNG
 * ============================================================
 * Dự án: sportzone-sync-v2
 * Chức năng: Đồng bộ tài khoản, quyền Quản trị viên (Admin)
 * và hồ sơ người dùng thời gian thực (Realtime) qua Cloud Firestore.
 * ============================================================
 */

const firebaseConfig = {
  apiKey: "AIzaSyBMpsMRnJUVfIhNC6Pmh9zOegxEJkWdDsM",
  authDomain: "sportzone-sync-v2.firebaseapp.com",
  projectId: "sportzone-sync-v2",
  storageBucket: "sportzone-sync-v2.firebasestorage.app",
  messagingSenderId: "244588608516",
  appId: "1:244588608516:web:b99aa9881ef7e032a38951",
  measurementId: "G-NYMV1XHMZV"
};

// Đưa vào window scope để các script Auth, Shared đều truy cập được
if (typeof window !== 'undefined') {
  window.firebaseConfig = firebaseConfig;
  window.FIREBASE_CONFIG = firebaseConfig;

  // Tiện ích quản lý Firebase của SportZone
  window.SportZoneFirebase = {
    getConfig: function () {
      return firebaseConfig;
    },
    isConfigured: function () {
      return Boolean(firebaseConfig.projectId && firebaseConfig.apiKey);
    }
  };
}

// Khởi tạo Firebase App nếu có SDK
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  try {
    firebase.initializeApp(firebaseConfig);
    console.log('🔥 [SportZone Firebase] Đã kết nối dự án sportzone-sync-v2 thành công!');
  } catch (err) {
    console.warn('⚠️ [SportZone Firebase] Khởi tạo Firebase thất bại:', err);
  }
}
