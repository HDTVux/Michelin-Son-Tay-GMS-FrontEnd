import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ServiceManagement.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';

const COLORS = [
	"Đen", "Trắng", "Xám", "Bạc", "Đỏ", "Xanh dương", "Xanh lá", "Vàng", "Cam", "Nâu", "Be",
	"Hồng", "Tím", "Kim loại", "Crom", "Đồng", "Vàng kim", "Xanh lục bảo", "Xanh da trời", "Trong suốt"
];

export default function ColorSelection() {
	useScrollToTop();
	const navigate = useNavigate();
	const [searchQuery, setSearchQuery] = useState('');

	const filteredColors = useMemo(() => {
		const q = String(searchQuery || '').trim().toLowerCase();
		return COLORS.filter((c) => {
			if (!q) return true;
			return c.toLowerCase().includes(q);
		});
	}, [searchQuery]);

	const handleSelectColor = useCallback((colorVal) => {
		const draftRaw = sessionStorage.getItem('gms_create_product_draft');
		let draft = {};
		try {
			if (draftRaw) draft = JSON.parse(draftRaw);
		} catch {
			draft = {};
		}
		
		if (!COLORS.includes(colorVal)) {
			draft.color = '__OTHER__';
			draft.customColor = colorVal;
		} else {
			draft.color = colorVal;
			draft.customColor = '';
		}
		
		sessionStorage.setItem('gms_create_product_draft', JSON.stringify(draft));
		navigate('/part-management/create-product', { state: { fromColorSelection: true } });
	}, [navigate]);

	return (
		<div className={styles['service-page']}>
			<div className={styles['service-header']}>
				<div className={styles['service-header-title']}>
					<span className={styles['header-icon']}>
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19" />
							<path d="M6 14C6 14 7.5 12 12 12C16.5 12 18 14 18 14" />
							<circle cx="7.5" cy="9.5" r="1.5" />
							<circle cx="16.5" cy="9.5" r="1.5" />
						</svg>
					</span>
					<h1>Chọn màu sắc</h1>
				</div>
				<div>
					<button
						className={styles['ghost-button']}
						onClick={() => navigate('/part-management/create-product', { state: { fromColorSelection: true } })}
					>
						Quay lại
					</button>
				</div>
			</div>

			<div className={styles['pending-filters']}>
				<div style={{ display: 'flex', gap: 10, width: '100%', alignItems: 'center' }}>
					<div className={styles['search-box']} style={{ flex: 1, marginBottom: 0 }}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
							<circle cx="11" cy="11" r="8" />
							<line x1="21" y1="21" x2="16.65" y2="16.65" />
						</svg>
						<input
							placeholder="Tìm kiếm màu sắc hoặc tự nhập tay..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
					{searchQuery.trim() && (
						<button
							className={styles['primary-button']}
							onClick={() => handleSelectColor(searchQuery.trim())}
							style={{ whiteSpace: 'nowrap', height: '42px' }}
						>
							Sử dụng chữ tự viết: "{searchQuery.trim()}"
						</button>
					)}
				</div>
			</div>

			<div className={styles['service-card']}>
				<div className={styles['table-wrapper']}>
					<table className={styles['service-table']}>
						<thead>
							<tr>
								<th style={{ textAlign: 'left' }}>TÊN MÀU SẮC</th>
								<th style={{ width: 140 }}>THAO TÁC</th>
							</tr>
						</thead>
						<tbody>
							{filteredColors.length === 0 ? (
								<tr>
									<td style={{ textAlign: 'left', fontWeight: 500 }}>
										Không tìm thấy màu sắc "{searchQuery}". Bạn có thể chọn nút bên phải để tự nhập tay giá trị này.
									</td>
									<td>
										<button
											type="button"
											className={styles['primary-button']}
											style={{ padding: '6px 16px', fontSize: 13, boxShadow: 'none' }}
											onClick={() => handleSelectColor(searchQuery.trim())}
											disabled={!searchQuery.trim()}
										>
											Tự nhập
										</button>
									</td>
								</tr>
							) : (
								filteredColors.map((color) => (
									<tr key={color}>
										<td style={{ textAlign: 'left', fontWeight: 500 }}>{color}</td>
										<td>
											<button
												type="button"
												className={styles['primary-button']}
												style={{ padding: '6px 16px', fontSize: 13, boxShadow: 'none' }}
												onClick={() => handleSelectColor(color)}
											>
												Chọn
											</button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
