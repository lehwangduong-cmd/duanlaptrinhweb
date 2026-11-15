/**
 * Seed data for SportZone SQLite Database
 * Contains initial products, default users, and sample orders
 */

const DEFAULT_USERS = [
  {
    id: 'USR-ADMIN-01',
    email: 'nhomanhdangcapso1vn@gmail.com',
    password: 'admin123', // Will be hashed with bcrypt
    fullName: 'Quản Trị Viên Nhóm',
    phone: '0901234567',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces',
    address: 'Trường Đại học - TP. Hồ Chí Minh'
  },
  {
    id: 'USR-ADMIN-02',
    email: 'admin@sportzone.vn',
    password: 'admin123',
    fullName: 'Quản Trị Viên SportZone',
    phone: '0912345678',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=faces',
    address: 'Số 123 Đường Thể Thao, Quận 1, TP. Hồ Chí Minh'
  },
  {
    id: 'USR-DEMO-01',
    email: 'user@sportzone.vn',
    password: 'user123',
    fullName: 'Nguyễn Văn Khách',
    phone: '0987654321',
    role: 'user',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces',
    address: 'Số 456 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh'
  },
  {
    id: 'USR-588278',
    email: 'bolacongminh@gmail.com',
    password: 'user123',
    fullName: 'LÊ CÔNG MINH',
    phone: '0913245687',
    role: 'user',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
    address: 'Hồ Chí Minh'
  },
  {
    id: 'USR-497511',
    email: 'duong123@gmail.com',
    password: 'user123',
    fullName: 'Hoàng Dương',
    phone: '0919001002',
    role: 'user',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces',
    address: 'Hà Nội'
  }
];

const DEFAULT_PRODUCTS = [
  { id: 1, name: 'Giày chạy bộ JogFlow 500 nam', category: 'Chạy bộ', brand: 'Kalenji', price: 899000, oldPrice: 1290000, rating: 4.7, reviews: 128, badge: '-30%', image: 'images/products-real/giay-chay-bo.jpg', icon: 'fa-person-running', sizes: ['39','40','41','42','43'], stock: 18, description: 'Giày chạy bộ nhẹ, êm ái với đế EVA hỗ trợ tốt cho các buổi tập hàng ngày trên đường trường.' },
  { id: 2, name: 'Bóng đá UCL Size 5', category: 'Bóng đá', brand: 'Kipsta', price: 450000, oldPrice: 0, rating: 4.8, reviews: 94, badge: 'Mới', image: 'images/products-real/bong-da.jpg', icon: 'fa-futbol', sizes: ['Size 5'], stock: 25, description: 'Bóng thi đấu size 5 với lớp da PU chắc chắn, độ bền cao và độ nảy ổn định.' },
  { id: 3, name: 'Áo chạy bộ Dry Feel nam', category: 'Chạy bộ', brand: 'Kalenji', price: 249000, oldPrice: 399000, rating: 4.5, reviews: 76, badge: '-38%', image: 'images/products-real/ao-chay-bo.jpg', icon: 'fa-shirt', sizes: ['S','M','L','XL'], stock: 30, description: 'Áo thể thao co giãn nhẹ, thoáng khí và thấm hút mồ hôi nhanh trong mọi hoạt động.' },
  { id: 4, name: 'Bộ vợt cầu lông BR 500', category: 'Cầu lông', brand: 'Artengo', price: 329000, oldPrice: 0, rating: 4.4, reviews: 61, badge: '', image: 'images/products-real/vot-cau-long.jpg', icon: 'fa-table-tennis-paddle-ball', sizes: ['Cặp vợt'], stock: 15, description: 'Bộ vợt phù hợp cho người mới bắt đầu, khung nhẹ và dễ điều khiển cú đánh.' },
  { id: 5, name: 'Kính bơi chống sương mù', category: 'Bơi lội', brand: 'Nabaiji', price: 189000, oldPrice: 290000, rating: 4.6, reviews: 52, badge: '-35%', image: 'images/products-real/kinh-boi.jpg', icon: 'fa-glasses', sizes: ['Free size'], stock: 20, description: 'Kính bơi co giãn mềm, tròng chống sương mù và khóa điều chỉnh dễ sử dụng.' },
  { id: 6, name: 'Bình tập yoga 8mm', category: 'Gym', brand: 'Domyos', price: 399000, oldPrice: 599000, rating: 4.9, reviews: 113, badge: 'Bán chạy', image: 'images/products-real/tham-yoga.jpg', icon: 'fa-person-praying', sizes: ['183 x 61 cm'], stock: 14, description: 'Thảm yoga 8mm giúp tăng độ êm và ổn định, phù hợp cả yoga lẫn luyện sức mạnh.' },
  { id: 7, name: 'Tạ tay vinyl 2kg', category: 'Gym', brand: 'Domyos', price: 279000, oldPrice: 320000, rating: 4.3, reviews: 38, badge: '-13%', image: 'images/products-real/ta-tay.jpg', icon: 'fa-dumbbell', sizes: ['2 kg','4 kg'], stock: 22, description: 'Tạ tay bọc vinyl dễ vệ sinh, cầm chắc tay và phù hợp tập sức mạnh tại nhà.' },
  { id: 8, name: 'Giày đá bóng Viralto III', category: 'Bóng đá', brand: 'Kipsta', price: 1190000, oldPrice: 1690000, rating: 4.8, reviews: 87, badge: '-30%', image: 'images/products-real/giay-da-bong.jpg', icon: 'fa-futbol', sizes: ['39','40','41','42','43'], stock: 10, description: 'Giày sân cỏ nhân tạo có độ bám tốt, thiết kế ôm chân và hỗ trợ tăng tốc.' },
  { id: 9, name: 'Mũ bơi silicone', category: 'Bơi lội', brand: 'Nabaiji', price: 99000, oldPrice: 0, rating: 4.2, reviews: 44, badge: '', image: 'images/products-real/mu-boi.jpg', icon: 'fa-water', sizes: ['Free size'], stock: 40, description: 'Mũ bơi silicone mềm, bám đầu tốt và phù hợp cho cả tập luyện lẫn thi đấu.' },
  { id: 10, name: 'Đồng hồ thể thao GPS', category: 'Chạy bộ', brand: 'Kalenji', price: 1590000, oldPrice: 1990000, rating: 4.7, reviews: 105, badge: '-20%', image: 'images/products-real/dong-ho-gps.jpg', icon: 'fa-clock', sizes: ['38 mm'], stock: 8, description: 'Đồng hồ theo dõi quãng đường, nhịp tim, pace và GPS cho mọi buổi luyện chạy.' },
  { id: 11, name: 'Áo đấu đội tuyển Việt Nam', category: 'Bóng đá', brand: 'Kipsta', price: 399000, oldPrice: 499000, rating: 4.6, reviews: 71, badge: 'Mới', image: 'images/products-real/ao-dau.jpg', icon: 'fa-shirt', sizes: ['S','M','L','XL','XXL'], stock: 16, description: 'Áo thi đấu thể thao fabric thoáng mát, sắc đỏ truyền thống và đường may chắc chắn.' },
  { id: 12, name: 'Balo gym 30L', category: 'Gym', brand: 'Domyos', price: 349000, oldPrice: 449000, rating: 4.5, reviews: 49, badge: '', image: 'images/products-real/balo-gym.jpg', icon: 'fa-bag-shopping', sizes: ['30L'], stock: 19, description: 'Balo thể thao nhiều ngăn, quai đeo êm và ngăn riêng chống thấm cho đồ dùng tập luyện.' }
];

const SEED_PRODUCT_GROUPS = [
  {
    category: 'Chạy bộ', brand: 'Kalenji', image: 'images/products/ao-chay-bo.svg', icon: 'fa-person-running',
    products: [
      ['Áo chạy bộ AirFlow', 289000, 'Áo chạy bộ nhẹ, thoáng khí và nhanh khô cho các buổi tập hằng ngày.', ['S','M','L','XL'], 24, 'images/products/running-airflow-shirt.png'],
      ['Quần short chạy bộ Sprint', 319000, 'Quần short co giãn có lớp lót thoáng khí và túi khóa kéo tiện dụng.', ['S','M','L','XL'], 18, 'images/products/running-sprint-shorts.png'],
      ['Áo khoác chạy bộ WindLite', 579000, 'Áo khoác chắn gió mỏng nhẹ, dễ gấp gọn khi chạy ngoài trời.', ['S','M','L','XL'], 12, 'images/products/running-windlite-jacket.png'],
      ['Tất chạy bộ Cushion', 99000, 'Tất đệm êm hỗ trợ giảm ma sát và giữ bàn chân khô ráo.', ['S/M','L/XL'], 40, 'images/products/running-cushion-socks.png'],
      ['Đai chạy bộ phản quang', 159000, 'Đai đeo gọn nhẹ có ngăn điện thoại và dải phản quang buổi tối.', ['Free size'], 16, 'images/products/running-reflective-belt.png'],
      ['Bình nước chạy bộ 700ml', 129000, 'Bình thể thao nắp bật chống rò, dung tích phù hợp khi luyện chạy.', ['700 ml'], 30, 'images/products/running-700ml-bottle.png'],
      ['Mũ chạy bộ thoáng khí', 199000, 'Mũ lưỡi trai thể thao có lỗ thoáng khí và khóa điều chỉnh phía sau.', ['Free size'], 21, 'images/products/ao-chay-bo.svg'],
      ['Găng tay chạy bộ mùa lạnh', 229000, 'Găng tay co giãn nhẹ, đầu ngón tương thích màn hình cảm ứng.', ['S','M','L'], 14, 'images/products/ao-chay-bo.svg']
    ]
  },
  {
    category: 'Bóng đá', brand: 'Kipsta', image: 'images/products/bong-da.svg', icon: 'fa-futbol',
    products: [
      ['Bóng đá tập luyện Striker 5', 399000, 'Bóng size 5 bền chắc, phù hợp luyện tập trên sân cỏ nhân tạo.', ['Size 5'], 25, 'images/products/football-striker-ball.png'],
      ['Giày bóng đá TF Speed', 1090000, 'Giày đế TF bám sân tốt, thân giày ôm chân khi tăng tốc.', ['39','40','41','42','43','44'], 13, 'images/products/football-tf-speed-boots.png'],
      ['Áo bóng đá training Pro', 329000, 'Áo tập vải nhẹ thoáng khí, nhanh khô khi vận động cường độ cao.', ['S','M','L','XL','XXL'], 27, 'images/products/football-training-shirt.png'],
      ['Quần short bóng đá Flex', 199000, 'Quần short co giãn linh hoạt, cạp chun chắc chắn và thoải mái.', ['S','M','L','XL','XXL'], 22, 'images/products/football-shorts-flex.png'],
      ['Túi đựng giày đá bóng', 179000, 'Túi đựng giày riêng biệt bằng chất liệu dễ vệ sinh, có quai xách.', ['Free size'], 17, 'images/products/football-shoe-bag.png'],
      ['Bảo vệ ống đồng Shield', 149000, 'Ốp ống đồng nhẹ vừa vặn, hỗ trợ bảo vệ khi tập luyện và thi đấu.', ['S','M','L'], 20, 'images/products/football-shin-guards.png'],
      ['Găng tay thủ môn Grip', 459000, 'Găng thủ môn có lòng bàn tay tăng độ bám và cổ tay quấn chắc chắn.', ['7','8','9','10'], 9, 'images/products/bong-da.svg'],
      ['Băng đội trưởng sân cỏ', 89000, 'Băng đội trưởng co giãn, dễ đeo và giữ cố định trong trận đấu.', ['Free size'], 32, 'images/products/bong-da.svg']
    ]
  },
  {
    category: 'Gym', brand: 'Domyos', image: 'images/products/ta-tay.svg', icon: 'fa-dumbbell',
    products: [
      ['Tạ ấm Kettlebell 6kg', 449000, 'Tạ ấm tay cầm chắc chắn, hỗ trợ các bài tập sức mạnh toàn thân.', ['6 kg'], 11, 'images/products/ta-tay.svg'],
      ['Dây kháng lực đa năng', 219000, 'Bộ dây kháng lực nhiều mức lực cản cho khởi động và tập tại nhà.', ['Bộ 3 dây'], 26, 'images/products/ta-tay.svg'],
      ['Con lăn tập bụng CoreRoll', 259000, 'Con lăn có tay cầm chống trượt và bánh xe lăn ổn định.', ['Free size'], 15, 'images/products/ta-tay.svg'],
      ['Găng tay tập gym Grip', 189000, 'Găng tay có đệm lòng bàn tay, tăng độ bám khi nâng tạ.', ['S','M','L','XL'], 23, 'images/products/ta-tay.svg'],
      ['Dây nhảy tốc độ SpeedRope', 139000, 'Dây nhảy điều chỉnh độ dài, tay cầm nhẹ cho bài tập cardio.', ['2.8 m'], 31, 'images/products/ta-tay.svg'],
      ['Đai lưng tập tạ Support', 399000, 'Đai lưng hỗ trợ ổn định thân người trong các bài nâng tạ.', ['S','M','L','XL'], 10, 'images/products/ta-tay.svg'],
      ['Bóng tập gym 65cm', 329000, 'Bóng tập chịu lực, phù hợp bài tập thăng bằng và tăng cường cơ lõi.', ['65 cm'], 14, 'images/products/ta-tay.svg'],
      ['Con lăn massage cơ bắp', 199000, 'Con lăn bề mặt gân giúp thư giãn cơ sau buổi tập thể lực.', ['33 cm'], 19, 'images/products/ta-tay.svg']
    ]
  },
  {
    category: 'Bơi lội', brand: 'Nabaiji', image: 'images/products/kinh-boi.svg', icon: 'fa-person-swimming',
    products: [
      ['Đồ bơi liền thân AquaFit', 459000, 'Đồ bơi co giãn nhanh khô, ôm vừa vặn cho buổi tập trong hồ.', ['S','M','L','XL'], 15, 'images/products/kinh-boi.svg'],
      ['Quần bơi nam SwimFast', 279000, 'Quần bơi vải co giãn nhanh khô, dây rút điều chỉnh chắc chắn.', ['S','M','L','XL'], 18, 'images/products/kinh-boi.svg'],
      ['Kính bơi trẻ em ClearView', 159000, 'Kính bơi có dây điều chỉnh và tròng nhìn rõ dưới nước.', ['Free size'], 23, 'images/products/kinh-boi.svg'],
      ['Phao tập bơi kẹp chân', 189000, 'Phao nhẹ hỗ trợ tập kỹ thuật chân và giữ tư thế ổn định.', ['Free size'], 12, 'images/products/kinh-boi.svg'],
      ['Dép hồ bơi chống trượt', 219000, 'Dép thoát nước nhanh với đế chống trượt trên bề mặt ướt.', ['38','39','40','41','42','43'], 19, 'images/products/kinh-boi.svg'],
      ['Khăn microfiber bơi lội', 119000, 'Khăn mềm nhẹ, thấm hút nhanh và gấp gọn sau khi bơi.', ['40 x 80 cm'], 34, 'images/products/kinh-boi.svg'],
      ['Túi đựng đồ bơi chống nước', 249000, 'Túi gọn nhẹ giúp tách đồ ướt sau khi bơi khỏi vật dụng khô.', ['Free size'], 16, 'images/products/kinh-boi.svg'],
      ['Áo phao tập bơi trẻ em', 389000, 'Áo phao có khóa cài điều chỉnh, hỗ trợ trẻ làm quen với nước.', ['S','M','L'], 8, 'images/products/kinh-boi.svg']
    ]
  },
  {
    category: 'Yoga', brand: 'Domyos', image: 'images/products/tham-yoga.svg', icon: 'fa-person-praying',
    products: [
      ['Thảm yoga TPE Balance 6mm', 359000, 'Thảm TPE êm và bám sàn, phù hợp yoga cơ bản và giãn cơ.', ['183 x 61 cm'], 17, 'images/products/tham-yoga.svg'],
      ['Gạch tập yoga EVA', 99000, 'Gạch yoga nhẹ hỗ trợ giữ thăng bằng và điều chỉnh tư thế.', ['23 x 15 x 7.5 cm'], 28, 'images/products/tham-yoga.svg'],
      ['Dây đai yoga Stretch', 129000, 'Dây đai hỗ trợ kéo giãn cơ và mở rộng biên độ động tác.', ['183 cm'], 22, 'images/products/tham-yoga.svg'],
      ['Bóng tập Pilates 25cm', 89000, 'Bóng Pilates mềm giúp đa dạng bài tập thăng bằng và cơ lõi.', ['25 cm'], 30, 'images/products/tham-yoga.svg'],
      ['Vòng yoga hỗ trợ lưng', 299000, 'Vòng yoga chắc chắn hỗ trợ kéo giãn lưng và vai.', ['32 cm'], 12, 'images/products/tham-yoga.svg'],
      ['Khăn phủ thảm yoga', 229000, 'Khăn phủ thảm thấm hút mồ hôi, giữ bề mặt tập luyện sạch sẽ.', ['183 x 63 cm'], 15, 'images/products/tham-yoga.svg'],
      ['Túi đựng thảm yoga', 199000, 'Túi đeo vai có dây điều chỉnh, vừa với thảm tập tiêu chuẩn.', ['183 cm'], 20, 'images/products/tham-yoga.svg'],
      ['Gối thiền ngồi Yoga', 349000, 'Gối thiền có lớp vỏ tháo giặt, giúp tư thế ngồi thoải mái hơn.', ['35 x 15 cm'], 9, 'images/products/tham-yoga.svg']
    ]
  },
  {
    category: 'Cầu lông', brand: 'Artengo', image: 'images/products/vot-cau-long.svg', icon: 'fa-table-tennis-paddle-ball',
    products: [
      ['Vợt cầu lông Carbon Lite', 799000, 'Vợt carbon nhẹ, cân bằng linh hoạt cho người chơi phong trào.', ['4U/G5'], 11, 'images/products/badminton-racket.png'],
      ['Cầu lông lông vũ (hộp 12)', 249000, 'Cầu lông có quỹ đạo ổn định, phù hợp tập luyện và thi đấu.', ['Hộp 12 quả'], 29, 'images/products/badminton-shuttlecock.png'],
      ['Giày cầu lông CourtFlex', 890000, 'Giày đế bám sàn trong nhà, hỗ trợ di chuyển ngang linh hoạt.', ['38','39','40','41','42','43'], 12, 'images/products/badminton-shoes.png'],
      ['Túi cầu lông 2 ngăn', 429000, 'Túi đựng vợt hai ngăn có quai đeo và ngăn phụ kiện tiện lợi.', ['6 vợt'], 13, 'images/products/badminton-bag.png'],
      ['Quấn cán vợt (bộ 3 cuộn)', 89000, 'Quấn cán thấm hút tốt, tăng độ bám và thay mới nhanh chóng.', ['Bộ 3 cuộn'], 38, 'images/products/badminton-grip.png'],
      ['Băng cổ tay cầu lông', 79000, 'Băng cổ tay co giãn mềm, thấm mồ hôi khi chơi cầu lông.', ['Free size'], 40, 'images/products/badminton-wristband.png'],
      ['Lưới cầu lông tập luyện', 599000, 'Lưới chắc chắn, lắp đặt gọn cho sân tập và chơi giải trí.', ['6.1 m'], 7, 'images/products/badminton-net.png'],
      ['Bộ cước căng vợt 10m', 119000, 'Dây cước bền và đàn hồi tốt, phù hợp thay cước vợt cầu lông.', ['10 m'], 19, 'images/products/badminton-string.png']
    ]
  }
];

const PARTNER_PRODUCTS = [
  { id: 2001, name: 'Balo leo núi Trek 30L', category: 'Ngoài trời', brand: 'Quechua', price: 899000, oldPrice: 1099000, rating: 4.7, reviews: 36, badge: '', image: 'images/products-real/balo-leo-nui.jpg', icon: 'fa-person-hiking', sizes: ['30L'], stock: 12, description: 'Balo leo núi nhiều ngăn, có đai trợ lực và lớp phủ hỗ trợ chống mưa nhẹ.' },
  { id: 2010, name: 'Giày chạy bộ Run Active Pro', category: 'Chạy bộ', brand: 'Kalenji', price: 3180000, oldPrice: 4539000, rating: 4.8, reviews: 15, badge: '-30%', image: 'assets/products/featured-running-shoe.png', icon: 'fa-shoe-prints', sizes: ['39','40','41','42','43','44'], stock: 15, description: 'Giày chạy bộ nhẹ và êm, thiết kế đế hỗ trợ độ bám và chuyển động linh hoạt.' },
  { id: 2011, name: 'Áo thi đấu CLB Man City 2026', category: 'Bóng đá', brand: 'Kipsta', price: 2800000, oldPrice: 3000000, rating: 4.7, reviews: 20, badge: 'Mới', image: 'assets/products/featured-man-city-jersey.png', icon: 'fa-shirt', sizes: ['S','M','L','XL','XXL'], stock: 20, description: 'Áo thi đấu bóng đá chất liệu thoáng khí, phom thể thao thoải mái.' },
  { id: 2012, name: 'Thảm Yoga TPE 6mm cao cấp', category: 'Yoga', brand: 'Domyos', price: 1590000, oldPrice: 1900000, rating: 4.8, reviews: 18, badge: '-40%', image: 'assets/products/featured-yoga-mat.png', icon: 'fa-person-praying', sizes: ['183 x 61 cm'], stock: 18, description: 'Thảm TPE dày 6mm có bề mặt bám tốt, hỗ trợ giữ thăng bằng và êm khi tập yoga.' },
  { id: 2013, name: 'Kính bơi chống tia UV Easy', category: 'Bơi lội', brand: 'Nabaiji', price: 179000, oldPrice: 229000, rating: 4.6, reviews: 24, badge: '', image: 'assets/products/featured-swim-goggles.png', icon: 'fa-glasses', sizes: ['Free size'], stock: 24, description: 'Kính bơi tròng chống tia UV, dây đeo điều chỉnh linh hoạt và ôm vừa vặn.' }
];

// Combine all product lists
function getAllSeedProducts() {
  const all = [...DEFAULT_PRODUCTS];

  SEED_PRODUCT_GROUPS.forEach((group, gIdx) => {
    group.products.forEach(([name, price, description, sizes, stock, img], pIdx) => {
      all.push({
        id: 1000 + gIdx * 10 + pIdx + 1,
        name,
        category: group.category,
        brand: group.brand,
        price,
        oldPrice: 0,
        rating: 4.6,
        reviews: Math.floor(Math.random() * 50) + 10,
        badge: pIdx === 0 ? 'Mới' : '',
        image: img || group.image,
        icon: group.icon,
        sizes: sizes || ['Free size'],
        stock: stock || 20,
        description: description || ''
      });
    });
  });

  all.push(...PARTNER_PRODUCTS);
  return all;
}

const DEFAULT_ORDERS = [
  {
    id: 'SZ-ORD-882194',
    userId: 'USR-DEMO-01',
    customerName: 'Nguyễn Văn Khách',
    customerEmail: 'user@sportzone.vn',
    customerPhone: '0987654321',
    shippingAddress: 'Số 456 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
    paymentMethod: 'cod',
    paymentStatus: 'unpaid',
    orderStatus: 'delivered',
    items: [
      { id: 1, name: 'Giày chạy bộ JogFlow 500 nam', price: 899000, quantity: 1, size: '42', image: 'images/products-real/giay-chay-bo.jpg' },
      { id: 2, name: 'Bóng đá UCL Size 5', price: 450000, quantity: 1, size: 'Size 5', image: 'images/products-real/bong-da.jpg' }
    ],
    subtotal: 1349000,
    shippingFee: 0,
    totalAmount: 1349000,
    notes: 'Giao giờ hành chính',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 'SZ-ORD-913402',
    userId: 'USR-DEMO-01',
    customerName: 'Nguyễn Văn Khách',
    customerEmail: 'user@sportzone.vn',
    customerPhone: '0987654321',
    shippingAddress: 'Số 456 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
    paymentMethod: 'bank_transfer',
    paymentStatus: 'paid',
    orderStatus: 'shipping',
    items: [
      { id: 6, name: 'Bình tập yoga 8mm', price: 399000, quantity: 2, size: '183 x 61 cm', image: 'images/products-real/tham-yoga.jpg' }
    ],
    subtotal: 798000,
    shippingFee: 30000,
    totalAmount: 828000,
    notes: 'Gọi trước khi giao 15 phút',
    createdAt: new Date(Date.now() - 86400000).toISOString()
  }
];

module.exports = {
  DEFAULT_USERS,
  getAllSeedProducts,
  DEFAULT_ORDERS
};
