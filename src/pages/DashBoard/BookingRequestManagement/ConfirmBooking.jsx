import { createPortal } from 'react-dom';
import styles from './ConfirmBooking.module.css';

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
		<div className={styles.confirmBooking__backdrop} onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
			<div className={styles.confirmBooking__modal} role="dialog" aria-modal="true" aria-labelledby="confirmBookingTitle">
				<h3 id="confirmBookingTitle" className={styles.confirmBooking__title}>Xác nhận duyệt yêu cầu</h3>
				<p className={styles.confirmBooking__subtitle}>Bạn có chắc muốn duyệt yêu cầu này và tạo booking chính thức?</p>

				<div className={styles.confirmBooking__card}>
					<Row label="Mã yêu cầu:" value={data.code} href={data.codeHref} />
					<Row label="Tên khách:" value={data.customerName} href={data.customerHref} />
					<Row label="Thời gian booking:" value={data.bookingTime} href={data.timeHref} />
					{data.service && <Row label="Dịch vụ:" value={data.service} />}
				</div>

				<div className={styles.confirmBooking__alert}>Booking sẽ được tạo và thêm vào lịch làm việc</div>

				<div className={styles.confirmBooking__actions}>
					<button type="button" className={`${styles.btn} ${styles.ghost}`} onClick={() => onClose?.()}>Hủy</button>
					<button type="button" className={`${styles.btn} ${styles.primary}`} onClick={() => onConfirm?.(data)}>Xác nhận duyệt</button>
				</div>
			</div>
		</div>
	);

	if (typeof document === 'undefined') return modal;
	return createPortal(modal, document.body);
}

function Row({ label, value, href }) {
	const content = href ? <a className={styles.confirmBooking__link} href={href}>{value}</a> : value;
	return (
		<p className={styles.confirmBooking__row}>
			<span className={styles.confirmBooking__label}>{label}</span> {content}
		</p>
	);
}
