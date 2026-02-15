import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import styles from './Booking.module.css';
import StepService from './steps/StepService.jsx';
import StepSchedule from './steps/StepSchedule.jsx';
import StepInfo from './steps/StepInfo.jsx';
import StepDone from './steps/StepDone.jsx';
import { fetchHomeServices } from '../../services/homeService.js';
import { createCustomerBooking, createGuestBooking } from '../../services/bookingService.js';
import { useScrollToTop } from '../../hooks/useScrollToTop.js';

const STEPS = [
	{ id: 'service', label: 'Chọn dịch vụ' },
	{ id: 'schedule', label: 'Chọn ngày & giờ' },
	{ id: 'info', label: 'Thông tin' },
	{ id: 'done', label: 'Hoàn tất' }
];

export default function Booking() {
 const location = useLocation();
 const prefilledPhone = location.state?.phone || '';
 const preselectedServiceId = location.state?.serviceId ? String(location.state.serviceId) : null;
 // State bước hiện tại
 const [stepIndex, setStepIndex] = useState(0);
 // Dịch vụ (lấy từ API Home)
 const [services, setServices] = useState([]);
 const [servicesLoading, setServicesLoading] = useState(false);
 const [servicesError, setServicesError] = useState('');
 // State lọc/chọn dịch vụ
 const [selectedIds, setSelectedIds] = useState(() => (preselectedServiceId ? [preselectedServiceId] : []));
 const [search, setSearch] = useState('');
 const [filter, setFilter] = useState('all');
 // State cho lịch hẹn
 const [schedule, setSchedule] = useState({ date: '', time: '' });
 // State cho thông tin cá nhân
 const [info, setInfo] = useState({ name: '', phone: prefilledPhone, note: '' });
 // Token để biết khách đã đăng nhập hay chưa
 const [customerToken, setCustomerToken] = useState(() => localStorage.getItem('customerToken') || '');
 // Trạng thái gửi booking
 const [submitting, setSubmitting] = useState(false);
 const [submitError, setSubmitError] = useState('');
 const [bookingData, setBookingData] = useState(null);

 const decodeTokenProfile = (token) => {
  try {
   const payload = token.split('.')[1];
   const json = JSON.parse(atob(payload));
   return {
	name: json?.fullName || json?.name || '',
	phone: json?.sub || '',
   };
  } catch (e) {
   return { name: '', phone: '' };
  }
 };

 useEffect(() => {
	if (prefilledPhone) {
	 setInfo((prev) => ({ ...prev, phone: prefilledPhone }));
  }
 }, [prefilledPhone]);

 // Prefill tên + phone từ token đăng nhập (backend đã chứa)
 useEffect(() => {
  if (customerToken) {
   const profile = decodeTokenProfile(customerToken);
   setInfo((prev) => ({
	...prev,
	name: prev.name || profile.name,
	phone: prev.phone || profile.phone,

   }));
  }
 }, [customerToken]);

	// Lắng nghe thay đổi token giữa các tab
	useEffect(() => {
		const handleStorage = (e) => {
			if (!e.key || e.key === 'customerToken') {
				setCustomerToken(localStorage.getItem('customerToken') || '');
			}
		};
		window.addEventListener('storage', handleStorage);
		return () => window.removeEventListener('storage', handleStorage);
	}, []);

	// Lấy dịch vụ từ API Home (ngắn gọn cho booking)
	useEffect(() => {
		let active = true;
		setServicesLoading(true);
		setServicesError('');

		fetchHomeServices()
			.then((res) => {
				if (!active) return;
				const list = Array.isArray(res?.data) ? res.data : [];
				const mapped = list.map((item) => ({
					id: String(item.serviceId),
					name: item.title || 'Dịch vụ',
					desc: item.shortDescription || 'Hiện chưa có mô tả ngắn.',
					category: 'all',
					thumbnail: item.mediaThumbnail || '',
				}));
				setServices(mapped);
			})
			.catch((err) => {
				if (!active) return;
				setServicesError(err?.message || 'Không thể tải danh sách dịch vụ.');
			})
			.finally(() => {
				if (active) setServicesLoading(false);
			});

		return () => {
			active = false;
		};
	}, []);

	// Mỗi khi đổi bước, cuộn về đầu trang đặt lịch để không bị nhảy xuống cuối
	 // Kéo lên đầu trang mỗi khi đổi bước (dùng window scroll thay vì query class CSS module)
	 useScrollToTop([stepIndex], 'smooth');

	const toggle = (id) => {
		setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
	};

	const goNextFromService = () => {
		setStepIndex(1);
	};

	const goBackFromSchedule = () => setStepIndex(0);
	const goNextFromSchedule = () => {
		if (!schedule.date || !schedule.time) return;
		setStepIndex(2);
	};

	 const goBackFromInfo = () => setStepIndex(1);
const goSubmitInfo = async () => {
  // 1. Validation cơ bản tại Front-end
  if (!info.name || !info.phone || submitting) return;
  setSubmitError('');
  setSubmitting(true);

  // 2. Chuẩn bị danh sách ID dịch vụ
  const serviceIds = selectedIds
    .map((id) => Number(id))
    .filter((n) => Number.isFinite(n));


	const basePayload = {
		appointmentDate: schedule.date,
		appointmentTime: schedule.time,
		userNote: info.note || '',
		selectedServiceIds: serviceIds,
	};

  try {
		console.log('[booking] submitting to path:', customerToken ? 'customer' : 'guest');
    
		const res = customerToken
			? await createCustomerBooking(basePayload, customerToken)
			: await createGuestBooking({
					...basePayload,
					fullName: info.name.trim(),
					phone: info.phone.trim(),
				});

    console.log('[booking] success:', res);
    setBookingData(res?.data || null);
    setStepIndex(3);
  } catch (err) {
    console.error('[booking] error detail:', err.response?.data);
    // Ưu tiên hiển thị lỗi từ server trả về (ví dụ: "Ngày hẹn không được là quá khứ")
    const errorMsg = err.response?.data?.message || err?.message || 'Không thể tạo lịch hẹn.';
    setSubmitError(errorMsg);
  } finally {
    setSubmitting(false);
  }
};

	 const goReschedule = () => setStepIndex(1);
	 const goCancel = () => {
		// TODO: Gọi API hủy lịch
		alert('Đã gửi yêu cầu hủy lịch');
	 };
	 const goHome = () => {
		window.location.href = '/';
	 };

	 return (
			<div className={styles['booking-page']}>
			 <div className={styles['stepper-wrapper']}>
				<div className={styles['progress-track']}>
				 <div className={styles['progress-fill']} style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }} />
				</div>
				<div className={styles.stepper}>
				 {STEPS.map((step, idx) => {
				  const isCompleted = idx < stepIndex || (idx === 3 && stepIndex === 3);
				  const isActive = idx === stepIndex;
				  const stepClass = [styles.step, isCompleted ? styles.completed : '', isActive ? styles.active : '']
				    .filter(Boolean)
				    .join(' ');
				  return (
				   <div
				    key={step.id}
				    className={stepClass}
				   >
				    <div className={styles.dot}>
				     {isCompleted ? '✓' : idx + 1}
				    </div>
					 <div className={styles.label}>{step.label}</div>
					</div>
				  );
				 })}
				</div>
			 </div>


			{stepIndex === 0 && (
				<StepService
					services={services}
					selectedIds={selectedIds}
					onToggle={toggle}
					search={search}
					onSearch={setSearch}
					filter={filter}
					onFilter={setFilter}
					loading={servicesLoading}
					error={servicesError}
					onNext={goNextFromService}
				/>
			)}

			{stepIndex === 1 && (
				<StepSchedule
					value={schedule}
					onChange={(patch) => setSchedule((prev) => ({ ...prev, ...patch }))}
					onBack={goBackFromSchedule}
					onNext={goNextFromSchedule}
					token={customerToken}
					isAuthed={!!customerToken}
				/>
			)}

			{stepIndex === 2 && (
			 <StepInfo
			  value={info}
			  onChange={(patch) => setInfo((prev) => ({ ...prev, ...patch }))}
			  onBack={goBackFromInfo}
			  onSubmit={goSubmitInfo}
			  isAuthed={customerToken}
			  loading={submitting}
			  error={submitError}
			 />
			)}

			{stepIndex === 3 && (
			 <StepDone
			  schedule={schedule}
			  info={info}
			  bookingData={bookingData}
					services={services}
			  selectedIds={selectedIds}
			  onReschedule={goReschedule}
			  onCancel={goCancel}
			  onHome={goHome}
			 />
			)}
		</div>
	);
}
