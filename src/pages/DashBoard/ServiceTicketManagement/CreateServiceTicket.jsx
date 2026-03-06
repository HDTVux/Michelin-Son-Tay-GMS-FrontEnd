import { useState } from 'react';
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

	const [isMajorOverhaul, setIsMajorOverhaul] = useState(false);





	const customerName = booking?.customerName ?? 'Customer Name';
	const licensePlate = booking?.licensePlate ?? state?.licensePlate ?? 'License Plate';
	const odometerDisplay = odometerFromState ? `${odometerFromState}` : '-';



	const handleCancel = () => navigate(-1);
	const handleCreateTicket = () => {
		console.log('CREATE_SERVICE_TICKET', {
			bookingId: state?.bookingId ?? booking?.bookingId,
			vehicleInfo,
			odometerKm: odometerFromState || null,
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
									<span className={styles.summaryLabel}>Tổng ước tính:</span>
									<span className={styles.summaryValue}>Estimated Total</span>
								</div>
							</div>
						</section>

						<section className={styles.step}>
							<h2 className={styles.stepTitle}>Đánh dấu đặc biệt (nếu có)</h2>
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