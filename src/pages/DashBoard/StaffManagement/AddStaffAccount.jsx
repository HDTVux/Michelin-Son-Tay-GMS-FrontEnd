import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import styles from './AddStaffAccount.module.css';

const DEFAULT_ROLE_OPTIONS = [{ label: 'Admin', roleId: 1, roleCode: 'ADMIN' }];

function normalizeRoleIds(value) {
	return Array.isArray(value) ? value.map(Number).filter((v) => Number.isFinite(v) && v > 0) : [];
}

function updateRoleIds(roleIdsValue, roleId, checked) {
	const current = normalizeRoleIds(roleIdsValue);
	if (checked) return current.includes(roleId) ? current : [...current, roleId];
	return current.filter((id) => id !== roleId);
}

function normalizeRoleOptions(roleOptions) {
	const raw = Array.isArray(roleOptions) ? roleOptions : [];
	const source = raw[0] ? raw : DEFAULT_ROLE_OPTIONS;

	return source
		.map((r) => {
			const roleId = Number(r?.roleId);
			const roleCode = r?.roleCode ? String(r.roleCode).trim().toUpperCase() : r?.value;
			const code = roleCode ? String(roleCode).trim().toUpperCase() : '';
			const label = r?.label || code || (Number.isFinite(roleId) ? `Role ${roleId}` : 'Role');
			return {
				roleId: Number.isFinite(roleId) ? roleId : undefined,
				roleCode: code,
				label
			};
		})
		.filter((r) => Number.isFinite(r.roleId) && r.roleId > 0);
}

function AddStaffAccountInner({ onClose, onSubmit, roleOptions }) {
	const roles = useMemo(() => normalizeRoleOptions(roleOptions), [roleOptions]);
	const defaultRoleIds = useMemo(() => {
		const firstId = roles?.[0]?.roleId;
		return Number.isFinite(firstId) ? [firstId] : [1];
	}, [roles]);

	const [form, setForm] = useState({
		// Basic Auth
		username: '',
		password: '',
		email: '',
		phoneNumber: '',
		roleIds: defaultRoleIds,
		isActive: true,

		// Detailed Employee Attributes
		employeeCode: '',
		startDate: '',
		isResigned: false,
		fullName: '',
		permanentAddress: '',
		placeOfBirth: '',
		address: '',
		representative: '',
		gender: 'MALE',
		dob: '',
		ethnicity: '',
		religion: '',
		nationality: 'Việt Nam',
		identityCard: '',
		idIssuePlace: '',
		idIssueDate: '',
		pitCode: '',
		pitIssuePlace: '',
		pitIssueDate: '',
		socialInsuranceCode: '',
		siIssuePlace: '',
		siIssueDate: '',
		siPaidPeriod: '',
		uiPaidPeriod: '',
		position: '',
		educationLevel: '',
		profession: '',
		department: ''
	});
	const [roleError, setRoleError] = useState('');

	const updateField = (name) => (e) => {
		const value = e?.target?.type === 'checkbox' ? e.target.checked : e.target.value;
		setForm((prev) => ({ ...prev, [name]: value }));
	};

	const toggleRoleId = (roleId) => (e) => {
		const checked = !!e?.target?.checked;
		setForm((prev) => ({
			...prev,
			roleIds: updateRoleIds(prev.roleIds, roleId, checked)
		}));
		setRoleError('');
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		const roleIds = Array.isArray(form.roleIds)
			? form.roleIds.map(Number).filter((v) => Number.isFinite(v) && v > 0)
			: [];

		if (roleIds.length === 0) {
			setRoleError('Vui lòng chọn ít nhất 1 vai trò (role).');
			return;
		}

		const roleCodes = roleIds
			.map((id) => roles.find((r) => r.roleId === id)?.roleCode)
			.filter(Boolean);

		const selectedRoles = roleIds
			.map((id) => {
				const role = roles.find((r) => r.roleId === id);
				if (!role) return null;
				return {
					roleId: id,
					roleCode: role.roleCode,
					roleName: role.label
				};
			})
			.filter(Boolean);

		if (onSubmit) onSubmit({ ...form, roleIds, roleCodes, roles: selectedRoles });
	};

	return (
		<dialog
			className={styles.modal}
			open
			aria-modal="true"
			aria-labelledby="add-staff-account-title"
			onCancel={(e) => {
				e.preventDefault();
				if (onClose) onClose();
			}}
		>
			<button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Đóng">
				&times;
			</button>

			<h2 id="add-staff-account-title" className={styles.title}>
				Tạo tài khoản & Hồ sơ nhân viên
			</h2>

			<form className={styles.form} onSubmit={handleSubmit}>
				{/* 1. Thông tin tài khoản */}
				<section className={styles.section} aria-label="Thông tin tài khoản">
					<h3 className={styles.sectionTitle}>1. Thông tin tài khoản &amp; Đăng nhập</h3>
					<div className={styles.grid2}>
						<div className={styles.field}>
							<label className={styles.label} htmlFor="staff-username">
								Username<span className={styles.required}>*</span>:
							</label>
							<input
								id="staff-username"
								className={styles.input}
								type="text"
								value={form.username}
								onChange={updateField('username')}
								required
								autoComplete="username"
								placeholder="Tên đăng nhập"
							/>
						</div>

						<div className={styles.field}>
							<label className={styles.label} htmlFor="staff-password">
								Password<span className={styles.required}>*</span>:
							</label>
							<input
								id="staff-password"
								className={styles.input}
								type="password"
								value={form.password}
								onChange={updateField('password')}
								required
								autoComplete="new-password"
								placeholder="Mật khẩu"
							/>
						</div>

						<div className={styles.field}>
							<label className={styles.label} htmlFor="staff-email">
								Email<span className={styles.required}>*</span>:
							</label>
							<input
								id="staff-email"
								className={styles.input}
								type="email"
								value={form.email}
								onChange={updateField('email')}
								required
								autoComplete="email"
								placeholder="email@domain.com"
							/>
						</div>

						<div className={styles.field}>
							<label className={styles.label} htmlFor="staff-phone">
								Số điện thoại<span className={styles.required}>*</span>:
							</label>
							<input
								id="staff-phone"
								className={styles.input}
								type="tel"
								value={form.phoneNumber}
								onChange={updateField('phoneNumber')}
								required
								autoComplete="tel"
								placeholder="09xx..."
							/>
						</div>
					</div>
				</section>

				{/* Phân quyền & Trạng thái */}
				<section className={styles.section} aria-label="Vai trò & Trạng thái">
					<h3 className={styles.sectionTitle}>2. Vai trò &amp; Trạng thái tài khoản</h3>

					<div className={styles.fieldStack}>
						<div className={styles.label}>Roles<span className={styles.required}>*</span>:</div>
						<fieldset className={styles.roleList} aria-label="Chọn roles">
							<legend className={styles.srOnly}>Chọn roles</legend>
							{roles.map((r) => {
								const checked = Array.isArray(form.roleIds) && form.roleIds.includes(r.roleId);
								const inputId = `staff-role-${r.roleId}`;
								return (
									<label key={r.roleId} className={styles.roleItem} htmlFor={inputId}>
										<input
											id={inputId}
											className={styles.roleCheckbox}
											type="checkbox"
											checked={checked}
											onChange={toggleRoleId(r.roleId)}
										/>
										<span className={styles.roleText}>{r.label}</span>
									</label>
								);
							})}
						</fieldset>
						{roleError && <div className={styles.inlineError}>{roleError}</div>}
					</div>

					<div className={styles.statusRow} style={{ marginTop: '14px' }}>
						<div className={styles.statusLabel}>Trạng thái hoạt động:</div>
						<label className={styles.toggle}>
							<span className={styles.srOnly}>Kích hoạt tài khoản</span>
							<input
								className={styles.toggleInput}
								type="checkbox"
								checked={form.isActive}
								onChange={updateField('isActive')}
								aria-label="Kích hoạt tài khoản"
							/>
							<span className={styles.toggleTrack} aria-hidden="true">
								<span className={styles.toggleThumb} />
							</span>
						</label>
						<div className={styles.statusText}>{form.isActive ? 'Đang hoạt động (Active)' : 'Ngưng hoạt động'}</div>
					</div>
				</section>

				{/* 3. Thông tin nhân viên */}
				<section className={styles.section} aria-label="Thông tin nhân viên">
					<h3 className={styles.sectionTitle}>3. Thông tin nhân viên</h3>
					<div className={styles.grid2}>
						<div className={styles.field}>
							<label className={styles.label} htmlFor="staff-emp-code">
								Mã nhân viên:
							</label>
							<input
								id="staff-emp-code"
								className={styles.input}
								type="text"
								value={form.employeeCode}
								onChange={updateField('employeeCode')}
								placeholder="Tự động nếu để trống"
							/>
						</div>

						<div className={styles.field}>
							<label className={styles.label} htmlFor="staff-fullname">
								Họ và tên:
							</label>
							<input
								id="staff-fullname"
								className={styles.input}
								type="text"
								value={form.fullName}
								onChange={updateField('fullName')}
								placeholder="Tên đầy đủ của nhân viên"
							/>
						</div>

						<div className={styles.field}>
							<label className={styles.label} htmlFor="staff-start-date">
								Ngày vào làm:
							</label>
							<input
								id="staff-start-date"
								className={styles.input}
								type="date"
								value={form.startDate}
								onChange={updateField('startDate')}
							/>
						</div>

						<div className={styles.fieldCheckbox}>
							<label className={styles.checkboxLabel} htmlFor="staff-is-resigned">
								<input
									id="staff-is-resigned"
									className={styles.checkboxInput}
									type="checkbox"
									checked={form.isResigned}
									onChange={updateField('isResigned')}
								/>
								<span>Nghỉ việc (is_resigned)</span>
							</label>
						</div>

						<div className={styles.field}>
							<label className={styles.label} htmlFor="staff-dob">
								Ngày sinh:
							</label>
							<input
								id="staff-dob"
								className={styles.input}
								type="date"
								value={form.dob}
								onChange={updateField('dob')}
							/>
						</div>

						<div className={styles.field}>
							<label className={styles.label} htmlFor="staff-gender">
								Giới tính:
							</label>
							<select
								id="staff-gender"
								className={styles.select}
								value={form.gender}
								onChange={updateField('gender')}
							>
								<option value="MALE">Nam</option>
								<option value="FEMALE">Nữ</option>
								<option value="OTHER">Khác</option>
							</select>
						</div>

						<div className={styles.field}>
							<label className={styles.label} htmlFor="staff-position">
								Chức vụ:
							</label>
							<input
								id="staff-position"
								className={styles.input}
								type="text"
								value={form.position}
								onChange={updateField('position')}
								placeholder="Cố vấn, Kỹ thuật viên, Lễ tân..."
							/>
						</div>

						<div className={styles.field}>
							<label className={styles.label} htmlFor="staff-department">
								Bộ phận:
							</label>
							<input
								id="staff-department"
								className={styles.input}
								type="text"
								value={form.department}
								onChange={updateField('department')}
								placeholder="Kỹ thuật, Kinh doanh, Kế toán..."
							/>
						</div>

						<div className={styles.field}>
							<label className={styles.label} htmlFor="staff-education">
								Trình độ:
							</label>
							<input
								id="staff-education"
								className={styles.input}
								type="text"
								value={form.educationLevel}
								onChange={updateField('educationLevel')}
								placeholder="Đại học, Cao đẳng, Trung cấp..."
							/>
						</div>

						<div className={styles.field}>
							<label className={styles.label} htmlFor="staff-profession">
								Ngành nghề:
							</label>
							<input
								id="staff-profession"
								className={styles.input}
								type="text"
								value={form.profession}
								onChange={updateField('profession')}
								placeholder="Công nghệ ô tô, Sửa chữa..."
							/>
						</div>

						<div className={styles.field}>
							<label className={styles.label} htmlFor="staff-permanent-address">
								HK thường trú:
							</label>
							<input
								id="staff-permanent-address"
								className={styles.input}
								type="text"
								value={form.permanentAddress}
								onChange={updateField('permanentAddress')}
								placeholder="Hộ khẩu thường trú"
							/>
						</div>

						<div className={styles.field}>
							<label className={styles.label} htmlFor="staff-place-of-birth">
								Nơi sinh:
							</label>
							<input
								id="staff-place-of-birth"
								className={styles.input}
								type="text"
								value={form.placeOfBirth}
								onChange={updateField('placeOfBirth')}
								placeholder="Tỉnh/Thành phố nơi sinh"
							/>
						</div>

						<div className={styles.field}>
							<label className={styles.label} htmlFor="staff-address">
								Địa chỉ hiện tại:
							</label>
							<input
								id="staff-address"
								className={styles.input}
								type="text"
								value={form.address}
								onChange={updateField('address')}
								placeholder="Địa chỉ ở hiện tại"
							/>
						</div>

						<div className={styles.field}>
							<label className={styles.label} htmlFor="staff-representative">
								Đại diện:
							</label>
							<input
								id="staff-representative"
								className={styles.input}
								type="text"
								value={form.representative}
								onChange={updateField('representative')}
								placeholder="Người đại diện / Người liên hệ khẩn cấp"
							/>
						</div>

						<div className={styles.field}>
							<label className={styles.label} htmlFor="staff-ethnicity">
								Dân tộc:
							</label>
							<input
								id="staff-ethnicity"
								className={styles.input}
								type="text"
								value={form.ethnicity}
								onChange={updateField('ethnicity')}
								placeholder="Kinh, Tày, Nùng..."
							/>
						</div>

						<div className={styles.field}>
							<label className={styles.label} htmlFor="staff-religion">
								Tôn giáo:
							</label>
							<input
								id="staff-religion"
								className={styles.input}
								type="text"
								value={form.religion}
								onChange={updateField('religion')}
								placeholder="Không, Phật giáo, Công giáo..."
							/>
						</div>

						<div className={styles.field}>
							<label className={styles.label} htmlFor="staff-nationality">
								Quốc tịch:
							</label>
							<input
								id="staff-nationality"
								className={styles.input}
								type="text"
								value={form.nationality}
								onChange={updateField('nationality')}
								placeholder="Việt Nam"
							/>
						</div>
					</div>
				</section>

				{/* 4. Giấy tờ & Thuế cá nhân */}
				<section className={styles.section} aria-label="Giấy tờ & Thuế">
					<h3 className={styles.sectionTitle}>4. CMND / CCCD &amp; Thuế TNCN</h3>
					<div className={styles.grid2}>
						<div className={styles.field}>
							<label className={styles.label} htmlFor="staff-identity-card">
								Số CMND/CCCD:
							</label>
							<input
								id="staff-identity-card"
								className={styles.input}
								type="text"
								value={form.identityCard}
								onChange={updateField('identityCard')}
								placeholder="Số CCCD / CMND"
							/>
						</div>

						<div className={styles.field}>
							<label className={styles.label} htmlFor="staff-id-issue-place">
								Nơi cấp CMND:
							</label>
							<input
								id="staff-id-issue-place"
								className={styles.input}
								type="text"
								value={form.idIssuePlace}
								onChange={updateField('idIssuePlace')}
								placeholder="Cục QLHC về trật tự xã hội..."
							/>
						</div>

						<div className={styles.field}>
							<label className={styles.label} htmlFor="staff-id-issue-date">
								Ngày cấp CMND:
							</label>
							<input
								id="staff-id-issue-date"
								className={styles.input}
								type="date"
								value={form.idIssueDate}
								onChange={updateField('idIssueDate')}
							/>
						</div>

						<div className={styles.field}>
							<label className={styles.label} htmlFor="staff-pit-code">
								Mã số thuế TNCN:
							</label>
							<input
								id="staff-pit-code"
								className={styles.input}
								type="text"
								value={form.pitCode}
								onChange={updateField('pitCode')}
								placeholder="Mã số thuế cá nhân"
							/>
						</div>

						<div className={styles.field}>
							<label className={styles.label} htmlFor="staff-pit-issue-place">
								Nơi cấp Mã TNCN:
							</label>
							<input
								id="staff-pit-issue-place"
								className={styles.input}
								type="text"
								value={form.pitIssuePlace}
								onChange={updateField('pitIssuePlace')}
								placeholder="Chi cục thuế..."
							/>
						</div>

						<div className={styles.field}>
							<label className={styles.label} htmlFor="staff-pit-issue-date">
								Ngày cấp Mã TNCN:
							</label>
							<input
								id="staff-pit-issue-date"
								className={styles.input}
								type="date"
								value={form.pitIssueDate}
								onChange={updateField('pitIssueDate')}
							/>
						</div>
					</div>
				</section>

				{/* 5. Bảo hiểm xã hội & Thất nghiệp */}
				<section className={styles.section} aria-label="Bảo hiểm">
					<h3 className={styles.sectionTitle}>5. Bảo hiểm xã hội (BHXH) &amp; Thất nghiệp (BHTN)</h3>
					<div className={styles.grid2}>
						<div className={styles.field}>
							<label className={styles.label} htmlFor="staff-si-code">
								Số sổ BHXH:
							</label>
							<input
								id="staff-si-code"
								className={styles.input}
								type="text"
								value={form.socialInsuranceCode}
								onChange={updateField('socialInsuranceCode')}
								placeholder="Số sổ BHXH"
							/>
						</div>

						<div className={styles.field}>
							<label className={styles.label} htmlFor="staff-si-issue-place">
								Nơi cấp BHXH:
							</label>
							<input
								id="staff-si-issue-place"
								className={styles.input}
								type="text"
								value={form.siIssuePlace}
								onChange={updateField('siIssuePlace')}
								placeholder="BHXH Tỉnh/Thành phố..."
							/>
						</div>

						<div className={styles.field}>
							<label className={styles.label} htmlFor="staff-si-issue-date">
								Ngày cấp BHXH:
							</label>
							<input
								id="staff-si-issue-date"
								className={styles.input}
								type="date"
								value={form.siIssueDate}
								onChange={updateField('siIssueDate')}
							/>
						</div>

						<div className={styles.field}>
							<label className={styles.label} htmlFor="staff-si-paid-period">
								TG đã đóng BHXH:
							</label>
							<input
								id="staff-si-paid-period"
								className={styles.input}
								type="text"
								value={form.siPaidPeriod}
								onChange={updateField('siPaidPeriod')}
								placeholder="VD: 2 năm 6 tháng"
							/>
						</div>

						<div className={styles.field}>
							<label className={styles.label} htmlFor="staff-ui-paid-period">
								TG đã đóng BHTN:
							</label>
							<input
								id="staff-ui-paid-period"
								className={styles.input}
								type="text"
								value={form.uiPaidPeriod}
								onChange={updateField('uiPaidPeriod')}
								placeholder="VD: 1 năm 2 tháng"
							/>
						</div>
					</div>
				</section>

				<div className={styles.footer}>
					<button type="button" className={styles.secondaryBtn} onClick={onClose}>
						Hủy
					</button>
					<button type="submit" className={styles.primaryBtn}>
						Tạo tài khoản &amp; Hồ sơ
					</button>
				</div>
			</form>
		</dialog>
	);
}

AddStaffAccountInner.propTypes = {
	onClose: PropTypes.func,
	onSubmit: PropTypes.func,
	roleOptions: PropTypes.arrayOf(
		PropTypes.shape({
			label: PropTypes.string.isRequired,
			value: PropTypes.string,
			roleId: PropTypes.number,
			roleCode: PropTypes.string
		})
	)
};

export default function AddStaffAccount({ open = true, onClose, onSubmit, roleOptions }) {
	if (!open) return null;
	if (typeof document === 'undefined') return null;

	return createPortal(
		<AddStaffAccountInner onClose={onClose} onSubmit={onSubmit} roleOptions={roleOptions} />,
		document.body
	);
}

AddStaffAccount.propTypes = {
	open: PropTypes.bool,
	onClose: PropTypes.func,
	onSubmit: PropTypes.func,
	roleOptions: PropTypes.arrayOf(
		PropTypes.shape({
			label: PropTypes.string.isRequired,
			value: PropTypes.string,
			roleId: PropTypes.number,
			roleCode: PropTypes.string
		})
	)
};
