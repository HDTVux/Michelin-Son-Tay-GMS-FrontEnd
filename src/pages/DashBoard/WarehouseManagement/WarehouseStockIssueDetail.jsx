import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import {
  confirmWarehouseStockIssue,
  fetchWarehouseStockIssueDetail,
  uploadWarehouseStockIssueAttachment,
} from '../../../services/warehouseService.js';
import { getStatusTextVi, getStatusTone } from '../../../components/statusUtils.js';
import { formatCurrencyVnd } from '../PartManagement/itemFormatters.js';
import commonStyles from '../common/ManagementCommon.module.css';
import styles from './WarehouseStockIssueDetail.module.css';

const badgeClassByStatus = (status) => {
  const tone = getStatusTone(status, 'info');
  if (tone === 'success') return commonStyles.badgeSuccess;
  if (tone === 'warning') return commonStyles.badgeWarning;
  if (tone === 'danger') return commonStyles.badgeDanger;
  return commonStyles.badgeMuted;
};

const formatVnd = (value) => {
  const text = formatCurrencyVnd(value);
  if (!text || text === '-') return '-';
  return `${text} ₫`;
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

const IssueSummaryCard = ({ issue, statusLabel, statusValue }) => (
  <section className={styles.card}>
    <div className={styles.headerRow}>
      <div className={styles.titleBlock}>
        <div className={styles.entryCode}>{issue?.issueCode || `#${issue?.issueId || '-'}`}</div>
        <span className={`${commonStyles.badge} ${badgeClassByStatus(statusValue)}`}>{statusLabel}</span>
      </div>
    </div>

    <div className={styles.detailGrid}>
      <EntryField label="Mã phiếu xuất" value={issue?.issueCode || '-'} />
      <EntryField label="Kho" value={issue?.warehouseName ?? '-'} />
      <EntryField label="Trạng thái" value={getStatusTextVi(issue?.status, issue?.status || '-')} />
      <EntryField label="Lý do" value={issue?.issueReason || '-'} fullRow />

      <EntryField label="Mã phiếu dịch vụ" value={issue?.serviceTicketCode ?? '-'} />

      <EntryField label="Người tạo" value={issue?.createdByName ?? '-'} />
      <EntryField label="Ngày tạo" value={issue?.createdAt || '-'} />
      <EntryField label="Người xác nhận" value={issue?.confirmedByName ?? '-'} />
      <EntryField label="Ngày xác nhận" value={issue?.confirmedAt || '-'} />
    </div>
  </section>
);

IssueSummaryCard.propTypes = {
  issue: PropTypes.shape({
    issueId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    issueCode: PropTypes.string,
    warehouseId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    warehouseName: PropTypes.string,
    issueType: PropTypes.string,
    issueReason: PropTypes.string,
    serviceTicketId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    serviceTicketCode: PropTypes.string,
    discountRate: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    status: PropTypes.string,
    confirmedBy: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    confirmedByName: PropTypes.string,
    confirmedAt: PropTypes.string,
    createdBy: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    createdByName: PropTypes.string,
    createdAt: PropTypes.string,
  }),
  statusLabel: PropTypes.string.isRequired,
  statusValue: PropTypes.string.isRequired,
};

const IssueItemsCard = ({ items }) => (
  <section className={styles.card}>
    <div className={styles.sectionHeader}>
      <h2 className={styles.sectionTitle}>Danh sách sản phẩm</h2>
    </div>
    <div className={commonStyles.tableWrap}>
      <table className={commonStyles.table}>
        <thead>
          <tr>
            <th>STT</th>
            <th>Mã sản phẩm</th>
            <th>Tên sản phẩm</th>
            <th>Mã lô nhập</th>
            <th>Số lượng</th>
            <th>Giá nhập</th>
            <th>Giá xuất</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(items) && items.length > 0 ? (
            items.map((row, idx) => {
              const key = row?.issueItemId ?? `${row?.itemId ?? 'row'}-${idx}`;
              return (
                <tr key={String(key)}>
                  <td>{idx + 1}</td>
                  <td>{row?.itemId ?? '-'}</td>
                  <td>{row?.itemName ?? '-'}</td>
                  <td>{row?.entryLotCode ?? '-'}</td>
                  <td>{row?.quantity ?? '-'}</td>
                  <td>{formatVnd(row?.importPrice)}</td>
                  <td>{formatVnd(row?.exportPrice)}</td>
                </tr>
              );
            })
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

IssueItemsCard.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({})),
};

const getAttachmentCount = (issue) => {
  const candidates = [
    issue?.attachments,
    issue?.attachmentUrls,
    issue?.attachmentURLS,
    issue?.evidences,
    issue?.evidenceFiles,
    issue?.documents,
  ];
  for (const value of candidates) {
    if (Array.isArray(value) && value.length > 0) return value.length;
  }
  return 0;
};

const getAttachmentUrls = (issue) => {
  const raw = issue?.attachmentUrls ?? issue?.attachmentURLS ?? issue?.attachments ?? null;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((u) => String(u ?? '').trim())
    .filter(Boolean);
};

export default function WarehouseStockIssueDetail() {
  useScrollToTop();
  const navigate = useNavigate();
  const params = useParams();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [hasUploadedEvidence, setHasUploadedEvidence] = useState(false);

  const [previewUrl, setPreviewUrl] = useState('');

  const issueId = Number(params.issueId);
  const hasValidIssueId = Number.isFinite(issueId) && issueId > 0;

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!hasValidIssueId) {
        setIssue(null);
        setError('Mã phiếu xuất kho không hợp lệ.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        const response = await fetchWarehouseStockIssueDetail(issueId, token);
        const data = response?.data?.data ?? response?.data ?? response;
        if (cancelled) return;
        setIssue(data && typeof data === 'object' ? data : null);
      } catch (err) {
        if (cancelled) return;
        setIssue(null);
        setError(err?.message || 'Không thể tải chi tiết phiếu xuất kho.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [hasValidIssueId, issueId, params.issueId]);

  const statusValue = String(issue?.status || '').toUpperCase();
  const isDraft = statusValue === 'DRAFT';
  const statusLabel = getStatusTextVi(statusValue, statusValue || '-');

  const attachmentCount = getAttachmentCount(issue);
  const attachmentUrls = getAttachmentUrls(issue);
  const evidenceSatisfied = attachmentCount > 0 || hasUploadedEvidence;

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

  const fetchDetail = async (targetIssueId) => {
    const safeIssueId = Number(targetIssueId ?? issue?.issueId ?? params.issueId);
    if (!Number.isFinite(safeIssueId) || safeIssueId <= 0) {
      throw new Error('Mã phiếu xuất kho không hợp lệ.');
    }

    const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
    const response = await fetchWarehouseStockIssueDetail(safeIssueId, token);
    const data = response?.data?.data ?? response?.data ?? response;
    setIssue(data && typeof data === 'object' ? data : null);
  };

  const handleSelectFiles = (e) => {
    const files = Array.from(e?.target?.files ?? []).filter((f) => f && typeof f === 'object');
    setSelectedFiles(files);
  };

  const handleUploadEvidence = async () => {
    const safeIssueId = Number(issue?.issueId ?? params.issueId);
    if (!Number.isFinite(safeIssueId) || safeIssueId <= 0) {
      toast.error('Không xác định được mã phiếu xuất kho.');
      return;
    }

    if (uploading) return;

    const files = Array.isArray(selectedFiles) ? selectedFiles : [];
    if (files.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 ảnh chứng từ.');
      return;
    }

    const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
    if (!token) {
      toast.error('Vui lòng đăng nhập để tải ảnh chứng từ.');
      return;
    }

    setUploading(true);
    let successCount = 0;
    try {
      for (const file of files) {
        // only allow images
        const type = String(file?.type || '').toLowerCase();
        if (type && !type.startsWith('image/')) {
          throw new Error('Chỉ hỗ trợ upload ảnh (jpg/png/webp...).');
        }
        await uploadWarehouseStockIssueAttachment(safeIssueId, file, token);
        successCount += 1;
      }

      if (successCount > 0) {
        toast.success(`Đã tải lên ${successCount} ảnh chứng từ.`);
        setHasUploadedEvidence(true);
        setSelectedFiles([]);
        try {
          await fetchDetail(safeIssueId);
        } catch {
          // ignore
        }
      }
    } catch (err) {
      toast.error(err?.message || 'Không thể tải ảnh chứng từ.');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    const safeIssueId = Number(issue?.issueId ?? params.issueId);
    if (!Number.isFinite(safeIssueId) || safeIssueId <= 0) {
      toast.error('Không xác định được mã phiếu xuất kho.');
      return;
    }

    if (!evidenceSatisfied) {
      toast.error('Vui lòng tải lên ít nhất 1 ảnh chứng từ trước khi xác nhận.');
      return;
    }

    const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
    if (!token) {
      toast.error('Vui lòng đăng nhập để xác nhận phiếu xuất kho.');
      return;
    }

    setIsConfirming(true);
    try {
      const response = await confirmWarehouseStockIssue(safeIssueId, token);
      toast.success(response?.message || 'Xác nhận phiếu xuất kho thành công.');
      await fetchDetail(safeIssueId);
    } catch (err) {
      toast.error(err?.message || 'Không thể xác nhận phiếu xuất kho.');
    } finally {
      setIsConfirming(false);
    }
  };

  let bodyContent;
  if (loading) {
    bodyContent = (
      <section className={styles.card}>
        <p className={styles.emptyText}>Đang tải chi tiết phiếu xuất kho...</p>
      </section>
    );
  } else if (error) {
    bodyContent = (
      <section className={styles.card}>
        <p className={styles.emptyText}>{error}</p>
      </section>
    );
  } else if (issue) {
    bodyContent = (
      <>
        <IssueSummaryCard
          issue={issue}
          statusLabel={statusLabel}
          statusValue={statusValue}
        />
        <IssueItemsCard items={issue?.items} />

        {isDraft || attachmentUrls.length > 0 ? (
          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Chứng từ</h2>
            </div>

            {isDraft ? (
              <div className={styles.uploadRow}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleSelectFiles}
                  disabled={uploading || isConfirming}
                />
                <button
                  type="button"
                  className="ui-btn ui-btn--primary"
                  onClick={handleUploadEvidence}
                  disabled={uploading || isConfirming}
                >
                  {uploading ? 'Đang tải lên...' : 'Tải ảnh lên'}
                </button>
              </div>
            ) : null}

            <div className={styles.uploadHint}>
              {attachmentCount > 0 ? (
                <span>Đã có {attachmentCount} ảnh chứng từ.</span>
              ) : evidenceSatisfied ? (
                <span>Đã tải ảnh chứng từ (chưa đồng bộ danh sách từ backend).</span>
              ) : (
                <span className={styles.requiredHint}>Bắt buộc: tải lên ít nhất 1 ảnh trước khi xác nhận.</span>
              )}
            </div>

            {attachmentUrls.length > 0 ? (
              <div className={styles.gallery}>
                {attachmentUrls.map((url, idx) => (
                  <button
                    key={`${url}-${idx}`}
                    type="button"
                    className={styles.thumb}
                    onClick={() => setPreviewUrl(url)}
                    title="Xem ảnh"
                  >
                    <img className={styles.thumbImg} src={url} alt={`Chứng từ ${idx + 1}`} loading="lazy" />
                  </button>
                ))}
              </div>
            ) : null}

            {selectedFiles.length > 0 ? (
              <div className={styles.fileList}>
                {selectedFiles.map((f) => (
                  <div key={`${f?.name || 'file'}-${f?.lastModified || ''}`} className={styles.fileItem}>
                    {f?.name || 'Ảnh'}
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}
      </>
    );
  } else {
    bodyContent = (
      <section className={styles.card}>
        <p className={styles.emptyText}>Không có dữ liệu phiếu xuất kho để hiển thị. Hãy quay lại từ trang quản lý.</p>
      </section>
    );
  }

  return (
    <div className={commonStyles.page}>
      <div className={styles.wrapper}>
        <header className={commonStyles.header}>
          <div>
            <h1 className={commonStyles.title}>Chi tiết phiếu xuất kho</h1>
            <p className={styles.subtitle}>Xem thông tin chi tiết phiếu xuất kho và danh sách sản phẩm xuất.</p>
          </div>
          <button type="button" className="ui-btn ui-btn--ghost" onClick={() => navigate('/warehouse-stock-issues')}>
            Quay lại
          </button>
        </header>

        {bodyContent}

        {issue && isDraft ? (
          <button
            type="button"
            className={`ui-btn ui-btn--primary ${styles.confirmButton}`}
            onClick={handleConfirm}
            disabled={isConfirming || uploading || !evidenceSatisfied}
          >
            {isConfirming ? 'Đang xác nhận...' : 'Xác nhận phiếu xuất'}
          </button>
        ) : null}

        {issue && statusValue === 'CONFIRMED' ? (
          <div className={styles.actionsRow}>
            <button
              type="button"
              className="ui-btn ui-btn--primary"
              onClick={() => navigate(`/warehouse-return-entry-from-issue/${issueId}`, { state: { issue } })}
            >
              Tạo phiếu hoàn từ phiếu xuất này
            </button>
          </div>
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
