import React, { useState } from 'react';
import { Play, CheckCircle2, RotateCcw, Scan, DollarSign, FileText, Wrench } from 'lucide-react';

export default function InteractiveSandbox({ type, topicTitle }) {
  const [formData, setFormData] = useState({
    licensePlate: '29A-999.88',
    customerName: 'Nguyễn Văn Hùng',
    service: 'Thay 4 lốp Michelin Primacy 4 + Cân chỉnh thước lái',
    price: 9800000,
    discount: 10,
    barcode: 'MICH-225-55R17',
    quantity: 4
  });

  const [simulatedStatus, setSimulatedStatus] = useState('DRAFT');
  const [testResult, setTestResult] = useState('');

  const finalAmount = Math.max(0, formData.price * (1 - formData.discount / 100));

  const handleSimulateAction = (newStatus, msg) => {
    setSimulatedStatus(newStatus);
    setTestResult(msg);
  };

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.7)',
      border: '1px dashed rgba(96, 165, 250, 0.4)',
      borderRadius: '12px',
      padding: '20px',
      marginTop: '24px',
      marginBottom: '24px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#60a5fa', fontWeight: 700, fontSize: '0.95rem' }}>
          <Play size={16} />
          <span>Mô phỏng Giao diện Thực hành (Interactive Sandbox): {topicTitle}</span>
        </div>
        <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', fontWeight: 600 }}>
          Môi trường Dummy thử nghiệm
        </span>
      </div>

      {type === 'booking' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Tên khách hàng:</label>
              <input 
                type="text" 
                value={formData.customerName} 
                onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '6px' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button 
              type="button"
              onClick={() => handleSimulateAction('WAITING', `Đã nhận xe ${formData.licensePlate} vào Hàng chờ tiếp nhận!`)}
              style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            >
              Thử Tiếp nhận xe
            </button>
          </div>
        </div>
      )}

      {type === 'inspection' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '0.875rem', color: '#cbd5e1', margin: 0 }}>Đánh giá tình trạng 4 lốp Michelin thực tế:</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {['Lốp Trước Trái', 'Lốp Trước Phải', 'Lốp Sau Trái', 'Lốp Sau Phải'].map((wheel, idx) => (
              <div key={idx} style={{ background: '#1e293b', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>{wheel}</span>
                <select style={{ background: '#0f172a', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '4px', borderRadius: '4px', width: '100%' }}>
                  <option value="GREEN">Đạt (Xanh)</option>
                  <option value="YELLOW">Chú ý (Vàng)</option>
                  <option value="RED">Hỏng (Đỏ)</option>
                </select>
              </div>
            ))}
          </div>
          <button 
            type="button"
            onClick={() => handleSimulateAction('INSPECTED', 'Đã lưu kết quả khảo sát an toàn 32 hạng mục!')}
            style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, alignSelf: 'flex-start' }}
          >
            Lưu phiếu khảo sát
          </button>
        </div>
      )}

      {type === 'quotation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#f1f5f9', marginBottom: '8px' }}>
              <span>{formData.service}</span>
              <span style={{ fontWeight: 700 }}>{formData.price.toLocaleString('vi-VN')} VNĐ</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Giảm giá (%):</span>
              <input 
                type="number" 
                value={formData.discount} 
                onChange={(e) => setFormData({...formData, discount: Number(e.target.value)})}
                style={{ width: '80px', padding: '4px 8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '4px' }}
              />
              <span style={{ marginLeft: 'auto', color: '#4ade80', fontWeight: 700 }}>Thành tiền: {finalAmount.toLocaleString('vi-VN')} VNĐ</span>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => handleSimulateAction('APPROVED', 'Khách hàng đã đồng ý duyệt báo giá! Đã gửi thông báo cho Kỹ thuật viên.')}
            style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, alignSelf: 'flex-start' }}
          >
            Mô phỏng Khách duyệt Báo giá
          </button>
        </div>
      )}

      {type === 'stockin' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input 
              type="text" 
              value={formData.barcode} 
              readOnly
              style={{ flex: 1, padding: '8px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', color: '#4ade80', fontFamily: 'monospace', fontWeight: 700, borderRadius: '6px' }}
            />
            <button 
              type="button"
              onClick={() => {
                handleSimulateAction('SCANNED', 'Đã quét thành công mã Michelin SKU: 225/55R17 Primacy 4! Tồn kho tự động +4.');
              }}
              style={{ padding: '8px 16px', background: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Scan size={16} />
              <span>Quét Barcode thử</span>
            </button>
          </div>
        </div>
      )}

      {/* Fallback default interactive preview for other types */}
      {(!['booking', 'inspection', 'quotation', 'stockin'].includes(type)) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1e293b', padding: '16px', borderRadius: '8px' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block' }}>Mô phỏng thao tác trạng thái:</span>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#60a5fa' }}>{simulatedStatus}</span>
          </div>
          <button 
            type="button"
            onClick={() => handleSimulateAction('SUCCESS', 'Đã thực hiện mô phỏng thành công!')}
            style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
          >
            Chạy thao tác thử
          </button>
        </div>
      )}

      {testResult && (
        <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.4)', borderRadius: '6px', color: '#4ade80', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} />
          <span>{testResult}</span>
        </div>
      )}
    </div>
  );
}
