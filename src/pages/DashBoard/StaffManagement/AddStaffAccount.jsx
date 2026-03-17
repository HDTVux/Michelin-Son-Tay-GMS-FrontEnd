import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import styles from './AddStaffAccount.module.css';

const DEFAULT_ROLE_OPTIONS = [{ label: 'Admin', roleId: 1, roleCode: 'ADMIN' }];

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
		username: '',
		password: '',
		email: '',
		phoneNumber: '',
		roleIds: defaultRoleIds,
		isActive: true
	});
	const [roleError, setRoleError] = useState('');

	const updateField = (name) => (e) => {
		const value = e?.target?.type === 'checkbox' ? e.target.checked : e.target.value;
		setForm((prev) => ({ ...prev, [name]: value }));
	};

	const toggleRoleId = (roleId) => (e) => {
		const checked = !!e?.target?.checked;
		setForm((prev) => {
			const current = Array.isArray(prev.roleIds) ? prev.roleIds : [];
			if (checked) {
				return { ...prev, roleIds: current.includes(roleId) ? current : [...current, roleId] };
			}
			return { ...prev, roleIds: current.filter((id) => id !== roleId) };
		});
		setRoleError('');
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		const roleIds = Array.isArray(form.roleIds)
			? form.roleIds.map(Number).filter((v) => Number.isFinite(v) && v > 0)
			: [];

		if (roleIds.length === 0) {
			setRoleError('Vui lòng chọn ít nhất 1 role.');
			return;
		}

		const roleCodes = roleIds
			.map((id) => roles.find((r) => r.roleId === id)?.roleCode)
			.filter(Boolean);

		if (onSubmit) onSubmit({ ...form, roleIds, roleCodes });
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
				Tạo tài khoản nhân viên
			</h2>

			<form className={styles.form} onSubmit={handleSubmit}>
				<section className={styles.section} aria-label="Basic Account Information">
					<h3 className={styles.sectionTitle}>Basic Account Information</h3>

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
								/>
							</div>

							<div className={styles.field}>
								<label className={styles.label} htmlFor="staff-phone">
									Phone Number<span className={styles.required}>*</span>:
								</label>
								<input
									id="staff-phone"
									className={styles.input}
									type="tel"
									value={form.phoneNumber}
									onChange={updateField('phoneNumber')}
									required
									autoComplete="tel"
								/>
							</div>
						</div>
				</section>

				<section className={styles.section} aria-label="Role Assignment">
					<h3 className={styles.sectionTitle}>Role Assignment</h3>

					<div className={styles.fieldStack}>
						<div className={styles.label}>Roles<span className={styles.required}>*</span>:</div>
						<div className={styles.roleList} role="group" aria-label="Chọn roles">
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
						</div>
						{roleError && <div className={styles.inlineError}>{roleError}</div>}
					</div>
				</section>

				<section className={styles.section} aria-label="Account Status & Security">
					<h3 className={styles.sectionTitle}>Account Status &amp; Security</h3>

						<div className={styles.statusRow}>
							<div className={styles.statusLabel}>Account Status:</div>

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

							<div className={styles.statusText}>Active</div>
						</div>
				</section>

				<div className={styles.footer}>
					<button type="button" className={styles.secondaryBtn} onClick={onClose}>
						Hủy
					</button>
					<button type="submit" className={styles.primaryBtn}>
						Tạo tài khoản
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
