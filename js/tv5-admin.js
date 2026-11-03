/**
 * tv5-admin.js – JavaScript của TV5
 * Phụ trách: Dashboard charts, CRUD sản phẩm/khách hàng/đơn hàng,
 *            thống kê doanh thu, quản lý kho hàng
 *
 * Nhúng ở cuối file HTML của TV5 (sau shared.js):
 * <script src="../js/shared.js"></script>
 * <script src="../js/tv5-admin.js"></script>
 */

// TV5 viết JavaScript vào đây
// Lưu ý: Trang admin cần kiểm tra quyền admin trước
// if (!Auth.isLoggedIn() || Auth.getUser()?.role !== 'admin') {
//   window.location.href = '../login.html';
// }
