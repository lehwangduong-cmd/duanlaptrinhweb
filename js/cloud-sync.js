/**
 * ============================================================
 * SportZone - Cloud Sync Engine (Firebase Firestore Realtime)
 * ============================================================
 * Đồng bộ dữ liệu hai chiều thời gian thực (Realtime 2-Way Sync)
 * giữa tất cả các máy tính của 5 thành viên trong nhóm và Giảng viên:
 *  1. Sản phẩm & Tồn kho hàng hóa (sz_products <-> sportzone_products)
 *  2. Đơn hàng & Tiến trình xử lý đơn (sz_orders <-> sportzone_orders, sz_orders)
 * ============================================================
 */

(function () {
  'use strict';

  // Khóa localStorage chuẩn của dự án SportZone
  const KEYS = {
    PRODUCTS: 'sportzone_products',
    PENDING_PRODUCTS: 'sportzone_products_pending_sync',
    ORDERS: 'sportzone_orders',
    SHOP_ORDERS: 'sz_orders'
  };
  const EMPTY_PRODUCTS_MARKER = '__catalog_state__';

  let _db = null;
  let _isSyncReady = false;
  let _isInternalWrite = false;
  let _unsubProducts = null;
  let _unsubOrders = null;
  let remoteProducts = new Map();
  let remoteHasEmptyMarker = false;
  let hasProductSnapshot = false;
  let pendingProducts = null;
  let isSyncingProducts = false;
  let hasFailedProductSync = false;

  // Lấy cấu hình Firebase
  function getConfig() {
    return (window.SportZoneFirebase && typeof window.SportZoneFirebase.getConfig === 'function')
      ? window.SportZoneFirebase.getConfig()
      : (window.FIREBASE_CONFIG || window.firebaseConfig || null);
  }

  // Khởi tạo kết nối Cloud Firestore
  function initCloudSyncEngine() {
    if (_isSyncReady) return;
    try {
      if (typeof firebase === 'undefined') {
        console.log('[Cloud Sync] Firebase SDK chưa sẵn sàng.');
        return;
      }

      const cfg = getConfig();
      if (!cfg || !cfg.projectId || !cfg.apiKey || cfg.apiKey.includes('YOUR_')) {
        console.log('[Cloud Sync] Chưa tìm thấy cấu hình Firebase hợp lệ.');
        return;
      }

      if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(cfg);
      }

      _db = firebase.firestore();
      _isSyncReady = true;
      console.log('⚡ [Cloud Sync Engine] Đã kích hoạt đồng bộ Realtime Sản phẩm & Đơn hàng!');

      // Kích hoạt lắng nghe Realtime 2 bộ sưu tập
      setupProductsListener();
      setupOrdersListener();

      // Cài đặt Hook can thiệp thông minh vào localStorage.setItem
      installStorageHooks();
    } catch (err) {
      console.warn('[Cloud Sync Engine] Lỗi khởi động:', err);
    }
  }

  // ============================================================
  // 1. ĐỒNG BỘ SẢN PHẨM & KHO HÀNG (sz_products)
  // ============================================================
  const _syncedProductsMap = new Map();

  function setupProductsListener() {
    if (!_db) return;
    if (_unsubProducts) _unsubProducts();

    _unsubProducts = _db.collection('sz_products').onSnapshot(
      snapshot => {
        const cloudProducts = [];
        const nextRemoteProducts = new Map();
        let hasEmptyMarker = false;

        snapshot.forEach(doc => {
          const data = doc.data();
          if (doc.id === EMPTY_PRODUCTS_MARKER) {
            hasEmptyMarker = true;
            return;
          }
          if (data && data.id !== undefined) {
            cloudProducts.push(data);
            nextRemoteProducts.set(doc.id, data);
            try {
              _syncedProductsMap.set(String(data.id), JSON.stringify(data));
            } catch (e) {}
          }
        });

        cloudProducts.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
        remoteProducts = nextRemoteProducts;
        remoteHasEmptyMarker = hasEmptyMarker;
        hasProductSnapshot = true;

        if (localStorage.getItem(KEYS.PENDING_PRODUCTS)) {
          if (!isSyncingProducts && !hasFailedProductSync) {
            pushProductsToCloud(readStoredProducts());
          }
          return;
        }

        if (snapshot.empty && !hasEmptyMarker) {
          const localProducts = readStoredProducts();
          if (localProducts.length > 0) {
            pushProductsToCloud(localProducts);
            return;
          }
        }

        // Đọc danh sách ID đã xóa từ trước
        let deletedIds = [];
        try {
          const rawDel = localStorage.getItem('sz_deleted_product_ids');
          if (rawDel) deletedIds = JSON.parse(rawDel);
        } catch (e) {}
        const deletedSet = new Set(deletedIds.map(String));

        // Lọc bỏ sản phẩm đã xóa
        const filteredCloud = cloudProducts.filter(p => !deletedSet.has(String(p.id)));

        // Đọc sản phẩm hiện có trong localStorage để MERGE thông minh (không làm mất hàng vừa thêm khi F5)
        let localProducts = [];
        try {
          const rawLocal = localStorage.getItem(KEYS.PRODUCTS);
          if (rawLocal) localProducts = JSON.parse(rawLocal);
        } catch (e) {}

        const cloudIdMap = new Map(filteredCloud.map(p => [String(p.id), p]));
        const merged = [];
        const seenIds = new Set();

        // Ưu tiên các sản phẩm local (giữ nguyên thứ tự và sản phẩm mới tạo offline/chưa kịp sync)
        if (Array.isArray(localProducts)) {
          localProducts.forEach(localP => {
            const strId = String(localP.id);
            if (deletedSet.has(strId)) return;

            if (cloudIdMap.has(strId)) {
              merged.push({ ...localP, ...cloudIdMap.get(strId) });
            } else {
              merged.push(localP);
            }
            seenIds.add(strId);
          });
        }

        // Thêm các sản phẩm từ cloud chưa có trong local
        filteredCloud.forEach(cloudP => {
          const strId = String(cloudP.id);
          if (!seenIds.has(strId)) {
            merged.push(cloudP);
            seenIds.add(strId);
          }
        });

        if (merged.length > 0 || hasEmptyMarker) {
          safeSetStorage(KEYS.PRODUCTS, JSON.stringify(merged));

          if (typeof window.PRODUCTS !== 'undefined' && Array.isArray(window.PRODUCTS)) {
            window.PRODUCTS = merged;
          }

          window.dispatchEvent(new CustomEvent('sz:products-updated', { detail: merged }));
          window.dispatchEvent(new StorageEvent('storage', { key: KEYS.PRODUCTS }));
        }
      },
      err => console.warn('[Cloud Sync] Lỗi lắng nghe sz_products:', err)
    );
  }

  // ============================================================
  // 2. ĐỒNG BỘ ĐƠN HÀNG & DUYỆT ĐƠN (sz_orders)
  // ============================================================
  function setupOrdersListener() {
    if (!_db) return;
    if (_unsubOrders) _unsubOrders();

    _unsubOrders = _db.collection('sz_orders').onSnapshot(
      snapshot => {
        if (snapshot.empty) return;

        const orders = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data && (data.id || data.orderId)) {
            orders.push(data);
          }
        });

        // Sắp xếp đơn mới nhất lên đầu
        orders.sort((a, b) => {
          const tA = Number(a.timestamp || new Date(a.createdAt || 0).getTime() || 0);
          const tB = Number(b.timestamp || new Date(b.createdAt || 0).getTime() || 0);
          return tB - tA;
        });

        if (orders.length > 0) {
          const serialized = JSON.stringify(orders);
          safeSetStorage(KEYS.ORDERS, serialized);
          safeSetStorage(KEYS.SHOP_ORDERS, serialized);

          // Bắn sự kiện để Admin Dashboard và My Orders cập nhật giao diện
          window.dispatchEvent(new CustomEvent('sz:orders-updated', { detail: orders }));
          window.dispatchEvent(new StorageEvent('storage', { key: KEYS.ORDERS }));
          window.dispatchEvent(new StorageEvent('storage', { key: KEYS.SHOP_ORDERS }));
        }
      },
      err => console.warn('[Cloud Sync] Lỗi lắng nghe sz_orders:', err)
    );
  }

  // ============================================================
  // 3. TIỆN ÍCH ĐẨY DỮ LIỆU TỪ LOCAL LÊN CLOUD
  // ============================================================

  // Đồng bộ 1 sản phẩm cụ thể lên Cloud (nhanh, nhẹ, không gây tràn quota)
  function syncSingleProduct(p) {
    if (!_db || !p || p.id === undefined) return;
    try {
      const cleanDoc = JSON.parse(JSON.stringify(p));
      _db.collection('sz_products').doc(String(p.id)).set(cleanDoc, { merge: true })
        .then(() => {
          _syncedProductsMap.set(String(p.id), JSON.stringify(cleanDoc));
          console.log('⚡ [Cloud Sync] Đã lưu sản phẩm lên Cloud:', p.name || p.id);
        })
        .catch(e => console.warn('[Cloud Sync] Lưu sản phẩm cục bộ (Cloud offline/quota):', e?.message || e));
    } catch (e) {
      console.warn('[Cloud Sync] Lỗi parse sản phẩm:', e);
    }
  }

  // Xóa sản phẩm trên Cloud Firestore khi Admin xóa
  function deleteProduct(productId) {
    if (!_db || productId === undefined) return;
    try {
      _db.collection('sz_products').doc(String(productId)).delete()
        .then(() => {
          _syncedProductsMap.delete(String(productId));
          console.log('⚡ [Cloud Sync] Đã xóa sản phẩm trên Cloud:', productId);
        })
        .catch(e => console.warn('[Cloud Sync] Lỗi xóa trên Cloud:', e?.message || e));
    } catch (e) {
      console.warn('[Cloud Sync] Lỗi gọi delete Cloud:', e);
    }
  }

  // Đồng bộ sản phẩm cần cập nhật (sử dụng batch commit và xử lý hàng đợi)
  function pushProductsToCloud(productsArray) {
    if (!_db || !Array.isArray(productsArray)) return;
    pendingProducts = productsArray
      .filter(product => product && product.id !== undefined)
      .map(product => JSON.parse(JSON.stringify(product)));
    if (isSyncingProducts) return;

    isSyncingProducts = true;
    syncPendingProducts();
  }

  async function syncPendingProducts() {
    let latestSyncSucceeded = true;
    while (pendingProducts !== null) {
      const products = pendingProducts;
      pendingProducts = null;
      try {
        await syncProductsToCloud(products);
        latestSyncSucceeded = true;
        hasFailedProductSync = false;
      } catch (error) {
        console.warn('[Cloud Sync] Lỗi đồng bộ danh sách sản phẩm lên Cloud:', error);
        window.dispatchEvent(new CustomEvent('sz:cloud-products-sync-error', {
          detail: {
            code: error && error.code ? error.code : '',
            message: error && error.message ? error.message : String(error)
          }
        }));
        latestSyncSucceeded = false;
        hasFailedProductSync = true;
      }
    }
    if (latestSyncSucceeded) localStorage.removeItem(KEYS.PENDING_PRODUCTS);
    isSyncingProducts = false;
  }

  async function syncProductsToCloud(products) {
    const collection = _db.collection('sz_products');
    if (!hasProductSnapshot) {
      const snapshot = await collection.get();
      const loadedProducts = new Map();
      let hasEmptyMarker = false;
      snapshot.forEach(doc => {
        if (doc.id === EMPTY_PRODUCTS_MARKER) hasEmptyMarker = true;
        else loadedProducts.set(doc.id, doc.data());
      });
      remoteProducts = loadedProducts;
      remoteHasEmptyMarker = hasEmptyMarker;
      hasProductSnapshot = true;
    }

    const desiredProducts = new Map(products.map(product => [String(product.id), product]));
    const batch = _db.batch();
    let writeCount = 0;

    desiredProducts.forEach((product, id) => {
      if (stableStringify(remoteProducts.get(id)) !== stableStringify(product)) {
        batch.set(collection.doc(id), product);
        writeCount++;
      }
    });

    remoteProducts.forEach((_, id) => {
      if (!desiredProducts.has(id)) {
        batch.delete(collection.doc(id));
        writeCount++;
      }
    });

    if (remoteHasEmptyMarker && desiredProducts.size > 0) {
      batch.delete(collection.doc(EMPTY_PRODUCTS_MARKER));
      writeCount++;
    } else if (!remoteHasEmptyMarker && desiredProducts.size === 0) {
      batch.set(collection.doc(EMPTY_PRODUCTS_MARKER), { catalogState: 'empty' });
      writeCount++;
    }

    if (writeCount > 0) await batch.commit();
    remoteProducts = desiredProducts;
    remoteHasEmptyMarker = desiredProducts.size === 0;
  }

  function stableStringify(value) {
    if (Array.isArray(value)) {
      return `[${value.map(stableStringify).join(',')}]`;
    }
    if (value && typeof value === 'object') {
      return `{${Object.keys(value).sort().map(key =>
        `${JSON.stringify(key)}:${stableStringify(value[key])}`
      ).join(',')}}`;
    }
    return JSON.stringify(value);
  }

  function readStoredProducts() {
    try {
      const products = JSON.parse(localStorage.getItem(KEYS.PRODUCTS) || '[]');
      return Array.isArray(products) ? products : [];
    } catch (error) {
      console.warn('[Cloud Sync] Không thể đọc danh sách sản phẩm trên thiết bị:', error);
      return [];
    }
  }

  // Đồng bộ đơn hàng lên Cloud (khi TV4 đặt hàng mới hoặc TV5 duyệt đơn)
  function pushOrdersToCloud(ordersArray) {
    if (!_db || !Array.isArray(ordersArray)) return;
    try {
      ordersArray.forEach(o => {
        const orderId = o.id || o.orderId;
        if (orderId) {
          const cleanDoc = JSON.parse(JSON.stringify(o));
          _db.collection('sz_orders').doc(String(orderId)).set(cleanDoc, { merge: true })
            .catch(e => console.warn('[Cloud Sync] Lỗi đẩy đơn hàng lên Cloud:', e));
        }
      });
    } catch (e) {
      console.warn('[Cloud Sync] Lỗi parse đơn hàng đẩy Cloud:', e);
    }
  }

  // Ghi vào localStorage mà không gây vòng lặp đồng bộ
  function safeSetStorage(key, val) {
    _isInternalWrite = true;
    try {
      localStorage.setItem(key, val);
    } finally {
      _isInternalWrite = false;
    }
  }

  // ============================================================
  // 4. STORAGE HOOK: TỰ ĐỘNG BẮT MỌI THAO TÁC CỦA CÁC THÀNH VIÊN
  // ============================================================
  function installStorageHooks() {
    if (window._szStorageHooked) return;
    window._szStorageHooked = true;

    const originalSetItem = Storage.prototype.setItem;

    Storage.prototype.setItem = function (key, value) {
      originalSetItem.apply(this, arguments);

      // Nếu là ghi từ Cloud Sync về thì không gửi ngược lại
      if (_isInternalWrite) return;

      if (key === KEYS.PRODUCTS) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            if (this === window.localStorage) {
              Storage.prototype.setItem.call(
                this,
                KEYS.PENDING_PRODUCTS,
                '1'
              );
            }
            pushProductsToCloud(parsed);
          }
        } catch (e) {}
      } else if (key === KEYS.ORDERS || key === KEYS.SHOP_ORDERS) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            pushOrdersToCloud(parsed);
          }
        } catch (e) {}
      }
    };
  }

  // Khởi động Engine
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCloudSyncEngine);
  } else {
    initCloudSyncEngine();
  }

  // Cung cấp API trực tiếp cho các trang khi cần gọi
  window.SportZoneCloud = {
    init: initCloudSyncEngine,
    syncProducts: () => {
      try {
        const raw = localStorage.getItem(KEYS.PRODUCTS);
        if (raw) pushProductsToCloud(JSON.parse(raw));
      } catch (e) {}
    },
    syncSingleProduct,
    deleteProduct,
    syncOrders: () => {
      try {
        const raw = localStorage.getItem(KEYS.ORDERS);
        if (raw) pushOrdersToCloud(JSON.parse(raw));
      } catch (e) {}
    },
    saveSingleOrder: function (order) {
      if (!_db || !order) return;
      const id = order.id || order.orderId;
      if (!id) return;
      const clean = JSON.parse(JSON.stringify(order));
      _db.collection('sz_orders').doc(String(id)).set(clean, { merge: true })
        .then(() => console.log('⚡ [Cloud Sync] Đã lưu đơn hàng lên Cloud:', id))
        .catch(err => console.warn('[Cloud Sync] Lỗi lưu đơn hàng:', err));
    },
    isReady: () => _isSyncReady
  };
})();
