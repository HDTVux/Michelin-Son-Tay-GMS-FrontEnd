import { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../hooks/useScrollToTop.js';
import { fetchBookingDetail, modifyCustomerBooking, fetchHomeServices, fetchAvailableSlots } from '../../services/bookingService.js';
import './EditBooking.module.css';
import './EditBooking.header.module.css';
import './EditBooking.service.module.css';
import './EditBooking.schedule.module.css';
import './EditBooking.actions.module.css';
import './EditBooking.modal.module.css';

const EditBooking = () => {
  useScrollToTop();
  const { id } = useParams();
  const navigate = useNavigate();
  const [showSuccess, setShowSuccess] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [visible, setVisible] = useState(3);
  const [index, setIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [allServices, setAllServices] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);

  const [formData, setFormData] = useState({
    selectedServices: [],
    date: '',
    time: '',
    note: ''
  });

  const [canEditTime] = useState(true);

  // Load booking detail, services, and slots
  useEffect(() => {
    const loadData = async () => {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setError('Vui lòng đăng nhập để chỉnh sửa lịch hẹn.');
        setIsLoading(false);
        return;
      }

      if (!id) {
        setError('Không tìm thấy mã lịch hẹn.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Load booking detail and services in parallel
        const [bookingResponse, servicesResponse] = await Promise.all([
          fetchBookingDetail(id, token),
          fetchHomeServices()
        ]);

        // Map booking data
        const bookingData = bookingResponse?.data;
        if (bookingData) {
          setFormData({
            selectedServices: bookingData.serviceIds?.map(id => id.toString()) || [],
            date: bookingData.scheduledDate || '',
            time: bookingData.scheduledTime || '',
            note: bookingData.description || ''
          });
        }

        // Map services data
        const services = (servicesResponse?.data || []).map(service => ({
          id: service.itemId?.toString() || service.id?.toString(),
          name: service.itemName || service.name || '',
          desc: service.description || '',
          tag: service.itemType || 'Dịch vụ',
          category: 'all'
        }));
        setAllServices(services);

        setError('');
      } catch (err) {
        const msg = err?.message || 'Không thể tải dữ liệu.';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id]);

  // Load available slots when date changes
  useEffect(() => {
    if (!formData.date) return;

    const loadSlots = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      try {
        const response = await fetchAvailableSlots(formData.date, token, 60);
        const slots = response?.data?.slots || [];
        setAvailableSlots(slots);
      } catch (err) {
        console.error('Failed to load slots:', err);
        setAvailableSlots([]);
      }
    };

    loadSlots();
  }, [formData.date]);
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

  // Generate slot groups from available slots
  const SLOT_GROUPS = useMemo(() => {
    if (availableSlots.length === 0) {
      return [
        { label: 'Sáng', items: [] },
        { label: 'Chiều', items: [] },
        { label: 'Tối', items: [] }
      ];
    }

    const morning = [];
    const afternoon = [];
    const evening = [];

    availableSlots.forEach(slot => {
      const time = slot.startTime || slot.time;
      const hour = parseInt(time.split(':')[0]);
      const slotItem = {
        time: time,
        available: slot.isAvailable !== false
      };

      if (hour < 12) morning.push(slotItem);
      else if (hour < 18) afternoon.push(slotItem);
      else evening.push(slotItem);
    });

    return [
      { label: 'Sáng', items: morning },
      { label: 'Chiều', items: afternoon },
      { label: 'Tối', items: evening }
    ];
  }, [availableSlots]);

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

  const handleSave = async (e) => {
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

    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('Vui lòng đăng nhập để lưu thay đổi');
      return;
    }

    try {
      setIsSaving(true);
      
      // Prepare payload for backend
      const payload = {
        serviceIds: formData.selectedServices.map(id => parseInt(id)),
        scheduledDate: formData.date,
        scheduledTime: formData.time,
        description: formData.note
      };

      await modifyCustomerBooking(id, payload, token);
      setShowSuccess(true);
    } catch (err) {
      alert(err?.message || 'Không thể lưu thay đổi. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
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

        {/* Error Banner */}
        {error && (
          <div className="errorBanner" style={{ 
            padding: '12px 16px', 
            marginBottom: '16px', 
            backgroundColor: '#fee', 
            color: '#c33', 
            borderRadius: '8px',
            border: '1px solid #fcc'
          }}>
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="loadingState" style={{ 
            textAlign: 'center', 
            padding: '40px', 
            color: '#666' 
          }}>
            Đang tải dữ liệu...
          </div>
        )}

        {/* Form - Only show when not loading */}
        {!isLoading && (
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
                disabled={isSaving}
              >
                Hủy chỉnh sửa
              </button>
              <button
                type="submit"
                className="btnSaveChanges"
                disabled={isSaving}
              >
                {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        )}

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
