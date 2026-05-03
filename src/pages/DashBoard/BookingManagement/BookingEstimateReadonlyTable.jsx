import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import styles from '../BookingRequestManagement/BookingRequestDetail.module.css';
import { fetchServiceTicketEstimateByBookingId } from '../../../services/serviceTicketService.js';

const statusText = {
  DRAFT: 'Nháp',
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã hủy',
  CANCELED: 'Đã hủy',
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
};

const formatMoney = (value) => {
  const num = toNumber(value);
  if (num == null) return '-';
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(num))}đ`;
};

const formatNumber = (value) => {
  const num = toNumber(value);
  if (num == null) return '-';
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(num);
};

const formatPercent = (value) => {
  const num = toNumber(value);
  if (num == null) return '';
  const percent = num > 1 ? num : num * 100;
  return `${percent.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`;
};

const pickEstimatePayload = (response) => {
  const data = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(data)) {
    return [...data].sort((a, b) => {
      const versionA = toNumber(a?.version) ?? 0;
      const versionB = toNumber(b?.version) ?? 0;
      if (versionA !== versionB) return versionB - versionA;
      return String(b?.createdAt || '').localeCompare(String(a?.createdAt || ''));
    })[0] ?? null;
  }
  return data && typeof data === 'object' ? data : null;
};

const getCategoryLabel = (item) => {
  const category = item?.workCategory ?? item?.workCategoryName ?? item?.categoryName;
  if (category && typeof category === 'object') {
    return category.name || category.categoryName || category.title || '-';
  }
  return category || '-';
};

const getLineAmount = (item) => {
  const direct =
    item?.finalPrice ??
    item?.finalPriceDisplay ??
    item?.subTotalWithVat ??
    item?.subTotal ??
    item?.amount;

  const directNumber = toNumber(direct);
  if (directNumber != null) return directNumber;

  const quantity = toNumber(item?.quantity) ?? 0;
  const unitPrice = toNumber(item?.unitPriceWithVat ?? item?.unitPrice) ?? 0;
  return quantity * unitPrice;
};

export default function BookingEstimateReadonlyTable({ bookingId }) {
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const safeBookingId = String(bookingId ?? '').trim();

    if (!token || !safeBookingId) {
      Promise.resolve().then(() => {
        setEstimate(null);
        setError('');
        setLoading(false);
      });
      return undefined;
    }

    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      setLoading(true);
      setError('');
    });

    fetchServiceTicketEstimateByBookingId(safeBookingId, token)
      .then((response) => {
        if (!active) return;
        setEstimate(pickEstimatePayload(response));
      })
      .catch((err) => {
        if (!active) return;
        setEstimate(null);
        if (err?.status !== 404) {
          setError(err?.message || 'Không thể tải bảng báo giá.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [bookingId]);

  const items = useMemo(
    () => (Array.isArray(estimate?.items) ? estimate.items.filter((item) => item?.isRemoved !== true) : []),
    [estimate],
  );

  const computedTotal = useMemo(
    () => items.reduce((sum, item) => sum + (toNumber(getLineAmount(item)) ?? 0), 0),
    [items],
  );

  const status = String(estimate?.status || '').trim().toUpperCase();

  return (
    <section className={styles.section}>
      <div className={styles.estimateHeader}>
        <h3 className={styles.sectionTitle}>Bảng báo giá</h3>
        {estimate ? (
          <div className={styles.estimateMeta}>
            {estimate?.estimateId ? <span>Mã báo giá #{estimate.estimateId}</span> : null}
            {status ? <span className={styles.estimateStatus}>{statusText[status] || status}</span> : null}
          </div>
        ) : null}
      </div>

      {loading ? <div className={styles.value}>Đang tải bảng báo giá...</div> : null}
      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      {!loading && !error && !estimate ? (
        <div className={styles.value}>Chưa có bảng báo giá cho lịch hẹn này.</div>
      ) : null}

      {!loading && !error && estimate && items.length === 0 ? (
        <div className={styles.value}>Bảng báo giá chưa có hạng mục.</div>
      ) : null}

      {!loading && !error && estimate && items.length > 0 ? (
        <>
          <div className={styles.estimateTableWrap}>
            <table className={styles.estimateTable}>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Hạng mục</th>
                  <th>Tên dịch vụ/vật tư</th>
                  <th>ĐVT</th>
                  <th>Số lượng</th>
                  <th>Đơn giá</th>
                  <th>VAT</th>
                  <th>Giảm giá</th>
                  <th>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const taxRate = formatPercent(item?.appliedTaxRate);
                  const taxAmount = toNumber(item?.taxAmount);
                  const discountAmount = toNumber(item?.discountAmount);
                  const isGift = item?.isGift === true;

                  return (
                    <tr key={item?.estimateItemId ?? `${item?.itemName || 'item'}-${index}`}>
                      <td>{index + 1}</td>
                      <td>{getCategoryLabel(item)}</td>
                      <td>
                        <div className={styles.estimateItemName}>
                          <span>{item?.itemName || item?.name || '-'}</span>
                          {isGift ? <span className={styles.giftBadge}>Quà tặng</span> : null}
                        </div>
                      </td>
                      <td>{item?.unit || '-'}</td>
                      <td className={styles.numberCell}>{formatNumber(item?.quantity)}</td>
                      <td className={styles.numberCell}>{formatMoney(item?.unitPriceWithVat ?? item?.unitPrice)}</td>
                      <td className={styles.numberCell}>
                        {taxAmount != null ? formatMoney(taxAmount) : taxRate || '-'}
                      </td>
                      <td className={styles.numberCell}>{discountAmount ? formatMoney(discountAmount) : '-'}</td>
                      <td className={styles.numberCell}>{isGift ? '0đ' : formatMoney(getLineAmount(item))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className={styles.estimateTotals}>
            <div>
              <span>Tạm tính</span>
              <strong>{formatMoney(estimate?.subTotal ?? computedTotal)}</strong>
            </div>
            <div>
              <span>Thuế</span>
              <strong>{formatMoney(estimate?.totalTaxAmount ?? 0)}</strong>
            </div>
            <div className={styles.estimateGrandTotal}>
              <span>Tổng cộng</span>
              <strong>{formatMoney(estimate?.totalPrice ?? computedTotal)}</strong>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

BookingEstimateReadonlyTable.propTypes = {
  bookingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};
