import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  fetchServiceTicketsPaged,
  fetchAvailableStaff,
  assignStaff,
  fetchTicketAssignments,
} from '../../../services/serviceTicketService';
import { fetchAllStaff } from '../../../services/adminService';
import styles from './AssignAdvisor.module.css';

const AssignAdvisor = () => {
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterService, setFilterService] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [advisors, setAdvisors] = useState([]);
  const [loadingAdvisors, setLoadingAdvisors] = useState(false);
  const [selectedMainAdvisor, setSelectedMainAdvisor] = useState(null);
  const [selectedAssistants, setSelectedAssistants] = useState([]);
  const [showAdvisorModal, setShowAdvisorModal] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  
  // State cho xem phân công
  const [showAssignmentsModal, setShowAssignmentsModal] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  
  // State cho tracking ticket đã giao (dựa vào assignments)
  const [ticketAssignments, setTicketAssignments] = useState({}); // { ticketId: true/false }

  // Fetch tickets from API
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        // Lấy tất cả ticket (không filter theo status)
        // Backend: GET /api/service-ticket/manage/tickets?page=0&size=100
        // Response: Page<ServiceTicketListResponse> → { content: [ServiceTicketListResponse] }
        const response = await fetchServiceTicketsPaged({ size: 100 });
        const list = response?.data?.content || response?.data || [];
        setTickets(list);

        // Check assignments cho mỗi ticket để xác định đã giao chưa
        const assignmentStatus = {};
        await Promise.all(
          list.map(async (ticket) => {
            try {
              const assignResp = await fetchTicketAssignments(ticket.serviceTicketId);
              const assignmentList = assignResp?.data || [];
              assignmentStatus[ticket.serviceTicketId] = assignmentList.length > 0;
            } catch {
              assignmentStatus[ticket.serviceTicketId] = false;
            }
          })
        );
        setTicketAssignments(assignmentStatus);
      } catch (error) {
        console.error('Error fetching tickets:', error);
        toast.error('Không thể tải danh sách phiếu dịch vụ');
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  // Fetch advisors + determine busy/free from all ticket assignments
  useEffect(() => {
    if (!selectedTicket) {
      setAdvisors([]);
      return;
    }

    const fetchAdvisors = async () => {
      setLoadingAdvisors(true);
      setAdvisors([]);
      setSelectedMainAdvisor(null);
      setSelectedAssistants([]);

      try {
        // Step 1: Get all staff (from EmployeeManageController: GET /api/manager/employees)
        const staffResp = await fetchAllStaff({});
        // Backend trả: List<EmployeeResponse> → flat array
        const allStaff = Array.isArray(staffResp?.data) ? staffResp.data : [];

        // Step 2: Collect ALL staffIds currently assigned to ANY ticket
        const busyStaffIds = new Set();
        await Promise.all(
          tickets.map(async (ticket) => {
            try {
              const assignResp = await fetchTicketAssignments(ticket.serviceTicketId);
              (assignResp?.data || []).forEach((a) => busyStaffIds.add(a.staffId));
            } catch {
              // silently ignore
            }
          })
        );

        // Step 3: Get available-staff for THIS ticket (who CAN be assigned to this specific ticket)
        // Backend: GET /api/service-ticket/assignment/{ticketId}/available-staff?role=TECHNICIAN
        // Response: List<AvailableStaffDto> → { staffId, fullName, phone, position, roleCode }
        const availResp = await fetchAvailableStaff(selectedTicket.serviceTicketId, 'TECHNICIAN').catch(() => ({}));
        const availableIds = new Set((availResp?.data || []).map(s => s.staffId));

        // Step 4: Build advisor list — show technicians who are available for this ticket
        // Note: availableIds contains staff eligible for this ticket
        const merged = allStaff
          .filter(t => availableIds.has(t.staffId))
          .map(t => ({
            ...t,
            staffId: t.staffId,
            fullName: t.fullName,
            phone: t.phone,
            avatar: t.avatar,
            position: t.position,
            isBusy: busyStaffIds.has(t.staffId),
          }));

        // Step 5: Sort — rảnh first, bận last
        merged.sort((a, b) => Number(a.isBusy) - Number(b.isBusy));
        setAdvisors(merged);
      } catch (error) {
        console.error('Error loading advisors:', error);
        toast.error('Không thể tải danh sách KTV');
      } finally {
        setLoadingAdvisors(false);
      }
    };

    fetchAdvisors();
  }, [selectedTicket, tickets]);

  // Stats - dựa vào ticketAssignments thay vì ticketStatus
  const stats = {
    total: tickets.length,
    assigned: tickets.filter(t => ticketAssignments[t.serviceTicketId] === true).length,
    pending: tickets.filter(t => !ticketAssignments[t.serviceTicketId]).length,
  };

  // Filter tickets và chia thành 2 nhóm
  const allFilteredTickets = tickets.filter(ticket => {
    const matchService = filterService === 'all' || (ticket.serviceCategory || '').toLowerCase().includes(filterService.toLowerCase());
    const matchSearch = !searchTerm ||
      (ticket.ticketCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.licensePlate || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.customerName || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchService && matchSearch;
  });

  // Chia thành 2 nhóm: chưa giao và đã giao
  const unassignedTickets = allFilteredTickets.filter(ticket => !ticketAssignments[ticket.serviceTicketId]);
  const assignedTickets = allFilteredTickets.filter(ticket => ticketAssignments[ticket.serviceTicketId]);
  
  // Apply filter status
  let displayUnassigned = unassignedTickets;
  let displayAssigned = assignedTickets;
  
  if (filterStatus !== 'all') {
    if (filterStatus === 'CREATED') {
      displayAssigned = []; // Chỉ hiển thị chưa giao
    } else {
      displayUnassigned = []; // Chỉ hiển thị đã giao
      displayAssigned = assignedTickets.filter(t => t.ticketStatus === filterStatus);
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return '—';
    }
  };

  const handleTicketClick = (ticket) => {
    setSelectedTicket(ticket);
    
    // Nếu ticket đã được giao việc, hiển thị modal xem phân công
    if (ticket.ticketStatus !== 'CREATED') {
      handleViewAssignments(ticket);
    } else {
      // Nếu chưa giao việc, hiển thị modal giao việc
      setShowAdvisorModal(true);
      toast.info(`Đang mở phân công phiếu ${ticket.ticketCode}`, { toastId: `open-${ticket.ticketCode}` });
    }
  };
  
  const handleViewAssignments = async (ticket) => {
    setShowAssignmentsModal(true);
    setLoadingAssignments(true);
    setAssignments([]);

    try {
      // Backend: GET /api/service-ticket/assignment/{ticketId}/assignments
      const response = await fetchTicketAssignments(ticket.serviceTicketId);
      const assignmentList = response?.data || [];
      setAssignments(assignmentList);
    } catch (error) {
      console.error('Error loading assignments:', error);
      toast.error('Không thể tải danh sách phân công');
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleSelectMain = (staffId) => {
    const advisor = advisors.find(a => a.staffId === staffId);
    setSelectedMainAdvisor(staffId);
    toast.success(`Đã chọn KTV chính: ${advisor?.fullName}`, { toastId: `main-${staffId}` });
  };

  const toggleAssistant = (staffId) => {
    if (staffId === selectedMainAdvisor) {
      toast.warn('Không thể chọn KTV chính làm KTV phụ!', { toastId: 'warn-assist' });
      return;
    }
    const advisor = advisors.find(a => a.staffId === staffId);
    const isAdding = !selectedAssistants.includes(staffId);
    setSelectedAssistants(prev =>
      prev.includes(staffId) ? prev.filter(id => id !== staffId) : [...prev, staffId]
    );
    toast.success(
      isAdding
        ? `Đã thêm KTV phụ: ${advisor?.fullName}`
        : `Đã bỏ chọn KTV phụ: ${advisor?.fullName}`,
      { toastId: `assist-${staffId}` }
    );
  };

  const handleConfirmAssignment = async () => {
    if (!selectedMainAdvisor) {
      toast.error('Vui lòng chọn KTV chính');
      return;
    }

    setIsAssigning(true);
    try {
      const mainAdvisor = advisors.find(a => a.staffId === selectedMainAdvisor);
      // Backend: POST /api/service-ticket/assignment/{ticketId}/assign
      await assignStaff(selectedTicket.serviceTicketId, {
        staffId: selectedMainAdvisor,
        roleInTicket: 'TECHNICIAN',
        isPrimary: true,
        note: '',
      });

      // Gán KTV phụ nếu có
      for (const asId of selectedAssistants) {
        const assistant = advisors.find(a => a.staffId === asId);
        await assignStaff(selectedTicket.serviceTicketId, {
          staffId: asId,
          roleInTicket: 'TECHNICIAN',
          isPrimary: false,
          note: '',
        });
      }

      const assistantNames = selectedAssistants
        .map(id => advisors.find(a => a.staffId === id)?.fullName)
        .filter(Boolean)
        .join(', ');

      toast.success(
        selectedAssistants.length > 0
          ? `Phân công thành công! KTV chính: ${mainAdvisor.fullName}, KTV phụ: ${assistantNames}`
          : `Phân công thành công cho KTV: ${mainAdvisor.fullName}`,
        { toastId: 'assign-success' }
      );

      setShowAdvisorModal(false);
      setSelectedTicket(null);

      // Refresh ticket list
      setLoading(true);
      const response = await fetchServiceTicketsPaged({ size: 100 });
      const list = response?.data?.content || response?.data || [];
      setTickets(list);

      const assignmentStatus = {};
      await Promise.all(
        list.map(async (t) => {
          try {
            const assignResp = await fetchTicketAssignments(t.serviceTicketId);
            assignmentStatus[t.serviceTicketId] = (assignResp?.data || []).length > 0;
          } catch {
            assignmentStatus[t.serviceTicketId] = false;
          }
        })
      );
      setTicketAssignments(assignmentStatus);
      setLoading(false);
    } catch (error) {
      console.error('Error assigning:', error);
      toast.error(error?.message || 'Lỗi khi phân công');
    } finally {
      setIsAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Phân công KTV</h1>
          <p className={styles.subtitle}>Quản lý và phân công kỹ thuật viên cho phiếu dịch vụ</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statTotal}`}>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Tổng phiếu</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statAssigned}`}>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.pending}</div>
            <div className={styles.statLabel}>Chưa phân công</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statProgress}`}>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.assigned}</div>
            <div className={styles.statLabel}>Đã phân công</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Tìm kiếm theo mã phiếu, biển số, khách hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.filterBox}>
          <label>Lọc trạng thái:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Tất cả</option>
            <option value="CREATED">Chưa phân công</option>
            <option value="IN_PROGRESS">Đang thực hiện</option>
            <option value="COMPLETED">Hoàn thành</option>
          </select>
        </div>
        <div className={styles.filterBox}>
          <label>Lọc dịch vụ:</label>
          <select
            value={filterService}
            onChange={(e) => setFilterService(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Tất cả dịch vụ</option>
            <option value="bảo dưỡng">Bảo dưỡng</option>
            <option value="sửa chữa">Sửa chữa</option>
            <option value="thay dầu">Thay dầu</option>
          </select>
        </div>
      </div>

      {/* Ticket List - 2 cột */}
      <div className={styles.ticketsContainer}>
        {/* Cột 1: Chưa giao */}
        <div className={styles.ticketColumn}>
          <div className={styles.columnHeader}>
            <h3 className={styles.columnTitle}>Chưa phân công</h3>
            <span className={styles.columnCount}>{displayUnassigned.length}</span>
          </div>
          <div className={styles.tasksList}>
            {displayUnassigned.length === 0 ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyText}>Không có phiếu nào</p>
              </div>
            ) : (
              displayUnassigned.map((ticket) => (
                <TicketCard
                  key={ticket.ticketCode}
                  ticket={ticket}
                  onAssign={() => handleTicketClick(ticket)}
                  formatDate={formatDate}
                  isAssigned={false}
                />
              ))
            )}
          </div>
        </div>

        {/* Cột 2: Đã giao */}
        <div className={styles.ticketColumn}>
          <div className={styles.columnHeader}>
            <h3 className={styles.columnTitle}>Đã phân công</h3>
            <span className={styles.columnCount}>{displayAssigned.length}</span>
          </div>
          <div className={styles.tasksList}>
            {displayAssigned.length === 0 ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyText}>Không có phiếu nào</p>
              </div>
            ) : (
              displayAssigned.map((ticket) => (
                <TicketCard
                  key={ticket.ticketCode}
                  ticket={ticket}
                  onAssign={() => handleTicketClick(ticket)}
                  formatDate={formatDate}
                  isAssigned={true}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Advisor Selection Modal */}
      {showAdvisorModal && selectedTicket && (
        <div className={styles.modalOverlay} onClick={() => !isAssigning && setShowAdvisorModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Phân công KTV — {selectedTicket.ticketCode}</h3>
              <button
                className={styles.modalClose}
                onClick={() => !isAssigning && setShowAdvisorModal(false)}
                disabled={isAssigning}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Ticket info summary */}
              <div className={styles.ticketSummary}>
                <div className={styles.ticketSummaryItem}>
                  <span className={styles.fieldLabel}>Biển số</span>
                  <span className={styles.fieldValue}>{selectedTicket.licensePlate}</span>
                </div>
                <div className={styles.ticketSummaryItem}>
                  <span className={styles.fieldLabel}>Khách hàng</span>
                  <span className={styles.fieldValue}>{selectedTicket.customerName || '—'}</span>
                </div>
                <div className={styles.ticketSummaryItem}>
                  <span className={styles.fieldLabel}>Dịch vụ</span>
                  <span className={styles.fieldValue}>{selectedTicket.serviceCategory || '—'}</span>
                </div>
                <div className={styles.ticketSummaryItem}>
                  <span className={styles.fieldLabel}>Ngày hẹn</span>
                  <span className={styles.fieldValue}>
                    {selectedTicket.scheduledDate ? formatDate(selectedTicket.scheduledDate) : '—'}
                  </span>
                </div>
              </div>

              {/* Advisor list */}
              <div className={styles.modalSection}>
                <h4 className={styles.sectionTitle}>Chọn KTV chính</h4>
                {loadingAdvisors ? (
                  <div className={styles.loadingAdvisors}>
                    <div className={styles.spinnerSmall}></div>
                    <span>Đang tải danh sách KTV...</span>
                  </div>
                ) : advisors.length === 0 ? (
                  <div className={styles.noAdvisors}>Không có KTV khả dụng cho phiếu này</div>
                ) : (
                  <div className={styles.advisorGrid}>
                    {advisors.map((advisor) => (
                      <div
                        key={advisor.staffId}
                        className={`
                          ${styles.advisorCard}
                          ${selectedMainAdvisor === advisor.staffId ? styles.advisorSelected : ''}
                          ${advisor.isBusy ? styles.advisorBusy : ''}
                        `}
                        onClick={() => handleSelectMain(advisor.staffId)}
                      >
                        <div className={styles.advisorAvatar}>
                          {advisor.avatar ? (
                            <img src={advisor.avatar} alt={advisor.fullName} />
                          ) : (
                            <div className={styles.avatarPlaceholder}>
                              {advisor.fullName?.charAt(0) || '?'}
                            </div>
                          )}
                        </div>
                        <div className={styles.advisorInfo}>
                          <div className={styles.advisorName}>{advisor.fullName}</div>
                          <div className={styles.advisorPhone}>{advisor.phone || '—'}</div>
                          <div className={styles.advisorRoles}>
                            {advisor.roles?.map((r, i) => (
                              <span key={i} className={styles.roleTag}>{r.roleName}</span>
                            ))}
                          </div>
                          {/* Workload badge */}
                          <div className={styles.workloadBadge}>
                            {advisor.isBusy ? (
                              <>
                                <span className={styles.busyDot} />
                                <span className={styles.busyLabel}>Bận</span>
                              </>
                            ) : (
                              <>
                                <span className={styles.freeDot} />
                                <span className={styles.freeLabel}>Rảnh</span>
                              </>
                            )}
                          </div>
                        </div>
                        {selectedMainAdvisor === advisor.staffId && (
                          <div className={styles.checkmark}>✓</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Assistant advisors */}
              {selectedMainAdvisor && advisors.length > 1 && (
                <div className={styles.modalSection}>
                  <h4 className={styles.sectionTitle}>Thêm KTV phụ (tùy chọn)</h4>
                  <div className={styles.advisorGrid}>
                    {advisors
                      .filter(a => a.staffId !== selectedMainAdvisor)
                      .map((advisor) => (
                        <div
                          key={advisor.staffId}
                          className={`
                            ${styles.advisorCard}
                            ${styles.advisorAssistant}
                            ${selectedAssistants.includes(advisor.staffId) ? styles.advisorAssistantSelected : ''}
                            ${advisor.isBusy ? styles.advisorBusy : ''}
                          `}
                          onClick={() => toggleAssistant(advisor.staffId)}
                        >
                          <div className={styles.advisorAvatar}>
                            {advisor.avatar ? (
                              <img src={advisor.avatar} alt={advisor.fullName} />
                            ) : (
                              <div className={styles.avatarPlaceholder}>
                                {advisor.fullName?.charAt(0) || '?'}
                              </div>
                            )}
                          </div>
                          <div className={styles.advisorInfo}>
                            <div className={styles.advisorName}>{advisor.fullName}</div>
                            <div className={styles.advisorPhone}>{advisor.phone || '—'}</div>
                            <div className={styles.advisorRoles}>
                              {advisor.roles?.map((r, i) => (
                                <span key={i} className={styles.roleTag}>{r.roleName}</span>
                              ))}
                            </div>
                            {/* Workload badge */}
                            <div className={styles.workloadBadge}>
                              {advisor.isBusy ? (
                                <>
                                  <span className={styles.busyDot} />
                                  <span className={styles.busyLabel}>Bận</span>
                                </>
                              ) : (
                                <>
                                  <span className={styles.freeDot} />
                                  <span className={styles.freeLabel}>Rảnh</span>
                                </>
                              )}
                            </div>
                          </div>
                          {selectedAssistants.includes(advisor.staffId) && (
                            <div className={styles.checkmark}>✓</div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => setShowAdvisorModal(false)}
                disabled={isAssigning}
              >
                Hủy
              </button>
              <button
                className={styles.modalActionBtn}
                onClick={handleConfirmAssignment}
                disabled={!selectedMainAdvisor || isAssigning}
              >
                {isAssigning ? 'Đang phân công...' : 'Xác nhận phân công'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal xem danh sách KTV đã được giao */}
      {showAssignmentsModal && selectedTicket && (
        <div className={styles.modalOverlay} onClick={() => setShowAssignmentsModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Danh sách KTV đã giao — {selectedTicket.ticketCode}</h3>
              <button
                className={styles.modalClose}
                onClick={() => setShowAssignmentsModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Ticket info summary */}
              <div className={styles.ticketSummary}>
                <div className={styles.ticketSummaryItem}>
                  <span className={styles.fieldLabel}>Biển số</span>
                  <span className={styles.fieldValue}>{selectedTicket.licensePlate}</span>
                </div>
                <div className={styles.ticketSummaryItem}>
                  <span className={styles.fieldLabel}>Khách hàng</span>
                  <span className={styles.fieldValue}>{selectedTicket.customerName || '—'}</span>
                </div>
                <div className={styles.ticketSummaryItem}>
                  <span className={styles.fieldLabel}>Trạng thái</span>
                  <span className={styles.fieldValue}>{selectedTicket.ticketStatus}</span>
                </div>
              </div>

              {/* Assignments list */}
              <div className={styles.modalSection}>
                <h4 className={styles.sectionTitle}>Kỹ thuật viên đã được giao</h4>
                {loadingAssignments ? (
                  <div className={styles.loadingAdvisors}>
                    <div className={styles.spinnerSmall}></div>
                    <span>Đang tải danh sách...</span>
                  </div>
                ) : assignments.length === 0 ? (
                  <div className={styles.noAdvisors}>Chưa có KTV nào được giao cho phiếu này</div>
                ) : (
                  <div className={styles.assignmentsList}>
                    {assignments.map((assignment) => (
                      <div key={assignment.assignmentId} className={styles.assignmentCard}>
                        <div className={styles.assignmentHeader}>
                          <div className={styles.assignmentName}>
                            {assignment.staffName}
                            {assignment.isPrimary && (
                              <span className={styles.primaryBadge}>KTV Chính</span>
                            )}
                          </div>
                          <span className={`${styles.assignmentStatus} ${styles[`status${assignment.status}`]}`}>
                            {assignment.status}
                          </span>
                        </div>
                        <div className={styles.assignmentDetails}>
                          <div className={styles.assignmentField}>
                            <span className={styles.fieldLabel}>Vai trò:</span>
                            <span className={styles.fieldValue}>{assignment.roleInTicket}</span>
                          </div>
                          <div className={styles.assignmentField}>
                            <span className={styles.fieldLabel}>Thời gian giao:</span>
                            <span className={styles.fieldValue}>
                              {assignment.assignedAt ? new Date(assignment.assignedAt).toLocaleString('vi-VN') : '—'}
                            </span>
                          </div>
                          {assignment.note && (
                            <div className={styles.assignmentField}>
                              <span className={styles.fieldLabel}>Ghi chú:</span>
                              <span className={styles.fieldValue}>{assignment.note}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => setShowAssignmentsModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Ticket Card Component
const TicketCard = ({ ticket, onAssign, formatDate, isAssigned }) => {
  return (
    <div className={styles.taskCard}>
      <div className={styles.taskHeader}>
        <div className={styles.taskHeaderLeft}>
          <h3 className={styles.taskTitle}>{ticket.ticketCode}</h3>
          <span className={`${styles.priorityBadge} ${isAssigned ? styles.priorityDone : styles.priorityPending}`}>
            {isAssigned ? ticket.ticketStatus : 'Chưa phân công'}
          </span>
        </div>
        <div className={styles.taskHeaderRight}>
          <span className={styles.serviceTag}>{ticket.serviceCategory || '—'}</span>
        </div>
      </div>

      <div className={styles.taskBody}>
        <div className={styles.taskRow}>
          <div className={styles.taskField}>
            <span className={styles.fieldLabel}>Biển số</span>
            <span className={styles.fieldValue}>{ticket.licensePlate || '—'}</span>
          </div>
          <div className={styles.taskField}>
            <span className={styles.fieldLabel}>Hãng / Model</span>
            <span className={styles.fieldValue}>
              {[ticket.vehicleMake, ticket.vehicleModel].filter(Boolean).join(' ') || '—'}
            </span>
          </div>
        </div>

        {ticket.customerName && (
          <div className={styles.taskRow}>
            <div className={styles.taskField}>
              <span className={styles.fieldLabel}>Khách hàng</span>
              <span className={styles.fieldValue}>{ticket.customerName}</span>
            </div>
            {ticket.customerPhone && (
              <div className={styles.taskField}>
                <span className={styles.fieldLabel}>SĐT</span>
                <span className={styles.fieldValue}>{ticket.customerPhone}</span>
              </div>
            )}
          </div>
        )}

        <div className={styles.taskRow}>
          <div className={styles.taskField}>
            <span className={styles.fieldLabel}>Ngày nhận xe</span>
            <span className={styles.fieldValue}>{formatDate(ticket.receivedAt)}</span>
          </div>
          <div className={styles.taskField}>
            <span className={styles.fieldLabel}>Ngày hẹn</span>
            <span className={styles.fieldValue}>
              {ticket.scheduledDate ? formatDate(ticket.scheduledDate) : '—'}
            </span>
          </div>
        </div>

        {ticket.customerRequest && (
          <div className={styles.taskRow}>
            <div className={styles.taskField} style={{ width: '100%' }}>
              <span className={styles.fieldLabel}>Yêu cầu khách hàng</span>
              <p className={styles.customerRequest}>{ticket.customerRequest}</p>
            </div>
          </div>
        )}
      </div>

      <div className={styles.taskFooter}>
        {isAssigned ? (
          <button className={styles.viewButton} onClick={onAssign}>
            Xem phân công
          </button>
        ) : (
          <button className={styles.primaryButton} onClick={onAssign}>
            Phân công KTV
          </button>
        )}
      </div>
    </div>
  );
};

export default AssignAdvisor;
