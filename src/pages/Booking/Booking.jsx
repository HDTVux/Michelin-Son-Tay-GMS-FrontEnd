import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './Booking.css';
import StepService from './steps/StepService.jsx';
import StepSchedule from './steps/StepSchedule.jsx';
import StepInfo from './steps/StepInfo.jsx';
import StepDone from './steps/StepDone.jsx';

const SERVICES = [
	{
		id: 'tire',
		name: 'Thay lốp xe',
		desc: 'Thay lốp, cân mâm cao su mới và vệ sinh chi tiết cụng.',
		tag: 'Lốp & lốp',
		category: 'tires'
	},
	{
		id: 'oil',
		name: 'Thay dầu động cơ',
		desc: 'Xả dầu cũ, thay lọc, đệm cổ xả và châm dầu mới đúng định cấp.',
		tag: 'Bảo dưỡng nhanh',
		category: 'engine'
	},
	{
		id: 'check12',
		name: 'Kiểm tra an toàn 12 điểm',
		desc: 'Kiểm tra tổng quát lốp, phanh, điện, dầu, gầm, nước mát...',
		tag: 'Chăm sóc & OTOT',
		category: 'check'
	},
    {
		id: 'lll',
		name: 'okokol',
		desc: 'Kiểm tra tổng quát lốp, phanh, điện, dầu, gầm, nước mát...',
		tag: 'Chăm sóc & OTOT',
		category: 'check'
	}
];

const STEPS = [
	{ id: 'service', label: 'Chọn dịch vụ' },
	{ id: 'schedule', label: 'Chọn ngày & giờ' },
	{ id: 'info', label: 'Thông tin' },
	{ id: 'done', label: 'Hoàn tất' }
];

export default function Booking() {
 const location = useLocation();
 const prefilledPhone = location.state?.phone || '';
 // State bước hiện tại
 const [stepIndex, setStepIndex] = useState(0);
 // State lọc/chọn dịch vụ
 const [selectedIds, setSelectedIds] = useState([]);
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
			  const isCompleted = idx <= stepIndex;
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
					services={SERVICES}
					selectedIds={selectedIds}
					onToggle={toggle}
					search={search}
					onSearch={setSearch}
					filter={filter}
					onFilter={setFilter}
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
			  services={SERVICES}
			  selectedIds={selectedIds}
			  onReschedule={goReschedule}
			  onCancel={goCancel}
			  onHome={goHome}
			 />
			)}
		</div>
	);
}
