import PropTypes from 'prop-types';
import styles from './Receipt.module.css';
import logo from '../../../assets/Logo.png';
import CarIcon from '../../../assets/car.png';

const SAFETY_ITEMS = [
	'Lốp',
	'Gạt mưa',
	'Nước rửa kính',
	'Má phanh',
	'Đĩa phanh',
	'Dầu phanh',
	'Dầu động cơ',
	'Lọc dầu động cơ',
	'Nước mát',
	'Ắc quy',
	'Lọc gió động cơ',
	'Lọc gió điều hòa',
	'Thuốc lái',
];

const SERVICE_ROWS = [
	'Lốp',
	'Van',
	'Cân bằng động',
	'Cân chỉnh thước lái',
	'Phanh',
	'Gạt mưa',
	'Nước rửa kính',
	'Dầu động cơ',
	'Lọc dầu động cơ',
	'Lọc gió động cơ',
	'Lọc gió điều hòa',
];

function safeText(value) {
	if (value == null) return '';
	return String(value);
}

function CarDiagram({ src }) {
	const resolvedSrc = typeof src === 'string' && src.trim() ? src.trim() : CarIcon;
	return <img className={styles.carImg} src={resolvedSrc} alt="" />;
}

function CheckboxCell() {
	return <span className={styles.checkbox} aria-hidden="true" />;
}

export default function Receipt({ ticket, carDiagramSrc }) {
	const customer = ticket?.customer || {};
	const vehicle = ticket?.vehicle || {};

	const receivedAt = safeText(ticket?.receivedAtDisplay || ticket?.receivedAt || '');
	const handoverAt = safeText(ticket?.handoverAtDisplay || ticket?.handoverAt || '');
	const model = safeText(vehicle?.model || '');
	const licensePlate = safeText(vehicle?.licensePlate || '');
	const odometer = vehicle?.odometerKm == null ? '' : `${Number(vehicle.odometerKm).toLocaleString('vi-VN')}`;

	return (
		<section className={styles.sheet}>
			<header className={styles.topHeader}>
				<div className={styles.topHeaderLeft} />
				<div className={styles.topHeaderCenter}>
					<div className={styles.sheetTitle}>PHIẾU KIỂM TRA XE</div>
				</div>
				<div className={styles.topHeaderRight}>
					<img className={styles.logo} src={logo} alt="" />
					<div className={styles.brandText}>MICHELIN\nCAR SERVICE</div>
				</div>
			</header>

			<div className={styles.headerGrid}>
				<div className={styles.headerLeft}>
					<div className={styles.formRow}>
						<div className={styles.formLabel}>Họ tên:</div>
						<div className={styles.formValue}>{safeText(customer?.name)}</div>
						<div className={styles.formLabel}>Loại &amp; kiểu xe:</div>
						<div className={styles.formValue}>{model}</div>
					</div>
					<div className={styles.formRow}>
						<div className={styles.formLabel}>Điện thoại:</div>
						<div className={styles.formValue}>{safeText(customer?.phone)}</div>
						<div className={styles.formLabel}>Biển số:</div>
						<div className={styles.formValue}>{licensePlate}</div>
					</div>
					<div className={styles.formRow}>
						<div className={styles.formLabel}>E-mail:</div>
						<div className={styles.formValue}>{safeText(customer?.email)}</div>
						<div className={styles.formLabel}>Ki-lô-mét:</div>
						<div className={styles.formValue}>{odometer}</div>
					</div>
					<div className={styles.formRow}>
						<div className={styles.formLabel}>Ngày giờ nhận xe:</div>
						<div className={styles.formValue}>{receivedAt}</div>
						<div className={styles.formLabel}>Ngày giờ giao xe:</div>
						<div className={styles.formValue}>{handoverAt}</div>
					</div>
					<div className={styles.formRowSingle}>
						<div className={styles.formLabel}>Kiểm tra an toàn:</div>
						<div className={styles.inlineChecks}>
							<span className={styles.checkItem}>
								<span className={styles.checkBoxSmall} /> Có
							</span>
							<span className={styles.checkItem}>
								<span className={styles.checkBoxSmall} /> Không
							</span>
						</div>
					</div>

					<div className={styles.diagramWrap}>
						<div className={styles.diagramLeft}>
							<div className={styles.tireBlock}>
								<div className={styles.tireHeading}>L</div>
								<div className={styles.tireCell}>
									<div className={styles.tireUnit}>mm</div>
									<div className={styles.tireValue} />
								</div>
								<div className={styles.tireCell}>
									<div className={styles.tireUnit}>kg/cm²</div>
									<div className={styles.tireValue} />
								</div>
							</div>
							<div className={styles.tireBlock}>
								<div className={styles.tireHeading}>R</div>
								<div className={styles.tireCell}>
									<div className={styles.tireUnit}>mm</div>
									<div className={styles.tireValue} />
								</div>
								<div className={styles.tireCell}>
									<div className={styles.tireUnit}>kg/cm²</div>
									<div className={styles.tireValue} />
								</div>
							</div>
						</div>

						<div className={styles.diagramCenter}>
							<div className={styles.diagramRulerSpacer} />
							<div className={styles.carBox}>
								<CarDiagram src={carDiagramSrc} />
							</div>
							<div className={styles.diagramRulerSpacer} />
							<div className={styles.sizeNote}>Size lốp khuyến cáo: ________</div>
							<div className={styles.noteLine}>Lưu ý: ________________________________________________</div>
						</div>

						<div className={styles.diagramRight}>
							<div className={styles.pressureLayout}>
								<div className={styles.pressureLabel}>Áp suất\nkhuyến cáo</div>
								<div className={styles.pressureBoxes}>
									{Array.from({ length: 3 }).map((_, idx) => (
										<div key={`pressure-${idx + 1}`} className={styles.pressureBox}>
											<div className={styles.pressureRow}>
												<div className={styles.pressureUnit}>mm</div>
												<div className={styles.pressureValue} />
											</div>
											<div className={styles.pressureRow}>
												<div className={styles.pressureUnit}>kg/cm²</div>
												<div className={styles.pressureValue} />
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className={styles.headerRight}>
					<div className={styles.safetyBox}>
						<div className={styles.safetyHeader}>
							<div className={styles.safetyTitle}>HẠNG MỤC KIỂM TRA AN TOÀN</div>
							<div className={styles.safetyCols}>
								<div className={styles.safetyCol}>TỐT</div>
								<div className={styles.safetyCol}>LƯU Ý</div>
								<div className={styles.safetyCol}>THAY</div>
							</div>
						</div>
						<div className={styles.safetyBody}>
							{SAFETY_ITEMS.map((label) => (
								<div key={label} className={styles.safetyRow}>
									<div className={styles.safetyItem}>{label}</div>
									<div className={styles.safetyChecks}>
										<CheckboxCell />
										<CheckboxCell />
										<CheckboxCell />
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>

			<div className={styles.serviceTableWrap}>
				<table className={styles.serviceTable}>
					<thead>
						<tr>
							<th className={styles.thStt}>STT</th>
							<th className={styles.thItem}>HẠNG MỤC</th>
							<th className={styles.thDesc}>DIỄN GIẢI</th>
							<th className={styles.thQty}>SL</th>
							<th className={styles.thPrice}>ĐƠN GIÁ</th>
							<th className={styles.thAmount}>THÀNH TIỀN</th>
							<th className={styles.thKho}>KHO</th>
							<th className={styles.thConfirm}>XÁC NHẬN</th>
						</tr>
					</thead>
					<tbody>
						{Array.from({ length: 15 }).map((_, idx) => {
							const label = SERVICE_ROWS[idx] || '';
							return (
									<tr key={`row-${String(idx + 1).padStart(2, '0')}`}>
									<td className={styles.tdCenter}>{String(idx + 1).padStart(2, '0')}</td>
									<td>{label}</td>
									<td />
									<td className={styles.tdCenter} />
									<td className={styles.tdRight} />
									<td className={styles.tdRight} />
									<td className={styles.tdCenter} />
									<td className={styles.tdCenter} />
								</tr>
							);
						})}
						<tr>
							<td colSpan={5} className={styles.totalLabel}>TỔNG CỘNG</td>
							<td className={styles.tdRight} />
							<td colSpan={2} />
						</tr>
					</tbody>
				</table>
			</div>

			<div className={styles.footer}>
				<div className={styles.recommendation}>
					<div className={styles.footerTitle}>Khuyến nghị:</div>
					<div className={styles.recommendLine}>
						<span className={styles.recommendItem}>
							<span className={styles.checkBoxSmall} aria-hidden="true" />
							<span>Thay dầu định kỳ</span>
						</span>
						<span className={styles.recommendItem}>
							<span className={styles.checkBoxSmall} aria-hidden="true" />
							<span>Thay lốp khi mòn</span>
						</span>
						<span className={styles.recommendItem}>
							<span className={styles.checkBoxSmall} aria-hidden="true" />
							<span>Kiểm tra hệ thống phanh</span>
						</span>
					</div>
					<div className={styles.smallText}>
						Ghi chú thêm: ____________________________________________________________________________________________
					</div>
				</div>

				<div className={styles.signRow}>
					<div className={styles.signCol}>
						<div className={styles.signTitle}>Đại lý</div>
						<div className={styles.signHint}>(Ký tên)</div>
					</div>
					<div className={styles.signCol}>
						<div className={styles.signTitle}>Khách hàng</div>
						<div className={styles.signHint}>(Ký tên)</div>
					</div>
				</div>
			</div>
		</section>
	);
}

Receipt.propTypes = {
	ticket: PropTypes.shape({
		customer: PropTypes.shape({
			name: PropTypes.string,
			phone: PropTypes.string,
			email: PropTypes.string,
		}),
		vehicle: PropTypes.shape({
			model: PropTypes.string,
			licensePlate: PropTypes.string,
			odometerKm: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		}),
		receivedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
		handoverAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
		receivedAtDisplay: PropTypes.string,
		handoverAtDisplay: PropTypes.string,
	}),
	carDiagramSrc: PropTypes.string,
};

CarDiagram.propTypes = {
	src: PropTypes.string,
};

