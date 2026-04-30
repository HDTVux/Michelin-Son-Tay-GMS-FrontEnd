import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../../../services/apiClient.js';
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

function getAuthToken() {
    return localStorage.getItem('authToken')
        || localStorage.getItem('staffToken')
        || localStorage.getItem('adminToken')
        || localStorage.getItem('customerToken')
        || '';
}

function extractData(response) {
    return response?.data?.data ?? response?.data ?? response;
}

function isPlainObject(value) {
    return value != null && typeof value === 'object' && !Array.isArray(value);
}

function firstDefined(...values) {
    return values.find((value) => value != null && String(value).trim() !== '');
}

function parsePositiveNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : 0;
    const matched = /\d+/.exec(String(value ?? ''));
    const number = Number(matched?.[0] ?? '');
    return Number.isFinite(number) && number > 0 ? number : 0;
}

function formatTaxRateText(value) {
    const rate = typeof value === 'number' ? value : Number(String(value ?? '').trim());
    if (!Number.isFinite(rate) || rate <= 0) return '0%';
    const percent = rate > 1 ? rate : rate * 100;
    return `${percent.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`;
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
        serviceTicketId: payload.sid ?? null,
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

async function fetchEstimateByServiceTicketId(serviceTicketId) {
    const id = String(serviceTicketId ?? '').trim();
    if (!id) return null;
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/service-ticket/estimate/${encodeURIComponent(id)}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) {
        const message = typeof data === 'string' ? data : data?.message || data?.data?.message || 'Không thể tải dữ liệu hóa đơn.';
        throw new Error(message);
    }
    return pickLatestEstimate(data);
}

async function fetchTaxRules() {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/service-ticket/tax-rule/all`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) {
        const message = typeof data === 'string' ? data : data?.message || data?.data?.message || 'Khong the tai danh sach thue.';
        throw new Error(message);
    }
    const rules = extractData(data);
    return Array.isArray(rules) ? rules : [];
}

async function fetchTicketByTicketCode(ticketCode) {
    const code = String(ticketCode ?? '').trim();
    if (!code) return null;
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/service-ticket/manage/tickets/${encodeURIComponent(code)}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) {
        const message = typeof data === 'string' ? data : data?.message || data?.data?.message || 'KhÃ´ng thá»ƒ táº£i thÃ´ng tin phiáº¿u bÃ¡n hÃ ng.';
        throw new Error(message);
    }
    const detail = extractData(data);
    return isPlainObject(detail) ? detail : null;
}

function getEstimateItems(estimate) {
    const items =
        estimate?.items ??
        estimate?.estimateItems ??
        estimate?.estimate_items ??
        estimate?.serviceTicketEstimateItems ??
        estimate?.serviceTicketEstimateItemList ??
        estimate?.details ??
        estimate?.detailItems ??
        estimate?.data?.items;
    return Array.isArray(items) ? items : [];
}

function isEstimateRecord(value) {
    if (!isPlainObject(value)) return false;
    if (value.estimateItemId != null || value.estimate_item_id != null) return false;
    if (getEstimateItems(value).length > 0) return true;
    const estimateId = firstDefined(value.estimateId, value.estimateID, value.serviceTicketEstimateId, value.serviceTicketEstimateID);
    if (estimateId == null) return false;
    return ['serviceTicketId', 'serviceTicketID', 'estimateType', 'estimateVersion', 'versionNo', 'version', 'estimateNo', 'status', 'createdAt', 'createdDate', 'approvedAt']
        .some((key) => value?.[key] != null);
}

function collectEstimateRecords(payload, seen = new WeakSet()) {
    if (!payload || typeof payload !== 'object') return [];
    if (seen.has(payload)) return [];
    seen.add(payload);
    if (Array.isArray(payload)) return payload.flatMap((item) => collectEstimateRecords(item, seen));

    const records = isEstimateRecord(payload) ? [payload] : [];
    Object.values(payload).forEach((value) => {
        if (value && typeof value === 'object') records.push(...collectEstimateRecords(value, seen));
    });
    return records;
}

function pickLatestEstimate(payload) {
    const seen = new Set();
    const records = collectEstimateRecords(payload).filter((estimate, index) => {
        const id = firstDefined(estimate.estimateId, estimate.estimateID, estimate.serviceTicketEstimateId, estimate.serviceTicketEstimateID, estimate.id);
        const version = firstDefined(estimate.estimateVersion, estimate.versionNo, estimate.version, estimate.estimateNo);
        const key = id != null ? `id:${id}` : `idx:${version ?? ''}:${index}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    if (records.length === 0) return null;

    return [...records].sort((a, b) => {
        const versionA = parsePositiveNumber(firstDefined(a.estimateVersion, a.versionNo, a.version, a.estimateNo));
        const versionB = parsePositiveNumber(firstDefined(b.estimateVersion, b.versionNo, b.version, b.estimateNo));
        if (versionA > 0 && versionB > 0 && versionA !== versionB) return versionB - versionA;
        if (versionA > 0 && !versionB) return -1;
        if (!versionA && versionB > 0) return 1;

        const idA = parsePositiveNumber(firstDefined(a.estimateId, a.estimateID, a.serviceTicketEstimateId, a.serviceTicketEstimateID, a.id));
        const idB = parsePositiveNumber(firstDefined(b.estimateId, b.estimateID, b.serviceTicketEstimateId, b.serviceTicketEstimateID, b.id));
        if (idA > 0 && idB > 0 && idA !== idB) return idB - idA;

        const ta = new Date(a?.approvedAt || a?.updatedAt || a?.createdAt || a?.createdDate || 0).getTime();
        const tb = new Date(b?.approvedAt || b?.updatedAt || b?.createdAt || b?.createdDate || 0).getTime();
        return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    })[0];
}

function normalizeEstimateItems(items, taxRuleById = new Map()) {
    return items.map((item, index) => {
        const quantity = toMoneyNumber(item?.quantity) || 1;
        const unitPriceBase = toMoneyNumber(item?.unitPrice);
        const unitPriceWithVat = toMoneyNumber(item?.unitPriceWithVat ?? item?.unitPriceWithVAT);
        const unitPrice = unitPriceBase || unitPriceWithVat;
        const baseLineAmount = unitPrice * quantity;
        const rawSubTotal = toMoneyNumber(item?.subTotal);
        const subTotalWithVat = toMoneyNumber(item?.subTotalWithVat ?? item?.subTotalWithVAT);
        const rawFinalPrice = item?.finalPrice ?? item?.final_price ?? item?.finalAmount ?? item?.final_amount;
        const fallbackLineAmount = subTotalWithVat || rawSubTotal || baseLineAmount;
        const finalAmount = subTotalWithVat ||
            (rawFinalPrice == null || String(rawFinalPrice).trim() === ''
                ? fallbackLineAmount
                : toMoneyNumber(rawFinalPrice));
        const explicitDiscount = toMoneyNumber(
            item?.discountAmount ??
            item?.discount_amount ??
            item?.promotionDiscountAmount ??
            item?.promotion_discount_amount ??
            item?.discountValue ??
            item?.discount_value,
        );
        const taxRuleId = firstDefined(
            item?.taxRuleId,
            item?.tax_rule_id,
            item?.workCategoryTaxRuleId,
            item?.work_category_tax_rule_id,
            item?.workCategory?.taxRuleId,
            item?.workCategory?.tax_rule_id,
        );
        const taxRule = taxRuleId == null ? null : taxRuleById.get(String(taxRuleId));
        const taxRateRaw = firstDefined(
            item?.appliedTaxRate,
            item?.applied_tax_rate,
            item?.taxRate,
            item?.tax_rate,
            taxRule?.taxRate,
            taxRule?.rate,
            item?.taxRule?.taxRate,
            item?.taxRule?.rate,
            item?.workCategory?.taxRule?.taxRate,
            item?.workCategory?.taxRule?.rate,
        );
        let taxRateNumber = typeof taxRateRaw === 'number' ? taxRateRaw : Number(String(taxRateRaw ?? '').trim());
        const hasExplicitTaxRate = Number.isFinite(taxRateNumber) && taxRateNumber > 0;
        if (!hasExplicitTaxRate) {
            const directTaxAmount = toMoneyNumber(item?.taxAmount ?? item?.tax_amount);
            if (directTaxAmount > 0 && baseLineAmount > 0) {
                taxRateNumber = directTaxAmount / baseLineAmount;
            } else {
                const inferredRate = baseLineAmount > 0 ? (finalAmount / baseLineAmount) - 1 : 0;
                taxRateNumber = inferredRate > 0.0001 ? inferredRate : 0;
            }
        }
        const normalizedTaxRate = taxRateNumber > 1 ? taxRateNumber / 100 : taxRateNumber;
        const netAfterDiscount = hasExplicitTaxRate && normalizedTaxRate > 0
            ? finalAmount / (1 + normalizedTaxRate)
            : finalAmount;
        const inferredDiscount = Math.max(0, baseLineAmount - netAfterDiscount);
        const discountAmount = Math.max(explicitDiscount, inferredDiscount);
        const grossAmount = Math.max(baseLineAmount, rawSubTotal, finalAmount + explicitDiscount);
        const taxAmount = toMoneyNumber(item?.taxAmount ?? item?.tax_amount) ||
            Math.max(0, finalAmount - Math.max(0, grossAmount - discountAmount));
        return {
            key: String(item?.estimateItemId ?? item?.itemId ?? index),
            categoryName: safeText(item?.workCategory?.categoryName || item?.workCategory?.categoryCode || item?.newCategoryName || item?.categoryName),
            itemName: safeText(item?.itemName || item?.description || item?.productName || item?.serviceName),
            name: safeText(item?.itemName || item?.newCategoryName || item?.workCategory?.categoryName),
            quantity: safeText(item?.quantity || quantity),
            unit: safeText(item?.unit),
            unitPrice,
            discountAmount,
            taxRateText: formatTaxRateText(normalizedTaxRate),
            taxAmount,
            grossAmount,
            subTotal: Math.max(0, finalAmount),
        };
    }).filter((item) => item.name || item.unitPrice > 0 || item.subTotal > 0);
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
    const serviceTicketIdParam = safeText(searchParams.get('serviceTicketId'));
    const ticketCodeParam = safeText(searchParams.get('ticketCode'));
    const payload = useMemo(() => {
        const parsedPayload = normalizePayload(parsePayload(searchParams.get('data')));
        if (parsedPayload) return parsedPayload;
        if (!serviceTicketIdParam && !ticketCodeParam) return null;
        return {
            store: STORE_INFO,
            serviceTicketId: serviceTicketIdParam,
            ticketCode: ticketCodeParam,
            issuedAt: new Date().toISOString(),
            customer: {},
            vehicle: {},
            invoice: { items: [], subtotal: 0, discountAmount: 0, total: 0 },
        };
    }, [searchParams, serviceTicketIdParam, ticketCodeParam]);
    const [ticketDetail, setTicketDetail] = useState(null);
    const [ticketError, setTicketError] = useState('');
    const [estimateRawItems, setEstimateRawItems] = useState([]);
    const [taxRules, setTaxRules] = useState([]);
    const [estimateError, setEstimateError] = useState('');
    const [estimateLoading, setEstimateLoading] = useState(false);

    useEffect(() => {
        if (!ticketCodeParam) return undefined;
        let cancelled = false;
        fetchTicketByTicketCode(ticketCodeParam)
            .then((detail) => {
                if (cancelled) return;
                setTicketDetail(detail);
                setTicketError('');
            })
            .catch((err) => {
                if (cancelled) return;
                setTicketDetail(null);
                setTicketError(err?.message || 'KhÃ´ng thá»ƒ táº£i thÃ´ng tin phiáº¿u bÃ¡n hÃ ng.');
            });
        return () => {
            cancelled = true;
        };
    }, [ticketCodeParam]);

    useEffect(() => {
        let cancelled = false;
        fetchTaxRules()
            .then((rules) => {
                if (!cancelled) setTaxRules(rules);
            })
            .catch(() => {
                if (!cancelled) setTaxRules([]);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const taxRuleById = useMemo(() => {
        const map = new Map();
        for (const rule of Array.isArray(taxRules) ? taxRules : []) {
            const id = firstDefined(rule?.taxRuleId, rule?.tax_rule_id, rule?.id);
            if (id != null) map.set(String(id), rule);
        }
        return map;
    }, [taxRules]);

    const estimateItems = useMemo(
        () => normalizeEstimateItems(estimateRawItems, taxRuleById),
        [estimateRawItems, taxRuleById],
    );

    const serviceTicketId = safeText(
        searchParams.get('serviceTicketId') ||
        ticketDetail?.serviceTicketId ||
        ticketDetail?.serviceTicketID ||
        ticketDetail?.ticketId ||
        ticketDetail?.id ||
        payload?.serviceTicketId,
    );

    useEffect(() => {
        if (!serviceTicketId) return undefined;
        let cancelled = false;
        const markLoading = () => {
            if (cancelled) return;
            setEstimateLoading(true);
            setEstimateError('');
        };
        if (typeof globalThis.queueMicrotask === 'function') {
            globalThis.queueMicrotask(markLoading);
        } else {
            Promise.resolve().then(markLoading);
        }
        fetchEstimateByServiceTicketId(serviceTicketId)
            .then((estimate) => {
                if (cancelled) return;
                setEstimateRawItems(getEstimateItems(estimate));
            })
            .catch((err) => {
                if (cancelled) return;
                setEstimateRawItems([]);
                setEstimateError(err?.message || 'Không thể tải dữ liệu hóa đơn.');
            })
            .finally(() => {
                if (!cancelled) setEstimateLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [serviceTicketId]);

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

    const detailCustomer = ticketDetail?.customer || {};
    const detailVehicle = ticketDetail?.vehicle || {};
    const effectivePayload = {
        ...payload,
        ticketCode: safeText(ticketDetail?.ticketCode || ticketDetail?.serviceTicketCode || ticketDetail?.code || payload.ticketCode),
        issuedAt: ticketDetail?.handoverAt || ticketDetail?.receivedAt || ticketDetail?.createdAt || payload.issuedAt,
        customer: {
            ...payload.customer,
            name: safeText(detailCustomer?.name || detailCustomer?.fullName || ticketDetail?.customerName || payload.customer?.name),
            phone: safeText(detailCustomer?.phone || ticketDetail?.customerPhone || payload.customer?.phone),
            address: safeText(detailCustomer?.address || ticketDetail?.customerAddress || payload.customer?.address),
        },
        vehicle: {
            ...payload.vehicle,
            licensePlate: safeText(detailVehicle?.licensePlate || ticketDetail?.licensePlate || payload.vehicle?.licensePlate),
            model: safeText(detailVehicle?.model || detailVehicle?.vehicleModel || ticketDetail?.vehicleModel || payload.vehicle?.model),
        },
    };
    const store = effectivePayload.store || STORE_INFO;
    const invoice = payload.invoice || {};
    const fallbackItems = Array.isArray(invoice.items) ? invoice.items : [];
    const items = estimateItems.length > 0 ? estimateItems : fallbackItems;
    const subtotal = estimateItems.length > 0
        ? items.reduce((sum, item) => sum + (toMoneyNumber(item.grossAmount) || toMoneyNumber(item.subTotal)), 0)
        : toMoneyNumber(invoice.subtotal);
    const discountAmount = estimateItems.length > 0
        ? items.reduce((sum, item) => sum + toMoneyNumber(item.discountAmount), 0)
        : toMoneyNumber(invoice.discountAmount);
    const total = estimateItems.length > 0
        ? items.reduce((sum, item) => sum + toMoneyNumber(item.subTotal), 0)
        : (toMoneyNumber(invoice.total) || Math.max(0, subtotal - discountAmount));
    const date = formatDateParts(effectivePayload.issuedAt);

    return (
        <main className={styles.page}>
            <section className={styles.sheet}>
                <header className={styles.header}>
                    <div className={styles.sellerName}>{safeText(store.name) || 'MICHELIN SƠN TÂY'}</div>
                    <div className={styles.sellerLine}>Địa chỉ: {safeText(store.address) || '-'}</div>
                    <div className={styles.sellerLine}>Mặt hàng bán: {safeText(store.businessLine) || '-'}</div>
                    <h1 className={styles.title}>HÓA ĐƠN GIÁ TRỊ GIA TĂNG</h1>
                    <div className={styles.dateLine}>Ngày {date.day} tháng {date.month} năm {date.year}</div>
                    <div className={styles.lookupLine}>Mã phiếu bán hàng: <strong>{safeText(effectivePayload.ticketCode) || '-'}</strong></div>
                </header>

                {ticketError ? <div className={styles.errorNotice}>{ticketError}</div> : null}
                {estimateLoading ? <div className={styles.notice}>Đang tải dữ liệu hạng mục từ báo giá...</div> : null}
                {estimateError ? <div className={styles.errorNotice}>{estimateError}</div> : null}

                <section className={styles.customerBlock}>
                    <div><strong>Họ tên người mua hàng:</strong> {safeText(effectivePayload.customer?.name) || '-'}</div>
                    <div><strong>Số điện thoại:</strong> {safeText(effectivePayload.customer?.phone) || '-'}</div>
                    <div><strong>Địa chỉ:</strong> {safeText(effectivePayload.customer?.address) || '-'}</div>
                    <div><strong>Biển số:</strong> {safeText(effectivePayload.vehicle?.licensePlate) || '-'}</div>
                    <div><strong>Loại xe:</strong> {safeText(effectivePayload.vehicle?.model) || '-'}</div>
                </section>

                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Hạng mục</th>
                            <th>Diễn giải</th>
                            <th>SL</th>
                            <th>Đơn giá</th>
                            <th>Giảm giá</th>
                            <th>Thuế</th>
                            <th>Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={`${safeText(item.name)}-${index}`}>
                                <td className={styles.center}>{String(index + 1).padStart(2, '0')}</td>
                                <td>{safeText(item.categoryName || item.name) || '-'}</td>
                                <td>{safeText(item.itemName || item.name) || '-'}</td>
                                <td className={styles.center}>
                                    {safeText(item.quantity) || '-'}
                                    {safeText(item.unit) ? <div className={styles.unitText}>{safeText(item.unit)}</div> : null}
                                </td>
                                <td className={styles.right}>{formatCurrencyVndZero(item.unitPrice)}</td>
                                <td className={styles.right}>{formatCurrencyVndZero(item.discountAmount)}</td>
                                <td className={styles.center}>{safeText(item.taxRateText) || '0%'}</td>
                                <td className={styles.right}>{formatCurrencyVndZero(item.subTotal)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <section className={styles.summary}>
                    <div><span>Tổng tiền hàng:</span><strong>{formatCurrencyVndZero(total)}</strong></div>
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
