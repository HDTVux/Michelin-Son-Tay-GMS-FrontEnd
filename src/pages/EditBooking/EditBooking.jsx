import { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import './EditBooking.css';

const EditBooking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showSuccess, setShowSuccess] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [visible, setVisible] = useState(3); // số thẻ hiển thị cùng lúc
  const [index, setIndex] = useState(0); // vị trí slide hiện tại

  // Dữ liệu mẫu - sau này sẽ lấy từ API
  const [allServices] = useState([
    {
      id: 'sv1',
      name: 'Thay dầu động cơ',
      desc: 'Kiểm tra và thay thế dầu định kỳ',
      tag: 'Bảo dưỡng nhanh',
      category: 'engine'
    },
    {
      id: 'sv2',
      name: 'Kiểm tra phanh',
      desc: 'Kiểm tra hệ thống phanh nếu cần',
      tag: 'Chăm sóc & OTOT',
      category: 'check'
    },
    {
      id: 'sv3',
      name: 'Dịch vụ rửa xe',
      desc: 'Rửa xe chuyên nghiệp',
      tag: 'Chăm sóc & OTOT',
      category: 'care'
    },
    {
      id: 'sv4',
      name: 'Thay lốp xe',
      desc: 'Thay lốp, cân mâm cao su mới và vệ sinh chi tiết cụng.',
      tag: 'Lốp & lốp',
      category: 'tires'
    },
    {
      id: 'sv5',
      name: 'Kiểm tra an toàn 12 điểm',
      desc: 'Kiểm tra tổng quát lốp, phanh, điện, dầu, gầm, nước mát...',
      tag: 'Chăm sóc & OTOT',
      category: 'check'
    }
  ]);

  const [formData, setFormData] = useState({
    selectedServices: ['sv1', 'sv2'],
    date: '2023-10-23',
    time: '10:00',
    note: 'Kiểm tra kỹ phanh trước khi đi xa'
  });

  const [canEditTime] = useState(true); // Chỉ true nếu lịch chưa được lễ tân xác nhận

  // Tính số cột hiển thị theo màn hình
  useEffect(() => {
    const handle = () => {
      const w = window.innerWidth;
      if (w <= 520) setVisible(1);
      else if (w <= 900) setVisible(2);
      else setVisible(3);
      setIndex(0);
    };
    handle();
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  // Lọc theo từ khóa và category
  const filteredServices = useMemo(() => {
    const cleaned = search.toLowerCase();
    return allServices.filter((item) => {
      const matchSearch = item.name.toLowerCase().includes(cleaned);
      const matchFilter = filter === 'all' || item.category === filter;
      return matchSearch && matchFilter;
    });
  }, [allServices, search, filter]);

  // Tổng số slide tối đa có thể lùi/tiến
  const maxIndex = Math.max(0, filteredServices.length - visible);

  // Nếu số lượng item thay đổi, đảm bảo index không vượt quá maxIndex
  useEffect(() => {
    setIndex((prev) => Math.min(prev, maxIndex));
  }, [maxIndex, filteredServices.length]);

  // Offset trượt theo % chiều ngang
  const offset = (index * 100) / visible;
  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const next = () => setIndex((i) => Math.min(maxIndex, i + 1));

  const SLOT_GROUPS = [
    {
      label: 'Sáng',
      items: [
        { time: '07:00', available: true },
        { time: '08:00', available: true },
        { time: '09:00', available: true },
        { time: '10:00', available: true },
        { time: '11:00', available: false },
        { time: '12:00', available: true }
      ]
    },
    {
      label: 'Chiều',
      items: [
        { time: '13:00', available: true },
        { time: '14:00', available: false },
        { time: '15:00', available: true },
        { time: '16:00', available: true },
        { time: '17:00', available: true }
      ]
    },
    {
      label: 'Tối',
      items: [
        { time: '18:00', available: true },
        { time: '19:00', available: true },
        { time: '20:00', available: false },
        { time: '21:00', available: true },
        { time: '22:00', available: true },
        { time: '23:00', available: true },
        { time: '24:00', available: true }
      ]
    }
  ];

  const handleServiceToggle = (serviceId) => {
    setFormData(prev => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(serviceId)
        ? prev.selectedServices.filter(id => id !== serviceId)
        : [...prev.selectedServices, serviceId]
    }));
  };

  const handleTimeSelect = (time, available) => {
    if (!available) return;
    setFormData(prev => ({ ...prev, time }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    
    // Validate
    if (formData.selectedServices.length === 0) {
      alert('Vui lòng chọn ít nhất một dịch vụ');
      return;
    }
    
    if (!formData.date || !formData.time) {
      alert('Vui lòng chọn ngày và giờ');
      return;
    }

    // TODO: Gọi API lưu thay đổi
    setShowSuccess(true);
  };

  const handleCancel = () => {
    navigate(`/booking-detail/${id}`);
  };

  const handleBackToDetail = () => {
    navigate(`/booking-detail/${id}`);
  };

  return (
    <div className="editBookingPage">
      <div className="editContainer">
        {/* Header */}
        <div className="editHeader">
          <Link to={`/booking-detail/${id}`} className="backButton">
            ← Quay lại
          </Link>
          <h1 className="pageTitle">Sửa lịch hẹn</h1>
        </div>

        <form onSubmit={handleSave}>
          {/* Chọn lại dịch vụ */}
          <section className="editSection">
            <h3 className="section-title">Chọn lại dịch vụ</h3>
            <div className="service-step">
              <div className="service-top">
                <div className="tabs">
                  <button type="button" className="tab active">Dịch vụ</button>
                  <button type="button" className="tab">Gói combo</button>
                </div>
                <div className="search-filter">
                  <div className="search-box">
                    <span className="icon">🔍</span>
                    <input
                      type="text"
                      placeholder="Tìm kiếm dịch vụ..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                    <option value="all">Tất cả</option>
                    <option value="tires">Lốp & lốp</option>
                    <option value="engine">Bảo dưỡng nhanh</option>
                    <option value="check">Chăm sóc & OTOT</option>
                  </select>
                </div>
              </div>

              <div className="carousel-shell">
                <button 
                  type="button"
                  className="nav-btn" 
                  aria-label="Prev" 
                  onClick={prev} 
                  disabled={index === 0}
                >
                  ⟨
                </button>
                <div className="slider-viewport">
                  <div
                    className="slider-track"
                    style={{ transform: `translateX(-${offset}%)` }}
                  >
                    {filteredServices.map((item) => {
                      const active = formData.selectedServices.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          className="service-slide"
                          style={{ flex: `0 0 calc((100% - 12px * ${visible - 1}) / ${visible})` }}
                        >
                          <div className="service-card">
                            <div className="thumb" />
                            <button 
                              type="button"
                              className={`check ${active ? 'checked' : ''}`} 
                              onClick={() => handleServiceToggle(item.id)}
                            >
                              {active ? '✓' : ''}
                            </button>
                            <div className="pill">{item.tag}</div>
                            <div className="name">{item.name}</div>
                            <div className="desc">{item.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <button 
                  type="button"
                  className="nav-btn" 
                  aria-label="Next" 
                  onClick={next} 
                  disabled={index >= maxIndex}
                >
                  ⟩
                </button>
              </div>

              <div className="selected-box">
                <div className="selected-title">Dịch vụ đã chọn ({formData.selectedServices.length} mục)</div>
                <div className="chip-row">
                  {formData.selectedServices.map((serviceId) => {
                    const item = allServices.find((s) => s.id === serviceId);
                    if (!item) return null;
                    return (
                      <span key={serviceId} className="chip">
                        <span className="chip-icon">🔧</span>
                        {item.name}
                        <button 
                          type="button"
                          className="chip-remove" 
                          onClick={() => handleServiceToggle(serviceId)} 
                          aria-label="Remove"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Chọn lại khung giờ */}
          {canEditTime && (
            <section className="editSection">
              <h3 className="section-title">Chọn lại khung giờ</h3>
              <div className="schedule-step">
                <div className="field">
                  <label className="slot-title">Chọn ngày đặt lịch</label>
                  <div className="date-input">
                    <span className="date-icon">📅</span>
                    <input 
                      type="date" 
                      value={formData.date} 
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                <div className="slot-section">
                  <div className="slot-title">Chọn khung giờ</div>
                  <div className="slot-sub">Khung giờ phục vụ từ 07h đến 24h. Chọn theo buổi Sáng / Chiều / Tối.</div>

                  {SLOT_GROUPS.map((group) => (
                    <div key={group.label} className="slot-group">
                      <div className="slot-group-label">{group.label}</div>
                      <div className="slot-grid">
                        {group.items.map((item) => {
                          const active = formData.time === item.time;
                          return (
                            <button
                              key={item.time}
                              type="button"
                              className={`slot-btn ${active ? 'active' : ''} ${!item.available ? 'disabled' : ''}`}
                              onClick={() => handleTimeSelect(item.time, item.available)}
                              disabled={!item.available}
                            >
                              <div className="slot-time">{item.time}</div>
                              <div className="slot-status">{item.available ? 'Còn trống' : 'Đã đầy'}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Yêu cầu thêm */}
          <section className="editSection">
            <h2 className="sectionTitle">Yêu cầu thêm</h2>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
              className="noteInput"
              placeholder="Nhập ghi chú hoặc yêu cầu đặc biệt..."
              rows={4}
            />
          </section>

          {/* Action Buttons */}
          <div className="actionButtons">
            <button
              type="button"
              className="btnCancelEdit"
              onClick={handleCancel}
            >
              Hủy chỉnh sửa
            </button>
            <button
              type="submit"
              className="btnSaveChanges"
            >
              Lưu thay đổi
            </button>
          </div>
        </form>

        {/* Success Modal */}
        {showSuccess && (
          <div className="modalOverlay" onClick={handleBackToDetail}>
            <div className="modalContent successModal" onClick={(e) => e.stopPropagation()}>
              <div className="successIcon">✓</div>
              <h3 className="modalTitle">Cập nhật thành công</h3>
              <p className="modalMessage">
                Lịch hẹn của bạn đã được cập nhật thành công
              </p>
              <button
                className="btnBackToDetail"
                onClick={handleBackToDetail}
              >
                Quay lại chi tiết lịch hẹn
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditBooking;
