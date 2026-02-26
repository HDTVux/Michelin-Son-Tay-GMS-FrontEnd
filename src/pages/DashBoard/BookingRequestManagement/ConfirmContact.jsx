import { useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './ConfirmContact.module.css';

export default function ConfirmContact({ open, onClose, onConfirm }) {
	const [note, setNote] = useState('');
	const maxLen = 200;

	if (!open) return null;

	const handleConfirm = () => {
		if (note.length > maxLen) return;
		onConfirm?.(note.trim());
	};

	const modal = (
		<div className={styles.confirmContact__backdrop} onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
			<div className={styles.confirmContact__modal} role="dialog" aria-modal="true" aria-labelledby="confirmContactTitle">
				<div className={styles.confirmContact__header}>
					<h3 id="confirmContactTitle">Đánh dấu đã liên hệ</h3>
				</div>
				<p className={styles.confirmContact__subtitle}>Đánh dấu yêu cầu này là đã liên hệ với khách hàng?</p>

				<label className={styles.confirmContact__label} htmlFor="contactNote">Ghi chú cuộc gọi</label>
				<textarea
					id="contactNote"
					className={styles.confirmContact__textarea}
					placeholder="Nhập ghi chú về cuộc gọi..."
					value={note}
					maxLength={maxLen}
					onChange={(e) => setNote(e.target.value)}
				/>
				<div className={styles.confirmContact__footer}>
					<span className={styles.confirmContact__counter}>{note.length}/{maxLen}</span>
					<div className={styles.confirmContact__actions}>
						<button type="button" className={`${styles.btn} ${styles.ghost}`} onClick={() => onClose?.()}>Hủy</button>
						<button type="button" className={`${styles.btn} ${styles.primary}`} onClick={handleConfirm}>Xác nhận</button>
					</div>
				</div>
			</div>
		</div>
	);

	if (typeof document === 'undefined') return modal;
	return createPortal(modal, document.body);
}
