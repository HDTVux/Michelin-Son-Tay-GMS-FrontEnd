import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { confirmWarehouseStockIssue, fetchWarehouseStockIssueDetail } from '../../../services/warehouseService.js';
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

const formatPercent = (value) => {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  if (!Number.isFinite(n)) return '-';
  return `${n}%`;
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

const IssueSummaryCard = ({ issue, statusLabel, statusValue, isDraft, isConfirming, onConfirm }) => (
  <section className={styles.card}>
    <div className={styles.headerRow}>
      <div className={styles.titleBlock}>
        <div className={styles.entryCode}>{issue?.issueCode || `#${issue?.issueId || '-'}`}</div>
        <span className={`${commonStyles.badge} ${badgeClassByStatus(statusValue)}`}>{statusLabel}</span>
      </div>
      {isDraft ? (
        <button
          type="button"
          className="ui-btn ui-btn--primary"
          onClick={onConfirm}
          disabled={isConfirming}
        >
          {isConfirming ? 'Đang xác nhận...' : 'Xác nhận phiếu xuất'}
        </button>
      ) : null}
    </div>

    <div className={styles.detailGrid}>
      <EntryField label="Mã phiếu xuất" value={issue?.issueCode || '-'} />
      <EntryField label="Kho" value={issue?.warehouseId ?? '-'} />
      <EntryField label="Loại phiếu" value={String(issue?.issueType || '').trim() || '-'} />
      <EntryField label="Trạng thái" value={getStatusTextVi(issue?.status, issue?.status || '-')} />
      <EntryField label="Lý do" value={issue?.issueReason || '-'} fullRow />

      <EntryField label="Mã phiếu dịch vụ" value={issue?.serviceTicketId ?? '-'} />
      <EntryField label="Chiết khấu" value={formatPercent(issue?.discountRate)} />

      <EntryField label="Người tạo" value={issue?.createdBy ?? '-'} />
      <EntryField label="Ngày tạo" value={issue?.createdAt || '-'} />
      <EntryField label="Người xác nhận" value={issue?.confirmedBy ?? '-'} />
      <EntryField label="Ngày xác nhận" value={issue?.confirmedAt || '-'} />
    </div>
  </section>
);

IssueSummaryCard.propTypes = {
  issue: PropTypes.shape({
    issueId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    issueCode: PropTypes.string,
    warehouseId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    issueType: PropTypes.string,
    issueReason: PropTypes.string,
    serviceTicketId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    discountRate: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    status: PropTypes.string,
    confirmedBy: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    confirmedAt: PropTypes.string,
    createdBy: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    createdAt: PropTypes.string,
  }),
  statusLabel: PropTypes.string.isRequired,
  statusValue: PropTypes.string.isRequired,
  isDraft: PropTypes.bool,
  isConfirming: PropTypes.bool,
  onConfirm: PropTypes.func,
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
            <th>Mã dòng</th>
            <th>Mã sản phẩm</th>
            <th>Mã lô nhập</th>
            <th>Số lượng</th>
            <th>Giá xuất</th>
            <th>Giá nhập</th>
            <th>CK (%)</th>
            <th>Thành tiền</th>
            <th>Lợi nhuận gộp</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(items) && items.length > 0 ? (
            items.map((row, idx) => {
              const key = row?.issueItemId ?? `${row?.itemId ?? 'row'}-${idx}`;
              return (
                <tr key={String(key)}>
                  <td>{idx + 1}</td>
                  <td>{row?.issueItemId ?? '-'}</td>
                  <td>{row?.itemId ?? '-'}</td>
                  <td>{row?.entryItemId ?? '-'}</td>
                  <td>{row?.quantity ?? '-'}</td>
                  <td>{formatVnd(row?.exportPrice)}</td>
                  <td>{formatVnd(row?.importPrice)}</td>
                  <td>{row?.discountRate ?? '-'}</td>
                  <td>{formatVnd(row?.finalPrice)}</td>
                  <td>{formatVnd(row?.grossProfit)}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={10} className={styles.emptyCell}>Không có sản phẩm.</td>
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

export default function WarehouseStockIssueDetail() {
  useScrollToTop();
  const navigate = useNavigate();
  const params = useParams();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

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

  const handleConfirm = async () => {
    const safeIssueId = Number(issue?.issueId ?? params.issueId);
    if (!Number.isFinite(safeIssueId) || safeIssueId <= 0) {
      toast.error('Không xác định được mã phiếu xuất kho.');
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
          isDraft={isDraft}
          isConfirming={isConfirming}
          onConfirm={handleConfirm}
        />
        <IssueItemsCard items={issue?.items} />
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
      </div>
    </div>
  );
}
