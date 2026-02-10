import { useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../hooks/useScrollToTop.js';
import './BookingDetail.css';
import './BookingDetail.header.css';
import './BookingDetail.sections.css';
import './BookingDetail.actions.css';
import './BookingDetail.modal.css';

const BookingDetail = () => {
  useScrollToTop();
  const { id } = useParams();
  const navigate = useNavigate();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Dữ liệu mẫu - sau này sẽ lấy từ API dựa vào id
  // Dữ liệu này phải khớp với dữ liệu trong MyBookings.jsx
  const allBookings = useMemo(() => [
    {
      id: 'LH001',
      date: '23/10/2023',
      time: '10:00',
      status: 'confirmed',
      statusText: 'Đã xác nhận',
      services: [
        {
          id: 'sv1',
          name: 'Thay dầu',
          description: 'Thay dầu động cơ, Kiểm tra và thay thế dầu định kỳ'
        },
        {
          id: 'sv2',
          name: 'Kiểm tra phanh',
          description: 'Kiểm tra hệ thống phanh nếu cần'
        }
      ],
      note: 'Kiểm tra kỹ phanh trước khi đi xa',
      workshop: {
        name: 'Xưởng sửa chữa ABC',
        address: '123 Đường ABC, Quận 1, TPHCM'
      }
    },
    {
      id: 'LH002',
      date: '19/10/2023',
      time: '14:30',
      status: 'confirmed',
      statusText: 'Đã xác nhận',
      services: [
        {
          id: 'sv3',
          name: 'Sửa chữa động cơ',
          description: 'Kiểm tra và sửa chữa các vấn đề về động cơ'
        }
      ],
      note: '',
      workshop: {
        name: 'Xưởng sửa chữa XYZ',
        address: '456 Đường XYZ, Quận 2, TPHCM'
      }
    },
    {
      id: 'LH003',
      date: '19/10/2023',
      time: '09:00',
      status: 'processing',
      statusText: 'Đang xử lý',
      services: [
        {
          id: 'sv4',
          name: 'Bảo dưỡng định kỳ',
          description: 'Bảo dưỡng định kỳ theo khuyến nghị của nhà sản xuất'
        }
      ],
      note: '',
      workshop: {
        name: 'Xưởng sửa chữa ABC',
        address: '123 Đường ABC, Quận 1, TPHCM'
      }
    },
    {
      id: 'LH004',
      date: '15/10/2023',
      time: '11:00',
      status: 'completed',
      statusText: 'Hoàn tất',
      services: [
        {
          id: 'sv5',
          name: 'Thay lốp',
          description: 'Thay lốp mới cho xe'
        },
        {
          id: 'sv6',
          name: 'Cân bằng',
          description: 'Cân bằng lốp sau khi thay'
        }
      ],
      note: '',
      workshop: {
        name: 'Xưởng sửa chữa ABC',
        address: '123 Đường ABC, Quận 1, TPHCM'
      }
    },
    {
      id: 'LH005',
      date: '10/10/2023',
      time: '15:00',
      status: 'cancelled',
      statusText: 'Đã hủy',
      services: [
        {
          id: 'sv7',
          name: 'Kiểm tra tổng quát',
          description: 'Kiểm tra tổng quát tình trạng xe'
        }
      ],
      note: '',
      workshop: {
        name: 'Xưởng sửa chữa XYZ',
        address: '456 Đường XYZ, Quận 2, TPHCM'
      }
    }
  ], []);

  // Tìm booking theo ID từ URL params
  const booking = useMemo(() => {
    return allBookings.find(b => b.id === id) || allBookings[0];
  }, [id, allBookings]);

  // Chỉ cho phép sửa nếu lịch chưa hoàn tất và chưa bị hủy
  const isCompleted = booking.status === 'completed' || booking.statusText === 'Hoàn tất';
  const isCancelled = booking.status === 'cancelled' || booking.statusText === 'Đã hủy';
  const canEdit = !isCompleted && !isCancelled;

  const handleCancel = () => {
    setShowCancelConfirm(true);
  };

  const confirmCancel = () => {
    // TODO: Gọi API hủy lịch
    alert('Đã gửi yêu cầu hủy lịch');
    setShowCancelConfirm(false);
    navigate('/my-bookings');
  };

  const getStatusClass = (status) => {
    const statusMap = {
      confirmed: 'status-confirmed',
      processing: 'status-processing',
      completed: 'status-completed',
      cancelled: 'status-cancelled',
      pending: 'status-pending'
    };
    return statusMap[status] || '';
  };

  return (
    <div className="bookingDetailPage">
      <div className="detailContainer">
        {/* Header */}
        <div className="detailHeader">
          <Link to="/my-bookings" className="backButton">
            ← Quay lại
          </Link>
          <h1 className="pageTitle">Chi tiết lịch hẹn</h1>
        </div>

        {/* Thông tin lịch hẹn */}
        <section className="detailSection">
          <h2 className="sectionTitle">Thông tin lịch hẹn</h2>
          <div className="infoGrid">
            <div className="infoItem">
              <span className="infoLabel">Mã lịch:</span>
              <span className="infoValue">{booking.id}</span>
            </div>
            <div className="infoItem">
              <span className="infoLabel">Ngày & giờ:</span>
              <span className="infoValue">{booking.date} {booking.time}</span>
            </div>
            <div className="infoItem">
              <span className="infoLabel">Trạng thái:</span>
              <span className={`infoValue status-badge ${getStatusClass(booking.status)}`}>
                {booking.statusText}
              </span>
            </div>
          </div>
        </section>

        {/* Dịch vụ đã chọn */}
        <section className="detailSection">
          <h2 className="sectionTitle">Dịch vụ đã chọn</h2>
          <div className="servicesList">
            {booking.services.map((service, index) => (
              <div key={service.id} className="serviceItem">
                <div className="serviceNumber">Dịch vụ {index + 1}:</div>
                <div className="serviceInfo">
                  <div className="serviceName">{service.name}</div>
                  <div className="serviceDescription">{service.description}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Yêu cầu thêm */}
        {booking.note && (
          <section className="detailSection">
            <h2 className="sectionTitle">Yêu cầu thêm</h2>
            <div className="noteContent">
              <p>Ghi chú: {booking.note}</p>
            </div>
          </section>
        )}

        {/* Địa chỉ xưởng */}
        <section className="detailSection">
          <h2 className="sectionTitle">Địa chỉ xưởng</h2>
          <div className="workshopInfo">
            <div className="workshopName">{booking.workshop.name}</div>
            <div className="workshopAddress">{booking.workshop.address}</div>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="actionButtons">
          {canEdit ? (
            <>
              <Link
                to={`/edit-booking/${booking.id}`}
                className="btnEditBooking"
              >
                Sửa lịch
              </Link>
              <button
                className="btnCancelBooking"
                onClick={handleCancel}
              >
                Hủy lịch
              </button>
            </>
          ) : (
            <Link
              to="/booking"
              className="btnNewBooking"
            >
              Đặt lịch mới
            </Link>
          )}
        </div>

        {/* Cancel Confirmation Modal */}
        {showCancelConfirm && (
          <div className="modalOverlay" onClick={() => setShowCancelConfirm(false)}>
            <div className="modalContent" onClick={(e) => e.stopPropagation()}>
              <h3 className="modalTitle">Xác nhận hủy lịch</h3>
              <p className="modalMessage">
                Bạn có chắc chắn muốn hủy lịch hẹn này không?
              </p>
              <div className="modalActions">
                <button
                  className="btnModalCancel"
                  onClick={() => setShowCancelConfirm(false)}
                >
                  Không
                </button>
                <button
                  className="btnModalConfirm"
                  onClick={confirmCancel}
                >
                  Có, hủy lịch
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingDetail;
