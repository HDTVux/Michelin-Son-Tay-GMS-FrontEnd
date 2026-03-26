import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import ServiceTicket from '../../Technician/ServiceTicket/ServiceTicket.jsx';
import {
  fetchServiceTicketsPaged,
  fetchAvailableStaffWithWorkload,
  fetchTicketAssignments,
  assignStaff,
  cancelAssignment,
} from '../../../services/serviceTicketService';
import { getSafetyInspectionByTicketCode } from '../../../services/safetyInspectionService';
import styles from './AdvisorInspection.module.css';

const ITEMS_PER_PAGE = 10;

const getToken = () => localStorage.getItem('staffToken') || localStorage.getItem('authToken');
const getTicketCode = (ticket) => ticket?.ticketCode || ticket?.code || '';
const getTicketId = (ticket) => ticket?.serviceTicketId || ticket?.ticketId || ticket?.id || null;
const getTicketStatus = (ticket) => ticket?.status || ticket?.ticketStatus || '';

// Trạng thái phiếu kiểm tra an toàn
const INSPECTION_STATUS_LABELS = {
  PENDING: 'Chờ kiểm tra',
  COMPLETED: 'Đã kiểm tra',
  SKIPPED: 'Đã bỏ qua',
};

export default function AdvisorInspection() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  // Mặc định hiện tất cả phiếu để sau khi COMPLETED vẫn còn trong list advisor
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [inspectionByTicket, setInspectionByTicket] = useState({});

  const [selectedTicketCode, setSelectedTicketCode] = useState('');

  // Modal phân công / xem phân công
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [techList, setTechList] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loadingModal, setLoadingModal] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter === 'ALL') return true;
    const st = String(getInspectionStatusForTicket(t) || '').toUpperCase();
    return st === statusFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const pagedTickets = filteredTickets.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const isInspectionOpen = Boolean(selectedTicketCode);

  const getInspectionStatusDisplay = (status) => INSPECTION_STATUS_LABELS[status?.toUpperCase()] || status || 'Chưa có';

  const getInspectionStatusClass = (status) => {
    const s = status?.toUpperCase();
    if (s === 'PENDING') return styles.statusInspection;
    if (s === 'COMPLETED') return styles.statusCompleted;
    if (s === 'SKIPPED') return styles.statusInactive;
    return styles.statusPending;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('vi-VN');
  };


  const getInspectionStatusForTicket = (ticket) => {
    const code = getTicketCode(ticket);
    return inspectionByTicket[code]?.inspectionStatus || (ticket?.safetyInspectionEnabled ? null : 'SKIPPED');
  };

  // Load ticket list — luôn truyền status = INSPECTION
  useEffect(() => {
    const fetchTickets = async () => {
      const token = getToken();
      if (!token) {
        toast.error('Vui lòng đăng nhập');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Không truyền status để tránh lọc theo service ticket status
        // Advisor sẽ lọc theo inspectionStatus ở frontend
        const backendParams = {
          page: 0,
          size: 200,
          search: searchTerm || undefined,
        };

        const response = await fetchServiceTicketsPaged(backendParams, token);
        if (response?.data) {
          const list = Array.isArray(response.data?.content)
            ? response.data.content
            : Array.isArray(response.data)
              ? response.data
              : [];
          setTickets(list);
          setTotalItems(list.length);

          // Load inspection status cho từng ticket
          const inspectionMap = {};
          await Promise.all(list.map(async (t) => {
            const code = getTicketCode(t);
            if (!code) return;
            try {
              const inspectionRes = await getSafetyInspectionByTicketCode(code, token);
              inspectionMap[code] = {
                inspectionStatus: inspectionRes?.data?.inspectionStatus || null,
                safetyInspectionEnabled: Boolean(inspectionRes?.data),
              };
            } catch {
              // Không có phiếu inspection => coi như SKIPPED nếu ticket không bật kiểm tra an toàn
              inspectionMap[code] = {
                inspectionStatus: t?.safetyInspectionEnabled ? null : 'SKIPPED',
                safetyInspectionEnabled: Boolean(t?.safetyInspectionEnabled),
              };
            }
          }));
          setInspectionByTicket(inspectionMap);

        }
      } catch (error) {
        console.error(error);
        toast.error('Không thể tải danh sách phiếu');
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [currentPage, searchTerm, statusFilter, reloadKey]);

  useEffect(() => {
    if (!selectedTicketCode) return;
    if (tickets.some((t) => getTicketCode(t) === selectedTicketCode)) return;
    setSelectedTicketCode('');
  }, [tickets, selectedTicketCode]);

  // Mở modal: load kỹ thuật viên + phân công hiện tại
  const handleOpenModal = async (ticket) => {
    setSelectedTicket(ticket);
    setShowAssignModal(true);
    setModalError('');
    setModalSuccess('');
    setTechList([]);
    setAssignments([]);
    setLoadingModal(true);

    const token = getToken();
    try {
      const [techRes, assignRes] = await Promise.all([
        fetchAvailableStaffWithWorkload('TECHNICIAN', token),
        fetchTicketAssignments(getTicketId(ticket), token),
      ]);
      setTechList(Array.isArray(techRes?.data) ? techRes.data : []);
      setAssignments(
        Array.isArray(assignRes?.data?.assignments)
          ? assignRes.data.assignments
          : [],
      );
    } catch (err) {
      setModalError(err?.message || 'Không tải được dữ liệu.');
    } finally {
      setLoadingModal(false);
    }
  };

  const handleCloseModal = () => {
    setShowAssignModal(false);
    setSelectedTicket(null);
    setTechList([]);
    setAssignments([]);
    setModalError('');
    setModalSuccess('');
  };

  // Gán kỹ thuật viên
  const handleAssign = async (tech) => {
    const token = getToken();
    const ticketId = getTicketId(selectedTicket);
    setModalError('');
    setModalSuccess('');
    setLoadingModal(true);
    try {
      await assignStaff(ticketId, {
        staffId: tech.staffId,
        roleInTicket: 'TECHNICIAN',
        isPrimary: true,
        note: '',
      }, token);
      setModalSuccess(`Đã phân công KTV: ${tech.fullName || `NV-${tech.staffId}`}`);
      // Reload phân công
      const assignRes = await fetchTicketAssignments(ticketId, token);
      setAssignments(
        Array.isArray(assignRes?.data?.assignments)
          ? assignRes.data.assignments
          : [],
      );
      setReloadKey((k) => k + 1);
    } catch (err) {
      setModalError(err?.message || 'Phân công thất bại.');
    } finally {
      setLoadingModal(false);
    }
  };

  // Hủy phân công
  const handleCancel = async (assignment) => {
    const token = getToken();
    const ticketId = getTicketId(selectedTicket);
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Hủy phân công ${assignment.staffName || 'KTV này'}?`)) return;
    setModalError('');
    setModalSuccess('');
    setLoadingModal(true);
    try {
      await cancelAssignment(ticketId, assignment.assignmentId, token);
      setModalSuccess('Đã hủy phân công.');
      const assignRes = await fetchTicketAssignments(ticketId, token);
      setAssignments(
        Array.isArray(assignRes?.data?.assignments)
          ? assignRes.data.assignments
          : [],
      );
      setReloadKey((k) => k + 1);
    } catch (err) {
      setModalError(err?.message || 'Hủy phân công thất bại.');
    } finally {
      setLoadingModal(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Điều phối kỹ thuật viên & Phiếu kiểm tra an toàn</h1>
      </div>

      <div className={`${styles.splitLayout} ${isInspectionOpen ? styles.splitLayoutOpen : styles.splitLayoutClosed}`}>
        {/* LEFT: Danh sách phiếu */}
        <div className={`${styles.leftPanel} ${isInspectionOpen ? styles.leftPanelCompact : styles.leftPanelExpanded}`}>
          <div className={styles.toolbar}>
            <div className={styles.searchBox}>
              <input
                type="text"
                placeholder="Tìm mã phiếu, biển số, khách hàng..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className={styles.filters}>
              <select
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="ALL">Tất cả</option>
                <option value="PENDING">Chờ kiểm tra</option>
                <option value="COMPLETED">Đã kiểm tra</option>
                <option value="SKIPPED">Đã bỏ qua</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner}></div>
              <p>Đang tải dữ liệu...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className={styles.emptyState}><p>Không có phiếu nào</p></div>
          ) : (
            <div className={styles.tableCard}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Mã phiếu</th>
                    <th>Biển số</th>
                    <th>Khách hàng</th>
                    <th>Ngày đặt</th>
                    <th>Trạng thái kiểm tra</th>
                    <th>Kiểm tra an toàn</th>
                    <th>Phân công</th>
                    <th>Mở phiếu</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedTickets.map((ticket, index) => {
                    const code = getTicketCode(ticket);
                    const selected = selectedTicketCode === code;
                    return (
                      <tr key={code || getTicketId(ticket) || index} className={selected ? styles.selectedRow : ''}>
                        <td>{startIndex + index + 1}</td>
                        <td style={{ fontWeight: 600, color: '#1268d3' }}>{code || '-'}</td>
                        <td>{ticket.licensePlate || '-'}</td>
                        <td>{ticket.customerName || ticket.fullName || '-'}</td>
                        <td>{formatDate(ticket.appointmentDate || ticket.bookingDate || ticket.scheduledDate)}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${getInspectionStatusClass(getInspectionStatusForTicket(ticket))}`}>
                            {getInspectionStatusDisplay(getInspectionStatusForTicket(ticket))}
                          </span>
                        </td>
                        <td>
                          <span className={`${styles.statusBadge} ${ticket?.safetyInspectionEnabled ? styles.statusCompleted : styles.statusInactive}`}>
                            {ticket?.safetyInspectionEnabled ? 'Có' : 'Không'}
                          </span>
                        </td>
                        <td>
                          <button
                            className={`${styles.actionBtn} ${styles.assignBtn}`}
                            onClick={() => handleOpenModal(ticket)}
                            disabled={!getTicketId(ticket)}
                          >
                            Phân công
                          </button>
                        </td>
                        <td>
                          <button
                            className={`${styles.actionBtn} ${selected ? styles.viewBtnActive : styles.viewBtn}`}
                            onClick={() => setSelectedTicketCode(selected ? '' : code)}
                            disabled={!code}
                          >
                            {selected ? 'Đóng' : 'Xem'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filteredTickets.length > 0 && (
            <div className={styles.pagination}>
              <button
                className={styles.paginationBtn}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Trước
              </button>
              <span className={styles.paginationInfo}>
                Trang {currentPage} / {totalPages}
              </span>
              <button
                className={styles.paginationBtn}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                Sau
              </button>
            </div>
          )}
        </div>

        {/* RIGHT: Phiếu kiểm tra chi tiết */}
        {selectedTicketCode && (
          <div className={styles.rightPanel}>
            <ServiceTicket
              key={selectedTicketCode}
              ticketCode={selectedTicketCode}
              mode="advisor"
              backPath="/advisor/inspection"
            />
          </div>
        )}
      </div>

      {/* Modal phân công KTV */}
      {showAssignModal && selectedTicket && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                Phân công KTV — {getTicketCode(selectedTicket) || '-'}
              </h3>
              <button className={styles.modalClose} onClick={handleCloseModal}>×</button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
                Trạng thái kiểm tra: <strong>{getInspectionStatusDisplay(getInspectionStatusForTicket(selectedTicket))}</strong>
              </p>

              {getInspectionStatusForTicket(selectedTicket)?.toUpperCase() === 'COMPLETED' && (
                <div style={{ marginBottom: 12 }}>
                  <button
                    className={styles.modalActionBtn}
                    onClick={() => {
                      const code = getTicketCode(selectedTicket);
                      if (!code) return;
                      handleCloseModal();
                      navigate(`/service-ticket-detail/${encodeURIComponent(code)}`);
                    }}
                  >
                    Sang báo giá (Service Ticket Detail)
                  </button>
                </div>
              )}

              {modalSuccess && <div className={styles.successBanner}>{modalSuccess}</div>}
              {modalError && <div className={styles.errorBanner}>{modalError}</div>}

              {loadingModal && !modalSuccess && (
                <div className={styles.loadingContainer} style={{ minHeight: 80 }}>
                  <div className={styles.spinner}></div>
                  <p>Đang tải...</p>
                </div>
              )}

              {/* Danh sách đã phân công */}
              {!loadingModal && assignments.filter(a => a.status === 'ACTIVE').length > 0 && (
                <div className={styles.assignSection}>
                  <h4 className={styles.sectionTitle}>KTV đã phân công</h4>
                  {assignments
                    .filter(a => a.status === 'ACTIVE')
                    .map(a => (
                      <div key={a.assignmentId} className={styles.assignCard}>
                        <div className={styles.assignInfo}>
                          <span className={styles.assignName}>{a.staffName || `NV-${a.staffId}`}</span>
                          <span className={styles.assignRole}>
                            {a.roleInTicket === 'TECHNICIAN' ? 'Kỹ thuật viên' : a.roleInTicket}
                            {a.isPrimary ? ' (KTV chính)' : ' (KTV phụ)'}
                          </span>
                        </div>
                        <button
                          className={styles.cancelBtn}
                          onClick={() => handleCancel(a)}
                          disabled={loadingModal}
                        >
                          Hủy
                        </button>
                      </div>
                    ))}
                </div>
              )}

              {/* Danh sách KTV để phân công */}
              {!loadingModal && techList.length > 0 && (
                <div className={styles.assignSection}>
                  <h4 className={styles.sectionTitle}>Chọn kỹ thuật viên</h4>
                  {techList.map(tech => (
                    <div key={tech.staffId} className={styles.techCard}>
                      <div className={styles.techInfo}>
                        <span className={styles.techName}>
                          {tech.fullName || `NV-${tech.staffId}`}
                        </span>
                        <span className={styles.techPhone}>{tech.phone || ''}</span>
                      </div>
                      <div className={styles.workloadBadge}>
                        <span className={tech.isBusy ? styles.busy : styles.available}>
                          {tech.workload || 0} phiếu
                          {tech.isBusy ? ' (bận)' : ' (rảnh)'}
                        </span>
                      </div>
                      <button
                        className={styles.assignBtn}
                        onClick={() => handleAssign(tech)}
                        disabled={loadingModal || tech.isBusy}
                      >
                        Phân công
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!loadingModal && techList.length === 0 && !modalError && (
                <div className={styles.emptyState}><p>Không có kỹ thuật viên khả dụng.</p></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
