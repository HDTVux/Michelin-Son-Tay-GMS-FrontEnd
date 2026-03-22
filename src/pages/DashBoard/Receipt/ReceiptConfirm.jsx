import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { fetchServiceTicketDetail, fetchServiceTicketEstimate } from '../../../services/serviceTicketService.js';
import { formatDateTimeViNoSeconds } from '../../../components/timeUtils.js';
import Receipt from './Receipt.jsx';
import { ReceiptPaymentMethodModal } from './ReceiptPaymentMethod.jsx';
import styles from './ReceiptConfirm.module.css';

const PROMOTIONS = {
	VIP: { label: 'Khách hàng thân thiết: Giảm giá', discountRate: 0.05 },
	COMBO_THANG: { label: 'Gói combo tháng', discountRate: 0.1 },
};

function toMoneyNumber(value) {
	const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
	return Number.isFinite(n) ? n : 0;
}

function formatCurrencyVnd(value) {
	const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
	if (!Number.isFinite(n) || n === 0) return '';
	return `${new Intl.NumberFormat('vi-VN').format(n)}đ`;
}

function pickMoneyDisplayValue(withVatValue, baseValue) {
	const withVatNum = toMoneyNumber(withVatValue);
	if (withVatNum > 0) return withVatNum;
	const baseNum = toMoneyNumber(baseValue);
	return Math.max(0, baseNum);
}

function pickLatestEstimate(list) {
	const arr = Array.isArray(list) ? list : [];
	if (arr.length === 0) return null;
	return [...arr].sort((a, b) => {
		const va = Number(a?.version);
		const vb = Number(b?.version);
		const versionCmp = (Number.isFinite(vb) ? vb : -1) - (Number.isFinite(va) ? va : -1);
		if (versionCmp !== 0) return versionCmp;
		const ta = Date.parse(a?.createdAt || a?.approvedAt || 0);
		const tb = Date.parse(b?.createdAt || b?.approvedAt || 0);
		return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
	})[0];
}

function normalizeTicketForReceipt(input, ticketCodeFallback) {
	const ticketCode = String(input?.ticketCode || ticketCodeFallback || '').trim();
	const serviceTicketId = input?.serviceTicketId ?? input?.serviceTicketID ?? input?.id ?? input?.ticketId ?? null;

	const receivedAt =
		input?.receivedAt ??
		input?.checkInAt ??
		input?.checkinAt ??
		input?.checkInDateTime ??
		input?.checkinDateTime ??
		input?.receptionDate ??
		input?.arrivedAt ??
		null;

	const handoverAt =
		input?.handoverAt ??
		input?.handOverAt ??
		input?.deliveryAt ??
		input?.deliveredAt ??
		input?.completedAt ??
		input?.finishedAt ??
		input?.closedAt ??
		null;

	const odometerKmRaw =
		input?.odometerReading ??
		input?.vehicle?.lastOdometerReading ??
		input?.vehicle?.odometerReading ??
		input?.odometerKm ??
		input?.mileage ??
		input?.vehicle?.odometerKm ??
		input?.vehicle?.mileage ??
		null;
	const odometerKm = odometerKmRaw == null ? null : Number(String(odometerKmRaw).replaceAll(/\D/g, ''));

	return {
		serviceTicketId,
		ticketCode,
		receivedAt,
		handoverAt,
		customer: {
			name: input?.customer?.fullName || input?.customerName || input?.customer?.name || '',
			phone: input?.customer?.phone || input?.customerPhone || input?.phone || '',
			email: input?.customer?.email || input?.customerEmail || input?.email || '',
		},
		vehicle: {
			licensePlate: input?.vehicle?.licensePlate || input?.licensePlate || '',
			model: input?.vehicle?.model || input?.vehicleModel || '',
			odometerKm: Number.isFinite(odometerKm) && odometerKm > 0 ? odometerKm : null,
		},
	};
}

function getItemConfirmedFlag(it) {
	return Boolean(
		it?.isChecked ??
			it?.confirmed ??
			it?.isConfirmed ??
			it?.approved ??
			it?.isApproved ??
			it?.customerConfirmed ??
			it?.isCustomerConfirmed,
	);
}

export default function ReceiptConfirm() {
	useScrollToTop();
	const navigate = useNavigate();
	const location = useLocation();
	const params = useParams();

	const ticketCodeParam = String(params?.ticketCode || '').trim();
	const ticketFromState = location?.state?.ticket ?? location?.state?.serviceTicket ?? null;

	const [ticketRaw, setTicketRaw] = useState(ticketFromState);
	const [ticketError, setTicketError] = useState('');
	const [ticketLoading, setTicketLoading] = useState(false);

	const [estimate, setEstimate] = useState(null);
	const [estimateLoading, setEstimateLoading] = useState(false);
	const [estimateError, setEstimateError] = useState('');

	const [promoCode, setPromoCode] = useState('');
	const [selectedCombo, setSelectedCombo] = useState('');
	const [appliedPromoKey, setAppliedPromoKey] = useState('');
	const [promoError, setPromoError] = useState('');
	const [paymentOpen, setPaymentOpen] = useState(false);

	const notify = (message) => toast(message, { containerId: 'app-toast' });

	useEffect(() => {
		if (ticketRaw) return;
		if (!ticketCodeParam) {
			setTicketError('Thiếu ticketCode để tạo hoá đơn.');
			return;
		}

		let ignore = false;
		const run = async () => {
			try {
				setTicketLoading(true);
				setTicketError('');
				const res = await fetchServiceTicketDetail(ticketCodeParam);
				if (ignore) return;
				setTicketRaw(res?.data ?? null);
			} catch (err) {
				if (ignore) return;
				setTicketError(err?.message || 'Không thể tải chi tiết phiếu dịch vụ.');
			} finally {
				if (!ignore) setTicketLoading(false);
			}
		};
		run();
		return () => {
			ignore = true;
		};
	}, [ticketRaw, ticketCodeParam]);

	const ticket = useMemo(() => normalizeTicketForReceipt(ticketRaw ?? {}, ticketCodeParam), [ticketRaw, ticketCodeParam]);

	useEffect(() => {
		const serviceTicketId = ticket?.serviceTicketId;
		if (!serviceTicketId) return;

		let ignore = false;
		const run = async () => {
			try {
				setEstimateLoading(true);
				setEstimateError('');
				const res = await fetchServiceTicketEstimate(serviceTicketId);
				if (ignore) return;
				setEstimate(pickLatestEstimate(res?.data) ?? null);
			} catch (err) {
				if (ignore) return;
				setEstimate(null);
				setEstimateError(err?.message || 'Không thể tải báo giá.');
			} finally {
				if (!ignore) setEstimateLoading(false);
			}
		};
		run();
		return () => {
			ignore = true;
		};
	}, [ticket?.serviceTicketId]);

	const estimateItems = useMemo(() => {
		const items = Array.isArray(estimate?.items) ? estimate.items : [];
		return items
			.filter((it) => !it?.isRemoved)
			.map((it, idx) => {
				const quantity = toMoneyNumber(it?.quantity);
				const unitPrice = toMoneyNumber(it?.unitPrice);
				const subTotal = toMoneyNumber(it?.subTotal);
				const unitPriceWithVat = it?.unitPriceWithVat ?? it?.unitPriceWithVAT ?? 0;
				const subTotalWithVat = it?.subTotalWithVat ?? it?.subTotalWithVAT ?? 0;
				const unitPriceDisplay = pickMoneyDisplayValue(unitPriceWithVat, unitPrice);
				const subTotalDisplay = pickMoneyDisplayValue(subTotalWithVat, subTotal);
				const categoryName = it?.workCategory?.categoryName || it?.workCategory?.categoryCode || it?.newCategoryName || '';
				return {
					key: String(it?.estimateItemId ?? it?.itemId ?? `${idx}`),
					categoryName,
					itemName: String(it?.itemName || '').trim(),
					quantity,
					unitPrice,
					subTotal,
					unitPriceDisplay,
					subTotalDisplay,
					confirmed: getItemConfirmedFlag(it),
				};
			})
			.filter((r) => r.itemName || r.categoryName || r.quantity > 0 || r.unitPrice > 0 || r.subTotal > 0 || r.subTotalDisplay > 0);
	}, [estimate]);

	const payItems = useMemo(() => {
		if (!estimateItems.length) return [];
		return estimateItems.filter((it) => it.confirmed);
	}, [estimateItems]);

	const subtotal = useMemo(() => payItems.reduce((acc, it) => acc + toMoneyNumber(it.subTotalDisplay ?? it.subTotal), 0), [payItems]);

	const appliedPromo = useMemo(() => {
		const key = String(appliedPromoKey || '').trim().toUpperCase();
		return key ? PROMOTIONS[key] ?? null : null;
	}, [appliedPromoKey]);

	const discountAmount = useMemo(() => {
		if (!appliedPromo) return 0;
		const raw = subtotal * toMoneyNumber(appliedPromo.discountRate);
		return Math.min(subtotal, Math.max(0, raw));
	}, [appliedPromo, subtotal]);

	const total = useMemo(() => Math.max(0, subtotal - discountAmount), [subtotal, discountAmount]);

	const receivedAtDisplay = ticket?.receivedAt ? formatDateTimeViNoSeconds(ticket.receivedAt, '-') : '-';
	const handoverAtDisplay = ticket?.handoverAt ? formatDateTimeViNoSeconds(ticket.handoverAt, '-') : '-';

	const applyPromotion = () => {
		setPromoError('');
		const code = String(promoCode || '').trim().toUpperCase();
		const comboKey = String(selectedCombo || '').trim().toUpperCase();

		const pickedKey = code || comboKey;
		if (!pickedKey) {
			setAppliedPromoKey('');
			return;
		}

		if (!PROMOTIONS[pickedKey]) {
			setAppliedPromoKey('');
			setPromoError('Mã không hợp lệ');
			return;
		}

		setAppliedPromoKey(pickedKey);
	};

	const handleBack = () => navigate(-1);

	const printTicket = useMemo(() => {
		const invoiceItems = payItems.map((it) => ({
			...it,
			unitPrice: toMoneyNumber(it.unitPriceDisplay ?? it.unitPrice),
			subTotal: toMoneyNumber(it.subTotalDisplay ?? it.subTotal),
		}));
		return {
			...ticket,
			receivedAtDisplay,
			handoverAtDisplay,
			invoice: {
				items: invoiceItems,
				subtotal,
				discountAmount,
				vatRate: '',
				vatAmount: 0,
				total,
				promotionLabel: appliedPromo?.label || '',
			},
		};
	}, [ticket, receivedAtDisplay, handoverAtDisplay, payItems, subtotal, discountAmount, total, appliedPromo]);

	const handlePrint = () => {
		if (ticketLoading || estimateLoading) return;
		if (payItems.length === 0) {
			notify('Chưa có hạng mục nào được advisor xác nhận để thanh toán.');
			return;
		}

		// Allow UI to switch to print media.
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				if (typeof globalThis?.print === 'function') globalThis.print();
			});
		});
	};

	const handleConfirm = () => {
		if (ticketLoading || estimateLoading) return;
		if (payItems.length === 0) {
			notify('Chưa có hạng mục nào được advisor xác nhận để thanh toán.');
			return;
		}
		setPaymentOpen(true);
	};

	return (
		<div className={styles.page}>
			<div className={styles.screenOnly}>
				<header className={styles.header}>
					<div>
						<h1 className={styles.title}>Xác nhận tạo hoá đơn</h1>
						<div className={styles.subTitle}>Phiếu dịch vụ #{ticket.ticketCode || ticketCodeParam || '-'}</div>
					</div>
				</header>

				{ticketError ? <div className={styles.errorBanner}>{ticketError}</div> : null}
				{estimateError ? <div className={styles.errorBanner}>{estimateError}</div> : null}

				<div className={`ui-card ${styles.card}`}>
					<section className={styles.section}>
						<h2 className={styles.sectionTitle}>Hạng mục thanh toán</h2>
						<div className={styles.tableWrap}>
							<table className={styles.table}>
								<colgroup>
									<col style={{ width: 180 }} />
									<col />
									<col style={{ width: 70 }} />
									<col style={{ width: 140 }} />
									<col style={{ width: 140 }} />
								</colgroup>
								<thead>
									<tr>
										<th>Hạng mục</th>
										<th>Diễn giải</th>
										<th className={styles.thQty}>SL</th>
										<th className={styles.thNumber}>Đơn giá</th>
										<th className={styles.thNumber}>Thành tiền</th>
									</tr>
								</thead>
								<tbody>
									{payItems.map((it) => (
										<tr key={it.key}>
											<td className={styles.tdText}>{it.categoryName}</td>
											<td className={styles.tdText}>{it.itemName}</td>
											<td className={styles.tdQty}>{it.quantity ? String(it.quantity) : ''}</td>
											<td className={styles.tdNumber}>{formatCurrencyVnd(it.unitPriceDisplay ?? it.unitPrice)}</td>
											<td className={styles.tdNumber}>{formatCurrencyVnd(it.subTotalDisplay ?? it.subTotal)}</td>
										</tr>
									))}
									{payItems.length === 0 ? (
										<tr>
											<td colSpan={5} className={styles.tdEmpty}>
												{estimateLoading ? 'Đang tải...' : 'Chưa có hạng mục nào được xác nhận.'}
											</td>
										</tr>
									) : null}
								</tbody>
							</table>
						</div>
					</section>

					<section className={styles.section}>
						<h2 className={styles.sectionTitle}>Áp dụng khuyến mãi</h2>
						<div className={styles.promoTotalBar}></div>

						<div className={styles.promoRow}>
							<div className={styles.promoField}>
								<label htmlFor="promo-code">Nhập mã:</label>
								<div className={styles.promoInputRow}>
									<input
										id="promo-code"
										className={styles.promoInput}
										value={promoCode}
										onChange={(e) => setPromoCode(e.target.value)}
										placeholder="Mã khuyến mãi"
									/>
								</div>
							</div>
						</div>

						<div className={styles.promoRow}>
							<label htmlFor="promo-combo">Hoặc chọn combo:</label>
							<select
								id="promo-combo"
								className={styles.promoSelect}
								value={selectedCombo}
								onChange={(e) => setSelectedCombo(e.target.value)}
							>
								<option value="">-</option>
								<option value="COMBO_THANG">Gói combo tháng</option>
							</select>
						</div>

						<button type="button" className={`ui-btn ui-btn--primary ${styles.applyBtn}`} onClick={applyPromotion}>
							Áp dụng
						</button>



						{appliedPromo?.label ? <div className={styles.promoChip}>{appliedPromo.label}</div> : null}

						<div className={styles.summaryList}>
							<div className={styles.summaryRow}>
								<span>Giá gốc:</span>
								<span>{formatCurrencyVnd(subtotal)}</span>
							</div>
							<div className={styles.summaryRow}>
								<span>Giảm giá:</span>
								<span>{discountAmount ? `- ${formatCurrencyVnd(discountAmount)}` : '-'}</span>
							</div>
							<div className={styles.summaryRow}>
								<span>Tổng (đã gồm VAT):</span>
								<span>{formatCurrencyVnd(total)}</span>
							</div>
						</div>

						{promoError ? <div className={styles.promoError}>{promoError}</div> : null}
					</section>

					<div className="ui-actions ui-actions--end">
						<button type="button" className="ui-btn ui-btn--ghost" onClick={handleBack}>
							Hủy
						</button>
						<button
							type="button"
							className="ui-btn ui-btn--ghost"
							onClick={handlePrint}
							disabled={ticketLoading || estimateLoading || !!ticketError}
						>
							In hóa đơn
						</button>
						<button
							type="button"
							className="ui-btn ui-btn--primary"
							onClick={handleConfirm}
							disabled={ticketLoading || estimateLoading || !!ticketError}
						>
							Thanh toán
						</button>
					</div>
				</div>

				<ReceiptPaymentMethodModal
					open={paymentOpen}
					onClose={() => setPaymentOpen(false)}
					ticketCode={ticket.ticketCode || ticketCodeParam}
					total={total}
					printTicket={printTicket}
				/>
			</div>

			<div className={styles.printOnly}>
				<Receipt ticket={printTicket} />
			</div>
		</div>
	);
}
