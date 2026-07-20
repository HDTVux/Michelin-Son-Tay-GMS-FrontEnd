import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './Checkout.module.css';
import { formatVnd, useCart } from '../../context/CartContext.jsx';
import { createOrder } from '../../services/orderService.js';
import { getVietQrUrl } from '../../services/paymentQrService.js';
import serviceFallback from '../../assets/lop and mam.jpg';
import { useScrollToTop } from '../../hooks/useScrollToTop.js';

// Tỷ lệ đặt cọc khi chọn nhận tại xưởng (đặt lịch): 30% giá trị đơn
const DEPOSIT_RATE = 0.3;
// Nếu toàn bộ giỏ là hàng "liên hệ báo giá" thì thu cọc giữ lịch cố định
const FALLBACK_DEPOSIT = 200000;

const roundToThousand = (value) => Math.round(value / 1000) * 1000;

const isValidPhone = (value) => /^0\d{9,10}$/.test(String(value || '').trim());

// Trang thanh toán (billing): chọn giao tận nơi hoặc nhận tại xưởng kèm đặt lịch.
// Cả hai luồng đều thanh toán trước (trả đủ / COD với ship, đặt cọc với nhận tại xưởng).
export default function Checkout() {
  const navigate = useNavigate();
  const {
    items,
    totalQuantity,
    totalAmount,
    hasContactPriceItem,
    hasServiceItem,
    clearCart,
  } = useCart();

  // step: 'info' -> 'payment' (QR) -> 'done'
  const [step, setStep] = useState('info');
  useScrollToTop([step]);

  // Giỏ có dịch vụ thì bắt buộc đến xưởng thực hiện, không ship được
  const [fulfillmentType, setFulfillmentType] = useState(hasServiceItem ? 'PICKUP' : 'SHIP');
  const [paymentMethod, setPaymentMethod] = useState('BANK_QR');
  const [info, setInfo] = useState({ name: '', phone: '', address: '', note: '' });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState(null);

  const depositAmount = useMemo(() => {
    if (totalAmount <= 0) return FALLBACK_DEPOSIT;
    return Math.max(roundToThousand(totalAmount * DEPOSIT_RATE), 50000);
  }, [totalAmount]);

  const isPickup = fulfillmentType === 'PICKUP';
  // Nhận tại xưởng bắt buộc chuyển khoản đặt cọc; ship có thể COD
  const effectivePaymentMethod = isPickup ? 'BANK_QR' : paymentMethod;
  const payAmount = isPickup ? depositAmount : totalAmount;

  const handleChangeFulfillment = (next) => {
    if (next === 'SHIP' && hasServiceItem) return;
    setFulfillmentType(next);
    setFormError('');
  };

  const handleSubmitInfo = async () => {
    if (submitting) return;
    const name = info.name.trim();
    const phone = info.phone.trim();
    const address = info.address.trim();

    if (!name) return setFormError('Vui lòng nhập họ tên.');
    if (!isValidPhone(phone)) return setFormError('Số điện thoại không hợp lệ (bắt đầu bằng 0, 10-11 số).');
    if (!isPickup && !address) return setFormError('Vui lòng nhập địa chỉ nhận hàng.');
    if (/[<>{}]/.test(info.note)) return setFormError('Ghi chú không được chứa ký tự <, >, {, }.');

    setFormError('');
    setSubmitting(true);
    try {
      const res = await createOrder({
        fulfillmentType,
        paymentMethod: effectivePaymentMethod,
        customerName: name,
        phone,
        address: isPickup ? '' : address,
        note: info.note.trim(),
        items: items.map((x) => ({
          catalogItemId: Number(x.id),
          itemType: x.itemType,
          itemName: x.name,
          unitPrice: x.price,
          quantity: x.quantity,
        })),
        totalAmount,
        depositAmount: effectivePaymentMethod === 'COD' ? 0 : payAmount,
      });
      const created = res?.data || null;
      setOrder(created);

      if (effectivePaymentMethod === 'COD') {
        clearCart();
        setStep('done');
      } else {
        setStep('payment');
      }
    } catch (err) {
      setFormError(err?.message || 'Không thể tạo đơn hàng, vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  // Khách bấm xác nhận đã chuyển khoản trên màn QR
  const handleConfirmPaid = () => {
    clearCart();
    if (isPickup) {
      toast('Đã ghi nhận đặt cọc. Vui lòng chọn ngày giờ đến xưởng.', { containerId: 'app-toast' });
      // Quay lại luồng đặt lịch cũ: sản phẩm đã chọn sẵn, chỉ cần chọn ngày giờ
      navigate('/booking', {
        state: {
          fromCart: true,
          catalogItemIds: order?.items?.map((x) => x.catalogItemId) || items.map((x) => Number(x.id)),
          orderCode: order?.orderCode || '',
          customerName: order?.customerName || info.name.trim(),
          phone: order?.phone || info.phone.trim(),
        },
      });
    } else {
      setStep('done');
    }
  };

  if (items.length === 0 && step === 'info') {
    return (
      <div className={styles.page}>
        <div className={styles.emptyWrap}>
          <h1>Chưa có sản phẩm để thanh toán</h1>
          <p>Giỏ hàng của bạn đang trống.</p>
          <Link to="/services" className={styles.primaryLink}>Xem dịch vụ & phụ tùng</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Thanh toán</h1>

      {step === 'info' && (
        <div className={styles.layout}>
          <div className={styles.formCol}>
            {/* Hình thức nhận hàng */}
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>1. Hình thức nhận hàng</h2>
              <div className={styles.optionGrid}>
                <button
                  type="button"
                  className={`${styles.optionCard} ${!isPickup ? styles.optionActive : ''} ${hasServiceItem ? styles.optionDisabled : ''}`}
                  onClick={() => handleChangeFulfillment('SHIP')}
                  disabled={hasServiceItem}
                >
                  <span className={styles.optionIcon} aria-hidden="true">🚚</span>
                  <span className={styles.optionLabel}>Giao hàng tận nơi</span>
                  <span className={styles.optionDesc}>
                    Mua online, nhận hàng tại địa chỉ của bạn.
                  </span>
                </button>
                <button
                  type="button"
                  className={`${styles.optionCard} ${isPickup ? styles.optionActive : ''}`}
                  onClick={() => handleChangeFulfillment('PICKUP')}
                >
                  <span className={styles.optionIcon} aria-hidden="true">🔧</span>
                  <span className={styles.optionLabel}>Nhận tại xưởng & đặt lịch</span>
                  <span className={styles.optionDesc}>
                    Đặt cọc {Math.round(DEPOSIT_RATE * 100)}%, sau đó chọn ngày giờ đến xưởng lắp đặt / nhận hàng.
                  </span>
                </button>
              </div>
              {hasServiceItem && (
                <p className={styles.inlineNote}>
                  Giỏ hàng có dịch vụ nên cần đến xưởng thực hiện — chỉ áp dụng hình thức nhận tại xưởng.
                </p>
              )}
            </section>

            {/* Thông tin khách hàng */}
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>2. Thông tin liên hệ</h2>
              <div className={styles.fieldGrid}>
                <label className={styles.field}>
                  <span>Họ và tên *</span>
                  <input
                    type="text"
                    value={info.name}
                    onChange={(e) => setInfo((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Nguyễn Văn A"
                    maxLength={100}
                  />
                </label>
                <label className={styles.field}>
                  <span>Số điện thoại *</span>
                  <input
                    type="tel"
                    value={info.phone}
                    onChange={(e) => setInfo((p) => ({ ...p, phone: e.target.value.replace(/[^\d]/g, '') }))}
                    placeholder="0987xxxxxx"
                    maxLength={11}
                  />
                </label>
                {!isPickup && (
                  <label className={`${styles.field} ${styles.fieldFull}`}>
                    <span>Địa chỉ nhận hàng *</span>
                    <input
                      type="text"
                      value={info.address}
                      onChange={(e) => setInfo((p) => ({ ...p, address: e.target.value }))}
                      placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                      maxLength={255}
                    />
                  </label>
                )}
                <label className={`${styles.field} ${styles.fieldFull}`}>
                  <span>Ghi chú</span>
                  <textarea
                    value={info.note}
                    onChange={(e) => setInfo((p) => ({ ...p, note: e.target.value }))}
                    placeholder={isPickup ? 'Ví dụ: biển số xe, yêu cầu lắp đặt...' : 'Ví dụ: giao giờ hành chính...'}
                    rows={3}
                    maxLength={500}
                  />
                </label>
              </div>
            </section>

            {/* Phương thức thanh toán */}
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>3. Phương thức thanh toán</h2>
              {isPickup ? (
                <div className={styles.depositBox}>
                  <div className={styles.depositRow}>
                    <span>Đặt cọc giữ lịch ({totalAmount > 0 ? `${Math.round(DEPOSIT_RATE * 100)}% giá trị đơn` : 'mức cố định'})</span>
                    <strong>{formatVnd(depositAmount)}</strong>
                  </div>
                  <p>
                    Chuyển khoản qua mã VietQR ở bước tiếp theo. Phần còn lại thanh toán khi hoàn tất tại xưởng.
                  </p>
                </div>
              ) : (
                <div className={styles.payMethods}>
                  <label className={`${styles.payMethod} ${paymentMethod === 'BANK_QR' ? styles.payMethodActive : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'BANK_QR'}
                      onChange={() => setPaymentMethod('BANK_QR')}
                    />
                    <span>
                      <strong>Chuyển khoản VietQR</strong>
                      <em>Thanh toán toàn bộ {formatVnd(totalAmount)} qua mã QR ngân hàng.</em>
                    </span>
                  </label>
                  <label className={`${styles.payMethod} ${paymentMethod === 'COD' ? styles.payMethodActive : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'COD'}
                      onChange={() => setPaymentMethod('COD')}
                    />
                    <span>
                      <strong>Thanh toán khi nhận hàng (COD)</strong>
                      <em>Trả tiền mặt cho nhân viên giao hàng.</em>
                    </span>
                  </label>
                </div>
              )}
            </section>

            {formError && <div className={styles.errorBox}>{formError}</div>}

            <div className={styles.actionRow}>
              <Link to="/cart" className={styles.backLink}>← Quay lại giỏ hàng</Link>
              <button
                type="button"
                className={styles.submitBtn}
                onClick={handleSubmitInfo}
                disabled={submitting}
              >
                {submitting
                  ? 'Đang xử lý...'
                  : effectivePaymentMethod === 'COD'
                    ? 'Đặt hàng (COD)'
                    : isPickup
                      ? `Đặt cọc ${formatVnd(depositAmount)}`
                      : `Thanh toán ${formatVnd(totalAmount)}`}
              </button>
            </div>
          </div>

          {/* Tóm tắt đơn */}
          <aside className={styles.summaryCol}>
            <div className={styles.summaryCard}>
              <h2>Đơn hàng ({totalQuantity} sản phẩm)</h2>
              <ul className={styles.summaryList}>
                {items.map((x) => (
                  <li key={x.id}>
                    <img src={x.thumbnail || serviceFallback} alt={x.name} />
                    <div className={styles.summaryItemInfo}>
                      <span className={styles.summaryItemName}>{x.name}</span>
                      <span className={styles.summaryItemQty}>x{x.quantity}</span>
                    </div>
                    <span className={styles.summaryItemPrice}>
                      {x.price != null ? formatVnd(x.price * x.quantity) : 'Báo giá sau'}
                    </span>
                  </li>
                ))}
              </ul>
              {hasContactPriceItem && (
                <p className={styles.inlineNote}>
                  Mục "Báo giá sau" sẽ được nhân viên xác nhận giá trước khi thực hiện.
                </p>
              )}
              <div className={styles.summaryDivider} />
              <div className={styles.summaryRow}>
                <span>Tạm tính</span>
                <strong>{formatVnd(totalAmount)}</strong>
              </div>
              {isPickup && (
                <>
                  <div className={styles.summaryRow}>
                    <span>Đặt cọc bây giờ</span>
                    <strong className={styles.highlight}>{formatVnd(depositAmount)}</strong>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>Còn lại (trả tại xưởng)</span>
                    <strong>{formatVnd(Math.max(totalAmount - depositAmount, 0))}</strong>
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      )}

      {step === 'payment' && order && (
        <div className={styles.paymentWrap}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              {isPickup ? 'Chuyển khoản đặt cọc' : 'Chuyển khoản thanh toán'}
            </h2>
            <p className={styles.paymentIntro}>
              Quét mã VietQR bằng ứng dụng ngân hàng để {isPickup ? 'đặt cọc' : 'thanh toán'}{' '}
              <strong className={styles.highlight}>{formatVnd(payAmount)}</strong> cho đơn{' '}
              <strong>{order.orderCode}</strong>.
            </p>
            <div className={styles.qrBox}>
              <img
                src={getVietQrUrl({
                  amountVnd: payAmount,
                  description: `${order.orderCode} ${order.phone}`,
                })}
                alt={`Mã VietQR thanh toán đơn ${order.orderCode}`}
              />
            </div>
            <p className={styles.paymentNote}>
              Nội dung chuyển khoản: <strong>{order.orderCode} {order.phone}</strong>.
              Nhân viên sẽ đối soát và xác nhận đơn sau khi nhận được tiền.
            </p>
            <div className={styles.actionRow}>
              <button type="button" className={styles.backLinkBtn} onClick={() => setStep('info')}>
                ← Sửa thông tin
              </button>
              <button type="button" className={styles.submitBtn} onClick={handleConfirmPaid}>
                {isPickup ? 'Tôi đã chuyển cọc — chọn lịch hẹn' : 'Tôi đã chuyển khoản'}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'done' && order && (
        <div className={styles.doneWrap}>
          <div className={styles.doneIcon} aria-hidden="true">✓</div>
          <h2>Đặt hàng thành công!</h2>
          <p>
            Mã đơn hàng của bạn: <strong className={styles.highlight}>{order.orderCode}</strong>
          </p>
          <div className={styles.doneDetail}>
            <div><span>Hình thức</span><strong>{order.fulfillmentType === 'PICKUP' ? 'Nhận tại xưởng' : 'Giao hàng tận nơi'}</strong></div>
            <div><span>Thanh toán</span><strong>{order.paymentMethod === 'COD' ? 'COD khi nhận hàng' : 'Chuyển khoản VietQR'}</strong></div>
            <div><span>Người nhận</span><strong>{order.customerName} — {order.phone}</strong></div>
            {order.address && <div><span>Địa chỉ</span><strong>{order.address}</strong></div>}
            <div><span>Tổng tiền</span><strong>{formatVnd(order.totalAmount)}</strong></div>
          </div>
          <p className={styles.doneHint}>
            Nhân viên sẽ liên hệ xác nhận đơn qua số điện thoại của bạn trong thời gian sớm nhất.
          </p>
          <div className={styles.doneActions}>
            <Link to="/services" className={styles.backLink}>Tiếp tục mua hàng</Link>
            <Link to="/" className={styles.primaryLink}>Về trang chủ</Link>
          </div>
        </div>
      )}
    </div>
  );
}
