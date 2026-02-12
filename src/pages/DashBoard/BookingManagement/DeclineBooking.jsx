import { useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './DeclineBooking.module.css';

const defaultReasons = [
	'Khách hủy lịch',
	'Thông tin không hợp lệ',
	'Trùng lặp yêu cầu',
	'Không phù hợp lịch làm việc',
];

export default function DeclineBooking({ open, onClose, onConfirm, reasons }) {
	const [selectedReason, setSelectedReason] = useState('');
	const [detail, setDetail] = useState('');
	const maxLen = 200;

	if (!open) return null;

	const handleConfirm = () => {
		if (!selectedReason) return;
		onConfirm?.({ reason: selectedReason, detail: detail.trim() });
	};

	const modal = (
		<div className={styles.decline__backdrop} onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
			<div className={styles.decline__modal} role="dialog" aria-modal="true" aria-labelledby="declineTitle">
				<h3 id="declineTitle" className={styles.decline__title}>Từ chối yêu cầu đặt lịch</h3>
				<p className={styles.decline__warning}>Hành động này không thể hoàn tác</p>

				<label className={styles.decline__label} htmlFor="declineReason">Lý do từ chối</label>
				<select
					id="declineReason"
					className={styles.decline__select}
					value={selectedReason}
					onChange={(e) => setSelectedReason(e.target.value)}
				>
					<option value="">Chọn lý do</option>
					{(reasons || defaultReasons).map((r) => (
						<option key={r} value={r}>{r}</option>
					))}
				</select>

				<textarea
					className={styles.decline__textarea}
					placeholder="Nhập lý do chi tiết..."
					value={detail}
					maxLength={maxLen}
					onChange={(e) => setDetail(e.target.value)}
				/>

				<div className={styles.decline__footer}>
					<span className={styles.decline__counter}>{detail.length}/{maxLen}</span>
					<div className={styles.decline__actions}>
						<button type="button" className={`${styles.btn} ${styles.ghost}`} onClick={() => onClose?.()}>Hủy</button>
						<button type="button" className={`${styles.btn} ${styles.danger}`} disabled={!selectedReason} onClick={handleConfirm}>
							Xác nhận từ chối
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	if (typeof document === 'undefined') return modal;
	return createPortal(modal, document.body);
}
