import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { fetchServiceTicketsPaged, fetchAvailableStaff, assignStaff } from '../../../services/serviceTicketService';
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

  // Fetch tickets from API
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const token = localStorage.getItem('staffToken') || localStorage.getItem('authToken');
        if (!token) {
          toast.error('Vui lòng đăng nhập');
          setLoading(false);
          return;
        }

        const response = await fetchServiceTicketsPaged({ status: 'CREATED', size: 100 }, token);
        const list = response?.data?.content || response?.data || [];
        setTickets(list);
      } catch (error) {
        console.error('Error fetching tickets:', error);
        toast.error('Không thể tải danh sách ticket');
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  // Fetch available advisors when a ticket is selected
  useEffect(() => {
    if (!selectedTicket) {
      setAdvisors([]);
      return;
    }

    const fetchAdvisors = async () => {
      const token = localStorage.getItem('staffToken') || localStorage.getItem('authToken');
      if (!token) return;

      setLoadingAdvisors(true);
      setAdvisors([]);
      setSelectedMainAdvisor(null);
      setSelectedAssistants([]);
      try {
        const response = await fetchAvailableStaff(selectedTicket.serviceTicketId, 'TECHNICIAN', token);
        const staffList = response?.data || [];
        // Chuẩn hóa roleCode: lấy roleCode hợp lệ, fallback về TECHNICIAN
        const normalized = staffList.map(staff => {
          const techRole = staff.roles?.find(r => r.roleCode === 'TECHNICIAN');
          return {
            ...staff,
            normalizedRoleCode: techRole?.roleCode || 'TECHNICIAN'
          };
        });
        setAdvisors(normalized);
      } catch (error) {
        console.error('Error loading advisors:', error);
        toast.error('Không thể tải danh sách KTV');
      } finally {
        setLoadingAdvisors(false);
      }
    };

    fetchAdvisors();
  }, [selectedTicket]);

  // Stats
  const stats = {
    total: tickets.length,
    assigned: tickets.filter(t => t.ticketStatus !== 'CREATED').length,
    pending: tickets.filter(t => t.ticketStatus === 'CREATED').length,
  };

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchStatus = filterStatus === 'all' || ticket.ticketStatus === filterStatus;
    const matchService = filterService === 'all' || (ticket.serviceCategory || '').toLowerCase().includes(filterService.toLowerCase());
    const matchSearch = !searchTerm ||
      (ticket.ticketCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.licensePlate || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.customerName || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchService && matchSearch;
  });

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
    setShowAdvisorModal(true);
  };

  const handleSelectMain = (staffId) => {
    setSelectedMainAdvisor(staffId);
  };

  const toggleAssistant = (staffId) => {
    if (staffId === selectedMainAdvisor) return;
    setSelectedAssistants(prev =>
      prev.includes(staffId) ? prev.filter(id => id !== staffId) : [...prev, staffId]
    );
  };

  const handleConfirmAssignment = async () => {
    if (!selectedMainAdvisor) {
      toast.error('Vui lòng chọn KTV chính');
      return;
    }

    const token = localStorage.getItem('staffToken') || localStorage.getItem('authToken');
    setIsAssigning(true);
    try {
      const mainAdvisor = advisors.find(a => a.staffId === selectedMainAdvisor);
      await assignStaff(selectedTicket.serviceTicketId, {
        staffId: selectedMainAdvisor,
        roleInTicket: mainAdvisor?.normalizedRoleCode || 'TECHNICIAN',
        isPrimary: true,
        note: ''
      }, token);

      if (selectedAssistants.length > 0) {
        for (const asId of selectedAssistants) {
          const assistant = advisors.find(a => a.staffId === asId);
          await assignStaff(selectedTicket.serviceTicketId, {
            staffId: asId,
            roleInTicket: assistant?.normalizedRoleCode || 'TECHNICIAN',
            isPrimary: false,
            note: ''
          }, token);
        }
      }

      toast.success('Phân công thành công!');
      setShowAdvisorModal(false);
      setSelectedTicket(null);

      // Refresh ticket list
      setLoading(true);
      const response = await fetchServiceTicketsPaged({ status: 'CREATED', size: 100 }, token);
      const list = response?.data?.content || response?.data || [];
      setTickets(list);
      setLoading(false);
    } catch (error) {
      console.error('Error assigning:', error);
      toast.error('Lỗi khi phân công: ' + (error.message || 'Không xác định'));
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

      {/* Ticket List */}
      <div className={styles.tasksList}>
        {filteredTickets.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>Không có phiếu nào</p>
            <p className={styles.emptySubtext}>Không có phiếu dịch vụ nào phù hợp với bộ lọc</p>
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <TicketCard
              key={ticket.ticketCode}
              ticket={ticket}
              onAssign={() => handleTicketClick(ticket)}
              formatDate={formatDate}
            />
          ))
        )}
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
                        className={`${styles.advisorCard} ${selectedMainAdvisor === advisor.staffId ? styles.advisorSelected : ''}`}
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
                          className={`${styles.advisorCard} ${styles.advisorAssistant} ${selectedAssistants.includes(advisor.staffId) ? styles.advisorAssistantSelected : ''}`}
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
    </div>
  );
};

// Ticket Card Component
const TicketCard = ({ ticket, onAssign, formatDate }) => {
  const isPending = ticket.ticketStatus === 'CREATED';

  return (
    <div className={styles.taskCard}>
      <div className={styles.taskHeader}>
        <div className={styles.taskHeaderLeft}>
          <h3 className={styles.taskTitle}>{ticket.ticketCode}</h3>
          <span className={`${styles.priorityBadge} ${isPending ? styles.priorityPending : styles.priorityDone}`}>
            {isPending ? 'Chưa phân công' : ticket.ticketStatus}
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
        {isPending ? (
          <>
            <button className={styles.primaryButton} onClick={onAssign}>
              Phân công KTV
            </button>
          </>
        ) : (
          <button className={styles.secondaryButton} onClick={onAssign}>
            Xem phân công
          </button>
        )}
      </div>
    </div>
  );
};

export default AssignAdvisor;
