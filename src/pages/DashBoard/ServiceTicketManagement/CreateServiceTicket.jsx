import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import styles from './CreateServiceTicket.module.css';

const DEFAULT_SERVICE_OPTIONS = [
	{ id: 'maintenance', label: 'Bảo dưỡng định kỳ' },
	{ id: 'repair', label: 'Sửa chữa' },
	{ id: 'tire', label: 'Thay lốp' },
	{ id: 'inspection', label: 'Kiểm tra tổng quát' },
];

export default function CreateServiceTicket() {
	useScrollToTop();
	const navigate = useNavigate();
	const location = useLocation();

	const state = location?.state;
	const booking = state?.booking ?? null;
	const vehicleInfo = state?.vehicleInfo ?? 'Vehicle Info';
	const odometerFromState = state?.odometerKm ?? state?.odometer ?? '';

	const [symptoms, setSymptoms] = useState('');
	const [selectedServiceIds, setSelectedServiceIds] = useState(() => new Set());
	const [isMajorOverhaul, setIsMajorOverhaul] = useState(false);

	const selectedServices = useMemo(() => {
		return DEFAULT_SERVICE_OPTIONS.filter((s) => selectedServiceIds.has(s.id));
	}, [selectedServiceIds]);

	const selectedServicesLabel = useMemo(() => {
		if (selectedServices.length === 0) return 'Selected Services';
		return selectedServices.map((s) => s.label).join(', ');
	}, [selectedServices]);

	const customerName = booking?.customerName ?? 'Customer Name';
	const licensePlate = booking?.licensePlate ?? state?.licensePlate ?? 'License Plate';
	const odometerDisplay = odometerFromState ? `${odometerFromState}` : '-';

	const handleToggleService = (serviceId) => {
		setSelectedServiceIds((prev) => {
			const next = new Set(prev);
			if (next.has(serviceId)) next.delete(serviceId);
			else next.add(serviceId);
			return next;
		});
	};

	const handleCancel = () => navigate(-1);
	const handleCreateTicket = () => {
		console.log('CREATE_SERVICE_TICKET', {
			bookingId: state?.bookingId ?? booking?.bookingId,
			vehicleInfo,
			odometerKm: odometerFromState || null,
			symptoms,
			selectedServiceIds: Array.from(selectedServiceIds),
			majorOverhaul: isMajorOverhaul,
		});
	};

	return (
		<div className={styles.page}>
			<div className={styles.layout}>
				<main className={styles.main}>
					<header className={styles.header}>
						<h1 className="ui-section-title">Tạo phiếu dịch vụ</h1>
						<p className="ui-section-subtitle">Thông tin xe đã check-in: <b>{vehicleInfo}</b></p>
					</header>

					<div className={`ui-card ${styles.card}`}>
						<section className={styles.step}>
							<h2 className={styles.stepTitle}>Step 1: Yêu cầu khách hàng</h2>
							<div className="ui-field" style={{ marginBottom: 0 }}>
								<textarea
									value={symptoms}
									onChange={(e) => setSymptoms(e.target.value)}
									placeholder="Nhập triệu chứng, vấn đề xe..."
								/>
							</div>
							<div className={styles.hint}>Ghi chép chi tiết để Kỹ thuật viên chẩn đoán chính xác</div>
						</section>

						<section className={styles.step}>
							<h2 className={styles.stepTitle}>Step 2: Chọn dịch vụ sơ bộ</h2>
							<div className={styles.servicesList}>
								{DEFAULT_SERVICE_OPTIONS.map((opt) => (
									<div key={opt.id} className={styles.serviceRow}>
										<label className={styles.checkboxLabel}>
											<input
												type="checkbox"
												checked={selectedServiceIds.has(opt.id)}
												onChange={() => handleToggleService(opt.id)}
											/>
											<span>{opt.label}</span>
										</label>								
									</div>
								))}
							</div>
						</section>

						<section className={styles.step}>
							<h2 className={styles.stepTitle}>Step 3: Đánh dấu đặc biệt (nếu có)</h2>
							<label className={styles.checkboxLabel}>
								<input
									type="checkbox"
									checked={isMajorOverhaul}
									onChange={(e) => setIsMajorOverhaul(e.target.checked)}
								/>
								<span><b>Major Overhaul</b> - Cần hỗ trợ bên ngoài</span>
							</label>
							<div className={styles.hint}>Ticket sẽ được đánh dấu External Dependency</div>
						</section>

						<section className={styles.summary}>
							<h3 className={styles.summaryTitle}>Thông tin tóm tắt:</h3>
							<div className={styles.summaryGrid}>
								<div className={styles.summaryRow}>
									<span className={styles.summaryLabel}>Khách hàng:</span>
									<span className={styles.summaryValue}>{customerName}</span>
								</div>
								<div className={styles.summaryRow}>
									<span className={styles.summaryLabel}>Biển số:</span>
									<span className={styles.summaryValue}>{licensePlate}</span>
								</div>
								<div className={styles.summaryRow}>
									<span className={styles.summaryLabel}>Odometer:</span>
									<span className={styles.summaryValue}>{odometerDisplay}</span>
								</div>
								<div className={styles.summaryRow}>
									<span className={styles.summaryLabel}>Dịch vụ đã chọn:</span>
									<span className={styles.summaryValue}>{selectedServicesLabel}</span>
								</div>
								<div className={styles.summaryRow}>
									<span className={styles.summaryLabel}>Tổng ước tính:</span>
									<span className={styles.summaryValue}>Estimated Total</span>
								</div>
							</div>
						</section>

						<div className="ui-actions">
							<button type="button" className="ui-btn ui-btn--ghost" onClick={handleCancel}>
								Hủy
							</button>
							<button type="button" className="ui-btn ui-btn--primary" onClick={handleCreateTicket}>
								Tạo phiếu
							</button>
						</div>
					</div>
				</main>
			</div>
		</div>
	);
}