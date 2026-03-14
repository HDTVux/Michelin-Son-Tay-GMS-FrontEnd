import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import baseStyles from '../BookingRequestManagement/BookingRequestManagement.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import AddStaffAccount from './AddStaffAccount.jsx';
import styles from './StaffManagement.module.css';

const ROLE_OPTIONS = [
	{ label: 'Admin', value: 'ADMIN' },
	{ label: 'Manager', value: 'MANAGER' },
	{ label: 'Advisor', value: 'ADVISOR' },
	{ label: 'Receptionist', value: 'RECEPTIONIST' },
	{ label: 'Accountant', value: 'ACCOUNTANT' },
	{ label: 'Technician', value: 'TECHNICIAN' }
];

const ROLE_LABELS = ROLE_OPTIONS.reduce((acc, item) => {
	acc[item.value] = item.label;
	return acc;
}, {});

const FAKE_STAFF = [
	{
		id: 1,
		name: 'Nguyễn Văn An',
		phoneNumber: '0912345678',
		isActive: true,
		role: 'ADMIN'
	},
	{
		id: 2,
		name: 'Trần Thị Bình',
		phoneNumber: '0987654321',
		isActive: true,
		role: 'ADVISOR'
	},
	{
		id: 3,
		name: 'Phạm Minh Châu',
		phoneNumber: '0905123123',
		isActive: false,
		role: 'RECEPTIONIST'
	},
	{
		id: 4,
		name: 'Lê Quốc Dũng',
		phoneNumber: '0933111222',
		isActive: true,
		role: 'TECHNICIAN'
	},
	{
		id: 5,
		name: 'Hoàng Mai Em',
		phoneNumber: '0977000111',
		isActive: true,
		role: 'ACCOUNTANT'
	}
];

function normalizeText(value) {
	return (value ?? '').toString().trim().toLowerCase();
}

export default function StaffManagement() {
	useScrollToTop();

	const [staff, setStaff] = useState(FAKE_STAFF);
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState(''); // '' | 'ACTIVE' | 'INACTIVE'
	const [roleFilter, setRoleFilter] = useState(''); // '' | role
	const [showAddModal, setShowAddModal] = useState(false);

	const filteredStaff = useMemo(() => {
		const q = normalizeText(search);
		return staff.filter((s) => {
			const matchesSearch =
				!q ||
				normalizeText(s.name).includes(q) ||
				normalizeText(s.phoneNumber).includes(q);
			const matchesStatus =
				!statusFilter ||
				(statusFilter === 'ACTIVE' ? s.isActive : !s.isActive);
			const matchesRole = !roleFilter || s.role === roleFilter;
			return matchesSearch && matchesStatus && matchesRole;
		});
	}, [staff, search, statusFilter, roleFilter]);

	const handleResetFilters = () => {
		setSearch('');
		setStatusFilter('');
		setRoleFilter('');
	};

	const handleAddStaff = (payload) => {
		const nextId = staff.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1;
		const newItem = {
			id: nextId,
			name: payload?.username?.trim() || 'Nhân viên mới',
			phoneNumber: payload?.phoneNumber?.trim() || '',
			isActive: !!payload?.isActive,
			role: payload?.role || 'ADMIN'
		};
		setStaff((prev) => [newItem, ...prev]);
		setShowAddModal(false);
	};

	const handleDeleteStaff = (staffId) => {
		setStaff((prev) => prev.filter((s) => s.id !== staffId));
	};

	return (
		<div className={baseStyles['booking-page']}>
			<div className={baseStyles['booking-layout']}>
				<div className={baseStyles['booking-left']}>
					<section className={baseStyles['booking-card']}>
						<div className={baseStyles['booking-card__header']}>
							<div className={baseStyles['booking-card__title']}>
								<UserIcon /> Quản lý tài khoản nhân viên
							</div>
							<div className={styles.headerActions}>
								<button
									type="button"
									className={baseStyles['primary-button']}
									onClick={() => setShowAddModal(true)}
								>
									Thêm tài khoản
								</button>
								<button type="button" className={baseStyles['ghost-button']}>
									{staff.length} nhân viên
								</button>
							</div>
						</div>

						<div className={baseStyles['pending-filters']}>
							<div className={styles.filterLabels}>
								<div>Trạng thái</div>
								<div>Role</div>
							</div>
							<div className={styles.filterControls}>
								<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
									<option value="">Tất cả</option>
									<option value="ACTIVE">Đang hoạt động</option>
									<option value="INACTIVE">Ngưng hoạt động</option>
								</select>
								<select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
									<option value="">Tất cả</option>
									{ROLE_OPTIONS.map((r) => (
										<option key={r.value} value={r.value}>
											{r.label}
										</option>
									))}
								</select>
							</div>
							<div className={baseStyles['filter-card__actions']}>
								<div className={baseStyles['search-box']}>
									<input
										placeholder="Tìm kiếm theo tên/SĐT..."
										value={search}
										onChange={(e) => setSearch(e.target.value)}
									/>
									<SearchIcon />
								</div>
								<button type="button" className={baseStyles['ghost-button']} onClick={handleResetFilters}>
									Xóa bộ lọc
								</button>
							</div>
						</div>

						<div className={baseStyles['booking-table__wrapper']}>
							<table className={`${baseStyles['booking-table']} ${styles.table}`}>
								<thead>
									<tr>
										<th>STT</th>
										<th>TÊN</th>
										<th>SỐ ĐIỆN THOẠI</th>
										<th>TRẠNG THÁI</th>
										<th>ROLE</th>
										<th>HÀNH ĐỘNG</th>
									</tr>
								</thead>
								<tbody>
									{filteredStaff.length === 0 ? (
										<tr>
											<td className={baseStyles['empty-row']} colSpan={6}>
											Không có tài khoản nào phù hợp.
										</td>
									</tr>
									) : (
										filteredStaff.map((item, idx) => (
											<StaffTableRow
												key={item.id}
												index={idx + 1}
												item={item}
												onDelete={handleDeleteStaff}
											/>
										))
									)}
								</tbody>
							</table>
						</div>
					</section>
				</div>
			</div>

			<AddStaffAccount
				open={showAddModal}
				onClose={() => setShowAddModal(false)}
				onSubmit={handleAddStaff}
				roleOptions={ROLE_OPTIONS}
			/>
		</div>
	);
}

function UserIcon(props) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={baseStyles.icon}
			aria-hidden="true"
			{...props}
		>
			<path
				d="M12 12c2.761 0 5-2.239 5-5S14.761 2 12 2 7 4.239 7 7s2.239 5 5 5Zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5Z"
				fill="currentColor"
			/>
		</svg>
	);
}

function SearchIcon(props) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={baseStyles.icon}
			aria-hidden="true"
			{...props}
		>
			<path
				d="M10.5 3a7.5 7.5 0 1 0 4.66 13.38l3.23 3.23a1 1 0 0 0 1.41-1.41l-3.23-3.23A7.5 7.5 0 0 0 10.5 3Zm0 2a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Z"
				fill="currentColor"
			/>
		</svg>
	);
}

UserIcon.propTypes = {
	className: PropTypes.string
};

SearchIcon.propTypes = {
	className: PropTypes.string
};

function StaffTableRow({ item, index, onDelete }) {
	const statusTone = item.isActive ? 'success' : 'danger';
	return (
		<tr>
			<td>{index}</td>
			<td className={baseStyles['link-cell']}>{item.name}</td>
			<td>{item.phoneNumber}</td>
			<td>
				<span className={`${baseStyles['status-badge']} ${baseStyles['status-badge--' + statusTone]}`}>
					{item.isActive ? 'Active' : 'Inactive'}
				</span>
			</td>
			<td>{ROLE_LABELS[item.role] || item.role}</td>
			<td>
				<div className={styles.actionGroup}>
					<button type="button" className={styles.actionBtn} onClick={() => {}}>
						Xem
					</button>
					<button type="button" className={styles.actionBtn} onClick={() => {}}>
						Sửa
					</button>
					<button
						type="button"
						className={`${styles.actionBtn} ${styles.actionDanger}`}
						onClick={() => onDelete(item.id)}
					>
						Xóa
					</button>
				</div>
			</td>
		</tr>
	);
}

StaffTableRow.propTypes = {
	item: PropTypes.shape({
		id: PropTypes.number.isRequired,
		name: PropTypes.string.isRequired,
		phoneNumber: PropTypes.string.isRequired,
		isActive: PropTypes.bool.isRequired,
		role: PropTypes.string.isRequired
	}).isRequired,
	index: PropTypes.number.isRequired,
	onDelete: PropTypes.func.isRequired
};
