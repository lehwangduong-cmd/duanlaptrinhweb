# SportZone – Dự án Lập trình Web Bán Đồ Thể Thao

Hệ thống website thương mại điện tử chuyên cung cấp trang thiết bị, phụ kiện và trang phục thể thao chính hãng đa môn (Chạy bộ, Bóng đá, Gym & Yoga, Bơi lội,...).

---

## 👥 Nhóm Thực Hiện
- **Thành viên:** Minh, Dương, Anh, Diện, Phong
- **Email nhóm:** `nhomanhdangcapso1vn@gmail.com`
- **Issue Phụ Trách:** **Hoàn thiện quá trình xác thực luồng và quản lý tài khoản/yêu thích của khách hàng.**

---

## 📋 Danh Sách Kiểm Tra Nhiệm Vụ (GitHub Issue Checklist)

Toàn bộ **6/6 hạng mục** theo Issue của nhóm trưởng đã được hoàn thiện đầy đủ 100%:

- [x] **1. Xây dựng biểu mẫu đăng ký và đăng nhập để kiểm tra bắt dữ liệu, email định dạng và thông báo lỗi dễ hiểu.**
  - [x] Form đăng ký: Kiểm tra định dạng Email chuẩn, Họ tên, Số điện thoại Việt Nam 10 số.
  - [x] Ràng buộc mật khẩu tối thiểu 6 ký tự, kiểm tra trùng khớp mật khẩu xác nhận.
  - [x] Thông báo lỗi trực quan (Toast thông báo xanh/đỏ/vàng dễ hiểu).
  - [x] Hỗ trợ mã bí mật hệ thống (`SPORTZONE@ADMIN`) để cấp quyền Quản trị viên (Admin).
  - [x] Form đăng nhập linh hoạt bằng Email hoặc Số điện thoại + Mật khẩu.
  - [x] Đăng nhập nhanh Google One-Tap Persona & Cửa sổ Chrome OAuth popup chuẩn xác 100%.

- [x] **2. Lưu/đọc trạng thái người dùng qua API `Auth` trong `js/shared.js` ; xử lý đăng nhập và trạng thái chưa đăng nhập.**
  - [x] Đã cấu hình và phát triển module API `Auth` hoàn chỉnh trong `js/shared.js`.
  - [x] Lưu trữ phiên làm việc an toàn trong `localStorage` (`sz_currentUser`, `sz_users`, `sz_orders`).
  - [x] Phương thức `Auth.isLoggedIn()`, `Auth.getCurrentUser()`, `Auth.isAdmin()` để kiểm tra trạng thái đăng nhập/chưa đăng nhập.
  - [x] Tự động giải phóng và làm sạch trạng thái khi đăng xuất (`Auth.logout()`).

- [x] **3. Hoàn thiện tài khoản trang: hiển thị hồ sơ thông tin và lưu thay đổi các khả năng hiện có của dự án.**
  - [x] Trang tài khoản [account.html](account.html): Hiển thị đầy đủ Họ tên, Email, Số điện thoại, Giới tính, Ngày sinh, Cấp bậc thành viên.
  - [x] Cho phép cập nhật thông tin cá nhân và lưu thay đổi vào hệ thống.
  - [x] Hỗ trợ đổi ảnh đại diện (Avatar).
  - [x] Quản lý sổ địa chỉ giao hàng: Xem danh sách, Thêm mới, Xóa, Đặt làm mặc định.
  - [x] Lịch sử đơn hàng: Xem danh sách đơn hàng, lọc theo trạng thái và xem chi tiết modal.
  - [x] Chức năng đổi mật khẩu tài khoản an toàn.

- [x] **4. Hoàn thiện danh sách mong muốn: hiển thị sản phẩm, bổ sung/xóa yêu thích và trạng thái danh sách trống.**
  - [x] Xây dựng trang danh sách mong muốn [wishlist.html](wishlist.html) hoàn chỉnh.
  - [x] Hiển thị lưới sản phẩm yêu thích (Ảnh, Tên, Thương hiệu, Giá gốc, Giá khuyến mãi).
  - [x] Nút bổ sung / xóa sản phẩm yêu thích (Trái tim trên trang chủ và Nút xóa trên trang yêu thích).
  - [x] Trạng thái danh sách trống (Empty state): Hiển thị biểu tượng trái tim rỗng cùng thông điệp hướng dẫn và nút quay lại mua sắm.

- [x] **5. Kết nối các nút tài khoản/yêu thích từ thanh điều hướng; huy hiệu đồng bộ/trạng thái sau hoạt động.**
  - [x] Nút **Tài khoản** trên Navbar: Khi chưa đăng nhập trỏ về `account.html`, khi đã đăng nhập tự động chuyển thành menu dropdown hiển thị Avatar, Tên và Huy hiệu 👑 Admin.
  - [x] Nút **Yêu thích** trên Navbar: Liên kết trực tiếp tới [wishlist.html](wishlist.html).
  - [x] Huy hiệu số lượng yêu thích (`#wishlist-count`): Tự động đồng bộ số lượng sản phẩm yêu thích theo thời gian thực khi bấm tim trên bất kỳ sản phẩm nào.
  - [x] Nút tim trên các thẻ sản phẩm tự động sáng đỏ khi sản phẩm đã có trong danh sách mong muốn.

- [x] **6. Kiểm tra các trường nhập sai, chưa có dữ liệu, tạo trang mới và hiển thị trên thiết bị di động.**
  - [x] Bắt lỗi và hiển thị thông báo khi nhập sai mật khẩu, sai định dạng email, để trống trường bắt buộc.
  - [x] Xử lý trạng thái rỗng (Empty state) cho cả Đơn hàng, Sổ địa chỉ và Danh sách yêu thích khi chưa có dữ liệu.
  - [x] Đã tạo mới trang [wishlist.html](wishlist.html) và trang [admin.html](admin.html) (có Route Guard 403 Forbidden).
  - [x] Tối ưu hóa hiển thị Responsive trên mọi kích thước màn hình thiết bị di động (Mobile, Tablet, Desktop).

---

## 🔑 Thông Tin Tài Khoản Thử Nghiệm

| Vai trò | Email đăng nhập | Mật khẩu | Ghi chú |
| :--- | :--- | :--- | :--- |
| 👑 **Quản trị viên (Admin)** | `nhomanhdangcapso1vn@gmail.com` | `admin123` | Tài khoản nhóm chính thức, toàn quyền Admin |
| 👑 **Quản trị viên (Admin)** | `minhgialapnhua2k7@gmail.com` | `admin123` | Tài khoản Admin Google (Minh Lê) |
| 👤 **Khách hàng (User)** | `user@sportzone.vn` | `user123` | Tài khoản thành viên mẫu có sẵn đơn hàng |
| 👤 **Khách hàng (Google)** | `4gkhongnen2k7@gmail.com` | `user123` | Tài khoản thành viên Google (Minh Lê) |
| 👤 **Khách hàng (Google)** | `congm3180@gmail.com` | `user123` | Tài khoản thành viên Google (Cong Minh) |
| 👤 **Khách hàng (Google)** | `minhmuonacc07@gmail.com` | `user123` | Tài khoản thành viên Google (Le Minh) |

---

## 🚀 Cấu Trúc Thư Mục Dự Án

```text
duanlaptrinhweb-main/
├── css/
│   ├── account.css       # Giao diện tài khoản, dashboard, wishlist & popup Chrome OAuth
│   └── style.css         # Giao diện tổng thể website SportZone
├── js/
│   ├── shared.js         # Core Module chia sẻ: API Auth & API Wishlist
│   ├── auth.js           # Module Auth độc lập
│   ├── wishlist.js       # Module Wishlist độc lập
│   └── main.js           # Xử lý giao diện trang chủ, slider, countdown, menu
├── shared/
│   ├── footer.html       # Footer dùng chung
│   └── navbar.html       # Navbar dùng chung
├── account.html          # Trang Đăng nhập / Đăng ký / Hồ sơ cá nhân
├── wishlist.html         # Trang Danh sách yêu thích / Danh sách mong muốn
├── admin.html            # Trang Bảng điều khiển Quản trị viên (Route Guard 403)
├── index.html            # Trang chủ hệ thống SportZone
└── README.md             # Tài liệu dự án & Danh sách kiểm tra nghiệm thu Issue
```
