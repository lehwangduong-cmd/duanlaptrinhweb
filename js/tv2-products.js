/**
 * tv2-products.js – JavaScript của TV2
 * Phụ trách: Lọc sản phẩm, tìm kiếm, phân trang,
 *            trang chi tiết sản phẩm (zoom ảnh, chọn size, màu)
 *
 * Nhúng ở cuối file HTML của TV2 (sau shared.js):
 * <script src="js/shared.js"></script>
 * <script src="js/tv2-products.js"></script>
 */

// Danh sách 12 sản phẩm gốc của SportZone (dùng làm mặc định / fallback)
const DEFAULT_PRODUCTS = [
  {id:1,name:'Giày chạy bộ JogFlow 500 nam',category:'Chạy bộ',price:899000,oldPrice:1290000,rating:4.7,reviews:128,badge:'-30%',image:'images/products-real/giay-chay-bo.jpg',icon:'fa-person-running',sizes:['39','40','41','42','43'],stock:18,description:'Giày chạy bộ nhẹ, êm ái với đế EVA hỗ trợ tốt cho các buổi tập hàng ngày trên đường trường.'},
  {id:2,name:'Bóng đá UCL Size 5',category:'Bóng đá',price:450000,oldPrice:0,rating:4.8,reviews:94,badge:'Mới',image:'images/products-real/bong-da.jpg',icon:'fa-futbol',sizes:['Size 5'],stock:25,description:'Bóng thi đấu size 5 với lớp da PU chắc chắn, độ bền cao và độ nảy ổn định.'},
  {id:3,name:'Áo chạy bộ Dry Feel nam',category:'Chạy bộ',price:249000,oldPrice:399000,rating:4.5,reviews:76,badge:'-38%',image:'images/products-real/ao-chay-bo.jpg',icon:'fa-shirt',sizes:['S','M','L','XL'],stock:30,description:'Áo thể thao co giãn nhẹ, thoáng khí và thấm hút mồ hôi nhanh trong mọi hoạt động.'},
  {id:4,name:'Bộ vợt cầu lông BR 500',category:'Cầu lông',price:329000,oldPrice:0,rating:4.4,reviews:61,image:'images/products-real/vot-cau-long.jpg',icon:'fa-table-tennis-paddle-ball',sizes:['Cặp vợt'],stock:15,description:'Bộ vợt phù hợp cho người mới bắt đầu, khung nhẹ và dễ điều khiển cú đánh.'},
  {id:5,name:'Kính bơi chống sương mù',category:'Bơi lội',price:189000,oldPrice:290000,rating:4.6,reviews:52,badge:'-35%',image:'images/products-real/kinh-boi.jpg',icon:'fa-glasses',sizes:['Free size'],stock:20,description:'Kính bơi co giãn mềm, tròng chống sương mù và khóa điều chỉnh dễ sử dụng.'},
  {id:6,name:'Bình tập yoga 8mm',category:'Gym',price:399000,oldPrice:599000,rating:4.9,reviews:113,badge:'Bán chạy',image:'images/products-real/tham-yoga.jpg',icon:'fa-person-praying',sizes:['183 x 61 cm'],stock:14,description:'Thảm yoga 8mm giúp tăng độ êm và ổn định, phù hợp cả yoga lẫn luyện sức mạnh.'},
  {id:7,name:'Tạ tay vinyl 2kg',category:'Gym',price:279000,oldPrice:320000,rating:4.3,reviews:38,badge:'-13%',image:'images/products-real/ta-tay.jpg',icon:'fa-dumbbell',sizes:['2 kg','4 kg'],stock:22,description:'Tạ tay bọc vinyl dễ vệ sinh, cầm chắc tay và phù hợp tập sức mạnh tại nhà.'},
  {id:8,name:'Giày đá bóng Viralto III',category:'Bóng đá',price:1190000,oldPrice:1690000,rating:4.8,reviews:87,badge:'-30%',image:'images/products-real/giay-da-bong.jpg',icon:'fa-futbol',sizes:['39','40','41','42','43'],stock:10,description:'Giày sân cỏ nhân tạo có độ bám tốt, thiết kế ôm chân và hỗ trợ tăng tốc.'},
  {id:9,name:'Mũ bơi silicone',category:'Bơi lội',price:99000,oldPrice:0,rating:4.2,reviews:44,image:'images/products-real/mu-boi.jpg',icon:'fa-water',sizes:['Free size'],stock:40,description:'Mũ bơi silicone mềm, bám đầu tốt và phù hợp cho cả tập luyện lẫn thi đấu.'},
  {id:10,name:'Đồng hồ thể thao GPS',category:'Chạy bộ',price:1590000,oldPrice:1990000,rating:4.7,reviews:105,badge:'-20%',image:'images/products-real/dong-ho-gps.jpg',icon:'fa-clock',sizes:['38 mm'],stock:8,description:'Đồng hồ theo dõi quãng đường, nhịp tim, pace và GPS cho mọi buổi luyện chạy.'},
  {id:11,name:'Áo đấu đội tuyển Việt Nam',category:'Bóng đá',price:399000,oldPrice:499000,rating:4.6,reviews:71,badge:'Mới',image:'images/products-real/ao-dau.jpg',icon:'fa-shirt',sizes:['S','M','L','XL','XXL'],stock:16,description:'Áo thi đấu thể thao fabric thoáng mát, sắc đỏ truyền thống và đường may chắc chắn.'},
  {id:12,name:'Balo gym 30L',category:'Gym',price:349000,oldPrice:449000,rating:4.5,reviews:49,image:'images/products-real/balo-gym.jpg',icon:'fa-bag-shopping',sizes:['30L'],stock:19,description:'Balo thể thao nhiều ngăn, quai đeo êm và ngăn riêng chống thấm cho đồ dùng tập luyện.'}
];

const SEED_PRODUCT_GROUPS = [
  {
    category: 'Chạy bộ', image: 'images/products/ao-chay-bo.svg', icon: 'fa-person-running',
    products: [
      ['Áo chạy bộ AirFlow', 289000, 'Áo chạy bộ nhẹ, thoáng khí và nhanh khô cho các buổi tập hằng ngày.', ['Đen','Xanh navy','Cam'], ['S','M','L','XL'], 24],
      ['Quần short chạy bộ Sprint', 319000, 'Quần short co giãn có lớp lót thoáng khí và túi khóa kéo tiện dụng.', ['Đen','Xám'], ['S','M','L','XL'], 18],
      ['Áo khoác chạy bộ WindLite', 579000, 'Áo khoác chắn gió mỏng nhẹ, dễ gấp gọn khi chạy ngoài trời.', ['Đen','Xanh lá'], ['S','M','L','XL'], 12],
      ['Tất chạy bộ Cushion', 99000, 'Tất đệm êm hỗ trợ giảm ma sát và giữ bàn chân khô ráo.', ['Trắng','Đen'], ['S/M','L/XL'], 40],
      ['Đai chạy bộ phản quang', 159000, 'Đai đeo gọn nhẹ có ngăn điện thoại và dải phản quang buổi tối.', ['Đen','Xanh'], ['Free size'], 16],
      ['Bình nước chạy bộ 700ml', 129000, 'Bình thể thao nắp bật chống rò, dung tích phù hợp khi luyện chạy.', ['Xanh','Đen','Cam'], ['700 ml'], 30],
      ['Mũ chạy bộ thoáng khí', 199000, 'Mũ lưỡi trai thể thao có lỗ thoáng khí và khóa điều chỉnh phía sau.', ['Trắng','Đen','Xanh navy'], ['Free size'], 21],
      ['Găng tay chạy bộ mùa lạnh', 229000, 'Găng tay co giãn nhẹ, đầu ngón tương thích màn hình cảm ứng.', ['Đen','Xám'], ['S','M','L'], 14]
    ]
  },
  {
    category: 'Bóng đá', image: 'images/products/bong-da.svg', icon: 'fa-futbol',
    products: [
      ['Bóng đá tập luyện Striker 5', 399000, 'Bóng size 5 bền chắc, phù hợp luyện tập trên sân cỏ nhân tạo.', ['Trắng','Cam','Xanh'], ['Size 5'], 25],
      ['Giày bóng đá TF Speed', 1090000, 'Giày đế TF bám sân tốt, thân giày ôm chân khi tăng tốc.', ['Đen','Trắng','Đỏ'], ['39','40','41','42','43','44'], 13],
      ['Áo bóng đá training Pro', 329000, 'Áo tập vải nhẹ thoáng khí, nhanh khô khi vận động cường độ cao.', ['Đỏ','Xanh navy','Trắng'], ['S','M','L','XL','XXL'], 27],
      ['Quần short bóng đá Flex', 199000, 'Quần short co giãn linh hoạt, cạp chun chắc chắn và thoải mái.', ['Đen','Xanh navy'], ['S','M','L','XL','XXL'], 22],
      ['Túi đựng giày đá bóng', 179000, 'Túi đựng giày riêng biệt bằng chất liệu dễ vệ sinh, có quai xách.', ['Đen','Đỏ'], ['Free size'], 17],
      ['Bảo vệ ống đồng Shield', 149000, 'Ốp ống đồng nhẹ vừa vặn, hỗ trợ bảo vệ khi tập luyện và thi đấu.', ['Đen','Trắng'], ['S','M','L'], 20],
      ['Găng tay thủ môn Grip', 459000, 'Găng thủ môn có lòng bàn tay tăng độ bám và cổ tay quấn chắc chắn.', ['Đen','Xanh lá'], ['7','8','9','10'], 9],
      ['Băng đội trưởng sân cỏ', 89000, 'Băng đội trưởng co giãn, dễ đeo và giữ cố định trong trận đấu.', ['Đỏ','Xanh','Vàng'], ['Free size'], 32]
    ]
  },
  {
    category: 'Gym', image: 'images/products/ta-tay.svg', icon: 'fa-dumbbell',
    products: [
      ['Tạ ấm Kettlebell 6kg', 449000, 'Tạ ấm tay cầm chắc chắn, hỗ trợ các bài tập sức mạnh toàn thân.', ['Đen','Xanh'], ['6 kg'], 11],
      ['Dây kháng lực đa năng', 219000, 'Bộ dây kháng lực nhiều mức lực cản cho khởi động và tập tại nhà.', ['Hồng','Xanh','Đen'], ['Bộ 3 dây'], 26],
      ['Con lăn tập bụng CoreRoll', 259000, 'Con lăn có tay cầm chống trượt và bánh xe lăn ổn định.', ['Đen','Xanh'], ['Free size'], 15],
      ['Găng tay tập gym Grip', 189000, 'Găng tay có đệm lòng bàn tay, tăng độ bám khi nâng tạ.', ['Đen','Xám'], ['S','M','L','XL'], 23],
      ['Dây nhảy tốc độ SpeedRope', 139000, 'Dây nhảy điều chỉnh độ dài, tay cầm nhẹ cho bài tập cardio.', ['Đen','Đỏ','Xanh'], ['2.8 m'], 31],
      ['Đai lưng tập tạ Support', 399000, 'Đai lưng hỗ trợ ổn định thân người trong các bài nâng tạ.', ['Đen'], ['S','M','L','XL'], 10],
      ['Bóng tập gym 65cm', 329000, 'Bóng tập chịu lực, phù hợp bài tập thăng bằng và tăng cường cơ lõi.', ['Tím','Xanh','Xám'], ['65 cm'], 14],
      ['Con lăn massage cơ bắp', 199000, 'Con lăn bề mặt gân giúp thư giãn cơ sau buổi tập thể lực.', ['Đen','Cam'], ['33 cm'], 19]
    ]
  },
  {
    category: 'Bơi lội', image: 'images/products/kinh-boi.svg', icon: 'fa-person-swimming',
    products: [
      ['Đồ bơi liền thân AquaFit', 459000, 'Đồ bơi co giãn nhanh khô, ôm vừa vặn cho buổi tập trong hồ.', ['Xanh navy','Đen','Tím'], ['S','M','L','XL'], 15],
      ['Quần bơi nam SwimFast', 279000, 'Quần bơi vải co giãn nhanh khô, dây rút điều chỉnh chắc chắn.', ['Đen','Xanh navy'], ['S','M','L','XL'], 18],
      ['Kính bơi trẻ em ClearView', 159000, 'Kính bơi có dây điều chỉnh và tròng nhìn rõ dưới nước.', ['Xanh','Hồng','Vàng'], ['Free size'], 23],
      ['Phao tập bơi kẹp chân', 189000, 'Phao nhẹ hỗ trợ tập kỹ thuật chân và giữ tư thế ổn định.', ['Xanh','Vàng'], ['Free size'], 12],
      ['Dép hồ bơi chống trượt', 219000, 'Dép thoát nước nhanh với đế chống trượt trên bề mặt ướt.', ['Đen','Xanh'], ['38','39','40','41','42','43'], 19],
      ['Khăn microfiber bơi lội', 119000, 'Khăn mềm nhẹ, thấm hút nhanh và gấp gọn sau khi bơi.', ['Xanh','Hồng','Xám'], ['40 x 80 cm'], 34],
      ['Túi đựng đồ bơi chống nước', 249000, 'Túi gọn nhẹ giúp tách đồ ướt sau khi bơi khỏi vật dụng khô.', ['Đen','Xanh biển'], ['Free size'], 16],
      ['Áo phao tập bơi trẻ em', 389000, 'Áo phao có khóa cài điều chỉnh, hỗ trợ trẻ làm quen với nước.', ['Cam','Vàng'], ['S','M','L'], 8]
    ]
  },
  {
    category: 'Yoga', image: 'images/products/tham-yoga.svg', icon: 'fa-person-praying',
    products: [
      ['Thảm yoga TPE Balance 6mm', 359000, 'Thảm TPE êm và bám sàn, phù hợp yoga cơ bản và giãn cơ.', ['Tím','Xanh lá','Hồng'], ['183 x 61 cm'], 17],
      ['Gạch tập yoga EVA', 99000, 'Gạch yoga nhẹ hỗ trợ giữ thăng bằng và điều chỉnh tư thế.', ['Tím','Xanh','Xám'], ['23 x 15 x 7.5 cm'], 28],
      ['Dây đai yoga Stretch', 129000, 'Dây đai hỗ trợ kéo giãn cơ và mở rộng biên độ động tác.', ['Tím','Xanh navy'], ['183 cm'], 22],
      ['Bóng tập Pilates 25cm', 89000, 'Bóng Pilates mềm giúp đa dạng bài tập thăng bằng và cơ lõi.', ['Hồng','Xanh','Tím'], ['25 cm'], 30],
      ['Vòng yoga hỗ trợ lưng', 299000, 'Vòng yoga chắc chắn hỗ trợ kéo giãn lưng và vai.', ['Đen','Tím'], ['32 cm'], 12],
      ['Khăn phủ thảm yoga', 229000, 'Khăn phủ thảm thấm hút mồ hôi, giữ bề mặt tập luyện sạch sẽ.', ['Hồng','Xanh','Xám'], ['183 x 63 cm'], 15],
      ['Túi đựng thảm yoga', 199000, 'Túi đeo vai có dây điều chỉnh, vừa với thảm tập tiêu chuẩn.', ['Đen','Tím','Xanh'], ['183 cm'], 20],
      ['Gối thiền ngồi Yoga', 349000, 'Gối thiền có lớp vỏ tháo giặt, giúp tư thế ngồi thoải mái hơn.', ['Tím','Be','Xanh lá'], ['35 x 15 cm'], 9]
    ]
  },
  {
    category: 'Xe đạp', image: 'images/products/dong-ho-gps.svg', icon: 'fa-bicycle',
    products: [
      ['Mũ bảo hiểm xe đạp Aero', 499000, 'Mũ bảo hiểm nhẹ có khe thoáng khí và núm điều chỉnh vòng đầu.', ['Đen','Trắng','Đỏ'], ['M','L'], 12],
      ['Đèn trước xe đạp USB', 229000, 'Đèn trước sạc USB với nhiều chế độ chiếu sáng khi đi tối.', ['Đen'], ['Free size'], 21],
      ['Đèn hậu xe đạp an toàn', 149000, 'Đèn hậu nhỏ gọn có chế độ nháy giúp tăng khả năng nhận diện.', ['Đỏ','Đen'], ['Free size'], 25],
      ['Găng tay xe đạp Gel', 259000, 'Găng tay có đệm gel giảm tì tay và tăng độ bám ghi đông.', ['Đen','Xanh'], ['S','M','L','XL'], 18],
      ['Bình nước xe đạp 600ml', 119000, 'Bình thể thao vừa khung gọng xe, nắp bật tiện lợi khi di chuyển.', ['Trắng','Đen','Đỏ'], ['600 ml'], 32],
      ['Gọng bình nước xe đạp', 99000, 'Gọng giữ bình chắc chắn, lắp đặt tương thích khung xe phổ biến.', ['Đen','Bạc'], ['Free size'], 24],
      ['Bơm mini xe đạp áp suất cao', 299000, 'Bơm cầm tay nhỏ gọn kèm đầu van đa năng cho các chuyến đi.', ['Đen'], ['21 cm'], 10],
      ['Túi treo khung xe đạp', 279000, 'Túi khung chống bám nước có ngăn khóa kéo đựng vật dụng nhỏ.', ['Đen','Xám'], ['1.2 L'], 14]
    ]
  },
  {
    category: 'Bóng rổ', image: 'images/products/bong-da.svg', icon: 'fa-basketball',
    products: [
      ['Bóng rổ Indoor Pro size 7', 499000, 'Bóng rổ size 7 có bề mặt bám tay, phù hợp sân trong nhà.', ['Cam','Nâu'], ['Size 7'], 18],
      ['Bóng rổ Outdoor Grip size 6', 429000, 'Bóng size 6 có lớp vỏ bền bám sân ngoài trời.', ['Cam','Đen'], ['Size 6'], 20],
      ['Áo bóng rổ không tay Court', 329000, 'Áo thi đấu không tay thoáng khí, thoải mái khi di chuyển.', ['Đỏ','Xanh','Đen'], ['S','M','L','XL','XXL'], 16],
      ['Quần short bóng rổ AirMove', 279000, 'Quần short rộng rãi, vải nhẹ phù hợp tập luyện và thi đấu.', ['Đen','Đỏ','Xanh navy'], ['S','M','L','XL','XXL'], 21],
      ['Băng gối bóng rổ Support', 199000, 'Băng gối co giãn hỗ trợ giữ ấm và ổn định khi bật nhảy.', ['Đen','Trắng'], ['S','M','L','XL'], 14],
      ['Băng cổ tay bóng rổ', 79000, 'Băng cổ tay thấm hút mồ hôi, co giãn và dễ đeo.', ['Đen','Trắng','Đỏ'], ['Free size'], 35],
      ['Lưới vành bóng rổ', 129000, 'Lưới thay thế bền chắc, phù hợp với vành bóng rổ tiêu chuẩn.', ['Trắng','Đỏ','Xanh'], ['12 móc'], 17],
      ['Bơm bóng kèm kim bơm', 149000, 'Bơm tay nhỏ gọn đi kèm kim bơm, dùng cho bóng rổ và bóng đá.', ['Đen','Xanh'], ['Free size'], 26]
    ]
  },
  {
    category: 'Cầu lông', image: 'images/products/vot-cau-long.svg', icon: 'fa-table-tennis-paddle-ball',
    products: [
      ['Vợt cầu lông Carbon Lite', 799000, 'Vợt carbon nhẹ, cân bằng linh hoạt cho người chơi phong trào.', ['Đen','Xanh navy'], ['4U/G5'], 11],
      ['Cầu lông lông vũ (hộp 12)', 249000, 'Cầu lông có quỹ đạo ổn định, phù hợp tập luyện và thi đấu.', ['Trắng'], ['Hộp 12 quả'], 29],
      ['Giày cầu lông CourtFlex', 890000, 'Giày đế bám sàn trong nhà, hỗ trợ di chuyển ngang linh hoạt.', ['Trắng','Xanh','Đen'], ['38','39','40','41','42','43'], 12],
      ['Túi cầu lông 2 ngăn', 429000, 'Túi đựng vợt hai ngăn có quai đeo và ngăn phụ kiện tiện lợi.', ['Đen','Đỏ'], ['6 vợt'], 13],
      ['Quấn cán vợt (bộ 3 cuộn)', 89000, 'Quấn cán thấm hút tốt, tăng độ bám và thay mới nhanh chóng.', ['Trắng','Đen','Vàng'], ['Bộ 3 cuộn'], 38],
      ['Băng cổ tay cầu lông', 79000, 'Băng cổ tay co giãn mềm, thấm mồ hôi khi chơi cầu lông.', ['Trắng','Đen','Đỏ'], ['Free size'], 40],
      ['Lưới cầu lông tập luyện', 599000, 'Lưới chắc chắn, lắp đặt gọn cho sân tập và chơi giải trí.', ['Đen'], ['6.1 m'], 7],
      ['Bộ cước căng vợt 10m', 119000, 'Dây cước bền và đàn hồi tốt, phù hợp thay cước vợt cầu lông.', ['Trắng','Vàng'], ['10 m'], 19]
    ]
  }
];

const SEED_PRODUCTS = SEED_PRODUCT_GROUPS.flatMap((group, groupIndex) =>
  group.products.map(([name, price, description, colors, sizes, stock, image], productIndex) => ({
    id: 1001 + groupIndex * 8 + productIndex,
    name,
    category: group.category,
    price,
    oldPrice: 0,
    brand: 'SportZone',
    rating: 4.5,
    reviews: 0,
    image: image || group.image,
    placeholderImage: group.image,
    icon: group.icon,
    sizes,
    colors,
    stock,
    description
  }))
);

function mergeSeedProducts(products) {
  const seedById = new Map(SEED_PRODUCTS.map(product => [String(product.id), product]));
  const merged = products.map(product => {
    const seed = seedById.get(String(product.id));
    return seed && (product.image !== seed.image || product.placeholderImage !== seed.placeholderImage)
      ? { ...product, image: seed.image, placeholderImage: seed.placeholderImage }
      : product;
  });
  const ids = new Set(merged.map(product => String(product.id)));
  const names = new Set(merged.map(product => String(product.name || '').toLocaleLowerCase().trim()));
  SEED_PRODUCTS.forEach(product => {
    const name = product.name.toLocaleLowerCase().trim();
    if (!ids.has(String(product.id)) && !names.has(name)) {
      merged.push(product);
      ids.add(String(product.id));
      names.add(name);
    }
  });
  return merged;
}

// Hàm nạp danh sách sản phẩm từ Cloud / LocalStorage
function getStoredProducts() {
  try {
    const raw = localStorage.getItem('sportzone_products');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const merged = mergeSeedProducts(parsed);
        if (JSON.stringify(merged) !== JSON.stringify(parsed)) {
          localStorage.setItem('sportzone_products', JSON.stringify(merged));
        }
        return merged;
      }
    }
    const products = mergeSeedProducts(DEFAULT_PRODUCTS);
    localStorage.setItem('sportzone_products', JSON.stringify(products));
    return products;
  } catch (error) {
    console.error('[Products] Không thể nạp/lưu danh sách sản phẩm:', error);
    return mergeSeedProducts(DEFAULT_PRODUCTS);
  }
}

let PRODUCTS = getStoredProducts();

// Tự động cập nhật sản phẩm khi Cloud Firestore đồng bộ
window.addEventListener('storage', (e) => {
  if (e.key === 'sportzone_products' || e.key === null) {
    PRODUCTS = getStoredProducts();
    if (typeof renderCatalog === 'function' && document.getElementById('products-grid')) renderCatalog();
    if (typeof renderProductDetail === 'function' && document.getElementById('product-detail')) renderProductDetail();
  }
});

window.addEventListener('sz:products-updated', (e) => {
  if (Array.isArray(e.detail) && e.detail.length > 0) {
    PRODUCTS = mergeSeedProducts(e.detail);
    if (JSON.stringify(PRODUCTS) !== JSON.stringify(e.detail)) {
      localStorage.setItem('sportzone_products', JSON.stringify(PRODUCTS));
    }
    if (typeof renderCatalog === 'function' && document.getElementById('products-grid')) renderCatalog();
    if (typeof renderProductDetail === 'function' && document.getElementById('product-detail')) renderProductDetail();
  }
});

const formatMoney = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
const removeAccents = str => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().trim();

const params = new URLSearchParams(location.search);
const categoryMap = {
  // Nhóm danh mục chính
  'chay-bo': 'Chạy bộ',
  'bong-da': 'Bóng đá',
  'boi-loi': 'Bơi lội',
  'gym': 'Gym',
  'yoga': 'Yoga',
  'cau-long': 'Cầu lông',
  'xe-dap': 'Xe đạp',
  'bong-ro': 'Bóng rổ',
  
  // Danh mục con từ navbar
  'giay-chay-bo': 'Chạy bộ',
  'ao-chay-bo': 'Chạy bộ',
  'dong-ho-the-thao': 'Chạy bộ',
  'phu-kien-chay-bo': 'Chạy bộ',
  'bong-thi-dau': 'Bóng đá',
  'giay-bong-da': 'Bóng đá',
  'ao-thi-dau': 'Bóng đá',
  'bao-ho': 'Bóng đá',
  'boi-loi': 'Bơi lội',
  'kinh-boi': 'Bơi lội',
  'do-boi': 'Bơi lội',
  'non-boi': 'Bơi lội',
  'ta-tay': 'Gym',
  'tham-yoga': 'Gym',
  'phu-kien-gym': 'Gym'
};

const categoryFromUrl = params.get('category') || (params.get('cat') ? (categoryMap[params.get('cat')] || params.get('cat')) : '');
let state = {
  query: params.get('q') || '',
  category: categoryFromUrl,
  sale: params.get('sale') === '1',
  rating: 0,
  min: 0,
  max: Infinity,
  sort: params.get('sort') || 'featured',
  page: 1
};

function productCard(product) {
  const wished = typeof Wishlist !== 'undefined' && Wishlist.has(product.id);
  const badgeClass = product.badge === 'Mới' ? 'new' : '';
  const image = product.image || product.placeholderImage || getProductPlaceholder(product.category);
  const imageFallback = product.placeholderImage || getProductPlaceholder(product.category);
  const stock = Number.isInteger(Number(product.stock)) ? Number(product.stock) : 0;
  return `<article class="catalog-card">
    ${product.badge ? `<span class="product-badge ${badgeClass}">${product.badge}</span>`:''}
    <button class="wishlist-btn ${wished?'active':''}" data-wishlist="${product.id}" aria-label="Yêu thích"><i class="${wished?'fas':'far'} fa-heart"></i></button>
    <a href="product-detail.html?id=${product.id}" class="product-image-link"><div class="product-image"><img src="${image}" alt="${product.name}" loading="lazy" onerror="this.onerror=null;this.src='${imageFallback}'"></div></a>
    <div class="catalog-card-body"><span class="catalog-card-category">${product.category}</span>
      <h3><a href="product-detail.html?id=${product.id}">${product.name}</a></h3>
      <div class="rating-row"><span>${'★'.repeat(Math.round(product.rating))}</span><span>${product.rating} (${product.reviews})</span></div>
      <div class="price-row"><strong class="current-price">${formatMoney(product.price)}</strong>${product.oldPrice?`<span class="old-price">${formatMoney(product.oldPrice)}</span>`:''}</div>
      <button class="add-cart-btn" data-cart="${product.id}" ${stock < 1 ? 'disabled' : ''}>${stock < 1 ? 'Hết hàng' : '<i class="fas fa-cart-plus"></i> Thêm vào giỏ'}</button>
    </div>
  </article>`;
}

function getProductPlaceholder(category) {
  const images = {
    'Chạy bộ': 'images/products/ao-chay-bo.svg',
    'Bóng đá': 'images/products/bong-da.svg',
    'Gym': 'images/products/ta-tay.svg',
    'Bơi lội': 'images/products/kinh-boi.svg',
    'Yoga': 'images/products/tham-yoga.svg',
    'Xe đạp': 'images/products/dong-ho-gps.svg',
    'Bóng rổ': 'images/products/bong-da.svg',
    'Cầu lông': 'images/products/vot-cau-long.svg'
  };
  return images[category] || 'images/products/balo-gym.svg';
}

function initCatalog() {
  if (!document.getElementById('products-grid')) return;
  const categoryFilter = document.getElementById('category-filter');
  const availableCategories = [...new Set(PRODUCTS.map(p => p.category))]
    .filter(category => category !== 'Giày thể thao');
  
  availableCategories.forEach(category => {
    categoryFilter.insertAdjacentHTML('beforeend', `<label class="filter-option"><input type="checkbox" name="category" value="${category}" ${state.category === category ? 'checked' : ''}> ${category}</label>`);
  });

  const searchInput = document.getElementById('navbar-search-input');
  if (searchInput) searchInput.value = state.query;

  const sortSelect = document.getElementById('sort-products');
  if (sortSelect && state.sort) sortSelect.value = state.sort;

  renderCatalog();

  document.querySelectorAll('[name="category"]').forEach(el => el.addEventListener('change', () => {
    state.category = '';
    state.page = 1;
    renderCatalog();
  }));

  document.querySelectorAll('[name="rating"]').forEach(el => el.addEventListener('change', () => {
    state.rating = Number(el.value);
    state.page = 1;
    renderCatalog();
  }));

  const minInput = document.getElementById('price-min');
  const maxInput = document.getElementById('price-max');
  if (minInput) {
    minInput.addEventListener('input', applyPrice);
    minInput.addEventListener('change', applyPrice);
  }
  if (maxInput) {
    maxInput.addEventListener('input', applyPrice);
    maxInput.addEventListener('change', applyPrice);
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', e => {
      state.sort = e.target.value;
      renderCatalog();
    });
  }

  const clearBtn = document.getElementById('clear-filter');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      location.href = 'products.html';
    });
  }

  const searchForm = document.getElementById('navbar-search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', e => {
      e.preventDefault();
      state.query = (document.getElementById('navbar-search-input')?.value || '').trim();
      state.page = 1;
      renderCatalog();
    });
  }

  bindCatalogActions();
  bindMobileFilter();
}

function applyPrice() {
  state.min = Number(document.getElementById('price-min')?.value) || 0;
  state.max = Number(document.getElementById('price-max')?.value) || Infinity;
  state.page = 1;
  renderCatalog();
}

function filteredProducts() {
  const qNorm = removeAccents(state.query);
  let list = PRODUCTS.filter(p => {
    const matchQuery = !qNorm || removeAccents(`${p.name} ${p.category}`).includes(qNorm);
    const matchCategory = !state.category || p.category === state.category;
    const matchSale = !state.sale || Boolean(p.oldPrice && p.oldPrice > p.price);
    const matchRating = p.rating >= state.rating;
    const matchPrice = p.price >= state.min && p.price <= state.max;
    return matchQuery && matchCategory && matchSale && matchRating && matchPrice;
  });

  const checked = [...document.querySelectorAll('[name="category"]:checked')].map(e => e.value);
  if (checked.length) {
    list = list.filter(p => checked.includes(p.category));
  }

  if (state.sort === 'newest') list.sort((a, b) => b.id - a.id);
  if (state.sort === 'price-asc') list.sort((a, b) => a.price - b.price);
  if (state.sort === 'price-desc') list.sort((a, b) => b.price - a.price);
  if (state.sort === 'rating') list.sort((a, b) => b.rating - a.rating);

  return list;
}

function renderCatalog() {
  const list = filteredProducts();
  const perPage = 9;
  const pages = Math.max(1, Math.ceil(list.length / perPage));
  state.page = Math.min(state.page, pages);
  const start = (state.page - 1) * perPage;

  const countEl = document.getElementById('product-count');
  if (countEl) countEl.textContent = `${list.length} sản phẩm`;

  const gridEl = document.getElementById('products-grid');
  if (gridEl) {
    gridEl.innerHTML = list.length
      ? list.slice(start, start + perPage).map(productCard).join('')
      : `<div class="empty-products"><i class="fas fa-box-open"></i><h3>Không tìm thấy sản phẩm</h3><p>Hãy thử từ khóa hoặc bộ lọc khác.</p></div>`;
  }

  const paginationEl = document.getElementById('pagination');
  if (paginationEl) {
    paginationEl.innerHTML = pages > 1
      ? Array.from({ length: pages }, (_, i) => `<button class="page-btn ${i + 1 === state.page ? 'active' : ''}" data-page="${i + 1}">${i + 1}</button>`).join('')
      : '';
  }

  renderTags();
  bindCatalogActions();
}

function renderTags() {
  const tags = [];
  const checked = [...document.querySelectorAll('[name="category"]:checked')].map(e => e.value);
  checked.forEach(c => tags.push({ label: c, type: 'category', value: c }));
  if (state.query) tags.push({ label: `“${state.query}”`, type: 'query' });
  if (state.sale) tags.push({ label: 'Khuyến mãi', type: 'sale' });
  if (state.rating > 0) tags.push({ label: `★ từ ${state.rating} sao`, type: 'rating' });
  if (state.min > 0 || state.max < Infinity) {
    tags.push({
      label: `Giá: ${state.min > 0 ? formatMoney(state.min) : '0đ'} - ${state.max < Infinity ? formatMoney(state.max) : '∞'}`,
      type: 'price'
    });
  }

  const tagsContainer = document.getElementById('active-filter-tags');
  if (!tagsContainer) return;

  tagsContainer.innerHTML = tags.map(t => `<span class="filter-tag">${t.label}<button data-clear-tag="${t.type}" data-value="${t.value || ''}">&times;</button></span>`).join('');

  tagsContainer.querySelectorAll('[data-clear-tag]').forEach(btn => btn.addEventListener('click', () => {
    const type = btn.dataset.clearTag;
    if (type === 'query') {
      state.query = '';
      const sInput = document.getElementById('navbar-search-input');
      if (sInput) sInput.value = '';
    }
    if (type === 'sale') state.sale = false;
    if (type === 'category') {
      const input = [...document.querySelectorAll('[name="category"]')].find(e => e.value === btn.dataset.value);
      if (input) input.checked = false;
      state.category = '';
    }
    if (type === 'rating') {
      state.rating = 0;
      const allRating = document.querySelector('[name="rating"][value="0"]');
      if (allRating) allRating.checked = true;
    }
    if (type === 'price') {
      state.min = 0;
      state.max = Infinity;
      const pMin = document.getElementById('price-min');
      const pMax = document.getElementById('price-max');
      if (pMin) pMin.value = '';
      if (pMax) pMax.value = '';
    }
    state.page = 1;
    renderCatalog();
  }));
}

function bindCatalogActions() {
  document.querySelectorAll('[data-cart]').forEach(btn => {
    btn.onclick = () => {
      const p = PRODUCTS.find(x => x.id === Number(btn.dataset.cart));
      if (p && p.stock > 0 && typeof Cart !== 'undefined') {
        Cart.addItem({
          ...p,
          selectedSize: p.sizes?.[0] || 'Free size',
          selectedColor: p.colors?.[0] || 'Xanh'
        });
      }
    };
  });

  document.querySelectorAll('[data-wishlist]').forEach(btn => {
    btn.onclick = () => {
      const id = Number(btn.dataset.wishlist);
      if (typeof Wishlist !== 'undefined') {
        const product = PRODUCTS.find(item => item.id === id);
        const added = Wishlist.toggle(product || id);
        btn.classList.toggle('active', added);
        btn.innerHTML = `<i class="${added ? 'fas' : 'far'} fa-heart"></i>`;
      }
    };
  });

  document.querySelectorAll('[data-page]').forEach(btn => {
    btn.onclick = () => {
      state.page = Number(btn.dataset.page);
      renderCatalog();
      document.querySelector('.catalog-toolbar')?.scrollIntoView({ behavior: 'smooth' });
    };
  });
}

function bindMobileFilter() {
  const panel = document.getElementById('filter-panel');
  const overlay = document.getElementById('filter-overlay');
  if (!panel || !overlay) return;
  const open = () => {
    panel.classList.add('open');
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  };
  const close = () => {
    panel.classList.remove('open');
    overlay.classList.remove('show');
    document.body.style.overflow = '';
  };
  document.getElementById('mobile-filter-btn')?.addEventListener('click', open);
  document.getElementById('close-filter')?.addEventListener('click', close);
  overlay.addEventListener('click', close);
}

function initDetail() {
  const detail = document.getElementById('product-detail');
  if (!detail) return;
  const requestedId = Number(params.get('id'));
  const product = PRODUCTS.find(p => p.id === requestedId);
  if (!product) {
    detail.innerHTML = '<div class="empty-products"><i class="fas fa-box-open"></i><h3>Sản phẩm không tồn tại</h3><a class="add-cart-btn" style="display:inline-block;max-width:200px;margin-top:16px;text-decoration:none;" href="products.html">Quay lại danh sách</a></div>';
    return;
  }

  document.title = `${product.name} | SportZone`;
  const breadcrumb = document.getElementById('detail-breadcrumb');
  if (breadcrumb) breadcrumb.textContent = product.name;

  const wished = typeof Wishlist !== 'undefined' && Wishlist.has(product.id);
  const stock = typeof product.stock === 'number' ? product.stock : 12;
  const image = product.image || product.placeholderImage || getProductPlaceholder(product.category);
  const imageFallback = product.placeholderImage || getProductPlaceholder(product.category);
  const colors = Array.isArray(product.colors) && product.colors.length
    ? product.colors
    : ['Xanh', 'Đen', 'Đỏ'];

  detail.innerHTML = `<div class="detail-gallery">
    <div class="detail-image" id="detail-image" title="Bấm để phóng to ảnh">
      <img src="${image}" alt="${product.name}" onerror="this.onerror=null;this.src='${imageFallback}'">
    </div>
  </div>
  <div class="detail-info">
    <div class="catalog-card-category">${product.category}</div>
    <h1>${product.name}</h1>
    <div class="detail-meta">
      <div class="rating-row">
        <span>${'★'.repeat(Math.round(product.rating))}</span>
        <span>${product.rating} (${product.reviews} đánh giá)</span>
      </div>
    </div>
    <div class="detail-price">
      ${formatMoney(product.price)}
      ${product.oldPrice ? `<span class="old">${formatMoney(product.oldPrice)}</span>` : ''}
    </div>
    <p class="detail-desc">${product.description}</p>
    <div class="option-group">
      <span class="option-label">Màu sắc</span>
      <div class="color-options">
        ${colors.map((color, i) => `<button class="option-btn ${i === 0 ? 'active' : ''}" type="button" aria-label="${color}">${color}</button>`).join('')}
      </div>
    </div>
    <div class="option-group">
      <span class="option-label">Kích thước</span>
      <div class="size-options">
        ${product.sizes.map((s, i) => `<button class="option-btn ${i === 0 ? 'active' : ''}" type="button" data-size="${s}">${s}</button>`).join('')}
      </div>
    </div>
    <div class="detail-actions">
      <div class="quantity-selector" aria-label="Chọn số lượng">
        <button type="button" id="qty-minus" aria-label="Giảm">-</button>
        <input type="number" id="detail-qty" value="1" min="1" max="${stock}" readonly>
        <button type="button" id="qty-plus" aria-label="Tăng">+</button>
      </div>
      <button class="detail-buy" id="detail-add-cart"><i class="fas fa-cart-plus"></i> Thêm vào giỏ hàng</button>
      <button class="detail-wishlist ${wished ? 'active' : ''}" id="detail-wishlist" aria-label="Yêu thích"><i class="${wished ? 'fas' : 'far'} fa-heart"></i></button>
    </div>
    <div class="stock-note"><i class="fas fa-check-circle"></i> Còn ${stock} sản phẩm - giao hàng trong 2-4 ngày</div>
    <div class="detail-specs">
      <div><span>Thương hiệu</span><strong>SportZone</strong></div>
      <div><span>Bảo hành</span><strong>12 tháng</strong></div>
      <div><span>Đổi trả</span><strong>Trong 30 ngày</strong></div>
    </div>
  </div>`;

  // Chọn kích thước
  document.querySelectorAll('.option-btn[data-size]').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.option-btn[data-size]').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
  }));

  // Chọn màu sắc
  document.querySelectorAll('.color-options .option-btn').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.color-options .option-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
  }));

  // Tăng giảm số lượng
  const qtyInput = document.getElementById('detail-qty');
  document.getElementById('qty-minus')?.addEventListener('click', () => {
    if (qtyInput) {
      let val = parseInt(qtyInput.value, 10) || 1;
      if (val > 1) qtyInput.value = val - 1;
    }
  });
  document.getElementById('qty-plus')?.addEventListener('click', () => {
    if (qtyInput) {
      let val = parseInt(qtyInput.value, 10) || 1;
      if (val < stock) qtyInput.value = val + 1;
    }
  });

  // Phóng to ảnh
  document.getElementById('detail-image')?.addEventListener('click', e => e.currentTarget.classList.toggle('zoomed'));

  // Thêm vào giỏ hàng kèm size, màu và số lượng
  document.getElementById('detail-add-cart')?.addEventListener('click', () => {
    if (typeof Cart === 'undefined' || stock < 1) return;
    const selectedSize = document.querySelector('.size-options .option-btn.active')?.dataset.size || product.sizes[0];
    const selectedColor = document.querySelector('.color-options .option-btn.active')?.textContent.trim() || 'Xanh';
    const qty = parseInt(qtyInput?.value || '1', 10);
    Cart.addItem({ ...product, selectedSize, selectedColor, quantity: qty });
  });

  // Yêu thích
  document.getElementById('detail-wishlist')?.addEventListener('click', e => {
    if (typeof Wishlist === 'undefined') return;
    const added = Wishlist.toggle(product);
    e.currentTarget.classList.toggle('active', added);
    e.currentTarget.querySelector('i').className = `${added ? 'fas' : 'far'} fa-heart`;
  });

  // Sản phẩm liên quan
  const relatedContainer = document.getElementById('related-products');
  if (relatedContainer) {
    const relatedList = PRODUCTS.filter(p => p.category === product.category && p.id !== product.id)
      .concat(PRODUCTS.filter(p => p.category !== product.category && p.id !== product.id))
      .slice(0, 3);
    relatedContainer.innerHTML = relatedList.map(productCard).join('');
  }

  bindCatalogActions();
}

document.addEventListener('DOMContentLoaded', () => {
  initCatalog();
  initDetail();
});
