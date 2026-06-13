import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { formatDateTimeViNoSeconds } from '../../../components/timeUtils.js';
import {
  cancelWarehouseReturnEntry,
  confirmWarehouseReturnEntry,
  fetchWarehouseReturnEntryDetail,
} from '../../../services/warehouseService.js';
import { getStatusTextVi, getStatusTone } from '../../../components/statusUtils.js';
import commonStyles from '../common/ManagementCommon.module.css';
import styles from './WarehouseReturnEntryDetail.module.css';

const RETURN_TYPE_LABELS = {
  CUSTOMER_RETURN: 'Khách trả hàng',
  INTERNAL_RETURN: 'Hoàn trả nội bộ',
  SUPPLIER_RETURN: 'Trả nhà cung cấp',
};

const RETURN_REASON_LABELS = {
  WRONG_TYPE: 'Xuất nhầm kiểu/mẫu',
  DEFECTIVE: 'Hàng bị lỗi',
};

const DEFECT_CAUSE_LABELS = {
  TECHNICIAN: 'Lỗi KTV',
  WAREHOUSE: 'Lỗi kho',
  SUPPLIER: 'Lỗi nhà cung cấp',
};

const badgeClassByStatus = (status) => {
  const tone = getStatusTone(status, 'info');
  if (tone === 'success') return commonStyles.badgeSuccess;
  if (tone === 'warning') return commonStyles.badgeWarning;
  if (tone === 'danger') return commonStyles.badgeDanger;
  return commonStyles.badgeMuted;
};

const unwrapResponseData = (response) => response?.data?.data ?? response?.data ?? response;

const formatMoneyVnd = (value) => {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  if (!Number.isFinite(n)) return '-';
  return `${new Intl.NumberFormat('vi-VN').format(n)}đ`;
};

const formatNumber = (value) => {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  if (!Number.isFinite(n)) return value ?? '-';
  return new Intl.NumberFormat('vi-VN').format(n);
};

const getReturnTypeLabel = (value) => {
  const raw = String(value || '').trim().toUpperCase();
  return RETURN_TYPE_LABELS[raw] || raw || '-';
};

const EntryField = ({ label, value, fullRow = false }) => (
  <div className={fullRow ? styles.fullRow : undefined}>
    <strong>{label}:</strong> {value}
  </div>
);

EntryField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
  fullRow: PropTypes.bool,
};

const EntrySummaryCard = ({ entry, statusLabel, statusValue }) => (
  <section className={styles.card}>
    <div className={styles.headerRow}>
      <div className={styles.titleBlock}>
        <div className={styles.entryCode}>{entry?.returnCode || `#${entry?.returnId || '-'}`}</div>
        <span className={`${commonStyles.badge} ${badgeClassByStatus(statusValue)}`}>{statusLabel}</span>
      </div>
    </div>

    <div className={styles.detailGrid}>
      <EntryField label="Mã phiếu trả" value={entry?.returnCode || '-'} />
      <EntryField label="Trạng thái" value={getStatusTextVi(entry?.status, entry?.status || '-')} />
      <EntryField label="Loại trả hàng" value={getReturnTypeLabel(entry?.returnType)} />
      <EntryField label="Kho" value={entry?.warehouseName || entry?.warehouseCode || entry?.warehouseId || '-'} />
      <EntryField label="Phiếu xuất nguồn" value={entry?.sourceIssueCode || entry?.sourceIssueId || '-'} />
      <EntryField label="Phiếu dịch vụ" value={entry?.serviceTicketCode || entry?.serviceTicketId || '-'} />
      <EntryField label="Người tạo" value={entry?.createdByName || entry?.createdBy || '-'} />
      <EntryField label="Ngày tạo" value={formatDateTimeViNoSeconds(entry?.createdAt, '-')} />
      <EntryField label="Người xác nhận" value={entry?.confirmedByName || entry?.confirmedBy || '-'} />
      <EntryField label="Ngày xác nhận" value={formatDateTimeViNoSeconds(entry?.confirmedAt, '-')} />
      <EntryField label="Lý do trả hàng" value={entry?.returnReason || '-'} fullRow />
    </div>
  </section>
);

EntrySummaryCard.propTypes = {
  entry: PropTypes.shape({
    returnCode: PropTypes.string,
    returnId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    warehouseId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    warehouseCode: PropTypes.string,
    warehouseName: PropTypes.string,
    returnReason: PropTypes.string,
    returnType: PropTypes.string,
    createdAt: PropTypes.string,
    confirmedAt: PropTypes.string,
    confirmedBy: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    confirmedByName: PropTypes.string,
    createdBy: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    createdByName: PropTypes.string,
    sourceIssueId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    sourceIssueCode: PropTypes.string,
    serviceTicketId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    serviceTicketCode: PropTypes.string,
    status: PropTypes.string,
  }),
  statusLabel: PropTypes.string.isRequired,
  statusValue: PropTypes.string.isRequired,
};

const getAllAttachmentUrls = (entry) => {
  const items = Array.isArray(entry?.items) ? entry.items : [];
  return items
    .flatMap((item) => (
      Array.isArray(item?.attachmentUrls)
        ? item.attachmentUrls.map((url) => ({
            url,
            itemName: item?.itemName || item?.itemCode || item?.itemId || '',
          }))
        : []
    ))
    .filter((item) => String(item?.url || '').trim());
};

const ReturnAttachmentsCard = ({ attachments, onPreview }) => {
  if (!Array.isArray(attachments) || attachments.length === 0) return null;
  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Ảnh chứng từ</h2>
      </div>
      <div className={styles.attachmentGrid}>
        {attachments.map((attachment, index) => (
          <figure key={`${String(attachment.url)}-${index}`} className={styles.attachmentItem}>
            <button
              type="button"
              className={styles.attachmentButton}
              onClick={() => onPreview?.(String(attachment.url))}
              title="Xem ảnh"
            >
              <img
                src={attachment.url}
                alt={`Ảnh chứng từ ${index + 1}`}
                loading="lazy"
                className={styles.attachmentImage}
              />
            </button>
          </figure>
        ))}
      </div>
    </section>
  );
};

ReturnAttachmentsCard.propTypes = {
  attachments: PropTypes.arrayOf(PropTypes.shape({
    url: PropTypes.string,
    itemName: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  })),
  onPreview: PropTypes.func,
};

const ImagePreviewModal = ({ previewUrl, onClose }) => {
  if (!previewUrl) return null;
  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
      <button type="button" className={styles.modalBackdrop} onClick={onClose} aria-label="Đóng" />
      <div className={styles.modalBox}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Ảnh chứng từ</h3>
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </div>
        <div className={styles.modalBody}>
          <img className={styles.previewImg} src={previewUrl} alt="Chứng từ" />
        </div>
      </div>
    </div>
  );
};

ImagePreviewModal.propTypes = {
  previewUrl: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

const ReturnItemsCard = ({ items, title = 'Danh sách sản phẩm trả', onPreview }) => (
  <section className={styles.card}>
    <div className={styles.sectionHeader}>
      <h2 className={styles.sectionTitle}>{title}</h2>
    </div>
    <div className={commonStyles.tableWrap}>
      <table className={commonStyles.table}>
        <thead>
          <tr>
            <th>STT</th>
            <th>Tên sản phẩm</th>
            <th>Phiếu nhập/Lô</th>
            <th style={{ textAlign: 'center' }}>SL</th>
            <th style={{ textAlign: 'right' }}>Thành tiền</th>
            <th>Tình trạng</th>
            <th>Phân loại & Trách nhiệm</th>
            <th>Kho đích</th>
            <th style={{ textAlign: 'center' }}>Ảnh</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(items) && items.length > 0 ? (
            items.map((row, idx) => {
              const totalPrice = row?.totalPrice ?? (Number(row?.quantity) * Number(row?.unitPrice));
              const returnReasonLabel = RETURN_REASON_LABELS[row?.returnReason] || row?.returnReason || '-';
              const isDefective = row?.returnReason === 'DEFECTIVE';
              const defectCauseLabel = isDefective
                ? (DEFECT_CAUSE_LABELS[row?.defectCause] || row?.defectCause || '-')
                : null;
              const responsibleName = row?.responsibleStaffName || (row?.responsibleStaffId ? `NV #${row.responsibleStaffId}` : null);
              return (
                <tr key={`${row?.returnItemId || row?.itemId}-${idx}`}>
                  <td style={{ width: 36 }}>{idx + 1}</td>
                  <td>
                    <strong>{row?.itemName || '-'}</strong>
                    {row?.itemCode ? <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{row.itemCode}</div> : null}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#6b7280' }}>{row?.entryCode || '-'}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{formatNumber(row?.quantity)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600 }}>{formatMoneyVnd(totalPrice)}</div>
                    {row?.unitPrice ? <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{formatMoneyVnd(row.unitPrice)}/cái</div> : null}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#6b7280', maxWidth: 160 }}>{row?.conditionNote || '-'}</td>
                  <td>
                    <span style={{ color: isDefective ? '#dc2626' : '#059669', fontWeight: 600 }}>
                      {returnReasonLabel}
                    </span>
                    {isDefective && (
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>
                        {defectCauseLabel}
                        {responsibleName ? ` — ${responsibleName}` : ''}
                      </div>
                    )}
                  </td>
                  <td>
                    {isDefective && row?.defectiveWarehouseName ? (
                      <span style={{
                        background: '#fef2f2', color: '#991b1b',
                        border: '1px solid #fca5a5', borderRadius: 4,
                        padding: '2px 6px', fontSize: '0.75rem', whiteSpace: 'nowrap',
                      }}>
                        ⚠️ {row.defectiveWarehouseName}
                      </span>
                    ) : isDefective ? (
                      <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>Kho lỗi (sau xác nhận)</span>
                    ) : (
                      <span style={{ color: '#059669', fontSize: '0.75rem' }}>Kho chính</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {Array.isArray(row?.attachmentUrls) && row.attachmentUrls.length > 0 ? (
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontSize: '0.8rem', padding: 0 }}
                        onClick={() => onPreview?.(row.attachmentUrls[0])}
                        title="Xem ảnh"
                      >
                        📷 {row.attachmentUrls.length}
                      </button>
                    ) : (
                      <span style={{ color: '#d1d5db' }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={9} className={styles.emptyCell}>Không có sản phẩm.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </section>
);

ReturnItemsCard.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({})),
  title: PropTypes.string,
  onPreview: PropTypes.func,
};

export default function WarehouseReturnEntryDetail() {
  useScrollToTop();
  const navigate = useNavigate();
  const params = useParams();

  const notify = (message) => toast(message, { containerId: 'app-toast' });
  const [entry, setEntry] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const returnId = Number(params.returnId);
  const hasValidReturnId = Number.isFinite(returnId) && returnId > 0;

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!hasValidReturnId) {
        setEntry(null);
        setError('Mã phiếu trả hàng không hợp lệ.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        const response = await fetchWarehouseReturnEntryDetail(returnId, token);
        const data = unwrapResponseData(response);
        if (cancelled) return;
        setEntry(data && typeof data === 'object' ? data : null);
      } catch (err) {
        if (cancelled) return;
        setEntry(null);
        setError(err?.message || 'Không thể tải chi tiết phiếu trả hàng.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [hasValidReturnId, returnId, params.returnId]);

  const statusValue = String(entry?.status || '').toUpperCase();
  const canTakeAction = statusValue === 'SUBMITTED';
  const statusLabel = getStatusTextVi(statusValue, statusValue || '-');

  const openImagePreview = (url) => {
    const safeUrl = String(url || '').trim();
    if (!safeUrl) return;
    setPreviewUrl(safeUrl);
  };

  useEffect(() => {
    if (!previewUrl) return undefined;

    const prevOverflow = globalThis?.document?.body?.style?.overflow;
    if (globalThis?.document?.body?.style) {
      globalThis.document.body.style.overflow = 'hidden';
    }

    const onKeyDown = (e) => {
      if (e?.key === 'Escape') setPreviewUrl('');
    };

    globalThis?.window?.addEventListener?.('keydown', onKeyDown);
    return () => {
      globalThis?.window?.removeEventListener?.('keydown', onKeyDown);
      if (globalThis?.document?.body?.style) {
        globalThis.document.body.style.overflow = prevOverflow || '';
      }
    };
  }, [previewUrl]);

  const handleConfirm = async () => {
    const safeReturnId = Number(entry?.returnId ?? params.returnId);
    if (!Number.isFinite(safeReturnId) || safeReturnId <= 0) {
      notify('Không xác định được mã phiếu trả hàng.');
      return;
    }

    const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
    if (!token) {
      notify('Vui lòng đăng nhập để xác nhận phiếu trả hàng.');
      return;
    }

    setIsConfirming(true);
    try {
      const response = await confirmWarehouseReturnEntry(safeReturnId, token);
      const nextEntry = unwrapResponseData(response);
      setEntry((prev) => {
        if (nextEntry && typeof nextEntry === 'object') return { ...prev, ...nextEntry };
        return prev ? { ...prev, status: 'CONFIRMED' } : prev;
      });
      notify(response?.message || 'Xác nhận phiếu hoàn hàng thành công.');
    } catch (err) {
      notify(err?.message || 'Không thể xác nhận phiếu trả hàng.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancel = async () => {
    const safeReturnId = Number(entry?.returnId ?? params.returnId);
    if (!Number.isFinite(safeReturnId) || safeReturnId <= 0) {
      notify('Không xác định được mã phiếu trả hàng.');
      return;
    }

    const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
    if (!token) {
      notify('Vui lòng đăng nhập để hủy phiếu hoàn.');
      return;
    }

    setIsCancelling(true);
    try {
      const response = await cancelWarehouseReturnEntry(safeReturnId, token);
      const nextEntry = unwrapResponseData(response);
      setEntry((prev) => {
        if (nextEntry && typeof nextEntry === 'object') return { ...prev, ...nextEntry };
        return prev ? { ...prev, status: 'CANCELLED' } : prev;
      });
      notify(response?.message || 'Hủy phiếu hoàn thành công.');
    } catch (err) {
      notify(err?.message || 'Không thể hủy phiếu hoàn.');
    } finally {
      setIsCancelling(false);
    }
  };

  let bodyContent;
  if (loading) {
    bodyContent = (
      <section className={styles.card}>
        <p className={styles.emptyText}>Đang tải chi tiết phiếu trả hàng...</p>
      </section>
    );
  } else if (error) {
    bodyContent = (
      <section className={styles.card}>
        <p className={styles.emptyText}>{error}</p>
      </section>
    );
  } else if (entry) {
    const hasExchangeItems = Array.isArray(entry?.exchangeItems) && entry.exchangeItems.length > 0;
    const attachments = getAllAttachmentUrls(entry);

    bodyContent = (
      <>
        <EntrySummaryCard
          entry={entry}
          statusLabel={statusLabel}
          statusValue={statusValue}
        />

        {/* Banner cảnh báo nếu có hàng lỗi vào kho lỗi */}
        {Array.isArray(entry?.items) && entry.items.some((i) => i.returnReason === 'DEFECTIVE') && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8,
            padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12,
          }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
              <strong style={{ color: '#991b1b' }}>Phiếu này có hàng bị lỗi</strong>
              <p style={{ margin: '4px 0 0', color: '#7f1d1d', fontSize: 13 }}>
                Sau khi xác nhận, hàng lỗi sẽ được chuyển vào <strong>kho hàng lỗi</strong> tương ứng.
                Vào <button type="button" onClick={() => navigate('/warehouse-defective-inventory')}
                  style={{ color: '#1e40af', background: 'none', border: 'none', cursor: 'pointer',
                    textDecoration: 'underline', fontSize: 13, padding: 0 }}>Kho hàng lỗi</button>
                {' '}để theo dõi và xử lý.
              </p>
            </div>
          </div>
        )}

        <ReturnItemsCard items={entry?.items} title="Danh sách sản phẩm trả" onPreview={openImagePreview} />
        <ReturnAttachmentsCard attachments={attachments} onPreview={openImagePreview} />
        {hasExchangeItems ? (
          <ReturnItemsCard items={entry?.exchangeItems} title="Danh sách sản phẩm thay thế" onPreview={openImagePreview} />
        ) : null}
        {statusValue === 'CONFIRMED' && Array.isArray(entry?.items) && entry.items.some((i) => i.returnReason === 'DEFECTIVE') && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8,
            padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <span style={{ color: '#991b1b', fontSize: 14 }}>
              ⚠️ Phiếu đã xác nhận — hàng lỗi đã vào kho DEFECTIVE
            </span>
            <button type="button" className="ui-btn ui-btn--ghost"
              style={{ fontSize: 13 }}
              onClick={() => navigate('/warehouse-defective-inventory')}>
              Xem kho hàng lỗi →
            </button>
          </div>
        )}
        {canTakeAction ? (
          <div className={styles.bottomAction}>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 16px', marginBottom: 12, fontSize: 13, color: '#1e40af' }}>
              💡 Khi xác nhận: tồn kho sẽ được cập nhật, hàng DEFECTIVE chuyển vào kho lỗi, allocation được giải phóng.
            </div>
            <div className={styles.actionGroup}>
              <button
                type="button"
                className="ui-btn ui-btn--primary"
                onClick={handleConfirm}
                disabled={isConfirming || isCancelling}
              >
                {isConfirming ? 'Đang xác nhận...' : '✅ Xác nhận phiếu hoàn'}
              </button>
              <button
                type="button"
                className="ui-btn ui-btn--danger"
                onClick={handleCancel}
                disabled={isConfirming || isCancelling}
              >
                {isCancelling ? 'Đang hủy...' : '❌ Hủy phiếu hoàn'}
              </button>
            </div>
          </div>
        ) : null}
      </>
    );
  } else {
    bodyContent = (
      <section className={styles.card}>
        <p className={styles.emptyText}>Không có dữ liệu phiếu trả hàng để hiển thị. Hãy quay lại từ danh sách.</p>
      </section>
    );
  }

  return (
    <div className={commonStyles.page}>
      <div className={styles.wrapper}>
        <header className={commonStyles.header}>
          <div>
            <h1 className={commonStyles.title}>Chi tiết phiếu trả hàng</h1>
            <p className={styles.subtitle}>Xem thông tin chi tiết phiếu trả hàng và các sản phẩm liên quan.</p>
          </div>
          <button type="button" className="ui-btn ui-btn--ghost" onClick={() => navigate('/warehouse-return-entries')}>
            Quay lại
          </button>
        </header>

        {bodyContent}
      </div>
      {previewUrl ? (
        <ImagePreviewModal previewUrl={previewUrl} onClose={() => setPreviewUrl('')} />
      ) : null}
    </div>
  );
}