import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { fetchWarehouseReturnEntryDetail, confirmWarehouseReturnEntry } from '../../../services/warehouseService.js';
import { getStatusTextVi, getStatusTone } from '../../../components/statusUtils.js';
import commonStyles from '../common/ManagementCommon.module.css';
import styles from './WarehouseReturnEntryDetail.module.css';

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

const EntrySummaryCard = ({ entry, statusLabel, statusValue, isDraft, isConfirming, onConfirm }) => (
  <section className={styles.card}>
    <div className={styles.headerRow}>
      <div className={styles.titleBlock}>
        <div className={styles.entryCode}>{entry?.returnCode || `#${entry?.returnId || '-'}`}</div>
        <span className={`${commonStyles.badge} ${badgeClassByStatus(statusValue)}`}>{statusLabel}</span>
      </div>
      {isDraft ? (
        <button
          type="button"
          className="ui-btn ui-btn--primary"
          onClick={onConfirm}
          disabled={isConfirming}
        >
          {isConfirming ? 'Đang xác nhận...' : 'Xác nhận phiếu trả'}
        </button>
      ) : null}
    </div>

    <div className={styles.detailGrid}>
      <EntryField label="Mã phiếu trả" value={entry?.returnCode || '-'} />
      <EntryField label="Lý do trả hàng" value={entry?.returnReason || '-'} />
      <EntryField label="Trạng thái" value={getStatusTextVi(entry?.status, entry?.status || '-')} />
      <EntryField label="Ngày tạo" value={entry?.createdAt || '-'} />
    </div>
  </section>
);

EntrySummaryCard.propTypes = {
  entry: PropTypes.shape({
    returnCode: PropTypes.string,
    returnId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    warehouseId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    returnReason: PropTypes.string,
    createdAt: PropTypes.string,
    status: PropTypes.string,
  }),
  statusLabel: PropTypes.string.isRequired,
  statusValue: PropTypes.string.isRequired,
  isDraft: PropTypes.bool,
  isConfirming: PropTypes.bool,
  onConfirm: PropTypes.func.isRequired,
};

const ReturnItemsCard = ({ items, title = 'Danh sách sản phẩm trả' }) => (
  <section className={styles.card}>
    <div className={styles.sectionHeader}>
      <h2 className={styles.sectionTitle}>{title}</h2>
    </div>
    <div className={commonStyles.tableWrap}>
      <table className={commonStyles.table}>
        <thead>
          <tr>
            <th>STT</th>
            <th>Mã sản phẩm</th>
            <th>Số lượng</th>
            <th>Ghi chú tình trạng</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(items) && items.length > 0 ? (
            items.map((row, idx) => (
              <tr key={`${row?.itemId}-${idx}`}>
                <td>{idx + 1}</td>
                <td>{row?.itemId ?? '-'}</td>
                <td>{row?.quantity ?? '-'}</td>
                <td>{row?.conditionNote || '-'}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className={styles.emptyCell}>Không có sản phẩm.</td>
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
};

export default function WarehouseReturnEntryDetail() {
  useScrollToTop();
  const navigate = useNavigate();
  const params = useParams();

  const notify = (message) => toast(message, { containerId: 'app-toast' });
  const [entry, setEntry] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
        const data = response?.data?.data ?? response?.data ?? response;
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
  const isDraft = statusValue === 'DRAFT';
  const statusLabel = getStatusTextVi(statusValue, statusValue || '-');

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
      setEntry((prev) => (prev ? { ...prev, status: 'CONFIRMED' } : prev));
      notify(response?.message || 'Xác nhận phiếu trả hàng thành công.');
    } catch (err) {
      notify(err?.message || 'Không thể xác nhận phiếu trả hàng.');
    } finally {
      setIsConfirming(false);
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

    bodyContent = (
      <>
        <EntrySummaryCard
          entry={entry}
          statusLabel={statusLabel}
          statusValue={statusValue}
          isDraft={isDraft}
          isConfirming={isConfirming}
          onConfirm={handleConfirm}
        />
        <ReturnItemsCard items={entry?.items} title="Danh sách sản phẩm trả" />
        {hasExchangeItems ? (
          <ReturnItemsCard items={entry?.exchangeItems} title="Danh sách sản phẩm thay thế" />
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
    </div>
  );
}
