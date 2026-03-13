import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import styles from './AddStaffAccount.module.css';

const DEFAULT_ROLE_OPTIONS = [{ label: 'Admin', value: 'ADMIN' }];

function AddStaffAccountInner({ onClose, onSubmit, roleOptions }) {
	const roles = useMemo(
		() => (Array.isArray(roleOptions) && roleOptions[0] ? roleOptions : DEFAULT_ROLE_OPTIONS),
		[roleOptions]
	);

	const [form, setForm] = useState({
		username: '',
		password: '',
		email: '',
		phoneNumber: '',
		role: roles[0]?.value ?? 'ADMIN',
		isActive: true
	});

	const updateField = (name) => (e) => {
		const value = e?.target?.type === 'checkbox' ? e.target.checked : e.target.value;
		setForm((prev) => ({ ...prev, [name]: value }));
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		if (onSubmit) onSubmit({ ...form });
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

						<div className={styles.fieldInline}>
							<label className={styles.label} htmlFor="staff-role">
								Role:
							</label>
							<select
								id="staff-role"
								className={styles.select}
								value={form.role}
								onChange={updateField('role')}
							>
								{roles.map((r) => (
									<option key={r.value} value={r.value}>
										{r.label}
									</option>
								))}
							</select>
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
			value: PropTypes.string.isRequired
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
			value: PropTypes.string.isRequired
		})
	)
};
