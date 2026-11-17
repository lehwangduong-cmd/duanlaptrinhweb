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

### Dữ liệu sản phẩm SportZone

64 sản phẩm mẫu mới (8 cho mỗi danh mục trên trang chủ) được khai báo trong `js/tv2-products.js` tại `SEED_PRODUCT_GROUPS`; sản phẩm mẫu gắn với thương hiệu đối tác tương ứng. Có thêm 9 sản phẩm mẫu ở các thương hiệu Quechua, Geologic và Tribord trong `PARTNER_BRAND_PRODUCTS`. Logo thương hiệu trên trang chủ mở danh sách đã lọc theo thương hiệu, và thông tin thương hiệu được hiển thị trên thẻ sản phẩm cùng trang chi tiết. Mỗi danh mục dùng ảnh SVG placeholder có sẵn; để gán ảnh thật cho riêng một sản phẩm, thêm đường dẫn ảnh làm trường thứ 7 của dòng sản phẩm trong danh mục đó. Ảnh không tải được sẽ quay về placeholder. Dữ liệu mẫu đồng bộ lại đường dẫn ảnh và thương hiệu khi tải trang; thương hiệu do quản trị viên đặt riêng được giữ nguyên.

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

## 🚀 Chạy thử dự án (Fullstack: Frontend + Backend SQLite)

### 1. Khởi động Backend API & SQLite Database
```bash
cd server
npm start
# Server sẽ tự động nạp CSDL SQLite (sportzone.db) và chạy tại http://localhost:5000
```

### 2. Khởi động Frontend
```bash
# Từ thư mục gốc dự án:
python -m http.server 5500
# Hoặc dùng extension "Live Server" trong VS Code (cổng 5500)
# Mở trình duyệt: http://localhost:5500
```

### Deploy fullstack lên Railway

1. Tạo một Railway project từ repository GitHub và chọn branch cần deploy.
2. Trong cấu hình service, đặt **Root Directory** là `/server`.
3. Để giữ dữ liệu SQLite qua các lần deploy, thêm persistent volume và mount tại `/data`. Nếu chỉ chạy demo, bỏ qua volume và đặt `DATABASE_PATH=/tmp/sportzone.db`; dữ liệu demo có thể mất khi Railway khởi động lại service.
4. Thiết lập các biến môi trường:
   - `DATABASE_PATH=/data/sportzone.db` (hoặc `/tmp/sportzone.db` cho demo không volume)
   - `JWT_SECRET` là một chuỗi ngẫu nhiên dài, riêng cho production.
   - `GOOGLE_CLIENT_ID` nếu bật đăng nhập Google.
5. Tạo domain công khai cho service. Frontend và API được phục vụ cùng domain; dữ liệu SQLite được lưu trong volume.

Railway lấy lệnh build, start và health check từ `server/railway.json`. Không đưa `server/.env` hoặc database local vào Git. Sau deploy, kiểm tra `/api/health`. Nếu dùng Google OAuth, thêm domain Railway vào danh sách authorized JavaScript origins trong Google Cloud Console.

### 📡 Danh sách RESTful API Backend (Node.js + SQLite)
* **Auth:**
  * `POST /api/auth/register`: Đăng ký tài khoản (băm mật khẩu `bcrypt`)
  * `POST /api/auth/login`: Đăng nhập cấp mã `JWT Token`
  * `GET  /api/auth/me`: Lấy thông tin user hiện tại qua JWT
  * `PUT  /api/auth/profile`: Cập nhật thông tin cá nhân
  * `POST /api/auth/google`: Xác minh Google OAuth ID Token
* **Products:**
  * `GET    /api/products`: Lấy danh sách sản phẩm (có tìm kiếm, lọc danh mục, giá, phân trang)
  * `GET    /api/products/:id`: Xem chi tiết sản phẩm
  * `POST   /api/products`: (Admin) Thêm sản phẩm mới vào SQLite
  * `PUT    /api/products/:id`: (Admin) Chỉnh sửa sản phẩm
  * `DELETE /api/products/:id`: (Admin) Xóa sản phẩm
* **Orders:**
  * `POST   /api/orders`: Đặt hàng mới (tự động trừ số lượng tồn kho trong SQLite)
  * `GET    /api/orders/my-orders`: Xem đơn hàng của tôi
  * `GET    /api/orders`: (Admin) Xem toàn bộ đơn hàng
  * `PUT    /api/orders/:id/status`: (Admin) Cập nhật trạng thái đơn (chờ duyệt, đang giao, hoàn thành, hủy)
* **Admin Dashboard:**
  * `GET    /api/admin/stats`: Thống kê doanh thu, tổng đơn hàng, sản phẩm, khách hàng, biểu đồ danh mục
  * `GET    /api/admin/users`: Quản lý danh sách thành viên
  * `PUT    /api/admin/users/:id/role`: Thăng/hạ quyền Admin & User

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
| Giỏ hàng, Thanh toán, Đơn hàng | TV4 | 🔄 Đang làm |
| Trang Admin, Thống kê | TV5 | 🔄 Đang làm |

---

*Mục tiêu: Xây dựng website bán đồ thể thao đa môn theo phong cách Decathlon.*

### Ảnh sản phẩm

Ảnh sản phẩm được lưu cục bộ trong `images/products-real/` dưới dạng ảnh vuông 800×800 để dùng thống nhất trên trang chủ, danh sách, chi tiết, giỏ hàng và quản trị. Các ảnh mới tải về lấy từ Unsplash; một số ảnh sản phẩm do chủ dự án cung cấp. Website không phụ thuộc URL ảnh bên ngoài để hiển thị danh mục.
