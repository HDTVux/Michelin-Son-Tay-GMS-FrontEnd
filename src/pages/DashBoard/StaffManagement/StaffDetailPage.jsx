import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import baseStyles from '../BookingRequestManagement/BookingRequestManagement.module.css';
import styles from './StaffDetailPage.module.css';
import { getAvatarSrc, handleAvatarError } from '../../../assets/defaultAvatar.js';
import { fetchAllStaffRoles, fetchStaffDetail, updateStaff } from '../../../services/adminService.js';

function normalizeStaffStatus(value) {
	const raw = value == null ? '' : String(value).trim().toUpperCase();
	if (raw === 'ACTIVE') return 'ACTIVE';
	if (raw === 'INACTIVE') return 'INACTIVE';
	if (raw === 'LOCKED') return 'LOCKED';
	if (raw === 'DELETED') return 'DELETED';
	return raw;
}

function getStaffStatusPresentation(status) {
	const normalized = normalizeStaffStatus(status);
	if (normalized === 'ACTIVE') return { tone: 'success', label: 'Đang hoạt động' };
	if (normalized === 'INACTIVE') return { tone: 'danger', label: 'Ngưng hoạt động' };
	if (normalized === 'LOCKED') return { tone: 'info', label: 'Đã khóa' };
	if (normalized === 'DELETED') return { tone: 'info', label: 'Đã xóa' };
	if (normalized) return { tone: 'info', label: normalized };
	return { tone: 'info', label: '-' };
}

function toDateInputValue(isoString) {
	if (!isoString) return '';
	const d = new Date(isoString);
	if (Number.isNaN(d.getTime())) return '';
	const yyyy = String(d.getFullYear());
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd}`;
}

function toIsoFromDateInput(dateValue) {
	if (!dateValue) return null;
	// Keep date stable regardless of local timezone by using UTC midnight.
	return new Date(`${dateValue}T00:00:00.000Z`).toISOString();
}

function buildFormDataFromStaff(staff) {
	const roleIds = Array.isArray(staff?.roles)
		? staff.roles
				.map((r) => Number(r?.roleId))
				.filter((id) => Number.isFinite(id) && id > 0)
		: [];

	return {
		fullName: staff?.fullName || '',
		phone: staff?.phone || '',
		position: staff?.position || '',
		status: normalizeStaffStatus(staff?.status) || 'ACTIVE',
		dob: toDateInputValue(staff?.dob),
		roleIds
	};
}

function validateStaffForm(data) {
	const fullName = String(data?.fullName || '').trim();
	const phone = String(data?.phone || '').trim();
	if (!fullName) return 'Vui lòng nhập họ và tên';
	if (!phone) return 'Vui lòng nhập số điện thoại';
	return null;
}

function buildRolesPayload(roleIds, roleOptions) {
	const ids = Array.isArray(roleIds) ? roleIds : [];
	return ids
		.map((roleId) => {
			const idNum = Number(roleId);
			if (!Number.isFinite(idNum) || idNum <= 0) return null;
			const option = (roleOptions || []).find((r) => r.roleId === idNum);
			return {
				roleId: idNum,
				roleCode: option?.roleCode || undefined,
				roleName: option?.roleName || undefined
			};
		})
		.filter(Boolean);
}

function buildUpdatePayload(formData, roleOptions) {
	return {
		fullName: String(formData?.fullName || '').trim(),
		phone: String(formData?.phone || '').trim(),
		position: String(formData?.position || '').trim(),
		status: normalizeStaffStatus(formData?.status) || 'ACTIVE',
		dob: toIsoFromDateInput(formData?.dob),
		roles: buildRolesPayload(formData?.roleIds, roleOptions)
	};
}

function getAuthToken() {
	return (
		localStorage.getItem('authToken') ||
		localStorage.getItem('adminToken') ||
		localStorage.getItem('staffToken') ||
		''
	);
}

export default function StaffDetailPage() {
	const navigate = useNavigate();
	const { staffId } = useParams();

	const [data, setData] = useState(null);
	const [roleOptions, setRoleOptions] = useState([]);
	const [isEditing, setIsEditing] = useState(false);
	const [formData, setFormData] = useState({
		fullName: '',
		phone: '',
		position: '',
		status: 'ACTIVE',
		dob: '',
		roleIds: []
	});
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');
	const requestSeqRef = useRef(0);
	const rolesRequestSeqRef = useRef(0);

	useEffect(() => {
		const token = getAuthToken();
		if (!token) {
			setRoleOptions([]);
			return;
		}

		const loadRoles = async () => {
			const requestSeq = ++rolesRequestSeqRef.current;
			try {
				const response = await fetchAllStaffRoles(token);
				if (requestSeq !== rolesRequestSeqRef.current) return;
				const list = Array.isArray(response?.data) ? response.data : [];
				const mapped = list
					.map((r) => {
						const id = Number(r?.roleId);
						if (!Number.isFinite(id) || id <= 0) return null;
						const roleCode = r?.roleCode ? String(r.roleCode).trim().toUpperCase() : '';
						const roleName = r?.roleName ? String(r.roleName).trim() : '';
						return { roleId: id, roleCode, roleName, label: roleName || roleCode || `Role ${id}` };
					})
					.filter(Boolean)
					.sort((a, b) => (a.roleId || 0) - (b.roleId || 0));

				setRoleOptions(mapped);
			} catch {
				if (requestSeq !== rolesRequestSeqRef.current) return;
				setRoleOptions([]);
			}
		};

		loadRoles();
	}, []);

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

	useEffect(() => {
		if (!data) return;
		setFormData(buildFormDataFromStaff(data));
		setIsEditing(false);
	}, [data]);

	const statusMeta = getStaffStatusPresentation(data?.status);

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

	const selectedRoleLabels = useMemo(() => {
		const set = new Set((formData?.roleIds || []).map(Number));
		return (roleOptions || []).filter((r) => set.has(r.roleId)).map((r) => r.label);
	}, [formData?.roleIds, roleOptions]);

	const handleStartEdit = () => {
		setIsEditing(true);
	};

	const handleCancelEdit = () => {
		if (data) setFormData(buildFormDataFromStaff(data));
		setIsEditing(false);
	};

	const handleFieldChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleToggleRole = (roleId) => {
		const id = Number(roleId);
		if (!Number.isFinite(id) || id <= 0) return;
		setFormData((prev) => {
			const current = Array.isArray(prev?.roleIds) ? prev.roleIds.map(Number) : [];
			const next = current.includes(id) ? current.filter((v) => v !== id) : [...current, id];
			return { ...prev, roleIds: next };
		});
	};

	const handleSave = async () => {
		const token = getAuthToken();
		if (!token) {
			toast.error('Vui lòng đăng nhập để cập nhật nhân viên');
			return;
		}

		const id = staffId;
		if (!id) {
			toast.error('Không tìm thấy ID nhân viên');
			return;
		}
		const validationMessage = validateStaffForm(formData);
		if (validationMessage) {
			toast.error(validationMessage);
			return;
		}

		const payload = buildUpdatePayload(formData, roleOptions);

		try {
			setIsLoading(true);
			const response = await updateStaff(id, payload, token);
			const updated = response?.data || null;
			if (updated) setData(updated);
			toast.success('Cập nhật nhân viên thành công!');
			setIsEditing(false);
		} catch (err) {
			toast.error(err?.message || 'Cập nhật nhân viên thất bại');
		} finally {
			setIsLoading(false);
		}
	};

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
							<div className={styles.headerRight}>
								{isEditing ? (
									<div className={styles.headerActions}>
										<button
											type="button"
											className={baseStyles['ghost-button']}
											disabled={isLoading}
											onClick={handleCancelEdit}
										>
											Hủy
										</button>
										<button
											type="button"
											className={baseStyles['primary-button']}
											disabled={isLoading}
											onClick={handleSave}
										>
											{isLoading ? 'Đang lưu...' : 'Lưu'}
										</button>
									</div>
								) : (
									<button
										type="button"
										className={baseStyles['primary-button']}
										disabled={!data || isLoading}
										onClick={handleStartEdit}
									>
										Chỉnh sửa
									</button>
								)}
							</div>
						</div>

						{isLoading && <div className={styles.loading}>Đang tải dữ liệu...</div>}
						{!isLoading && error && <div className={baseStyles['error-banner']}>{error}</div>}

						{!isLoading && !error && data && (
							<div className={styles.content}>
								<div className={styles.profileRow}>
									<img
										className={styles.avatar}
										src={getAvatarSrc(data.avatar)}
										alt={data.fullName || 'Avatar'}
										onError={handleAvatarError}
									/>

									<div className={styles.profileMeta}>
										<div className={styles.name}>{data.fullName || '-'}</div>
										<div className={styles.subline}>Mã nhân viên: {data.staffId ?? '-'}</div>
										<div className={styles.statusRow}>
											<span
												className={`${baseStyles['status-badge']} ${baseStyles['status-badge--' + statusMeta.tone]}`}
											>
												{statusMeta.label}
											</span>
										</div>
									</div>
								</div>

								{(() => {
									const roleViewContent =
										roleLabels.length === 0 ? (
											<div className={styles.value}>-</div>
										) : (
											<div className={styles.roleList} aria-label="Danh sách vai trò">
												{roleLabels.map((label) => (
													<span key={label} className={styles.roleChip}>
														{label}
													</span>
												))}
											</div>
										);

									const selectedRolesContent =
										selectedRoleLabels.length === 0 ? (
											<div className={styles.value}>-</div>
										) : (
											<div className={styles.roleList} aria-label="Vai trò đã chọn">
												{selectedRoleLabels.map((label) => (
													<span key={label} className={styles.roleChip}>
														{label}
													</span>
												))}
											</div>
										);

									return (
										<div className={styles.grid}>
									<div className={styles.field}>
										<div className={styles.label}>Số điện thoại</div>
										{isEditing ? (
											<input
												className={styles.input}
												name="phone"
												value={formData.phone}
												onChange={handleFieldChange}
												placeholder="Số điện thoại"
											/>
										) : (
											<div className={styles.value}>{data.phone || '-'}</div>
										)}
									</div>
									<div className={styles.field}>
										<div className={styles.label}>Email</div>
										<div className={styles.value}>{data.email || '-'}</div>
									</div>
									<div className={styles.field}>
										<div className={styles.label}>Chức vụ</div>
										{isEditing ? (
											<input
												className={styles.input}
												name="position"
												value={formData.position}
												onChange={handleFieldChange}
												placeholder="Chức vụ"
											/>
										) : (
											<div className={styles.value}>{data.position || '-'}</div>
										)}
									</div>
									<div className={styles.field}>
										<div className={styles.label}>Vai trò</div>
										{isEditing ? (
											<>
												<div className={styles.checkboxList} aria-label="Chọn vai trò">
													{(roleOptions || []).map((r) => {
														const checked = (formData.roleIds || []).map(Number).includes(r.roleId);
														return (
															<label key={r.roleId} className={styles.checkboxItem}>
																<input
																	type="checkbox"
																	checked={checked}
																	onChange={() => handleToggleRole(r.roleId)}
																/>
																<span>{r.label}</span>
															</label>
														);
													})}
												</div>
												{selectedRolesContent}
											</>
										) : (
											roleViewContent
										)}
									</div>
									<div className={styles.field}>
										<div className={styles.label}>Họ và tên</div>
										{isEditing ? (
											<input
												className={styles.input}
												name="fullName"
												value={formData.fullName}
												onChange={handleFieldChange}
												placeholder="Họ và tên"
											/>
										) : (
											<div className={styles.value}>{data.fullName || '-'}</div>
										)}
									</div>
									<div className={styles.field}>
										<div className={styles.label}>Trạng thái</div>
										{isEditing ? (
											<select
												className={styles.select}
												name="status"
												value={formData.status}
												onChange={handleFieldChange}
											>
												<option value="ACTIVE">Đang hoạt động</option>
												<option value="INACTIVE">Ngưng hoạt động</option>
												<option value="LOCKED">Đã khóa</option>
												<option value="DELETED">Đã xóa</option>
											</select>
										) : (
											<div className={styles.value}>{statusMeta.label}</div>
										)}
									</div>
									<div className={styles.field}>
										<div className={styles.label}>Ngày sinh</div>
										{isEditing ? (
											<input
												type="date"
												className={styles.input}
												name="dob"
												value={formData.dob}
												onChange={handleFieldChange}
											/>
										) : (
											<div className={styles.value}>{data.dob ? new Date(data.dob).toLocaleDateString('vi-VN') : '-'}</div>
										)}
									</div>
									{/* Avatar URL removed per requirements */}
								</div>
									);
								})()}
							</div>
						)}
					</section>
				</div>
			</div>
		</div>
	);
}
