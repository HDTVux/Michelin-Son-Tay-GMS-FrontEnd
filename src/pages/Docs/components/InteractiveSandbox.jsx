import React, { useState } from 'react';
import { 
  Play, 
  CheckCircle2, 
  RotateCcw, 
  Scan, 
  DollarSign, 
  FileText, 
  Wrench, 
  Search, 
  UserCheck, 
  Box, 
  Printer, 
  QrCode, 
  Sparkles, 
  Layers,
  ArrowRight,
  ShieldAlert,
  Camera
} from 'lucide-react';

export default function InteractiveSandbox({ type = 'overview', topicTitle = 'Nghiệp vụ' }) {
  // Local state for sandbox simulations
  const [formData, setFormData] = useState({
    licensePlate: '29A-888.99',
    customerName: 'Trần Văn Mạnh',
    phone: '0988.123.456',
    odometer: '45,000 km',
    service: 'Thay 4 lốp Michelin Primacy 4 + Cân chỉnh thước lái ST Hunter',
    price: 9800000,
    discount: 10,
    barcode: 'MICHELIN-225-55R17-P4',
    newPassword: '',
    confirmPassword: '',
    searchQuery: ''
  });

  const [simulatedStatus, setSimulatedStatus] = useState('DRAFT');
  const [testResult, setTestResult] = useState('');
  const [activeStep, setActiveStep] = useState(1);
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
          <span>Mô phỏng Giao diện Thực hành (Interactive Sandbox){topicTitle ? `: ${topicTitle}` : ''}</span>
        </div>
        <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px', background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.3)', fontWeight: 600 }}>
          Môi trường Dummy Thực hành Tương tác
        </span>
      </div>

      {/* Sandbox 1: Overview Module Simulator */}
      {type === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: 0 }}>
            Nhấp vào từng phân hệ để xem luồng dữ liệu tự động luân chuyển trên Michelin GMS:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            {[
              { id: 1, name: '1. Lễ tân', role: 'Tiếp nhận xe', icon: <UserCheck size={20} /> },
              { id: 2, name: '2. Cố vấn', role: 'Khảo sát & Báo giá', icon: <FileText size={20} /> },
              { id: 3, name: '3. Thủ kho', role: 'Xuất phụ tùng', icon: <Box size={20} /> },
              { id: 4, name: '4. Kỹ thuật', role: 'Sửa chữa xưởng', icon: <Wrench size={20} /> },
              { id: 5, name: '5. Thu ngân', role: 'Thanh toán', icon: <DollarSign size={20} /> }
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setActiveStep(m.id);
                  handleAction('MODULE_' + m.id, `Đã chọn ${m.name}: Dữ liệu tự động chuyển tới bước tiếp theo!`);
                }}
                style={{
                  padding: '12px',
                  background: activeStep === m.id ? 'rgba(37, 99, 235, 0.3)' : '#1e293b',
                  border: activeStep === m.id ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  color: activeStep === m.id ? '#60a5fa' : '#94a3b8',
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {m.icon}
                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{m.name}</span>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{m.role}</span>
              </button>
            ))}
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
      {(!['overview', 'profile', 'search', 'booking', 'inspection', 'quotation', 'mytasks', 'stockin', 'payment'].includes(type)) && (
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
