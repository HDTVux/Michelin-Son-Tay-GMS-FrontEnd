import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import styles from './ReceiptPaymentMethod.module.css';
import { createTransferQr } from '../../../services/paymentQrService.js';

function toMoneyNumber(value) {
	const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
	return Number.isFinite(n) ? n : 0;
}

function formatCurrencyVnd(value) {
	const n = toMoneyNumber(value);
	return `${new Intl.NumberFormat('vi-VN').format(Math.round(n))} VND`;
}

export function ReceiptPaymentMethodModal({ open, onClose, ticketCode, total, printTicket }) {
	const [method, setMethod] = useState('transfer');
	const [transferQrState, setTransferQrState] = useState({ status: 'idle', data: null, error: '' });

	const ticketCodeSafe = String(ticketCode || '').trim();
	const totalSafe = useMemo(() => toMoneyNumber(total), [total]);
	const hasRequiredState = Boolean(printTicket);

	const transferContent = useMemo(() => {
		const code = ticketCodeSafe || 'SERVICE_TICKET';
		return `Thanh toan hoa don ${code}`;
	}, [ticketCodeSafe]);

	useEffect(() => {
		if (!open) return;
		const onKeyDown = (e) => {
			if (e.key !== 'Escape') return;
			e.preventDefault();
			onClose?.();
		};
		globalThis.addEventListener('keydown', onKeyDown);
		return () => globalThis.removeEventListener('keydown', onKeyDown);
	}, [open, onClose]);

	useEffect(() => {
		if (!open) return;
		if (!hasRequiredState) return;
		if (method !== 'transfer') return;

		let ignore = false;
		const run = async () => {
			try {
				setTransferQrState({ status: 'loading', data: null, error: '' });
				const qr = await createTransferQr({
					amountVnd: totalSafe,
					description: transferContent,
					reference: ticketCodeSafe,
				});
				if (ignore) return;
				setTransferQrState({ status: 'ready', data: qr, error: '' });
			} catch (err) {
				if (ignore) return;
				setTransferQrState({
					status: 'error',
					data: null,
					error: err?.message || 'Không thể tạo mã QR thanh toán.',
				});
			}
		};

		run();
		return () => {
			ignore = true;
		};
	}, [open, hasRequiredState, method, ticketCodeSafe, totalSafe, transferContent]);

	if (!open) return null;

	if (!hasRequiredState) {
		return (
			<div className={styles.overlay}>
				<button type="button" className={styles.backdrop} onClick={onClose} aria-label="Đóng" />
				<dialog
					open
					className={`ui-card ${styles.modal}`}
					aria-modal="true"
					aria-labelledby="receipt-payment-method-title"
					onCancel={(e) => {
						e.preventDefault();
						onClose?.();
					}}
				>
					<header className={styles.header}>
						<div>
							<h2 id="receipt-payment-method-title" className={styles.title}>
								Chọn phương thức thanh toán
							</h2>
							<div className={styles.subTitle}>Phiếu dịch vụ #{ticketCodeSafe || '-'}</div>
						</div>
					</header>
					<div className={styles.error}>Thiếu dữ liệu hoá đơn. Vui lòng quay lại trang xác nhận hoá đơn.</div>
					<div className="ui-actions ui-actions--end">
						<button type="button" className="ui-btn ui-btn--ghost" onClick={onClose}>
							Đóng
						</button>
					</div>
				</dialog>
			</div>
		);
	}

	return (
		<div className={styles.overlay}>
			<button type="button" className={styles.backdrop} onClick={onClose} aria-label="Đóng" />
			<dialog
				open
				className={`ui-card ${styles.modal}`}
				aria-modal="true"
				aria-labelledby="receipt-payment-method-title"
				onCancel={(e) => {
					e.preventDefault();
					onClose?.();
				}}
			>
				<header className={styles.header}>
					<div>
						<h2 id="receipt-payment-method-title" className={styles.title}>
							Chọn phương thức thanh toán
						</h2>
						<div className={styles.subTitle}>Phiếu dịch vụ #{ticketCodeSafe || '-'}</div>
					</div>
				</header>

				<div className={styles.totalRow}>
					<span>Tổng cần thanh toán:</span>
					<strong>{formatCurrencyVnd(totalSafe)}</strong>
				</div>

				<div className={styles.methods}>
					<button type="button" className={`ui-btn ui-btn--ghost ${styles.methodBtn}`} disabled>
						Tiền mặt (chưa hỗ trợ)
					</button>

					<button
						type="button"
						className={`ui-btn ${method === 'transfer' ? 'ui-btn--primary' : 'ui-btn--ghost'} ${styles.methodBtn}`}
						onClick={() => setMethod('transfer')}
					>
						Chuyển khoản
					</button>
				</div>

				{method === 'transfer' ? (
					<div className={styles.qrSection}>
						<div className={styles.qrTitle}>Quét mã VietQR để thanh toán</div>
						<div className={styles.qrMeta}>
							<div className={styles.qrMetaRow}>
								<span>Số tiền:</span>
								<strong>{formatCurrencyVnd(totalSafe)}</strong>
							</div>
							<div className={styles.qrMetaRow}>
								<span>Nội dung:</span>
								<strong className={styles.qrMetaText}>{transferContent}</strong>
							</div>
						</div>

						{transferQrState.status === 'loading' ? <div className={styles.qrHint}>Đang tạo mã QR...</div> : null}
						{transferQrState.status === 'error' ? <div className={styles.error}>{transferQrState.error}</div> : null}
						{transferQrState.status === 'ready' && transferQrState.data?.imageSrc ? (
							<img className={styles.qrImg} src={transferQrState.data.imageSrc} alt="VietQR" />
						) : null}
					</div>
				) : null}

				<div className="ui-actions ui-actions--end">
					<button type="button" className="ui-btn ui-btn--ghost" onClick={onClose}>
						Đóng
					</button>
				</div>
			</dialog>
		</div>
	);
}

ReceiptPaymentMethodModal.propTypes = {
	open: PropTypes.bool,
	onClose: PropTypes.func,
	ticketCode: PropTypes.string,
	total: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
	printTicket: PropTypes.any,
};

export default function ReceiptPaymentMethod() {
	useScrollToTop();
	const navigate = useNavigate();
	const location = useLocation();
	const params = useParams();

	const ticketCodeParam = String(params?.ticketCode || '').trim();
	const totalFromState = location?.state?.total;
	const total = useMemo(() => toMoneyNumber(totalFromState), [totalFromState]);
	const printTicket = location?.state?.printTicket ?? null;

	return (
		<div className={styles.page}>
			<ReceiptPaymentMethodModal
				open
				onClose={() => navigate(-1)}
				ticketCode={ticketCodeParam}
				total={total}
				printTicket={printTicket}
			/>
		</div>
	);
}
