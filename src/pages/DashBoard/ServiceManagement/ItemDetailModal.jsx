import PropTypes from 'prop-types';
import styles from './ServiceManagement.module.css';

 const formatCurrencyVnd = (value) => {
	const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
	if (!Number.isFinite(n)) return '-';
	return new Intl.NumberFormat('vi-VN').format(Math.round(n));
};

 const formatItemTypeLabel = (itemType) => {
	if (itemType === 'PART') return 'Phụ tùng';
	if (itemType === 'SERVICE') return 'Dịch vụ';
	return itemType || '-';
};

export default function ItemDetailModal({ item, onClose }) {
	if (!item) return null;

	const priceText = item?.showPrice ? `${formatCurrencyVnd(item?.price)} ₫` : 'Liên hệ';
	const typeText = formatItemTypeLabel(item?.itemType);
	const brandText = item?.brand?.brandName || '-';
	const productLineText = item?.productLine?.lineName || '-';
	const specs = Array.isArray(item?.specifications) ? item.specifications : [];

	return (
		<dialog
			open
			className={styles.modalContent}
			aria-labelledby="item-detail-title"
			onCancel={(e) => {
				e.preventDefault();
				onClose();
			}}
		>
			<div className={styles.modalHeader}>
				<h3 id="item-detail-title" className={styles.modalTitle}>
					Chi tiết sản phẩm
				</h3>
				<button type="button" className={styles.modalCloseButton} onClick={onClose} aria-label="Đóng">
					×
				</button>
			</div>

			<div className={styles.modalBody}>
				<div className={styles.modalSection}>
					<div className={styles.modalSectionTitle}>Thông tin chính</div>
					<table className={styles.detailTable}>
						<tbody>
							<tr>
								<th>ID</th>
								<td>{item?.itemId ?? '-'}</td>
							</tr>
							<tr>
								<th>Tên</th>
								<td>{item?.itemName || '-'}</td>
							</tr>
							<tr>
								<th>SKU</th>
								<td>{item?.sku || '-'}</td>
							</tr>
							<tr>
								<th>Loại</th>
								<td>{typeText}</td>
							</tr>
							<tr>
								<th>Hãng</th>
								<td>{brandText}</td>
							</tr>
							<tr>
								<th>Dòng sản phẩm</th>
								<td>{productLineText}</td>
							</tr>
							<tr>
								<th>Giá</th>
								<td>{priceText}</td>
							</tr>
							<tr>
								<th>Đơn vị</th>
								<td>{item?.unit || '-'}</td>
							</tr>
						</tbody>
					</table>
				</div>

				<div className={styles.modalSection}>
					<div className={styles.modalSectionTitle}>Mô tả</div>
					<div className={styles.modalText}>{item?.description || '—'}</div>
				</div>

				<div className={styles.modalSection}>
					<div className={styles.modalSectionTitle}>Thông số</div>
					<div className={styles.specTableWrap}>
						<table className={styles.specTable}>
							<thead>
								<tr>
									<th>THÔNG SỐ</th>
									<th>GIÁ TRỊ</th>
								</tr>
							</thead>
							<tbody>
								{specs.length === 0 ? (
									<tr>
										<td colSpan={2} className={styles.emptyRowCompact}>
											Không có thông số.
										</td>
									</tr>
								) : (
									specs.map((s) => (
										<tr key={String(s?.specId ?? `${s?.specType}-${s?.specValue}`)}>
											<td>{s?.specType || '-'}</td>
											<td>{s?.specValue || '-'}</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</dialog>
	);
}

ItemDetailModal.propTypes = {
	item: PropTypes.shape({
		itemId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
		itemName: PropTypes.string,
		itemType: PropTypes.string,
		sku: PropTypes.string,
		price: PropTypes.number,
		showPrice: PropTypes.bool,
		unit: PropTypes.string,
		description: PropTypes.string,
		brand: PropTypes.shape({
			brandId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
			brandName: PropTypes.string,
		}),
		productLine: PropTypes.shape({
			productLineId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
			lineName: PropTypes.string,
		}),
		specifications: PropTypes.arrayOf(
			PropTypes.shape({
				specId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
				specType: PropTypes.string,
				specValue: PropTypes.string,
			})
		),
	}),
	onClose: PropTypes.func.isRequired,
};
