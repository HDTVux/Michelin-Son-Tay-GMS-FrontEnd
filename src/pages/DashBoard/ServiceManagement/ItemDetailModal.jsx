import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import styles from './ServiceManagement.module.css';
import { fetchWarehouseCatalogItemDetail, fetchWarehouseSpecificationsByCatalogItemId } from '../../../services/warehouseService.js';

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
	const [detail, setDetail] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			if (!item) return;
			const id = item?.itemId ?? item?.itemId ?? item?.id ?? null;
			if (!id) {
				setDetail(item);
				return;
			}

			setLoading(true);
			setError('');
			try {
				const token = localStorage.getItem('authToken');
				const res = await fetchWarehouseCatalogItemDetail(id, token);
				const payload = res?.data?.data ?? res?.data ?? res;
				let base = payload ?? {};
				// If backend wraps again under data
				if (base?.data) base = base.data;

				// Try to fetch specifications as a supplement
				try {
					const specsRes = await fetchWarehouseSpecificationsByCatalogItemId(id, token);
					const specsPayload = specsRes?.data?.data ?? specsRes?.data ?? specsRes;
					base.specifications = Array.isArray(specsPayload) ? specsPayload : base.specifications ?? [];
				} catch {
					base.specifications = base.specifications ?? [];
				}

				if (!cancelled) setDetail(base);
			} catch (err) {
				if (!cancelled) {
					setError(err?.message || 'Không thể tải chi tiết sản phẩm.');
					setDetail(item);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		load();
		return () => {
			cancelled = true;
		};
	}, [item]);

	if (!item) return null;

	const display = detail ?? item;
	const priceText = display?.showPrice ? `${formatCurrencyVnd(display?.price)} ₫` : 'Liên hệ';
	const typeText = formatItemTypeLabel(display?.itemType);
	const brandText = display?.brand?.brandName || (display?.brandId ? `#${display.brandId}` : '-');
	const productLineText = display?.productLine?.lineName || (display?.productLineId ? `#${display.productLineId}` : '-');
	const specs = Array.isArray(display?.specifications) ? display.specifications : [];

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
				{loading ? <div className={styles['loading-inline']}>Đang tải chi tiết...</div> : null}
				{error ? <div className={styles.errorBanner}>{error}</div> : null}

				<div className={styles.modalSection}>
					<div className={styles.modalSectionTitle}>Thông tin chính</div>
					<table className={styles.detailTable}>
						<tbody>
							<tr>
								<th>ID</th>
								<td>{display?.itemId ?? '-'}</td>
							</tr>
							<tr>
								<th>Tên</th>
								<td>{display?.itemName || '-'}</td>
							</tr>
							<tr>
								<th>SKU</th>
								<td>{display?.sku || '-'}</td>
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
								<td>{display?.unit || '-'}</td>
							</tr>
						</tbody>
					</table>
				</div>

				<div className={styles.modalSection}>
					<div className={styles.modalSectionTitle}>Mô tả</div>
					<div className={styles.modalText}>{display?.description || '—'}</div>
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
											<td>{s?.specType || s?.attributeName || '-'}</td>
											<td>{s?.specValue || s?.value || '-'}</td>
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
