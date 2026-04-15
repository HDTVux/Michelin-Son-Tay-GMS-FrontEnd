import { useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import styles from './AccountingInvoicePrint.module.css';

const DEFAULT_ROW_COUNT = 15;
const NUMBER_WORDS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const SCALE_WORDS = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

const STORE_INFO = {
    name: 'MICHELIN SƠN TÂY',
    address: '674 QL21, Tân Phúc, Sơn Đông, Sơn Tây, Hà Nội',
    businessLine: 'Dịch vụ chăm sóc xe, bảo dưỡng, sửa chữa và phụ tùng ô tô',
};

const BARCODE_BCID = 'code128';

function safeText(value) {
    if (value == null) return '';
    return String(value).trim();
}

function toMoneyNumber(value) {
    const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
    return Number.isFinite(n) ? n : 0;
}

function formatCurrencyVnd(value) {
    const amount = Math.round(toMoneyNumber(value));
    if (!amount) return '';
    return new Intl.NumberFormat('vi-VN').format(amount);
}

function formatCurrencyVndZero(value) {
    const amount = Math.round(toMoneyNumber(value));
    return new Intl.NumberFormat('vi-VN').format(amount);
}

function readTripleNumber(value, forceLeadingZeroHundred = false) {
    const number = Math.max(0, Math.min(999, Math.floor(Math.abs(toMoneyNumber(value)))));
    if (number === 0) return forceLeadingZeroHundred ? 'không trăm' : '';

    const hundreds = Math.floor(number / 100);
    const tensAndUnits = number % 100;
    const tens = Math.floor(tensAndUnits / 10);
    const units = tensAndUnits % 10;
    const parts = [];

    if (hundreds > 0 || forceLeadingZeroHundred) {
        parts.push(`${NUMBER_WORDS[hundreds] || NUMBER_WORDS[0]} trăm`);
    }

    if (tens > 1) {
        parts.push(`${NUMBER_WORDS[tens]} mươi`);
        if (units === 1) parts.push('mốt');
        else if (units === 4) parts.push('tư');
        else if (units === 5) parts.push('lăm');
        else if (units > 0) parts.push(NUMBER_WORDS[units]);
        return parts.join(' ').trim();
    }

    if (tens === 1) {
        parts.push('mười');
        if (units === 5) parts.push('lăm');
        else if (units > 0) parts.push(NUMBER_WORDS[units]);
        return parts.join(' ').trim();
    }

    if (units > 0) {
        if (parts.length > 0) parts.push('lẻ');
        parts.push(NUMBER_WORDS[units]);
    }

    return parts.join(' ').trim();
}

function numberToVietnameseWords(value) {
    const amount = Math.round(Math.max(0, toMoneyNumber(value)));
    if (amount === 0) return 'Không đồng';

    const groups = [];
    let remaining = amount;
    while (remaining > 0) {
        groups.push(remaining % 1000);
        remaining = Math.floor(remaining / 1000);
    }

    const parts = [];
    for (let index = groups.length - 1; index >= 0; index -= 1) {
        const groupValue = groups[index];
        if (groupValue === 0) continue;

        const forceLeadingZeroHundred = index === 0 && parts.length > 0 && groupValue < 100;
        const groupText = readTripleNumber(groupValue, forceLeadingZeroHundred);
        const scale = SCALE_WORDS[index] || '';
        parts.push([groupText, scale].filter(Boolean).join(' '));
    }

    const sentence = parts.join(' ').replaceAll(/\s+/g, ' ').trim();
    return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)} đồng`;
}

function buildCustomerName(customer) {
    const values = [
        safeText(customer?.name),
        safeText(customer?.phone) ? `SĐT: ${safeText(customer?.phone)}` : '',
    ].filter(Boolean);
    return values.join(' - ');
}

function buildCustomerAddress(ticket) {
    const customerAddress = safeText(ticket?.customer?.address);
    const fallbackParts = [
        safeText(ticket?.vehicle?.licensePlate) ? `Biển số: ${safeText(ticket?.vehicle?.licensePlate)}` : '',
        safeText(ticket?.ticketCode) ? `Mã phiếu: ${safeText(ticket?.ticketCode)}` : '',
    ].filter(Boolean);

    if (customerAddress) return [customerAddress, ...fallbackParts].filter(Boolean).join(' - ');
    return fallbackParts.join(' - ');
}

function getInvoiceDate(ticket) {
    const rawDate = ticket?.handoverAt || ticket?.receivedAt || new Date().toISOString();
    const parsed = new Date(rawDate);
    if (!Number.isFinite(parsed.getTime())) return new Date();
    return parsed;
}

export default function AccountingInvoicePrint({ ticket: ticketProp, autoPrint = true }) {
    const location = useLocation();
    const navigate = useNavigate();
    const params = useParams();

    const ticket = useMemo(() => {
        return ticketProp ?? location?.state?.ticket ?? null;
    }, [ticketProp, location?.state?.ticket]);

    useEffect(() => {
        if (!autoPrint) return;
        if (!ticket) return;
        const id = globalThis.setTimeout?.(() => {
            globalThis.window?.print?.();
        }, 0);
        return () => {
            if (id) globalThis.clearTimeout?.(id);
        };
    }, [autoPrint, ticket]);

    const invoice = ticket?.invoice || {};
    const invoiceItems = Array.isArray(invoice?.items) ? invoice.items : [];
    const rowCount = Math.max(DEFAULT_ROW_COUNT, invoiceItems.length);

    const computedSubtotal = invoiceItems.reduce((sum, item) => sum + toMoneyNumber(item?.subTotal), 0);
    const subtotalAmount = Math.max(0, toMoneyNumber(invoice?.subtotal) || computedSubtotal);
    const discountAmount = Math.max(0, toMoneyNumber(invoice?.discountAmount));

    const totalAmount = Number.isFinite(Number(invoice?.total))
        ? Number(invoice.total)
        : Math.max(0, subtotalAmount - discountAmount);

    const totalInWords = numberToVietnameseWords(totalAmount);
    const customerName = buildCustomerName(ticket?.customer);
    const customerAddress = buildCustomerAddress(ticket);
    const issuedAt = getInvoiceDate(ticket);

    const barcodeUrl = useMemo(() => {
        const code = safeText(ticket?.ticketCode);
        if (!code) return '';
        const bcid = safeText(invoice?.barcodeType) || BARCODE_BCID;
        return `https://bwipjs-api.metafloor.com/?bcid=${encodeURIComponent(bcid)}&text=${encodeURIComponent(code)}`;
    }, [invoice?.barcodeType, ticket?.ticketCode]);

    if (!ticket) {
        const code = safeText(params?.ticketCode);
        return (
            <section className={styles.sheet}>
                <header className={styles.header}>
                    <div className={styles.storeInfo}>
                        <div className={styles.storeName}>{STORE_INFO.name}</div>
                        <div className={styles.storeLine}>Địa chỉ: {STORE_INFO.address}</div>
                    </div>
                    <div className={styles.title}>HÓA ĐƠN BÁN HÀNG</div>
                </header>

                <div style={{ marginTop: 12, marginBottom: 16 }}>
                    Thiếu dữ liệu hoá đơn để in{code ? ` (phiếu dịch vụ #${code})` : ''}.
                </div>

                <button type="button" className="ui-btn ui-btn--ghost" onClick={() => navigate(-1)}>
                    Quay lại
                </button>
            </section>
        );
    }

    return (
        <section className={styles.sheet}>
            <header className={styles.header}>
                {barcodeUrl ? (
                    <div className={styles.barcodeWrap}>
                        <img className={styles.barcodeImg} src={barcodeUrl} alt={`Barcode ${safeText(ticket?.ticketCode)}`} />
                    </div>
                ) : null}

                <div className={styles.storeInfo}>
                    <div className={styles.storeName}>{STORE_INFO.name}</div>
                    <div className={styles.storeLine}>Địa chỉ: {STORE_INFO.address}</div>
                    <div className={styles.storeLine}>Mặt hàng bán: {STORE_INFO.businessLine}</div>
                </div>

                <div className={styles.title}>HÓA ĐƠN BÁN HÀNG</div>
            </header>

            <section className={styles.customerSection}>
                <div className={styles.formRow}>
                    <span className={styles.label}>Tên khách hàng:</span>
                    <span className={styles.fillLine}>{customerName || ' '}</span>
                </div>

                <div className={styles.formRow}>
                    <span className={styles.label}>Địa chỉ:</span>
                    <span className={styles.fillLine}>{customerAddress || ' '}</span>
                </div>
            </section>

            <table className={styles.table}>
                <thead>
                    <tr>
                        <th className={styles.colIndex}>TT</th>
                        <th>TÊN HÀNG</th>
                        <th className={styles.colQty}>SỐ LƯỢNG</th>
                        <th className={styles.colPrice}>ĐƠN GIÁ</th>
                        <th className={styles.colAmount}>THÀNH TIỀN</th>
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: rowCount }).map((_, index) => {
                        const item = invoiceItems[index] ?? null;
                        return (
                            <tr key={item?.key ?? `invoice-row-${index + 1}`}>
                                <td className={styles.center}>{index + 1}</td>
                                <td>{safeText(item?.itemName || item?.categoryName) || ' '}</td>
                                <td className={styles.center}>{item ? safeText(item?.quantity) : ' '}</td>
                                <td className={styles.right}>{item ? formatCurrencyVnd(item?.unitPrice) : ' '}</td>
                                <td className={styles.right}>{item ? formatCurrencyVnd(item?.subTotal) : ' '}</td>
                            </tr>
                        );
                    })}
                    <tr className={styles.totalRow}>
                        <td colSpan={4} className={styles.totalLabel}>
                            CỘNG TIỀN HÀNG
                        </td>
                        <td className={styles.right}>{formatCurrencyVndZero(subtotalAmount)}</td>
                    </tr>

                    <tr className={styles.totalRow}>
                        <td colSpan={4} className={styles.totalLabel}>
                            GIẢM GIÁ
                        </td>
                        <td className={styles.right}>{discountAmount ? `-${formatCurrencyVndZero(discountAmount)}` : formatCurrencyVndZero(0)}</td>
                    </tr>

                    <tr className={styles.totalRow}>
                        <td colSpan={4} className={styles.totalLabel}>
                            TỔNG THANH TOÁN
                        </td>
                        <td className={styles.right}>{formatCurrencyVndZero(totalAmount)}</td>
                    </tr>
                </tbody>
            </table>

            <div className={styles.wordsRow}>
                <span className={styles.label}>Thành tiền (viết bằng chữ):</span>
                <span className={styles.fillLine}>{totalInWords}</span>
            </div>

            <footer className={styles.footer}>
                <div className={styles.dateText}>
                    Ngày {issuedAt.getDate()} tháng {issuedAt.getMonth() + 1} năm {issuedAt.getFullYear()}
                </div>

                <div className={styles.signatureRow}>
                    <div className={styles.signatureCol}>
                        <div className={styles.signatureTitle}>KHÁCH HÀNG</div>
                    </div>
                    <div className={styles.signatureCol}>
                        <div className={styles.signatureTitle}>NGƯỜI BÁN HÀNG</div>
                    </div>
                </div>
            </footer>
        </section>
    );
}

AccountingInvoicePrint.propTypes = {
    ticket: PropTypes.shape({
        ticketCode: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        receivedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
        handoverAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
        customer: PropTypes.shape({
            name: PropTypes.string,
            phone: PropTypes.string,
            address: PropTypes.string,
        }),
        vehicle: PropTypes.shape({
            licensePlate: PropTypes.string,
        }),
        invoice: PropTypes.shape({
            barcodeType: PropTypes.string,
            subtotal: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            discountAmount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            total: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            items: PropTypes.arrayOf(
                PropTypes.shape({
                    key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
                    categoryName: PropTypes.string,
                    itemName: PropTypes.string,
                    quantity: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
                    unitPrice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
                    subTotal: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
                }),
            ),
        }),
    }),
    autoPrint: PropTypes.bool,
};
