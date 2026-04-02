import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { fetchServiceTicketDetail, fetchServiceTicketEstimate, manageServiceTicketEstimateStatus, manageServiceTicketStatus } from '../../../services/serviceTicketService.js';
import { createPayment, payBill } from '../../../services/paymentService.js';
import { getSafetyInspectionByTicketCode, getDefaultSafetyInspectionCategories } from '../../../services/safetyInspectionService.js';

// (merged into above import)
import { fetchAvailablePromotions, fetchPromotionByCode } from '../../../services/promotionService.js';
import { formatDateTimeViNoSeconds } from '../../../components/timeUtils.js';
import Receipt from './Receipt.jsx';
import { ReceiptPaymentMethodModal } from './ReceiptPaymentMethod.jsx';
import styles from './ReceiptConfirm.module.css';

function toMoneyNumber(value) {
    const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
    return Number.isFinite(n) ? n : 0;
}

function formatCurrencyVnd(value) {
    const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
    if (!Number.isFinite(n) || n === 0) return '';
    return `${new Intl.NumberFormat('vi-VN').format(n)}đ`;
}

function pickMoneyDisplayValue(withVatValue, baseValue) {
    const withVatNum = toMoneyNumber(withVatValue);
    if (withVatNum > 0) return withVatNum;
    const baseNum = toMoneyNumber(baseValue);
    return Math.max(0, baseNum);
}

function pickLatestEstimate(list) {
    const arr = Array.isArray(list) ? list : [];
    if (arr.length === 0) return null;

    // 1. Lọc ra danh sách CHỈ chứa các báo giá đã APPROVED
    const approvedEstimates = arr.filter(e => {
        const status = String(e?.estimateStatus || e?.status || '').toUpperCase();
        return status === 'APPROVED' || status === 'CONFIRMED';
    });

    // Nếu tìm thấy các báo giá APPROVED, ta chỉ làm việc trên danh sách này
    const listToSearch = approvedEstimates.length > 0 ? approvedEstimates : arr;

    // 2. Tìm ID lớn nhất (mới nhất) trong danh sách đó
    const latest = listToSearch.reduce((prev, current) => {
        const prevId = Number(prev?.estimateId ?? prev?.id ?? prev?.serviceTicketEstimateId ?? 0);
        const currentId = Number(current?.estimateId ?? current?.id ?? current?.serviceTicketEstimateId ?? 0);
        return currentId > prevId ? current : prev;
    }, listToSearch[0]);

    console.log("=> BÁO GIÁ ĐƯỢC CHỌN ĐỂ IN:", latest);
    return latest;
}

function pickNewestEstimateById(list) {
    const arr = Array.isArray(list) ? list : [];
    if (arr.length === 0) return null;

    return arr.reduce((prev, current) => {
        const prevId = Number(prev?.estimateId ?? prev?.id ?? prev?.serviceTicketEstimateId ?? 0);
        const currentId = Number(current?.estimateId ?? current?.id ?? current?.serviceTicketEstimateId ?? 0);
        return currentId > prevId ? current : prev;
    }, arr[0]);
}

function normalizeBillId(input) {
    const raw =
        input?.billId ??
        input?.billID ??
        input?.data?.billId ??
        input?.data?.billID ??
        input?.id ??
        input?.data?.id ??
        null;

    if (raw == null) return null;
    const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
    return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizePaymentMethod(method) {
    const m = String(method || '').trim().toLowerCase();
    if (m === 'cash') return 'CASH';
    if (m === 'transfer') return 'TRANSFER';
    return method;
}

function normalizeTicketForReceipt(input, ticketCodeFallback) {
    const ticketCode = String(input?.ticketCode || ticketCodeFallback || '').trim();
    const serviceTicketId = input?.serviceTicketId ?? input?.serviceTicketID ?? input?.id ?? input?.ticketId ?? null;

    const receivedAt =
        input?.receivedAt ??
        input?.checkInAt ??
        input?.checkinAt ??
        input?.checkInDateTime ??
        input?.checkinDateTime ??
        input?.receptionDate ??
        input?.arrivedAt ??
        null;

    const handoverAt =
        input?.handoverAt ??
        input?.handOverAt ??
        input?.deliveryAt ??
        input?.deliveredAt ??
        input?.completedAt ??
        input?.finishedAt ??
        input?.closedAt ??
        null;

    const odometerKmRaw =
        input?.odometerReading ??
        input?.vehicle?.lastOdometerReading ??
        input?.vehicle?.odometerReading ??
        input?.odometerKm ??
        input?.mileage ??
        input?.vehicle?.odometerKm ??
        input?.vehicle?.mileage ??
        null;
    const odometerKm = odometerKmRaw == null ? null : Number(String(odometerKmRaw).replaceAll(/\D/g, ''));

    return {
        serviceTicketId,
        ticketCode,
        receivedAt,
        handoverAt,
        safetyInspectionEnabled: input?.safetyInspectionEnabled,
        customer: {
            name: input?.customer?.fullName || input?.customerName || input?.customer?.name || '',
            phone: input?.customer?.phone || input?.customerPhone || input?.phone || '',
            email: input?.customer?.email || input?.customerEmail || input?.email || '',
        },
        vehicle: {
            licensePlate: input?.vehicle?.licensePlate || input?.licensePlate || '',
            model: input?.vehicle?.model || input?.vehicleModel || '',
            odometerKm: Number.isFinite(odometerKm) && odometerKm > 0 ? odometerKm : null,
        },
    };
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

function parsePromotionYmdDate(value, { endOfDay } = {}) {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const [y, m, d] = raw.split('-').map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    const hh = endOfDay ? 23 : 0;
    const mm = endOfDay ? 59 : 0;
    const ss = endOfDay ? 59 : 0;
    const ms = endOfDay ? 999 : 0;
    const dt = new Date(y, m - 1, d, hh, mm, ss, ms);
    return Number.isFinite(dt.getTime()) ? dt : null;
}

function buildPromotionLabel(promo) {
    if (!promo) return '';
    const name = String(promo?.name || '').trim();
    const code = String(promo?.code || '').trim();
    const discountPercent = toMoneyNumber(promo?.discountPercent);
    const parts = [name || code].filter(Boolean);
    if (code && name) parts.push(code);
    if (discountPercent > 0) parts.push(`-${discountPercent}%`);
    return parts.join(' • ');
}

function validatePromotion(promo, subtotal) {
    if (!promo) return 'Mã không hợp lệ';
    if (promo?.isActive === false) return 'Khuyến mãi không còn hiệu lực';

    const now = new Date();
    const start = parsePromotionYmdDate(promo?.startDate, { endOfDay: false });
    const end = parsePromotionYmdDate(promo?.endDate, { endOfDay: true });
    if (start && now < start) return 'Khuyến mãi chưa bắt đầu';
    if (end && now > end) return 'Khuyến mãi đã hết hạn';

    const minOrderValue = toMoneyNumber(promo?.minOrderValue);
    if (minOrderValue > 0 && subtotal < minOrderValue) {
        return `Đơn tối thiểu ${new Intl.NumberFormat('vi-VN').format(minOrderValue)}đ để áp dụng`;
    }

    const discountPercent = toMoneyNumber(promo?.discountPercent);
    if (discountPercent <= 0) return 'Khuyến mãi này chưa hỗ trợ trên hoá đơn';
    return '';
}

function getPromotionId(promo) {
    if (!promo) return null;
    const raw =
        promo?.promotionId ??
        promo?.promotionID ??
        promo?.PromotionId ??
        promo?.id ??
        promo?.ID ??
        null;
    if (raw == null) return null;
    const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
    return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizePromotion(promo) {
    if (!promo) return null;
    if (Array.isArray(promo)) return normalizePromotion(promo[0] ?? null);
    if (Array.isArray(promo?.data)) return normalizePromotion(promo.data[0] ?? null);

    const promotionId = getPromotionId(promo);
    return promotionId ? { ...promo, promotionId } : promo;
}

export default function ReceiptConfirm() {
    useScrollToTop();
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();

    const ticketCodeParam = String(params?.ticketCode || '').trim();
    const ticketFromState = location?.state?.ticket ?? location?.state?.serviceTicket ?? null;

    const [ticketRaw, setTicketRaw] = useState(ticketFromState);
    const [ticketError, setTicketError] = useState('');
    const [ticketLoading, setTicketLoading] = useState(false);

    const [estimate, setEstimate] = useState(null);
    const [estimateLoading, setEstimateLoading] = useState(false);
    const [estimateError, setEstimateError] = useState('');

    const [safetyInspection, setSafetyInspection] = useState(null);

    const [defaultCategories, setDefaultCategories] = useState([]);

    const [availablePromotions, setAvailablePromotions] = useState([]);
    const [promotionsLoading, setPromotionsLoading] = useState(false);
    const [promotionsError, setPromotionsError] = useState('');

    const [promoCode, setPromoCode] = useState('');
    const [selectedPromotionId, setSelectedPromotionId] = useState('');
    const [appliedPromotion, setAppliedPromotion] = useState(null);
    const [promoApplying, setPromoApplying] = useState(false);
    const [promoError, setPromoError] = useState('');
    
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [paymentSubmitting, setPaymentSubmitting] = useState(false);
    const [billCreating, setBillCreating] = useState(false);
    const [billId, setBillId] = useState(null);

    const notify = (message) => toast(message, { containerId: 'app-toast' });

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            setTicketError('Vui lòng đăng nhập để tạo hoá đơn.');
            return;
        }
        if (ticketRaw) return;
        if (!ticketCodeParam) {
            setTicketError('Thiếu ticketCode để tạo hoá đơn.');
            return;
        }

        let ignore = false;
        const run = async () => {
            try {
                setTicketLoading(true);
                setTicketError('');
                const res = await fetchServiceTicketDetail(ticketCodeParam, token);
                if (ignore) return;
                setTicketRaw(res?.data ?? null);
            } catch (err) {
                if (ignore) return;
                setTicketError(err?.message || 'Không thể tải chi tiết phiếu dịch vụ.');
            } finally {
                if (!ignore) setTicketLoading(false);
            }
        };
        run();
        return () => {
            ignore = true;
        };
    }, [ticketRaw, ticketCodeParam]);

    const ticket = useMemo(() => normalizeTicketForReceipt(ticketRaw ?? {}, ticketCodeParam), [ticketRaw, ticketCodeParam]);

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        const serviceTicketId = ticket?.serviceTicketId;
        if (!token || serviceTicketId == null || String(serviceTicketId).trim() === '') return;

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
    }, [ticket?.serviceTicketId]);

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        let ignore = false;
        const run = async () => {
            try {
                setPromotionsLoading(true);
                setPromotionsError('');
                const res = await fetchAvailablePromotions(token);
                if (ignore) return;
                setAvailablePromotions(Array.isArray(res?.data) ? res.data : []);
            } catch (err) {
                if (ignore) return;
                setAvailablePromotions([]);
                setPromotionsError(err?.message || 'Không thể tải danh sách khuyến mãi.');
            } finally {
                if (!ignore) setPromotionsLoading(false);
            }
        };
        run();
        return () => {
            ignore = true;
        };
    }, []);

    // Fetch safety inspection data
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        if (!ticketCodeParam) return;

        let ignore = false;
        const run = async () => {
            try {
                const res = await getSafetyInspectionByTicketCode(ticketCodeParam, token);
                if (ignore) return;
                console.log('>>> SAFETY INSPECTION DATA:', JSON.stringify(res?.data, null, 2));
                setSafetyInspection(res?.data ?? null);
            } catch {
                if (ignore) return;
                setSafetyInspection(null);
            }
        };
        run();
        return () => { ignore = true; };
    }, [ticketCodeParam]);

    // Fetch danh mục kiểm tra an toàn mặc định
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        let ignore = false;
        const run = async () => {
            try {
                const res = await getDefaultSafetyInspectionCategories(token);
                if (ignore) return;
                const cats = Array.isArray(res?.data) ? res.data : [];
                setDefaultCategories(cats);
            } catch {
                if (ignore) return;
                setDefaultCategories([]);
            }
        };
        run();
        return () => { ignore = true; };
    }, []);

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
                    unitPrice,
                    subTotal,
                    unitPriceDisplay,
                    subTotalDisplay,
                    confirmed: getItemConfirmedFlag(it),
                };
            })
            .filter((r) => r.itemName || r.categoryName || r.quantity > 0 || r.unitPrice > 0 || r.subTotal > 0 || r.subTotalDisplay > 0);
    }, [estimate]);

    const payItems = useMemo(() => {
        if (!estimateItems.length) return [];
        return estimateItems.filter((it) => it.confirmed);
    }, [estimateItems]);

    const subtotal = useMemo(() => payItems.reduce((acc, it) => acc + toMoneyNumber(it.subTotalDisplay ?? it.subTotal), 0), [payItems]);

    const discountAmount = useMemo(() => {
        if (!appliedPromotion) return 0;
        const validationMessage = validatePromotion(appliedPromotion, subtotal);
        if (validationMessage) return 0;
        const percent = toMoneyNumber(appliedPromotion?.discountPercent);
        const raw = subtotal * (percent / 100);
        return Math.min(subtotal, Math.max(0, raw));
    }, [appliedPromotion, subtotal]);

    const total = useMemo(() => Math.max(0, subtotal - discountAmount), [subtotal, discountAmount]);

    const receivedAtDisplay = ticket?.receivedAt ? formatDateTimeViNoSeconds(ticket.receivedAt, '-') : '-';
    const handoverAtDisplay = ticket?.handoverAt ? formatDateTimeViNoSeconds(ticket.handoverAt, '-') : '-';

    const applyPromotion = async () => {
        if (promoApplying) return;
        setPromoError('');

        const token = localStorage.getItem('authToken');
        const code = String(promoCode || '').trim();
        const selectedId = String(selectedPromotionId || '').trim();

        if (!code && !selectedId) {
            setAppliedPromotion(null);
            return;
        }

        if (code) {
            try {
                setPromoApplying(true);
                const res = await fetchPromotionByCode(code, token);
                const promo = normalizePromotion(res?.data ?? null);
                const validationMessage = validatePromotion(promo, subtotal);
                if (validationMessage) {
                    setAppliedPromotion(null);
                    setPromoError(validationMessage);
                    return;
                }
                setAppliedPromotion(promo);
                setSelectedPromotionId('');
            } catch (err) {
                setAppliedPromotion(null);
                setPromoError(err?.message || 'Mã không hợp lệ');
            } finally {
                setPromoApplying(false);
            }
            return;
        }

        const picked =
            availablePromotions.find((p) => {
                const id = getPromotionId(p);
                return id != null && String(id) === selectedId;
            }) ?? null;
        const validationMessage = validatePromotion(picked, subtotal);
        if (validationMessage) {
            setAppliedPromotion(null);
            setPromoError(validationMessage);
            return;
        }
        setAppliedPromotion(normalizePromotion(picked));
    };

    const handleBack = () => {
        navigate(-1);
    };

    const printTicket = useMemo(() => {
        const invoiceItems = payItems.map((it) => ({
            ...it,
            unitPrice: toMoneyNumber(it.unitPriceDisplay ?? it.unitPrice),
            subTotal: toMoneyNumber(it.subTotalDisplay ?? it.subTotal),
        }));
        return {
            ...ticket,
            receivedAtDisplay,
            handoverAtDisplay,
            safetyInspectionEnabled: ticketRaw?.safetyInspectionEnabled,
            invoice: {
                items: invoiceItems,
                subtotal,
                discountAmount,
                vatRate: '',
                vatAmount: 0,
                total,
                promotionLabel: buildPromotionLabel(appliedPromotion),
            },
            safetyInspection,
            defaultCategories,
        };
    }, [ticket, ticketRaw, receivedAtDisplay, handoverAtDisplay, payItems, subtotal, discountAmount, total, appliedPromotion, safetyInspection, defaultCategories]);

    // Remove bill creation from print, only change ticket status to ARCHIVE
    const [archiving, setArchiving] = useState(false);
    const [archived, setArchived] = useState(false);

    const handleArchiveAndPrint = async () => {
        if (archiving || ticketLoading || estimateLoading) return;
        const token = localStorage.getItem('authToken');
        if (!token) {
            notify('Vui lòng đăng nhập để đổi trạng thái báo giá.');
            return;
        }
        const estimateId = estimate?.estimateId ?? estimate?.id;
        if (!estimateId) {
            notify('Không tìm thấy báo giá.');
            return;
        }
        try {
            setArchiving(true);
            await manageServiceTicketEstimateStatus(estimateId, 'ARCHIVED', token);
            setArchived(true);
            notify('Đã chuyển báo giá sang trạng thái ARCHIVED.');
            globalThis.window?.print?.();
        } catch (err) {
            notify(err?.message || 'Chuyển trạng thái thất bại.');
        } finally {
            setArchiving(false);
        }
    };

    // Print only, no bill creation
    // (handlePrint removed as it's not used)

    // Only allow payment after archive
    const handleConfirm = async () => {
        if (!archived) return;

        const token = localStorage.getItem('authToken');
        if (!token) {
            notify('Vui lòng đăng nhập để thanh toán.');
            return;
        }

        if (billCreating) return;
        if (billId) {
            setPaymentOpen(true);
            return;
        }

        const serviceTicketIdRaw = ticket?.serviceTicketId ?? null;
        const serviceTicketId = typeof serviceTicketIdRaw === 'number' ? serviceTicketIdRaw : Number(String(serviceTicketIdRaw ?? '').trim());
        if (!Number.isFinite(serviceTicketId) || serviceTicketId <= 0) {
            notify('Không tìm thấy serviceTicketId hợp lệ để tạo hoá đơn.');
            return;
        }

        try {
            setBillCreating(true);

            // Always re-fetch to ensure bill is created for newest estimate version
            const estimateRes = await fetchServiceTicketEstimate(serviceTicketId, token);
            const newestEstimate = pickNewestEstimateById(estimateRes?.data);
            const estimateIdRaw = newestEstimate?.estimateId ?? newestEstimate?.id ?? newestEstimate?.serviceTicketEstimateId ?? null;
            const estimateId = typeof estimateIdRaw === 'number' ? estimateIdRaw : Number(String(estimateIdRaw ?? '').trim());
            if (!Number.isFinite(estimateId) || estimateId <= 0) {
                throw new Error('Không tìm thấy báo giá mới nhất để tạo bill.');
            }

            const versionRaw =
                newestEstimate?.version ??
                newestEstimate?.estimateVersion ??
                newestEstimate?.estimateNo ??
                newestEstimate?.versionNo ??
                null;
            const versionParsed = typeof versionRaw === 'number' ? versionRaw : Number(String(versionRaw ?? '').trim());
            const billVersion = Number.isFinite(versionParsed) && versionParsed > 0 ? versionParsed : 1;

            const promotionId = getPromotionId(appliedPromotion);
            const createPayload = {
                serviceTicketId,
                estimateId,
                version: billVersion,
                paymentStatus: 'UNPAID',
                subTotal: toMoneyNumber(subtotal),
                discount_amount: toMoneyNumber(discountAmount),
                final_amount: toMoneyNumber(total),
                promotionId: promotionId ?? null,
                discountAmount: toMoneyNumber(discountAmount),
                totalAmount: toMoneyNumber(total),
            };

            const billRes = await createPayment(createPayload, token);
            const createdBillId = normalizeBillId(billRes);
            if (!createdBillId) {
                throw new Error('Tạo bill thất bại (không nhận được billId).');
            }

            setBillId(createdBillId);
            notify('Đã tạo hoá đơn. Vui lòng xác nhận đã thanh toán.');
            setPaymentOpen(true);
        } catch (err) {
            notify(err?.message || 'Tạo hoá đơn thất bại.');
        } finally {
            setBillCreating(false);
        }
    };

    const handleConfirmPayment = async ({ method } = {}) => {
        if (paymentSubmitting) return;

        const token = localStorage.getItem('authToken');
        if (!token) {
            notify('Vui lòng đăng nhập để thanh toán.');
            throw new Error('Vui lòng đăng nhập để thanh toán.');
        }

        const serviceTicketIdRaw = ticket?.serviceTicketId ?? null;
        const serviceTicketId = typeof serviceTicketIdRaw === 'number' ? serviceTicketIdRaw : Number(String(serviceTicketIdRaw ?? '').trim());
        if (!Number.isFinite(serviceTicketId) || serviceTicketId <= 0) {
            notify('Không tìm thấy serviceTicketId hợp lệ để thanh toán.');
            throw new Error('Không tìm thấy serviceTicketId hợp lệ để thanh toán.');
        }

        if (!billId) {
            notify('Chưa tạo hoá đơn. Vui lòng bấm "Thanh toán" để tạo hoá đơn trước.');
            throw new Error('Chưa tạo hoá đơn.');
        }

        try {
            setPaymentSubmitting(true);

            const payPayload = {
                billId,
                amount: toMoneyNumber(total),
                method: normalizePaymentMethod(method),
            };
            await payBill(payPayload, token);

            await manageServiceTicketStatus(serviceTicketId, 'PAID', token);
            notify('Thanh toán thành công');
            notify('Đã cập nhật trạng thái phiếu dịch vụ sang PAID.');
            setPaymentOpen(false);
        } catch (err) {
            notify(err?.message || 'Thanh toán thất bại.');
            throw err;
        } finally {
            setPaymentSubmitting(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.screenOnly}>
                <header className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Xác nhận tạo hoá đơn</h1>
                        <div className={styles.subTitle}>Phiếu dịch vụ #{ticket.ticketCode || ticketCodeParam || '-'}</div>
                    </div>
                </header>

                {ticketError ? <div className={styles.errorBanner}>{ticketError}</div> : null}
                {estimateError ? <div className={styles.errorBanner}>{estimateError}</div> : null}

                <div className={`ui-card ${styles.card}`}>
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Hạng mục thanh toán</h2>
                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <colgroup>
                                    <col style={{ width: 180 }} />
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
                                            <td className={styles.tdNumber}>{formatCurrencyVnd(it.unitPriceDisplay ?? it.unitPrice)}</td>
                                            <td className={styles.tdNumber}>{formatCurrencyVnd(it.subTotalDisplay ?? it.subTotal)}</td>
                                        </tr>
                                    ))}
                                    {payItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className={styles.tdEmpty}>
                                                {estimateLoading ? 'Đang tải...' : 'Chưa có hạng mục nào được xác nhận.'}
                                            </td>
                                        </tr>
                                    ) : null}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Áp dụng khuyến mãi</h2>
                        <div className={styles.promoTotalBar}></div>

                        <div className={styles.promoRow}>
                            <div className={styles.promoField}>
                                <label htmlFor="promo-code">Nhập mã:</label>
                                <div className={styles.promoInputRow}>
                                    <input
                                        id="promo-code"
                                        className={styles.promoInput}
                                        value={promoCode}
                                        onChange={(e) => {
                                            setPromoCode(e.target.value);
                                            if (selectedPromotionId) setSelectedPromotionId('');
                                        }}
                                        placeholder="Mã khuyến mãi"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className={styles.promoRow}>
                            <label htmlFor="promo-list">Hoặc chọn khuyến mãi:</label>
                            <select
                                id="promo-list"
                                className={styles.promoSelect}
                                value={selectedPromotionId}
                                onChange={(e) => {
                                    setSelectedPromotionId(e.target.value);
                                    if (promoCode) setPromoCode('');
                                }}
                            >
                                <option value="">-</option>
                                {availablePromotions.map((p) => {
                                    const id = getPromotionId(p);
                                    const idValue = id == null ? '' : String(id);
                                    if (!idValue) return null;
                                    const label = buildPromotionLabel(p);
                                    return (
                                        <option key={idValue} value={idValue}>
                                            {label || idValue}
                                        </option>
                                    );
                                })}
                            </select>
                            {promotionsLoading ? <div className={styles.subTitle}>Đang tải khuyến mãi...</div> : null}
                            {promotionsError ? <div className={styles.promoError}>{promotionsError}</div> : null}
                        </div>

                        <button
                            type="button"
                            className={`ui-btn ui-btn--primary ${styles.applyBtn}`}
                            onClick={applyPromotion}
                            disabled={promoApplying}
                        >
                            Áp dụng
                        </button>

                        {buildPromotionLabel(appliedPromotion) ? (
                            <div className={styles.promoChip}>{buildPromotionLabel(appliedPromotion)}</div>
                        ) : null}

                        <div className={styles.summaryList}>
                            <div className={styles.summaryRow}>
                                <span>Giá gốc:</span>
                                <span>{formatCurrencyVnd(subtotal)}</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span>Giảm giá:</span>
                                <span>{discountAmount ? `- ${formatCurrencyVnd(discountAmount)}` : '-'}</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span>Tổng (đã gồm VAT):</span>
                                <span>{formatCurrencyVnd(total)}</span>
                            </div>
                        </div>

                        {promoError ? <div className={styles.promoError}>{promoError}</div> : null}
                    </section>

                    <div className="ui-actions ui-actions--end">
                        <button type="button" className="ui-btn ui-btn--ghost" onClick={handleBack} >
                            Hủy
                        </button>
                        <button
                            type="button"
                            className="ui-btn ui-btn--ghost"
                            onClick={handleArchiveAndPrint}
                            disabled={ticketLoading || estimateLoading || !!ticketError || archiving}
                        >
                            {archiving ? 'Đang lưu...' : 'In hóa đơn'}
                        </button>
                        <button
                            type="button"
                            className="ui-btn ui-btn--primary"
                            onClick={handleConfirm}
                            disabled={!archived || billCreating}
                        >
                            {billCreating ? 'Đang tạo hoá đơn...' : 'Thanh toán'}
                        </button>
                    </div>
                </div>

                <ReceiptPaymentMethodModal
                    open={paymentOpen}
                    onClose={() => setPaymentOpen(false)}
                    ticketCode={ticket.ticketCode || ticketCodeParam}
                    total={total}
                    printTicket={printTicket}
                    onConfirmPayment={handleConfirmPayment}
                />
            </div>

            <div className={styles.printOnly}>
                <Receipt ticket={printTicket} />
            </div>
        </div>
    );
}