import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ServiceManagement.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';

const COUNTRIES = [
	"Việt Nam", "Nhật Bản", "Hàn Quốc", "Trung Quốc", "Thái Lan", "Indonesia", "Malaysia", "Singapore", 
	"Đức", "Pháp", "Ý", "Anh", "Mỹ", "Đài Loan", "Ấn Độ", "Thụy Sĩ", "Thụy Điển", "Nga", "Úc", "Canada", 
	"Tây Ban Nha", "Hà Lan", "Bỉ", "Đan Mạch", "Na Uy", "Phần Lan", "Ba Lan", "Thổ Nhĩ Kỳ", "Brazil", 
	"Argentina", "Mexico", "Nam Phi", "Ai Cập", "Ả Rập Xê Út", "UAE", "Philippines", "New Zealand", 
	"Áo", "Bồ Đào Nha", "Hy Lạp", "Séc", "Hungary", "Ukraina", "Romania", "Slovakia", "Croatia", 
	"Slovenia", "Ireland", "Campuchia", "Lào", "Myanmar", "Brunei", "Đông Timor", "Hồng Kông", 
	"Ma Cao", "Bắc Triều Tiên", "Mông Cổ", "Pakistan", "Bangladesh", "Sri Lanka", "Kazakhstan", 
	"Uzbekistan", "Iraq", "Iran", "Israel", "Jordan", "Kuwait", "Qatar", "Oman", "Yemen", "Algeria", 
	"Morocco", "Tunisia", "Libya", "Nigeria", "Kenya", "Ethiopia", "Ghana", "Tanzania", "Uganda", 
	"Colombia", "Peru", "Chile", "Venezuela", "Ecuador", "Bolivia", "Paraguay", "Uruguay", "Cuba"
];

export default function OriginSelection() {
	useScrollToTop();
	const navigate = useNavigate();
	const [searchQuery, setSearchQuery] = useState('');

	const filteredCountries = useMemo(() => {
		const q = String(searchQuery || '').trim().toLowerCase();
		return COUNTRIES.filter((c) => {
			if (!q) return true;
			return c.toLowerCase().includes(q);
		});
	}, [searchQuery]);

	const handleSelectOrigin = useCallback((originVal) => {
		const draftRaw = sessionStorage.getItem('gms_create_product_draft');
		let draft = {};
		try {
			if (draftRaw) draft = JSON.parse(draftRaw);
		} catch {
			draft = {};
		}
		
		if (!COUNTRIES.includes(originVal)) {
			draft.origin = '__OTHER__';
			draft.customOrigin = originVal;
		} else {
			draft.origin = originVal;
			draft.customOrigin = '';
		}
		
		sessionStorage.setItem('gms_create_product_draft', JSON.stringify(draft));
		navigate('/part-management/create-product', { state: { fromOriginSelection: true } });
	}, [navigate]);

	return (
		<div className={styles['service-page']}>
			<div className={styles['service-header']}>
				<div className={styles['service-header-title']}>
					<span className={styles['header-icon']}>
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<circle cx="12" cy="12" r="10" />
							<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
							<path d="M2 12h20" />
						</svg>
					</span>
					<h1>Chọn xuất xứ</h1>
				</div>
				<div>
					<button
						className={styles['ghost-button']}
						onClick={() => navigate('/part-management/create-product', { state: { fromOriginSelection: true } })}
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
							placeholder="Tìm kiếm xuất xứ hoặc tự nhập tay..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
					{searchQuery.trim() && (
						<button
							className={styles['primary-button']}
							onClick={() => handleSelectOrigin(searchQuery.trim())}
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
								<th style={{ textAlign: 'left' }}>QUỐC GIA / VÙNG LÃNH THỔ</th>
								<th style={{ width: 140 }}>THAO TÁC</th>
							</tr>
						</thead>
						<tbody>
							{filteredCountries.length === 0 ? (
								<tr>
									<td style={{ textAlign: 'left', fontWeight: 500 }}>
										Không tìm thấy quốc gia "{searchQuery}". Bạn có thể chọn nút bên phải để tự nhập tay giá trị này.
									</td>
									<td>
										<button
											type="button"
											className={styles['primary-button']}
											style={{ padding: '6px 16px', fontSize: 13, boxShadow: 'none' }}
											onClick={() => handleSelectOrigin(searchQuery.trim())}
											disabled={!searchQuery.trim()}
										>
											Tự nhập
										</button>
									</td>
								</tr>
							) : (
								filteredCountries.map((country) => (
									<tr key={country}>
										<td style={{ textAlign: 'left', fontWeight: 500 }}>{country}</td>
										<td>
											<button
												type="button"
												className={styles['primary-button']}
												style={{ padding: '6px 16px', fontSize: 13, boxShadow: 'none' }}
												onClick={() => handleSelectOrigin(country)}
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
