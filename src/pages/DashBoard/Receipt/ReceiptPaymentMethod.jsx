import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import styles from './ReceiptPaymentMethod.module.css';
import { getVietQrUrl } from '../../../services/paymentQrService.js'; 
import { toast } from 'react-toastify';
import { fetchPaymentByServiceTicketId, payBill } from '../../../services/paymentService.js';
import { fetchServiceTicketDetail, fetchServiceTicketEstimate, manageServiceTicketStatus } from '../../../services/serviceTicketService.js';
import { getStatusTextVi, normalizeStatusCode } from '../../../components/statusUtils.js';
import AccountingInvoicePrint from './AccountingInvoicePrint.jsx';

function toMoneyNumber(value) {
    const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
    return Number.isFinite(n) ? n : 0;
}

function formatCurrencyVnd(value) {
    const n = toMoneyNumber(value);
    return `${new Intl.NumberFormat('vi-VN').format(Math.round(n))} VND`;
}

function pickLatestEstimate(list) {
    const arr = Array.isArray(list) ? list : [];
    if (arr.length === 0) return null;

    return [...arr].sort((a, b) => {
        const rawA = a?.version ?? a?.estimateVersion ?? a?.estimateNo ?? a?.versionNo;
        const rawB = b?.version ?? b?.estimateVersion ?? b?.estimateNo ?? b?.versionNo;
        const versionA = typeof rawA === 'number' ? rawA : Number(/\d+/.exec(String(rawA ?? ''))?.[0] ?? '');
        const versionB = typeof rawB === 'number' ? rawB : Number(/\d+/.exec(String(rawB ?? ''))?.[0] ?? '');
        const hasVersionA = Number.isFinite(versionA) && versionA > 0;
        const hasVersionB = Number.isFinite(versionB) && versionB > 0;
        if (hasVersionA && hasVersionB && versionA !== versionB) return versionB - versionA;
        if (hasVersionA && !hasVersionB) return -1;
        if (!hasVersionA && hasVersionB) return 1;

        const idA = Number(a?.estimateId ?? a?.id ?? a?.serviceTicketEstimateId ?? 0);
        const idB = Number(b?.estimateId ?? b?.id ?? b?.serviceTicketEstimateId ?? 0);
        if (idA > 0 && idB > 0 && idA !== idB) return idB - idA;

        const ta = new Date(a?.createdAt || a?.approvedAt || a?.createdDate || 0).getTime();
        const tb = new Date(b?.createdAt || b?.approvedAt || b?.createdDate || 0).getTime();
        return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    })[0];
}

function pickMoneyDisplayValue(withVatValue, baseValue) {
    const withVatNum = toMoneyNumber(withVatValue);
    if (withVatNum > 0) return withVatNum;
    const baseNum = toMoneyNumber(baseValue);
    return Math.max(0, baseNum);
}

function normalizeTaxRatePercentText(rawRate) {
    const n = typeof rawRate === 'number' ? rawRate : Number(String(rawRate ?? '').trim());
    if (!Number.isFinite(n)) return '';
    let rate = n;
    if (rate > 1) rate = rate / 100;
    if (rate < 0) rate = 0;
    const pct = rate * 100;
    const text = pct.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
    return `${text}%`;
}

function extractPaymentEstimates(paymentPayload) {
    const root = paymentPayload?.data ?? paymentPayload;
    const list = root?.estimate ?? root?.estimates ?? root?.estimateList ?? root?.estimate_list;
    return Array.isArray(list) ? list : [];
}

function pickEstimateFromPayment(paymentPayload) {
    const list = extractPaymentEstimates(paymentPayload);
    if (!list.length) return null;

    const rawId = paymentPayload?.estimateId ?? paymentPayload?.estimate_id;
    const idNum = typeof rawId === 'number' ? rawId : Number(String(rawId ?? '').trim());
    if (Number.isFinite(idNum) && idNum > 0) {
        const matched = list.find((e) => Number(e?.estimateId ?? e?.id ?? 0) === idNum);
        if (matched) return matched;
    }
    return pickLatestEstimate(list);
}

export default function ReceiptPaymentMethod() {
    useScrollToTop();
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();

    const ticketCodeParam = String(params?.ticketCode || '').trim();
    const ticketFromState = location?.state?.ticket ?? null;
    const serviceTicketIdFromState = location?.state?.serviceTicketId ?? ticketFromState?.serviceTicketId ?? null;

    const [serviceTicketId, setServiceTicketId] = useState(() => {
        const raw = serviceTicketIdFromState;
        const id = typeof raw === 'number' ? raw : Number(String(raw ?? '').trim());
        return Number.isFinite(id) && id > 0 ? id : null;
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [payment, setPayment] = useState(null);

    const [estimateLoading, setEstimateLoading] = useState(false);
    const [estimateError, setEstimateError] = useState('');
    const [estimate, setEstimate] = useState(null);

    const [method, setMethod] = useState('transfer');
    const [submitting, setSubmitting] = useState(false);
    const [printTicket, setPrintTicket] = useState(null);
    const [printRequested, setPrintRequested] = useState(false);
    const printContainerRef = useRef(null);

    const token = useMemo(() => localStorage.getItem('staffToken') || localStorage.getItem('authToken'), []);

    useEffect(() => {
        if (!token) {
            setError('Vui lòng đăng nhập để thanh toán.');
            setLoading(false);
            return;
        }

        if (serviceTicketId) return;
        if (!ticketCodeParam) {
            setError('Thiếu ticketCode để lấy thông tin thanh toán.');
            setLoading(false);
            return;
        }

        let ignore = false;
        const run = async () => {
            try {
                setLoading(true);
                setError('');
                const res = await fetchServiceTicketDetail(ticketCodeParam, token);
                if (ignore) return;
                const detail = res?.data ?? res;
                const raw = detail?.serviceTicketId ?? detail?.ticketId ?? detail?.id ?? null;
                const id = typeof raw === 'number' ? raw : Number(String(raw ?? '').trim());
                if (!Number.isFinite(id) || id <= 0) throw new Error('Không tìm thấy serviceTicketId hợp lệ.');
                setServiceTicketId(id);
            } catch (err) {
                if (ignore) return;
                setError(err?.message || 'Không thể lấy serviceTicketId.');
                setLoading(false);
            }
        };
        run();
        return () => {
            ignore = true;
        };
    }, [serviceTicketId, ticketCodeParam, token]);

    useEffect(() => {
        if (!token) return;
        if (!serviceTicketId) return;

        let ignore = false;
        const run = async () => {
            try {
                setLoading(true);
                setError('');
                const res = await fetchPaymentByServiceTicketId(serviceTicketId, token);
                if (ignore) return;
                const payload = res?.data?.data ?? res?.data ?? res;
                const safePayload = payload && typeof payload === 'object' ? payload : null;
                setPayment(safePayload);

                // Payment API already returns estimate + items + appliedTaxRate.
                setEstimate(pickEstimateFromPayment(safePayload) ?? null);
                setEstimateError('');
            } catch (err) {
                if (ignore) return;
                setPayment(null);
                setError(err?.message || 'Không thể tải thông tin thanh toán.');
            } finally {
                if (!ignore) setLoading(false);
            }
        };

        run();
        return () => {
            ignore = true;
        };
    }, [serviceTicketId, token]);

    useEffect(() => {
        if (!token) return;
        if (!serviceTicketId) return;

        // Prefer estimate returned by payment API.
        const paymentEstimates = extractPaymentEstimates(payment);
        if (paymentEstimates.length > 0) {
            setEstimate(pickEstimateFromPayment(payment) ?? null);
            setEstimateLoading(false);
            setEstimateError('');
            return;
        }

        let ignore = false;
        const run = async () => {
            try {
                setEstimateLoading(true);
                setEstimateError('');
                const res = await fetchServiceTicketEstimate(serviceTicketId, token);
                if (ignore) return;
                setEstimate(pickLatestEstimate(res?.data) ?? null);
            } catch (err) {
                if (ignore) return;
                setEstimate(null);
				setEstimateError(err?.message || 'Không thể tải báo giá.');
            } finally {
                if (!ignore) setEstimateLoading(false);
            }
        };
        run();

        return () => {
            ignore = true;
        };
    }, [payment, serviceTicketId, token]);

    const billId = useMemo(() => {
        const raw = payment?.billId ?? payment?.billID ?? payment?.data?.billId ?? null;
        const n = typeof raw === 'number' ? raw : Number(String(raw ?? '').trim());
        return Number.isFinite(n) && n > 0 ? n : null;
    }, [payment]);

    const paymentStatusCode = normalizeStatusCode(payment?.paymentStatus);
    const paymentStatusLabel = getStatusTextVi(paymentStatusCode, paymentStatusCode || '-');
    const isPaid = paymentStatusCode === 'PAID';

    const estimateItems = useMemo(() => {
        const items = Array.isArray(estimate?.items) ? estimate.items : [];
        return items
            .filter((it) => !it?.isRemoved)
            .map((it, idx) => {
                const quantity = toMoneyNumber(it?.quantity);
                const unitPriceBase = toMoneyNumber(it?.unitPrice);
                const subTotalBase = toMoneyNumber(it?.subTotal);
                const unitPriceWithVat = it?.unitPriceWithVat ?? it?.unitPriceWithVAT ?? 0;
                const subTotalWithVat = it?.subTotalWithVat ?? it?.subTotalWithVAT ?? 0;
                const unitPriceWithVatNum = toMoneyNumber(unitPriceWithVat);
                const subTotalWithVatNum = toMoneyNumber(subTotalWithVat);
                const unitPriceDisplay = pickMoneyDisplayValue(unitPriceWithVatNum, unitPriceBase);
                const subTotalDisplay = pickMoneyDisplayValue(subTotalWithVatNum, subTotalBase);
                const rawFinalPrice = it?.finalPrice ?? it?.final_price;
                const finalPriceDisplay =
                    rawFinalPrice == null || String(rawFinalPrice).trim() === ''
                        ? subTotalDisplay
                        : toMoneyNumber(rawFinalPrice);
                const discountAmount = Math.max(
                    toMoneyNumber(it?.discountAmount ?? it?.discount_amount),
                    subTotalDisplay - finalPriceDisplay,
                    0,
                );

                const appliedTaxRate = it?.appliedTaxRate ?? it?.applied_tax_rate ?? null;
                const appliedTaxRateText = normalizeTaxRatePercentText(appliedTaxRate);
                const hasAnyTaxRate = Boolean(appliedTaxRateText);
                const workCategoryTaxRuleId = it?.workCategory?.taxRuleId ?? it?.workCategory?.tax_rule_id ?? null;
                const taxCode = String(it?.taxCode ?? it?.tax_code ?? '').trim();
                const taxAmount = toMoneyNumber(it?.taxAmount ?? it?.tax_amount);

                let taxRateText = '0%';
                if (hasAnyTaxRate) {
                    taxRateText = appliedTaxRateText;
                } else if (taxAmount > 0) {
                    taxRateText = '--';
                }

                const taxTitleParts = [];
                if (taxCode) taxTitleParts.push(`Tax: ${taxCode}`);
                if (workCategoryTaxRuleId != null && String(workCategoryTaxRuleId).trim() !== '') {
                    taxTitleParts.push(`TaxRule #${workCategoryTaxRuleId}`);
                }
                const taxTitle = taxTitleParts.join(' • ');

                // Display rule:
                // - If appliedTaxRate is present => show it (this is the correct rate applied by backend).
                // - Else if there is any tax amount => show '--' (rate missing but tax applied).
                // - Else show 0%.
                const categoryName = it?.workCategory?.categoryName || it?.workCategory?.categoryCode || it?.newCategoryName || '';
                const giftRaw = it?.isGift ?? it?.is_gift;
                const isGift = giftRaw === true || String(giftRaw ?? '').trim().toLowerCase() === 'true';
                return {
                    key: String(it?.estimateItemId ?? it?.itemId ?? `${idx}`),
                    categoryName,
                    itemName: String(it?.itemName || '').trim(),
                    quantity,
                    isGift,
                    warehouseName: String(it?.warehouseName ?? it?.warehouse?.warehouseName ?? it?.warehouse?.name ?? '').trim(),
                    unitPriceDisplay,
                    discountAmount,
                    taxRateText,
                    taxCode,
                    workCategoryTaxRuleId,
                    taxTitle,
                    subTotalDisplay,
                    finalPriceDisplay,
                };
            })
            .filter(
                (r) =>
                    r.itemName ||
                    r.categoryName ||
                    r.quantity > 0 ||
                    r.unitPriceDisplay > 0 ||
                    r.finalPriceDisplay > 0,
            );
    }, [estimate]);

    const payItems = estimateItems;
    const totalSafe = useMemo(() => {
        const estimateTotal = payItems.reduce((sum, item) => sum + toMoneyNumber(item?.finalPriceDisplay), 0);
        if (estimateTotal > 0) return estimateTotal;
        return toMoneyNumber(
            payment?.finalAmount ??
            payment?.final_amount ??
            payment?.totalAmount ??
            payment?.total_amount ??
            payment?.amount,
        );
    }, [payItems, payment]);

    const transferContent = useMemo(() => {
        const code = ticketCodeParam || ticketFromState?.ticketCode || 'SERVICE_TICKET';
        return `Thanh toan hoa don ${code}`;
    }, [ticketCodeParam, ticketFromState?.ticketCode]);

    const qrImgSrc = useMemo(() => {
        if (method !== 'transfer') return '';
        return getVietQrUrl({ amountVnd: totalSafe, description: transferContent });
    }, [method, totalSafe, transferContent]);

    useEffect(() => {
        const onAfterPrint = () => {
            setPrintRequested(false);
            setPrintTicket(null);
        };

        globalThis.window?.addEventListener?.('afterprint', onAfterPrint);
        return () => {
            globalThis.window?.removeEventListener?.('afterprint', onAfterPrint);
        };
    }, []);

    useEffect(() => {
        if (!printRequested || !printTicket) return;

        let rafId = 0;
        let timeoutId = 0;
        let attempts = 0;
        let didPrint = false;

        const isInvoiceDomReady = () => {
            const root = printContainerRef.current;
            if (!root) return false;
            const hasTable = Boolean(root.querySelector('table'));
            const textLen = (root.textContent || '').trim().length;
            const qrStates = Array.from(root.querySelectorAll('[data-role="vat-qr-state"]'));
            const vatQrReady = qrStates.every((node) => node instanceof HTMLElement && node.dataset.ready === 'true');
            return hasTable && textLen > 20 && vatQrReady;
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

        const tryPrint = async () => {
            attempts += 1;
            if (isInvoiceDomReady() || attempts >= 60) {
                await doPrint();
                return;
            }
            rafId = globalThis.requestAnimationFrame?.(tryPrint);
        };

        rafId = globalThis.requestAnimationFrame?.(tryPrint);
        timeoutId = globalThis.setTimeout?.(() => {
            void doPrint();
        }, 1500);

        return () => {
            if (rafId) globalThis.cancelAnimationFrame?.(rafId);
            if (timeoutId) globalThis.clearTimeout?.(timeoutId);
        };
    }, [printRequested, printTicket]);

    const handlePrintInvoice = () => {
        const ticketCode = ticketCodeParam || ticketFromState?.ticketCode;
        if (!ticketCode) {
            toast.error('Không tìm thấy mã phiếu dịch vụ để in hoá đơn.');
            return;
        }

        if (!payItems || payItems.length === 0) {
            toast.error('Chưa có hạng mục xác nhận để in hoá đơn.');
            return;
        }

        const invoiceItems = payItems.map((item, idx) => {
            const quantity = toMoneyNumber(item?.quantity ?? 1) || 1;
            const unitPrice = toMoneyNumber(item?.unitPrice ?? item?.unitPriceDisplay ?? 0);
            const discountAmount = Math.max(0, toMoneyNumber(item?.discountAmount));
            const grossAmount = toMoneyNumber(item?.subTotalDisplay) || unitPrice * quantity;
            const subTotal = toMoneyNumber(item?.finalPrice ?? item?.finalPriceDisplay ?? 0) || Math.max(0, grossAmount - discountAmount);

            return {
                key: item?.key ?? String(idx + 1),
                categoryName: item?.categoryName ?? '',
                itemName: item?.itemName ?? '',
                warehouseName: item?.warehouseName ?? '',
                quantity,
                unitPrice,
                discountAmount,
                grossAmount,
                subTotal,
                isGift: Boolean(item?.isGift),
            };
        });

        const computedSubtotal = invoiceItems.reduce((sum, item) => sum + (toMoneyNumber(item?.grossAmount) || toMoneyNumber(item?.subTotal)), 0);
        const invoiceSubtotal = Math.max(0, toMoneyNumber(payment?.subTotal) || computedSubtotal);
        const computedDiscountAmount = invoiceItems.reduce((sum, item) => sum + toMoneyNumber(item?.discountAmount), 0);
        const invoiceDiscountAmount = Math.max(0, toMoneyNumber(payment?.discountAmount) || computedDiscountAmount);

        const stateCustomer = ticketFromState?.customer || {};
        const stateVehicle = ticketFromState?.vehicle || {};

        const printTicket = {
            ...(ticketFromState ?? undefined),
            ticketCode,
            serviceTicketId,
            customer: {
                ...stateCustomer,
                name: stateCustomer?.name || stateCustomer?.fullName || ticketFromState?.customerName || '',
                phone: stateCustomer?.phone || ticketFromState?.customerPhone || '',
                address: stateCustomer?.address || ticketFromState?.customerAddress || '',
            },
            vehicle: {
                ...stateVehicle,
                licensePlate: stateVehicle?.licensePlate || ticketFromState?.licensePlate || '',
            },
            invoice: {
                items: invoiceItems,
                subtotal: invoiceSubtotal,
                discountAmount: invoiceDiscountAmount,
                total: totalSafe,
            },
        };

        setPrintTicket(printTicket);
        setPrintRequested(true);
    };

    const handleConfirm = async () => {
        if (!token) {
            toast.error('Vui lòng đăng nhập để thanh toán.');
            return;
        }
        if (!billId) {
            toast.error('Chưa có hoá đơn (billId). Vui lòng tạo hoá đơn trước.');
            return;
        }
        if (!serviceTicketId) {
            toast.error('Không xác định được serviceTicketId.');
            return;
        }
        if (submitting || isPaid) return;

        try {
            setSubmitting(true);
            const payPayload = {
                billId,
                amount: toMoneyNumber(totalSafe),
                method: method === 'cash' ? 'CASH' : 'TRANSFER',
            };
            await payBill(payPayload, token);
            await manageServiceTicketStatus(serviceTicketId, 'PAID', token);
            toast.success('Thanh toán thành công');

            try {
                const res = await fetchPaymentByServiceTicketId(serviceTicketId, token);
                const payload = res?.data?.data ?? res?.data ?? res;
                setPayment(payload && typeof payload === 'object' ? payload : null);
            } catch {
                // ignore
            }
        } catch (err) {
            toast.error(err?.message || 'Thanh toán thất bại.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={styles.page}>
            <div ref={printContainerRef} className={styles.printOnly}>
                {printTicket ? <AccountingInvoicePrint ticket={printTicket} autoPrint={false} /> : null}
            </div>

            <div className={styles.screenOnly}>
                <header className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Thanh toán</h1>
                        <div className={styles.subTitle}>Phiếu dịch vụ #{ticketCodeParam || ticketFromState?.ticketCode || '-'}</div>
                    </div>
                </header>

                <section className={`ui-card ${styles.modal}`}>
                    {loading ? <div className={styles.error}>Đang tải thông tin thanh toán...</div> : null}

                    {!loading && error ? <div className={styles.error}>{error}</div> : null}

                    {!loading && !error && payment ? (
                        <>
                            <div className={styles.section}>
                                <div className={styles.sectionTitle}>Báo giá được thanh toán</div>
                                {estimateLoading ? <div className={styles.muted}>Đang tải báo giá...</div> : null}
                                {!estimateLoading && estimateError ? <div className={styles.error}>{estimateError}</div> : null}
                                {payItems.length ? (
                                    <div className={styles.tableWrap}>
                                        <table className={styles.table}>
                                            <colgroup>
                                                <col style={{ width: 64 }} />
                                                <col style={{ width: 160 }} />
                                                <col />
                                                <col style={{ width: 70 }} />
                                                <col style={{ width: 140 }} />
                                                <col style={{ width: 140 }} />
                                                <col style={{ width: 140 }} />
                                                <col style={{ width: 130 }} />
                                            </colgroup>
                                            <thead>
                                                <tr>
                                                    <th>STT</th>
                                                    <th>Hạng mục</th>
                                                    <th>Diễn giải</th>
                                                    <th className={styles.thQty}>SL</th>
                                                    <th className={styles.thNumber}>Đơn giá</th>
                                                    <th className={styles.thNumber}>Giảm giá</th>
                                                    <th className={styles.thNumber}>Thành tiền</th>
                                                    <th>Kho</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {payItems.map((it, index) => (
                                                    <tr key={it.key} className={it.isGift ? styles.giftRow : undefined}>
                                                        <td className={styles.tdQty}>{String(index + 1).padStart(2, '0')}</td>
                                                        <td className={styles.tdText}>{it.categoryName}</td>
                                                        <td className={styles.tdText}>
                                                            {it.itemName}
                                                            {it.isGift ? <span className={styles.giftBadge}>Quà tặng</span> : null}
                                                        </td>
                                                        <td className={styles.tdQty}>{it.quantity ? String(it.quantity) : ''}</td>
                                                        <td className={styles.tdNumber}>{formatCurrencyVnd(it.unitPriceDisplay)}</td>
                                                        <td className={styles.tdNumber}>{it.discountAmount > 0 ? formatCurrencyVnd(it.discountAmount) : '-'}</td>
                                                        <td className={styles.tdNumber}>{formatCurrencyVnd(it.finalPriceDisplay)}</td>
                                                        <td className={styles.tdText}>{it.warehouseName || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : !estimateLoading && !estimateError ? (
                                    <div className={styles.muted}>Chưa có hạng mục nào được xác nhận.</div>
                                ) : null}
                            </div>

                            <div className={styles.qrMeta}>
                                <div className={styles.qrMetaRow}>
                                    <span>Trạng thái:</span>
                                    <strong>{paymentStatusLabel}</strong>
                                </div>
                                {/* <div className={styles.qrMetaRow}>
                                    <span>Giá gốc:</span>
                                    <strong>{formatCurrencyVnd(payment?.subTotal)}</strong>
                                </div>
                                <div className={styles.qrMetaRow}>
                                    <span>Giảm giá:</span>
                                    <strong>{formatCurrencyVnd(payment?.discountAmount)}</strong>
                                </div> */}
                                <div className={styles.qrMetaRow}>
                                    <span>Tổng tiền cần thanh toán:</span>
                                    <strong>{formatCurrencyVnd(totalSafe)}</strong>
                                </div>
                            </div>

                            <div className={styles.methods}>
                                <button
                                    type="button"
                                    className={`ui-btn ${method === 'cash' ? 'ui-btn--primary' : 'ui-btn--ghost'} ${styles.methodBtn}`}
                                    onClick={() => setMethod('cash')}
                                    disabled={isPaid || submitting}
                                >
                                    Tiền mặt
                                </button>
                                <button
                                    type="button"
                                    className={`ui-btn ${method === 'transfer' ? 'ui-btn--primary' : 'ui-btn--ghost'} ${styles.methodBtn}`}
                                    onClick={() => setMethod('transfer')}
                                    disabled={isPaid || submitting}
                                >
                                    Chuyển khoản
                                </button>
                            </div>

                            {method === 'transfer' ? (
                                <div className={styles.qrSection}>
                                    <div className={styles.qrTitle}>Quét mã VietQR để thanh toán</div>
                                    <div className={styles.qrMeta}>
                                        <div className={styles.qrMetaRow}>
                                            <span>Số tiền:</span>
                                            <strong>{formatCurrencyVnd(totalSafe)}</strong>
                                        </div>
                                        <div className={styles.qrMetaRow}>
                                            <span>Nội dung:</span>
                                            <strong className={styles.qrMetaText}>{transferContent}</strong>
                                        </div>
                                    </div>
                                    {qrImgSrc ? (
                                        <div className={styles.qrImgWrap}>
                                            <img className={styles.qrImg} src={qrImgSrc} alt="VietQR" loading="lazy" />
                                        </div>
                                    ) : null}
                                </div>
                            ) : (
                                <div className={styles.cashSection}>
                                    <div className={styles.cashTitle}>Thanh toán tiền mặt</div>
                                    <div className={styles.cashHint}>Nhận tiền mặt và xác nhận để hoàn tất thanh toán.</div>
                                </div>
                            )}

                            <div className="ui-actions ui-actions--end">
                                <button type="button" className="ui-btn ui-btn--ghost" onClick={() => navigate(-1)}>
                                    Quay lại
                                </button>

                                <button type="button" className="ui-btn ui-btn--ghost" onClick={handlePrintInvoice} disabled={submitting}>
                                    In hoá đơn
                                </button>
                                <button
                                    type="button"
                                    className="ui-btn ui-btn--primary"
                                    onClick={handleConfirm}
                                    disabled={submitting || isPaid}
                                >
                                    {isPaid ? 'Đã thanh toán' : submitting ? 'Đang xử lý...' : 'Xác nhận đã thanh toán'}
                                </button>
                            </div>
                        </>
                    ) : null}
                </section>
            </div>
        </div>
    );
}
