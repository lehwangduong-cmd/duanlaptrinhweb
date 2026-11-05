/**
 * ============================================================
 * SPORTZONE - ĐỒNG BỘ DỮ LIỆU ĐÁM MÂY QUA FIREBASE FIRESTORE
 * ============================================================
 * Chức năng:
 *  - Tự động đồng bộ tài khoản người dùng, quyền Admin (sz_users)
 *    và đơn hàng (sz_orders) giữa tất cả các trình duyệt của thành viên nhóm.
 *  - Khi 1 người tạo/sửa tài khoản Admin, các máy khác tự cập nhật theo thời gian thực (Realtime).
 *  - Tương thích 100% với localStorage hiện tại, nếu mất mạng hoặc ngoại tuyến
 *    thì web vẫn chạy bình thường với dữ liệu offline.
 */

var FirebaseSync = (function () {
  let db = null;
  let isRemoteUpdating = false;
  let isUsersSynced = false;
  let isOrdersSynced = false;
  let syncStatus = 'connecting'; // 'connecting' | 'online' | 'offline'

  // Loại bỏ các trường undefined để Firestore không báo lỗi
  function cleanObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    return JSON.parse(JSON.stringify(obj, (key, value) => (value === undefined ? null : value)));
  }

  // Khởi tạo Firestore instance
  function init() {
    if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
      console.warn('⚠️ [FirebaseSync] SDK Firebase chưa được nạp hoặc chưa khởi tạo.');
      updateStatusBadge('offline', 'Chưa nạp Firebase SDK');
      return;
    }

    try {
      db = firebase.firestore();
      console.log('⚡ [FirebaseSync] Cloud Firestore đã sẵn sàng kết nối!');
      setupRealtimeListeners();
      setupLocalStorageHook();
      renderSyncBadge();
    } catch (e) {
      console.warn('⚠️ [FirebaseSync] Không thể kết nối Cloud Firestore:', e);
      updateStatusBadge('offline', 'Lỗi kết nối');
    }
  }

  // Lắng nghe thay đổi theo thời gian thực từ Firestore
  function setupRealtimeListeners() {
    if (!db) return;

    // 1. Đồng bộ Danh sách Người dùng (users)
    try {
      db.collection('users').onSnapshot(
        snapshot => {
          if (snapshot.empty) {
            console.log('☁️ [FirebaseSync] Firestore rỗng, đang khởi tạo dữ liệu tài khoản mẫu lên đám mây...');
            seedUsersToRemote();
            updateStatusBadge('online', 'Đã kết nối (Khởi tạo đám mây)');
            return;
          }

          const remoteUsers = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            if (data) remoteUsers.push(data);
          });

          // Cập nhật vào localStorage an toàn (không kích hoạt lại hook vòng lặp)
          isRemoteUpdating = true;
          try {
            localStorage.setItem('sz_users', JSON.stringify(remoteUsers));

            // Cập nhật lại thông tin tài khoản hiện tại nếu có thay đổi (ví dụ được thăng cấp Admin)
            const curStr = localStorage.getItem('sz_currentUser');
            if (curStr) {
              const cur = JSON.parse(curStr);
              const matched = remoteUsers.find(u => 
                (u.id && cur.id && u.id === cur.id) || 
                (u.email && cur.email && u.email.toLowerCase() === cur.email.toLowerCase())
              );
              if (matched) {
                const updatedCur = { ...cur, ...matched };
                localStorage.setItem('sz_currentUser', JSON.stringify(updatedCur));
                try { localStorage.setItem('sz_user', JSON.stringify(updatedCur)); } catch (e) {}
              }
            }

            console.log(`✅ [FirebaseSync] Đã đồng bộ ${remoteUsers.length} tài khoản từ Firestore về máy!`);
            isUsersSynced = true;
            syncStatus = 'online';
            updateStatusBadge('online', `Đã đồng bộ (${remoteUsers.length} tài khoản)`);

            // Thông báo cho giao diện (Admin dashboard, Navbar) cập nhật lại
            window.dispatchEvent(new CustomEvent('sz_users_synced', { detail: { users: remoteUsers } }));
            if (typeof window.renderUsersTable === 'function') window.renderUsersTable();
            if (typeof window.renderStats === 'function') window.renderStats();
            if (typeof window.Auth !== 'undefined' && typeof window.Auth.renderNavbarAuth === 'function') {
              window.Auth.renderNavbarAuth();
            }
          } finally {
            isRemoteUpdating = false;
          }
        },
        error => {
          console.warn('⚠️ [FirebaseSync] Lỗi khi nhận dữ liệu users từ Firestore:', error.message);
          updateStatusBadge('offline', 'Chưa thể kết nối Firestore');
        }
      );
    } catch (err) {
      console.warn('⚠️ [FirebaseSync] Lỗi lắng nghe users:', err);
    }

    // 2. Đồng bộ Đơn hàng (orders)
    try {
      db.collection('orders').onSnapshot(
        snapshot => {
          if (snapshot.empty) {
            seedOrdersToRemote();
            return;
          }

          const remoteOrders = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            if (data) remoteOrders.push(data);
          });

          isRemoteUpdating = true;
          try {
            localStorage.setItem('sz_orders', JSON.stringify(remoteOrders));
            console.log(`✅ [FirebaseSync] Đã đồng bộ ${remoteOrders.length} đơn hàng từ Firestore về máy!`);
            isOrdersSynced = true;

            window.dispatchEvent(new CustomEvent('sz_orders_synced', { detail: { orders: remoteOrders } }));
            if (typeof window.renderAdminOrdersTable === 'function') window.renderAdminOrdersTable();
            if (typeof window.renderStats === 'function') window.renderStats();
          } finally {
            isRemoteUpdating = false;
          }
        },
        error => {
          console.warn('⚠️ [FirebaseSync] Lỗi lắng nghe orders từ Firestore:', error.message);
        }
      );
    } catch (err) {
      console.warn('⚠️ [FirebaseSync] Lỗi lắng nghe orders:', err);
    }
  }

  // Hook tự động bắt sự kiện khi code gọi localStorage.setItem('sz_users' / 'sz_orders')
  function setupLocalStorageHook() {
    const rawSetItem = localStorage.setItem.bind(localStorage);

    localStorage.setItem = function (key, value) {
      rawSetItem(key, value);

      // Nếu đang trong quá trình tải từ remote về thì không đẩy ngược lại
      if (isRemoteUpdating || !db) return;

      if (key === 'sz_users') {
        try {
          const users = JSON.parse(value);
          if (Array.isArray(users)) {
            pushUsersToRemote(users);
          }
        } catch (e) {}
      } else if (key === 'sz_orders') {
        try {
          const orders = JSON.parse(value);
          if (Array.isArray(orders)) {
            pushOrdersToRemote(orders);
          }
        } catch (e) {}
      }
    };
  }

  // Đẩy danh sách users lên Firestore và đồng bộ cả trường hợp xóa
  function pushUsersToRemote(users) {
    if (!db || !Array.isArray(users)) return;

    try {
      db.collection('users').get().then(snapshot => {
        const currentIds = new Set(users.map(u => u.id));
        const batch = db.batch();

        users.forEach(u => {
          const docId = u.id || (u.email ? u.email.replace(/[.@]/g, '_') : 'usr_' + Date.now());
          const ref = db.collection('users').doc(docId);
          batch.set(ref, cleanObject(u), { merge: true });
        });

        // Xóa các user đã bị xóa khỏi localStorage
        snapshot.forEach(doc => {
          if (!currentIds.has(doc.id)) {
            batch.delete(doc.ref);
          }
        });

        return batch.commit();
      }).then(() => {
        console.log('☁️ [FirebaseSync] Đã đẩy dữ liệu tài khoản lên Firestore thành công!');
      }).catch(err => {
        console.warn('⚠️ [FirebaseSync] Lỗi khi đẩy users lên Firestore:', err);
      });
    } catch (e) {
      console.warn('⚠️ [FirebaseSync] Lỗi pushUsersToRemote:', e);
    }
  }

  // Đẩy danh sách orders lên Firestore
  function pushOrdersToRemote(orders) {
    if (!db || !Array.isArray(orders)) return;

    try {
      db.collection('orders').get().then(snapshot => {
        const currentIds = new Set(orders.map(o => o.id));
        const batch = db.batch();

        orders.forEach(o => {
          const docId = o.id || 'ord_' + Date.now();
          const ref = db.collection('orders').doc(docId);
          batch.set(ref, cleanObject(o), { merge: true });
        });

        snapshot.forEach(doc => {
          if (!currentIds.has(doc.id)) {
            batch.delete(doc.ref);
          }
        });

        return batch.commit();
      }).then(() => {
        console.log('☁️ [FirebaseSync] Đã đẩy dữ liệu đơn hàng lên Firestore thành công!');
      }).catch(err => {
        console.warn('⚠️ [FirebaseSync] Lỗi khi đẩy orders lên Firestore:', err);
      });
    } catch (e) {
      console.warn('⚠️ [FirebaseSync] Lỗi pushOrdersToRemote:', e);
    }
  }

  // Đẩy dữ liệu khởi tạo ban đầu lên Firestore nếu Firestore đang rỗng
  function seedUsersToRemote() {
    try {
      let localUsers = JSON.parse(localStorage.getItem('sz_users'));
      if (!Array.isArray(localUsers) || localUsers.length === 0) {
        if (typeof window.Auth !== 'undefined' && typeof window.Auth.getUsers === 'function') {
          localUsers = window.Auth.getUsers();
        }
      }
      if (Array.isArray(localUsers) && localUsers.length > 0) {
        pushUsersToRemote(localUsers);
      }
    } catch (e) {}
  }

  function seedOrdersToRemote() {
    try {
      let localOrders = JSON.parse(localStorage.getItem('sz_orders'));
      if (!Array.isArray(localOrders) || localOrders.length === 0) {
        if (typeof window.Auth !== 'undefined' && typeof window.Auth.getAllOrders === 'function') {
          localOrders = window.Auth.getAllOrders();
        }
      }
      if (Array.isArray(localOrders) && localOrders.length > 0) {
        pushOrdersToRemote(localOrders);
      }
    } catch (e) {}
  }

  // Hiển thị huy hiệu trạng thái đồng bộ nhỏ ở góc dưới phải trang web (tiện cho nhóm theo dõi)
  function renderSyncBadge() {
    if (typeof document === 'undefined' || document.getElementById('sz-sync-badge')) return;

    const badge = document.createElement('div');
    badge.id = 'sz-sync-badge';
    badge.style.cssText = `
      position: fixed;
      bottom: 12px;
      right: 12px;
      z-index: 99999;
      background: rgba(15, 23, 42, 0.85);
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 11.5px;
      padding: 6px 12px;
      border-radius: 20px;
      display: flex;
      align-items: center;
      gap: 7px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      backdrop-filter: blur(6px);
      pointer-events: none;
      transition: all 0.3s ease;
    `;
    badge.innerHTML = `
      <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#eab308;" id="sz-sync-dot"></span>
      <span id="sz-sync-text">Firebase: Đang kết nối...</span>
    `;
    document.body.appendChild(badge);
  }

  function updateStatusBadge(status, text) {
    if (typeof document === 'undefined') return;
    const dot = document.getElementById('sz-sync-dot');
    const label = document.getElementById('sz-sync-text');
    if (!dot || !label) return;

    if (status === 'online') {
      dot.style.background = '#22c55e'; // Xanh lá
      label.textContent = text || 'Firebase: Đang đồng bộ Online';
    } else if (status === 'offline') {
      dot.style.background = '#ef4444'; // Đỏ
      label.textContent = text || 'Firebase: Ngoại tuyến (Dùng Local)';
    } else {
      dot.style.background = '#eab308'; // Vàng
      label.textContent = text || 'Firebase: Đang kết nối...';
    }
  }

  // Tự động khởi tạo ngay khi nạp script
  if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  return {
    init,
    pushUsersToRemote,
    pushOrdersToRemote,
    isUsersSynced: () => isUsersSynced,
    isOrdersSynced: () => isOrdersSynced
  };
})();
