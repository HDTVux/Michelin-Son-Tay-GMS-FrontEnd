import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import styles from './Booking.module.css';
import StepService from './steps/StepService.jsx';
import StepSchedule from './steps/StepSchedule.jsx';
import StepInfo from './steps/StepInfo.jsx';
import StepDone from './steps/StepDone.jsx';
import { toast } from 'react-toastify';
import { fetchHomeServices } from '../../services/homeService.js';
import { cancelCustomerBooking, createCustomerBooking, createGuestBooking, modifyCustomerBooking } from '../../services/bookingService.js';
import { getValidToken } from '../../services/tokenUtils.js';
import { useScrollToTop } from '../../hooks/useScrollToTop.js';
import { validateTextInput } from '../../components/inputValidation.js';

const STEPS = [
	{ id: 'service', label: 'Chọn dịch vụ' },
	{ id: 'schedule', label: 'Chọn ngày & giờ' },
	{ id: 'info', label: 'Thông tin' },
	{ id: 'done', label: 'Hoàn tất' }
];

export default function Booking() {
 const location = useLocation();
 const prefilledPhone = location.state?.phone || '';
 const preselectedCatalogItemId = location.state?.catalogItemId != null ? String(location.state.catalogItemId) : null;
 const legacyServiceId = location.state?.serviceId != null ? Number(location.state.serviceId) : null;
 // State bước hiện tại: 0: chọn dịch vụ, 1: chọn lịch, 2: nhập thông tin, 3: hoàn tất
 const [stepIndex, setStepIndex] = useState(0);
 // Dịch vụ (lấy từ API Home)
 const [services, setServices] = useState([]);
 const [servicesLoading, setServicesLoading] = useState(false);
 const [servicesError, setServicesError] = useState('');
 // State lọc/chọn dịch vụ
 const [selectedIds, setSelectedIds] = useState(() => (preselectedCatalogItemId ? [preselectedCatalogItemId] : []));
 const [search, setSearch] = useState('');
 const [filter, setFilter] = useState('all');
 // State cho lịch hẹn
 const [schedule, setSchedule] = useState({ date: '', time: '' });
 // State cho thông tin cá nhân
 const [info, setInfo] = useState({ name: '', phone: prefilledPhone, note: '' });
 // Token để biết khách đã đăng nhập hay chưa
 const [customerToken, setCustomerToken] = useState(() => getValidToken('customerToken'));
 // Trạng thái gửi booking
 const [submitting, setSubmitting] = useState(false);
 const [submitError, setSubmitError] = useState('');
 const [bookingData, setBookingData] = useState(null);
 const [modifyBookingId, setModifyBookingId] = useState(null);

 const decodeTokenProfile = (token) => {
  try {
   const payload = token.split('.')[1];
   const json = JSON.parse(atob(payload));
   return {
	name: json?.fullName || json?.name || '',
	phone: json?.sub || '',
   };
  } catch {
   return { name: '', phone: '' };
  }
 };

 useEffect(() => {
	// Chỉ thực hiện nếu có giá trị prefilledPhone
	if (prefilledPhone) {
		// setTimeout 0: Đẩy việc cập nhật state xuống cuối
	 const t = setTimeout(() => setInfo((prev) => ({ ...prev, phone: prefilledPhone })), 0);
	//Hủy timeout nếu prefilledPhone thay đổi nhanh liên tục hoặc component unmount trước khi timeout thực thi, tránh cập nhật state không cần thiết.
	 return () => clearTimeout(t);
  }
 }, [prefilledPhone]);

 // Prefill tên + phone từ token đăng nhập 
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
				setCustomerToken(getValidToken('customerToken'));
			}
		};
		globalThis.addEventListener('storage', handleStorage);
		return () => globalThis.removeEventListener('storage', handleStorage);
	}, []);

	// Lấy dịch vụ từ API Home
	useEffect(() => {
		//Cờ "active" để chống Race Condition
		let active = true;
		setServicesLoading(true);
		setServicesError('');

		fetchHomeServices()
			.then((res) => {
				// Nếu effect này đã bị "cleanup" (active = false), dừng ngay không cập nhật state
				if (!active) return;
				const list = Array.isArray(res?.data) ? res.data : [];
				const mapped = list
					.map((item) => {
						const catalogItemId = Number(item?.catalogItemId);
						if (!Number.isFinite(catalogItemId) || catalogItemId < 0) return null;
						return {
							id: String(catalogItemId),
							serviceId: Number(item?.serviceId),
							name: item.title || 'Dịch vụ',
							desc: item.shortDescription || 'Hiện chưa có mô tả ngắn.',
							category: 'all',
							thumbnail: item.mediaThumbnail || '',
						};
					})
					.filter(Boolean);// Loại bỏ các giá trị null vừa tạo ra ở trên
				setServices(mapped);

				// Backward-compat: nếu trang khác còn truyền state.serviceId ,
				// thì tự map sang catalogItemId từ list /home/ sau khi load.
				if (!preselectedCatalogItemId && Number.isFinite(legacyServiceId) && legacyServiceId != null) {
					const found = mapped.find((s) => Number(s.serviceId) === legacyServiceId);
					if (found?.id) setSelectedIds([String(found.id)]);
				}
			})
			.catch((err) => {
				if (!active) return;
				setServicesError(err?.message || 'Không thể tải danh sách dịch vụ.');
			})
			.finally(() => {
				//Tắt trạng thái Loading bất kể thành công hay thất bại, nhưng chỉ khi effect này vẫn "active"
				if (active) setServicesLoading(false);
			});

		return () => {
			active = false;
		};
	}, [legacyServiceId, preselectedCatalogItemId]);

	// Mỗi khi đổi bước, cuộn về đầu trang đặt lịch để không bị nhảy xuống cuối
	 // Kéo lên đầu trang mỗi khi đổi bước (dùng window scroll thay vì query class CSS module)
	 useScrollToTop([stepIndex], 'smooth');

	// Đồng bộ UI theo dữ liệu backend trả về sau khi tạo/đổi lịch
	useEffect(() => {
		//Nếu không có dữ liệu bookingData, thoát ngay để tránh lỗi.
		if (!bookingData) return;
		if (bookingData?.scheduledDate || bookingData?.scheduledTime) {
			setSchedule((prev) => ({
				...prev,
				// Nếu có ngày/giờ mới thì lấy, nếu không thì giữ nguyên giá trị hiện tại (prev)
				date: bookingData?.scheduledDate || prev.date,
				time: bookingData?.scheduledTime || prev.time,
			}));
		}
		if (typeof bookingData?.description === 'string') {
			const sanitized = bookingData.description
				.replaceAll(/[<>{}]/g, '')
				.slice(0, 500);
			setInfo((prev) => ({ ...prev, note: sanitized }));
		}
		if (Array.isArray(bookingData?.serviceIds) && bookingData.serviceIds.length > 0) {
			// Chuyển toàn bộ ID sang dạng String và loại bỏ các giá trị rác
			const ids = bookingData.serviceIds.map(String).filter(Boolean);
			// Tạo một Set chứa các ID hợp lệ đang có sẵn trong danh sách services
			const serviceIdSet = new Set((Array.isArray(services) ? services : []).map((s) => String(s.id)));
			// Kiểm tra tất cả ID từ bookingData có tồn tại trong serviceIdSet hay không
			const allMatch = ids.length > 0 && ids.every((id) => serviceIdSet.has(id));
			if (allMatch) setSelectedIds(ids);
		}
	}, [bookingData, services]);

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
	  if (!info.name?.trim() || !info.phone?.trim() || submitting) return;
  setSubmitError('');
  setSubmitting(true);

		const { value: trimmedNote, error: noteError } = validateTextInput(info.note, {
			fieldLabel: 'Ghi chú',
			required: false,
			maxLength: 255,
			trim: true,
		});

		if (noteError) {
			setSubmitError(noteError);
			setSubmitting(false);
			return;
		}

  // 2. Chuẩn bị danh sách catalogItemId (backend tạo/đổi booking dùng catalogItemId)
  const catalogItemIds = selectedIds
	.map(Number)
    .filter((n) => Number.isFinite(n) && n >= 0);



	const basePayload = {
		appointmentDate: schedule.date,
		appointmentTime: schedule.time,
		userNote: trimmedNote,
		selectedServiceIds: catalogItemIds,
	};

	const isModify = !!customerToken && modifyBookingId != null && `${modifyBookingId}` !== '';

  try {
	// 1. Xác định "Đích đến" của API dựa trên trạng thái hiện tại: Khách vãng lai tạo booking, khách đã đăng nhập tạo booking, hay khách đã đăng nhập đổi lịch.
	// Mặc định là khách vãng lai tạo lịch mới	
	let submitPath = 'guest/create';
	//nếu có token và modifyBookingId thì là khách đã đăng nhập đổi lịch.
		if (isModify) submitPath = 'customer/modify';
	//nếu có token thì là khách đã đăng nhập tạo lịch mới
		else if (customerToken) submitPath = 'customer/create';
		console.log('[booking] submitting to path:', submitPath);

		let res;
		if (isModify) {
			res = await modifyCustomerBooking(
				modifyBookingId,
				{
					newAppointmentDate: schedule.date,
					newAppointmentTime: schedule.time,
					newUserNote: trimmedNote,
					newServiceIds: catalogItemIds,
				},
				customerToken
			);
		} else if (customerToken) {
			res = await createCustomerBooking(basePayload, customerToken);
		} else {
			res = await createGuestBooking({
				...basePayload,
				fullName: info.name.trim(),
				phone: info.phone.trim(),
			});
		}

    console.log('[booking] success:', res);
    setBookingData(res?.data || null);
		if (res?.data?.bookingId != null) {
			setModifyBookingId(res.data.bookingId);
		}
    setStepIndex(3);
  } catch (err) {
		console.error('[booking] error:', err);
		const errorMsg = err?.message || (isModify ? 'Không thể đổi lịch hẹn.' : 'Không thể tạo lịch hẹn.');
    setSubmitError(errorMsg);
  } finally {
    setSubmitting(false);
  }
};

	 const goReschedule = () => {
		if (customerToken && bookingData?.bookingId != null) {
			setModifyBookingId(bookingData.bookingId);
		} else {
			setModifyBookingId(null);
		}
		setStepIndex(1);
	};
	 const goCancel = async () => {
		if (submitting) return;
		const bookingId = bookingData?.bookingId;
		const notify = (message) => toast(message, { containerId: 'app-toast' });
		setSubmitError('');
		setSubmitting(true);
		try {
			const res = await cancelCustomerBooking(bookingId, customerToken);
			notify(res?.message || 'Hủy lịch thành công.');
			if (bookingData) {
				setBookingData((prev) => ({ ...prev, status: prev?.status || 'CANCELLED' }));
			}
		} catch (err) {
			console.error('[booking] cancel error:', err);
			const errorMsg = err?.message || 'Không thể hủy lịch hẹn.';
			setSubmitError(errorMsg);
			notify(errorMsg);
		} finally {
			setSubmitting(false);
		}
	 };
	 const goHome = () => {
		globalThis.location.href = '/';
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
			  isAuthed={!!customerToken}
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
			  isAuthed={!!customerToken}
			  onReschedule={goReschedule}
			  onCancel={goCancel}
			  onHome={goHome}
			 />
			)}
		</div>
	);
}
