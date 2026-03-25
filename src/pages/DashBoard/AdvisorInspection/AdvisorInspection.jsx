import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  addCustomCategory,
  getSafetyInspectionByTicketCode,
  getSafetyInspectionItems,
  reopenSafetyInspection,
  updateAdvisorNote,
  updateAdvisorNotes,
} from '../../../services/safetyInspectionService';
import styles from './AdvisorInspection.module.css';

const getAuthToken = () =>
  localStorage.getItem('staffToken') ||
  localStorage.getItem('authToken') ||
  '';

const statusText = (status) => {
  const key = String(status || '').toUpperCase();
  if (key === 'PENDING') return 'Đang kiểm tra';
  if (key === 'SKIPPED') return 'Đã bỏ qua';
  if (key === 'COMPLETED') return 'Đã hoàn thành';
  return key || '-';
};

const statusClass = (status) => {
  const key = String(status || '').toUpperCase();
  if (key === 'PENDING') return styles.statusPending;
  if (key === 'COMPLETED') return styles.statusActive;
  return styles.statusInactive;
};

export default function AdvisorInspection() {
  const { ticketCode } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inspection, setInspection] = useState(null);
  const [items, setItems] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');

  const inspectionId = inspection?.inspectionId;

  const loadData = async () => {
    const token = getAuthToken();
    if (!token) {
      toast.error('Vui lòng đăng nhập');
      navigate('/login');
      return;
    }

    if (!ticketCode) {
      toast.error('Thiếu mã phiếu dịch vụ');
      return;
    }

    setLoading(true);

    try {
      const inspectionRes = await getSafetyInspectionByTicketCode(ticketCode, token);
      const inspectionData = inspectionRes?.data || null;
      setInspection(inspectionData);

      if (inspectionData?.inspectionId) {
        const itemsRes = await getSafetyInspectionItems(inspectionData.inspectionId, token);
        const rows = Array.isArray(itemsRes?.data) ? itemsRes.data : [];
        setItems(
          rows.map((item) => ({
            itemId: item.itemId,
            workCategoryId: item.workCategoryId ?? null,
            customCategoryId: item.customCategoryId ?? null,
            categoryName: item.categoryName || '-',
            advisorNote: item.advisorNote || '',
          })),
        );
      } else {
        setItems([]);
      }
    } catch (err) {
      setInspection(null);
      setItems([]);
      toast.error(err?.message || 'Không tải được dữ liệu kiểm tra an toàn');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketCode]);

  const sortedItems = useMemo(() => {
    const clone = [...items];
    clone.sort((a, b) => {
      if (a.customCategoryId && !b.customCategoryId) return 1;
      if (!a.customCategoryId && b.customCategoryId) return -1;
      return String(a.categoryName).localeCompare(String(b.categoryName), 'vi');
    });
    return clone;
  }, [items]);

  const handleChangeNote = (itemId, value) => {
    setItems((prev) => prev.map((item) => (item.itemId === itemId ? { ...item, advisorNote: value } : item)));
  };

  const handleSaveOne = async (item) => {
    const token = getAuthToken();
    if (!token || !inspectionId) return;

    setSaving(true);
    try {
      await updateAdvisorNote(
        inspectionId,
        {
          workCategoryId: item.workCategoryId,
          customCategoryId: item.customCategoryId,
          advisorNote: item.advisorNote,
        },
        token,
      );
      toast.success('Đã lưu ghi chú.');
    } catch (err) {
      toast.error(err?.message || 'Lưu ghi chú thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    const token = getAuthToken();
    if (!token || !inspectionId) return;

    const payloadItems = items
      .filter((item) => String(item.advisorNote || '').trim() !== '')
      .map((item) => ({
        workCategoryId: item.workCategoryId,
        customCategoryId: item.customCategoryId,
        advisorNote: item.advisorNote,
      }));

    setSaving(true);
    try {
      await updateAdvisorNotes(inspectionId, payloadItems, token);
      toast.success('Đã lưu toàn bộ ghi chú.');
    } catch (err) {
      toast.error(err?.message || 'Lưu ghi chú thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = async () => {
    const token = getAuthToken();
    if (!token || !inspectionId) return;

    const name = newCategoryName.trim();
    if (!name) {
      toast.error('Vui lòng nhập tên hạng mục tùy chỉnh.');
      return;
    }

    setSaving(true);
    try {
      await addCustomCategory(
        inspectionId,
        {
          categoryName: name,
          displayOrder: items.length + 1,
        },
        token,
      );
      setNewCategoryName('');
      toast.success('Đã thêm hạng mục tùy chỉnh.');
      await loadData();
    } catch (err) {
      toast.error(err?.message || 'Không thêm được hạng mục tùy chỉnh.');
    } finally {
      setSaving(false);
    }
  };

  const handleReopen = async () => {
    const token = getAuthToken();
    if (!token || !ticketCode) return;

    setSaving(true);
    try {
      await reopenSafetyInspection(ticketCode, token);
      toast.success('Đã mở lại phiếu kiểm tra an toàn.');
      await loadData();
    } catch (err) {
      toast.error(err?.message || 'Mở lại phiếu thất bại.');
    } finally {
      setSaving(false);
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

  if (!inspection) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Phiếu kiểm tra - Cố vấn viên</h1>
          <button className={styles.backButton} onClick={() => navigate('/advisor/inspection/list')}>← Quay lại</button>
        </div>
        <div className={styles.emptyState}>
          <p>Không tìm thấy phiếu kiểm tra cho mã {ticketCode}.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Phiếu kiểm tra - Cố vấn viên</h1>
        <button className={styles.backButton} onClick={() => navigate('/advisor/inspection/list')}>← Quay lại</button>
      </div>

      <div className={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h2 className={styles.sectionTitle}>Mã phiếu: {ticketCode}</h2>
            <p className={styles.subtitle}>Inspection ID: #{inspection.inspectionId}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className={`${styles.statusBadge} ${statusClass(inspection.inspectionStatus)}`}>
              {statusText(inspection.inspectionStatus)}
            </span>
            {String(inspection.inspectionStatus || '').toUpperCase() === 'COMPLETED' && (
              <button className={styles.saveBtn} onClick={handleReopen} disabled={saving}>
                Mở lại phiếu
              </button>
            )}
          </div>
        </div>

        <div className={styles.ticketInfo}>
          <div className={styles.ticketInfoItem}>
            <span className={styles.ticketInfoLabel}>Service Ticket ID:</span>
            <span className={styles.ticketInfoValue}>#{inspection.serviceTicketId || '-'}</span>
          </div>
          <div className={styles.ticketInfoItem}>
            <span className={styles.ticketInfoLabel}>Technician ID:</span>
            <span className={styles.ticketInfoValue}>#{inspection.technicianId || '-'}</span>
          </div>
        </div>

        <h3 className={styles.sectionTitle} style={{ marginTop: '24px' }}>Thêm hạng mục tùy chỉnh</h3>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <input
            type="text"
            className={styles.noteInput}
            style={{ maxWidth: '360px' }}
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Ví dụ: Kiểm tra đèn hậu"
          />
          <button className={styles.saveBtn} onClick={handleAddCategory} disabled={saving}>
            Thêm hạng mục
          </button>
        </div>

        <h3 className={styles.sectionTitle}>Danh sách hạng mục kiểm tra</h3>

        {sortedItems.length > 0 ? (
          <>
            <div className={styles.tableCard}>
              <div className={styles.safetyTable}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '36%' }}>HẠNG MỤC</th>
                      <th style={{ width: '16%' }}>LOẠI</th>
                      <th style={{ width: '34%' }}>GHI CHÚ ADVISOR</th>
                      <th style={{ width: '14%' }}>HÀNH ĐỘNG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedItems.map((item) => (
                      <tr key={item.itemId}>
                        <td className={styles.itemName}>{item.categoryName}</td>
                        <td>{item.customCategoryId ? 'CUSTOM' : 'DEFAULT'}</td>
                        <td>
                          <input
                            type="text"
                            value={item.advisorNote || ''}
                            onChange={(e) => handleChangeNote(item.itemId, e.target.value)}
                            className={styles.noteInput}
                            placeholder="Nhập ghi chú cho hạng mục này..."
                          />
                        </td>
                        <td>
                          <button className={styles.saveBtn} onClick={() => handleSaveOne(item)} disabled={saving}>
                            Lưu
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className={styles.saveAllBtn} onClick={handleSaveAll} disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu tất cả ghi chú'}
              </button>
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            <p>Không có hạng mục kiểm tra nào.</p>
          </div>
        )}
      </div>
    </div>
  );
}
