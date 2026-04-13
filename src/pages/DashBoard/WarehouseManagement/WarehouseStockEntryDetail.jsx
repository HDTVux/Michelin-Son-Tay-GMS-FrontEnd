import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { confirmWarehouseStockEntry, fetchWarehouseStockEntryDetail } from '../../../services/warehouseService.js';
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
      <EntryField label="Trạng thái" value={getStatusTextVi(entry?.status, entry?.status || '-')} />
      <EntryField label="Ghi chú" value={entry?.notes || '-'} fullRow />
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
            <th>Mã dòng</th>
            <th>Mã sản phẩm</th>
            <th>Số lượng</th>
            <th>Giá nhập</th>
            <th>Hệ số lợi nhuận</th>
            <th>Số lượng còn lại</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(items) && items.length > 0 ? (
            items.map((row, idx) => (
              <tr key={String(row?.entryItemId ?? idx)}>
                <td>{row?.entryItemId ?? '-'}</td>
                <td>{row?.itemId ?? '-'}</td>
                <td>{row?.quantity ?? '-'}</td>
                <td>{row?.importPrice ?? '-'}</td>
                <td>{row?.markupMultiplier ?? '-'}</td>
                <td>{row?.remainingQuantity ?? '-'}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className={styles.emptyCell}>Không có sản phẩm.</td>
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

const EntryAttachmentsCard = ({ attachments }) => (
  <section className={styles.card}>
    <div className={styles.sectionHeader}>
      <h2 className={styles.sectionTitle}>Ảnh chứng từ</h2>
    </div>
    {Array.isArray(attachments) && attachments.length > 0 ? (
      <div className={styles.attachmentGrid}>
        {attachments.map((url, idx) => (
          <figure key={`${String(url)}-${idx}`} className={styles.attachmentItem}>
            <img
              src={url}
              alt={`Ảnh chứng từ ${idx + 1}`}
              loading="lazy"
              className={styles.attachmentImage}
            />
            <figcaption>Ảnh {idx + 1}</figcaption>
          </figure>
        ))}
      </div>
    ) : (
      <p className={styles.emptyText}>Không có file đính kèm.</p>
    )}
  </section>
);

EntryAttachmentsCard.propTypes = {
  attachments: PropTypes.arrayOf(PropTypes.string),
};

export default function WarehouseStockEntryDetail() {
  useScrollToTop();
  const navigate = useNavigate();
  const params = useParams();

  const notify = (message) => toast(message, { containerId: 'app-toast' });
  const [entry, setEntry] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const entryId = Number(params.entryId);
  const hasValidEntryId = Number.isFinite(entryId) && entryId > 0;

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
        <EntryAttachmentsCard attachments={entry?.attachments} />
      </>
    );
  } else {
    bodyContent = (
      <section className={styles.card}>
        <p className={styles.emptyText}>Không có dữ liệu phiếu nhập để hiển thị. Hãy quay lại từ danh sách.</p>
      </section>
    );
  }

  return (
    <div className={commonStyles.page}>
      <div className={styles.wrapper}>
        <header className={commonStyles.header}>
          <div>
            <h1 className={commonStyles.title}>Chi tiết phiếu nhập kho</h1>
            <p className={styles.subtitle}>Xem thông tin phiếu và xác nhận khi đang ở trạng thái Nháp.</p>
          </div>
          <button type="button" className="ui-btn ui-btn--ghost" onClick={() => navigate('/warehouse-stock-entries')}>
            Quay lại
          </button>
        </header>

        {bodyContent}
              {isDraft ? (
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
    </div>
  );
}
