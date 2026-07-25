import React, { useState } from 'react';
import { 
  Play, 
  CheckCircle2, 
  Scan, 
  DollarSign, 
  FileText, 
  Wrench, 
  Search, 
  UserCheck, 
  Box, 
  QrCode, 
  ArrowRight, 
  ShoppingBag, 
  Globe, 
  Building2, 
  Car, 
  Store,
  Check,
  Zap,
  RotateCcw,
  Clock,
  HeartHandshake,
  ShieldCheck,
  PackageCheck
} from 'lucide-react';

export default function InteractiveSandbox({ type = 'overview', topicTitle = 'Nghiệp vụ' }) {
  // 10 Entry Points configuration for system overview matrix
  const ENTRY_POINTS = [
    { 
      id: 'retail', 
      name: 'Khách lẻ', 
      icon: <Car size={18} />, 
      color: '#3b82f6', 
      desc: 'Khách hàng đưa xe trực tiếp tới garage bảo dưỡng, thay lốp',
      steps: [
        { id: 1, title: 'Lễ tân tiếp nhận', sub: 'Tạo phiếu dịch vụ & thông tin xe', role: 'Lễ tân' },
        { id: 2, title: 'Cố vấn khảo sát 32 hạng mục', sub: 'Kiểm tra an toàn & Lập báo giá', role: 'Cố vấn' },
        { id: 3, title: 'Xuất vật tư thay thế', sub: 'Xuất lốp Michelin & phụ tùng theo phiếu', role: 'Thủ kho / Quản lý kho' },
        { id: 4, title: 'Kỹ thuật viên sửa chữa', sub: 'Thay lốp, cân bằng & căn chỉnh 3D', role: 'Kỹ thuật' },
        { id: 5, title: 'Thu ngân thanh toán', sub: 'In hóa đơn GTGT & Thu tiền', role: 'Thu ngân' }
      ]
    },
    { 
      id: 'casual', 
      name: 'Khách vãng lai', 
      icon: <Store size={18} />, 
      color: '#eab308', 
      desc: 'Khách mua phụ tùng lẻ hoặc xử lý sự cố nhanh lấy ngay',
      steps: [
        { id: 1, title: 'Bán hàng tiếp nhận', sub: 'Tạo đơn mua lẻ / Dịch vụ nhanh', role: 'Lễ tân / Thu ngân' },
        { id: 2, title: 'Thủ kho xuất hàng', sub: 'Lấy sản phẩm lẻ từ kệ kho', role: 'Thủ kho / Quản lý kho' },
        { id: 3, title: 'Thanh toán & Bàn giao', sub: 'Thu tiền mặt / QR & Giao hàng', role: 'Thu ngân' }
      ]
    },
    { 
      id: 'dealer_buy', 
      name: 'Đại lý mua hàng', 
      icon: <Building2 size={18} />, 
      color: '#a855f7', 
      desc: 'Đại lý đối tác nhập sỉ số lượng lớn tại kho',
      steps: [
        { id: 1, title: 'Bộ phận Bán hàng sỉ', sub: 'Tạo hợp đồng / Đơn sỉ đại lý', role: 'Quản lý / Kinh doanh' },
        { id: 2, title: 'Lập phiếu xuất sỉ & Duyệt kho', sub: 'Soạn lô lốp Michelin theo SKU & Duyệt kho', role: 'Thủ kho / Quản lý kho' },
        { id: 3, title: 'Chốt công nợ & VAT', sub: 'Xuất hóa đơn sỉ & Ghi nhận công nợ', role: 'Kế toán' }
      ]
    },
    { 
      id: 'online_booking', 
      name: 'Khách đặt online', 
      icon: <Globe size={18} />, 
      color: '#06b6d4', 
      desc: 'Khách hàng đặt lịch hẹn trước qua App / Web booking',
      steps: [
        { id: 1, title: 'Hệ thống nhận giữ chỗ', sub: 'Tự động tạo lịch hẹn chờ duyệt', role: 'Hệ thống' },
        { id: 2, title: 'Lễ tân xác nhận', sub: 'Xác nhận khung giờ & chuẩn bị đón', role: 'Lễ tân' },
        { id: 3, title: 'Cố vấn & Kỹ thuật làm việc', sub: 'Tiếp nhận xe đúng giờ hẹn', role: 'Cố vấn / Kỹ thuật' },
        { id: 4, title: 'Thu ngân chốt hóa đơn', sub: 'Áp dụng mã giảm giá online & Thu tiền', role: 'Thu ngân' }
      ]
    },
    { 
      id: 'dealer_order', 
      name: 'Đại lý đặt hàng', 
      icon: <ShoppingBag size={18} />, 
      color: '#ec4899', 
      desc: 'Đại lý gửi đơn hàng sỉ trực tuyến qua hệ thống B2B',
      steps: [
        { id: 1, title: 'Tự động nhận đơn sỉ B2B', sub: 'Tự động kiểm tra tồn kho tối thiểu', role: 'Hệ thống' },
        { id: 2, title: 'Duyệt đơn sỉ & Soạn hàng', sub: 'Duyệt hạn mức tín dụng đại lý & duyệt xuất', role: 'Quản lý kho' },
        { id: 3, title: 'Xuất kho & Vận chuyển', sub: 'Đóng gói & Bàn giao đơn vị vận chuyển', role: 'Thủ kho / Kế toán' }
      ]
    },
    {
      id: 'warehouse_mgr',
      name: 'Nghiệp vụ Quản lý kho',
      icon: <PackageCheck size={18} />,
      color: '#f59e0b',
      desc: 'Cài đặt ngưỡng tồn kho an toàn, duyệt phiếu nhập/xuất & kiểm kê định kỳ',
      steps: [
        { id: 1, title: 'Thiết lập Tồn kho An toàn', sub: 'Cài đặt ngưỡng tồn kho tối thiểu SKU lốp Michelin', role: 'Quản lý kho' },
        { id: 2, title: 'Phê duyệt Phiếu Nhập / Xuất kho', sub: 'Kiểm tra chứng từ & Duyệt phiếu xuất phụ tùng xưởng', role: 'Quản lý kho' },
        { id: 3, title: 'Kiểm kê Kho & Đối soát', sub: 'Xử lý chênh lệch số liệu kiểm kê thực tế vs Hệ thống', role: 'Quản lý kho' }
      ]
    },
    {
      id: 'stock_flow',
      name: 'Xuất nhập kho',
      icon: <Box size={18} />,
      color: '#f97316',
      desc: 'Nhập hàng nhà cung cấp Michelin & điều chuyển kho',
      steps: [
        { id: 1, title: 'Tạo phiếu nhập / xuất kho', sub: 'Khởi tạo yêu cầu nhập từ nhà cung cấp hoặc điều chuyển', role: 'Thủ kho / Quản lý kho' },
        { id: 2, title: 'Quét mã Barcode & Khay kệ', sub: 'Quét SKU Michelin, kiểm đếm số lượng & gán vị trí khay A-102', role: 'Thủ kho' },
        { id: 3, title: 'Kế toán chốt kho & Tài sản', sub: 'Xác nhận số lượng tồn kho thực tế & Cập nhật giá vốn', role: 'Kế toán' }
      ]
    },
    {
      id: 'returns_flow',
      name: 'Hoàn trả hàng',
      icon: <RotateCcw size={18} />,
      color: '#ef4444',
      desc: 'Xử lý trả hàng/phụ tùng lỗi từ khách hàng hoặc đại lý',
      steps: [
        { id: 1, title: 'Tiếp nhận yêu cầu trả hàng', sub: 'Ghi nhận lý do trả hàng & tình trạng tem mác', role: 'Lễ tân / Cố vấn' },
        { id: 2, title: 'Kiểm định chất lượng', sub: 'Kiểm tra lỗi nhà sản xuất Michelin hay lỗi vận hành', role: 'Kỹ thuật / Quản lý kho' },
        { id: 3, title: 'Hoàn tiền / Đổi lốp mới', sub: 'Tạo phiếu nhập trả & Thu ngân hoàn tiền hoặc xuất mới', role: 'Thu ngân / Thủ kho' }
      ]
    },
    {
      id: 'attendance_flow',
      name: 'Chấm công nhân viên',
      icon: <Clock size={18} />,
      color: '#10b981',
      desc: 'Theo dõi ca làm việc, điểm danh & tính toán hiệu suất',
      steps: [
        { id: 1, title: 'Check-in đầu ca làm việc', sub: 'Điểm danh chấm công khi tới garage', role: 'Nhân viên' },
        { id: 2, title: 'Ghi nhận giờ công & KPI', sub: 'Tự động tính giờ tăng ca & số phiếu dịch vụ hoàn thành', role: 'Hệ thống' },
        { id: 3, title: 'Duyệt bảng công & Tính lương', sub: 'Duyệt bảng chấm công tháng & Xuất phiếu lương', role: 'Quản lý / Kế toán' }
      ]
    },
    {
      id: 'crm_flow',
      name: 'Chăm sóc khách hàng',
      icon: <HeartHandshake size={18} />,
      color: '#8b5cf6',
      desc: 'Nhắc lịch bảo dưỡng định kỳ, khảo sát CSAT & gửi Voucher',
      steps: [
        { id: 1, title: 'Cảnh báo lịch bảo dưỡng', sub: 'Tự động lọc xe tới hạn 5,000 km hoặc sau 6 tháng', role: 'Hệ thống' },
        { id: 2, title: 'Gọi điện & Gửi Zalo OA', sub: 'Liên hệ nhắc khách đặt lịch hẹn thay dầu / đảo lốp', role: 'Chăm sóc KH' },
        { id: 3, title: 'Khảo sát CSAT & Tích điểm', sub: 'Gửi link đánh giá dịch vụ & Tặng voucher ưu đãi', role: 'Chăm sóc KH' }
      ]
    }
  ];

  // Active state for Overview Sandbox
  const [selectedEntryId, setSelectedEntryId] = useState('retail');
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // Local state for other sandbox simulations
  const [formData, setFormData] = useState({
    licensePlate: '29A-888.99',
    customerName: 'Trần Văn Mạnh',
    odometer: '45,000 km',
    service: 'Thay 4 lốp Michelin Primacy 4 + Cân chỉnh thước lái ST Hunter',
    price: 9800000,
    discount: 10,
    barcode: 'MICHELIN-225-55R17-P4',
    newPassword: '',
    confirmPassword: '',
    searchQuery: '',
    minStockThreshold: 10
  });

  const [simulatedStatus, setSimulatedStatus] = useState('DRAFT');
  const [testResult, setTestResult] = useState('');
  const [inspectionItems, setInspectionItems] = useState({
    tireFrontLeft: 'GREEN',
    tireFrontRight: 'YELLOW',
    tireRearLeft: 'GREEN',
    tireRearRight: 'RED',
    brakePads: 'YELLOW',
    battery: 'GREEN'
  });

  const [mytasksCheck, setMytasksCheck] = useState({
    task1: true,
    task2: false,
    task3: false
  });

  const [paymentDone, setPaymentDone] = useState(false);

  const activeEntry = ENTRY_POINTS.find(e => e.id === selectedEntryId) || ENTRY_POINTS[0];
  const finalAmount = Math.max(0, formData.price * (1 - formData.discount / 100));

  const handleAction = (status, msg) => {
    setSimulatedStatus(status);
    setTestResult(msg);
  };

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.75)',
      border: '1px solid rgba(96, 165, 250, 0.35)',
      borderRadius: '12px',
      padding: '24px',
      marginTop: '24px',
      marginBottom: '24px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#60a5fa', fontWeight: 700, fontSize: '1rem' }}>
          <Play size={18} />
          <span>Mô phỏng Giao diện Thực hành{topicTitle ? `: ${topicTitle}` : ''}</span>
        </div>
        <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px', background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.3)', fontWeight: 600 }}>
          Thực hành Tương tác
        </span>
      </div>

      {/* Sandbox 1: Redesigned System Matrix Diagram with 10 Entry Points */}
      {type === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Label */}
          <div>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
              Chọn 1 trong <strong>các Luồng Bắt Đầu Đầu Vào</strong> bên dưới để xem sơ đồ quy trình liên thông toàn hệ thống:
            </span>

            {/* 10 Entry Points Selector Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
              {ENTRY_POINTS.map((entry) => {
                const isSelected = selectedEntryId === entry.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => {
                      setSelectedEntryId(entry.id);
                      setActiveStepIndex(0);
                      handleAction('ENTRY_' + entry.id, `Đã chọn luồng đầu vào: ${entry.name}. Hệ thống vẽ nhánh quy trình liên phân hệ!`);
                    }}
                    style={{
                      padding: '12px',
                      background: isSelected ? 'rgba(30, 41, 59, 0.9)' : 'rgba(15, 23, 42, 0.6)',
                      border: isSelected ? `2px solid ${entry.color}` : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      color: isSelected ? '#ffffff' : '#94a3b8',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                      boxShadow: isSelected ? `0 4px 16px ${entry.color}33` : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ color: entry.color, display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                        {entry.icon}
                        <span>{entry.name}</span>
                      </div>
                      {isSelected && <Zap size={14} color={entry.color} />}
                    </div>
                    <span style={{ fontSize: '0.725rem', color: '#64748b', lineHeight: 1.4 }}>{entry.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Flow Matrix Visualization Panel */}
          <div style={{ background: '#0b1329', border: `1px solid ${activeEntry.color}44`, borderRadius: '12px', padding: '20px', marginTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: activeEntry.color }} />
                <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.95rem' }}>
                  Quy trình Phối hợp: {activeEntry.name}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {activeEntry.steps.length} bước liên thông
              </span>
            </div>

            {/* Stepper Pipeline Matrix */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeEntry.steps.map((st, idx) => {
                const isActive = activeStepIndex === idx;
                const isPassed = activeStepIndex > idx;
                return (
                  <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveStepIndex(idx);
                        handleAction('STEP_' + st.id, `Bước ${idx + 1}: ${st.title} (${st.role})`);
                      }}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: isActive ? 'rgba(37, 99, 235, 0.2)' : isPassed ? 'rgba(34, 197, 94, 0.1)' : 'rgba(30, 41, 59, 0.6)',
                        border: isActive ? '1px solid #3b82f6' : isPassed ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: isPassed ? '#16a34a' : isActive ? '#2563eb' : '#334155',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.8rem'
                        }}>
                          {isPassed ? <Check size={14} /> : idx + 1}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: isActive ? '#60a5fa' : isPassed ? '#4ade80' : '#f1f5f9' }}>
                            {st.title}
                          </div>
                          <span style={{ fontSize: '0.775rem', color: '#94a3b8' }}>{st.sub}</span>
                        </div>
                      </div>

                      <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', background: 'rgba(15, 23, 42, 0.6)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {st.role}
                      </span>
                    </button>
                    {idx < activeEntry.steps.length - 1 && (
                      <ArrowRight size={16} style={{ color: isPassed ? '#4ade80' : '#475569', flexShrink: 0 }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Stepper Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Đang xem Bước {activeStepIndex + 1}/{activeEntry.steps.length}: <strong style={{ color: '#60a5fa' }}>{activeEntry.steps[activeStepIndex]?.title}</strong>
              </span>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  disabled={activeStepIndex === 0}
                  onClick={() => setActiveStepIndex(prev => Math.max(0, prev - 1))}
                  style={{ padding: '6px 12px', background: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: activeStepIndex > 0 ? 'pointer' : 'not-allowed', fontSize: '0.8rem' }}
                >
                  ◄ Bước trước
                </button>
                <button
                  type="button"
                  disabled={activeStepIndex === activeEntry.steps.length - 1}
                  onClick={() => setActiveStepIndex(prev => Math.min(activeEntry.steps.length - 1, prev + 1))}
                  style={{ padding: '6px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: activeStepIndex < activeEntry.steps.length - 1 ? 'pointer' : 'not-allowed', fontSize: '0.8rem', fontWeight: 600 }}
                >
                  Bước tiếp theo ➔
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sandbox: Warehouse Manager Operations Simulator */}
      {type === 'warehouse_manager' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={18} />
                Bảng điều khiển Quản lý Kho (Warehouse Manager Control)
              </span>
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: '#10b98122', color: '#34d399', borderRadius: '4px', border: '1px solid #10b98144' }}>Role: WAREHOUSE_MANAGER</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Cài đặt Tồn kho An toàn (Min Threshold):</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="number" 
                    value={formData.minStockThreshold} 
                    onChange={(e) => setFormData({...formData, minStockThreshold: Number(e.target.value)})}
                    style={{ width: '90px', padding: '6px 10px', background: '#0f172a', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#fff', borderRadius: '6px', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>lốp Michelin 225/55R17</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Trạng thái cảnh báo tồn kho:</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#34d399' }}>Tồn kho an toàn (Hiện có 24 cái / Min {formData.minStockThreshold})</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              type="button"
              onClick={() => handleAction('APPROVED_STOCK_OUT', 'Quản lý kho đã phê duyệt Phiếu xuất kho #ST-OUT-889! Đã gửi thông báo cho Thủ kho soạn hàng.')}
              style={{ padding: '10px 18px', background: '#f59e0b', color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <PackageCheck size={16} />
              <span>Duyệt Phiếu Xuất Kho</span>
            </button>
            <button 
              type="button"
              onClick={() => handleAction('RECONCILED', 'Đã chốt kết quả kiểm kê kho định kỳ! Hệ thống tự động cân bằng chênh lệch +2 lốp.')}
              style={{ padding: '10px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
            >
              Chốt Kiểm kê Kho
            </button>
          </div>
        </div>
      )}

      {/* Sandbox 2: Profile Password Change Simulator */}
      {type === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Mật khẩu mới:</label>
              <input 
                type="password" 
                placeholder="Nhập mật khẩu mới..."
                value={formData.newPassword} 
                onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Xác nhận mật khẩu:</label>
              <input 
                type="password" 
                placeholder="Nhập lại mật khẩu..."
                value={formData.confirmPassword} 
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '6px' }}
              />
            </div>
          </div>
          <button 
            type="button"
            onClick={() => {
              if (!formData.newPassword) {
                handleAction('ERROR', 'Vui lòng nhập mật khẩu mới!');
              } else if (formData.newPassword !== formData.confirmPassword) {
                handleAction('ERROR', 'Mật khẩu xác nhận không trùng khớp!');
              } else {
                handleAction('SUCCESS', 'Đổi mật khẩu thành công! Mật khẩu đã mã hóa Bcrypt trong DB.');
              }
            }}
            style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, alignSelf: 'flex-start' }}
          >
            Thử Đổi mật khẩu
          </button>
        </div>
      )}

      {/* Sandbox 3: Search Bar Simulator */}
      {type === 'search' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
            <input 
              type="text" 
              placeholder="Gõ thử biển số xe '29A' hoặc mã phiếu 'ST-2026'..."
              value={formData.searchQuery}
              onChange={(e) => setFormData({...formData, searchQuery: e.target.value})}
              style={{ width: '100%', padding: '10px 12px 10px 36px', background: '#0f172a', border: '1px solid rgba(96,165,250,0.4)', color: '#fff', borderRadius: '8px' }}
            />
          </div>
          {formData.searchQuery && (
            <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Kết quả tìm kiếm phù hợp:</span>
              <div style={{ padding: '8px', background: '#0f172a', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 700, color: '#60a5fa' }}>Xe 29A-888.99 (Toyota Camry)</span>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block' }}>Chủ xe: Trần Văn Mạnh • Phiếu #ST-8891</span>
                </div>
                <button type="button" onClick={() => handleAction('NAVIGATED', 'Đã chuyển hướng đến Phiếu dịch vụ ST-8891')} style={{ padding: '4px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Mở phiếu</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sandbox 4: Booking Check-in Simulator */}
      {type === 'booking' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Biển số xe:</label>
              <input 
                type="text" 
                value={formData.licensePlate} 
                onChange={(e) => setFormData({...formData, licensePlate: e.target.value})}
                style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Khách hàng:</label>
              <input 
                type="text" 
                value={formData.customerName} 
                onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Số KM hiện tại:</label>
              <input 
                type="text" 
                value={formData.odometer} 
                onChange={(e) => setFormData({...formData, odometer: e.target.value})}
                style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '6px' }}
              />
            </div>
          </div>
          <button 
            type="button"
            onClick={() => handleAction('WAITING', `Đã tiếp nhận xe ${formData.licensePlate} (${formData.customerName}) vào Hàng chờ dịch vụ!`)}
            style={{ padding: '10px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, alignSelf: 'flex-start' }}
          >
            Thử Tiếp nhận Xe
          </button>
        </div>
      )}

      {/* Sandbox 5: 32-Point Safety Inspection Tool Simulator */}
      {type === 'inspection' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '0.875rem', color: '#cbd5e1', margin: 0 }}>Nhấp thay đổi trạng thái hạng mục lốp & phanh để thử nghiệm đánh giá độ an toàn:</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {[
              { key: 'tireFrontLeft', label: 'Lốp Trước Trái' },
              { key: 'tireFrontRight', label: 'Lốp Trước Phải' },
              { key: 'tireRearLeft', label: 'Lốp Sau Trái' },
              { key: 'tireRearRight', label: 'Lốp Sau Phải' },
              { key: 'brakePads', label: 'Má phanh Trước' },
              { key: 'battery', label: 'Ắc quy 12V GS' },
            ].map((item) => (
              <div key={item.key} style={{ background: '#1e293b', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>{item.label}</span>
                <select 
                  value={inspectionItems[item.key]}
                  onChange={(e) => setInspectionItems({...inspectionItems, [item.key]: e.target.value})}
                  style={{
                    background: inspectionItems[item.key] === 'RED' ? '#991b1b' : inspectionItems[item.key] === 'YELLOW' ? '#854d0e' : '#166534',
                    color: '#fff',
                    border: 'none',
                    padding: '6px',
                    borderRadius: '4px',
                    width: '100%',
                    fontWeight: 700
                  }}
                >
                  <option value="GREEN">Đạt (An toàn)</option>
                  <option value="YELLOW">Chú ý (Theo dõi)</option>
                  <option value="RED">Nguy hiểm (Thay ngay)</option>
                </select>
              </div>
            ))}
          </div>
          <button 
            type="button"
            onClick={() => handleAction('INSPECTED', 'Đã hoàn thành khảo sát 32 hạng mục! Đã phát hiện 1 lốp bị dính đinh cần thay thế.')}
            style={{ padding: '10px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, alignSelf: 'flex-start' }}
          >
            Lưu phiếu khảo sát
          </button>
        </div>
      )}

      {/* Sandbox 6: Quotation & Discount Calculator Simulator */}
      {type === 'quotation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: '#1e293b', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#f1f5f9', marginBottom: '10px' }}>
              <span>{formData.service}</span>
              <span style={{ fontWeight: 700 }}>{formData.price.toLocaleString('vi-VN')} VNĐ</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Giảm giá khuyến mãi (%):</span>
              <input 
                type="number" 
                value={formData.discount} 
                onChange={(e) => setFormData({...formData, discount: Math.min(100, Math.max(0, Number(e.target.value)))})}
                style={{ width: '90px', padding: '6px 10px', background: '#0f172a', border: '1px solid rgba(96,165,250,0.4)', color: '#fff', borderRadius: '6px', fontWeight: 700 }}
              />
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Tổng tiền sau giảm:</span>
                <span style={{ color: '#4ade80', fontWeight: 800, fontSize: '1.1rem' }}>{finalAmount.toLocaleString('vi-VN')} VNĐ</span>
              </div>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => handleAction('APPROVED', 'Khách hàng đã xác nhận duyệt báo giá! Đã tự động gửi yêu cầu vật tư cho Thủ kho.')}
            style={{ padding: '10px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, alignSelf: 'flex-start' }}
          >
            Khách duyệt Báo giá
          </button>
        </div>
      )}

      {/* Sandbox 7: Technician My Tasks Simulator */}
      {type === 'mytasks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Danh sách công việc cần làm trên xe 29A-888.99:</span>
          {[
            { id: 'task1', name: 'Tháo 4 bánh & Thay 4 lốp Michelin Primacy 4' },
            { id: 'task2', name: 'Cân bằng động kẹp chì 4 bánh' },
            { id: 'task3', name: 'Cân chỉnh thước lái Hunter 3D' }
          ].map(t => (
            <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: '#1e293b', borderRadius: '6px', cursor: 'pointer' }}>
              <input 
                type="checkbox"
                checked={mytasksCheck[t.id]}
                onChange={(e) => setMytasksCheck({...mytasksCheck, [t.id]: e.target.checked})}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ color: mytasksCheck[t.id] ? '#4ade80' : '#f1f5f9', fontWeight: mytasksCheck[t.id] ? 700 : 400, textDecoration: mytasksCheck[t.id] ? 'line-through' : 'none' }}>{t.name}</span>
            </label>
          ))}
          <button 
            type="button"
            onClick={() => handleAction('FINISHED', 'Đã cập nhật tiến độ 100%! Đã gửi thông báo Cố vấn kiểm tra chất lượng (QC).')}
            style={{ padding: '10px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, alignSelf: 'flex-start' }}
          >
            Nộp kết quả sửa chữa
          </button>
        </div>
      )}

      {/* Sandbox 8: Barcode & Stock Entry Simulator */}
      {type === 'stockin' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input 
              type="text" 
              value={formData.barcode} 
              readOnly
              style={{ flex: 1, padding: '10px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', color: '#4ade80', fontFamily: 'monospace', fontWeight: 700, borderRadius: '6px' }}
            />
            <button 
              type="button"
              onClick={() => handleAction('SCANNED', 'Đã quét thành công tem Michelin SKU: 225/55R17 Primacy 4! Khay vị trí: A-102. Tồn kho +4.')}
              style={{ padding: '10px 18px', background: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Scan size={16} />
              <span>Thử Quét Barcode</span>
            </button>
          </div>
        </div>
      )}

      {/* Sandbox 9: VietQR Payment Simulator */}
      {type === 'payment' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1e293b', padding: '16px', borderRadius: '8px' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block' }}>Mã VietQR động thanh toán:</span>
              <span style={{ fontWeight: 800, color: '#60a5fa', fontSize: '1.1rem' }}>{finalAmount.toLocaleString('vi-VN')} VNĐ</span>
            </div>
            <button 
              type="button"
              onClick={() => {
                setPaymentDone(true);
                handleAction('PAID', 'Đã nhận Webhook Ngân hàng thanh toán thành công 8,820,000 VNĐ! Đã tự động in Hóa đơn GTGT.');
              }}
              style={{ padding: '10px 18px', background: paymentDone ? '#16a34a' : '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <QrCode size={18} />
              <span>{paymentDone ? 'Đã thanh toán (PAID)' : 'Giả lập Quét QR xong'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Sandbox 10: General Fallback Action Simulator */}
      {(!['overview', 'warehouse_manager', 'profile', 'search', 'booking', 'inspection', 'quotation', 'mytasks', 'stockin', 'payment'].includes(type)) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1e293b', padding: '16px', borderRadius: '8px' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block' }}>Mô phỏng trạng thái hệ thống:</span>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#60a5fa' }}>{simulatedStatus}</span>
          </div>
          <button 
            type="button"
            onClick={() => handleAction('SUCCESS', 'Đã thực hiện thành công thao tác thực hành thử!')}
            style={{ padding: '10px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
          >
            Thực hành thao tác thử
          </button>
        </div>
      )}

      {/* Simulation Output Result Box */}
      {testResult && (
        <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.4)', borderRadius: '8px', color: '#4ade80', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 size={18} />
          <span style={{ fontWeight: 600 }}>{testResult}</span>
        </div>
      )}
    </div>
  );
}
