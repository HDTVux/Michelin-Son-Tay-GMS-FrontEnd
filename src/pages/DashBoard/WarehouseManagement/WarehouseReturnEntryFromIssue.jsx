import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import PropTypes from 'prop-types';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import {
  fetchWarehouseStockIssueDetail,
  createWarehouseReturnEntryFromIssue,
  uploadReturnEntryItemAttachment,
  confirmWarehouseReturnEntry,
  cancelWarehouseReturnEntry,
} from '../../../services/warehouseService.js';
import { fetchManagerEmployees } from '../../../services/managerService.js';
import styles from './WarehouseReturnEntry.module.css';

const RETURN_TYPES = [
  { value: 'CUSTOMER_RETURN', label: 'Khách hàng trả hàng' },
  { value: 'SUPPLIER_RETURN', label: 'Trả nhà cung cấp' },
  { value: 'EXCHANGE', label: 'Đổi hàng' },
];

const DEFECT_CAUSE_OPTIONS = [
  { value: 'TECHNICIAN', label: 'Lỗi do kỹ thuật viên' },
  { value: 'WAREHOUSE', label: 'Lỗi do kho' },
  { value: 'SUPPLIER', label: 'Lỗi từ nhà cung cấp' },
];

function toPositiveInt(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

// ─── Modal hoàn từng sản phẩm (giống ReturnEntryRequestModal) ────────────────

function ItemReturnModal({ open, item, submitting, onClose, onSubmit }) {
  const maxQty = useMemo(() => toPositiveInt(item?.quantity) ?? 1, [item]);
  const [returnReasonType, setReturnReasonType] = useState('WRONG_TYPE');
  const [defectCause, setDefectCause] = useState('');
  const [responsibleStaffId, setResponsibleStaffId] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [conditionNote, setConditionNote] = useState('');
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [staffList, setStaffList] = useState([]);

  useEffect(() => {
    if (!open) return undefined;
    setReturnReasonType('WRONG_TYPE');
    setDefectCause('');
    setResponsibleStaffId('');
    setReturnReason('');
    setQuantity('1');
    setConditionNote('');
    setFiles([]);
    setError('');

    const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
    if (token) {
      fetchManagerEmployees(token)
        .then((res) => {
          const data = res?.data?.data ?? res?.data ?? res ?? [];
          const list = Array.isArray(data) ? data : (Array.isArray(data?.content) ? data.content : []);
          setStaffList(list);
        })
        .catch(() => setStaffList([]));
    }

    const onKey = (e) => { if (e.key === 'Escape' && !submitting) onClose?.(); };
    globalThis.addEventListener?.('keydown', onKey);
    return () => globalThis.removeEventListener?.('keydown', onKey);
  }, [open, onClose, submitting]);

  if (!open) return null;
  const portal = globalThis.document?.body;
  if (!portal) return null;

  const isDefective = returnReasonType === 'DEFECTIVE';
  const needsStaff = isDefective && (defectCause === 'TECHNICIAN' || defectCause === 'WAREHOUSE');

  const handleSubmit = () => {
    const qty = toPositiveInt(quantity);
    const reason = String(returnReason || '').trim();
    const note = String(conditionNote || '').trim();
    const imageFiles = Array.isArray(files) ? files.filter(Boolean) : [];

    if (!reason) { setError('Vui lòng nhập lý do hoàn trả.'); return; }
    if (!qty) { setError('Số lượng phải lớn hơn 0.'); return; }
    if (qty > maxQty) { setError(`Số lượng tối đa là ${maxQty}.`); return; }
    if (!note) { setError('Vui lòng nhập ghi chú tình trạng.'); return; }
    if (imageFiles.length === 0) { setError('Vui lòng chọn ít nhất 1 ảnh tình trạng.'); return; }
    if (isDefective && !defectCause) { setError('Vui lòng chọn nguyên nhân lỗi.'); return; }
    if (needsStaff && !responsibleStaffId) { setError('Vui lòng chọn nhân viên chịu trách nhiệm.'); return; }

    setError('');
    onSubmit?.({
      returnReasonType,
      defectCause: isDefective ? defectCause : undefined,
      responsibleStaffId: needsStaff && responsibleStaffId ? Number(responsibleStaffId) : undefined,
      returnReason: reason,
      quantity: qty,
      conditionNote: note,
      files: imageFiles,
    });
  };

  return createPortal(
    <div className={styles.returnModalOverlay}>
      <dialog className={styles.returnModal} open aria-modal="true" aria-labelledby="ret-modal-title">
        <div className={styles.returnModalHeader}>
          <div>
            <h3 id="ret-modal-title" className={styles.returnModalTitle}>Thông tin hoàn sản phẩm</h3>
            <p className={styles.returnModalSubtitle}>{String(item?.itemName || '').trim() || 'Sản phẩm'}</p>
          </div>
          <button type="button" className="ui-btn ui-btn--ghost" onClick={onClose} disabled={submitting}>Đóng</button>
        </div>

        <div className={styles.returnModalBody}>
          <div className="ui-field">
            <label htmlFor="ret-type">Phân loại hoàn hàng (<span className={styles.required}>*</span>)</label>
            <select id="ret-type" value={returnReasonType}
              onChange={(e) => { setReturnReasonType(e.target.value); setDefectCause(''); setResponsibleStaffId(''); }}
              disabled={submitting}>
              <option value="WRONG_TYPE">Xuất nhầm kiểu / mẫu</option>
              <option value="DEFECTIVE">Hàng bị lỗi</option>
            </select>
          </div>

          {isDefective && (
            <>
              <div className="ui-field">
                <label htmlFor="ret-cause">Nguyên nhân lỗi (<span className={styles.required}>*</span>)</label>
                <select id="ret-cause" value={defectCause}
                  onChange={(e) => { setDefectCause(e.target.value); setResponsibleStaffId(''); }}
                  disabled={submitting}>
                  <option value="">-- Chọn nguyên nhân --</option>
                  {DEFECT_CAUSE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              {needsStaff && (
                <div className="ui-field">
                  <label htmlFor="ret-staff">Nhân viên chịu trách nhiệm (<span className={styles.required}>*</span>)</label>
                  <select id="ret-staff" value={responsibleStaffId}
                    onChange={(e) => setResponsibleStaffId(e.target.value)} disabled={submitting}>
                    <option value="">-- Chọn nhân viên --</option>
                    {staffList.map((s) => (
                      <option key={s.staffId} value={s.staffId}>{s.fullName || s.name || `NV #${s.staffId}`}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          <div className="ui-field">
            <label htmlFor="ret-reason">Lý do hoàn trả (<span className={styles.required}>*</span>)</label>
            <textarea id="ret-reason" value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="Nhập lý do hoàn trả..." disabled={submitting} rows={3} />
          </div>

          <div className={styles.returnModalGrid}>
            <div className="ui-field">
              <label htmlFor="ret-qty">Số lượng hoàn (<span className={styles.required}>*</span>)</label>
              <input id="ret-qty" type="number" min="1" max={maxQty} step="1"
                value={quantity} onChange={(e) => setQuantity(e.target.value)} disabled={submitting} />
              <div className={styles.fieldHint}>Tối đa: {maxQty}</div>
            </div>
            <div className="ui-field">
              <label htmlFor="ret-files">Ảnh tình trạng (<span className={styles.required}>*</span>)</label>
              <input id="ret-files" type="file" accept="image/*" multiple
                onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 5))}
                disabled={submitting} />
              {files.length > 0 && (
                <div className={styles.fieldHint}>{files.length} ảnh đã chọn</div>
              )}
            </div>
          </div>

          <div className="ui-field">
            <label htmlFor="ret-note">Ghi chú tình trạng (<span className={styles.required}>*</span>)</label>
            <input id="ret-note" value={conditionNote}
              onChange={(e) => setConditionNote(e.target.value)}
              placeholder="VD: Vỏ bị nứt, xước..." disabled={submitting} />
          </div>

          {error && <div className={styles.errorBanner}>{error}</div>}
        </div>

        <div className={styles.returnModalActions}>
          <button type="button" className="ui-btn ui-btn--ghost" onClick={onClose} disabled={submitting}>Hủy</button>
          <button type="button" className="ui-btn ui-btn--primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Đang xử lý...' : 'Xác nhận'}
          </button>
        </div>
      </dialog>
    </div>,
    portal,
  );
}

ItemReturnModal.propTypes = {
  open: PropTypes.bool,
  item: PropTypes.object,
  submitting: PropTypes.bool,
  onClose: PropTypes.func,
  onSubmit: PropTypes.func,
};

// ─── Trang chính ─────────────────────────────────────────────────────────────

export default function WarehouseReturnEntryFromIssue() {
  useScrollToTop();
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  const issueId = Number(params.issueId);
  const [issue, setIssue] = useState(location.state?.issue || null);
  const [loading, setLoading] = useState(!issue);
  const [pageError, setPageError] = useState('');

  // items đã configure để hoàn: { itemId, itemName, allocationId, quantity, maxQty,
  //   returnReasonType, defectCause, responsibleStaffId, returnReason, conditionNote, files[] }
  const [configuredItems, setConfiguredItems] = useState([]);

  // modal state
  const [modalItem, setModalItem] = useState(null); // issue item đang mở modal
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // global
  const [returnType, setReturnType] = useState('CUSTOMER_RETURN');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // tải phiếu xuất
  useEffect(() => {
    if (issue) return;
    if (!Number.isFinite(issueId) || issueId <= 0) {
      setPageError('Mã phiếu xuất không hợp lệ.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        const resp = await fetchWarehouseStockIssueDetail(issueId, token);
        const data = resp?.data?.data ?? resp?.data ?? resp;
        if (cancelled) return;
        setIssue(data && typeof data === 'object' ? data : null);
      } catch (err) {
        if (cancelled) return;
        setPageError(err?.message || 'Không thể tải chi tiết phiếu xuất.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [issueId, issue]);

  const availableItems = useMemo(() =>
    Array.isArray(issue?.items) ? issue.items : [], [issue]);

  // số lượng đã configure cho itemId
  const configuredQtyById = useMemo(() => {
    const m = {};
    for (const c of configuredItems) m[c.itemId] = c.quantity;
    return m;
  }, [configuredItems]);

  const openModal = useCallback((item) => {
    if (!item.allocationId) {
      toast.error('Sản phẩm này không có allocation. Chỉ áp dụng cho phiếu SERVICE_TICKET.');
      return;
    }
    setModalItem(item);
  }, []);

  const closeModal = useCallback(() => {
    if (modalSubmitting) return;
    setModalItem(null);
  }, [modalSubmitting]);

  const handleModalSubmit = useCallback((formData) => {
    if (!modalItem) return;
    setConfiguredItems((prev) => {
      const others = prev.filter((c) => c.itemId !== modalItem.itemId);
      return [
        ...others,
        {
          itemId: modalItem.itemId,
          itemName: modalItem.itemName,
          allocationId: modalItem.allocationId,
          maxQty: modalItem.quantity,
          quantity: formData.quantity,
          returnReasonType: formData.returnReasonType,
          defectCause: formData.defectCause,
          responsibleStaffId: formData.responsibleStaffId,
          returnReason: formData.returnReason,
          conditionNote: formData.conditionNote,
          files: formData.files,
        },
      ];
    });
    setModalItem(null);
  }, [modalItem]);

  const removeItem = useCallback((itemId) => {
    setConfiguredItems((prev) => prev.filter((c) => c.itemId !== itemId));
  }, []);

  const handleSubmit = async () => {
    if (configuredItems.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 sản phẩm cần hoàn.');
      return;
    }
    const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
    if (!token) { toast.error('Vui lòng đăng nhập.'); return; }

    setIsSubmitting(true);
    try {
      // Bước 1: Tạo phiếu hoàn (SUBMITTED)
      const payload = {
        issueId,
        returnReason: configuredItems.map((c) => c.returnReason).join('; '),
        returnType: returnType || 'CUSTOMER_RETURN',
        items: configuredItems.map((c) => ({
          allocationId: c.allocationId,
          quantity: c.quantity,
          conditionNote: c.conditionNote || null,
          returnReason: c.returnReasonType || 'WRONG_TYPE',
          defectCause: c.defectCause || null,
          responsibleStaffId: c.responsibleStaffId || null,
        })),
      };

      const res = await createWarehouseReturnEntryFromIssue(payload, token);
      const returnEntry = res?.data?.data ?? res?.data ?? res;
      const returnId = returnEntry?.returnId;

      if (!returnId) {
        toast.error('Không nhận được mã phiếu hoàn từ server.');
        return;
      }

      toast.success(`Đã tạo phiếu hoàn ${returnEntry.returnCode || `#${returnId}`}`);

      // Bước 2: Upload ảnh cho từng item
      const returnItems = Array.isArray(returnEntry?.items) ? returnEntry.items : [];
      let uploadErrors = 0;

      for (const configured of configuredItems) {
        // Tìm returnItemId tương ứng với allocationId này
        const matchedItem = returnItems.find(
          (ri) => ri.allocationId === configured.allocationId
        ) || returnItems.find(
          (ri) => ri.itemId === configured.itemId
        );

        if (!matchedItem?.returnItemId) {
          uploadErrors++;
          continue;
        }

        for (const file of (configured.files || [])) {
          try {
            await uploadReturnEntryItemAttachment(matchedItem.returnItemId, file, token);
          } catch {
            uploadErrors++;
          }
        }
      }

      if (uploadErrors > 0) {
        toast.warn(`Tạo phiếu thành công nhưng ${uploadErrors} ảnh upload thất bại. Vui lòng thêm ảnh thủ công trước khi xác nhận.`);
      } else {
        toast.success('Đã upload ảnh tình trạng thành công.');
      }

      // Bước 3: Chuyển sang trang chi tiết phiếu hoàn để confirm/cancel
      navigate(`/warehouse-return-entries/${returnId}`);
    } catch (err) {
      toast.error(err?.message || 'Không thể tạo phiếu hoàn.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Guards ──
  if (loading) {
    return (
      <div className={styles.page}><div className={styles.shell}>
        <p className={styles.emptyText}>Đang tải thông tin phiếu xuất...</p>
      </div></div>
    );
  }
  if (pageError) {
    return (
      <div className={styles.page}><div className={styles.shell}>
        <p className={styles.error}>{pageError}</p>
        <button type="button" onClick={() => navigate(-1)}>Quay lại</button>
      </div></div>
    );
  }
  if (!issue) {
    return (
      <div className={styles.page}><div className={styles.shell}>
        <p className={styles.emptyText}>Không tìm thấy phiếu xuất.</p>
        <button type="button" onClick={() => navigate(-1)}>Quay lại</button>
      </div></div>
    );
  }
  const statusValue = String(issue?.status || '').toUpperCase();
  if (statusValue !== 'CONFIRMED') {
    return (
      <div className={styles.page}><div className={styles.shell}>
        <p className={styles.error}>
          Chỉ có thể tạo phiếu hoàn từ phiếu xuất đã CONFIRMED. Trạng thái hiện tại: {statusValue}
        </p>
        <button type="button" onClick={() => navigate(-1)}>Quay lại</button>
      </div></div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Tạo phiếu hoàn từ phiếu xuất</h1>
            <p className={styles.subtitle}>
              Phiếu xuất: {issue?.issueCode || `#${issueId}`}
              {issue?.serviceTicketCode ? ` | Phiếu dịch vụ: ${issue.serviceTicketCode}` : ''}
            </p>
          </div>
          <button type="button" className={styles.backButton} onClick={() => navigate(-1)}>
            Quay lại
          </button>
        </header>

        {/* Thông tin chung */}
        <section className={styles.card}>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Kho</span>
              <input type="text" value={issue?.warehouseName || '-'} disabled />
            </label>
            <label className={styles.field}>
              <span>Loại trả hàng</span>
              <select value={returnType} onChange={(e) => setReturnType(e.target.value)} disabled={isSubmitting}>
                {RETURN_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
          </div>
        </section>

        {/* Danh sách sản phẩm */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Sản phẩm trong phiếu xuất ({availableItems.length} mặt hàng)</h2>
          </div>

          {availableItems.length === 0 ? (
            <p className={styles.empty}>Không có sản phẩm nào trong phiếu xuất.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Tên sản phẩm</th>
                    <th>Mã lô</th>
                    <th className={styles.tdCenter}>SL xuất</th>
                    <th className={styles.tdCenter}>SL hoàn</th>
                    <th className={styles.tdCenter}>Phân loại</th>
                    <th className={styles.tdCenter}>Ảnh</th>
                    <th className={styles.tdCenter}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {availableItems.map((item) => {
                    const cfg = configuredItems.find((c) => c.itemId === item.itemId);
                    const hasAllocation = Boolean(item.allocationId);
                    return (
                      <tr key={item.itemId}>
                        <td><strong>{item.itemName || '-'}</strong></td>
                        <td>{item.entryLotCode || '-'}</td>
                        <td className={styles.tdCenter}>{item.quantity}</td>
                        <td className={styles.tdCenter}>
                          {cfg ? (
                            <span className={styles.badge}>{cfg.quantity}</span>
                          ) : '-'}
                        </td>
                        <td className={styles.tdCenter}>
                          {cfg ? (
                            <span className={cfg.returnReasonType === 'DEFECTIVE' ? styles.badgeDefective : styles.badgeOk}>
                              {cfg.returnReasonType === 'DEFECTIVE' ? 'Hàng lỗi' : 'Xuất nhầm'}
                            </span>
                          ) : '-'}
                        </td>
                        <td className={styles.tdCenter}>
                          {cfg ? (
                            <span className={styles.fieldHint}>{cfg.files?.length ?? 0} ảnh</span>
                          ) : '-'}
                        </td>
                        <td className={styles.tdCenter}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                            {hasAllocation ? (
                              <button type="button" className="ui-btn ui-btn--ghost"
                                onClick={() => openModal(item)} disabled={isSubmitting}>
                                {cfg ? 'Sửa' : 'Hoàn trả'}
                              </button>
                            ) : (
                              <span className={styles.emptyText} style={{ fontSize: 12 }}>Không có allocation</span>
                            )}
                            {cfg && (
                              <button type="button" className="ui-btn ui-btn--ghost"
                                onClick={() => removeItem(item.itemId)} disabled={isSubmitting}
                                style={{ color: 'var(--ui-danger, #dc2626)' }}>
                                Bỏ
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Tóm tắt các sản phẩm đã chọn */}
        {configuredItems.length > 0 && (
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Sản phẩm sẽ hoàn ({configuredItems.length})</h2>
            </div>
            <ul style={{ padding: '0 16px', margin: 0, lineHeight: '2' }}>
              {configuredItems.map((c) => (
                <li key={c.itemId}>
                  <strong>{c.itemName}</strong> — {c.quantity} cái
                  {' '}({c.returnReasonType === 'DEFECTIVE' ? '⚠ Hàng lỗi' : 'Xuất nhầm'})
                  {' '}— {c.files?.length ?? 0} ảnh
                </li>
              ))}
            </ul>
            <p style={{ padding: '8px 16px', margin: 0, fontSize: 13, color: 'var(--ui-muted, #6b7280)' }}>
              Sau khi tạo, phiếu hoàn sẽ ở trạng thái <strong>Đã gửi</strong>. Cần xác nhận để cập nhật kho.
            </p>
          </section>
        )}

        <section className={styles.footerActions}>
          <button type="button" className={styles.ghostButton}
            onClick={() => navigate(-1)} disabled={isSubmitting}>
            Hủy
          </button>
          <button type="button" className={styles.primaryButton}
            onClick={handleSubmit}
            disabled={isSubmitting || configuredItems.length === 0}>
            {isSubmitting ? 'Đang tạo phiếu & upload ảnh...' : `Tạo phiếu hoàn (${configuredItems.length} sản phẩm)`}
          </button>
        </section>
      </div>

      {/* Modal per-item */}
      <ItemReturnModal
        open={Boolean(modalItem)}
        item={modalItem}
        submitting={modalSubmitting}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
}
