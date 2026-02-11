import { useState } from 'react';
import { createPortal } from 'react-dom';
import './ConfirmContact.css';

export default function ConfirmContact({ open, onClose, onConfirm }) {
	const [note, setNote] = useState('');
	const maxLen = 200;

	if (!open) return null;

	const handleConfirm = () => {
		if (note.length > maxLen) return;
		onConfirm?.(note.trim());
	};

	const modal = (
		<div className="confirmContact__backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
			<div className="confirmContact__modal" role="dialog" aria-modal="true" aria-labelledby="confirmContactTitle">
				<div className="confirmContact__header">
					<h3 id="confirmContactTitle">Đánh dấu đã liên hệ</h3>
				</div>
				<p className="confirmContact__subtitle">Đánh dấu yêu cầu này là đã liên hệ với khách hàng?</p>

				<label className="confirmContact__label" htmlFor="contactNote">Ghi chú cuộc gọi</label>
				<textarea
					id="contactNote"
					className="confirmContact__textarea"
					placeholder="Nhập ghi chú về cuộc gọi..."
					value={note}
					maxLength={maxLen}
					onChange={(e) => setNote(e.target.value)}
				/>
				<div className="confirmContact__footer">
					<span className="confirmContact__counter">{note.length}/{maxLen}</span>
					<div className="confirmContact__actions">
						<button type="button" className="btn ghost" onClick={() => onClose?.()}>Hủy</button>
						<button type="button" className="btn primary" onClick={handleConfirm}>Xác nhận</button>
					</div>
				</div>
			</div>
		</div>
	);

	if (typeof document === 'undefined') return modal;
	return createPortal(modal, document.body);
}
