import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import {
    confirmServiceTicketDelivered,
    fetchServiceTicketDetail,
    fetchServiceTicketEstimate,
    fetchSafetyInspectionCurrentRecommend,
    manageServiceTicketEstimateStatus,
} from '../../../services/serviceTicketService.js';
import { createPayment, fetchPaymentByServiceTicketId } from '../../../services/paymentService.js';
import { getSafetyInspectionByTicketCode, getDefaultSafetyInspectionCategories } from '../../../services/safetyInspectionService.js';

// (merged into above import)
import { fetchAvailablePromotions, fetchPromotionByCode } from '../../../services/promotionService.js';
import { formatDateTimeViNoSeconds } from '../../../components/timeUtils.js';
import Receipt from './Receipt.jsx';
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

    const getEstimateIdNum = (e) => {
        const raw = e?.estimateId ?? e?.id ?? e?.serviceTicketEstimateId ?? 0;
        const n = typeof raw === 'number' ? raw : Number(String(raw ?? '').trim());
        return Number.isFinite(n) ? n : 0;
    };

    const getEstimateVersionNum = (e) => {
        const raw = e?.version ?? e?.estimateVersion ?? e?.estimateNo ?? e?.versionNo ?? null;
        if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
        const digits = /\d+/.exec(String(raw ?? ''))?.[0] ?? '';
        const n = Number(digits);
        return Number.isFinite(n) ? n : 0;
    };

    const getEstimateCreatedAtMs = (e) => {
        const t = new Date(e?.createdAt || e?.approvedAt || e?.createdDate || 0).getTime();
        return Number.isFinite(t) ? t : 0;
    };

    return [...arr].sort((a, b) => {
        const va = getEstimateVersionNum(a);
        const vb = getEstimateVersionNum(b);
        if (va > 0 && vb > 0 && va !== vb) return vb - va;
        if (va > 0 && vb === 0) return -1;
        if (vb > 0 && va === 0) return 1;

        const idA = getEstimateIdNum(a);
        const idB = getEstimateIdNum(b);
        if (idA !== idB) return idB - idA;

        return getEstimateCreatedAtMs(b) - getEstimateCreatedAtMs(a);
    })[0];
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

const getRecommendationStorageKey = (serviceTicketId) => `serviceTicketRecommendation:${serviceTicketId}`;

function extractRecommendValue(res) {
    const normalizeRecommendationString = (value) => {
        const raw = String(value ?? '').trim();
        if (!raw) return '';
        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') return extractRecommendValue({ data: parsed });
        } catch {
            // Keep plain text as-is.
        }
        return raw;
    };

    const payload = res?.data ?? res;
    if (typeof payload === 'string') return normalizeRecommendationString(payload);
    if (payload && typeof payload === 'object') {
        if (typeof payload.recommend === 'string') return normalizeRecommendationString(payload.recommend);
        if (typeof payload.recommendation === 'string') return normalizeRecommendationString(payload.recommendation);
        if (typeof payload.recommendationText === 'string') return normalizeRecommendationString(payload.recommendationText);
        if (typeof payload.currentRecommend === 'string') return normalizeRecommendationString(payload.currentRecommend);
        if (payload.data != null) return extractRecommendValue({ data: payload.data });
    }
    return '';
}

function normalizeServiceTicketStatus(raw) {
    const value = String(raw || '')
        .trim()
        .toUpperCase()
        .replaceAll(/\s+/g, '_');
    if (!value) return '';

    if (value === 'CREATED' || value === 'DRAFT') return 'CREATED';
    if (value === 'INSPECTION' || value === 'INSPECTING' || value === 'DIAGNOSIS') return 'INSPECTING';
    if (value === 'INSPECTED' || value === 'INSPECTED_DIAGNOSTIC') return 'INSPECTED';
    if (value === 'PENDING' || value === 'WAITING') return 'PENDING';
    if (value === 'ESTIMATED' || value === 'ESTIMATE') return 'ESTIMATED';
    if (value === 'IN_PROGRESS' || value === 'INPROGRESS' || value === 'PROCESSING' || value === 'REPAIRING') return 'REPAIRING';
    if (value === 'COMPLETED' || value === 'DONE' || value === 'FINISHED') return 'COMPLETED';
    if (value === 'PAID' || value === 'PAYED') return 'PAID';
    if (value === 'CANCELLED' || value === 'CANCELED' || value === 'CANCEL') return 'CANCELLED';

    return value;
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

function normalizeTicketForReceipt(input, ticketCodeFallback) {
    const ticketCode = String(input?.ticketCode || ticketCodeFallback || '').trim();
    const serviceTicketId = input?.serviceTicketId ?? input?.serviceTicketID ?? input?.id ?? input?.ticketId ?? null;

    const statusRaw =
        input?.ticketStatus?.code ??
        input?.ticketStatus?.name ??
        input?.ticketStatus ??
        input?.status?.code ??
        input?.status?.name ??
        input?.status ??
        input?.serviceTicketStatusCode ??
        input?.serviceTicketStatus?.code ??
        input?.serviceTicketStatus?.name ??
        input?.serviceTicketStatus ??
        input?.serviceTicket?.status?.code ??
        input?.serviceTicket?.status?.name ??
        input?.serviceTicket?.status ??
        null;
    const statusCode = normalizeServiceTicketStatus(statusRaw);

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
        statusCode,
        receivedAt,
        handoverAt,
        safetyInspectionEnabled: input?.safetyInspectionEnabled,
        customer: {
            name: input?.customer?.fullName || input?.customerName || input?.customer?.name || '',
            phone: input?.customer?.phone || input?.customerPhone || input?.phone || '',
            email: input?.customer?.email || input?.customerEmail || input?.email || '',
            address:
                input?.customer?.address ||
                input?.customerAddress ||
                input?.address ||
                input?.customer?.fullAddress ||
                '',
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

const STAFF_ROLE = {
    ACCOUNTANT: 'ACCOUNTANT',
};

function readStaffRolesFromStorage() {
    try {
        const raw = localStorage.getItem('staffRoles');
        const parsed = JSON.parse(raw || '[]');
        if (!Array.isArray(parsed)) return [];
        return parsed.map((r) => String(r || '').trim().toUpperCase()).filter(Boolean);
    } catch {
        return [];
    }
}

function runFetchTicketEffect({ ticketRaw, ticketCodeParam, setTicketError, setTicketLoading, setTicketRaw }) {
    const token = localStorage.getItem('staffToken') || localStorage.getItem('authToken');
    if (!token) {
        setTicketError('Vui lòng đăng nhập để tạo hoá đơn.');
        return undefined;
    }
    if (ticketRaw) return undefined;
    if (!ticketCodeParam) {
        setTicketError('Thiếu ticketCode để tạo hoá đơn.');
        return undefined;
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
}

function runFetchEstimateEffect({ serviceTicketId, setEstimateLoading, setEstimateError, setEstimate }) {
    const token = localStorage.getItem('staffToken') || localStorage.getItem('authToken');
    if (!token || serviceTicketId == null || String(serviceTicketId).trim() === '') return undefined;

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
}

function runFetchPromotionsEffect({ setPromotionsLoading, setPromotionsError, setAvailablePromotions }) {
    const token = localStorage.getItem('authToken');
    if (!token) return undefined;

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
}

function runFetchSafetyInspectionEffect({ ticketCodeParam, setSafetyInspection }) {
    const token = localStorage.getItem('authToken');
    if (!token) return undefined;
    if (!ticketCodeParam) return undefined;

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

    return () => {
        ignore = true;
    };
}

function runFetchRecommendationEffect({ serviceTicketId, setRecommendation }) {
    const token = localStorage.getItem('authToken');
    if (!token || serviceTicketId == null || String(serviceTicketId).trim() === '') {
        setRecommendation('');
        return undefined;
    }

    let ignore = false;
    const run = async () => {
        const storageKey = getRecommendationStorageKey(serviceTicketId);
        try {
            const res = await fetchSafetyInspectionCurrentRecommend(serviceTicketId, token);
            if (ignore) return;
            const value = extractRecommendValue(res) || localStorage.getItem(storageKey) || '';
            setRecommendation(value);
            if (value) localStorage.setItem(storageKey, value);
        } catch {
            if (!ignore) setRecommendation(localStorage.getItem(storageKey) || '');
        }
    };
    run();

    return () => {
        ignore = true;
    };
}

function runFetchDefaultSafetyCategoriesEffect({ setDefaultCategories }) {
    const token = localStorage.getItem('authToken');
    if (!token) return undefined;

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

    return () => {
        ignore = true;
    };
}

function renderPrimaryAction({ canConfirmDelivered, canPay, isAccountant, delivering, onConfirmDelivered, onConfirmPay }) {
    if (canConfirmDelivered) {
        return (
            <button type="button" className="ui-btn ui-btn--primary" onClick={onConfirmDelivered} disabled={delivering}>
                {delivering ? 'Đang xác nhận...' : 'Xác nhận bàn giao xe'}
            </button>
        );
    }
    if (canPay && isAccountant) {
        return (
            <button type="button" className="ui-btn ui-btn--primary" onClick={onConfirmPay}>
                Thanh toán
            </button>
        );
    }
    return null;
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
    const [recommendation, setRecommendation] = useState('');

    const [defaultCategories, setDefaultCategories] = useState([]);

    const [availablePromotions, setAvailablePromotions] = useState([]);
    const [promotionsLoading, setPromotionsLoading] = useState(false);
    const [promotionsError, setPromotionsError] = useState('');

    const [promoCode, setPromoCode] = useState('');
    const [selectedPromotionId, setSelectedPromotionId] = useState('');
    const [appliedPromotion, setAppliedPromotion] = useState(null);
    const [promoApplying, setPromoApplying] = useState(false);
    const [promoError, setPromoError] = useState('');
    
    const [billCreating, setBillCreating] = useState(false);
    const [billId, setBillId] = useState(null);

    const [paymentLookupLoading, setPaymentLookupLoading] = useState(false);
    const [paymentLookupError, setPaymentLookupError] = useState('');
    const [paymentInfo, setPaymentInfo] = useState(null);

    const [delivering, setDelivering] = useState(false);

    const staffRoles = useMemo(() => readStaffRolesFromStorage(), []);
    const isAccountant = staffRoles.includes(STAFF_ROLE.ACCOUNTANT);

    const notify = (message) => toast(message, { containerId: 'app-toast' });

	const getToken = () => localStorage.getItem('staffToken') || localStorage.getItem('authToken');

    useEffect(() => {
        return runFetchTicketEffect({ ticketRaw, ticketCodeParam, setTicketError, setTicketLoading, setTicketRaw });
    }, [ticketRaw, ticketCodeParam]);

    const ticket = useMemo(() => normalizeTicketForReceipt(ticketRaw ?? {}, ticketCodeParam), [ticketRaw, ticketCodeParam]);

    const ticketStatus = useMemo(() => normalizeServiceTicketStatus(ticket?.statusCode), [ticket?.statusCode]);
    const estimateStatus = useMemo(
        () => normalizeEstimateStatus(estimate?.estimateStatus ?? estimate?.status ?? estimate?.estimate_status),
        [estimate?.estimateStatus, estimate?.estimate_status, estimate?.status],
    );

    const canPay = estimateStatus === 'ARCHIVED' && ticketStatus === 'COMPLETED';
    const canConfirmDelivered = ticketStatus === 'PAID';

    const hasBill = billId != null;
    const promoLocked = hasBill;



    useEffect(() => {
        return runFetchEstimateEffect({
            serviceTicketId: ticket?.serviceTicketId,
            setEstimateLoading,
            setEstimateError,
            setEstimate,
        });
    }, [ticket?.serviceTicketId]);

    useEffect(() => {
        const serviceTicketIdRaw = ticket?.serviceTicketId ?? null;
        const serviceTicketId = typeof serviceTicketIdRaw === 'number' ? serviceTicketIdRaw : Number(String(serviceTicketIdRaw ?? '').trim());
        const token = getToken();

        if (!token) return undefined;
        if (!Number.isFinite(serviceTicketId) || serviceTicketId <= 0) return undefined;

        let ignore = false;
        const run = async () => {
            try {
                setPaymentLookupLoading(true);
                setPaymentLookupError('');

                const res = await fetchPaymentByServiceTicketId(serviceTicketId, token);
                if (ignore) return;

                const payload = res?.data?.data ?? res?.data ?? res;
                const existingBillId = normalizeBillId(payload);
                setPaymentInfo(payload && typeof payload === 'object' ? payload : null);
                setBillId(existingBillId);
            } catch (err) {
                if (ignore) return;

                const message = String(err?.message || '');
                const isNoBill =
                    err?.status === 404 ||
                    /bill\s*not\s*found/i.test(message) ||
                    /bill[_\s-]*not[_\s-]*found/i.test(message) ||
                    /BILL[_\s-]*NOT[_\s-]*FOUND/i.test(message);

                // Some backends return 500 + "Bill not found" instead of 404
                if (isNoBill) {
                    setPaymentInfo(null);
                    setBillId(null);
                    setPaymentLookupError('');
                    return;
                }
                setPaymentInfo(null);
                setBillId(null);
                setPaymentLookupError(err?.message || 'Không thể kiểm tra hoá đơn hiện có.');
            } finally {
                if (!ignore) setPaymentLookupLoading(false);
            }
        };

        run();
        return () => {
            ignore = true;
        };
    }, [ticket?.serviceTicketId]);

    useEffect(() => {
        if (!hasBill) return;
        if (appliedPromotion) setAppliedPromotion(null);
        if (promoCode) setPromoCode('');
        if (selectedPromotionId) setSelectedPromotionId('');
    }, [hasBill, appliedPromotion, promoCode, selectedPromotionId]);

    useEffect(() => {
        return runFetchPromotionsEffect({ setPromotionsLoading, setPromotionsError, setAvailablePromotions });
    }, []);

    // Fetch safety inspection data
    useEffect(() => {
        return runFetchSafetyInspectionEffect({ ticketCodeParam, setSafetyInspection });
    }, [ticketCodeParam]);

    useEffect(() => {
        return runFetchRecommendationEffect({ serviceTicketId: ticket?.serviceTicketId, setRecommendation });
    }, [ticket?.serviceTicketId]);

    // Fetch danh mục kiểm tra an toàn mặc định
    useEffect(() => {
        return runFetchDefaultSafetyCategoriesEffect({ setDefaultCategories });
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

    const billSubTotal = useMemo(() => {
        if (!paymentInfo) return 0;
        return toMoneyNumber(paymentInfo?.subTotal ?? paymentInfo?.sub_total ?? paymentInfo?.data?.subTotal ?? paymentInfo?.data?.sub_total);
    }, [paymentInfo]);

    const billDiscountAmount = useMemo(() => {
        if (!paymentInfo) return 0;
        return toMoneyNumber(paymentInfo?.discountAmount ?? paymentInfo?.discount_amount ?? paymentInfo?.data?.discountAmount ?? paymentInfo?.data?.discount_amount);
    }, [paymentInfo]);

    const billFinalAmount = useMemo(() => {
        if (!paymentInfo) return 0;
        return toMoneyNumber(paymentInfo?.finalAmount ?? paymentInfo?.final_amount ?? paymentInfo?.data?.finalAmount ?? paymentInfo?.data?.final_amount);
    }, [paymentInfo]);

    const displaySubtotal = hasBill ? billSubTotal : subtotal;
    const displayDiscountAmount = hasBill ? billDiscountAmount : discountAmount;
    const displayTotal = hasBill ? billFinalAmount : total;

    const receivedAtDisplay = ticket?.receivedAt ? formatDateTimeViNoSeconds(ticket.receivedAt, '-') : '-';
    const handoverAtDisplay = ticket?.handoverAt ? formatDateTimeViNoSeconds(ticket.handoverAt, '-') : '-';

    const applyPromotion = async () => {
        if (promoLocked) {
            setPromoError('Phiếu dịch vụ đã có hoá đơn, không thể áp dụng / thay đổi khuyến mãi.');
            return;
        }
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
            recommendation,
            safetyInspectionEnabled: ticketRaw?.safetyInspectionEnabled,
            invoice: {
                items: invoiceItems,
                subtotal: displaySubtotal,
                discountAmount: displayDiscountAmount,
                vatRate: '',
                vatAmount: 0,
                total: displayTotal,
                promotionLabel: hasBill ? '' : buildPromotionLabel(appliedPromotion),
            },
            safetyInspection,
            defaultCategories,
        };
    }, [ticket, ticketRaw, receivedAtDisplay, handoverAtDisplay, recommendation, payItems, displaySubtotal, displayDiscountAmount, displayTotal, appliedPromotion, hasBill, safetyInspection, defaultCategories]);

    // Remove bill creation from print, only change ticket status to ARCHIVE
    const [archiving, setArchiving] = useState(false);

    const handleArchiveAndPrint = async () => {
        if (archiving || ticketLoading || estimateLoading) return;
        const token = getToken();
        if (!token) {
            notify('Vui lòng đăng nhập để đổi trạng thái báo giá.');
            return;
        }
        const estimateId = estimate?.estimateId ?? estimate?.id ?? estimate?.serviceTicketEstimateId;
        if (!estimateId) {
            notify('Không tìm thấy báo giá.');
            return;
        }
        try {
            setArchiving(true);
            if (estimateStatus !== 'ARCHIVED') {
                await manageServiceTicketEstimateStatus(estimateId, 'ARCHIVED', token);
                setEstimate((prev) => (prev ? { ...prev, estimateStatus: 'ARCHIVED', status: 'ARCHIVED' } : prev));
            }

            globalThis.window?.print?.();
        } catch (err) {
            notify(err?.message || 'Chuyển trạng thái thất bại.');
        } finally {
            setArchiving(false);
        }
    };

    const handleRequestPayment = async () => {
        if (billCreating) return;

        if (estimateStatus !== 'ARCHIVED') {
            notify('Vui lòng chuyển báo giá sang ARCHIVED trước khi yêu cầu thanh toán.');
            return;
        }

        if (hasBill) {
            notify('Phiếu dịch vụ đã có hoá đơn.');
            return;
        }

        const token = getToken();
        if (!token) {
            notify('Vui lòng đăng nhập để tạo hoá đơn.');
            return;
        }

        const serviceTicketIdRaw = ticket?.serviceTicketId ?? null;
        const serviceTicketId = typeof serviceTicketIdRaw === 'number' ? serviceTicketIdRaw : Number(String(serviceTicketIdRaw ?? '').trim());
        if (!Number.isFinite(serviceTicketId) || serviceTicketId <= 0) {
            notify('Không tìm thấy serviceTicketId hợp lệ để tạo hoá đơn.');
            return;
        }

        const estimateIdRaw = estimate?.estimateId ?? estimate?.id ?? estimate?.serviceTicketEstimateId ?? null;
        const newestEstimateId = typeof estimateIdRaw === 'number' ? estimateIdRaw : Number(String(estimateIdRaw ?? '').trim());
        if (!Number.isFinite(newestEstimateId) || newestEstimateId <= 0) {
            notify('Không tìm thấy báo giá hợp lệ để tạo hoá đơn.');
            return;
        }

        const versionRaw = estimate?.version ?? estimate?.estimateVersion ?? estimate?.estimateNo ?? estimate?.versionNo ?? null;
        const versionParsed =
            typeof versionRaw === 'number'
                ? versionRaw
                : Number(/\d+/.exec(String(versionRaw ?? ''))?.[0] ?? '');
        const billVersion = Number.isFinite(versionParsed) && versionParsed > 0 ? versionParsed : 1;

        try {
            setBillCreating(true);
            const promotionId = getPromotionId(appliedPromotion);
            const createPayload = {
                serviceTicketId,
                estimateId: newestEstimateId,
                version: billVersion,
                paymentStatus: 'UNPAID',
                subTotal: toMoneyNumber(subtotal),
                discountAmount: toMoneyNumber(discountAmount),
                finalAmount: toMoneyNumber(total),
                promotionId: promotionId ?? null,
                // Backward/alternate field names (some backends use snake_case)
                discount_amount: toMoneyNumber(discountAmount),
                final_amount: toMoneyNumber(total),
                totalAmount: toMoneyNumber(total),
            };

            const billRes = await createPayment(createPayload, token);
            const createdBillId = normalizeBillId(billRes);
            if (!createdBillId) {
                throw new Error('Tạo bill thất bại (không nhận được billId).');
            }

            setBillId(createdBillId);
            notify(`Đã có hoá đơn.`);

            try {
                const res = await fetchPaymentByServiceTicketId(serviceTicketId, token);
                const payload = res?.data?.data ?? res?.data ?? res;
                setPaymentInfo(payload && typeof payload === 'object' ? payload : null);
            } catch {
                // ignore
            }
        } catch (err) {
            notify(err?.message || 'Không thể tạo hoá đơn.');
        } finally {
            setBillCreating(false);
        }
    };

    // Print only, no bill creation
    // (handlePrint removed as it's not used)

    // Only allow payment after archive
    const handleConfirm = async () => {
        if (!canPay) return;

        if (!isAccountant) {
            notify('Chỉ kế toán mới được phép thanh toán.');
            return;
        }

        const token = getToken();
        if (!token) {
            notify('Vui lòng đăng nhập để thanh toán.');
            return;
        }

        if (!billId) {
            notify('Chưa có hoá đơn. Vui lòng bấm "Yêu cầu thanh toán" để tạo hoá đơn trước.');
            return;
        }

        const ticketCode = String(ticket?.ticketCode || ticketCodeParam || '').trim();
        if (!ticketCode) {
            notify('Thiếu ticketCode để mở màn hình thanh toán.');
            return;
        }
        const serviceTicketIdRaw = ticket?.serviceTicketId ?? null;
        const serviceTicketId = typeof serviceTicketIdRaw === 'number' ? serviceTicketIdRaw : Number(String(serviceTicketIdRaw ?? '').trim());
        navigate(`/service-ticket/${encodeURIComponent(ticketCode)}/receipt-payment-method`, {
            state: { ticket: ticketRaw ?? ticket, serviceTicketId },
        });
    };

    const handleConfirmDelivered = async () => {
        if (delivering) return;

        const token = getToken();
        if (!token) {
            notify('Vui lòng đăng nhập để xác nhận bàn giao xe.');
            return;
        }

        const ticketCode = String(ticket.ticketCode || ticketCodeParam || '').trim();
        if (!ticketCode) {
            notify('Thiếu ticketCode để xác nhận bàn giao xe.');
            return;
        }

        try {
            setDelivering(true);
            await confirmServiceTicketDelivered(ticketCode, token);
            const detailRes = await fetchServiceTicketDetail(ticketCode, token);
            setTicketRaw(detailRes?.data ?? null);
            notify('Đã xác nhận bàn giao xe.');
            navigate('/service-ticket-management', { replace: true });
        } catch (err) {
            notify(err?.message || 'Không thể xác nhận bàn giao xe.');
        } finally {
            setDelivering(false);
        }
    };

    const primaryAction = renderPrimaryAction({
        canConfirmDelivered,
        canPay,
        isAccountant,
        delivering,
        onConfirmDelivered: handleConfirmDelivered,
        onConfirmPay: handleConfirm,
    });

    return (
        <div className={styles.page}>
            <div className={styles.screenOnly}>
                <header className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Tạo phiếu dịch vụ</h1>
                        <div className={styles.subTitle}>Phiếu dịch vụ #{ticket.ticketCode || ticketCodeParam || '-'}</div>
                    </div>
                </header>

                {ticketError ? <div className={styles.errorBanner}>{ticketError}</div> : null}
                {estimateError ? <div className={styles.errorBanner}>{estimateError}</div> : null}
                {paymentLookupError ? <div className={styles.errorBanner}>{paymentLookupError}</div> : null}

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

                        {hasBill ? (
                            <div className={styles.promoError}>Đã có hoá đơn. Không thể áp dụng / thay đổi khuyến mãi nữa!</div>
                        ) : null}

                        <div className={styles.promoRow}>
                            <div className={styles.promoField}>
                                <label htmlFor="promo-code">Nhập mã:</label>
                                <div className={styles.promoInputRow}>
                                    <input
                                        id="promo-code"
                                        className={styles.promoInput}
                                        value={promoCode}
                                        disabled={promoLocked}
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
                                disabled={promoLocked}
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
                            disabled={promoApplying || promoLocked}
                        >
                            Áp dụng
                        </button>

                        {buildPromotionLabel(appliedPromotion) ? (
                            <div className={styles.promoChip}>{buildPromotionLabel(appliedPromotion)}</div>
                        ) : null}

                        <div className={styles.summaryList}>
                            <div className={styles.summaryRow}>
                                <span>Giá gốc:</span>
                                <span>{formatCurrencyVnd(displaySubtotal)}</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span>Giảm giá:</span>
                                <span>{displayDiscountAmount ? `- ${formatCurrencyVnd(displayDiscountAmount)}` : '-'}</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span>Tổng (đã gồm VAT):</span>
                                <span>{formatCurrencyVnd(displayTotal)}</span>
                            </div>
                        </div>

                        {promoError ? <div className={styles.promoError}>{promoError}</div> : null}
                    </section>

                    <div className="ui-actions ui-actions--end">
                        <button type="button" className="ui-btn ui-btn--ghost" onClick={handleBack} >
                            Hủy
                        </button>
						{estimateStatus === 'ARCHIVED' && !hasBill ? (
							<button
								type="button"
								className="ui-btn ui-btn--primary"
								data-gms-no-global-loading="true"
								onClick={handleRequestPayment}
								disabled={ticketLoading || estimateLoading || !!ticketError || billCreating || paymentLookupLoading || !!paymentLookupError}
							>
								{billCreating ? 'Đang tạo hoá đơn...' : 'Yêu cầu thanh toán'}
							</button>
						) : null}
                        <button
                            type="button"
                            className="ui-btn ui-btn--ghost"
                            data-gms-no-global-loading="true"
                            onClick={handleArchiveAndPrint}
                            disabled={ticketLoading || estimateLoading || !!ticketError || archiving}
                        >
							{archiving ? 'Đang lưu...' : 'In phiếu dịch vụ'}
                        </button>
                        {primaryAction}
                    </div>
                </div>


            </div>

            <div className={styles.printOnly}>
                <Receipt ticket={printTicket} />
            </div>
        </div>
    );
}
