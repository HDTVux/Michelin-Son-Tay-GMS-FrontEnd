import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { confirmWarehouseStockEntry, fetchWarehouseStockEntryDetail, uploadWarehouseStockEntryAttachment } from '../../../services/warehouseService.js';
import { getStatusTextVi, getStatusTone } from '../../../components/statusUtils.js';
import commonStyles from '../common/ManagementCommon.module.css';
import styles from './WarehouseStockEntryDetail.module.css';

const badgeClassByStatus = (status) => {
  const tone = getStatusTone(status, 'info');
  if (tone === 'success') return commonStyles.badgeSuccess;
  if (tone === 'warning') return commonStyles.badgeWarning;
  if (tone === 'danger') return commonStyles.badgeDanger;
  return commonStyles.badgeMuted;
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
        <div className={styles.entryCode}>{entry?.entryCode || `#${entry?.entryId || '-'}`}</div>
        <span className={`${commonStyles.badge} ${badgeClassByStatus(statusValue)}`}>{statusLabel}</span>
      </div>
    </div>

    <div className={styles.detailGrid}>
      <EntryField label="Mã phiếu nhập" value={entry?.entryCode || '-'} />
      <EntryField label="Nhà cung cấp" value={entry?.supplierName || '-'} />
      <EntryField label="Ngày nhập" value={entry?.entryDate || '-'} />
      <EntryField label="Kho nhập" value={entry?.warehouseName || '-'} />
      <EntryField label="Trạng thái" value={getStatusTextVi(entry?.status, entry?.status || '-')} />
      <EntryField label="Ghi chú" value={entry?.notes || '-'} fullRow />
      <EntryField label="Người tạo" value={entry?.createdByName || '-'} />
      <EntryField label="Ngày duyệt" value={entry?.confirmedAt || '-'} />
      <EntryField label="Người duyệt" value={entry?.confirmedByName || '-'} />
      <EntryField label="Người giao" value={entry?.delivererName || '-'} />
      <EntryField label="SĐT người giao" value={entry?.delivererPhone || '-'} />
      <EntryField label="Biển số xe" value={entry?.licensePlate || '-'} />
    </div>
  </section>
);

EntrySummaryCard.propTypes = {
  entry: PropTypes.shape({
    entryCode: PropTypes.string,
    entryId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    warehouseId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    supplierName: PropTypes.string,
    entryDate: PropTypes.string,
    status: PropTypes.string,
    notes: PropTypes.string,
  }),
  statusLabel: PropTypes.string.isRequired,
  statusValue: PropTypes.string.isRequired,
};

const EntryItemsCard = ({ items }) => (
  <section className={styles.card}>
    <div className={styles.sectionHeader}>
      <h2 className={styles.sectionTitle}>Danh sách sản phẩm</h2>
    </div>
    <div className={commonStyles.tableWrap}>
      <table className={commonStyles.table}>
        <thead>
          <tr>
            <th>Mã sản phẩm</th>
            <th>Tên sản phẩm</th>
            <th>Số lượng</th>
            <th>Giá nhập</th>
            <th>Hệ số lợi nhuận lẻ</th>
            <th>Hệ số lợi nhuận buôn</th>
            <th>Số lượng còn lại</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(items) && items.length > 0 ? (
            items.map((row, idx) => (
              <tr key={String(row?.entryItemId ?? idx)}>
                <td>{row?.itemId ?? '-'}</td>
                <td>{row?.itemName ?? '-'}</td>
                <td>{row?.quantity ?? '-'}</td>
                <td>{row?.importPrice ?? '-'}</td>
                <td>{row?.markupMultiplier ?? '-'}</td>
                <td>{row?.markupMultiplierWholesale ?? '-'}</td>
                <td>{row?.remainingQuantity ?? '-'}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7} className={styles.emptyCell}>Không có sản phẩm.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </section>
);

EntryItemsCard.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({})),
};

const EntryAttachmentsCard = ({ attachments, onPreview, isDraft, onUpload, isUploading }) => {
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload?.(file);
    }
  };

  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Ảnh chứng từ</h2>
      </div>
      {Array.isArray(attachments) && attachments.length > 0 ? (
        <div className={styles.attachmentGrid}>
          {attachments.map((url, idx) => (
            <figure key={`${String(url)}-${idx}`} className={styles.attachmentItem}>
              <button
                type="button"
                className={styles.attachmentButton}
                onClick={() => onPreview?.(String(url))}
                title="Xem ảnh"
              >
                <img
                  src={url}
                  alt={`Ảnh chứng từ ${idx + 1}`}
                  loading="lazy"
                  className={styles.attachmentImage}
                />
              </button>
              <figcaption>Ảnh {idx + 1}</figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <p className={styles.emptyText}>Không có file đính kèm.</p>
      )}

      {isDraft && (
        <div style={{ marginTop: '1.5rem', borderTop: '1px dashed #ddd', paddingTop: '1.25rem' }}>
          <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600', color: '#333' }}>
            Tải lên ảnh chứng từ mới (Bắt buộc để xác nhận phiếu):
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
            style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}
          />
          {isUploading && <p style={{ fontSize: '0.85rem', color: '#666', fontStyle: 'italic' }}>Đang tải ảnh chứng từ lên...</p>}
        </div>
      )}
    </section>
  );
};

EntryAttachmentsCard.propTypes = {
  attachments: PropTypes.arrayOf(PropTypes.string),
  onPreview: PropTypes.func,
  isDraft: PropTypes.bool,
  onUpload: PropTypes.func,
  isUploading: PropTypes.bool,
};

const readStaffRolesFromStorage = () => {
  try {
    const raw = localStorage.getItem('staffRoles');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(r => String(r).toUpperCase());
    }
  } catch {
    // ignore
  }
  return [];
};

export default function WarehouseStockEntryDetail() {
  useScrollToTop();
  const navigate = useNavigate();
  const params = useParams();

  const staffRoles = useMemo(() => readStaffRolesFromStorage(), []);
  const canConfirm = useMemo(() => {
    return staffRoles.includes('MANAGER') || staffRoles.includes('WAREHOUSE_MANAGER') || staffRoles.includes('ROLE_MANAGER') || staffRoles.includes('ROLE_WAREHOUSE_MANAGER');
  }, [staffRoles]);

  const notify = (message) => toast(message, { containerId: 'app-toast' });
  const [entry, setEntry] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const entryId = Number(params.entryId);
  const hasValidEntryId = Number.isFinite(entryId) && entryId > 0;
  const [isUploading, setIsUploading] = useState(false);

  const reloadEntry = async () => {
    if (!hasValidEntryId) return;
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
      const response = await fetchWarehouseStockEntryDetail(entryId, token);
      const data = response?.data?.data ?? response?.data ?? response;
      setEntry(data && typeof data === 'object' ? data : null);
    } catch (err) {
      notify('Không thể cập nhật danh sách ảnh đính kèm.');
    }
  };

  const handleUploadAttachment = async (file) => {
    if (!hasValidEntryId) {
      notify('Không xác định được mã phiếu nhập.');
      return;
    }

    const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
    if (!token) {
      notify('Vui lòng đăng nhập để tải ảnh lên.');
      return;
    }

    setIsUploading(true);
    try {
      await uploadWarehouseStockEntryAttachment(entryId, file, token);
      notify('Tải ảnh chứng từ lên thành công.');
      await reloadEntry();
    } catch (err) {
      notify(err?.message || 'Không thể tải ảnh chứng từ lên.');
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!hasValidEntryId) {
        setEntry(null);
        setError('Mã phiếu nhập không hợp lệ.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        const response = await fetchWarehouseStockEntryDetail(entryId, token);
        const data = response?.data?.data ?? response?.data ?? response;
        if (cancelled) return;
        setEntry(data && typeof data === 'object' ? data : null);
      } catch (err) {
        if (cancelled) return;
        setEntry(null);
        setError(err?.message || 'Không thể tải chi tiết phiếu nhập.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [hasValidEntryId, entryId, params.entryId]);

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

  const statusValue = String(entry?.status || '').toUpperCase();
  const isDraft = statusValue === 'DRAFT';
  const statusLabel = getStatusTextVi(statusValue, statusValue || '-');

  const handleConfirm = async () => {
    const safeEntryId = Number(entry?.entryId ?? params.entryId);
    if (!Number.isFinite(safeEntryId) || safeEntryId <= 0) {
      notify('Không xác định được mã phiếu nhập.');
      return;
    }

    const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
    if (!token) {
      notify('Vui lòng đăng nhập để xác nhận phiếu nhập.');
      return;
    }

    setIsConfirming(true);
    try {
      const response = await confirmWarehouseStockEntry(safeEntryId, token);
      setEntry((prev) => (prev ? { ...prev, status: 'CONFIRMED' } : prev));
      notify(response?.message || 'Xác nhận phiếu nhập thành công.');
    } catch (err) {
      notify(err?.message || 'Không thể xác nhận phiếu nhập.');
    } finally {
      setIsConfirming(false);
    }
  };

  let bodyContent;
  if (loading) {
    bodyContent = (
      <section className={styles.card}>
        <p className={styles.emptyText}>Đang tải chi tiết phiếu nhập...</p>
      </section>
    );
  } else if (error) {
    bodyContent = (
      <section className={styles.card}>
        <p className={styles.emptyText}>{error}</p>
      </section>
    );
  } else if (entry) {
    bodyContent = (
      <>
        <EntrySummaryCard
          entry={entry}
          statusLabel={statusLabel}
          statusValue={statusValue}
        />
        <EntryItemsCard items={entry?.items} />
        <EntryAttachmentsCard
          attachments={entry?.attachments}
          onPreview={setPreviewUrl}
          isDraft={isDraft}
          onUpload={handleUploadAttachment}
          isUploading={isUploading}
        />
      </>
    );
  } else {
    bodyContent = (
      <section className={styles.card}>
        <p className={styles.emptyText}>Không có dữ liệu phiếu nhập để hiển thị. Hãy quay lại từ danh sách.</p>
      </section>
    );
  }

  const handlePrint = () => {
    if (!entry) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Trình duyệt đã chặn popup. Vui lòng cho phép popup để in phiếu.');
      return;
    }
    
    const html = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>Phiếu Nhập Kho ${entry.entryCode || entry.entryId}</title>
        <style>
          body { font-family: 'Times New Roman', serif; line-height: 1.5; color: #000; padding: 20px; font-size: 14px; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 20px; text-transform: uppercase; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
          .info-item { margin-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .signatures { display: grid; grid-template-columns: repeat(3, 1fr); text-align: center; margin-top: 50px; }
          .signature-box { margin-bottom: 80px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PHIẾU NHẬP KHO</h1>
          <p>Mã phiếu: ${entry.entryCode || entry.entryId}</p>
          <p>Ngày lập: ${entry.createdAt || '...'}</p>
        </div>
        
        <div class="info-grid">
          <div class="info-item"><strong>Nhà cung cấp:</strong> ${entry.supplierName || '...........................................'}</div>
          <div class="info-item"><strong>Người giao hàng:</strong> ${entry.delivererName || '...........................................'}</div>
          <div class="info-item"><strong>Số điện thoại:</strong> ${entry.delivererPhone || '...........................................'}</div>
          <div class="info-item"><strong>Biển số xe:</strong> ${entry.licensePlate || '...........................................'}</div>
          <div class="info-item"><strong>Nhập tại kho:</strong> ${entry.warehouseName || '...........................................'}</div>
          <div class="info-item"><strong>Ghi chú:</strong> ${entry.notes || '...........................................'}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Mã SP</th>
              <th>Tên sản phẩm</th>
              <th>ĐVT</th>
              <th>Số lượng</th>
              <th>Giá nhập</th>
              <th>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${(entry.items || []).map((item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${item.itemId || ''}</td>
                <td>${item.itemName || ''}</td>
                <td>${item.unit || 'Cái'}</td>
                <td>${item.quantity || 0}</td>
                <td>${new Intl.NumberFormat('vi-VN').format(item.importPrice || 0)} ₫</td>
                <td>${new Intl.NumberFormat('vi-VN').format((item.quantity || 0) * (item.importPrice || 0))} ₫</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="signatures">
          <div class="signature-box">
            <strong>Người giao hàng</strong><br>
            <i>(Ký, ghi rõ họ tên)</i>
          </div>
          <div class="signature-box">
            <strong>Thủ kho</strong><br>
            <i>(Ký, ghi rõ họ tên)</i>
          </div>
          <div class="signature-box">
            <strong>Người lập phiếu</strong><br>
            <i>(Ký, ghi rõ họ tên)</i><br>
            <br><br><br><br>
            ${entry.createdByName || ''}
          </div>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className={commonStyles.page}>
      <div className={styles.wrapper}>
        <header className={commonStyles.header}>
          <div>
            <h1 className={commonStyles.title}>Chi tiết phiếu nhập kho</h1>
            <p className={styles.subtitle}>Xem thông tin phiếu và xác nhận khi đang ở trạng thái Nháp.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="ui-btn ui-btn--outline" onClick={handlePrint}>
              In phiếu
            </button>
            <button type="button" className="ui-btn ui-btn--ghost" onClick={() => navigate('/warehouse-stock-entries')}>
              Quay lại
            </button>
          </div>
        </header>

        {bodyContent}
        {isDraft && canConfirm ? (
        <button
          type="button"
          className="ui-btn ui-btn--primary"
          onClick={handleConfirm}
          disabled={isConfirming}
        >
          {isConfirming ? 'Đang xác nhận...' : 'Xác nhận phiếu nhập'}
        </button>
      ) : null}
      </div>

      {previewUrl ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <button type="button" className={styles.modalBackdrop} onClick={() => setPreviewUrl('')} aria-label="Đóng" />
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Ảnh chứng từ</h3>
              <button type="button" className={styles.modalClose} onClick={() => setPreviewUrl('')} aria-label="Đóng">
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <img className={styles.previewImg} src={previewUrl} alt="Chứng từ" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
