// Thay vì gọi API, chúng ta chỉ cần tạo ra một cái Link (URL)
export function getVietQrUrl({ amountVnd, description }) {
    // 1. Thông tin tài khoản 
    const bankId = 'bidv'; // Có thể dùng tên viết tắt (bidv) hoặc mã BIN (970418) đều được
    const accountNo = '4510614879'; // Số tài khoản thụ hưởng
    const template = 'compact2'; 
    const accountName = 'NGUYEN DUY DANG'; // Tên người thụ hưởng

    // 2. Chuẩn hóa dữ liệu
    const safeAmount = Math.max(0, Math.round(amountVnd || 0));
    
    // Lưu ý: Các chuỗi text đưa lên URL BẮT BUỘC phải dùng encodeURIComponent để không bị lỗi font/dấu cách
    const safeAddInfo = encodeURIComponent(String(description || '').trim());
    const safeAccountName = encodeURIComponent(accountName);

    // 3. Ghép thành link hoàn chỉnh theo chuẩn của img.vietqr.io
    return `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${safeAmount}&addInfo=${safeAddInfo}&accountName=${safeAccountName}`;
}