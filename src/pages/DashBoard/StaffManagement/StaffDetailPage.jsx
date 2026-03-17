import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import baseStyles from '../BookingRequestManagement/BookingRequestManagement.module.css';
import styles from './StaffDetailPage.module.css';
import { fetchStaffDetail } from '../../../services/adminService.js';

function normalizeStaffStatus(value) {
	const raw = value == null ? '' : String(value).trim().toUpperCase();
	if (raw === 'ACTIVE') return 'ACTIVE';
	if (raw === 'INACTIVE') return 'INACTIVE';
	return raw;
}

function getAuthToken() {
	return (
		localStorage.getItem('authToken') ||
		localStorage.getItem('adminToken') ||
		localStorage.getItem('staffToken') ||
		''
	);
}

function getInitials(name) {
	const text = name ? String(name).trim() : '';
	if (!text) return 'NV';
	const parts = text.split(/\s+/).filter(Boolean);
	const first = parts[0]?.[0] || '';
	const last = parts.length > 1 ? parts.at(-1)?.[0] : parts[0]?.[1] || '';
	return (first + last).toUpperCase() || 'NV';
}

export default function StaffDetailPage() {
	const navigate = useNavigate();
	const { staffId } = useParams();

	const [data, setData] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');
	const requestSeqRef = useRef(0);

	useEffect(() => {
		const token = getAuthToken();
		if (!token) {
			setError('Vui lòng đăng nhập để xem chi tiết nhân viên.');
			setData(null);
			return;
		}

		if (!staffId) {
			setError('Không tìm thấy ID nhân viên.');
			setData(null);
			return;
		}

		const load = async () => {
			const requestSeq = ++requestSeqRef.current;
			try {
				setIsLoading(true);
				setError('');
				setData(null);
				const response = await fetchStaffDetail(staffId, token);
				if (requestSeq !== requestSeqRef.current) return;
				setData(response?.data || null);
			} catch (err) {
				if (requestSeq !== requestSeqRef.current) return;
				setError(err?.message || 'Không thể tải chi tiết nhân viên.');
				setData(null);
			} finally {
				if (requestSeq === requestSeqRef.current) setIsLoading(false);
			}
		};

		load();
	}, [staffId]);

	const status = normalizeStaffStatus(data?.status);
	const isActive = typeof data?.isActive === 'boolean' ? data.isActive : status === 'ACTIVE';
	const statusTone = isActive ? 'success' : 'danger';

	const roles = useMemo(() => {
		if (Array.isArray(data?.roles)) return data.roles;
		if (Array.isArray(data?.role)) return data.role;
		if (Array.isArray(data?.roleList)) return data.roleList;
		return [];
	}, [data]);

	const roleLabels = useMemo(() => {
		return (Array.isArray(roles) ? roles : [])
			.map((r) => {
				const name = r?.roleName ? String(r.roleName).trim() : '';
				const code = r?.roleCode ? String(r.roleCode).trim().toUpperCase() : '';
				return name || code || '';
			})
			.filter(Boolean);
	}, [roles]);

	return (
		<div className={baseStyles['booking-page']}>
			<div className={baseStyles['booking-layout']}>
				<div className={baseStyles['booking-left']}>
					<section className={baseStyles['booking-card']}>
						<div className={styles.header}>
							<div className={styles.headerLeft}>
								<button
									type="button"
									className={baseStyles['ghost-button']}
									onClick={() => navigate(-1)}
								>
									Quay lại
								</button>
								<div className={styles.title}>Chi tiết nhân viên</div>
							</div>
						</div>

						{isLoading && <div className={styles.loading}>Đang tải dữ liệu...</div>}
						{!isLoading && error && <div className={baseStyles['error-banner']}>{error}</div>}

						{!isLoading && !error && data && (
							<div className={styles.content}>
								<div className={styles.profileRow}>
									{data.avatar ? (
										<img className={styles.avatar} src={data.avatar} alt={data.fullName || 'Avatar'} />
									) : (
										<div className={styles.avatarFallback} aria-hidden="true">
											{getInitials(data.fullName)}
										</div>
									)}

									<div className={styles.profileMeta}>
										<div className={styles.name}>{data.fullName || '-'}</div>
										<div className={styles.subline}>Mã nhân viên: {data.staffId ?? '-'}</div>
										<div className={styles.statusRow}>
											<span
												className={`${baseStyles['status-badge']} ${baseStyles['status-badge--' + statusTone]}`}
											>
												{isActive ? 'Active' : 'Inactive'}
											</span>
										</div>
									</div>
								</div>

								<div className={styles.grid}>
									<div className={styles.field}>
										<div className={styles.label}>Số điện thoại</div>
										<div className={styles.value}>{data.phone || '-'}</div>
									</div>
									<div className={styles.field}>
										<div className={styles.label}>Email</div>
										<div className={styles.value}>{data.email || '-'}</div>
									</div>
									<div className={styles.field}>
										<div className={styles.label}>Chức vụ</div>
										<div className={styles.value}>{data.position || '-'}</div>
									</div>
									<div className={styles.field}>
										<div className={styles.label}>Vai trò</div>
										{roleLabels.length === 0 ? (
											<div className={styles.value}>-</div>
										) : (
											<div className={styles.roleList} aria-label="Danh sách vai trò">
												{roleLabels.map((label) => (
													<span key={label} className={styles.roleChip}>
														{label}
													</span>
												))}
											</div>
										)}
									</div>
								</div>
							</div>
						)}
					</section>
				</div>
			</div>
		</div>
	);
}
