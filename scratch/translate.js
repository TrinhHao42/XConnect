const fs = require('fs');
const path = require('path');

const replaceInFile = (filePath, replacements) => {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [vietnamese, english] of Object.entries(replacements)) {
    content = content.replace(new RegExp(vietnamese.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), english);
  }
  fs.writeFileSync(filePath, content, 'utf8');
};

const frontendHooks = 'xconnect_frontend/hooks/useSocket.ts';
const frontendHooksReplacements = {
  'Bạn nhận được lời mời kết bạn từ': 'You received a friend request from',
  'Vào mục Contacts để xem chi tiết': 'Go to Contacts to view details',
  'Xem': 'View',
  'đã chấp nhận lời mời kết bạn của bạn!': 'accepted your friend request!',
  'đã từ chối lời mời kết bạn.': 'declined your friend request.',
};

const backendController = 'XConnect_backend/src/auth/auth.controller.ts';
const backendControllerReplacements = {
  'Đăng xuất thành công': 'Logged out successfully',
};

const backendService = 'XConnect_backend/src/auth/auth.service.ts';
const backendServiceReplacements = {
  'Dữ liệu đăng ký không hợp lệ': 'Invalid registration data',
  'Vui lòng cung cấp đầy đủ email và mật khẩu': 'Please provide both email and password',
  'Mật khẩu nhập lại không khớp': 'Passwords do not match',
  'Email hoặc tên người dùng đã tồn tại': 'Email or username already exists',
  'Thông tin đăng nhập không hợp lệ': 'Invalid login credentials',
  'Supabase chưa được cấu hình ở backend': 'Supabase is not configured in backend',
  'Xác thực token với Supabase server': 'Verify token with Supabase server',
  'Supabase token không hợp lệ hoặc đã hết hạn': 'Invalid or expired Supabase token',
  'Đăng nhập / Đăng ký qua OAuth nội bộ': 'Internal OAuth login/registration',
  'Lấy thông tin user để trả về FE': 'Get user info to return to FE',
  'Không tìm thấy thông tin user trong CSDL': 'User not found in database',
  'Không tìm thấy Refresh Token': 'Refresh Token not found',
  'Refresh Token không hợp lệ hoặc đã hết hạn': 'Invalid or expired Refresh Token',
  'Xoá token cũ để tránh bị reuse (xoay vòng token)': 'Delete old token to prevent reuse (token rotation)',
  'Thu hồi Refresh Token': 'Revoke Refresh Token',
  'Đưa Access Token vào Blacklist (TTL 15 phút = 900 giây)': 'Add Access Token to Blacklist (TTL 15 mins = 900s)',
  'Decode để lấy chính xác thời gian còn lại, hoặc set dư một chút': 'Decode to get exact remaining time, or set slightly longer',
  'Đăng xuất thành công': 'Logged out successfully',
  'Token đã bị thu hồi (Blacklist)': 'Token has been revoked (Blacklisted)',
  'Người dùng không tồn tại': 'User does not exist',
  'Lưu vào Redis, hết hạn sau 15 phút': 'Save to Redis, expires in 15 mins',
  'CẢNH BÁO MÔ PHỎNG GỬI MAIL': 'EMAIL SIMULATION WARNING',
  'Gửi OTP đến:': 'Sending OTP to:',
  'MÃ RESET PASSWORD (OTP) CỦA BẠN LÀ:': 'YOUR PASSWORD RESET OTP IS:',
  'Mã xác nhận đã được gửi đến email của bạn': 'Verification code sent to your email',
  'Dữ liệu không hợp lệ': 'Invalid data',
  'Mã xác nhận không hợp lệ hoặc đã hết hạn': 'Invalid or expired verification code',
  'Mật khẩu đã được thay đổi thành công': 'Password changed successfully',
  'Tạo chuỗi ngẫu nhiên làm refresh_token': 'Create random string for refresh_token',
  'Lưu refresh token vào Redis với chu kỳ sống 7 ngày (604800 giây)': 'Save refresh token to Redis with 7 days TTL',
  'Nếu Redis chưa sẵn sàng, vẫn trả token để đăng ký/đăng nhập không bị treo.': 'If Redis is not ready, return tokens anyway so login/register doesn\'t hang.'
};

try {
  replaceInFile(frontendHooks, frontendHooksReplacements);
  replaceInFile(backendController, backendControllerReplacements);
  replaceInFile(backendService, backendServiceReplacements);
  console.log('Translations completed successfully!');
} catch (error) {
  console.error('Error translating files:', error);
}
