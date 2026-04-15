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

    const archivedEstimates = arr.filter((e) => {
        const status = normalizeEstimateStatus(e?.estimateStatus ?? e?.status ?? e?.estimate_status);
        return status === 'ARCHIVED';
    });

    const approvedEstimates = arr.filter((e) => {
        const status = normalizeEstimateStatus(e?.estimateStatus ?? e?.status ?? e?.estimate_status);
        return status === 'APPROVED';
    });

    const listToSearch = archivedEstimates.length > 0 ? archivedEstimates : approvedEstimates.length > 0 ? approvedEstimates : arr;
    return listToSearch.reduce((prev, current) => {
        const prevId = Number(prev?.estimateId ?? prev?.id ?? prev?.serviceTicketEstimateId ?? 0);
        const currentId = Number(current?.estimateId ?? current?.id ?? current?.serviceTicketEstimateId ?? 0);
        return currentId > prevId ? current : prev;
    }, listToSearch[0]);
}

function getItemConfirmedFlag(it) {
    return Boolean(
        it?.isChecked ??
            it?.confirmed ??
            it?.isConfirmed ??
            it?.approved ??
            it?.isApproved ??
            it?.customerConfirmed ??
            it?.isCustomerConfirmed,
    );
}

function normalizeEstimateStatus(raw) {
    const extracted =
        raw && typeof raw === 'object'
            ? raw?.code ?? raw?.name ?? raw?.status ?? raw?.estimateStatus ?? raw?.estimate_status ?? ''
            : raw;

    const value = String(extracted || '')
        .trim()
        .toUpperCase()
        .replaceAll(/\s+/g, '_');
    if (value === 'CONFIRMED') return 'APPROVED';
    return value;
}

function pickMoneyDisplayValue(withVatValue, baseValue) {
    const withVatNum = toMoneyNumber(withVatValue);
    if (withVatNum > 0) return withVatNum;
    const baseNum = toMoneyNumber(baseValue);
    return Math.max(0, baseNum);
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
                setPayment(payload && typeof payload === 'object' ? payload : null);
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
    }, [serviceTicketId, token]);

    const billId = useMemo(() => {
        const raw = payment?.billId ?? payment?.billID ?? payment?.data?.billId ?? null;
        const n = typeof raw === 'number' ? raw : Number(String(raw ?? '').trim());
        return Number.isFinite(n) && n > 0 ? n : null;
    }, [payment]);

    const totalSafe = useMemo(() => toMoneyNumber(payment?.finalAmount), [payment]);
    const paymentStatusCode = normalizeStatusCode(payment?.paymentStatus);
    const paymentStatusLabel = getStatusTextVi(paymentStatusCode, paymentStatusCode || '-');
    const isPaid = paymentStatusCode === 'PAID';

    const estimateItems = useMemo(() => {
        const items = Array.isArray(estimate?.items) ? estimate.items : [];
        return items
            .filter((it) => !it?.isRemoved)
            .map((it, idx) => {
                const quantity = toMoneyNumber(it?.quantity);
                const unitPrice = toMoneyNumber(it?.unitPrice);
                const subTotal = toMoneyNumber(it?.subTotal);
                const unitPriceWithVat = it?.unitPriceWithVat ?? it?.unitPriceWithVAT ?? 0;
                const subTotalWithVat = it?.subTotalWithVat ?? it?.subTotalWithVAT ?? 0;
                const unitPriceDisplay = pickMoneyDisplayValue(unitPriceWithVat, unitPrice);
                const subTotalDisplay = pickMoneyDisplayValue(subTotalWithVat, subTotal);
                const categoryName = it?.workCategory?.categoryName || it?.workCategory?.categoryCode || it?.newCategoryName || '';
                return {
                    key: String(it?.estimateItemId ?? it?.itemId ?? `${idx}`),
                    categoryName,
                    itemName: String(it?.itemName || '').trim(),
                    quantity,
                    unitPriceDisplay,
                    subTotalDisplay,
                    confirmed: getItemConfirmedFlag(it),
                };
            })
            .filter((r) => r.itemName || r.categoryName || r.quantity > 0 || r.unitPriceDisplay > 0 || r.subTotalDisplay > 0);
    }, [estimate]);

    const payItems = useMemo(() => estimateItems.filter((it) => it.confirmed), [estimateItems]);

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

            const barcodeImg = root.querySelector('[data-role="barcode"]');
            if (barcodeImg && barcodeImg instanceof HTMLImageElement) {
                if (!barcodeImg.complete) return false;
                if (!barcodeImg.naturalWidth) return false;
            }

            return hasTable && textLen > 20;
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
            if (isInvoiceDomReady() || attempts >= 30) {
                await doPrint();
                return;
            }
            rafId = globalThis.requestAnimationFrame?.(tryPrint);
        };

        rafId = globalThis.requestAnimationFrame?.(tryPrint);
        timeoutId = globalThis.setTimeout?.(() => {
            void doPrint();
        }, 1200);

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
            const subTotal = toMoneyNumber(item?.subTotal ?? item?.subTotalDisplay ?? 0) || unitPrice * quantity;

            return {
                key: item?.key ?? String(idx + 1),
                categoryName: item?.categoryName ?? '',
                itemName: item?.itemName ?? '',
                quantity,
                unitPrice,
                subTotal,
            };
        });

        const computedSubtotal = invoiceItems.reduce((sum, item) => sum + toMoneyNumber(item?.subTotal), 0);
        const invoiceSubtotal = Math.max(0, toMoneyNumber(payment?.subTotal) || computedSubtotal);
        const invoiceDiscountAmount = Math.max(0, toMoneyNumber(payment?.discountAmount));

        const stateCustomer = ticketFromState?.customer || {};
        const stateVehicle = ticketFromState?.vehicle || {};

        const printTicket = {
            ...(ticketFromState ?? undefined),
            ticketCode,
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
                                                <col style={{ width: 160 }} />
                                                <col />
                                                <col style={{ width: 70 }} />
                                                <col style={{ width: 140 }} />
                                                <col style={{ width: 140 }} />
                                            </colgroup>
                                            <thead>
                                                <tr>
                                                    <th>Hạng mục</th>
                                                    <th>Diễn giải</th>
                                                    <th className={styles.thQty}>SL</th>
                                                    <th className={styles.thNumber}>Đơn giá</th>
                                                    <th className={styles.thNumber}>Thành tiền</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {payItems.map((it) => (
                                                    <tr key={it.key}>
                                                        <td className={styles.tdText}>{it.categoryName}</td>
                                                        <td className={styles.tdText}>{it.itemName}</td>
                                                        <td className={styles.tdQty}>{it.quantity ? String(it.quantity) : ''}</td>
                                                        <td className={styles.tdNumber}>{formatCurrencyVnd(it.unitPriceDisplay)}</td>
                                                        <td className={styles.tdNumber}>{formatCurrencyVnd(it.subTotalDisplay)}</td>
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
                                <div className={styles.qrMetaRow}>
                                    <span>Giá gốc:</span>
                                    <strong>{formatCurrencyVnd(payment?.subTotal)}</strong>
                                </div>
                                <div className={styles.qrMetaRow}>
                                    <span>Giảm giá:</span>
                                    <strong>{formatCurrencyVnd(payment?.discountAmount)}</strong>
                                </div>
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