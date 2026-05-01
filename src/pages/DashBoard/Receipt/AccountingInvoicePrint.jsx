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
    businessLine: 'Dịch vụ chăm sóc xe, bảo dưỡng, sửa chữa, phụ tùng ô tô',
};

const BARCODE_BCID = 'code128';
const QR_BCID = 'qrcode';

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

function formatTaxRateForPrint(item) {
    const directText = safeText(item?.taxRateText ?? item?.tax_rate_text);
    if (directText) return directText;

    const rawRate = item?.appliedTaxRate ?? item?.applied_tax_rate ?? item?.taxRate ?? item?.tax_rate;
    const rate = typeof rawRate === 'number' ? rawRate : Number(String(rawRate ?? '').trim());
    if (Number.isFinite(rate) && rate > 0) {
        const percent = rate > 1 ? rate : rate * 100;
        return `${percent.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`;
    }

    return toMoneyNumber(item?.taxAmount ?? item?.tax_amount) > 0 ? '--' : '0%';
}

function isReturnedInvoiceItem(item) {
    return String(
        item?.stockAllocation?.status ??
            item?.allocation?.status ??
            item?.warehouseAllocation?.status ??
            item?.stockAllocationStatus ??
            item?.stock_allocation_status ??
            item?.allocationStatus ??
            '',
    ).trim().toUpperCase() === 'RELEASED';
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
    return safeText(customer?.name);
}

function buildCustomerAddress(ticket) {
    return safeText(ticket?.customer?.address);
}

function buildInvoiceItemName(item) {
    return safeText(
        item?.itemName ||
        item?.description ||
        item?.productName ||
        item?.serviceName ||
        item?.categoryName ||
        '',
    );
}

function getInvoiceDate(ticket) {
    const rawDate = ticket?.handoverAt || ticket?.receivedAt || new Date().toISOString();
    const parsed = new Date(rawDate);
    if (!Number.isFinite(parsed.getTime())) return new Date();
    return parsed;
}

function encodeBase64Url(value) {
    const bytes = new TextEncoder().encode(String(value ?? ''));
    let binary = '';
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function buildVatInvoicePayload({ ticket, subtotalAmount, discountAmount, totalAmount, issuedAt }) {
    return {
        sid: ticket?.serviceTicketId ?? ticket?.serviceTicketID ?? ticket?.serviceTicket?.serviceTicketId ?? null,
        c: safeText(ticket?.ticketCode || ticket?.serviceTicketCode || ticket?.code),
        d: issuedAt.toISOString().slice(0, 10),
        u: [buildCustomerName(ticket?.customer), safeText(ticket?.customer?.phone), buildCustomerAddress(ticket)],
        v: [safeText(ticket?.vehicle?.licensePlate), safeText(ticket?.vehicle?.model)],
        s: subtotalAmount,
        g: discountAmount,
        t: totalAmount,
    };
}

export default function AccountingInvoicePrint({ ticket: ticketProp, autoPrint = true }) {
    const location = useLocation();
    const navigate = useNavigate();
    const params = useParams();

    const ticket = useMemo(() => {
        return ticketProp ?? location?.state?.ticket ?? null;
    }, [ticketProp, location?.state?.ticket]);

    const invoice = useMemo(() => ticket?.invoice || {}, [ticket]);
    const invoiceItems = useMemo(
        () => (Array.isArray(invoice?.items) ? invoice.items.filter((item) => !isReturnedInvoiceItem(item)) : []),
        [invoice],
    );
    const rowCount = Math.max(DEFAULT_ROW_COUNT, invoiceItems.length);

    const computedSubtotal = invoiceItems.reduce((sum, item) => sum + (toMoneyNumber(item?.grossAmount) || toMoneyNumber(item?.subTotal)), 0);
    const subtotalAmount = Math.max(0, toMoneyNumber(invoice?.subtotal) || computedSubtotal);
    const discountAmount = Math.max(0, toMoneyNumber(invoice?.discountAmount));
    const lineDiscountAmount = invoiceItems.reduce((sum, item) => sum + toMoneyNumber(item?.discountAmount ?? item?.discount_amount), 0);
    const displayDiscountAmount = Math.max(discountAmount, lineDiscountAmount);

    const totalAmount = Number.isFinite(Number(invoice?.total))
        ? Number(invoice.total)
        : Math.max(0, subtotalAmount - displayDiscountAmount);

    const totalInWords = numberToVietnameseWords(totalAmount);
    const customerName = buildCustomerName(ticket?.customer);
    const customerAddress = buildCustomerAddress(ticket);
    const customerPhone = safeText(ticket?.customer?.phone);
    const ticketCode = safeText(ticket?.ticketCode || ticket?.serviceTicketCode || ticket?.code);
    const licensePlate = safeText(ticket?.vehicle?.licensePlate);
    const vehicleModel = safeText(ticket?.vehicle?.model);
    const issuedAt = getInvoiceDate(ticket);

    const barcodeUrl = useMemo(() => {
        const code = safeText(ticket?.ticketCode || ticket?.serviceTicketCode || ticket?.code);
        if (!code) return '';
        const bcid = safeText(invoice?.barcodeType) || BARCODE_BCID;
        return `https://bwipjs-api.metafloor.com/?bcid=${encodeURIComponent(bcid)}&text=${encodeURIComponent(code)}&scale=2&height=12&includetext&textxalign=center&textsize=9&paddingwidth=8`;
    }, [invoice?.barcodeType, ticket?.code, ticket?.serviceTicketCode, ticket?.ticketCode]);

    const vatInvoiceUrl = useMemo(() => {
        if (!ticketCode) return '';
        const origin = globalThis.window?.location?.origin || '';
        if (!origin) return '';
        const payload = buildVatInvoicePayload({
            ticket,
            subtotalAmount,
            discountAmount: displayDiscountAmount,
            totalAmount,
            issuedAt,
        });
        const serviceTicketId = payload.sid == null ? '' : String(payload.sid).trim();
        const params = new URLSearchParams();
        params.set('ticketCode', ticketCode);
        if (serviceTicketId) params.set('serviceTicketId', serviceTicketId);
        if (!serviceTicketId) {
            params.set('data', encodeBase64Url(JSON.stringify(payload)));
        }
        return `${origin}/vat-invoice?${params.toString()}`;
    }, [displayDiscountAmount, issuedAt, subtotalAmount, ticket, ticketCode, totalAmount]);

    const vatQrUrl = useMemo(() => {
        if (!vatInvoiceUrl) return '';
        return `https://bwipjs-api.metafloor.com/?bcid=${encodeURIComponent(QR_BCID)}&text=${encodeURIComponent(vatInvoiceUrl)}&scale=8&eclevel=M&paddingwidth=14`;
    }, [vatInvoiceUrl]);

    useEffect(() => {
        if (!autoPrint) return;
        if (!ticket) return;

        let rafId = 0;
        let timeoutId = 0;
        let didPrint = false;

        const areCodeImagesReady = () => {
            const images = Array.from(globalThis.document?.querySelectorAll?.('[data-role="invoice-code-img"]') || []);
            if (images.length === 0) return true;
            return images.every((img) => img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0);
        };

        const doPrint = async () => {
            if (didPrint) return;
            didPrint = true;
            if (rafId) globalThis.cancelAnimationFrame?.(rafId);
            if (timeoutId) globalThis.clearTimeout?.(timeoutId);
            try {
                await globalThis.document?.fonts?.ready;
            } catch {
                // ignore
            }
            globalThis.window?.print?.();
        };

        const waitAndPrint = () => {
            if (areCodeImagesReady()) {
                void doPrint();
                return;
            }
            rafId = globalThis.requestAnimationFrame?.(waitAndPrint);
        };

        rafId = globalThis.requestAnimationFrame?.(waitAndPrint);
        timeoutId = globalThis.setTimeout?.(() => {
            void doPrint();
        }, 8000);

        return () => {
            if (rafId) globalThis.cancelAnimationFrame?.(rafId);
            if (timeoutId) globalThis.clearTimeout?.(timeoutId);
        };
    }, [autoPrint, barcodeUrl, vatQrUrl, ticket]);

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
                <div className={styles.headerTop}>
                    <div className={styles.storeInfo}>
                        <div className={styles.storeName}>{STORE_INFO.name}</div>
                        <div className={styles.storeLine}>Địa chỉ: {STORE_INFO.address}</div>
                        <div className={styles.storeLine}>Mặt hàng bán: {STORE_INFO.businessLine}</div>
                    </div>

                    <div className={styles.invoiceMeta}>
                        <div className={styles.metaRow}>
                            <span>Mã phiếu</span>
                            <strong>{ticketCode || '-'}</strong>
                        </div>
                        <div className={styles.metaRow}>
                            <span>Ngày lập</span>
                            <strong>{issuedAt.getDate()}/{issuedAt.getMonth() + 1}/{issuedAt.getFullYear()}</strong>
                        </div>
                        <div className={styles.codeWrap}>
                            <span
                                hidden
                                data-role="vat-qr-state"
                                data-ready={vatInvoiceUrl ? String(Boolean(vatQrUrl)) : 'true'}
                            />
                            {barcodeUrl ? (
                                <div className={styles.barcodeWrap}>
                                    <img
                                        className={styles.barcodeImg}
                                        src={barcodeUrl}
                                        alt={`Barcode ${ticketCode}`}
                                        loading="eager"
                                        decoding="sync"
                                        fetchPriority="high"
                                        data-role="invoice-code-img"
                                    />
                                </div>
                            ) : null}
                            {vatQrUrl ? (
                                <div className={styles.qrWrap}>
                                    <img
                                        className={styles.qrImg}
                                        src={vatQrUrl}
                                        alt="QR hóa đơn giá trị gia tăng"
                                        loading="eager"
                                        decoding="sync"
                                        fetchPriority="high"
                                        data-role="invoice-code-img"
                                    />
                                    <span>QR HĐ GTGT</span>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div className={styles.title}>HÓA ĐƠN BÁN HÀNG</div>
            </header>

            <section className={styles.customerSection}>
                <div className={`${styles.formRow} ${styles.twoColRow}`}>
                    <span className={styles.label}>Tên khách hàng:</span>
                    <span className={styles.fillLine}>{customerName || ' '}</span>
                    <span className={styles.label}>Điện thoại:</span>
                    <span className={styles.fillLine}>{customerPhone || ' '}</span>
                </div>

                <div className={styles.formRow}>
                    <span className={styles.label}>Địa chỉ:</span>
                    <span className={styles.fillLine}>{customerAddress || ' '}</span>
                </div>

                <div className={`${styles.formRow} ${styles.twoColRow}`}>
                    <span className={styles.label}>Biển số:</span>
                    <span className={styles.fillLine}>{licensePlate || ' '}</span>
                    <span className={styles.label}>Loại xe:</span>
                    <span className={styles.fillLine}>{vehicleModel || ' '}</span>
                </div>
            </section>

            <table className={styles.table}>
                <thead>
                    <tr>
                        <th className={styles.colIndex}>TT</th>
                        <th>TÊN HÀNG</th>
                        <th className={styles.colQty}>SỐ LƯỢNG</th>
                        <th className={styles.colPrice}>ĐƠN GIÁ</th>
                        <th className={styles.colDiscount}>GIẢM GIÁ</th>
                        <th className={styles.colTax}>THUẾ</th>
                        <th className={styles.colAmount}>THÀNH TIỀN</th>
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: rowCount }).map((_, index) => {
                        const item = invoiceItems[index] ?? null;
                        return (
                            <tr key={item?.key ?? `invoice-row-${index + 1}`}>
                                <td className={styles.center}>{index + 1}</td>
                                <td>{buildInvoiceItemName(item) || ' '}</td>
                                <td className={styles.center}>{item ? safeText(item?.quantity) : ' '}</td>
                                <td className={styles.right}>{item ? formatCurrencyVnd(item?.unitPrice) : ' '}</td>
                                <td className={styles.right}>{item ? formatCurrencyVndZero(item?.discountAmount ?? item?.discount_amount) : ' '}</td>
                                <td className={styles.center}>{item ? formatTaxRateForPrint(item) : ' '}</td>
                                <td className={styles.right}>{item ? formatCurrencyVnd(item?.subTotal) : ' '}</td>
                            </tr>
                        );
                    })}
                    <tr className={styles.totalRow}>
                        <td colSpan={6} className={styles.totalLabel}>
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
        serviceTicketId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
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
                    discountAmount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
                    taxRateText: PropTypes.string,
                    taxAmount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
                    grossAmount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
                    subTotal: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
                }),
            ),
        }),
    }),
    autoPrint: PropTypes.bool,
};
