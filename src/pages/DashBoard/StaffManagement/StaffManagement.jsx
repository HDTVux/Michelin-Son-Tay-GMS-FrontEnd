import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import AddStaffAccount from './AddStaffAccount.jsx';
import styles from './StaffManagement.modern.module.css';

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
	
	// Pagination
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

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
	
	// Paginated data
	const totalItems = filteredStaff.length;
	const totalPages = Math.ceil(totalItems / itemsPerPage);
	const paginatedStaff = useMemo(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		const endIndex = startIndex + itemsPerPage;
		return filteredStaff.slice(startIndex, endIndex);
	}, [filteredStaff, currentPage]);
	
	// Reset to page 1 when filters change
	const handleSearchChange = (value) => {
		setSearch(value);
		setCurrentPage(1);
	};
	
	const handleStatusFilterChange = (value) => {
		setStatusFilter(value);
		setCurrentPage(1);
	};
	
	const handleRoleFilterChange = (value) => {
		setRoleFilter(value);
		setCurrentPage(1);
	};

	const handleResetFilters = () => {
		setSearch('');
		setStatusFilter('');
		setRoleFilter('');
		setCurrentPage(1);
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
		setCurrentPage(1);
	};

	const handleDeleteStaff = (staffId) => {
		setStaff((prev) => prev.filter((s) => s.id !== staffId));
	};

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<h1 className={styles.title}>
					Quản lý nhân viên
				</h1>
				<div className={styles.headerActions}>
					<button
						type="button"
						className={styles.addButton}
						onClick={() => setShowAddModal(true)}
					>
						Thêm tài khoản
					</button>
					<span className={styles.countBadge}>
						{staff.length} nhân viên
					</span>
				</div>
			</div>

			<div className={styles.toolbar}>
				<div className={styles.searchBox}>
					<input
						className={styles.searchInput}
						placeholder="Tìm kiếm theo tên/SĐT..."
						value={search}
						onChange={(e) => handleSearchChange(e.target.value)}
					/>
				</div>

				<div className={styles.filterBox}>
					<label>Trạng thái:</label>
					<select 
						className={styles.filterSelect}
						value={statusFilter} 
						onChange={(e) => handleStatusFilterChange(e.target.value)}
					>
						<option value="">Tất cả</option>
						<option value="ACTIVE">Đang hoạt động</option>
						<option value="INACTIVE">Ngưng hoạt động</option>
					</select>
				</div>

				<div className={styles.filterBox}>
					<label>Role:</label>
					<select 
						className={styles.filterSelect}
						value={roleFilter} 
						onChange={(e) => handleRoleFilterChange(e.target.value)}
					>
						<option value="">Tất cả</option>
						{ROLE_OPTIONS.map((r) => (
							<option key={r.value} value={r.value}>
								{r.label}
							</option>
						))}
					</select>
				</div>

				<button 
					type="button" 
					className={styles.resetButton} 
					onClick={handleResetFilters}
				>
					Xóa bộ lọc
				</button>
			</div>

			{filteredStaff.length === 0 ? (
				<div className={styles.emptyState}>
					<div className={styles.emptyIcon}>👥</div>
					<p className={styles.emptyText}>Không có nhân viên nào</p>
					<p className={styles.emptySubtext}>Không tìm thấy nhân viên phù hợp với bộ lọc</p>
				</div>
			) : (
				<>
					<div className={styles.tableCard}>
						<table className={styles.table}>
							<thead>
								<tr>
									<th>STT</th>
									<th>Tên</th>
									<th>Số điện thoại</th>
									<th>Trạng thái</th>
									<th>Role</th>
									<th>Hành động</th>
								</tr>
							</thead>
							<tbody>
								{paginatedStaff.map((item, idx) => (
									<StaffTableRow
										key={item.id}
										index={(currentPage - 1) * itemsPerPage + idx + 1}
										item={item}
										onDelete={handleDeleteStaff}
									/>
								))}
							</tbody>
						</table>
					</div>
					
					{totalPages > 1 && (
						<div className={styles.pagination}>
							<div className={styles.paginationInfo}>
								Hiển thị {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} của {totalItems} nhân viên
							</div>
							<div className={styles.paginationButtons}>
								<button
									className={styles.pageBtn}
									disabled={currentPage === 1}
									onClick={() => setCurrentPage((prev) => prev - 1)}
								>
									‹ Trước
								</button>
								{Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
									<button
										key={page}
										className={`${styles.pageBtn} ${currentPage === page ? styles.active : ''}`}
										onClick={() => setCurrentPage(page)}
									>
										{page}
									</button>
								))}
								<button
									className={styles.pageBtn}
									disabled={currentPage === totalPages}
									onClick={() => setCurrentPage((prev) => prev + 1)}
								>
									Sau ›
								</button>
							</div>
						</div>
					)}
				</>
			)}

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
			style={{ width: '24px', height: '24px' }}
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
			style={{ width: '20px', height: '20px' }}
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
	return (
		<tr>
			<td>{index}</td>
			<td>{item.name}</td>
			<td>{item.phoneNumber}</td>
			<td>
				<span className={`${styles.statusBadge} ${item.isActive ? styles.statusActive : styles.statusInactive}`}>
					{item.isActive ? 'Hoạt động' : 'Ngưng hoạt động'}
				</span>
			</td>
			<td>
				<span className={styles.roleBadge}>
					{ROLE_LABELS[item.role] || item.role}
				</span>
			</td>
			<td>
				<div className={styles.actionGroup}>
					<button type="button" className={`${styles.actionBtn} ${styles.viewBtn}`} onClick={() => {}}>
						Xem
					</button>
					<button type="button" className={`${styles.actionBtn} ${styles.editBtn}`} onClick={() => {}}>
						Sửa
					</button>
					<button
						type="button"
						className={`${styles.actionBtn} ${styles.deleteBtn}`}
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
