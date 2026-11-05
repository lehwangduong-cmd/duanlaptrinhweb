/**
 * ============================================================
 * SPORTZONE - CẤU HÌNH KẾT NỐI FIREBASE CHO TOÀN BỘ HỆ THỐNG
 * ============================================================
 * Dự án: sportzone-shop (sportzone-shop-4cbac)
 * Chức năng: Đồng bộ tài khoản, quyền Quản trị viên (Admin)
 * và hồ sơ người dùng thời gian thực (Realtime) qua Cloud Firestore.
 * ============================================================
 */

const firebaseConfig = {
  apiKey: "AIzaSyC05ygruSudg7aJDOsWLU1WurDQ4EHxJek",
  authDomain: "sportzone-shop-4cbac.firebaseapp.com",
  projectId: "sportzone-shop-4cbac",
  storageBucket: "sportzone-shop-4cbac.firebasestorage.app",
  messagingSenderId: "299328790494",
  appId: "1:299328790494:web:2242ce8e47c1a867e2c74f",
  measurementId: "G-J14K5X20BX"
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
    console.log('🔥 [SportZone Firebase] Đã kết nối dự án sportzone-shop-4cbac thành công!');
  } catch (err) {
    console.warn('⚠️ [SportZone Firebase] Khởi tạo Firebase thất bại:', err);
  }
}
