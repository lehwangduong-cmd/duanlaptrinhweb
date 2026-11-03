# 🏆 SportZone – Website Bán Đồ Thể Thao Đa Môn
> **Đồ án cuối kỳ** | Phong cách Decathlon | Nhóm 5 thành viên

---

## 👥 Phân công nhiệm vụ

| Thành viên | Phụ trách | File/Thư mục chính |
|:---:|---|---|
| **TV1** | Trang chủ, Navbar, Footer, Banner, Responsive | `index.html`, `css/tv1-layout.css`, `js/tv1-main.js`, `shared/` |
| **TV2** | Sản phẩm, Tìm kiếm, Lọc, Chi tiết sản phẩm | `products.html`, `product-detail.html`, `css/tv2-products.css`, `js/tv2-products.js` |
| **TV3** | Đăng ký, Đăng nhập, Tài khoản, Wishlist | `login.html`, `register.html`, `account.html`, `wishlist.html`, `css/tv3-account.css`, `js/tv3-account.js` |
| **TV4** | Giỏ hàng, Đặt hàng, Thanh toán, Lịch sử | `cart.html`, `checkout.html`, `order-history.html`, `css/tv4-cart.css`, `js/tv4-cart.js` |
| **TV5** | Trang Admin, Quản lý toàn hệ thống | `admin/`, `css/tv5-admin.css`, `js/tv5-admin.js` |

---

## 📁 Cấu trúc thư mục

```
duanweb/
│
├── 📄 index.html               ← [TV1] Trang chủ
├── 📄 products.html            ← [TV2] Danh sách sản phẩm
├── 📄 product-detail.html      ← [TV2] Chi tiết sản phẩm
├── 📄 login.html               ← [TV3] Đăng nhập
├── 📄 register.html            ← [TV3] Đăng ký
├── 📄 account.html             ← [TV3] Thông tin tài khoản
├── 📄 wishlist.html            ← [TV3] Danh sách yêu thích
├── 📄 cart.html                ← [TV4] Giỏ hàng
├── 📄 checkout.html            ← [TV4] Thanh toán
├── 📄 order-history.html       ← [TV4] Lịch sử đơn hàng
│
├── 📂 admin/                   ← [TV5] Toàn bộ trang quản trị
│   ├── index.html              ← Dashboard
│   ├── products.html           ← Quản lý sản phẩm & kho hàng
│   ├── customers.html          ← Quản lý khách hàng
│   ├── orders.html             ← Quản lý đơn hàng
│   └── revenue.html            ← Thống kê doanh thu
│
├── 📂 css/
│   ├── variables.css           ← [SHARED] Biến CSS dùng chung (màu, font, spacing)
│   ├── tv1-layout.css          ← [TV1]    Navbar, Footer, Trang chủ, Banner
│   ├── tv2-products.css        ← [TV2]    Trang sản phẩm, tìm kiếm, lọc
│   ├── tv3-account.css         ← [TV3]    Form đăng nhập, tài khoản, wishlist
│   ├── tv4-cart.css            ← [TV4]    Giỏ hàng, checkout, đơn hàng
│   └── tv5-admin.css           ← [TV5]    Giao diện trang Admin
│
├── 📂 js/
│   ├── shared.js               ← [SHARED] Giỏ hàng (localStorage), Auth, Toast
│   ├── tv1-main.js             ← [TV1]    Slider, Countdown, Hamburger, Back-to-top
│   ├── tv2-products.js         ← [TV2]    Lọc sản phẩm, tìm kiếm, phân trang
│   ├── tv3-account.js          ← [TV3]    Đăng nhập, đăng ký, quản lý tài khoản
│   ├── tv4-cart.js             ← [TV4]    Giỏ hàng, coupon, thanh toán
│   └── tv5-admin.js            ← [TV5]    Dashboard, biểu đồ, quản lý CRUD
│
├── 📂 shared/                  ← [TV1] Components dùng chung cho cả nhóm
│   ├── navbar.html             ← Copy navbar vào trang của mình
│   └── footer.html             ← Copy footer vào trang của mình
│
└── 📄 README.md                ← File này – bản đồ dự án
```

---

## 🎨 Quy ước giao diện chung (TV1 định nghĩa)

> Tất cả thành viên phải nhúng `css/variables.css` và `js/shared.js`

### Màu sắc
| Biến | Màu | Dùng cho |
|---|---|---|
| `--primary` | `#0082c3` | Nút chính, liên kết, tiêu đề |
| `--primary-dark` | `#005f91` | Hover, navbar |
| `--accent` | `#f5a623` | CTA, nút nổi bật |
| `--red` | `#e53935` | Badge giảm giá, xóa, lỗi |
| `--green` | `#43a047` | Thành công, hàng mới |

### Class CSS dùng chung
```css
.btn-primary    /* Nút xanh chính */
.btn-outline    /* Nút viền */
.section        /* Section padding chuẩn */
.container      /* Max-width 1280px */
.product-card   /* Card sản phẩm */
```

### JavaScript API dùng chung (shared.js)
```javascript
Cart.addItem(product)        // Thêm vào giỏ hàng
Cart.getItems()              // Lấy danh sách giỏ hàng
Wishlist.toggle(productId)   // Toggle yêu thích
Auth.isLoggedIn()            // Kiểm tra đăng nhập
Auth.getUser()               // Lấy thông tin user
```

---

## 🌿 Quy trình Git của nhóm

```bash
# Bước 1: Lấy code mới nhất từ main
git checkout main
git pull origin main

# Bước 2: Tạo branch riêng (mỗi người 1 lần)
git checkout -b tv2-sanpham     # TV2
git checkout -b tv3-taikhoan    # TV3
git checkout -b tv4-giohang     # TV4
git checkout -b tv5-admin       # TV5

# Bước 3: Làm xong → commit và push
git add .
git commit -m "TV2: Hoan thanh trang san pham va bo loc"
git push origin tv2-sanpham

# Bước 4: Tạo Pull Request trên GitHub để merge vào main
```

> ⚠️ **Không sửa trực tiếp trên nhánh `main`**
> ⚠️ **Không sửa `css/variables.css`, `js/shared.js`, `shared/navbar.html`, `shared/footer.html`** — liên hệ TV1 nếu cần thay đổi

---

## 🚀 Chạy thử dự án

```bash
# Dùng Python (cần Python 3)
python -m http.server 5500

# Mở trình duyệt: http://localhost:5500
```

### TV4: Cart, Checkout, Payment và Order History

Các trang của TV4 nằm trong `pages/`, stylesheet trong `css/`, JavaScript trong `js/`. Chạy server từ thư mục gốc rồi mở `pages/cart.html`. Checkout và Payment dùng chung lịch sử đơn hàng trong `localStorage['sportzone_orders']`.

Thông tin tài khoản và mã QR nhận tiền phải được cấu hình riêng cho môi trường triển khai; không commit dữ liệu ngân hàng cá nhân hoặc mã QR vào repository.

---

## 📋 Tiến độ

| Module | TV | Trạng thái |
|---|:---:|:---:|
| Trang chủ, Navbar, Footer, Banner | TV1 | ✅ Hoàn thành |
| Sản phẩm, Tìm kiếm, Lọc, Chi tiết | TV2 | ✅ Hoàn thành |
| Đăng nhập, Tài khoản, Wishlist | TV3 | ✅ Hoàn thành |

### 📌 TV3: Đăng nhập, Đăng ký, Tài khoản và Wishlist (Hoàn thành 100%)
- [x] **Đăng ký & Đăng nhập:** Form đăng ký (bắt lỗi hợp lệ, mật khẩu >= 6 ký tự), form đăng nhập bằng Email/SĐT, hỗ trợ mã bảo mật Admin (SPORTZONE@ADMIN).
- [x] **Đăng nhập Google:** Nút One-Tap Persona (Đăng nhập với tên Minh Lê), Cửa sổ popup mô phỏng chuẩn xác 100% Google Chrome OAuth (accounts.google.com).
- [x] **Đăng xuất:** Đăng xuất an toàn trên Navbar và Dashboard, xóa session trong LocalStorage và reset giao diện.
- [x] **Hồ sơ khách hàng:** Cập nhật thông tin cá nhân, đổi avatar, sổ địa chỉ (thêm, xóa, mặc định), lịch sử đơn hàng và đổi mật khẩu.
- [x] **Danh sách yêu thích (Wishlist):** Trang wishlist.html hiển thị sản phẩm, thêm/xóa yêu thích, đồng bộ huy hiệu Navbar và trạng thái danh sách trống.
- [x] **Phân quyền Admin & User:** Route Guard 403 Forbidden bảo vệ admin.html, quản lý thành viên (thăng/hạ quyền, khóa/mở khóa) và quản lý đơn hàng.

#### Thông tin tài khoản thử nghiệm TV3:
- **Admin:** nhomanhdangcapso1vn@gmail.com / admin123
- **Admin Google:** minhgialapnhua2k7@gmail.com / admin123
- **User:** user@sportzone.vn / user123
| Giỏ hàng, Thanh toán, Đơn hàng | TV4 | 🔄 Đang làm |
| Trang Admin, Thống kê | TV5 | 🔄 Đang làm |

---

*Mục tiêu: Xây dựng website bán đồ thể thao đa môn theo phong cách Decathlon.*
