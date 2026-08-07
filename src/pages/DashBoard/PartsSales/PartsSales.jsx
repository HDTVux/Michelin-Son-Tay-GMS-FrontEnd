import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Contact, Search, UserPlus, X } from 'lucide-react';

import bookingStyles from '../../Booking/Booking.module.css';
import cbStyles from '../BookingManagement/CreateBooking.module.css';
import styles from './PartsSales.module.css';

import AdvisorItemsTable from '../ServiceTicketManagement/AdvisorItemsTable.jsx';
import Receipt from '../Receipt/Receipt.jsx';
import CreateCustomerModal from '../CustomerManager/CreateCustomerModal.jsx';
import RankBadge from '../../../components/RankBadge/RankBadge.jsx';
import PreAssignPicker from '../../../components/PreAssignPicker/PreAssignPicker.jsx';
import { usePartsSalesHandlers, PARTS_SALES_ESTIMATE_STORAGE_KEY } from './usePartsSalesHandlers.js';
import { formatTimeHHmm } from '../../../components/timeUtils.js';

const NOTE_MAX_LENGTH = 255;

const getInitials = (name) => {
	if (!name) return 'KH';
	const parts = name.trim().split(/\s+/);
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase();
};

const CUSTOMER_TYPE_LABELS = {
	INDIVIDUAL: 'Khách lẻ',
	DEALER: 'Đại lý',
	GARAGE: 'Garage khác',
};

const toNumberOrZero = (val) => {
	const n = typeof val === 'number' ? val : Number(String(val ?? '').trim());
	return Number.isFinite(n) ? n : 0;
};

const formatVnd = (value) => `${new Intl.NumberFormat('vi-VN').format(Math.round(toNumberOrZero(value)))} VND`;

/**
 * Màn bán linh kiện cho đại lý & garage khác — phiếu dịch vụ rút gọn 1 trang:
 * khách hàng (trái trên) + box thông tin khách (phải trên) + bảng báo giá +
 * khuyến mãi + [Lưu nháp / Hủy / In phiếu / Thanh toán].
 */
export default function PartsSales() {
	const navigate = useNavigate();
	const h = usePartsSalesHandlers({ navigate });

	// Danh sách item hiển thị/tính tiền (bỏ item đã xóa)
	const estimateItems = useMemo(() => {
		const items = Array.isArray(h.selectedEstimate?.items) ? h.selectedEstimate.items : [];
		return items.filter((item) => !item?.isRemoved);
	}, [h.selectedEstimate]);

	// Tính tổng tiền giống create-booking (ưu tiên giá sau thuế/khuyến mãi)
	const invoice = useMemo(() => {
		const pickMoney = (withVat, base) => {
			const withVatNum = toNumberOrZero(withVat);
			if (withVatNum > 0) return withVatNum;
			const baseNum = toNumberOrZero(base);
			return baseNum > 0 ? baseNum : 0;
		};
		const items = estimateItems.map((item) => {
			const qty = Number(item.quantity || 1);
			const price = Number(item.unitPrice || item.price || 0);
			const discount = toNumberOrZero(item.discountAmount || item.discount_amount || 0);
			const rawSubTotal = item.subTotal ?? item.sub_total ?? Math.max(0, qty * price - discount);
			const subTotalDisplay = pickMoney(item.subTotalWithVat ?? item.subTotalWithVAT ?? 0, rawSubTotal);
			const rawFinal = item.finalPrice ?? item.final_price;
			const finalPriceDisplay =
				rawFinal == null || String(rawFinal).trim() === '' || toNumberOrZero(rawFinal) <= 0
					? subTotalDisplay
					: toNumberOrZero(rawFinal);
			return {
				...item,
				categoryName: item.categoryName || item.newCategoryName || '',
				itemName: item.itemName || item.productName || item.serviceName || item.name || '',
				quantity: qty,
				unitPrice: price,
				discountAmount: discount,
				subTotal: finalPriceDisplay,
				_subTotalDisplay: subTotalDisplay,
				_finalPriceDisplay: finalPriceDisplay,
			};
		});
		const subtotal = items.reduce((acc, it) => acc + (it._subTotalDisplay || 0), 0);
		const discountAmount = items.reduce((acc, it) => {
			const lineSubtotal = it._subTotalDisplay || 0;
			const lineFinal = it._finalPriceDisplay || 0;
			return acc + Math.max(it.discountAmount || 0, lineSubtotal - lineFinal, 0);
		}, 0);
		const total = Math.max(0, subtotal - discountAmount);
		return { items, subtotal, discountAmount, vatAmount: 0, total };
	}, [estimateItems]);

	// Dữ liệu in phiếu (tái dùng <Receipt/> như create-booking, phiếu không có xe)
	const printTicket = useMemo(() => ({
		customer: {
			name: h.customer?.fullName || '-',
			phone: h.customer?.phone || h.phone || '-',
			email: '-',
		},
		vehicle: { model: '-', licensePlate: '-', odometerKm: '' },
		ticketCode: 'PHIẾU BÁN LINH KIỆN',
		receivedAtDisplay: new Date().toLocaleString('vi-VN'),
		handoverAtDisplay: '',
		safetyInspectionEnabled: false,
		defaultCategories: [],
		recommendation: '',
		requestNote: h.note || '',
		invoice,
	}), [h.customer, h.phone, h.note, invoice]);

	const handlePrintReceipt = () => {
		if (estimateItems.length === 0) {
			return;
		}
		globalThis.setTimeout?.(() => {
			globalThis.requestAnimationFrame?.(() => globalThis.window?.print?.());
		}, 120);
	};

	const hasItems = estimateItems.length > 0;

	return (
		<div className={`${bookingStyles['booking-page']} ${styles.page}`}>
			<div className={cbStyles.screenOnly}>
				<h2 className={`${bookingStyles['section-title']} ${styles.title}`}>Bán linh kiện (đại lý / garage)</h2>

				{/* ===== Hàng trên: form khách (trái) + box thông tin khách (phải) ===== */}
				<div className={styles.topGrid}>
					<section className={`ui-card ${styles.customerFormCard}`}>
						<div className={styles.cardTitleRow}>
							<h3 className={styles.cardTitle}>Thông tin khách hàng</h3>
							<div className={styles.cardTitleActions}>
								<button
									type="button"
									className={cbStyles.selectDirectoryBtn}
									onClick={() => {
										h.setShowDirectoryModal(true);
										h.loadDirectoryCustomers('');
									}}
									title="Chọn khách hàng từ danh bạ"
								>
									<Contact size={14} style={{ marginRight: 4 }} />
									Chọn từ danh bạ
								</button>
								<button
									type="button"
									className={cbStyles.selectDirectoryBtn}
									onClick={() => h.setShowCreateCustomerModal(true)}
									title="Tạo khách hàng mới (đại lý / garage)"
								>
									<UserPlus size={14} style={{ marginRight: 4 }} />
									Tạo khách mới
								</button>
							</div>
						</div>

						<div className="ui-field">
							<label htmlFor="parts-sales-phone">
								Số điện thoại (<span className={styles.required}>*</span>)
							</label>
							<input
								id="parts-sales-phone"
								type="tel"
								placeholder="Nhập số điện thoại khách / đại lý"
								value={h.phone}
								onChange={(e) => h.setPhone(e.target.value)}
							/>
							{h.checkingCustomer && <div className={styles.hintText}>Đang kiểm tra...</div>}
							{h.customerCheckError && <div className={styles.errorText}>{h.customerCheckError}</div>}
							{h.customer && (
								<div className={styles.okText}>Khách hàng đã tồn tại: {h.customer.fullName}</div>
							)}
							{h.customerNotFound && (
								<div className={styles.warnText}>
									Chưa có khách hàng này trong hệ thống — hãy bấm &quot;Tạo khách mới&quot;.
								</div>
							)}
						</div>

						<div className="ui-field">
							<label htmlFor="parts-sales-note">Ghi chú (không bắt buộc)</label>
							<textarea
								id="parts-sales-note"
								rows="3"
								placeholder="VD: Xuất cho garage ABC, giao hàng trước 17h..."
								value={h.note}
								onChange={(e) => h.setNote(e.target.value)}
								maxLength={NOTE_MAX_LENGTH}
							/>
							<div className={styles.hintText}>{Math.max(0, NOTE_MAX_LENGTH - String(h.note || '').length)} ký tự còn lại</div>
						</div>

						<div className={styles.checkboxField}>
							<label htmlFor="parts-sales-is-scheduling" className={styles.checkboxLabel}>
								<input
									id="parts-sales-is-scheduling"
									type="checkbox"
									checked={h.isScheduling}
									onChange={(e) => h.setIsScheduling(e.target.checked)}
								/>
								Hẹn lịch nhận hàng / dịch vụ
							</label>
						</div>
					</section>

					<section className={`ui-card ${styles.customerInfoCard}`}>
						<h3 className={styles.cardTitle}>Khách hàng</h3>
						{h.customer ? (
							<div className={styles.customerInfoBody}>
								<div className={styles.customerAvatar}>{getInitials(h.customer.fullName)}</div>
								<div className={styles.customerInfoRows}>
									<div className={styles.customerInfoRow}>
										<span className={styles.customerInfoLabel}>Họ tên:</span>
										<span className={styles.customerInfoValue}>{h.customer.fullName || '-'}</span>
									</div>
									<div className={styles.customerInfoRow}>
										<span className={styles.customerInfoLabel}>Điện thoại:</span>
										<span className={styles.customerInfoValue}>{h.customer.phone || '-'}</span>
									</div>
									<div className={styles.customerInfoRow}>
										<span className={styles.customerInfoLabel}>Loại khách:</span>
										<span className={styles.customerInfoValue}>
											{CUSTOMER_TYPE_LABELS[String(h.customer.customerType || '').toUpperCase()] || 'Khách lẻ'}
										</span>
									</div>
									<div className={styles.customerInfoRow}>
										<span className={styles.customerInfoLabel}>Hạng khách:</span>
										<span className={styles.customerInfoValue}>
											<RankBadge rank={h.customer.currentRank || 'BRONZE'} size="sm" />
										</span>
									</div>
									{h.customer.serviceUsageCount != null && (
										<div className={styles.customerInfoRow}>
											<span className={styles.customerInfoLabel}>Số lần dùng dịch vụ:</span>
											<span className={styles.customerInfoValue}>{h.customer.serviceUsageCount}</span>
										</div>
									)}
								</div>
							</div>
						) : (
							<div className={styles.customerInfoEmpty}>
								Nhập số điện thoại hoặc chọn từ danh bạ để hiển thị thông tin khách.
							</div>
						)}
					</section>
				</div>

				{/* ===== MỚI: Thông tin hẹn lịch ===== */}
				{h.isScheduling && (
					<section className={`ui-card ${styles.scheduleCard}`}>
						<h3 className={styles.cardTitle}>Thông tin hẹn lịch</h3>
						<div className={styles.scheduleRow}>
							<div className="ui-field" style={{ marginBottom: 0 }}>
								<label htmlFor="parts-sales-schedule-date">Ngày hẹn</label>
								<select
									id="parts-sales-schedule-date"
									value={h.scheduleDate}
									onChange={(e) => {
										h.setScheduleDate(e.target.value);
										h.setScheduleTime('');
									}}
								>
									<option value="">Chọn ngày hẹn</option>
									{h.dateOptions.map((opt) => (
										<option key={opt.value} value={opt.value}>
											{opt.label}
										</option>
									))}
								</select>
							</div>

							<div className="ui-field" style={{ marginBottom: 0 }}>
								<label htmlFor="parts-sales-schedule-time">Giờ hẹn</label>
								<input
									id="parts-sales-schedule-time"
									type="time"
									value={h.scheduleTime}
									onChange={(e) => h.setScheduleTime(e.target.value)}
									disabled={!h.scheduleDate || h.slotsLoading || !!h.slotsError}
								/>
							</div>
						</div>

						<div className={styles.slotContainer}>
							<div className={styles.slotTitle}>Chọn khung giờ theo danh sách</div>
							{h.baseSlotsLoading && <div className={styles.slotStatus}>Đang tải khung giờ...</div>}
							{!h.baseSlotsLoading && h.baseSlotsError && (
								<div className={`${styles.slotStatus} ${styles.slotStatusError}`}>{h.baseSlotsError}</div>
							)}

							{!!h.scheduleDate && h.slotsLoading && (
								<div className={styles.slotStatus}>Đang tải trạng thái chỗ trống...</div>
							)}
							{!!h.scheduleDate && !h.slotsLoading && h.slotsError && (
								<div className={`${styles.slotStatus} ${styles.slotStatusError}`}>{h.slotsError}</div>
							)}

							<div className={styles.slotGrid}>
								{h.displaySlots.map((slot) => {
									const rawTime = slot?.startTime;
									const displayTime = formatTimeHHmm(rawTime);
									const remaining = Number(slot?.remainingCapacity);
									const hasRemaining = Number.isFinite(remaining);
									const capacity = Number(slot?.capacity);
									const currentBookingCount = Number(slot?.currentBookingCount);
									const hasCapacity = Number.isFinite(capacity) && capacity > 0;
									const hasCurrentCount = Number.isFinite(currentBookingCount) && currentBookingCount >= 0;

									const hasCapacityInfo = !!h.scheduleDate && !h.slotsError && !h.slotsLoading;
									const isDisabled = hasCapacityInfo ? slot?.isActive === false : false;
									const blockPicking = !h.scheduleDate || h.slotsLoading || !!h.slotsError;
									const isActiveSlot = h.timeKey(h.scheduleTime) === h.timeKey(rawTime);

									let capacityText = '';
									if (hasCapacityInfo) {
										if (hasCapacity && hasCurrentCount) capacityText = ` · ${currentBookingCount}/${capacity}`;
										else if (hasRemaining) capacityText = ` · Còn ${remaining}`;
									}

									return (
										<button
											key={slot?.slotId ?? h.timeKey(rawTime) ?? rawTime}
											type="button"
											className={`${styles.slotBtn} ${isActiveSlot ? styles.slotBtnActive : ''} ${
												isDisabled ? styles.slotBtnDisabled : ''
											}`}
											onClick={() => !isDisabled && !blockPicking && h.handlePickSlot(rawTime)}
											disabled={blockPicking || isDisabled}
										>
											<div className={styles.slotTimeText}>{displayTime}</div>
											<div className={styles.slotMetaText}>
												{h.normalizePeriodLabel(slot?.period)}
												{capacityText}
											</div>
										</button>
									);
								})}
							</div>
						</div>

						<PreAssignPicker
							customerId={h.customer?.customerId}
							value={h.preAssign}
							onChange={h.setPreAssign}
							title="Chọn trước xe & nhân sự"
						/>
					</section>
				)}

				{/* ===== Bảng báo giá ===== */}
				<AdvisorItemsTable
					key={h.estimateTableKey}
					className={styles.estimatePanel}
					serviceTicketId={null}
					ticketStatus=""
					ticketPhotos={[]}
					estimatedTimeDisplay=""
					title="Bảng báo giá linh kiện"
					draftStorageKey={PARTS_SALES_ESTIMATE_STORAGE_KEY}
					hideVehiclePhotos
					hideRecommendation
					hideEstimateSummary
					autoStartCreate
					customerName={h.customer?.fullName || ''}
					customerPhone={h.customer?.phone || ''}
					fallbackConfigs={h.fallbackConfigs}
					onEstimateStatusChange={h.setSelectedEstimate}
				/>

				{/* ===== Khuyến mãi (giống service-ticket-detail, phiên bản rút gọn) ===== */}
				<section className={`ui-card ${styles.promotionCard}`}>
					<h3 className={styles.cardTitle}>Mã giảm giá</h3>
					{!h.estimateId && (
						<div className={styles.hintText}>
							Lưu báo giá (nút &quot;Lưu báo giá&quot; trong bảng) để có thể áp dụng khuyến mãi.
						</div>
					)}
					{h.appliedPromotion ? (
						<div className={styles.promotionApplied}>
							<span>Đang áp dụng: <strong>{h.appliedPromotion.label || h.appliedPromotion.promotionCode}</strong></span>
							<button
								type="button"
								className="ui-btn ui-btn--ghost"
								onClick={h.handleUnapplyPromotion}
								disabled={h.promoApplying}
							>
								Hủy áp dụng
							</button>
						</div>
					) : (
						<div className={styles.promotionGrid}>
							<div className="ui-field" style={{ marginBottom: 0 }}>
								<label htmlFor="parts-sales-promo-code">Nhập mã khuyến mãi</label>
								<input
									id="parts-sales-promo-code"
									value={h.promoCode}
									onChange={(e) => {
										h.setPromoCode(e.target.value);
										if (h.selectedPromotionId) h.setSelectedPromotionId('');
									}}
									placeholder="Nhập mã khuyến mãi"
									disabled={!h.canApplyPromotion || h.promoApplying}
								/>
							</div>
							<div className="ui-field" style={{ marginBottom: 0 }}>
								<label htmlFor="parts-sales-promo-select">Chọn từ danh sách</label>
								<select
									id="parts-sales-promo-select"
									value={h.selectedPromotionId}
									onChange={(e) => {
										h.setSelectedPromotionId(e.target.value);
										if (h.promoCode) h.setPromoCode('');
									}}
									disabled={!h.canApplyPromotion || h.promoApplying || h.promotionsLoading}
								>
									<option value="">{h.promotionsLoading ? 'Đang tải...' : '-'}</option>
									{h.availablePromotions.map((p) => {
										const id = h.getPromotionId(p);
										if (!id) return null;
										return (
											<option key={String(id)} value={String(id)}>
												{h.buildPromotionLabel(p) || String(id)}
											</option>
										);
									})}
								</select>
							</div>
							<button
								type="button"
								className="ui-btn ui-btn--primary"
								onClick={h.handleApplyPromotion}
								disabled={!h.canApplyPromotion || h.promoApplying || (!h.promoCode && !h.selectedPromotionId)}
							>
								{h.promoApplying ? 'Đang áp dụng...' : 'Áp dụng'}
							</button>
						</div>
					)}
					{h.promoError && <div className={styles.errorText} style={{ marginTop: 8 }}>{h.promoError}</div>}

					{/* Tổng kết tiền */}
					<div className={styles.summaryRows}>
						<div className={styles.summaryRow}>
							<span>Tạm tính:</span>
							<span>{formatVnd(invoice.subtotal)}</span>
						</div>
						<div className={styles.summaryRow}>
							<span>Giảm giá:</span>
							<span>-{formatVnd(invoice.discountAmount)}</span>
						</div>
						<div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
							<span>Tổng thanh toán:</span>
							<span>{formatVnd(invoice.total)}</span>
						</div>
					</div>
				</section>

				{h.payError && <div className={styles.errorBanner}>{h.payError}</div>}

				{/* ===== Hàng nút hành động ===== */}
				<div data-tour-id="parts-sales-submit-actions" className={`${bookingStyles['booking-actions']} ${styles.actions}`}>
					<button
						type="button"
						className={bookingStyles.btn}
						onClick={h.handleSaveDraft}
						disabled={h.paying || h.cancelling}
					>
						Lưu nháp
					</button>
					<button
						type="button"
						className={bookingStyles.btn}
						onClick={h.handleCancel}
						disabled={h.paying || h.cancelling}
					>
						{h.cancelling ? 'Đang hủy...' : 'Hủy'}
					</button>
					<button
						type="button"
						className={bookingStyles.btn}
						onClick={handlePrintReceipt}
						disabled={!hasItems || h.paying || h.cancelling}
					>
						In phiếu
					</button>
					<button
						type="button"
						className={`${bookingStyles.btn} ${bookingStyles.primary}`}
						onClick={h.isScheduling ? h.handleCreateBooking : h.handlePayment}
						disabled={
							!h.customer?.customerId ||
							!hasItems ||
							h.paying ||
							h.cancelling ||
							(h.isScheduling && (!h.scheduleDate || !h.scheduleTime))
						}
						aria-busy={h.paying}
					>
						{h.paying ? 'Đang xử lý...' : h.isScheduling ? 'Đặt lịch hẹn' : 'Thanh toán'}
					</button>
				</div>
			</div>

			{/* Phiếu in (chỉ hiện khi print) */}
			{hasItems && (
				<div className={cbStyles.printOnly}>
					<Receipt ticket={printTicket} />
				</div>
			)}

			{/* Modal danh bạ khách hàng (tái dùng style create-booking) */}
			{h.showDirectoryModal && (
				<div className={cbStyles.directoryModalOverlay}>
					<div className={cbStyles.directoryModalBackdrop} onClick={() => h.setShowDirectoryModal(false)} />
					<div className={cbStyles.directoryModalContent}>
						<div className={cbStyles.directoryModalHeader}>
							<h3>Danh bạ khách hàng</h3>
							<button type="button" className={cbStyles.directoryModalCloseBtn} onClick={() => h.setShowDirectoryModal(false)}>
								<X size={18} />
							</button>
						</div>
						<div className={cbStyles.directoryModalBody}>
							<div className={cbStyles.directoryModalSearch}>
								<Search size={16} className={cbStyles.directoryModalSearchIcon} />
								<input
									type="text"
									placeholder="Tìm theo tên hoặc số điện thoại..."
									value={h.directorySearch}
									onChange={(e) => h.setDirectorySearch(e.target.value)}
								/>
							</div>
							{h.directoryLoading ? (
								<div className={cbStyles.directoryModalLoading}>
									<div className={cbStyles.directorySpinner} />
									<p>Đang tải dữ liệu...</p>
								</div>
							) : h.directoryCustomers.length === 0 ? (
								<div className={cbStyles.directoryModalEmpty}>
									<p>Không tìm thấy khách hàng nào</p>
								</div>
							) : (
								<div className={cbStyles.directoryModalList}>
									{h.directoryCustomers.map((customer) => (
										<div
											key={customer.customerId || customer.id}
											className={cbStyles.directoryModalItem}
											onClick={() => h.handleSelectCustomerFromDirectory(customer)}
										>
											<div className={cbStyles.directoryModalAvatar}>
												{getInitials(customer.fullName)}
											</div>
											<div className={cbStyles.directoryModalInfo}>
												<div className={cbStyles.directoryModalName}>{customer.fullName}</div>
												<div className={cbStyles.directoryModalPhone}>{customer.phone}</div>
											</div>
											<div className={cbStyles.directoryModalEmail}>
												{CUSTOMER_TYPE_LABELS[String(customer.customerType || '').toUpperCase()] || customer.email || 'Chưa có email'}
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Modal tạo khách mới (có chọn loại khách: đại lý / garage) */}
			<CreateCustomerModal
				open={h.showCreateCustomerModal}
				onClose={() => h.setShowCreateCustomerModal(false)}
				onCreated={h.handleCustomerCreated}
				initialData={h.phone ? { phone: h.phone } : null}
			/>
		</div>
	);
}
