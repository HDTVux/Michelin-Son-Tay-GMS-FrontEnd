/**
 * SANDBOX_SCREENS — Đặc tả khu vực "Mô phỏng Giao diện Thực hành" cho từng bài học.
 *
 * Trước đây nhiều bài dùng chung một `sandboxType` (profile/payment/warehouse_manager...)
 * nên khu thực hành của bài sau lặp lại y hệt bài trước. Mỗi bài giờ có một key riêng
 * ở đây, InteractiveSandbox đọc spec này và dựng ra một màn hình mô phỏng khác nhau:
 * đúng tiêu đề, đúng bộ lọc, đúng cột bảng và đúng nút hành động của trang thật.
 *
 * Cấu trúc spec:
 *   route    : đường dẫn thật của màn hình (hiển thị dạng badge)
 *   title    : tiêu đề khu mô phỏng
 *   icon     : tên icon (map sang lucide-react trong InteractiveSandbox)
 *   accent   : màu nhấn của màn hình
 *   toolbar  : mảng chip bộ lọc/tab hiển thị phía trên
 *   stats    : mảng thẻ số liệu { label, value, color? }
 *   fields   : mảng ô nhập liệu mô phỏng { label, placeholder }
 *   table    : { columns: [...], rows: [[...]] }
 *   actions  : mảng nút { label, status, message, variant: 'primary' | 'ghost' }
 *   note     : dòng ghi chú nghiệp vụ dưới cùng
 */

export const SANDBOX_SCREENS = {
  /* ============ 1. BẮT ĐẦU NHANH ============ */
  dashboard_home: {
    route: '/dashboard',
    title: 'Dashboard tổng quan trong ngày',
    icon: 'LayoutDashboard',
    accent: '#3b82f6',
    toolbar: ['Hôm nay', 'Tuần này', 'Tháng này'],
    stats: [
      { label: 'Xe đang trong xưởng', value: '08 xe', color: '#60a5fa' },
      { label: 'Phiếu chờ xử lý', value: '05 phiếu', color: '#f59e0b' },
      { label: 'Lịch hẹn hôm nay', value: '12 lịch', color: '#34d399' },
      { label: 'Doanh thu tạm tính', value: '48.2 tr', color: '#facc15' },
    ],
    actions: [
      { label: 'Tùy biến Widget', status: 'WIDGET_SAVED', message: 'Đã lưu bố cục widget Dashboard theo thói quen làm việc của bạn!' },
      { label: 'Mở Dashboard theo vai trò', status: 'ROLE_DASHBOARD', message: 'Đã chuyển sang Dashboard chuyên sâu của vai trò bạn đang đảm nhận.', variant: 'ghost' },
    ],
    note: 'Mỗi vai trò còn có Dashboard riêng: /receptionist-dashboard, /advisor-dashboard, /technician-dashboard, /accountant-dashboard, /manager-dashboard, /admin-dashboard.',
  },

  notifications_messages: {
    route: '/notifications · /messages',
    title: 'Thông báo hệ thống & Tin nhắn nội bộ',
    icon: 'Bell',
    accent: '#f59e0b',
    stats: [
      { label: 'Thông báo chưa đọc', value: '07', color: '#f59e0b' },
      { label: 'Hội thoại đang mở', value: '03', color: '#60a5fa' },
    ],
    table: {
      columns: ['Loại', 'Nội dung', 'Thời gian'],
      rows: [
        ['🔔 Phiếu dịch vụ', 'Phiếu ST-2026-0148 đã được khách duyệt báo giá', '2 phút trước'],
        ['🔔 Kho', 'Yêu cầu xuất kho mới từ Cố vấn Nguyễn Văn B', '15 phút trước'],
        ['💬 Tin nhắn', 'Thủ kho: "Lốp Primacy 4 size 205/55R16 đã về kho"', '32 phút trước'],
      ],
    },
    actions: [
      { label: 'Đánh dấu tất cả đã đọc', status: 'ALL_READ', message: 'Đã đánh dấu toàn bộ thông báo là đã đọc!' },
      { label: 'Tạo hội thoại mới', status: 'NEW_CHAT', message: 'Đã mở hộp thoại tìm nhân viên để bắt đầu cuộc trò chuyện mới.', variant: 'ghost' },
    ],
  },

  schedule_history: {
    route: '/daily-schedule · /work-history/...',
    title: 'Lịch làm việc & Lịch sử công việc',
    icon: 'Calendar',
    accent: '#8b5cf6',
    toolbar: ['Tháng này', 'Tuần này', 'Hôm nay'],
    table: {
      columns: ['Ngày', 'Ca làm việc', 'Công việc ghi nhận'],
      rows: [
        ['29/07/2026', 'Ca sáng (08:00 - 12:00)', '04 phiếu dịch vụ'],
        ['28/07/2026', 'Ca chiều (13:00 - 17:30)', '06 phiếu dịch vụ'],
        ['27/07/2026', 'Nghỉ tuần', '—'],
      ],
    },
    actions: [
      { label: 'Về ngày hôm nay', status: 'TODAY', message: 'Lịch đã nhảy về ngày làm việc hiện tại!' },
      { label: 'Xem lịch sử công việc', status: 'WORK_HISTORY', message: 'Đã mở trang Lịch sử công việc đúng theo vai trò của bạn.', variant: 'ghost' },
    ],
    note: 'Hệ thống tự mở đúng trang theo vai trò: /work-history/technician, /advisor, /receptionist, /accountant, /manager, /admin.',
  },

  attendance_personal: {
    route: '/attendance-checkin · /attendance-requests',
    title: 'Chấm công QR & Đơn từ cá nhân',
    icon: 'ScanQrCode',
    accent: '#22c55e',
    stats: [
      { label: 'Vị trí nhận diện', value: 'Quầy lễ tân', color: '#34d399' },
      { label: 'Khoảng cách GPS', value: '12m / 50m', color: '#34d399' },
    ],
    fields: [{ label: 'Lý do xin nghỉ / chấm công bù', placeholder: 'VD: Quên chấm công ra ca ngày 28/07...' }],
    actions: [
      { label: 'Quét mã QR chấm công', status: 'CHECKED_IN', message: 'Chấm công thành công! Tọa độ GPS nằm trong bán kính hợp lệ của vị trí đã cấu hình.' },
      { label: 'Gửi đơn chờ duyệt', status: 'REQUEST_SENT', message: 'Đã gửi đơn tới Quản lý phê duyệt tại /attendance-request-management.', variant: 'ghost' },
    ],
    note: 'Chấm công chỉ hợp lệ khi tọa độ GPS thiết bị nằm trong bán kính cho phép quanh vị trí đã khai báo.',
  },

  docs_center: {
    route: '/docs · /system-tutorials',
    title: 'Trung tâm Tài liệu & Hướng dẫn sử dụng',
    icon: 'BookOpen',
    accent: '#0ea5e9',
    stats: [
      { label: 'Tổng số bài học', value: '58 bài', color: '#38bdf8' },
      { label: 'Bài đã hoàn thành', value: '12 bài', color: '#34d399' },
    ],
    actions: [
      { label: 'Chạy Tour hướng dẫn', status: 'TOUR_STARTED', message: 'Tour tương tác sẽ điều hướng sang màn hình thật và chỉ dẫn từng bước bằng popup!' },
      { label: 'Mở Hướng dẫn sử dụng', status: 'TUTORIALS', message: 'Đã mở trang /system-tutorials với các bài hướng dẫn theo chủ đề.', variant: 'ghost' },
    ],
  },

  /* ============ 2.1 LỄ TÂN ============ */
  customer_directory: {
    route: '/customer-manager',
    title: 'Danh bạ khách hàng & Hạng thành viên',
    icon: 'Contact',
    accent: '#3b82f6',
    fields: [{ label: 'Tra cứu khách hàng', placeholder: 'Nhập tên hoặc số điện thoại...' }],
    table: {
      columns: ['Khách hàng', 'Số điện thoại', 'Xe sở hữu', 'Hạng'],
      rows: [
        ['Nguyễn Văn A', '0912 xxx 456', '30A-123.45', '🥇 Vàng'],
        ['Trần Thị B', '0987 xxx 321', '29B-678.90', '🥈 Bạc'],
        ['Garage Hùng Cường', '0905 xxx 111', '3 xe', '💎 Bạch Kim'],
      ],
    },
    actions: [
      { label: 'Thêm khách hàng', status: 'CUSTOMER_ADDED', message: 'Đã tạo hồ sơ khách hàng mới trong danh bạ garage!' },
      { label: 'Nhập từ Excel', status: 'EXCEL_IMPORT', message: 'Đã mở /customer-excel-import để nhập danh sách khách hàng cũ hàng loạt.', variant: 'ghost' },
    ],
  },

  queue_board: {
    route: '/queue-management',
    title: 'Hàng chờ xưởng sau Check-in',
    icon: 'Clock',
    accent: '#f59e0b',
    stats: [
      { label: 'Xe đang chờ', value: '04 xe', color: '#f59e0b' },
      { label: 'Khoang trống', value: '02 khoang', color: '#34d399' },
    ],
    table: {
      columns: ['STT', 'Biển số', 'Yêu cầu', 'Cố vấn'],
      rows: [
        ['1', '30A-123.45', 'Thay 4 lốp Michelin', 'Nguyễn Văn B'],
        ['2', '29B-678.90', 'Bảo dưỡng 20.000km', 'Chưa phân công'],
        ['3', '51F-246.80', 'Cân bằng động + đảo lốp', 'Trần Văn C'],
      ],
    },
    actions: [
      { label: 'Điều phối xe vào khoang', status: 'DISPATCHED', message: 'Đã điều phối xe 29B-678.90 cho Cố vấn và đưa ra khỏi hàng chờ!' },
    ],
  },

  vehicle_records: {
    route: '/vehicle-management',
    title: 'Hồ sơ xe khách hàng',
    icon: 'Car',
    accent: '#06b6d4',
    fields: [{ label: 'Tra cứu xe', placeholder: 'Nhập biển số xe hoặc tên chủ xe...' }],
    table: {
      columns: ['Biển số', 'Dòng xe', 'Chủ xe', 'Số KM gần nhất'],
      rows: [
        ['30A-123.45', 'Toyota Vios 2020', 'Nguyễn Văn A', '42.500 km'],
        ['29B-678.90', 'Mazda CX-5 2021', 'Trần Thị B', '19.800 km'],
        ['51F-246.80', 'Ford Ranger 2019', 'Lê Văn C', '78.200 km'],
      ],
    },
    actions: [
      { label: 'Cập nhật hồ sơ xe', status: 'VEHICLE_UPDATED', message: 'Đã cập nhật thông tin xe 30A-123.45 (đổi số KM và chủ sở hữu)!' },
    ],
    note: 'Số KM gần nhất là căn cứ để hệ thống gợi ý gói combo bảo dưỡng đúng chu kỳ (10.000km, 20.000km, 40.000km).',
  },

  /* ============ 2.3 KỸ THUẬT VIÊN ============ */
  tech_inspection: {
    route: '/advisor/inspection',
    title: 'Nhập thông số kiểm tra an toàn xe',
    icon: 'ShieldCheck',
    accent: '#22c55e',
    fields: [
      { label: 'Độ sâu rãnh lốp (mm)', placeholder: 'VD: 5.2' },
      { label: 'Điện áp ắc quy (V)', placeholder: 'VD: 12.4' },
    ],
    table: {
      columns: ['Hạng mục kiểm tra', 'Kết quả đo', 'Đánh giá'],
      rows: [
        ['Lốp trước trái - độ sâu rãnh', '5.2 mm', '🟢 Đạt'],
        ['Áp suất lốp 4 bánh', '32 PSI', '🟢 Đạt'],
        ['Má phanh trước', 'Mòn 70%', '🟡 Theo dõi'],
        ['Điện áp ắc quy', '11.8 V', '🔴 Cần thay'],
      ],
    },
    actions: [
      { label: 'Đính kèm ảnh bằng chứng', status: 'PHOTO_UPLOADED', message: 'Đã tải lên ảnh thực tế vị trí mòn vẹt để lưu vết hồ sơ xe!' },
      { label: 'Lưu kết quả kiểm tra', status: 'INSPECTION_SAVED', message: 'Đã gửi kết quả khảo sát về Cố vấn dịch vụ để lập báo giá cho khách.' },
    ],
  },

  tech_progress: {
    route: '/technician/update-progress/:id',
    title: 'Cập nhật tiến độ thi công & Nghiệm thu',
    icon: 'Wrench',
    accent: '#f97316',
    table: {
      columns: ['Hạng mục thi công', 'Trạng thái'],
      rows: [
        ['Tháo & thay 4 lốp Michelin Primacy 4', '✅ Hoàn thành'],
        ['Cân bằng động 4 bánh', '✅ Hoàn thành'],
        ['Căn chỉnh thước lái 3D Hunter', '🔄 Đang làm'],
      ],
    },
    fields: [{ label: 'Đề xuất dịch vụ phát sinh', placeholder: 'VD: Phát hiện rô-tuyn lái có độ rơ, đề xuất khách thay...' }],
    actions: [
      { label: 'Gửi đề xuất phát sinh', status: 'EXTRA_PROPOSED', message: 'Đã gửi đề xuất phát sinh cho Cố vấn xin ý kiến khách hàng trước khi thi công!' },
      { label: 'Hoàn thành công việc', status: 'JOB_DONE', message: 'Đã đóng công việc, giải phóng khoang sửa chữa và chuyển phiếu sang bước QC & thanh toán.' },
    ],
    note: 'Tuyệt đối không tự ý thi công hạng mục ngoài báo giá — phải qua bước đề xuất để khách duyệt.',
  },

  /* ============ 2.4 KHO ============ */
  stock_issue: {
    route: '/warehouse-stock-issues',
    title: 'Phiếu xuất kho & Chọn lô hàng',
    icon: 'Upload',
    accent: '#f59e0b',
    toolbar: ['Nháp', 'Đã xuất', 'Đã hủy'],
    table: {
      columns: ['Mã phiếu', 'Xuất cho', 'Vị trí kệ', 'Trạng thái'],
      rows: [
        ['XK-2026-0231', 'Phiếu ST-2026-0148', 'Kệ A - Tầng 2', '🟡 Nháp'],
        ['XK-2026-0230', 'Bán lẻ - Garage Hùng Cường', 'Kệ B - Tầng 1', '🟢 Đã xuất'],
      ],
    },
    actions: [
      { label: 'Chọn lô & Xác nhận xuất kho', status: 'ISSUED', message: 'Đã chọn lô còn tồn khả dụng, trừ tồn kho và ghi nhận giá vốn theo lô!' },
      { label: 'In phiếu xuất kho', status: 'PRINTED', message: 'Đã in phiếu xuất kho bàn giao vật tư cho Kỹ thuật viên xưởng.', variant: 'ghost' },
    ],
  },

  stock_return: {
    route: '/warehouse-return-entries',
    title: 'Phiếu hoàn trả hàng về kho',
    icon: 'Undo',
    accent: '#8b5cf6',
    fields: [{ label: 'Tham chiếu phiếu xuất gốc', placeholder: 'VD: XK-2026-0231' }],
    table: {
      columns: ['Phụ tùng hoàn', 'SL hoàn', 'Tình trạng'],
      rows: [
        ['Lốp Michelin Primacy 4 205/55R16', '1', '🟢 Còn mới - nhập lại kho'],
        ['Lọc dầu Toyota Vios', '2', '🔴 Hư hỏng - kho hàng lỗi'],
      ],
    },
    actions: [
      { label: 'Lưu phiếu hoàn trả', status: 'RETURNED', message: 'Đã hoàn hàng về kho: 1 lốp vào tồn khả dụng, 2 lọc dầu chuyển sang kho hàng lỗi!' },
      { label: 'In phiếu hoàn trả', status: 'PRINTED', message: 'Đã in phiếu hoàn trả làm chứng từ đối soát cho Kế toán.', variant: 'ghost' },
    ],
    note: 'Số lượng hoàn không được lớn hơn số lượng đã xuất trên phiếu xuất gốc.',
  },

  defective_inventory: {
    route: '/warehouse-defective-inventory',
    title: 'Kho hàng lỗi (tách khỏi tồn khả dụng)',
    icon: 'AlertTriangle',
    accent: '#ef4444',
    stats: [
      { label: 'Mặt hàng lỗi', value: '09 SKU', color: '#f87171' },
      { label: 'Giá trị tạm giữ', value: '18.4 tr', color: '#f87171' },
    ],
    table: {
      columns: ['Phụ tùng', 'SL lỗi', 'Lô nhập gốc', 'Nguyên nhân'],
      rows: [
        ['Lốp Michelin Energy XM2 185/65R15', '2', 'NK-2026-0088', 'Phồng gân lốp khi nhập'],
        ['Bình ắc quy GS 45Ah', '1', 'NK-2026-0091', 'Không giữ điện'],
      ],
    },
    actions: [
      { label: 'Lập hồ sơ trả Nhà cung cấp', status: 'RETURN_SUPPLIER', message: 'Đã lập hồ sơ trả hàng lỗi về Nhà cung cấp kèm chứng từ lô nhập gốc!' },
    ],
    note: 'Hàng lỗi tách riêng để không bị bán/xuất nhầm cho khách và có căn cứ đối chiếu khi trả Nhà cung cấp.',
  },

  defect_report: {
    route: '/warehouse-defect-report',
    title: 'Báo cáo lỗi kho & Quy trách nhiệm',
    icon: 'ClipboardList',
    accent: '#dc2626',
    toolbar: ['Tháng này', 'Quý này', 'Tùy chọn'],
    table: {
      columns: ['Sự cố', 'Chênh lệch', 'Trách nhiệm'],
      rows: [
        ['Chênh lệch kiểm kê lốp 205/55R16', '-2 quả', 'Thủ kho ca chiều'],
        ['Phụ tùng hỏng khi thi công', '1 lọc gió', 'KTV thi công'],
        ['Hàng lỗi khi giao nhận', '2 lốp', 'Nhà cung cấp'],
      ],
    },
    actions: [
      { label: 'Lưu báo cáo sự cố', status: 'REPORT_SAVED', message: 'Đã lưu báo cáo lỗi kho kèm nguyên nhân và bộ phận chịu trách nhiệm!' },
    ],
  },

  fallback_markup: {
    route: '/warehouse-fallback-pricing',
    title: 'Markup giá mặc định (giá dự phòng)',
    icon: 'Percent',
    accent: '#0ea5e9',
    fields: [{ label: 'Tỷ lệ markup trên giá vốn (%)', placeholder: 'VD: 25' }],
    table: {
      columns: ['Nhóm hàng', 'Markup', 'Ví dụ: giá vốn 2.000.000'],
      rows: [
        ['Lốp xe', '25%', '→ 2.500.000 đ'],
        ['Dầu nhớt', '35%', '→ 2.700.000 đ'],
        ['Ắc quy', '20%', '→ 2.400.000 đ'],
      ],
    },
    actions: [
      { label: 'Lưu cấu hình markup', status: 'MARKUP_SAVED', message: 'Đã lưu! Phụ tùng chưa có giá bán riêng sẽ tự tính: Giá vốn x (1 + markup%).' },
    ],
    note: 'Markup chỉ áp dụng khi phụ tùng CHƯA có giá bán riêng tại /warehouse-pricing — giá riêng luôn được ưu tiên.',
  },

  excel_import: {
    route: '/warehouse-excel-import',
    title: 'Nhập kho hàng loạt từ Excel',
    icon: 'FileSpreadsheet',
    accent: '#16a34a',
    stats: [
      { label: 'Dòng đọc được', value: '148 dòng', color: '#34d399' },
      { label: 'Dòng lỗi cần sửa', value: '03 dòng', color: '#f87171' },
    ],
    table: {
      columns: ['Dòng', 'SKU', 'Số lượng', 'Kiểm tra'],
      rows: [
        ['12', 'MIC-PRI4-2055516', '20', '🟢 Hợp lệ'],
        ['37', 'MIC-XM2-1856515', '(trống)', '🔴 Thiếu số lượng'],
        ['85', 'SKU-KHONG-TON-TAI', '10', '🔴 SKU không tồn tại'],
      ],
    },
    actions: [
      { label: 'Sửa dòng lỗi', status: 'ROWS_FIXED', message: 'Đã sửa trực tiếp 3 dòng lỗi trên bảng xem trước!' },
      { label: 'Xác nhận nhập kho', status: 'IMPORTED', message: 'Đã ghi 148 dòng hợp lệ vào kho và sinh phiếu nhập tương ứng!' },
    ],
    note: 'Luôn đối chiếu bảng xem trước và xử lý hết dòng lỗi trước khi bấm xác nhận nhập.',
  },

  part_attributes: {
    route: '/part-management/select-...',
    title: 'Khai báo thuộc tính phụ tùng chuẩn hóa',
    icon: 'Layers',
    accent: '#a855f7',
    table: {
      columns: ['Loại thuộc tính', 'Màn hình khai báo', 'Ví dụ giá trị'],
      rows: [
        ['Danh mục hàng', 'select-category', 'Lốp xe du lịch'],
        ['Thương hiệu', 'select-brand', 'Michelin'],
        ['Dòng sản phẩm', 'select-product-line', 'Primacy 4'],
        ['Đơn vị tính', 'select-unit', 'Quả'],
        ['Thuế suất', 'select-tax', 'VAT 10%'],
        ['Thuộc tính kỹ thuật', 'select-attribute', '205/55R16 91V'],
      ],
    },
    actions: [
      { label: 'Lưu danh mục thuộc tính', status: 'ATTR_SAVED', message: 'Đã lưu thuộc tính chuẩn hóa - có thể chọn ngay khi tạo phụ tùng mới!' },
    ],
    note: 'Chuẩn hóa thuộc tính giúp toàn bộ dữ liệu phụ tùng thống nhất, lọc và báo cáo chính xác.',
  },

  /* ============ 2.5 THU NGÂN & KẾ TOÁN ============ */
  quick_sale: {
    route: '/parts-sales',
    title: 'Bán lẻ phụ tùng không qua xưởng',
    icon: 'Store',
    accent: '#ef4444',
    fields: [{ label: 'Khách hàng', placeholder: 'Nhập SĐT hoặc chọn từ danh bạ...' }],
    table: {
      columns: ['Phụ tùng', 'SL', 'Đơn giá', 'Thành tiền'],
      rows: [
        ['Lốp Michelin Primacy 4 205/55R16', '4', '2.500.000', '10.000.000'],
        ['Dầu Total Quartz 5W30', '1', '850.000', '850.000'],
      ],
    },
    stats: [
      { label: 'Chiết khấu hạng Vàng', value: '-5%', color: '#f59e0b' },
      { label: 'Tổng thanh toán (đã VAT)', value: '11.35 tr', color: '#34d399' },
    ],
    actions: [
      { label: 'Thanh toán & Xuất kho', status: 'SOLD', message: 'Đã tạo hóa đơn bán lẻ và tự động xuất kho phụ tùng trong cùng một thao tác!' },
      { label: 'In báo giá tạm tính', status: 'QUOTE_PRINTED', message: 'Đã in báo giá tạm tính gửi khách xem trước.', variant: 'ghost' },
    ],
  },

  invoice_print: {
    route: '/service-ticket/:code/receipt-payment-method',
    title: 'Chọn phương thức thanh toán & In hóa đơn',
    icon: 'Printer',
    accent: '#14b8a6',
    toolbar: ['Tiền mặt', 'Chuyển khoản VietQR', 'Thẻ'],
    stats: [
      { label: 'Tổng phải thu', value: '11.350.000 đ', color: '#facc15' },
      { label: 'Đã nhận', value: '11.350.000 đ', color: '#34d399' },
    ],
    actions: [
      { label: 'Xác nhận thanh toán', status: 'PAID', message: 'Đã ghi nhận doanh thu và chốt trạng thái phiếu sang Đã thanh toán!' },
      { label: 'In hóa đơn kế toán', status: 'INVOICE', message: 'Đã in chứng từ tại /service-ticket/:code/accounting-invoice-print.', variant: 'ghost' },
      { label: 'Xuất hóa đơn GTGT', status: 'VAT_INVOICE', message: 'Đã xuất hóa đơn VAT kèm đầy đủ thông tin công ty của khách hàng.', variant: 'ghost' },
    ],
  },

  service_catalog: {
    route: '/service-management',
    title: 'Danh mục dịch vụ lẻ & Bảng giá nhân công',
    icon: 'Wrench',
    accent: '#0891b2',
    fields: [{ label: 'Tên dịch vụ mới', placeholder: 'VD: Căn chỉnh thước lái 3D Hunter' }],
    table: {
      columns: ['Dịch vụ', 'Thời gian TC', 'Tiền công'],
      rows: [
        ['Thay lốp (1 bánh)', '15 phút', '50.000 đ'],
        ['Cân bằng động (1 bánh)', '10 phút', '40.000 đ'],
        ['Căn chỉnh thước lái 3D', '45 phút', '350.000 đ'],
      ],
    },
    actions: [
      { label: 'Lưu dịch vụ', status: 'SERVICE_SAVED', message: 'Đã lưu! Cố vấn dịch vụ có thể chọn ngay dịch vụ này khi lập báo giá.' },
      { label: 'Soạn bài viết mô tả', status: 'BLOG_SAVED', message: 'Đã mở trình soạn bài viết giới thiệu dịch vụ hiển thị cho khách trên website.', variant: 'ghost' },
    ],
  },

  /* ============ 2.6 MARKETING & CSKH ============ */
  promotion: {
    route: '/promotion-management',
    title: 'Chương trình khuyến mãi & Voucher',
    icon: 'Gift',
    accent: '#e11d48',
    fields: [{ label: 'Mã khuyến mãi', placeholder: 'VD: HE2026' }],
    toolbar: ['Giảm %', 'Giảm tiền', 'Mua nX tặng nY'],
    table: {
      columns: ['Mã', 'Loại ưu đãi', 'Hiệu lực'],
      rows: [
        ['HE2026', 'Giảm 10% tiền công', '01/07 → 31/08/2026'],
        ['LOP4TANG1', 'Mua 4 lốp tặng 1 lần cân bằng', '01/07 → 30/09/2026'],
        ['VIP500', 'Giảm 500.000đ cho hạng Bạch Kim', '01/07 → 31/12/2026'],
      ],
    },
    actions: [
      { label: 'Lưu chương trình', status: 'PROMO_SAVED', message: 'Đã lưu! Chương trình tự động hiển thị để chọn khi Cố vấn báo giá và khi bán lẻ.' },
    ],
  },

  point_tier: {
    route: '/point-config',
    title: 'Cấu hình Điểm tích lũy & Hạng thành viên',
    icon: 'Star',
    accent: '#f59e0b',
    fields: [{ label: 'Tỷ lệ quy đổi điểm', placeholder: 'VD: 100.000 đ = 1 điểm' }],
    table: {
      columns: ['Hạng', 'Ngưỡng điểm', 'Chiết khấu'],
      rows: [
        ['🥉 Đồng', '0 điểm (mặc định)', '0%'],
        ['🥈 Bạc', '≥ 200 điểm', '3%'],
        ['🥇 Vàng', '≥ 500 điểm', '5%'],
        ['💎 Bạch Kim', '≥ 1.500 điểm', '8%'],
      ],
    },
    actions: [
      { label: 'Lưu cấu hình hạng', status: 'TIER_SAVED', message: 'Đã lưu! Hệ thống tự xếp hạng lại và áp chiết khấu khi khách phát sinh giao dịch mới.' },
    ],
  },

  maintenance_reminder: {
    route: '/maintenance-reminders',
    title: 'Nhắc lịch bảo dưỡng định kỳ',
    icon: 'HeartHandshake',
    accent: '#0ea5e9',
    toolbar: ['Mốc 10.000km', 'Mốc 20.000km', 'Mốc 40.000km'],
    table: {
      columns: ['Biển số', 'Chủ xe', 'KM hiện tại', 'Tình trạng'],
      rows: [
        ['30A-123.45', 'Nguyễn Văn A', '19.850 km', '🔴 Đã quá mốc 20.000km'],
        ['29B-678.90', 'Trần Thị B', '9.600 km', '🟡 Sắp tới mốc 10.000km'],
      ],
    },
    actions: [
      { label: 'Gửi nhắc lịch qua Zalo/SMS', status: 'REMINDED', message: 'Đã gửi tin nhắn nhắc lịch bảo dưỡng tới 2 khách hàng đến chu kỳ!' },
    ],
    note: 'Hệ thống lọc dựa trên số KM và ngày dịch vụ gần nhất của từng xe.',
  },

  announcement_campaign: {
    route: '/announcement_campaign',
    title: 'Chiến dịch thông báo khách hàng',
    icon: 'Megaphone',
    accent: '#8b5cf6',
    fields: [
      { label: 'Tiêu đề thông báo', placeholder: 'VD: Ưu đãi thay lốp mùa hè 2026' },
      { label: 'Nội dung', placeholder: 'Nhập nội dung gửi tới khách hàng...' },
    ],
    stats: [
      { label: 'Khách đủ điều kiện nhận', value: '284 khách', color: '#34d399' },
      { label: 'Bị loại trừ (đã hủy nhận)', value: '17 khách', color: '#94a3b8' },
    ],
    actions: [
      { label: 'Xem trước nội dung', status: 'PREVIEW', message: 'Đã mở khung xem trước đúng như nội dung khách hàng sẽ nhận được.', variant: 'ghost' },
      { label: 'Gửi chiến dịch', status: 'CAMPAIGN_SENT', message: 'Đã gửi chiến dịch tới 284 khách hàng thuộc tập mục tiêu!' },
    ],
  },

  feedback: {
    route: '/feedback-management',
    title: 'Phản hồi & Đánh giá khách hàng',
    icon: 'MessageCircle',
    accent: '#f59e0b',
    stats: [
      { label: 'Điểm trung bình', value: '4.6 / 5', color: '#facc15' },
      { label: 'Phản ánh chờ xử lý', value: '03', color: '#f87171' },
    ],
    table: {
      columns: ['Khách hàng', 'Đánh giá', 'Nội dung', 'Trạng thái'],
      rows: [
        ['Nguyễn Văn A', '⭐⭐⭐⭐⭐', 'Thợ làm nhanh, tư vấn nhiệt tình', '✅ Đã đóng'],
        ['Trần Thị B', '⭐⭐', 'Chờ lâu hơn hẹn 40 phút', '🔴 Chờ xử lý'],
      ],
    },
    actions: [
      { label: 'Phân công xử lý', status: 'ASSIGNED', message: 'Đã phân công nhân sự liên hệ khách xử lý phản ánh và ghi nhận thời điểm phân công!' },
      { label: 'Đóng phản hồi', status: 'CLOSED', message: 'Đã cập nhật kết quả xử lý và đóng phản hồi khi khách hài lòng.', variant: 'ghost' },
    ],
  },

  slider: {
    route: '/slider-management',
    title: 'Slider & Banner trang chủ website',
    icon: 'Image',
    accent: '#ec4899',
    table: {
      columns: ['Thứ tự', 'Banner', 'Liên kết', 'Hiển thị'],
      rows: [
        ['1', 'Ưu đãi lốp Michelin mùa hè', '/promotions', '🟢 Bật'],
        ['2', 'Dịch vụ căn chỉnh 3D Hunter', '/services', '🟢 Bật'],
        ['3', 'Banner Tết 2026 (hết hạn)', '/', '⚪ Tắt'],
      ],
    },
    actions: [
      { label: 'Thêm banner mới', status: 'BANNER_ADDED', message: 'Đã tải lên banner mới - hiển thị ngay trên trang chủ website khách hàng!' },
      { label: 'Sắp xếp lại thứ tự', status: 'REORDERED', message: 'Đã kéo thả sắp xếp lại thứ tự hiển thị của các slider.', variant: 'ghost' },
    ],
  },

  /* ============ 2.7 NHÂN SỰ & CHẤM CÔNG ============ */
  staff_roles: {
    route: '/staff-manager',
    title: 'Tài khoản nhân viên & Phân quyền vai trò',
    icon: 'Users',
    accent: '#3b82f6',
    fields: [{ label: 'Tra cứu nhân viên', placeholder: 'Nhập tên hoặc số điện thoại...' }],
    table: {
      columns: ['Nhân viên', 'Vai trò được gán', 'Trạng thái'],
      rows: [
        ['Nguyễn Văn B', 'Cố vấn dịch vụ', '🟢 Hoạt động'],
        ['Lê Thị C', 'Thủ kho + Quản lý kho', '🟢 Hoạt động'],
        ['Phạm Văn D', 'Lễ tân + Cố vấn dịch vụ', '🟢 Hoạt động'],
      ],
    },
    actions: [
      { label: 'Gán thêm vai trò kiêm nhiệm', status: 'ROLE_ASSIGNED', message: 'Đã gán thêm vai trò! Hệ thống tự hợp nhất quyền, menu hiển thị đủ chức năng của mọi vai trò.' },
    ],
    note: 'Vai trò gán tại đây quyết định trực tiếp menu và chức năng nhân viên nhìn thấy sau khi đăng nhập.',
  },

  employee_profile: {
    route: '/employee-manager',
    title: 'Hồ sơ nhân sự & Biểu đồ hiệu suất',
    icon: 'UserCheck',
    accent: '#8b5cf6',
    stats: [
      { label: 'Phiếu xử lý tháng này', value: '84 phiếu', color: '#a78bfa' },
      { label: 'So với tháng trước', value: '+12%', color: '#34d399' },
    ],
    table: {
      columns: ['Nhân viên', 'Chức vụ', 'Khối lượng công việc'],
      rows: [
        ['Nguyễn Văn B', 'Cố vấn dịch vụ', '████████░░ 84 phiếu'],
        ['Trần Văn C', 'Kỹ thuật viên', '██████░░░░ 62 phiếu'],
        ['Lê Thị C', 'Thủ kho', '█████████░ 91 phiếu'],
      ],
    },
    actions: [
      { label: 'Mở hồ sơ chi tiết', status: 'PROFILE_OPENED', message: 'Đã mở /employee-manager/:staffId xem thông tin cá nhân và quá trình công tác.' },
    ],
  },

  shift_config: {
    route: '/shift-management',
    title: 'Cấu hình ca làm việc & Phân ca',
    icon: 'CalendarDays',
    accent: '#0891b2',
    fields: [{ label: 'Tên ca làm việc mới', placeholder: 'VD: Ca sáng cuối tuần' }],
    table: {
      columns: ['Ca làm việc', 'Giờ bắt đầu', 'Giờ kết thúc', 'Áp dụng'],
      rows: [
        ['Ca sáng', '08:00', '12:00', '🟢 Đang dùng'],
        ['Ca chiều', '13:00', '17:30', '🟢 Đang dùng'],
        ['Ca gãy cuối tuần', '08:00', '20:00', '⚪ Tạm ngưng'],
      ],
    },
    actions: [
      { label: 'Lưu ca làm việc', status: 'SHIFT_SAVED', message: 'Đã lưu ca! Dữ liệu này là căn cứ đối chiếu chấm công đi muộn/về sớm.' },
    ],
  },

  attendance_summary: {
    route: '/attendance-management',
    title: 'Bảng chấm công tổng hợp',
    icon: 'Check',
    accent: '#22c55e',
    toolbar: ['Hôm nay', 'Tuần này', 'Tháng 07/2026'],
    table: {
      columns: ['Nhân viên', 'Giờ vào', 'Giờ ra', 'Ghi nhận'],
      rows: [
        ['Nguyễn Văn B', '07:58', '12:05', '🟢 Đủ công'],
        ['Trần Văn C', '08:22', '12:00', '🟡 Đi muộn 22 phút'],
        ['Lê Thị C', '08:00', '—', '🔴 Thiếu chấm công ra'],
      ],
    },
    actions: [
      { label: 'Bổ sung công thủ công', status: 'ADJUSTED', message: 'Đã bổ sung công cho trường hợp đã được duyệt đơn giải trình chấm công bù!' },
      { label: 'Chốt công cuối kỳ', status: 'CLOSED', message: 'Đã chốt bảng công làm căn cứ tính lương cuối tháng.', variant: 'ghost' },
    ],
  },

  attendance_location: {
    route: '/attendance-locations',
    title: 'Vị trí chấm công QR & Bán kính GPS',
    icon: 'MapPin',
    accent: '#f97316',
    fields: [
      { label: 'Tên vị trí chấm công', placeholder: 'VD: Quầy lễ tân tầng 1' },
      { label: 'Bán kính hợp lệ (mét)', placeholder: 'VD: 50' },
    ],
    table: {
      columns: ['Vị trí', 'Tọa độ GPS', 'Bán kính', 'Trạng thái'],
      rows: [
        ['Quầy lễ tân', '21.1382, 105.5074', '50 m', '🟢 Hoạt động'],
        ['Cổng xưởng dịch vụ', '21.1385, 105.5079', '30 m', '🟢 Hoạt động'],
      ],
    },
    actions: [
      { label: 'Lấy tọa độ GPS hiện tại', status: 'GPS_TAKEN', message: 'Đã lấy tọa độ GPS của thiết bị và gắn vào vị trí chấm công!' },
      { label: 'In mã QR chấm công', status: 'QR_PRINTED', message: 'Đã mở trang in mã QR - in ra và dán tại vị trí tương ứng ở garage.', variant: 'ghost' },
    ],
  },

  attendance_approval: {
    route: '/attendance-request-management',
    title: 'Duyệt đơn nghỉ phép & Chấm công bù',
    icon: 'ShieldCheck',
    accent: '#6366f1',
    toolbar: ['Chờ duyệt', 'Đã duyệt', 'Từ chối'],
    table: {
      columns: ['Nhân viên', 'Loại đơn', 'Ngày áp dụng', 'Lý do'],
      rows: [
        ['Lê Thị C', 'Chấm công bù', '28/07/2026', 'Quên chấm công ra ca'],
        ['Trần Văn C', 'Xin nghỉ phép', '02/08/2026', 'Việc gia đình'],
      ],
    },
    actions: [
      { label: 'Duyệt đơn', status: 'APPROVED', message: 'Đã duyệt! Hệ thống tự điều chỉnh dữ liệu vào bảng chấm công tổng hợp của nhân viên.' },
      { label: 'Từ chối kèm lý do', status: 'REJECTED', message: 'Đã từ chối đơn kèm lý do phản hồi gửi về cho nhân viên.', variant: 'ghost' },
    ],
  },

  staff_notification: {
    route: '/staff-notification-sender',
    title: 'Gửi thông báo nội bộ cho nhân viên',
    icon: 'Bell',
    accent: '#0ea5e9',
    fields: [
      { label: 'Tiêu đề thông báo', placeholder: 'VD: Họp giao ban đầu tuần' },
      { label: 'Nội dung', placeholder: 'Nhập nội dung phổ biến cho nhân viên...' },
    ],
    toolbar: ['Toàn bộ nhân viên', 'Theo vai trò', 'Chọn thủ công'],
    stats: [{ label: 'Số người nhận', value: '24 nhân viên', color: '#38bdf8' }],
    actions: [
      { label: 'Xem trước thông báo', status: 'PREVIEW', message: 'Đã mở khung xem trước đúng như nội dung nhân viên sẽ nhận được.', variant: 'ghost' },
      { label: 'Gửi thông báo', status: 'SENT', message: 'Đã gửi! Thông báo xuất hiện ngay trên chuông Header và trang /notifications của người nhận.' },
    ],
  },

  /* ============ 2.8 BÁO CÁO & HỆ THỐNG ============ */
  kpi: {
    route: '/kpi-management',
    title: 'KPI nhân viên & Chỉ tiêu theo vai trò',
    icon: 'TrendingUp',
    accent: '#eab308',
    stats: [
      { label: 'Điểm KPI kỳ này', value: '87 / 100', color: '#facc15' },
      { label: 'Xếp hạng nội bộ', value: '3 / 24', color: '#34d399' },
    ],
    table: {
      columns: ['Tiêu chí', 'Chỉ tiêu', 'Thực hiện', 'Điểm'],
      rows: [
        ['Số phiếu xử lý', '70 phiếu', '84 phiếu', '30/30'],
        ['Doanh thu mang về', '400 tr', '372 tr', '27/35'],
        ['Mức hài lòng khách hàng', '≥ 4.5 ⭐', '4.7 ⭐', '30/35'],
      ],
    },
    actions: [
      { label: 'Lưu chỉ tiêu theo vai trò', status: 'KPI_SAVED', message: 'Đã lưu chỉ tiêu! Hệ thống tự tính lại điểm KPI theo dữ liệu công việc thực tế.' },
    ],
  },

  system_log: {
    route: '/system-log-management',
    title: 'Nhật ký hoạt động hệ thống',
    icon: 'FileText',
    accent: '#64748b',
    fields: [{ label: 'Truy vết bản ghi', placeholder: 'Nhập mã phiếu, biển số xe hoặc tên người dùng...' }],
    table: {
      columns: ['Thời gian', 'Người thực hiện', 'Hành động'],
      rows: [
        ['29/07 14:32', 'Lê Thị C (Thủ kho)', 'Duyệt phiếu xuất XK-2026-0231'],
        ['29/07 14:05', 'Nguyễn Văn B (Cố vấn)', 'Sửa báo giá phiếu ST-2026-0148'],
        ['29/07 09:12', 'admin', 'Cập nhật giá bán SKU MIC-PRI4-2055516'],
      ],
    },
    actions: [
      { label: 'Xem chi tiết thay đổi', status: 'LOG_DETAIL', message: 'Đã mở chi tiết: dữ liệu TRƯỚC và SAU khi thay đổi để đối soát trách nhiệm!' },
    ],
    note: 'Đây là công cụ then chốt khi cần điều tra sự cố hoặc nghi vấn thất thoát.',
  },

  backend_log: {
    route: '/backend-logs',
    title: 'Log kỹ thuật Backend (Console)',
    icon: 'Terminal',
    accent: '#94a3b8',
    toolbar: ['INFO', 'WARN', 'ERROR'],
    stats: [
      { label: 'ERROR trong 1 giờ', value: '02', color: '#f87171' },
      { label: 'WARN trong 1 giờ', value: '14', color: '#facc15' },
    ],
    table: {
      columns: ['Thời gian', 'Mức', 'Logger / Thông điệp'],
      rows: [
        ['14:32:07', '🔴 ERROR', 'PaymentService — timeout khi gọi webhook ngân hàng'],
        ['14:31:55', '🟡 WARN', 'InventoryService — tồn kho SKU MIC-XM2 dưới định mức'],
        ['14:30:12', '🔵 INFO', 'AuthService — đăng nhập thành công user=thukho01'],
      ],
    },
    actions: [
      { label: 'Tải log về máy', status: 'LOG_EXPORTED', message: 'Đã tải log về máy để gửi đội kỹ thuật phân tích sâu hơn!' },
    ],
    note: 'Khác System Logs (hành vi nghiệp vụ của người dùng), đây là log kỹ thuật của máy chủ.',
  },
};

export default SANDBOX_SCREENS;
