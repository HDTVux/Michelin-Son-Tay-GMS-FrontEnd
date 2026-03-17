import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import baseStyles from '../BookingRequestManagement/BookingRequestManagement.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import AddStaffAccount from './AddStaffAccount.jsx';
import styles from './StaffManagement.module.css';
import { fetchAllStaff, fetchAllStaffRoles } from '../../../services/adminService.js';

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

export default function StaffManagement() {
	useScrollToTop();
	const navigate = useNavigate();

	const [staff, setStaff] = useState([]);
	const [allRoles, setAllRoles] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');

	// Query state (backend paging/filtering)
	const [page, setPage] = useState(0);
	const [size, setSize] = useState(10);
	const [date, setDate] = useState(''); // yyyy-mm-dd
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState(''); // '' | 'ACTIVE' | 'INACTIVE'
	const [roleIdFilter, setRoleIdFilter] = useState(''); // '' | roleId

	// Server paging metadata
	const [totalPages, setTotalPages] = useState(1);
	const [totalElements, setTotalElements] = useState(0);

	// Debounce search to avoid spamming API
	const [debouncedSearch, setDebouncedSearch] = useState('');

	const [showAddModal, setShowAddModal] = useState(false);

	const requestSeqRef = useRef(0);
	const rolesRequestSeqRef = useRef(0);

	const roleOptions = useMemo(() => {
		const raw = Array.isArray(allRoles) ? allRoles : [];
		return raw
			.map((r) => {
				const roleId = Number(r?.roleId);
				const roleCode = r?.roleCode ? String(r.roleCode).trim().toUpperCase() : '';
				const roleName = r?.roleName ? String(r.roleName).trim() : '';
				return {
					roleId: Number.isFinite(roleId) ? roleId : undefined,
					roleCode,
					label: roleName || roleCode || (Number.isFinite(roleId) ? `Role ${roleId}` : 'Role')
				};
			})
			.filter((r) => Number.isFinite(r.roleId) && r.roleId > 0)
			.sort((a, b) => (a.roleId || 0) - (b.roleId || 0));
	}, [allRoles]);

	const roleCodeById = useMemo(() => {
		const map = new Map();
		roleOptions.forEach((r) => {
			if (Number.isFinite(r.roleId) && r.roleId > 0) map.set(r.roleId, r.roleCode);
		});
		return map;
	}, [roleOptions]);

	const roleLabelByCode = useMemo(() => {
		const map = new Map();
		roleOptions.forEach((r) => {
			const code = r?.roleCode ? String(r.roleCode).trim().toUpperCase() : '';
			if (code) map.set(code, r?.label || code);
		});
		return map;
	}, [roleOptions]);

	useEffect(() => {
		const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
		return () => clearTimeout(timer);
	}, [search]);

	useEffect(() => {
		const token = getAuthToken();
		if (!token) {
			setAllRoles([]);
			return;
		}

		const loadRoles = async () => {
			const requestSeq = ++rolesRequestSeqRef.current;
			try {
				const response = await fetchAllStaffRoles(token);
				if (requestSeq !== rolesRequestSeqRef.current) return;
				const list = Array.isArray(response?.data) ? response.data : [];
				setAllRoles(list);
			} catch {
				if (requestSeq !== rolesRequestSeqRef.current) return;
				setAllRoles([]);
			}
		};

		loadRoles();
	}, []);

	const filters = useMemo(() => {
		let parsedIsActive;
		if (statusFilter === 'ACTIVE') parsedIsActive = true;
		else if (statusFilter === 'INACTIVE') parsedIsActive = false;

		const roleId = Number(roleIdFilter);
		const roleIds = roleIdFilter !== '' && Number.isFinite(roleId) && roleId > 0 ? [roleId] : undefined;

		return {
			page,
			size,
			date: date || undefined,
			isActive: parsedIsActive,
			search: debouncedSearch || undefined,
			roleIds
		};
	}, [page, size, date, statusFilter, debouncedSearch, roleIdFilter]);

	useEffect(() => {
		const token = getAuthToken();
		if (!token) {
			setError('Vui lòng đăng nhập để xem danh sách nhân viên.');
			setStaff([]);
			setTotalPages(1);
			setTotalElements(0);
			setIsLoading(false);
			return;
		}

		const loadData = async () => {
			const requestSeq = ++requestSeqRef.current;
			try {
				setIsLoading(true);
				setError('');
				const response = await fetchAllStaff(filters, token);
				if (requestSeq !== requestSeqRef.current) return;

				const pageData = response?.data;
				const list = Array.isArray(pageData?.content) ? pageData.content : [];
				const apiTotalPages = Number.isFinite(pageData?.totalPages) ? pageData.totalPages : 1;
				const apiTotalElements =
					Number.isFinite(pageData?.totalElements) ? pageData.totalElements : list.length;

				setStaff(list);
				setTotalPages(Math.max(1, apiTotalPages));
				setTotalElements(Math.max(0, apiTotalElements));
				if (apiTotalPages > 0 && filters.page > apiTotalPages - 1) {
					setPage(Math.max(0, apiTotalPages - 1));
				}
			} catch (err) {
				if (requestSeq !== requestSeqRef.current) return;
				const msg = err?.message || 'Không thể tải danh sách nhân viên.';
				const isUnauthorized = err?.status === 401 || err?.status === 403;
				if (isUnauthorized) {
					localStorage.removeItem('authToken');
					setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
				} else {
					setError(msg);
				}
				setStaff([]);
				setTotalPages(1);
				setTotalElements(0);
			} finally {
				if (requestSeq === requestSeqRef.current) setIsLoading(false);
			}
		};

		loadData();
	}, [filters]);

	const safeTotalPages = Number.isFinite(totalPages) ? Math.max(1, totalPages) : 1;
	const safePage = Number.isFinite(page) ? Math.min(Math.max(0, page), safeTotalPages - 1) : 0;

	const pageButtons = useMemo(() => {
		const maxButtons = 5;
		const current = safePage;
		const last = safeTotalPages - 1;
		const start = Math.max(0, Math.min(current - 2, last - (maxButtons - 1)));
		const end = Math.min(last, start + (maxButtons - 1));
		const items = [];
		for (let i = start; i <= end; i += 1) items.push(i);
		return items;
	}, [safePage, safeTotalPages]);

	const handleResetFilters = () => {
		setPage(0);
		setSize(10);
		setDate('');
		setSearch('');
		setStatusFilter('');
		setRoleIdFilter('');
	};

	const handleAddStaff = (payload) => {
		// Hiện tại màn này chỉ yêu cầu GET list. Khi tạo mới, ta refresh về trang 1 để lấy dữ liệu mới nhất.
		// (Nếu backend có endpoint create staff, có thể nối vào đây.)
		setPage(0);
		setSearch('');
		setStatusFilter('');
		setRoleIdFilter('');
		setDate('');
		setSize(10);

		// Optimistic UI (best-effort) để user thấy ngay, sẽ được đồng bộ lại khi API trả về
		const tempId = Date.now();
		const roleIds = Array.isArray(payload?.roleIds)
			? payload.roleIds.map(Number).filter((v) => Number.isFinite(v) && v > 0)
			: [];
		const roleCodes =
			Array.isArray(payload?.roleCodes) && payload.roleCodes.length > 0
				? payload.roleCodes.map((c) => String(c).trim().toUpperCase()).filter(Boolean)
				: roleIds.map((id) => roleCodeById.get(id)).filter(Boolean);
		const safeRoleCodes = roleCodes.length > 0 ? roleCodes : ['ADMIN'];
		const newItem = {
			staffId: tempId,
			fullName: payload?.username?.trim() || 'Nhân viên mới',
			phone: payload?.phoneNumber?.trim() || '',
			position: '',
			avatar: '',
			email: payload?.email?.trim() || '',
			status: payload?.isActive ? 'ACTIVE' : 'INACTIVE',
			roles: safeRoleCodes.map((roleCodeRaw) => {
				const roleCode = roleCodeRaw ? String(roleCodeRaw).trim().toUpperCase() : '';
				return {
					roleCode,
					roleName: roleLabelByCode.get(roleCode) || roleCode
				};
			})
		};
		setStaff((prev) => [newItem, ...(prev || [])]);
		setTotalElements((prev) => Math.max(0, Number(prev) || 0) + 1);
		setShowAddModal(false);
	};

	const handleDeleteStaff = (staffId) => {
		setStaff((prev) => (prev || []).filter((s) => (s.staffId || s.id) !== staffId));
		setTotalElements((prev) => Math.max(0, (Number(prev) || 0) - 1));
	};

	const handleViewStaff = (staffId) => {
		if (staffId == null || staffId === '') return;
		navigate(`/staff-manager/${staffId}`);
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
									{totalElements} nhân viên
								</button>
							</div>
						</div>

						<div className={baseStyles['pending-filters']}>
							<div className={styles.filterLabels}>
								<div>Ngày</div>
								<div>Trạng thái</div>
								<div>Vai trò</div>
							</div>
							<div className={styles.filterControls}>
								<input type="date" value={date} onChange={(e) => {
									setDate(e.target.value);
									setPage(0);
								}} />
								<select
									value={statusFilter}
									onChange={(e) => {
										setStatusFilter(e.target.value);
										setPage(0);
									}}
								>
									<option value="">Tất cả</option>
									<option value="ACTIVE">Đang hoạt động</option>
									<option value="INACTIVE">Ngưng hoạt động</option>
								</select>
								<select
									value={roleIdFilter}
									onChange={(e) => {
										setRoleIdFilter(e.target.value);
										setPage(0);
									}}
								>
									<option value="">Tất cả</option>
									{roleOptions.map((r) => (
										<option key={r.roleId} value={String(r.roleId)}>
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
										onChange={(e) => {
											setSearch(e.target.value);
											setPage(0);
										}}
									/>
									<SearchIcon />
								</div>
								<button type="button" className={baseStyles['ghost-button']} onClick={handleResetFilters}>
									Xóa bộ lọc
								</button>
							</div>
						</div>

						{error && <div className={baseStyles['error-banner']}>{error}</div>}

						<div className={baseStyles['booking-table__wrapper']}>
							<table className={`${baseStyles['booking-table']} ${styles.table}`}>
								<thead>
									<tr>
										<th>STT</th>
										<th>TÊN</th>
										<th>SỐ ĐIỆN THOẠI</th>
										<th>TRẠNG THÁI</th>
										<th>Vai trò</th>
										<th>HÀNH ĐỘNG</th>
									</tr>
								</thead>
								<tbody>
									{isLoading && (
										<tr>
											<td className={baseStyles['empty-row']} colSpan={6}>
											Đang tải dữ liệu...
										</td>
										</tr>
									)}

									{!isLoading && (staff?.length || 0) === 0 && (
										<tr>
											<td className={baseStyles['empty-row']} colSpan={6}>
											Không có tài khoản nào phù hợp.
										</td>
									</tr>
									)}

									{!isLoading && (staff?.length || 0) > 0 &&
										staff.map((item, idx) => (
											<StaffTableRow
												key={item.staffId || item.id || idx}
												index={safePage * size + idx + 1}
												item={item}
												onView={handleViewStaff}
												onDelete={handleDeleteStaff}
											/>
										))}
								</tbody>
							</table>
						</div>

						<div className={baseStyles['booking-card__footer']}>
							<div className={baseStyles['page-size']}>
								<span>Hiển thị:</span>
								<select
									value={String(size)}
									onChange={(e) => {
										setSize(Number(e.target.value));
										setPage(0);
									}}
								>
									<option value="10">10</option>
									<option value="20">20</option>
									<option value="50">50</option>
								</select>
							</div>
							<div className={baseStyles.pagination}>
								<button
									type="button"
									className={baseStyles['primary-button']}
									disabled={safePage <= 0 || isLoading}
									onClick={() => setPage(safePage - 1)}
								>
									Trước
								</button>

								{pageButtons.map((p) => {
									const isActive = p === safePage;
									return (
										<button
											type="button"
											key={p}
											className={
												isActive
													? baseStyles['ghost-button']
													: `${baseStyles['primary-button']} ${baseStyles['is-ghost']}`
											}
											disabled={isActive || isLoading}
											onClick={() => setPage(p)}
										>
											{p + 1}
										</button>
									);
								})}

								<button
									type="button"
									className={baseStyles['primary-button']}
									disabled={safePage >= safeTotalPages - 1 || isLoading}
									onClick={() => setPage(safePage + 1)}
								>
									Sau
								</button>
							</div>
						</div>
					</section>
				</div>
			</div>

			<AddStaffAccount
				open={showAddModal}
				onClose={() => setShowAddModal(false)}
				onSubmit={handleAddStaff}
				roleOptions={roleOptions}
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

function StaffTableRow({ item, index, onView, onDelete }) {
	const status = normalizeStaffStatus(item?.status);
	const isActive = typeof item?.isActive === 'boolean' ? item.isActive : status === 'ACTIVE';
	const statusTone = isActive ? 'success' : 'danger';
	const roleText =
		Array.isArray(item?.roles) && item.roles.length > 0
			? item.roles
					.map((r) => {
						const name = r?.roleName ? String(r.roleName).trim() : '';
						const code = r?.roleCode ? String(r.roleCode).trim().toUpperCase() : '';
						return name || code || '';
					})
					.filter(Boolean)
					.join(', ')
				: item?.position || '-';
	return (
		<tr>
			<td>{index}</td>
			<td className={baseStyles['link-cell']}>{item.fullName || item.name || '-'}</td>
			<td>{item.phone || item.phoneNumber || '-'}</td>
			<td>
				<span className={`${baseStyles['status-badge']} ${baseStyles['status-badge--' + statusTone]}`}>
					{isActive ? 'Active' : 'Inactive'}
				</span>
			</td>
			<td>{roleText}</td>
			<td>
				<div className={styles.actionGroup}>
					<button
						type="button"
						className={styles.actionBtn}
						onClick={() => onView?.(item.staffId || item.id)}
					>
						Xem
					</button>
					<button
						type="button"
						className={`${styles.actionBtn} ${styles.actionDanger}`}
						onClick={() => onDelete(item.staffId || item.id)}
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
		staffId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
		id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
		fullName: PropTypes.string,
		name: PropTypes.string,
		phone: PropTypes.string,
		phoneNumber: PropTypes.string,
		position: PropTypes.string,
		status: PropTypes.string,
		isActive: PropTypes.bool,
		roles: PropTypes.arrayOf(
			PropTypes.shape({
				roleId: PropTypes.number,
				roleCode: PropTypes.string,
				roleName: PropTypes.string
			})
		)
	}).isRequired,
	index: PropTypes.number.isRequired,
	onView: PropTypes.func,
	onDelete: PropTypes.func.isRequired
};
