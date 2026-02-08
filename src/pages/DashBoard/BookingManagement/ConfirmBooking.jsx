import { createPortal } from 'react-dom';
import './ConfirmBooking.css';

const fallbackRequest = {
	code: 'Mã yêu cầu',
	customerName: 'Tên khách',
	bookingTime: 'Thời gian booking',
	service: 'Dịch vụ',
	codeHref: '#',
	customerHref: '#',
	timeHref: '#',
	serviceHref: '#',
};

export default function ConfirmBooking({ open, onClose, onConfirm, request }) {
	if (!open) return null;

	const data = { ...fallbackRequest, ...(request || {}) };

	const modal = (
		<div className="confirmBooking__backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
			<div className="confirmBooking__modal" role="dialog" aria-modal="true" aria-labelledby="confirmBookingTitle">
				<h3 id="confirmBookingTitle" className="confirmBooking__title">Xác nhận duyệt yêu cầu</h3>
				<p className="confirmBooking__subtitle">Bạn có chắc muốn duyệt yêu cầu này và tạo booking chính thức?</p>

				<div className="confirmBooking__card">
					<Row label="Mã yêu cầu:" value={data.code} href={data.codeHref} />
					<Row label="Tên khách:" value={data.customerName} href={data.customerHref} />
					<Row label="Thời gian booking:" value={data.bookingTime} href={data.timeHref} />
					<Row label="Dịch vụ:" value={data.service} href={data.serviceHref} />
				</div>

				<div className="confirmBooking__alert">Booking sẽ được tạo và thêm vào lịch làm việc</div>

				<div className="confirmBooking__actions">
					<button type="button" className="btn ghost" onClick={() => onClose?.()}>Hủy</button>
					<button type="button" className="btn primary" onClick={() => onConfirm?.(data)}>Xác nhận duyệt</button>
				</div>
			</div>
		</div>
	);

	if (typeof document === 'undefined') return modal;
	return createPortal(modal, document.body);
}

function Row({ label, value, href }) {
	const content = href ? <a className="confirmBooking__link" href={href}>{value}</a> : value;
	return (
		<p className="confirmBooking__row">
			<span className="confirmBooking__label">{label}</span> {content}
		</p>
	);
}
