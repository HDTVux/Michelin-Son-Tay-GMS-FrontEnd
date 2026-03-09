import styles from './ServiceTicketDetail.module.css';

const PHOTO_SLOTS = 4;

const TEMPLATE_ROWS = [
	{ label: 'Lốp' },
	{ label: 'Van' },
	{ label: 'Cân bằng động' },
	{ label: 'Căn chỉnh thước lái' },
	{ label: 'Phanh' },
	{ label: 'Gạt mưa' },
	{ label: 'Nước rửa kính' },
	{ label: 'Dầu động cơ' },
	{ label: 'Lọc dầu động cơ' },
	{ label: 'Lọc gió động cơ' },
	{ label: 'Lọc gió điều hòa' },
	{ label: '' },
	{ label: '' },
	{ label: '' },
	{ label: '' },
];

export default function AdvisorItemsTable() {

	return (
		<section className={styles.block}>
			<h2 className={styles.blockTitle}>Thông tin tư vấn </h2>

			<div className={styles.advisorStack}>
				<div className={styles.advisorCard}>
					<h3 className={styles.advisorTitle}>Ảnh tình trạng xe</h3>
					<div className={styles.photoStrip}>
						{Array.from({ length: PHOTO_SLOTS }).map((_, idx) => (
							<div
								key={`photo-slot-${idx + 1}`}
								className={styles.photoPlaceholder}
								aria-label={`Ảnh ${idx + 1}`}
							/>
						))}
					</div>
				</div>

				<div className={styles.advisorCard}>
					<h3 className={styles.advisorTitle}>Chẩn đoán kỹ thuật</h3>
					<div className="ui-field" style={{ marginBottom: 0 }}>
						<textarea placeholder="Nhập kết quả chẩn đoán..." />
					</div>

					<h3 className={styles.advisorTitle} style={{ marginTop: 14 }}>Dịch vụ đề xuất</h3>
					<div className={styles.recommendList}>
						<label className={styles.recommendItem}>
							<input type="checkbox" defaultChecked />
							<span>Bảo dưỡng định kỳ</span>
						</label>
						<label className={styles.recommendItem}>
							<input type="checkbox" />
							<span>Thay má phanh trước</span>
						</label>
						<label className={styles.recommendItem}>
							<input type="checkbox" />
							<span>Thay dầu phanh</span>
						</label>
					</div>
					<div className="ui-field" style={{ marginBottom: 0, marginTop: 10 }}>
						<input type="text" placeholder="Thêm dịch vụ khác..." />
					</div>
				</div>

				<div className={styles.advisorCard}>
					<h3 className={styles.advisorTitle}>Phụ tùng cần thiết</h3>
					<div className={styles.partRow}>
						<div className={styles.partName}>Má phanh trước Toyota</div>
						<div className={styles.partMeta}>
							<span className={styles.partText}>15 cái</span>
							<span className={styles.partText}>500,000đ/bộ</span>
							<span className={styles.tag}>In Stock</span>
						</div>
					</div>
					<button type="button" className={`ui-btn ui-btn--ghost ${styles.fullWidthBtn}`}>
						Kiểm tra tồn kho
					</button>
				</div>

				<div className={styles.advisorCard}>
					<h3 className={styles.advisorTitle}>Ước tính</h3>
					<div className={styles.kvList}>
						<div className={styles.kvRow}>
							<span className={styles.kvLabel}>Thời gian</span>
							<span className={styles.kvValue}>2-3 giờ</span>
						</div>
						<div className={styles.kvRow}>
							<span className={styles.kvLabel}>Chi phí dự kiến</span>
							<span className={styles.kvValue} style={{ fontWeight: 900 }}>1,500,000đ</span>
						</div>
						<div className={styles.kvRow}>
							<span className={styles.kvLabel} />
							<span className={styles.kvValue} style={{ color: 'var(--ui-muted)' }}>Chưa bao gồm VAT</span>
						</div>
					</div>
				</div>
			</div>

			<div className={styles.tableWrap}>
				<table className={styles.table}>
					<thead>
						<tr>
							<th scope="col">STT</th>
							<th scope="col">HẠNG MỤC</th>
							<th scope="col">DIỄN GIẢI</th>
							<th scope="col">SL</th>
							<th scope="col">ĐƠN GIÁ</th>
							<th scope="col">THÀNH TIỀN</th>
							<th scope="col">KHO</th>
							<th scope="col">XÁC NHẬN</th>
						</tr>
					</thead>
					<tbody>
						{TEMPLATE_ROWS.map((row, idx) => {
							const stt = String(idx + 1).padStart(2, '0');
							return (
								<tr key={`advisor-row-${stt}-${row.label || 'blank'}`}>
									<td>{stt}</td>
								<td>{row.label}</td>
								<td />
								<td className={styles.tdNumber} />
								<td className={styles.tdNumber} />
								<td className={styles.tdNumber} />
								<td />
								<td className={styles.tdCenter}>
									<input type="checkbox" disabled />
								</td>
							</tr>
							);
						})}
					</tbody>
					<tfoot>
						<tr>
							<td className={styles.tableFooterLabel} colSpan={5}>
								TỔNG CỘNG
							</td>
							<td className={styles.tdNumber} />
							<td colSpan={2} />
						</tr>
					</tfoot>
				</table>
			</div>
		</section>
	);
}
