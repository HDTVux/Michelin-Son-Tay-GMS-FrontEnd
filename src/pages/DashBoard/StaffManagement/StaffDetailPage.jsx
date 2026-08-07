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

function formatDateVi(isoString) {
	if (!isoString) return '-';
	const d = new Date(isoString);
	if (Number.isNaN(d.getTime())) return String(isoString);
	return d.toLocaleDateString('vi-VN');
}

function toIsoFromDateInput(dateValue) {
	if (!dateValue) return null;
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
		roleIds,

		// Detailed Employee Attributes
		gender: staff?.gender || 'MALE',
		startDate: toDateInputValue(staff?.startDate),
		isResigned: !!staff?.isResigned,
		permanentAddress: staff?.permanentAddress || '',
		placeOfBirth: staff?.placeOfBirth || '',
		address: staff?.address || '',
		representative: staff?.representative || '',
		ethnicity: staff?.ethnicity || '',
		religion: staff?.religion || '',
		nationality: staff?.nationality || 'Việt Nam',
		identityCard: staff?.identityCard || '',
		idIssuePlace: staff?.idIssuePlace || '',
		idIssueDate: toDateInputValue(staff?.idIssueDate),
		pitCode: staff?.pitCode || '',
		pitIssuePlace: staff?.pitIssuePlace || '',
		pitIssueDate: toDateInputValue(staff?.pitIssueDate),
		socialInsuranceCode: staff?.socialInsuranceCode || '',
		siIssuePlace: staff?.siIssuePlace || '',
		siIssueDate: toDateInputValue(staff?.siIssueDate),
		siPaidPeriod: staff?.siPaidPeriod || '',
		uiPaidPeriod: staff?.uiPaidPeriod || '',
		educationLevel: staff?.educationLevel || '',
		profession: staff?.profession || '',
		department: staff?.department || ''
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
		roles: buildRolesPayload(formData?.roleIds, roleOptions),

		// Extended attributes
		gender: formData?.gender || null,
		startDate: toIsoFromDateInput(formData?.startDate),
		isResigned: !!formData?.isResigned,
		permanentAddress: String(formData?.permanentAddress || '').trim() || null,
		placeOfBirth: String(formData?.placeOfBirth || '').trim() || null,
		address: String(formData?.address || '').trim() || null,
		representative: String(formData?.representative || '').trim() || null,
		ethnicity: String(formData?.ethnicity || '').trim() || null,
		religion: String(formData?.religion || '').trim() || null,
		nationality: String(formData?.nationality || '').trim() || null,
		identityCard: String(formData?.identityCard || '').trim() || null,
		idIssuePlace: String(formData?.idIssuePlace || '').trim() || null,
		idIssueDate: toIsoFromDateInput(formData?.idIssueDate),
		pitCode: String(formData?.pitCode || '').trim() || null,
		pitIssuePlace: String(formData?.pitIssuePlace || '').trim() || null,
		pitIssueDate: toIsoFromDateInput(formData?.pitIssueDate),
		socialInsuranceCode: String(formData?.socialInsuranceCode || '').trim() || null,
		siIssuePlace: String(formData?.siIssuePlace || '').trim() || null,
		siIssueDate: toIsoFromDateInput(formData?.siIssueDate),
		siPaidPeriod: String(formData?.siPaidPeriod || '').trim() || null,
		uiPaidPeriod: String(formData?.uiPaidPeriod || '').trim() || null,
		educationLevel: String(formData?.educationLevel || '').trim() || null,
		profession: String(formData?.profession || '').trim() || null,
		department: String(formData?.department || '').trim() || null
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
		const { name, value, type, checked } = e.target;
		const fieldValue = type === 'checkbox' ? checked : value;
		setFormData((prev) => ({ ...prev, [name]: fieldValue }));
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
								<div className={styles.title}>Hồ sơ chi tiết nhân viên</div>
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
										<div className={styles.subline}>
											Mã nhân viên (employee_code): <strong>{data.employeeCode || data.employeeNo || data.staffId || '-'}</strong>
										</div>
										<div className={styles.statusRow}>
											<span
												className={`${baseStyles['status-badge']} ${baseStyles['status-badge--' + statusMeta.tone]}`}
											>
												{statusMeta.label}
											</span>
											{data.isResigned && (
												<span className={`${baseStyles['status-badge']} ${baseStyles['status-badge--danger']}`}>
													Đã nghỉ việc
												</span>
											)}
										</div>
									</div>
								</div>

								{/* Section 1: Thông tin cơ bản & Công việc */}
								<div style={{ marginTop: '20px' }}>
									<h4 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 700 }}>1. Thông tin cơ bản &amp; Chức danh</h4>
									<div className={styles.grid}>
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
											<div className={styles.label}>Giới tính</div>
											{isEditing ? (
												<select
													className={styles.select}
													name="gender"
													value={formData.gender}
													onChange={handleFieldChange}
												>
													<option value="MALE">Nam</option>
													<option value="FEMALE">Nữ</option>
													<option value="OTHER">Khác</option>
												</select>
											) : (
												<div className={styles.value}>{data.gender === 'MALE' ? 'Nam' : data.gender === 'FEMALE' ? 'Nữ' : data.gender || '-'}</div>
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
												<div className={styles.value}>{formatDateVi(data.dob)}</div>
											)}
										</div>

										<div className={styles.field}>
											<div className={styles.label}>Ngày vào làm</div>
											{isEditing ? (
												<input
													type="date"
													className={styles.input}
													name="startDate"
													value={formData.startDate}
													onChange={handleFieldChange}
												/>
											) : (
												<div className={styles.value}>{formatDateVi(data.startDate)}</div>
											)}
										</div>

										<div className={styles.field}>
											<div className={styles.label}>Nghỉ việc</div>
											{isEditing ? (
												<label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
													<input
														type="checkbox"
														name="isResigned"
														checked={formData.isResigned}
														onChange={handleFieldChange}
													/>
													<span>Đã nghỉ việc</span>
												</label>
											) : (
												<div className={styles.value}>{data.isResigned ? 'Có' : 'Không'}</div>
											)}
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
											<div className={styles.label}>Bộ phận</div>
											{isEditing ? (
												<input
													className={styles.input}
													name="department"
													value={formData.department}
													onChange={handleFieldChange}
													placeholder="Bộ phận"
												/>
											) : (
												<div className={styles.value}>{data.department || '-'}</div>
											)}
										</div>

										<div className={styles.field}>
											<div className={styles.label}>Trình độ</div>
											{isEditing ? (
												<input
													className={styles.input}
													name="educationLevel"
													value={formData.educationLevel}
													onChange={handleFieldChange}
													placeholder="Trình độ học vấn"
												/>
											) : (
												<div className={styles.value}>{data.educationLevel || '-'}</div>
											)}
										</div>

										<div className={styles.field}>
											<div className={styles.label}>Ngành nghề</div>
											{isEditing ? (
												<input
													className={styles.input}
													name="profession"
													value={formData.profession}
													onChange={handleFieldChange}
													placeholder="Ngành nghề chuyên môn"
												/>
											) : (
												<div className={styles.value}>{data.profession || '-'}</div>
											)}
										</div>

										<div className={styles.field}>
											<div className={styles.label}>Trạng thái hệ thống</div>
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
													{selectedRoleLabels.length === 0 ? (
														<div className={styles.value}>-</div>
													) : (
														<div className={styles.roleList} aria-label="Vai trò đã chọn">
															{selectedRoleLabels.map((label) => (
																<span key={label} className={styles.roleChip}>
																	{label}
																</span>
															))}
														</div>
													)}
												</>
											) : roleLabels.length === 0 ? (
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

								{/* Section 2: Địa chỉ & Nhân thân */}
								<div style={{ marginTop: '20px' }}>
									<h4 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 700 }}>2. Địa chỉ &amp; Nhân thân</h4>
									<div className={styles.grid}>
										<div className={styles.field}>
											<div className={styles.label}>HK thường trú</div>
											{isEditing ? (
												<input
													className={styles.input}
													name="permanentAddress"
													value={formData.permanentAddress}
													onChange={handleFieldChange}
													placeholder="Hộ khẩu thường trú"
												/>
											) : (
												<div className={styles.value}>{data.permanentAddress || '-'}</div>
											)}
										</div>

										<div className={styles.field}>
											<div className={styles.label}>Nơi sinh</div>
											{isEditing ? (
												<input
													className={styles.input}
													name="placeOfBirth"
													value={formData.placeOfBirth}
													onChange={handleFieldChange}
													placeholder="Nơi sinh"
												/>
											) : (
												<div className={styles.value}>{data.placeOfBirth || '-'}</div>
											)}
										</div>

										<div className={styles.field}>
											<div className={styles.label}>Địa chỉ hiện tại</div>
											{isEditing ? (
												<input
													className={styles.input}
													name="address"
													value={formData.address}
													onChange={handleFieldChange}
													placeholder="Địa chỉ hiện tại"
												/>
											) : (
												<div className={styles.value}>{data.address || '-'}</div>
											)}
										</div>

										<div className={styles.field}>
											<div className={styles.label}>Người đại diện</div>
											{isEditing ? (
												<input
													className={styles.input}
													name="representative"
													value={formData.representative}
													onChange={handleFieldChange}
													placeholder="Người đại diện"
												/>
											) : (
												<div className={styles.value}>{data.representative || '-'}</div>
											)}
										</div>

										<div className={styles.field}>
											<div className={styles.label}>Dân tộc</div>
											{isEditing ? (
												<input
													className={styles.input}
													name="ethnicity"
													value={formData.ethnicity}
													onChange={handleFieldChange}
													placeholder="Dân tộc"
												/>
											) : (
												<div className={styles.value}>{data.ethnicity || '-'}</div>
											)}
										</div>

										<div className={styles.field}>
											<div className={styles.label}>Tôn giáo</div>
											{isEditing ? (
												<input
													className={styles.input}
													name="religion"
													value={formData.religion}
													onChange={handleFieldChange}
													placeholder="Tôn giáo"
												/>
											) : (
												<div className={styles.value}>{data.religion || '-'}</div>
											)}
										</div>

										<div className={styles.field}>
											<div className={styles.label}>Quốc tịch</div>
											{isEditing ? (
												<input
													className={styles.input}
													name="nationality"
													value={formData.nationality}
													onChange={handleFieldChange}
													placeholder="Quốc tịch"
												/>
											) : (
												<div className={styles.value}>{data.nationality || '-'}</div>
											)}
										</div>
									</div>
								</div>

								{/* Section 3: Giấy tờ & Thuế */}
								<div style={{ marginTop: '20px' }}>
									<h4 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 700 }}>3. Giấy tờ CMND / CCCD &amp; Thuế TNCN</h4>
									<div className={styles.grid}>
										<div className={styles.field}>
											<div className={styles.label}>Số CMND / CCCD</div>
											{isEditing ? (
												<input
													className={styles.input}
													name="identityCard"
													value={formData.identityCard}
													onChange={handleFieldChange}
													placeholder="Số CMND / CCCD"
												/>
											) : (
												<div className={styles.value}>{data.identityCard || '-'}</div>
											)}
										</div>

										<div className={styles.field}>
											<div className={styles.label}>Nơi cấp CMND</div>
											{isEditing ? (
												<input
													className={styles.input}
													name="idIssuePlace"
													value={formData.idIssuePlace}
													onChange={handleFieldChange}
													placeholder="Nơi cấp CMND"
												/>
											) : (
												<div className={styles.value}>{data.idIssuePlace || '-'}</div>
											)}
										</div>

										<div className={styles.field}>
											<div className={styles.label}>Ngày cấp CMND</div>
											{isEditing ? (
												<input
													type="date"
													className={styles.input}
													name="idIssueDate"
													value={formData.idIssueDate}
													onChange={handleFieldChange}
												/>
											) : (
												<div className={styles.value}>{formatDateVi(data.idIssueDate)}</div>
											)}
										</div>

										<div className={styles.field}>
											<div className={styles.label}>Mã số thuế TNCN</div>
											{isEditing ? (
												<input
													className={styles.input}
													name="pitCode"
													value={formData.pitCode}
													onChange={handleFieldChange}
													placeholder="Mã TNCN"
												/>
											) : (
												<div className={styles.value}>{data.pitCode || '-'}</div>
											)}
										</div>

										<div className={styles.field}>
											<div className={styles.label}>Nơi cấp Mã TNCN</div>
											{isEditing ? (
												<input
													className={styles.input}
													name="pitIssuePlace"
													value={formData.pitIssuePlace}
													onChange={handleFieldChange}
													placeholder="Nơi cấp Mã TNCN"
												/>
											) : (
												<div className={styles.value}>{data.pitIssuePlace || '-'}</div>
											)}
										</div>

										<div className={styles.field}>
											<div className={styles.label}>Ngày cấp Mã TNCN</div>
											{isEditing ? (
												<input
													type="date"
													className={styles.input}
													name="pitIssueDate"
													value={formData.pitIssueDate}
													onChange={handleFieldChange}
												/>
											) : (
												<div className={styles.value}>{formatDateVi(data.pitIssueDate)}</div>
											)}
										</div>
									</div>
								</div>

								{/* Section 4: Bảo hiểm xã hội */}
								<div style={{ marginTop: '20px' }}>
									<h4 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 700 }}>4. Bảo hiểm xã hội (BHXH) &amp; Thất nghiệp (BHTN)</h4>
									<div className={styles.grid}>
										<div className={styles.field}>
											<div className={styles.label}>Số sổ BHXH</div>
											{isEditing ? (
												<input
													className={styles.input}
													name="socialInsuranceCode"
													value={formData.socialInsuranceCode}
													onChange={handleFieldChange}
													placeholder="Số sổ BHXH"
												/>
											) : (
												<div className={styles.value}>{data.socialInsuranceCode || '-'}</div>
											)}
										</div>

										<div className={styles.field}>
											<div className={styles.label}>Nơi cấp BHXH</div>
											{isEditing ? (
												<input
													className={styles.input}
													name="siIssuePlace"
													value={formData.siIssuePlace}
													onChange={handleFieldChange}
													placeholder="Nơi cấp BHXH"
												/>
											) : (
												<div className={styles.value}>{data.siIssuePlace || '-'}</div>
											)}
										</div>

										<div className={styles.field}>
											<div className={styles.label}>Ngày cấp BHXH</div>
											{isEditing ? (
												<input
													type="date"
													className={styles.input}
													name="siIssueDate"
													value={formData.siIssueDate}
													onChange={handleFieldChange}
												/>
											) : (
												<div className={styles.value}>{formatDateVi(data.siIssueDate)}</div>
											)}
										</div>

										<div className={styles.field}>
											<div className={styles.label}>TG đã đóng BHXH</div>
											{isEditing ? (
												<input
													className={styles.input}
													name="siPaidPeriod"
													value={formData.siPaidPeriod}
													onChange={handleFieldChange}
													placeholder="TG đã đóng BHXH"
												/>
											) : (
												<div className={styles.value}>{data.siPaidPeriod || '-'}</div>
											)}
										</div>

										<div className={styles.field}>
											<div className={styles.label}>TG đã đóng BHTN</div>
											{isEditing ? (
												<input
													className={styles.input}
													name="uiPaidPeriod"
													value={formData.uiPaidPeriod}
													onChange={handleFieldChange}
													placeholder="TG đã đóng BHTN"
												/>
											) : (
												<div className={styles.value}>{data.uiPaidPeriod || '-'}</div>
											)}
										</div>
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
