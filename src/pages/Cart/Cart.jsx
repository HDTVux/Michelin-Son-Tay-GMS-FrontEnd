import { Link, useNavigate } from 'react-router-dom';
import styles from './Cart.module.css';
import { formatVnd, useCart } from '../../context/CartContext.jsx';
import serviceFallback from '../../assets/lop and mam.jpg';
import { useScrollToTop } from '../../hooks/useScrollToTop.js';

// Trang giỏ hàng: xem lại sản phẩm đã chọn trước khi qua trang thanh toán
export default function Cart() {
  const navigate = useNavigate();
  const {
    items,
    totalQuantity,
    totalAmount,
    hasContactPriceItem,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();

  useScrollToTop([]);

  if (items.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyWrap}>
          <div className={styles.emptyIcon} aria-hidden="true">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </div>
          <h1>Giỏ hàng đang trống</h1>
          <p>Hãy chọn dịch vụ hoặc phụ tùng bạn cần rồi quay lại đây để thanh toán.</p>
          <Link to="/services" className={styles.primaryBtn}>Xem dịch vụ & phụ tùng</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Giỏ hàng của bạn</h1>
        <span className={styles.countChip}>{totalQuantity} sản phẩm</span>
      </div>

      <div className={styles.layout}>
        <div className={styles.listCol}>
          {items.map((item) => (
            <div key={item.id} className={styles.itemCard}>
              <img
                src={item.thumbnail || serviceFallback}
                alt={item.name}
                className={styles.itemImg}
              />
              <div className={styles.itemInfo}>
                <div className={styles.itemTypeTag}>
                  {item.itemType === 'PART' ? 'Phụ tùng' : 'Dịch vụ'}
                </div>
                <div className={styles.itemName}>{item.name}</div>
                <div className={styles.itemPrice}>
                  {item.price != null ? formatVnd(item.price) : (item.priceText || 'Liên hệ báo giá')}
                </div>
              </div>
              <div className={styles.itemActions}>
                <div className={styles.qtyControl}>
                  <button
                    type="button"
                    aria-label="Giảm số lượng"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    aria-label="Tăng số lượng"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>
                <div className={styles.lineTotal}>
                  {item.price != null ? formatVnd(item.price * item.quantity) : 'Báo giá sau'}
                </div>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => removeItem(item.id)}
                >
                  Xóa
                </button>
              </div>
            </div>
          ))}

          <div className={styles.listFooter}>
            <Link to="/services" className={styles.ghostBtn}>← Tiếp tục mua hàng</Link>
            <button type="button" className={styles.clearBtn} onClick={clearCart}>
              Xóa toàn bộ giỏ
            </button>
          </div>
        </div>

        <aside className={styles.summaryCol}>
          <div className={styles.summaryCard}>
            <h2>Tóm tắt đơn hàng</h2>
            <div className={styles.summaryRow}>
              <span>Tạm tính ({totalQuantity} sản phẩm)</span>
              <strong>{formatVnd(totalAmount)}</strong>
            </div>
            {hasContactPriceItem && (
              <p className={styles.summaryNote}>
                Một số sản phẩm chưa có giá niêm yết — nhân viên sẽ báo giá và xác nhận lại với bạn.
              </p>
            )}
            <div className={styles.summaryDivider} />
            <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
              <span>Tổng cộng</span>
              <strong>{formatVnd(totalAmount)}</strong>
            </div>
            <button
              type="button"
              className={styles.checkoutBtn}
              onClick={() => navigate('/checkout')}
            >
              Tiến hành thanh toán
            </button>
            <p className={styles.summaryHint}>
              Hỗ trợ giao hàng tận nơi hoặc nhận tại xưởng kèm đặt lịch (yêu cầu đặt cọc).
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
