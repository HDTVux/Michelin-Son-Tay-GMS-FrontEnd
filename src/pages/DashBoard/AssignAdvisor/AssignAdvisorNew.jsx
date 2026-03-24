import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  fetchServiceTicketsPaged,
  fetchTicketAssignments,
} from '../../../services/serviceTicketService';
import styles from './AssignAdvisor.module.css';

const API_BASE = 'http://localhost:8080';

// API functions theo đúng backend Michelin-Son-Tay-GMS_16
const getAvailableStaff = async (ticketId, role, token) => {
  const response = await fetch(
    `${API_BASE}/api/service-ticket/assignment/${ticketId}/available-staff?role=${role}`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  if (!response.ok) throw new Error('Failed to fetch available staff');
  return response.json();
};

const assignStaffToTicket = async (ticketId, assignData, token) => {
  const response = await fetch(
    `${API_BASE}/api/service-ticket/assignment/${ticketId}/assign`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(assignData)
    }
  );
  if (!response.ok) throw new Error('Failed to assign staff');
  return response.json();
};

const AssignAdvisor = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [availableStaff, setAvailableStaff] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [selectedPrimary, setSelectedPrimary] = useState(null);
  const [selectedAssistants, setSelectedAssistants] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [ticketAssignments, setTicketAssignments] = useState({});

  const token = localStorage.getItem('staffToken') || localStorage.getItem('authToken');

  // Load tickets
  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const response = await fetchServiceTicketsPaged({ size: 100 }, token);
      const list = response?.data?.content || [];
      setTickets(list);

      // Xác định ticket đã giao dựa vào ticketStatus
      // CREATED = chưa giao, IN_PROGRESS/COMPLETED = đã giao
      const assignmentStatus = {};
      list.forEach(ticket => {
        assignmentStatus[ticket.serviceTicketId] = 
          ticket.ticketStatus !== 'CREATED' && ticket.ticketStatus !== 'PENDING';
      });
      setTicketAssignments(assignmentStatus);
    } catch (error) {
      toast.error('Không thể tải danh sách phiếu');
    } finally {
      setLoading(false);
    }
  };


  // Load available staff when ticket selected
  const handleSelectTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setShowModal(true);
    setLoadingStaff(true);
    setAvailableStaff([]);
    setSelectedPrimary(null);
    setSelectedAssistants([]);

    try {
      // Call API: GET /api/service-ticket/assignment/{ticketId}/available-staff?role=TECHNICIAN
      const response = await getAvailableStaff(ticket.serviceTicketId, 'TECHNICIAN', token);
      const staffList = response?.data || [];
      setAvailableStaff(staffList);
    } catch (error) {
      console.error('Error loading staff:', error);
      toast.error('Không thể tải danh sách kỹ thuật viên');
    } finally {
      setLoadingStaff(false);
    }
  };

  // Handle assign
  const handleAssign = async () => {
    if (!selectedPrimary) {
      toast.error('Vui lòng chọn KTV chính');
      return;
    }

    setIsAssigning(true);
    try {
      // Assign primary technician
      await assignStaffToTicket(
        selectedTicket.serviceTicketId,
        {
          staffId: selectedPrimary,
          roleInTicket: 'TECHNICIAN',
          isPrimary: true,
          note: ''
        },
        token
      );

      // Assign assistants
      for (const staffId of selectedAssistants) {
        await assignStaffToTicket(
          selectedTicket.serviceTicketId,
          {
            staffId: staffId,
            roleInTicket: 'TECHNICIAN',
            isPrimary: false,
            note: ''
          },
          token
        );
      }

      toast.success('Phân công thành công!');
      setShowModal(false);
      loadTickets(); // Reload
    } catch (error) {
      console.error('Error assigning:', error);
      toast.error('Lỗi khi phân công: ' + (error.message || 'Không xác định'));
    } finally {
      setIsAssigning(false);
    }
  };

  const toggleAssistant = (staffId) => {
    if (staffId === selectedPrimary) {
      toast.warn('Không thể chọn KTV chính làm KTV phụ');
      return;
    }
    setSelectedAssistants(prev =>
      prev.includes(staffId) ? prev.filter(id => id !== staffId) : [...prev, staffId]
    );
  };

  const unassignedTickets = tickets.filter(t => !ticketAssignments[t.serviceTicketId]);
  const assignedTickets = tickets.filter(t => ticketAssignments[t.serviceTicketId]);

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
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Phân công KTV</h1>
          <p className={styles.subtitle}>Giao việc cho kỹ thuật viên</p>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statTotal}`}>
          <div className={styles.statValue}>{tickets.length}</div>
          <div className={styles.statLabel}>Tổng phiếu</div>
        </div>
        <div className={`${styles.statCard} ${styles.statAssigned}`}>
          <div className={styles.statValue}>{unassignedTickets.length}</div>
          <div className={styles.statLabel}>Chưa phân công</div>
        </div>
        <div className={`${styles.statCard} ${styles.statProgress}`}>
          <div className={styles.statValue}>{assignedTickets.length}</div>
          <div className={styles.statLabel}>Đã phân công</div>
        </div>
      </div>

      <div className={styles.ticketsContainer}>
        <div className={styles.ticketColumn}>
          <div className={styles.columnHeader}>
            <h3 className={styles.columnTitle}>Chưa phân công</h3>
            <span className={styles.columnCount}>{unassignedTickets.length}</span>
          </div>
          <div className={styles.tasksList}>
            {unassignedTickets.map(ticket => (
              <div key={ticket.serviceTicketId} className={styles.taskCard}>
                <div className={styles.taskHeader}>
                  <h3 className={styles.taskTitle}>{ticket.ticketCode}</h3>
                  <span className={styles.priorityBadge}>{ticket.ticketStatus}</span>
                </div>
                <div className={styles.taskBody}>
                  <div className={styles.taskField}>
                    <span className={styles.fieldLabel}>Biển số:</span>
                    <span className={styles.fieldValue}>{ticket.licensePlate}</span>
                  </div>
                  <div className={styles.taskField}>
                    <span className={styles.fieldLabel}>Khách hàng:</span>
                    <span className={styles.fieldValue}>{ticket.customerName || '—'}</span>
                  </div>
                </div>
                <button
                  className={styles.primaryButton}
                  onClick={() => handleSelectTicket(ticket)}
                >
                  Phân công KTV
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.ticketColumn}>
          <div className={styles.columnHeader}>
            <h3 className={styles.columnTitle}>Đã phân công</h3>
            <span className={styles.columnCount}>{assignedTickets.length}</span>
          </div>
          <div className={styles.tasksList}>
            {assignedTickets.map(ticket => (
              <div key={ticket.serviceTicketId} className={styles.taskCard}>
                <div className={styles.taskHeader}>
                  <h3 className={styles.taskTitle}>{ticket.ticketCode}</h3>
                  <span className={styles.priorityBadge}>{ticket.ticketStatus}</span>
                </div>
                <div className={styles.taskBody}>
                  <div className={styles.taskField}>
                    <span className={styles.fieldLabel}>Biển số:</span>
                    <span className={styles.fieldValue}>{ticket.licensePlate}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedTicket && (
        <div className={styles.modalOverlay} onClick={() => !isAssigning && setShowModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Phân công KTV — {selectedTicket.ticketCode}</h3>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalSection}>
                <h4 className={styles.sectionTitle}>Chọn KTV chính</h4>
                {loadingStaff ? (
                  <div className={styles.loadingAdvisors}>Đang tải...</div>
                ) : (
                  <div className={styles.advisorGrid}>
                    {availableStaff.map(staff => (
                      <div
                        key={staff.staffId}
                        className={`${styles.advisorCard} ${selectedPrimary === staff.staffId ? styles.advisorSelected : ''}`}
                        onClick={() => setSelectedPrimary(staff.staffId)}
                      >
                        <div className={styles.advisorInfo}>
                          <div className={styles.advisorName}>{staff.fullName}</div>
                          <div className={styles.advisorPhone}>{staff.phone}</div>
                          <div className={styles.advisorRoles}>
                            {staff.roles?.map((r, i) => (
                              <span key={i} className={styles.roleTag}>{r.roleName}</span>
                            ))}
                          </div>
                        </div>
                        {selectedPrimary === staff.staffId && <div className={styles.checkmark}>✓</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedPrimary && availableStaff.length > 1 && (
                <div className={styles.modalSection}>
                  <h4 className={styles.sectionTitle}>Thêm KTV phụ (tùy chọn)</h4>
                  <div className={styles.advisorGrid}>
                    {availableStaff.filter(s => s.staffId !== selectedPrimary).map(staff => (
                      <div
                        key={staff.staffId}
                        className={`${styles.advisorCard} ${selectedAssistants.includes(staff.staffId) ? styles.advisorSelected : ''}`}
                        onClick={() => toggleAssistant(staff.staffId)}
                      >
                        <div className={styles.advisorInfo}>
                          <div className={styles.advisorName}>{staff.fullName}</div>
                          <div className={styles.advisorPhone}>{staff.phone}</div>
                        </div>
                        {selectedAssistants.includes(staff.staffId) && <div className={styles.checkmark}>✓</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.modalCancelBtn} onClick={() => setShowModal(false)} disabled={isAssigning}>
                Hủy
              </button>
              <button
                className={styles.modalActionBtn}
                onClick={handleAssign}
                disabled={!selectedPrimary || isAssigning}
              >
                {isAssigning ? 'Đang phân công...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignAdvisor;
