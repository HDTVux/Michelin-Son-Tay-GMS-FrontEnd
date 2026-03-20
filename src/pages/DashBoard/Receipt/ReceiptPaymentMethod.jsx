import { useEffect, useMemo, useState } from 'react';
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

export default function ReceiptPaymentMethod() {
	useScrollToTop();
	const navigate = useNavigate();
	const location = useLocation();
	const params = useParams();

	const [method, setMethod] = useState('transfer');
	const [transferQrState, setTransferQrState] = useState({ status: 'idle', data: null, error: '' });

	const ticketCodeParam = String(params?.ticketCode || '').trim();
	const totalFromState = location?.state?.total;
	const total = useMemo(() => toMoneyNumber(totalFromState), [totalFromState]);

	const hasRequiredState = Boolean(location?.state?.printTicket);

	const handleBack = () => navigate(-1);

	const transferContent = useMemo(() => {
		const code = ticketCodeParam || 'SERVICE_TICKET';
		return `Thanh toan hoa don ${code}`;
	}, [ticketCodeParam]);

	useEffect(() => {
		if (!hasRequiredState) return;
		if (method !== 'transfer') return;

		let ignore = false;
		const run = async () => {
			try {
				setTransferQrState({ status: 'loading', data: null, error: '' });
				const qr = await createTransferQr({
					amountVnd: total,
					description: transferContent,
					reference: ticketCodeParam,
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
	}, [hasRequiredState, method, ticketCodeParam, total, transferContent]);

	if (!hasRequiredState) {
		return (
			<div className={styles.page}>
				<div className={`ui-card ${styles.card}`}>
					<h1 className={styles.title}>Chọn phương thức thanh toán</h1>
					<div className={styles.subTitle}>Phiếu dịch vụ #{ticketCodeParam || '-'}</div>
					<div className={styles.error}>Thiếu dữ liệu hoá đơn. Vui lòng quay lại trang xác nhận hoá đơn.</div>
					<div className="ui-actions ui-actions--end">
						<button type="button" className="ui-btn ui-btn--ghost" onClick={handleBack}>
							Quay lại
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={styles.page}>
			<header className={styles.header}>
				<div>
					<h1 className={styles.title}>Chọn phương thức thanh toán</h1>
					<div className={styles.subTitle}>Phiếu dịch vụ #{ticketCodeParam || '-'}</div>
				</div>
			</header>

			<div className={`ui-card ${styles.card}`}>
				<div className={styles.totalRow}>
					<span>Tổng cần thanh toán:</span>
					<strong>{formatCurrencyVnd(total)}</strong>
				</div>

				<div className={styles.methods}>
					<button
						type="button"
						className={`ui-btn ui-btn--ghost ${styles.methodBtn}`}
						disabled
					>
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
								<strong>{formatCurrencyVnd(total)}</strong>
							</div>
							<div className={styles.qrMetaRow}>
								<span>Nội dung:</span>
								<strong className={styles.qrMetaText}>{transferContent}</strong>
							</div>
						</div>

						{transferQrState.status === 'loading' ? (
							<div className={styles.qrHint}>Đang tạo mã QR...</div>
						) : null}
						{transferQrState.status === 'error' ? (
							<div className={styles.error}>{transferQrState.error}</div>
						) : null}
						{transferQrState.status === 'ready' && transferQrState.data?.imageSrc ? (
							<img className={styles.qrImg} src={transferQrState.data.imageSrc} alt="VietQR" />
						) : null}
					</div>
				) : null}

				<div className="ui-actions ui-actions--end">
					<button type="button" className="ui-btn ui-btn--ghost" onClick={handleBack}>
						Quay lại
					</button>
				</div>
			</div>
		</div>
	);
}
