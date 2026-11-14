/**
 * ============================================================
 * SportZone - Backend Google ID Token Verification Server
 * ============================================================
 * Chức năng:
 *  1. Tiếp nhận Google ID Token (JWT) từ client gửi lên
 *  2. Xác minh chữ ký số bằng Google Public Keys (google-auth-library)
 *  3. Kiểm tra Issuer (accounts.google.com), Audience (Client ID) và Expiry (thời hạn)
 *  4. Trích xuất thông tin người dùng: User ID (sub), Email, Tên, Avatar
 *  5. Tạo phiên đăng nhập an toàn và trả dữ liệu về frontend
 * ============================================================
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { OAuth2Client } = require('google-auth-library');

// Đọc cấu hình từ file .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

// Khởi tạo OAuth2Client chính thức của Google
const oauth2Client = new OAuth2Client(CLIENT_ID);

// Middleware
app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Endpoint kiểm tra trạng thái server
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SportZone Google Auth Verification Backend',
    hasClientId: !!CLIENT_ID && !CLIENT_ID.includes('YOUR_GOOGLE_CLIENT_ID')
  });
});

/**
 * POST /api/auth/google
 * Body: { idToken: string }
 */
app.post('/api/auth/google', async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({
      success: false,
      message: 'Yêu cầu không hợp lệ: Không tìm thấy Google ID Token trong request body!'
    });
  }

  if (!CLIENT_ID || CLIENT_ID.includes('YOUR_GOOGLE_CLIENT_ID')) {
    return res.status(500).json({
      success: false,
      message: 'Server chưa được cấu hình GOOGLE_CLIENT_ID trong file .env!'
    });
  }

  try {
    // 1. Xác minh Token bằng thư viện google-auth-library chính thức
    // Tự động kiểm tra:
    // - Chữ ký (Signature) với các chứng chỉ công khai của Google (certs.googleapis.com)
    // - Issuer (iss phải là 'https://accounts.google.com' hoặc 'accounts.google.com')
    // - Audience (aud phải khớp đúng GOOGLE_CLIENT_ID của ứng dụng)
    // - Expiration Time (exp không được quá hạn)
    const ticket = await oauth2Client.verifyIdToken({
      idToken: idToken,
      audience: CLIENT_ID
    });

    // 2. Trích xuất Payload đã được chứng thực bảo mật
    const payload = ticket.getPayload();

    const googleUserId = payload['sub'];
    const email = payload['email'];
    const emailVerified = payload['email_verified'];
    const name = payload['name'];
    const picture = payload['picture'];

    // Kiểm tra trạng thái xác thực email từ Google
    if (!emailVerified) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản Google này chưa được xác minh địa chỉ email!'
      });
    }

    // 3. Phân quyền người dùng (Role-Based Access Control)
    const ADMIN_EMAILS = [
      'nhomanhdangcapso1vn@gmail.com',
      'admin@sportzone.vn'
    ];
    const role = ADMIN_EMAILS.some(e => e.toLowerCase() === email.toLowerCase()) ? 'admin' : 'user';

    // 4. Tạo thông tin phiên người dùng an toàn
    const userSession = {
      id: 'USR-GGL-' + googleUserId.slice(-6),
      googleId: googleUserId,
      email: email,
      fullName: name,
      avatar: picture,
      role: role,
      emailVerified: emailVerified,
      membership: role === 'admin' ? 'Quản trị viên cấp cao' : 'Thành viên Google',
      loginMethod: 'google',
      verifiedAt: new Date().toISOString()
    };

    console.log(`[Google Auth Success] Người dùng: ${name} (${email}) - Google ID: ${googleUserId} - Quyền: ${role}`);

    return res.json({
      success: true,
      message: `Xác thực Google thành công! Xin chào ${name}.`,
      user: userSession
    });

  } catch (error) {
    console.error('[Google Auth Error] Xác minh Token thất bại:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Google ID Token không hợp lệ hoặc đã hết hạn!',
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`SportZone Google Auth Backend đang chạy tại: http://localhost:${PORT}`);
  console.log(`Cấu hình Client ID: ${CLIENT_ID || 'Chưa thiết lập (vui lòng cập nhật .env)'}`);
  console.log(`=======================================================`);
});

