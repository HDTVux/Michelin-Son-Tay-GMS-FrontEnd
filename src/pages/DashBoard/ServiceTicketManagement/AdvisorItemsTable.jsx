import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import styles from './ServiceTicketDetail.module.css';
import { createServiceTicketEstimate, fetchServiceTicketEstimate, updateServiceTicketEstimate } from '../../../services/serviceTicketService.js';

const PHOTO_SLOTS = 4;

const PLACEHOLDER_ROW_COUNT = 15;

const CATEGORY_SUGGESTIONS = [
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
];

function formatCurrencyVnd(value) {
	const n = typeof value === 'number' ? value : Number(value);
	if (!Number.isFinite(n)) return '';
	return `${new Intl.NumberFormat('vi-VN').format(n)}đ`;
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

function createEmptyDraftRow() {
	return {
		newCategoryName: '',
		itemName: '',
		quantity: '',
		unitPrice: '',
	};
}

function toNumberOrZero(value) {
	const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
	return Number.isFinite(n) ? n : 0;
}

export default function AdvisorItemsTable({ serviceTicketId }) {
	const [estimate, setEstimate] = useState(null);
	const [loading, setLoading] = useState(false);
	const [loadError, setLoadError] = useState('');
	const [fetched, setFetched] = useState(false);
	const [isCreating, setIsCreating] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState('');
	const [draftRows, setDraftRows] = useState(() => Array.from({ length: PLACEHOLDER_ROW_COUNT }).map(() => createEmptyDraftRow()));
	const [editRows, setEditRows] = useState(() => Array.from({ length: PLACEHOLDER_ROW_COUNT }).map(() => createEmptyDraftRow()));
	const prevServiceTicketIdRef = useRef(serviceTicketId);

	useEffect(() => {
		const token = localStorage.getItem('authToken');
		if (!token || serviceTicketId == null || String(serviceTicketId).trim() === '') {
			setEstimate(null);
			setFetched(false);
			setIsCreating(false);
			setIsEditing(false);
			return;
		}

		let ignore = false;
		const run = async () => {
			try {
				setLoading(true);
				setLoadError('');
				setFetched(false);
				const res = await fetchServiceTicketEstimate(serviceTicketId, token);
				if (ignore) return;
				const picked = pickLatestEstimate(res?.data);
				setEstimate(picked);
				setFetched(true);
			} catch (err) {
				if (ignore) return;
				setEstimate(null);
				setLoadError(err?.message || 'Không thể tải ước tính.');
				setFetched(true);
			} finally {
				if (!ignore) setLoading(false);
			}
		};

		run();
		return () => {
			ignore = true;
		};
	}, [serviceTicketId]);

	useEffect(() => {
		if (!isCreating) return;
		// When switching tickets while creating, reset draft.
		setDraftRows(Array.from({ length: PLACEHOLDER_ROW_COUNT }).map(() => createEmptyDraftRow()));
		setSaveError('');
	}, [serviceTicketId, isCreating]);

	useEffect(() => {
		const prev = prevServiceTicketIdRef.current;
		prevServiceTicketIdRef.current = serviceTicketId;
		if (!isEditing) return;
		if (prev === serviceTicketId) return;
		// When switching tickets while editing, reset edit draft.
		setEditRows(Array.from({ length: PLACEHOLDER_ROW_COUNT }).map(() => createEmptyDraftRow()));
		setSaveError('');
	}, [serviceTicketId, isEditing]);

	const rows = useMemo(() => {
		const items = Array.isArray(estimate?.items) ? estimate.items : [];
		return items.map((it, idx) => {
			const quantity = it?.quantity ?? '';
			const unitPrice = it?.unitPrice ?? '';
			const subTotal = it?.subTotal ?? '';
			const categoryName = it?.workCategory?.categoryName || it?.workCategory?.categoryCode || it?.newCategoryName || '';
			return {
				key: String(it?.estimateItemId ?? it?.itemId ?? it?.itemName ?? `item-${idx}`),
				categoryName,
				itemName: it?.itemName || '',
				quantity,
				unitPrice,
				subTotal,
			};
		});
	}, [estimate]);

	const canEdit = useMemo(() => {
		return fetched && !loading && !loadError && !!estimate && !isCreating && !isEditing;
	}, [fetched, loading, loadError, estimate, isCreating, isEditing]);

	const draftComputed = useMemo(() => {
		return draftRows.map((r, idx) => {
			const quantity = toNumberOrZero(r.quantity);
			const unitPrice = toNumberOrZero(r.unitPrice);
			const subTotal = quantity * unitPrice;
			return {
				key: `draft-${idx + 1}`,
				...r,
				subTotal,
			};
		});
	}, [draftRows]);

	const editComputed = useMemo(() => {
		return editRows.map((r, idx) => {
			const quantity = toNumberOrZero(r.quantity);
			const unitPrice = toNumberOrZero(r.unitPrice);
			const subTotal = quantity * unitPrice;
			return {
				key: `edit-${idx + 1}`,
				...r,
				subTotal,
			};
		});
	}, [editRows]);

	const draftTotal = useMemo(() => {
		return draftComputed.reduce((acc, r) => acc + toNumberOrZero(r.subTotal), 0);
	}, [draftComputed]);

	const editTotal = useMemo(() => {
		return editComputed.reduce((acc, r) => acc + toNumberOrZero(r.subTotal), 0);
	}, [editComputed]);

	const total = useMemo(() => {
		const raw = estimate?.totalPrice;
		const n = typeof raw === 'number' ? raw : Number(raw);
		if (Number.isFinite(n)) return n;
		// fallback: sum subtotals if totalPrice missing
		return rows.reduce((acc, r) => {
			const v = typeof r.subTotal === 'number' ? r.subTotal : Number(r.subTotal);
			return acc + (Number.isFinite(v) ? v : 0);
		}, 0);
	}, [estimate, rows]);

	const estimateCostText = useMemo(() => {
		if (isCreating) return formatCurrencyVnd(draftTotal) || '-';
		if (isEditing) return formatCurrencyVnd(editTotal) || '-';
		if (loading) return 'Đang tải...';
		if (!estimate) return '-';
		return formatCurrencyVnd(total) || '-';
	}, [isCreating, draftTotal, isEditing, editTotal, loading, estimate, total]);

	const showAddEstimate = useMemo(() => {
		return fetched && !loading && !loadError && !estimate && !isCreating && !isEditing;
	}, [fetched, loading, loadError, estimate, isCreating, isEditing]);

	const statusLine = useMemo(() => {
		return saveError || loadError || 'Chưa bao gồm VAT';
	}, [saveError, loadError]);

	const footerTotalText = useMemo(() => {
		if (isCreating) return formatCurrencyVnd(draftTotal);
		if (isEditing) return formatCurrencyVnd(editTotal);
		if (!estimate) return '';
		return formatCurrencyVnd(total);
	}, [isCreating, draftTotal, isEditing, editTotal, estimate, total]);

	const tableRows = useMemo(() => {
		if (isCreating) return draftComputed;
		if (isEditing) return editComputed;
		return rows;
	}, [isCreating, isEditing, draftComputed, editComputed, rows]);

	const showInputs = useMemo(() => {
		return isCreating || isEditing;
	}, [isCreating, isEditing]);

	const onChange = useMemo(() => {
		return isCreating ? handleDraftChange : handleEditChange;
	}, [isCreating]);

	const startCreate = () => {
		if (isEditing) return;
		setIsCreating(true);
		setSaveError('');
		setDraftRows(Array.from({ length: PLACEHOLDER_ROW_COUNT }).map(() => createEmptyDraftRow()));
	};

	const cancelCreate = () => {
		if (isSaving) return;
		setIsCreating(false);
		setSaveError('');
	};

	const startEdit = () => {
		if (!estimate || isCreating || isSaving) return;
		const items = Array.isArray(estimate?.items) ? estimate.items : [];
		const mapped = items.map((it) => ({
			newCategoryName: String(it?.workCategory?.categoryName || it?.workCategory?.categoryCode || it?.newCategoryName || '').trim(),
			itemName: String(it?.itemName || '').trim(),
			quantity: it?.quantity ?? '',
			unitPrice: it?.unitPrice ?? '',
		}));
		const padCount = Math.max(0, PLACEHOLDER_ROW_COUNT - mapped.length);
		setEditRows([...mapped, ...Array.from({ length: padCount }).map(() => createEmptyDraftRow())]);
		setIsEditing(true);
		setSaveError('');
	};

	const cancelEdit = () => {
		if (isSaving) return;
		setIsEditing(false);
		setSaveError('');
	};

	function handleDraftChange(index, field, value) {
		setDraftRows((prev) =>
			prev.map((r, idx) => (idx === index ? { ...r, [field]: value } : r)),
		);
	}

	function handleEditChange(index, field, value) {
		setEditRows((prev) =>
			prev.map((r, idx) => (idx === index ? { ...r, [field]: value } : r)),
		);
	}

	const saveEstimate = async () => {
		if (isSaving) return;
		const token = localStorage.getItem('authToken');
		if (!token) {
			setSaveError('Vui lòng đăng nhập để tạo báo giá.');
			return;
		}

		const idNum = typeof serviceTicketId === 'number' ? serviceTicketId : Number(serviceTicketId);
		if (!Number.isFinite(idNum) || idNum <= 0) {
			setSaveError('Thiếu serviceTicketId hợp lệ.');
			return;
		}

		const items = draftRows
			.map((r) => {
				const newCategoryName = String(r.newCategoryName || '').trim();
				const itemName = String(r.itemName || '').trim();
				const quantity = toNumberOrZero(r.quantity);
				const unitPrice = toNumberOrZero(r.unitPrice);
				return {
					workCategoryId: null,
					newCategoryName,
					itemId: null,
					itemName,
					quantity,
					unitPrice,
				};
			})
			.filter((it) => it.newCategoryName && it.itemName && it.quantity > 0);

		if (items.length === 0) {
			setSaveError('Vui lòng nhập ít nhất 1 dòng (hạng mục, diễn giải, số lượng).');
			return;
		}

		try {
			setIsSaving(true);
			setSaveError('');
			const res = await createServiceTicketEstimate(
				{
					serviceTicketId: idNum,
					estimateType: 'INITIAL',
					items,
				},
				token,
			);
			setEstimate(res?.data ?? null);
			setIsCreating(false);
		} catch (err) {
			setSaveError(err?.message || 'Không thể lưu báo giá.');
		} finally {
			setIsSaving(false);
		}
	};

	const saveEdit = async () => {
		if (isSaving) return;
		const token = localStorage.getItem('authToken');
		if (!token) {
			setSaveError('Vui lòng đăng nhập để cập nhật báo giá.');
			return;
		}

		const estimateId = estimate?.estimateId ?? estimate?.id;
		const estimateIdNum = typeof estimateId === 'number' ? estimateId : Number(estimateId);
		if (!Number.isFinite(estimateIdNum) || estimateIdNum <= 0) {
			setSaveError('Thiếu estimateId hợp lệ.');
			return;
		}

		const serviceTicketIdRaw = estimate?.serviceTicketId ?? serviceTicketId;
		const serviceTicketIdNum = typeof serviceTicketIdRaw === 'number' ? serviceTicketIdRaw : Number(serviceTicketIdRaw);
		if (!Number.isFinite(serviceTicketIdNum) || serviceTicketIdNum <= 0) {
			setSaveError('Thiếu serviceTicketId hợp lệ.');
			return;
		}

		const items = editRows
			.map((r) => {
				const newCategoryName = String(r.newCategoryName || '').trim();
				const itemName = String(r.itemName || '').trim();
				const quantity = toNumberOrZero(r.quantity);
				const unitPrice = toNumberOrZero(r.unitPrice);
				return {
					workCategoryId: null,
					newCategoryName,
					itemId: null,
					itemName,
					quantity,
					unitPrice,
				};
			})
			.filter((it) => it.newCategoryName && it.itemName && it.quantity > 0);

		if (items.length === 0) {
			setSaveError('Vui lòng nhập ít nhất 1 dòng (hạng mục, diễn giải, số lượng).');
			return;
		}

		try {
			setIsSaving(true);
			setSaveError('');
			const res = await updateServiceTicketEstimate(
				estimateIdNum,
				{
					serviceTicketId: serviceTicketIdNum,
					estimateType: estimate?.estimateType || 'INITIAL',
					items,
				},
				token,
			);
			setEstimate(res?.data ?? null);
			setIsEditing(false);
		} catch (err) {
			setSaveError(err?.message || 'Không thể cập nhật báo giá.');
		} finally {
			setIsSaving(false);
		}
	};

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
							<span className={styles.kvValue}>-</span>
						</div>
						<div className={styles.kvRow}>
							<span className={styles.kvLabel}>Chi phí dự kiến</span>
							<span className={styles.kvValue} style={{ fontWeight: 900 }}>
								{estimateCostText}
							</span>
						</div>
						<div className={styles.kvRow}>
							<span className={styles.kvLabel} />
							<span className={styles.kvValue} style={{ color: 'var(--ui-muted)' }}>
								{statusLine}
							</span>
						</div>
					</div>

					{showAddEstimate ? (
						<div className="ui-actions" style={{ marginTop: 12 }}>
							<button type="button" className="ui-btn ui-btn--primary" onClick={startCreate}>
								Tạo báo giá mới
							</button>
						</div>
					) : null}

					{canEdit ? (
						<div className="ui-actions" style={{ marginTop: 12 }}>
							<button type="button" className="ui-btn ui-btn--ghost" onClick={startEdit}>
								Sửa báo giá
							</button>
						</div>
					) : null}

					{isCreating ? (
						<div className="ui-actions" style={{ marginTop: 12 }}>
							<button type="button" className="ui-btn ui-btn--ghost" onClick={cancelCreate} disabled={isSaving}>
								Hủy
							</button>
							<button type="button" className="ui-btn ui-btn--primary" onClick={saveEstimate} disabled={isSaving}>
								{isSaving ? 'Đang lưu...' : 'Lưu báo giá'}
							</button>
						</div>
					) : null}

					{isEditing ? (
						<div className="ui-actions" style={{ marginTop: 12 }}>
							<button type="button" className="ui-btn ui-btn--ghost" onClick={cancelEdit} disabled={isSaving}>
								Hủy
							</button>
							<button type="button" className="ui-btn ui-btn--primary" onClick={saveEdit} disabled={isSaving}>
								{isSaving ? 'Đang lưu...' : 'Lưu chỉnh sửa'}
							</button>
						</div>
					) : null}
				</div>
			</div>

			<div className={styles.tableWrap}>
				<datalist id="estimate-category-suggestions">
					{CATEGORY_SUGGESTIONS.map((it) => (
						<option key={it.label} value={it.label} />
					))}
				</datalist>

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
						{tableRows.map((row, idx) => {
							const stt = String(idx + 1).padStart(2, '0');
							return (
								<tr key={`advisor-row-${stt}-${row.key}`}>
									<td>{stt}</td>
									<td>
										{showInputs ? (
											<input
												className={styles.tableInput}
												value={row.newCategoryName}
												onChange={(e) => onChange(idx, 'newCategoryName', e.target.value)}
												placeholder="Hạng mục"
												list="estimate-category-suggestions"
												disabled={isSaving}
											/>
										) : (
											row.categoryName || ''
										)}
									</td>
									<td>
										{showInputs ? (
											<input
												className={styles.tableInput}
												value={row.itemName}
												onChange={(e) => onChange(idx, 'itemName', e.target.value)}
												placeholder="Diễn giải"
												disabled={isSaving}
											/>
										) : (
											row.itemName || ''
										)}
									</td>
									<td className={styles.tdNumber}>
										{showInputs ? (
											<input
												className={`${styles.tableInput} ${styles.tableInputNumber}`}
												type="text"
												value={row.quantity}
												onChange={(e) => onChange(idx, 'quantity', e.target.value)}
												placeholder="0"
												disabled={isSaving}
											/>
										) : (
											(row.quantity ?? '')
										)}
									</td>
									<td className={styles.tdNumber}>
										{showInputs ? (
											<input
												className={`${styles.tableInput} ${styles.tableInputNumber}`}
												type="text"
												value={row.unitPrice}
												onChange={(e) => onChange(idx, 'unitPrice', e.target.value)}
												placeholder="0"
												disabled={isSaving}
											/>
										) : (
											formatCurrencyVnd(row.unitPrice)
										)}
									</td>
									<td className={styles.tdNumber}>{formatCurrencyVnd(row.subTotal)}</td>
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
							<td className={styles.tdNumber}>{footerTotalText}</td>
							<td colSpan={2} />
						</tr>
					</tfoot>
				</table>
			</div>
		</section>
	);
}

AdvisorItemsTable.propTypes = {
	serviceTicketId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};
