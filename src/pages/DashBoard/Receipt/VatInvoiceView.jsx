import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import styles from './VatInvoiceView.module.css';

const NUMBER_WORDS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const SCALE_WORDS = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
const STORE_INFO = {
    name: 'MICHELIN SƠN TÂY',
    address: '674 QL21, Tân Phúc, Sơn Đông, Sơn Tây, Hà Nội',
    businessLine: 'Dịch vụ chăm sóc xe, bảo dưỡng, sửa chữa, phụ tùng ô tô',
};

function safeText(value) {
    if (value == null) return '';
    return String(value).trim();
}

function toMoneyNumber(value) {
    const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
    return Number.isFinite(n) ? n : 0;
}

function formatCurrencyVndZero(value) {
    return new Intl.NumberFormat('vi-VN').format(Math.round(toMoneyNumber(value)));
}

function readTripleNumber(value, forceLeadingZeroHundred = false) {
    const number = Math.max(0, Math.min(999, Math.floor(Math.abs(toMoneyNumber(value)))));
    if (number === 0) return forceLeadingZeroHundred ? 'không trăm' : '';

    const hundreds = Math.floor(number / 100);
    const rest = number % 100;
    const tens = Math.floor(rest / 10);
    const units = rest % 10;
    const parts = [];

    if (hundreds > 0 || forceLeadingZeroHundred) parts.push(`${NUMBER_WORDS[hundreds] || NUMBER_WORDS[0]} trăm`);
    if (tens > 1) {
        parts.push(`${NUMBER_WORDS[tens]} mươi`);
        if (units === 1) parts.push('mốt');
        else if (units === 4) parts.push('tư');
        else if (units === 5) parts.push('lăm');
        else if (units > 0) parts.push(NUMBER_WORDS[units]);
        return parts.join(' ');
    }
    if (tens === 1) {
        parts.push('mười');
        if (units === 5) parts.push('lăm');
        else if (units > 0) parts.push(NUMBER_WORDS[units]);
        return parts.join(' ');
    }
    if (units > 0) {
        if (parts.length > 0) parts.push('lẻ');
        parts.push(NUMBER_WORDS[units]);
    }
    return parts.join(' ');
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
        const scale = SCALE_WORDS[index] || '';
        parts.push([readTripleNumber(groupValue, forceLeadingZeroHundred), scale].filter(Boolean).join(' '));
    }
    const sentence = parts.join(' ').replaceAll(/\s+/g, ' ').trim();
    return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)} đồng`;
}

function decodeBase64Url(value) {
    const normalized = String(value ?? '').replaceAll('-', '+').replaceAll('_', '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}

function parsePayload(rawData) {
    if (!rawData) return null;
    try {
        const decoded = decodeBase64Url(rawData);
        const parsed = JSON.parse(decoded);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
}

function normalizePayload(payload) {
    if (!payload || typeof payload !== 'object') return null;
    if (payload.invoice || payload.customer || payload.ticketCode) {
        return payload;
    }

    return {
        store: STORE_INFO,
        ticketCode: safeText(payload.c),
        issuedAt: safeText(payload.d),
        customer: {
            name: safeText(payload.u?.[0]),
            phone: safeText(payload.u?.[1]),
            address: safeText(payload.u?.[2]),
        },
        vehicle: {
            licensePlate: safeText(payload.v?.[0]),
            model: safeText(payload.v?.[1]),
        },
        invoice: {
            items: Array.isArray(payload.i)
                ? payload.i.map((item) => ({
                    name: safeText(item?.[0]),
                    quantity: safeText(item?.[1]),
                    unitPrice: toMoneyNumber(item?.[2]),
                    subTotal: toMoneyNumber(item?.[3]),
                }))
                : [],
            subtotal: toMoneyNumber(payload.s),
            discountAmount: toMoneyNumber(payload.g),
            total: toMoneyNumber(payload.t),
        },
    };
}

function formatDateParts(value) {
    const parsed = new Date(value || Date.now());
    const date = Number.isFinite(parsed.getTime()) ? parsed : new Date();
    return {
        day: date.getDate(),
        month: date.getMonth() + 1,
        year: date.getFullYear(),
    };
}

export default function VatInvoiceView() {
    const [searchParams] = useSearchParams();
    const payload = useMemo(() => normalizePayload(parsePayload(searchParams.get('data'))), [searchParams]);

    if (!payload) {
        return (
            <main className={styles.page}>
                <section className={styles.sheet}>
                    <h1 className={styles.title}>Không đọc được dữ liệu hóa đơn</h1>
                    <p className={styles.muted}>Mã QR không hợp lệ hoặc dữ liệu hóa đơn đã bị thiếu.</p>
                </section>
            </main>
        );
    }

    const store = payload.store || STORE_INFO;
    const invoice = payload.invoice || {};
    const items = Array.isArray(invoice.items) ? invoice.items : [];
    const subtotal = toMoneyNumber(invoice.subtotal);
    const discountAmount = toMoneyNumber(invoice.discountAmount);
    const total = toMoneyNumber(invoice.total) || Math.max(0, subtotal - discountAmount);
    const date = formatDateParts(payload.issuedAt);

    return (
        <main className={styles.page}>
            <section className={styles.sheet}>
                <header className={styles.header}>
                    <div className={styles.sellerName}>{safeText(store.name) || 'MICHELIN SƠN TÂY'}</div>
                    <div className={styles.sellerLine}>Địa chỉ: {safeText(store.address) || '-'}</div>
                    <div className={styles.sellerLine}>Mặt hàng bán: {safeText(store.businessLine) || '-'}</div>
                    <h1 className={styles.title}>HÓA ĐƠN GIÁ TRỊ GIA TĂNG</h1>
                    <div className={styles.dateLine}>Ngày {date.day} tháng {date.month} năm {date.year}</div>
                    <div className={styles.lookupLine}>Mã phiếu bán hàng: <strong>{safeText(payload.ticketCode) || '-'}</strong></div>
                </header>

                <section className={styles.customerBlock}>
                    <div><strong>Họ tên người mua hàng:</strong> {safeText(payload.customer?.name) || '-'}</div>
                    <div><strong>Số điện thoại:</strong> {safeText(payload.customer?.phone) || '-'}</div>
                    <div><strong>Địa chỉ:</strong> {safeText(payload.customer?.address) || '-'}</div>
                    <div><strong>Biển số:</strong> {safeText(payload.vehicle?.licensePlate) || '-'}</div>
                    <div><strong>Loại xe:</strong> {safeText(payload.vehicle?.model) || '-'}</div>
                </section>

                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Tên hàng hóa, dịch vụ</th>
                            <th>Số lượng</th>
                            <th>Đơn giá</th>
                            <th>Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={`${safeText(item.name)}-${index}`}>
                                <td className={styles.center}>{index + 1}</td>
                                <td>{safeText(item.name) || '-'}</td>
                                <td className={styles.center}>{safeText(item.quantity) || '-'}</td>
                                <td className={styles.right}>{formatCurrencyVndZero(item.unitPrice)}</td>
                                <td className={styles.right}>{formatCurrencyVndZero(item.subTotal)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <section className={styles.summary}>
                    <div><span>Tổng tiền hàng:</span><strong>{formatCurrencyVndZero(subtotal)}</strong></div>
                    <div><span>Giảm giá:</span><strong>{discountAmount ? `-${formatCurrencyVndZero(discountAmount)}` : formatCurrencyVndZero(0)}</strong></div>
                    <div><span>Tổng cộng tiền thanh toán:</span><strong>{formatCurrencyVndZero(total)}</strong></div>
                </section>

                <div className={styles.wordsLine}>
                    <strong>Tổng số tiền viết bằng chữ:</strong> {numberToVietnameseWords(total)}
                </div>

                <footer className={styles.footer}>
                    <div>Người mua hàng</div>
                    <div>Người bán hàng</div>
                </footer>
            </section>
        </main>
    );
}
