import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './Booking.css';
import StepService from './steps/StepService.jsx';
import StepSchedule from './steps/StepSchedule.jsx';
import StepInfo from './steps/StepInfo.jsx';
import StepDone from './steps/StepDone.jsx';
import { fetchHomeServices } from '../../services/homeService.js';

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

 useEffect(() => {
	if (prefilledPhone) {
	 setInfo((prev) => ({ ...prev, phone: prefilledPhone }));
  }
 }, [prefilledPhone]);

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
	useEffect(() => {
	 const root = document.querySelector('.booking-page');
	 if (root) {
	  root.scrollIntoView({ behavior: 'smooth', block: 'start' });
	 }
	}, [stepIndex]);

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
	 const goSubmitInfo = () => {
	  if (!info.name || !info.phone) return;
	  setStepIndex(3);
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
		<div className="booking-page">
		 <div className="stepper-wrapper">
			<div className="progress-track">
			 <div className="progress-fill" style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }} />
			</div>
			<div className="stepper">
			 {STEPS.map((step, idx) => {
			  // Chỉ tích bước khi đã vượt qua bước đó (đã nhấn tiếp tục)
			  // Bước 3 (done) chỉ tích khi stepIndex === 3 (đã hoàn tất)
			  const isCompleted = idx < stepIndex || (idx === 3 && stepIndex === 3);
			  const isActive = idx === stepIndex;
			  return (
			   <div
			    key={step.id}
			    className={`step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`.trim()}
			   >
			    <div className="dot">
			     {isCompleted ? '✓' : idx + 1}
			    </div>
				 <div className="label">{step.label}</div>
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
				/>
			)}

			{stepIndex === 2 && (
			 <StepInfo
			  value={info}
			  onChange={(patch) => setInfo((prev) => ({ ...prev, ...patch }))}
			  onBack={goBackFromInfo}
			  onSubmit={goSubmitInfo}
			 />
			)}

			{stepIndex === 3 && (
			 <StepDone
			  schedule={schedule}
			  info={info}
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
