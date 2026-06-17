import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { formatDateTimeViNoSeconds, formatTimeHHmm } from '../../../components/timeUtils.js';
import { toast } from 'react-toastify';
import AdvisorItemsTable from './AdvisorItemsTable.jsx';
import EstimateTimePopup from './EstimateTimePopup.jsx';
import MaintenanceBookingPopup from './MaintenanceBookingPopup.jsx';
import {
    readStaffRolesFromStorage,
    formatCurrencyVnd,
    toMoneyNumber,
    pickDiscountAmountValue,
    getEstimateItemGiftFlag,
    formatEstimatedDeliveryAtForApi,
    getFinishWorkErrorMessage,
    toPositiveNumberOrNull,
    getTicketItemName,
    normalizeTicketItemType,
    buildStockAllocationUpdatePayload,
    pickLatestEstimate,
    getActiveEstimateItemKeys,
    hasSameStringSet,
    readAddServiceRestoreSnapshot,
    clearAddServiceRestoreSnapshot,
    debugEstimateAllocation,
    normalizeTicketStatus,
    normalizeEstimateStatus,
    getPromotionId,
    getExplicitPromotionId,
    normalizePromotion,
    buildPromotionLabel,
    buildPromotionDisplayLabel,
    validatePromotion,
    getPromotionType,
    getPromotionCode,
    buildPromotionLookupById,
    buildPromotionLookupByCode,
    buildPromotionIdFallbackLabel,
    buildEstimatePromotionLabels,
    collectAppliedPromotionRefs,
    normalizeSafetyInspectionStatus,
    normalizeTicket,
    mapEstimateItemsForReceipt,
    normalizeBillId,
    useServiceTicketDetailData,
    useServiceTicketEditing,
} from './serviceTicketDetailHandlers.js';
import {
    allocateEstimateStock,
    applyPromotionToEstimate,
    createServiceTicketReminder,
    updateEstimateStockAllocation,
    fetchEstimateStockAllocations,
    fetchServiceTicketDetail,
    fetchServiceTicketEstimate,
    manageServiceTicketEstimateStatus,
    manageServiceTicketStatus,
    fetchTicketAssignments,
    updateServiceTicketEstimatedDelivery,
    unapplyPromotionFromEstimate,
    fetchSafetyInspectionCurrentRecommend,
} from '../../../services/serviceTicketService.js';
import { finishWork } from '../../../services/technicianService.js';
import { requestWarehouseStockIssue } from '../../../services/warehouseService.js';
import { createPayment, fetchPaymentByServiceTicketId } from '../../../services/paymentService.js';
import { fetchAvailablePromotions, fetchPromotionByCode } from '../../../services/promotionService.js';
import { getDefaultSafetyInspectionCategories, getSafetyInspectionByTicketCode } from '../../../services/safetyInspectionService.js';
import { ServiceTicket as TechnicianServiceTicket } from '../../Technician/ServiceTicket/ServiceTicket.jsx';
import Receipt from '../Receipt/Receipt.jsx';
import styles from './ServiceTicketDetail.module.css';

// Định nghĩa các hằng số cho vai trò nhân viên
const STAFF_ROLE = {
    ADVISOR: 'ADVISOR',
    RECEPTIONIST: 'RECEPTIONIST',
    ACCOUNTANT: 'ACCOUNTANT',
    WAREHOUSE_KEEPER: 'WAREHOUSE_KEEPER',
};

// Loại khuyến mãi
const PROMOTION_TYPES = [
    { type: 'PERCENT', label: 'Giảm theo phần trăm' },
    { type: 'BUY_X_GET_Y', label: 'Mua X tặng Y' },
];



/**
 * Kiểm tra xem một estimate item đã được trả về (trạng thái allocation = RELEASED) hay chưa.
 * boolean (true nếu item đã RELEASED — đã được trả lại kho).
 * Dùng Khi lọc danh sách in phiếu, hoặc khi quyết định hiển thị/không hiển thị item đã trả lại.
 */
function isReturnedItem(item) {
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

// Lấy ID của báo giá từ các trường có thể có trong đối tượng báo giá
function getEstimateIdValue(estimate) {
    return toPositiveNumberOrNull(
        estimate?.estimateId ??
        estimate?.estimateID ??
        estimate?.id ??
        estimate?.serviceTicketEstimateId ??
        estimate?.serviceTicketEstimateID ??
        estimate?.service_ticket_estimate_id,
    );
}

// Lấy ID kho hàng của một item từ các trường có thể có trong đối tượng item
function getEstimateItemWarehouseId(item) {
    return toPositiveNumberOrNull(
        item?.warehouseId ??
        item?.warehouseID ??
        item?.warehouse_id ??
        item?.warehouse?.warehouseId ??
        item?.warehouse?.id,
    );
}

// Lấy trạng thái kho hàng của một item từ các trường có thể có trong đối tượng item
function getEstimateItemStockStatus(item) {
    return String(
        item?.stockAllocation?.status ??
        item?.allocation?.status ??
        item?.warehouseAllocation?.status ??
        item?.stockAllocationStatus ??
        item?.stock_allocation_status ??
        item?.allocationStatus ??
        '',
    ).trim().toUpperCase();
}

// Kiểm tra xem một item có được checked hay không từ các trường có thể có trong đối tượng item
function isEstimateItemCheckedForActions(item) {
    const raw = item?.isChecked ?? item?.checked;
    return !(raw === false || String(raw ?? '').trim().toLowerCase() === 'false');
}

/**
 * Kết hợp trạng thái kho và flag checked để quyết định item có sẵn cho các hành động tương tác (ví dụ xuất kho, sửa)
 *  boolean (true nếu trạng thái không phải 'RELEASED' và item được checked).
 * Tính toán danh sách actionableAdvisorItems, quyết định enable/disable các nút hành động.
 */
function isEstimateItemAvailableForActions(item) {
    return getEstimateItemStockStatus(item) !== 'RELEASED' && isEstimateItemCheckedForActions(item);
}

/**
 * Kiểm tra trong mảng items có bất kỳ item nào đang trong trạng thái trả hàng đã submit chờ duyệt hay không.
 * Output: boolean (true nếu tồn tại item có returnStatus = 'SUBMITTED').
 *  quyết định cho phép hoàn tất sửa chữa, in hóa đơn hoặc khóa các hành động nếu có trả hàng đang chờ.
 */
function hasPendingReturnApproval(items) {
    return (Array.isArray(items) ? items : []).some((item) => {
        const rawReturnStatus =
            item?.stockAllocation?.returnStatus ??
            item?.allocation?.returnStatus ??
            item?.warehouseAllocation?.returnStatus ??
            item?.returnStatus ??
            item?.stock_allocation_return_status ??
            '';
        return String(rawReturnStatus).trim().toUpperCase() === 'SUBMITTED';
    });
}

// Component chính hiển thị chi tiết phiếu dịch vụ
export default function ServiceTicketDetail({ ticketCodeOverride }) {
    useScrollToTop();
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();
    // Đọc role nhân viên từ localStorage và xác định quyền truy cập dựa trên vai trò đó
    const staffRoles = useMemo(() => readStaffRolesFromStorage(), []);
    const hasAdvisorRole = staffRoles.length === 0 ? true : staffRoles.includes(STAFF_ROLE.ADVISOR);
    const hasReceptionistRole = staffRoles.includes(STAFF_ROLE.RECEPTIONIST);
    const hasAccountantRole = staffRoles.includes(STAFF_ROLE.ACCOUNTANT);
    const hasWarehouseKeeperRole = staffRoles.includes(STAFF_ROLE.WAREHOUSE_KEEPER);
    const isAdvisorOnlyViewRole = hasAdvisorRole; // Chỉ có Tư vấn viên mới được xem phần kiểm tra và báo giá, nhưng nếu có thì sẽ có quyền chỉnh sửa nếu không bị khóa.
    const hasReceptionistEditAccess = hasReceptionistRole; // Lễ tân có thể chỉnh sửa yêu cầu khách hàng 
    const canViewInspectionAndEstimate = true; // Tất cả role đều có thể xem phần kiểm tra và báo giá, nhưng chỉ advisor mới được chỉnh sửa nếu không bị khóa.

    // Các state và ref để quản lý trạng thái của component
    const [receiptApproving, setReceiptApproving] = useState(false); // Trạng thái đang duyệt hóa đơn
    const [statusUpdating, setStatusUpdating] = useState(false);    
    const [estimateLoading, setEstimateLoading] = useState(false);
    const [latestEstimate, setLatestEstimate] = useState(null); // Lưu trữ báo giá mới nhất để hiển thị và chỉnh sửa
    const estimateLoadSeqRef = useRef(0); // Ref để theo dõi thứ tự tải báo giá, tránh cập nhật state với dữ liệu cũ khi có nhiều lần tải liên tiếp
    const createVersionSyncRef = useRef(''); // Ref để đồng bộ trạng thái tạo phiên bản báo giá mới, tránh việc phải đưa isCreatingNewEstimateVersion vào dependency của nhiều useEffect khác nhau.
    const [assignments, setAssignments] = useState([]); // Lưu trữ danh sách nhân viên được phân công cho phiếu dịch vụ
    const [assignmentsLoading, setAssignmentsLoading] = useState(false); 

    // State và ref để quản lý yêu cầu xuất kho vật tư
    const [stockIssueRequesting, setStockIssueRequesting] = useState(false);
    // State và ref để quản lý trạng thái báo giá đang được chỉnh sửa (dùng chung cho chỉnh sửa thông thường và chỉnh sửa tạm khi thêm dịch vụ)
    const [isEstimateEditing, setIsEstimateEditing] = useState(false);

    // State và ref để quản lý popup đặt lịch bảo dưỡng
    const [maintenancePopupOpen, setMaintenancePopupOpen] = useState(false);
    const [maintenanceDraft, setMaintenanceDraft] = useState({ scheduledAt: '', note: '' });
    const [maintenanceSubmitting, setMaintenanceSubmitting] = useState(false);

    const [estimateTimePopupOpen, setEstimateTimePopupOpen] = useState(false);
    const [estimatedTimeDraft, setEstimatedTimeDraft] = useState('');
    const [previewPhotoUrl, setPreviewPhotoUrl] = useState(null);
    const [isLicensePlateZoomed, setIsLicensePlateZoomed] = useState(false);

    // Hàm mở popup đặt lịch bảo dưỡng
    const handleOpenMaintenancePopup = () => {
        setMaintenancePopupOpen(true);
    };


    // Chỉ cho luồng: Tạo bản báo giá mới .
    // Khi đang trong luồng tạo bản báo giá mới, sẽ có hành động bị giới hạn để tránh xung đột trạng thái như chỉnh sửa trực tiếp báo giá hiện tại hoặc áp dụng khuyến mãi mới.   
    const [isCreatingNewEstimateVersion, setIsCreatingNewEstimateVersion] = useState(false);
    const createNewEstimateRevertRef = useRef(null);

   
    const [refreshTick, setRefreshTick] = useState(0); // Dùng để kích hoạt refresh dữ liệu khi có thay đổi quan trọng mà không muốn đưa vào dependency của useEffect  
    const triggerRefresh = useCallback(() => setRefreshTick((prev) => prev + 1), []); // Hàm để kích hoạt refresh dữ liệu, có thể được gọi sau khi thực hiện các hành động như thêm dịch vụ, cập nhật trạng thái 
    const [, setPageRenderTick] = useState(0); // Dùng để kích hoạt render lại giao diện khi có thay đổi quan trọng mà không muốn đưa vào dependency của useEffect như sau khi thêm dịch vụ 
    
    // Hàm để kích hoạt render lại giao diện, sử dụng requestAnimationFrame nếu có để tránh render quá nhiều lần liên tiếp khi có nhiều thay đổi nhanh
    const renderPageSoon = useCallback(() => {
        const render = () => setPageRenderTick((prev) => prev + 1);
        if (typeof globalThis.requestAnimationFrame === 'function') {
            globalThis.requestAnimationFrame(render);
        } else {
            render();
        }
    }, []);

    // Bắt sự kiện click trên toàn bộ trang để kích hoạt render lại khi có thay đổi quan trọng, nhưng chỉ khi click vào các button không bị disabled để tránh render lại quá nhiều lần 
    const handlePageButtonClickCapture = useCallback((event) => {
        const button = typeof event?.target?.closest === 'function'
            ? event.target.closest('button')
            : null;
        if (!button || button.disabled) return;
        renderPageSoon();
    }, [renderPageSoon]);

    
    // Ref để lưu trữ snapshot khi đang trong luồng thêm dịch vụ, cho phép hoàn tác về trạng thái trước đó nếu có lỗi hoặc khi người dùng hủy bỏ việc thêm dịch vụ.
    const addServiceRevertRef = useRef(null);
    const [addServiceReverting, setAddServiceReverting] = useState(false);

    // Lấy mã phiếu dịch vụ từ param của route hoặc từ state khi điều hướng đến trang này, ưu tiên giá trị được truyền trực tiếp qua prop ticketCodeOverride nếu có
    const ticketCodeParam = String(ticketCodeOverride || params?.ticketCode || '').trim();
    const ticketFromState = location?.state?.ticket ?? location?.state?.serviceTicket ?? null;

    // Custom hook để lấy dữ liệu chi tiết phiếu dịch vụ, bao gồm dữ liệu gốc, trạng thái tải, lỗi nếu có và hàm để cập nhật dữ liệu gốc
    const { ticketRaw, setTicketRaw, isLoading, error, setError } = useServiceTicketDetailData(
        ticketCodeParam,
        ticketFromState,
    );

    // Hàm để hiển thị thông báo
    const notify = useCallback((message) => toast(message, { containerId: 'app-toast' }), []);

    // Memoized ticket đã được chuẩn hóa để sử dụng trong giao diện, đảm bảo chỉ được tính toán lại khi dữ liệu gốc hoặc mã phiếu dịch vụ thay đổi
    const ticket = useMemo(
        () => normalizeTicket(ticketRaw ?? ticketFromState, ticketCodeParam),
        [ticketRaw, ticketFromState, ticketCodeParam],
    );

    // Các giá trị hiển thị được định dạng sẵn để sử dụng trong giao diện, đảm bảo chỉ được tính toán lại khi dữ liệu gốc thay đổi  
    const receivedAtDisplay = ticket?.receivedAt ? formatDateTimeViNoSeconds(ticket.receivedAt, '-') : '-';
    const handoverAtDisplay = ticket?.handoverAt ? formatDateTimeViNoSeconds(ticket.handoverAt, '-') : '-';

    // Tính toán giá trị thời gian dự kiến hiển thị, ưu tiên giá trị đang được chỉnh sửa trong popup nếu có
    const estimatedTimeValue = useMemo(
        () => String(estimatedTimeDraft || ticket?.estimatedDeliveryAt || '').trim(),
        [estimatedTimeDraft, ticket?.estimatedDeliveryAt],
    );

    // Định dạng giá trị thời gian dự kiến để hiển thị
    const estimatedTimeDisplay = useMemo(
        () => (estimatedTimeValue ? formatDateTimeViNoSeconds(estimatedTimeValue, '-') : '-'),
        [estimatedTimeValue],
    );

    // Tính toán trạng thái của phiếu dịch vụ, ưu tiên các trường trạng thái có thể có trong dữ liệu gốc, sau đó chuẩn hóa lại để sử dụng trong giao diện
    const ticketStatus = useMemo(
        () => normalizeTicketStatus(ticket?.statusCode || ticket?.timelineStatus || ticket?.statusLabel),
        [ticket?.statusCode, ticket?.timelineStatus, ticket?.statusLabel],
    );

    // Kiểm tra xem phiếu dịch vụ có bật tính năng kiểm tra an toàn hay không, ưu tiên các trường có thể có trong dữ liệu gốc
    const isSafetyInspectionEnabled = useMemo(
        () => ticketRaw?.safetyInspectionEnabled === true || ticketFromState?.safetyInspectionEnabled === true,
        [ticketFromState?.safetyInspectionEnabled, ticketRaw?.safetyInspectionEnabled],
    );

    // Tính toán trạng thái kiểm tra an toàn, ưu tiên các trường có thể có trong dữ liệu gốc, sau đó chuẩn hóa lại để sử dụng trong giao diện
    const safetyInspectionStatus = useMemo(() => normalizeSafetyInspectionStatus(
        ticketRaw?.safetyInspection?.inspectionStatus
        ?? ticketRaw?.safetyInspectionStatus
        ?? ticketRaw?.inspectionStatus
        ?? ticketRaw?.inspection?.inspectionStatus
        ?? ticketFromState?.safetyInspection?.inspectionStatus
        ?? ticketFromState?.safetyInspectionStatus
        ?? ticketFromState?.inspectionStatus
        ?? ticketFromState?.inspection?.inspectionStatus,
    ), [
        ticketFromState?.inspection?.inspectionStatus,
        ticketFromState?.inspectionStatus,
        ticketFromState?.safetyInspection?.inspectionStatus,
        ticketFromState?.safetyInspectionStatus,
        ticketRaw?.inspection?.inspectionStatus,
        ticketRaw?.inspectionStatus,
        ticketRaw?.safetyInspection?.inspectionStatus,
        ticketRaw?.safetyInspectionStatus,
    ]);

    // Xác định xem đã hoàn thành bước kiểm tra an toàn hay chưa, dựa trên trạng thái kiểm tra an toàn và trạng thái của phiếu dịch vụ
    const hasCompletedInspectionStep = useMemo(() => {
        if (isSafetyInspectionEnabled && safetyInspectionStatus === 'COMPLETED') return true;
        return ['INSPECTED', 'ESTIMATED', 'PENDING', 'REPAIRING', 'COMPLETED', 'PAID'].includes(ticketStatus);
    }, [isSafetyInspectionEnabled, safetyInspectionStatus, ticketStatus]);

    // Ẩn báo giá nếu xe chưa được kiểm tra an toàn (Bỏ chặn hiển thị báo giá)
    const shouldHideEstimateUntilInspectionDone = false;
    
    // Kiểm tra xem phiếu dịch vụ đã bị hủy hay chưa, dựa trên trạng thái của phiếu dịch vụ
    const isTicketCancelled = ticketStatus === 'CANCELLED';

    // Tính toán ID của phiếu dịch vụ dưới dạng số, ưu tiên các trường có thể có trong dữ liệu gốc, sau đó chuẩn hóa lại để sử dụng trong các API yêu cầu ID dưới dạng số
    const serviceTicketIdNum = useMemo(() => {
        const raw = ticket?.serviceTicketId;
        const n = typeof raw === 'number' ? raw : Number(raw);
        return Number.isFinite(n) && n > 0 ? n : null;
    }, [ticket?.serviceTicketId]);

    // Tính toán ID của khách hàng dưới dạng số, ưu tiên các trường có thể có trong dữ liệu gốc, sau đó chuẩn hóa lại để sử dụng trong các API yêu cầu ID dưới dạng số
    const customerIdNum = useMemo(() => {
        const source = ticketRaw ?? ticketFromState ?? ticket ?? {};
        return toPositiveNumberOrNull(
            source?.customerId ??
                source?.customerID ??
                source?.customer?.customerId ??
                source?.customer?.customerID ??
                source?.customer?.id,
        );
    }, [ticket, ticketFromState, ticketRaw]);

    // Hàm để tải lại danh sách khuyến mãi có sẵn cho khách hàng, có thể được gọi sau khi áp dụng hoặc hủy bỏ khuyến mãi để cập nhật lại danh sách khuyến mãi có sẵn và trạng thái áp dụng
    const refreshAvailablePromotions = useCallback(async (token = null, customerId = customerIdNum) => {
        if (ticketCodeParam === 'demo') {
            setAvailablePromotions({
                PERCENT: [
                    { promotionId: 10, promotionCode: 'KM10', promotionType: 'PERCENT', discountValue: 10, maxValue: 500000, minOrderValue: 0, description: 'Giảm 10% tổng hóa đơn, tối đa 500K' },
                    { promotionId: 20, promotionCode: 'KM20', promotionType: 'PERCENT', discountValue: 20, maxValue: 1000000, minOrderValue: 2000000, description: 'Giảm 20% cho hóa đơn từ 2 triệu, tối đa 1 triệu' }
                ],
                BUY_X_GET_Y: []
            });
            return;
        }
        const authToken = token || localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        if (!authToken) return;

        try {
            setPromotionsLoading(true);
            setPromotionsError('');
            const entries = await Promise.all(PROMOTION_TYPES.map(async ({ type }) => {
                const res = await fetchAvailablePromotions(authToken, type, customerId);
                return [type, Array.isArray(res?.data) ? res.data : []];
            }));
            setAvailablePromotions(Object.fromEntries(entries));
        } catch (err) {
            setAvailablePromotions({ PERCENT: [], BUY_X_GET_Y: [] });
            setPromotionsError(err?.message || 'Không thể tải danh sách khuyến mãi.');
        } finally {
            setPromotionsLoading(false);
        }
    }, [customerIdNum, ticketCodeParam]);

    // Khi chuyển sang phiếu dịch vụ khác, reset các ref và state liên quan đến luồng tạo bản báo giá mới để tránh ảnh hưởng đến phiếu dịch vụ khác
    useEffect(() => {
        addServiceRevertRef.current = null;
        createNewEstimateRevertRef.current = null;
        createVersionSyncRef.current = '';
        setIsCreatingNewEstimateVersion(false);
    }, [serviceTicketIdNum]);

    // State và lỗi liên quan đến hóa đơn thanh toán, dùng để hiển thị thông tin hóa đơn nếu đã có và lỗi nếu có khi kiểm tra hóa đơn
    const [billPayment, setBillPayment] = useState(null);
    const [billLookupError, setBillLookupError] = useState('');
    const [billCreating, setBillCreating] = useState(false);

    // State để quản lý danh sách khuyến mãi có sẵn
    const [availablePromotions, setAvailablePromotions] = useState({
        PERCENT: [],
        BUY_X_GET_Y: [],
    });
    const [promotionsLoading, setPromotionsLoading] = useState(false);
    const [promotionsError, setPromotionsError] = useState('');
    const [promoCodes, setPromoCodes] = useState({
        PERCENT: '',
        BUY_X_GET_Y: '',
    });
    const [selectedPromotions, setSelectedPromotions] = useState({
        PERCENT: '',
        BUY_X_GET_Y: '',
    });
    const [appliedPromotions, setAppliedPromotions] = useState({
        PERCENT: null,
        BUY_X_GET_Y: null,
    });
    const [promoApplying, setPromoApplying] = useState(false);
    const [promoError, setPromoError] = useState('');

    // State để quản lý thông tin kiểm tra an toàn dùng cho in ấn, bao gồm thông tin kiểm tra an toàn hiện tại và danh mục kiểm tra an toàn mặc định để hiển thị trên phiếu in
    const [safetyInspectionForPrint, setSafetyInspectionForPrint] = useState(null);
    const [defaultSafetyCategories, setDefaultSafetyCategories] = useState([]);
    const [printRecommendation, setPrintRecommendation] = useState('');

    // Khi có mã phiếu dịch vụ hợp lệ, tự động kiểm tra xem đã có hóa đơn thanh toán nào liên quan đến phiếu dịch vụ này hay chưa và lưu trữ 
    useEffect(() => {
        let cancelled = false;

        // Nếu không có mã phiếu dịch vụ hợp lệ, reset thông tin hóa đơn và lỗi liên quan
        if (!serviceTicketIdNum || ticketCodeParam === 'demo') {
            setBillPayment(null);
            setBillLookupError('');
            return () => { cancelled = true; };
        }

        // Kiểm tra hóa đơn liên quan đến phiếu dịch vụ, nếu có lỗi thì lưu trữ lỗi, nếu không có hóa đơn thì giữ nguyên trạng thái null 
        (async () => {
            const token = localStorage.getItem('authToken');
            if (!token) {
                if (!cancelled) {
                    setBillPayment(null);
                    setBillLookupError('');
                }
                return;
            }

            try {
                if (!cancelled) {
                    setBillLookupError('');
                }
                // Gọi API để kiểm tra hóa đơn liên quan đến phiếu dịch vụ
                const res = await fetchPaymentByServiceTicketId(serviceTicketIdNum, token);
                if (cancelled) return;
                setBillPayment(res?.data ?? res ?? null);
            } catch (err) {
                if (cancelled) return;
                const message = String(err?.message || '').toLowerCase();
                const isNotFound = message.includes('not found')
                    || message.includes('404')
                    || message.includes('không tìm thấy')
                    || message.includes('khong tim thay');
                if (isNotFound) {
                    setBillPayment(null);
                    setBillLookupError('');
                } else {
                    setBillPayment(null);
                    setBillLookupError(err?.message || 'Không thể kiểm tra hóa đơn của phiếu dịch vụ.');
                }
            } finally {
                // no-op
            }
        })();

        return () => { cancelled = true; };
    }, [serviceTicketIdNum]);

    // Khi có ID khách hàng hợp lệ, tự động tải danh sách khuyến mãi có sẵn cho khách hàng đó và lưu trữ
    useEffect(() => {
        let cancelled = false;
        if (!customerIdNum) {
            setAvailablePromotions({ PERCENT: [], BUY_X_GET_Y: [] });
            setPromotionsError('');
            return () => { cancelled = true; };
        }

        refreshAvailablePromotions().finally(() => {
            if (cancelled) return;
        });

        return () => { cancelled = true; };
    }, [customerIdNum, refreshAvailablePromotions]);

    // Khi có mã phiếu dịch vụ hợp lệ, tự động tải thông tin kiểm tra an toàn liên quan đến phiếu dịch vụ đó để hiển thị trên phiếu in
    useEffect(() => {
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        if (!token) return undefined;
        const code = String(ticket.ticketCode || ticketCodeParam || '').trim();
        if (!code) return undefined;

        if (code === 'demo') {
            setSafetyInspectionForPrint({
                inspectionId: 100,
                serviceTicketId: 99999,
                inspectionStatus: 'COMPLETED',
                recommendedTireSize: '205/55R16',
                tires: [
                  { tirePosition: 'FRONT_LEFT', treadDepth: 6, pressure: 2.2, recommendedPressure: 2.2, tireSpecification: '205/55R16' },
                  { tirePosition: 'FRONT_RIGHT', treadDepth: 6, pressure: 2.2, recommendedPressure: 2.2, tireSpecification: '205/55R16' },
                  { tirePosition: 'REAR_LEFT', treadDepth: 5, pressure: 2.3, recommendedPressure: 2.3, tireSpecification: '205/55R16' },
                  { tirePosition: 'REAR_RIGHT', treadDepth: 5, pressure: 2.3, recommendedPressure: 2.3, tireSpecification: '205/55R16' },
                  { tirePosition: 'SPARE', treadDepth: 7, pressure: 2.5, recommendedPressure: 2.5, tireSpecification: '205/55R16' }
                ],
                items: [
                  { workCategoryId: 1, itemId: 1, categoryName: 'Hệ thống phanh', itemStatus: 'GOOD', advisorNote: 'Má phanh còn dày' },
                  { workCategoryId: 2, itemId: 2, categoryName: 'Hệ thống giảm xóc', itemStatus: 'GOOD', advisorNote: 'Không chảy dầu' },
                  { workCategoryId: 3, itemId: 3, categoryName: 'Hệ thống lái', itemStatus: 'WARNING', advisorNote: 'Rơ nhẹ thanh liên kết' },
                  { workCategoryId: 4, itemId: 4, categoryName: 'Độ chụm bánh xe', itemStatus: 'REPLACE', advisorNote: 'Sai lệch góc đặt bánh xe' }
                ]
            });
            return undefined;
        }

        let cancelled = false;
        (async () => {
            try {
                const res = await getSafetyInspectionByTicketCode(code, token);// Gọi API để tải thông tin kiểm tra an toàn 
                if (!cancelled) setSafetyInspectionForPrint(res?.data ?? null);
            } catch {
                if (!cancelled) setSafetyInspectionForPrint(null);
            }
        })();
        return () => { cancelled = true; };
    }, [ticket.ticketCode, ticketCodeParam]);

    // Khi component được mount, tự động tải danh mục kiểm tra an toàn mặc định để hiển thị trên phiếu in
    useEffect(() => { 
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        if (!token) return undefined;

        if (ticketCodeParam === 'demo') {
            setDefaultSafetyCategories([
                { id: 1, categoryName: 'Hệ thống phanh', displayOrder: 1 },
                { id: 2, categoryName: 'Hệ thống giảm xóc', displayOrder: 2 },
                { id: 3, categoryName: 'Hệ thống lái', displayOrder: 3 },
                { id: 4, categoryName: 'Độ chụm bánh xe', displayOrder: 4 }
            ]);
            return undefined;
        }

        let cancelled = false;
        (async () => {
            try {
                const res = await getDefaultSafetyInspectionCategories(token); // Gọi API để tải danh mục kiểm tra an toàn mặc định
                if (!cancelled) setDefaultSafetyCategories(Array.isArray(res?.data) ? res.data : []);
            } catch {
                if (!cancelled) setDefaultSafetyCategories([]);
            }
        })();
        return () => { cancelled = true; };
    }, [ticketCodeParam]);

    // Khi có mã phiếu dịch vụ hợp lệ, tự động tải khuyến nghị kiểm tra an toàn hiện tại để hiển thị trên phiếu in
    useEffect(() => {
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        if (!token || !serviceTicketIdNum) {
            setPrintRecommendation('');
            return undefined;
        }

        if (ticketCodeParam === 'demo') {
            setPrintRecommendation('Cân chỉnh góc đặt bánh xe và thay lốp trước.');
            return undefined;
        }

        // Gọi API để tải khuyến nghị kiểm tra an toàn hiện tại
        let cancelled = false;
        (async () => {
            const storageKey = `serviceTicketRecommendation:${serviceTicketIdNum}`;
            try {
                const res = await fetchSafetyInspectionCurrentRecommend(serviceTicketIdNum, token); // Gọi API để tải khuyến nghị kiểm tra an toàn hiện tại
                const value = String(
                    res?.data?.recommend ??
                    res?.data?.recommendation ??
                    res?.data?.recommendationText ??
                    res?.data?.currentRecommend ??
                    res?.data ??
                    '',
                ).trim();
                if (cancelled) return;
                const next = value || localStorage.getItem(storageKey) || '';
                setPrintRecommendation(next);
                if (next) localStorage.setItem(storageKey, next);
            } catch {
                if (!cancelled) setPrintRecommendation(localStorage.getItem(storageKey) || '');
            }
        })();

        return () => { cancelled = true; };
    }, [serviceTicketIdNum]);

    // Tính toán trạng thái của báo giá mới nhất liên quan đến phiếu dịch vụ
    const estimateStatus = useMemo(() => {
        return normalizeEstimateStatus(
            latestEstimate?.estimateStatus ?? latestEstimate?.status ?? latestEstimate?.estimate_status,
        );
    }, [latestEstimate]);

    // Tính toán ID của báo giá mới nhất liên quan đến phiếu dịch vụ để so sánh khi đang trong luồng thêm dịch vụ để xác định xem có phải cùng một báo giá hay không
    const estimateIdNum = useMemo(() => {
        return getEstimateIdValue(latestEstimate);
    }, [latestEstimate]);

    // Tính toán xem có đang chờ thêm dịch vụ không
    const isAddServicePending = useMemo(() => {
        if (!serviceTicketIdNum) return false;
        const snapshot = addServiceRevertRef.current ?? readAddServiceRestoreSnapshot(serviceTicketIdNum);
        if (!snapshot) return false;

        // So sánh ID báo giá trong snapshot với ID báo giá hiện tại để xác định xem có phải cùng một báo giá hay không khi trạng thái trước đó của báo giá là APPROVED
        const snapshotEstimateId = toPositiveNumberOrNull(snapshot?.estimateIdNum);
        const previousEstimateStatus = normalizeEstimateStatus(snapshot?.prevEstimateStatus);
        // Nếu không có ID báo giá thì mặc định là cùng một báo giá
        if (previousEstimateStatus !== 'APPROVED') return false;
        if (snapshotEstimateId && estimateIdNum) {
            return snapshotEstimateId === estimateIdNum;
        }

        return true;
    }, [estimateIdNum, serviceTicketIdNum]);

    // Tính toán xem có đang trong luồng tạo bản báo giá mới hay không, dựa trên trạng thái đang chờ thêm dịch vụ và trạng thái tạo bản báo giá mới
    const isEstimateDraft = estimateStatus === 'DRAFT';
    const isEstimateSent = estimateStatus === 'SENT';
    const isEstimateApproved = estimateStatus === 'APPROVED';
    const billId = useMemo(() => normalizeBillId(billPayment), [billPayment]);
    const hasBill = Boolean(billId); // Xác định xem đã có hóa đơn nào liên quan đến phiếu dịch vụ hay chưa
    const isActionLocked = ticketStatus === 'PAID' || hasBill; // Khóa các hành động chỉnh sửa nếu phiếu dịch vụ đã được thanh toán hoặc đã có hóa đơn
    
    // Tính toán xem có đang trong luồng tạo bản báo giá mới hay không, dựa trên trạng thái đang chờ thêm dịch vụ và trạng thái tạo bản báo giá mới
    const isEstimateVersionRevision = useMemo(() => {
        if (isCreatingNewEstimateVersion) return true;
        const versionRaw =
            latestEstimate?.version ??
            latestEstimate?.estimateVersion ??
            latestEstimate?.estimateNo ??
            latestEstimate?.versionNo ??
            null; // Các trường có thể có trong dữ liệu gốc để xác định phiên bản của báo giá
        const hasVersionValue = versionRaw != null && String(versionRaw).trim() !== ''; // Kiểm tra xem có giá trị phiên bản nào hay không 
        // Trích xuất số phiên bản 
        const versionNumber =
            typeof versionRaw === 'number'
                ? versionRaw
                : Number(/\d+/.exec(String(versionRaw ?? ''))?.[0] ?? '');
        if (Number.isFinite(versionNumber) && versionNumber > 1) return true;
        if (hasVersionValue) return false;

        // Kiểm tra xem có item nào trong báo giá đã được chỉnh sửa từ phiên bản trước đó hay không để xác định xem có đang trong luồng tạo bản báo giá mới hay không
        const items = Array.isArray(latestEstimate?.items) ? latestEstimate.items : [];
        return items.some((it) => toPositiveNumberOrNull(it?.revisedFromItemId) != null);
    }, [isCreatingNewEstimateVersion, latestEstimate]);

    // Xem có đang bị giới hạn áp dụng khuyến mãi mới chỉ cho các loại khuyến mãi nhất định hay không dựa trên việc đang trong luồng tạo bản báo giá mới và trạng thái của báo giá
    const isNewEstimateVersionPromotionLimited = isEstimateVersionRevision && (isEstimateDraft || isEstimateSent);

    // Tính toán xem có thể áp dụng khuyến mãi mới cho báo giá hiện tại hay không 
    // Điều kiện: - Phải có báo giá mới nhất để áp dụng khuyến mãi
    // - Phải đang ở trạng thái nháp hoặc đang trong luồng tạo bản báo giá mới và báo giá đã được gửi đi
    const canApplyPromotionToCurrentEstimate = Boolean(latestEstimate)
        && (isEstimateDraft || (isNewEstimateVersionPromotionLimited && isEstimateSent))
        && ticketStatus !== 'PAID'
        && !shouldHideEstimateUntilInspectionDone;

    // Tính toán các item của báo giá để hiển thị trên phiếu in
    const receiptItems = useMemo(() => mapEstimateItemsForReceipt(latestEstimate), [latestEstimate]);
    // Tính toán tổng phụ của hóa đơn dựa trên các item của báo giá
    const receiptSubtotal = useMemo(
        () => receiptItems.reduce((acc, it) => acc + toMoneyNumber(it.subTotalDisplay ?? it.subTotal), 0),
        [receiptItems],
    );
    
    // Chỉ hiển thị các item không phải là item đã được trả về 
    const printReceiptItems = useMemo( 
        () => receiptItems.filter((it) => !isReturnedItem(it)),
        [receiptItems],
    );

    // Tính toán tổng phụ của hóa đơn dựa trên các item được in trên phiếu, chỉ tính các item không phải là item đã được trả về
    const printReceiptSubtotal = useMemo(
        () => printReceiptItems.reduce((acc, it) => acc + toMoneyNumber(it.subTotalDisplay ?? it.subTotal), 0),
        [printReceiptItems],
    );

    // Tính toán tổng số tiền được giảm giá (không còn vì ko có giảm giá bill) 
    const printReceiptDiscountAmount = useMemo(() => {
        return printReceiptItems.reduce((acc, it) => {
            const lineSubtotal = toMoneyNumber(it.subTotalDisplay ?? it.subTotal);
            const lineFinal = toMoneyNumber(it.finalPriceDisplay ?? it.subTotalDisplay ?? it.subTotal);
            const backendDiscount = toMoneyNumber(it.discountAmount);
            return acc + Math.max(backendDiscount, lineSubtotal - lineFinal, 0);
        }, 0);
    }, [printReceiptItems]);

    // Tính toán tổng số tiền phải thanh toán trên hóa đơn dựa trên các item được in trên phiếu, chỉ tính các item không phải là item đã được trả về
    const printReceiptTotal = useMemo(
        () => printReceiptItems.reduce((acc, it) => acc + toMoneyNumber(it.finalPriceDisplay ?? it.subTotalDisplay ?? it.subTotal), 0),
        [printReceiptItems],
    );
    
    // Danh sách khuyến mãi đã được áp dụng cho báo giá hiện tại dựa trên các loại khuyến mãi đã được áp dụng và thông tin khuyến mãi có sẵn
    const appliedPromotionList = useMemo(
        () => PROMOTION_TYPES.map(({ type }) => appliedPromotions[type]).filter(Boolean),
        [appliedPromotions],
    );
    // Nhãn hiển thị cho các khuyến mãi đã được áp dụng (ko có vì ko còn buy x get y)
    const appliedPromotionLabel = useMemo(
        () => appliedPromotionList.map(buildPromotionLabel).filter(Boolean).join(' / '),
        [appliedPromotionList],
    );
    // Nhãn hiển thị cho các khuyến mãi liên quan đến báo giá hiện tại dựa trên thông tin khuyến mãi có sẵn và thông tin khuyến mãi đã được áp dụng
    const estimatePromotionLabels = useMemo(
        () => buildEstimatePromotionLabels(latestEstimate, availablePromotions),
        [availablePromotions, latestEstimate],
    );
    // Danh sách nhãn hiển thị cho tất cả các khuyến mãi liên quan đến báo giá hiện tại
    const activePromotionLabels = useMemo(() => {
        const labels = [];
        const seen = new Set();
        const add = (label) => {
            const text = String(label || '').trim();
            if (!text || seen.has(text)) return;
            seen.add(text);
            labels.push(text);
        };
        add(appliedPromotionLabel);
        estimatePromotionLabels.forEach(add);
        return labels;
    }, [appliedPromotionLabel, estimatePromotionLabels]);

    // Danh sách các khuyến mãi liên quan đến báo giá hiện tại
    const activePromotionRows = useMemo(() => {
        const rows = [];
        const seen = new Set();
        const byId = buildPromotionLookupById(availablePromotions); // Tạo lookup để tìm khuyến mãi theo id từ danh sách khuyến mãi có sẵn
        const byCode = buildPromotionLookupByCode(availablePromotions); // Tạo lookup để tìm khuyến mãi theo code từ danh sách khuyến mãi có sẵn
        // Hàm để thêm khuyến mãi vào danh sách hiển thị
        const addPromo = (promo, typeHint = '') => {
            if (!promo) return;
            const id = getPromotionId(promo); // Trích xuất id của khuyến mãi từ đối tượng khuyến mãi, 
            const code = getPromotionCode(promo); // Trích xuất code của khuyến mãi từ đối tượng khuyến mãi
            const lookupPromo = (id ? byId.get(id) : null) || (code ? byCode.get(code) : null) || promo; // Tìm khuyến mãi trong lookup theo id hoặc code
            const resolvedId = getPromotionId(lookupPromo) || id; // Giải quyết id của khuyến mãi, ưu tiên id từ lookup nếu có để đảm bảo tính nhất quán
            const resolvedCode = getPromotionCode(lookupPromo) || code; // Giải quyết code của khuyến mãi, ưu tiên code từ lookup nếu có để đảm bảo tính nhất quán
            const key = resolvedId ? `id:${resolvedId}` : resolvedCode ? `code:${resolvedCode}` : ''; // Tạo key duy nhất để tránh trùng lặp khuyến mãi trong danh sách hiển thị
            if (!key || seen.has(key)) return;
            seen.add(key);
            // Thêm khuyến mãi vào danh sách hiển thị với thông tin đã được giải quyết và nhãn hiển thị được xây dựng từ thông tin khuyến mãi
            rows.push({
                promotionId: resolvedId,
                promotionCode: resolvedCode,
                promotionType: getPromotionType(lookupPromo) || typeHint,
                label: buildPromotionDisplayLabel(lookupPromo, { includeUsageRemaining: false }) || buildPromotionLabel(lookupPromo) || resolvedCode || buildPromotionIdFallbackLabel(resolvedId),
            });
        };

        // Thêm khuyến mãi đã được áp dụng vào danh sách hiển thị
        Object.entries(appliedPromotions || {}).forEach(([type, promo]) => addPromo(promo, type));
        // Thêm khuyến mãi liên quan đến báo giá hiện tại vào danh sách hiển thị
        const estimatePromotions = Array.isArray(latestEstimate?.promotions) ? latestEstimate.promotions : [];
        // Thêm từng khuyến mãi trong danh sách khuyến mãi của báo giá vào danh sách hiển thị
        estimatePromotions.forEach((promo) => addPromo(promo));
        addPromo(latestEstimate?.promotion);
        addPromo(latestEstimate?.appliedPromotion);
        addPromo(latestEstimate?.promotionCode);
        addPromo(latestEstimate?.promoCode);
        return rows.filter((row) => row.label);
    }, [appliedPromotions, availablePromotions, latestEstimate]);
    const hasActivePromotionOnCurrentEstimate = activePromotionRows.length > 0;

    // Tính toán xem có thể bỏ áp dụng khuyến mãi khỏi báo giá hiện tại hay không
    const canUnapplyPromotionFromCurrentEstimate = Boolean(latestEstimate)
        && (isEstimateDraft || (isNewEstimateVersionPromotionLimited && isEstimateSent))
        && !isActionLocked;
    // Tính toán xem có thể bỏ áp dụng khuyến mãi khỏi một khuyến mãi cụ thể trong danh sách khuyến mãi liên quan đến báo giá hiện tại hay ko
    const canUnapplyPromotionRow = useCallback((row) => {
        if (!canUnapplyPromotionFromCurrentEstimate) return false;
        const promotionType = String(row?.promotionType || '').trim().toUpperCase();
        if (isEstimateVersionRevision && promotionType === 'BUY_X_GET_Y') return false;
        return true;
    }, [canUnapplyPromotionFromCurrentEstimate, isEstimateVersionRevision]);
    // Tính toán xem có thể áp dụng khuyến mãi mới cho báo giá hiện tại hay ko dựa trên việc có thể áp dụng khuyến mãi cho báo giá hiện tại và loại khuyến mãi đó 
    const visiblePromotionTypes = useMemo(
        () => PROMOTION_TYPES.filter(({ type }) => type === 'PERCENT'),
        [],
    );

    useEffect(() => {
        if (!hasActivePromotionOnCurrentEstimate) return;
        if (promoCodes.PERCENT || promoCodes.BUY_X_GET_Y) {
            setPromoCodes({ PERCENT: '', BUY_X_GET_Y: '' });
        }
        if (selectedPromotions.PERCENT || selectedPromotions.BUY_X_GET_Y) {
            setSelectedPromotions({ PERCENT: '', BUY_X_GET_Y: '' });
        }
    }, [
        hasActivePromotionOnCurrentEstimate,
        promoCodes.BUY_X_GET_Y,
        promoCodes.PERCENT,
        selectedPromotions.BUY_X_GET_Y,
        selectedPromotions.PERCENT,
    ]);

    // Tính toán dữ liệu để in ấn phiếu dịch vụ, bao gồm thông tin phiếu dịch vụ, thông tin kiểm tra an toàn, danh sách item của báo giá để hiển thị trên hóa đơn 
    const printTicket = useMemo(() => ({
        ...ticket,
        receivedAtDisplay,
        handoverAtDisplay,
        recommendation: printRecommendation,
        safetyInspectionEnabled: ticketRaw?.safetyInspectionEnabled,
        invoice: {
            items: printReceiptItems.map((it) => ({
                ...it,
                unitPrice: toMoneyNumber(it.unitPriceDisplay ?? it.unitPrice),
                subTotal: toMoneyNumber(it.finalPriceDisplay ?? it.subTotalDisplay ?? it.subTotal),
            })),
            subtotal: printReceiptSubtotal,
            discountAmount: printReceiptDiscountAmount,
            vatRate: '',
            vatAmount: 0,
            total: printReceiptTotal,
            promotionLabel: activePromotionLabels.join(' / '),
        },
        safetyInspection: safetyInspectionForPrint ?? ticketRaw?.safetyInspection ?? {},
        defaultCategories: defaultSafetyCategories,
    }), [
        activePromotionLabels,
        defaultSafetyCategories,
        handoverAtDisplay,
        printRecommendation,
        printReceiptItems,
        printReceiptDiscountAmount,
        printReceiptSubtotal,
        printReceiptTotal,
        receivedAtDisplay,
        safetyInspectionForPrint,
        ticket,
        ticketRaw?.safetyInspection,
        ticketRaw?.safetyInspectionEnabled,
    ]);

    // Nếu đã có hóa đơn liên quan đến phiếu dịch vụ, reset các khuyến mãi đã được áp dụng và các mã khuyến mãi đang được chỉnh sửa 
    useEffect(() => {
        if (!hasBill) return;
        if (appliedPromotionList.length > 0) setAppliedPromotions({ PERCENT: null, BUY_X_GET_Y: null });
        if (promoCodes.PERCENT || promoCodes.BUY_X_GET_Y) {
            setPromoCodes({ PERCENT: '', BUY_X_GET_Y: '' });
        }
        if (selectedPromotions.PERCENT || selectedPromotions.BUY_X_GET_Y) {
            setSelectedPromotions({ PERCENT: '', BUY_X_GET_Y: '' });
        }
    }, [
        hasBill,
        appliedPromotionList.length,
        promoCodes.BUY_X_GET_Y,
        promoCodes.PERCENT,
        selectedPromotions.BUY_X_GET_Y,
        selectedPromotions.PERCENT,
    ]);

    // Tính toán xem có đang ở trạng thái không thể chỉnh sửa phiếu kiểm tra và báo giá hay ko
    const isImmutable = Boolean(ticketRaw?.immutable ?? ticketFromState?.immutable ?? ticket?.immutable) || isActionLocked;
    // Nếu đang ở trạng thái không thể chỉnh sửa, hiển thị thông báo tương ứng dựa trên việc có phải do không phải tư vấn viên hay do phiếu dịch vụ đã được thanh toán hoặc đã có hóa đơn
    const isInspectionAndEstimateReadOnly = isActionLocked || !hasAdvisorRole;
    // Thông báo hiển thị khi phiếu kiểm tra và báo giá đang ở trạng thái chỉ đọc, nếu không phải tư vấn viên thì hiển thị thông báo về việc chỉ tư vấn viên mới được chỉnh sửa
    const inspectionAndEstimateReadOnlyMessage = !hasAdvisorRole
        ? 'Chỉ tư vấn viên mới được chỉnh sửa phần phiếu kiểm tra và báo giá. '
        : ticketStatus === 'PAID'
            ? 'Phiếu dịch vụ đã được thanh toán, không thể chỉnh sửa.'
            : 'Phiếu dịch vụ đã có hóa đơn chờ thanh toán, không thể chỉnh sửa.';
    // Các giá trị và hàm liên quan đến luồng chỉnh sửa phiếu dịch vụ
    const {
        isEditing,
        isSaving,
        editForm,
        fieldErrors,
        setCustomerRequest,
        setCustomerName,
        setCustomerPhone,
        setCustomerEmail,
        setReceivedAt,
        setSafetyInspectionEnabled,
        setVehicleModel,
        setLicensePlate,
        setOdometerKm,
        setEstimatedDeliveryAt,
        setDeliveredAt,
        toggleEdit,
        cancelEdit,
        saveEdit,
    } = useServiceTicketEditing({
        ticketCodeParam,
        isImmutable,
        ticketRaw,
        ticket,
        setTicketRaw,
        setError,
        notify,
    });
    // Tính toán giá trị hiển thị của đồng hồ công tơ mét không có thì hiển thị dấu gạch ngang
    const odometerKm = ticket?.vehicle?.odometerKm;
    const odometerDisplay =
        odometerKm == null ? '-' : `${Number(odometerKm).toLocaleString('vi-VN')} km`;

    // Tính toán danh sách ảnh của phiếu dịch vụ, ưu tiên các trường có thể có trong dữ liệu gốc, sau đó chuẩn hóa lại để sử dụng trong giao diện
    const ticketPhotos = useMemo(() => (Array.isArray(ticket?.photos) ? ticket.photos : []), [ticket?.photos]);
    const licensePlatePhotos = useMemo(
        () => ticketPhotos.filter((p) => String(p?.category || '').toUpperCase() === 'LICENSE_PLATE'),
        [ticketPhotos],
    );

    // Hàm để khôi phục trạng thái của báo giá khi đang trong luồng thêm dịch vụ bị gián đoạn
    //  Dựa trên snapshot đã lưu trữ trước đó và so sánh với báo giá mới nhất hiện tại để xác định xem có phải cùng một báo giá hay ko
    // Sau đó khôi phục trạng thái của báo giá và phiếu dịch vụ nếu cần thiết
    const restoreInterruptedAddServiceEstimate = useCallback(
        async (latest, token) => {
            if (!latest || !serviceTicketIdNum) return latest;

            const snapshot = readAddServiceRestoreSnapshot(serviceTicketIdNum);
            if (!snapshot) return latest;

            // So sánh ID báo giá trong snapshot với ID báo giá hiện tại để xác định xem có phải cùng một báo giá hay không
            const latestEstimateId = getEstimateIdValue(latest);
            if (!latestEstimateId || latestEstimateId !== snapshot.estimateIdNum) {
                clearAddServiceRestoreSnapshot(serviceTicketIdNum);
                if (addServiceRevertRef.current?.estimateIdNum === snapshot.estimateIdNum) {
                    addServiceRevertRef.current = null;
                }
                return latest;
            }

            // Lưu snapshot vào ref để có thể sử dụng khi cần thiết trong luồng thêm dịch vụ
            addServiceRevertRef.current = snapshot;

            // So sánh trạng thái của báo giá hiện tại với trạng thái trước đó trong snapshot để xác định xem có cần khôi phục trạng thái hay không
            const currentStatus = normalizeEstimateStatus(latest?.estimateStatus ?? latest?.status ?? latest?.estimate_status);
            const previousStatus = normalizeEstimateStatus(snapshot.prevEstimateStatus);
            // Nếu trạng thái hiện tại không phải là DRAFT hoặc trạng thái trước đó không phải là APPROVED thì không cần khôi phục trạng thái, chỉ cần xóa snapshot và ref liên quan
            if (currentStatus !== 'DRAFT') {
                clearAddServiceRestoreSnapshot(serviceTicketIdNum);
                addServiceRevertRef.current = null;
                return latest;
            }
            if (previousStatus !== 'APPROVED') return latest;

            // So sánh các item của báo giá hiện tại với các item trong snapshot để xác định xem có cần khôi phục trạng thái hay không
            const hasNoSavedItemChange = hasSameStringSet(getActiveEstimateItemKeys(latest), snapshot.activeItemKeys);
            // Nếu không có thay đổi nào về item đã được lưu trữ trong snapshot thì không cần khôi phục trạng thái
            if (!hasNoSavedItemChange) {
                globalThis.setTimeout?.(() => {
                    try {
                        globalThis.dispatchEvent(new CustomEvent('startAppendEstimate'));
                    } catch {
                        // ignore if unavailable
                    }
                }, 0);
                return latest;
            }

            // Nếu cần khôi phục trạng thái, gọi API để khôi phục trạng thái của báo giá và phiếu dịch vụ về trạng thái trước đó trong snapshot
            try {
                const previousTicketStatus = normalizeTicketStatus(snapshot.prevTicketStatus);
                // Nếu trạng thái của phiếu dịch vụ trước đó có sự khác biệt so với trạng thái hiện tại, thì khôi phục trạng thái của phiếu dịch vụ về trạng thái trước đó
                if (previousTicketStatus) {
                    await manageServiceTicketStatus(serviceTicketIdNum, previousTicketStatus, token);
                }
                await manageServiceTicketEstimateStatus(latestEstimateId, previousStatus, token);

                clearAddServiceRestoreSnapshot(serviceTicketIdNum);
                addServiceRevertRef.current = null;

                const code = String(ticket?.ticketCode || ticketCodeParam || snapshot.ticketCode || '').trim();
                if (code) {
                    try {
                        const detailRes = await fetchServiceTicketDetail(code, token);
                        if (detailRes?.data) setTicketRaw(detailRes.data);
                    } catch {
                        // The estimate status is restored even if detail refresh fails.
                    }
                }

                return { ...latest, status: previousStatus, estimateStatus: previousStatus };
            } catch {
                return latest;
            }
        },
        [serviceTicketIdNum, setTicketRaw, ticket?.ticketCode, ticketCodeParam],
    );

    const loadLatestEstimate = useCallback(async () => {
        if (ticketCodeParam === 'demo') {
            setLatestEstimate({
                estimateId: 12345,
                estimateCode: 'EST-99999-01',
                version: 1,
                status: 'DRAFT',
                estimateStatus: 'DRAFT',
                totalAmount: 4300000,
                subTotal: 4500000,
                discountAmount: 400000,
                taxAmount: 200000,
                items: [
                    {
                        estimateItemId: 101,
                        itemName: 'Lốp Michelin 205/55R16 Primacy 4',
                        quantity: 2,
                        unitPrice: 2000000,
                        subTotal: 4000000,
                        discountAmount: 200000,
                        appliedTaxRate: 10,
                        taxAmount: 380000,
                        finalPrice: 3800000,
                        finalPriceDisplay: 3800000,
                        isGift: false,
                        stockAllocationStatus: 'ALLOCATED',
                        warehouseName: 'Kho chính',
                        workCategory: { categoryName: 'Thay lốp' }
                    },
                    {
                        estimateItemId: 102,
                        itemName: 'Cân chỉnh độ chụm bánh xe (Alignment)',
                        quantity: 1,
                        unitPrice: 500000,
                        subTotal: 500000,
                        discountAmount: 0,
                        appliedTaxRate: 10,
                        taxAmount: 50000,
                        finalPrice: 500000,
                        finalPriceDisplay: 500000,
                        isGift: false,
                        stockAllocationStatus: 'COMPLETED',
                        warehouseName: '',
                        workCategory: { categoryName: 'Cân chỉnh góc đặt bánh xe' }
                    },
                    {
                        estimateItemId: 103,
                        itemName: 'Nước rửa kính Michelin (Quà tặng)',
                        quantity: 1,
                        unitPrice: 150000,
                        subTotal: 150000,
                        discountAmount: 150000,
                        appliedTaxRate: 0,
                        taxAmount: 0,
                        finalPrice: 0,
                        finalPriceDisplay: 0,
                        isGift: true,
                        stockAllocationStatus: 'ALLOCATED',
                        warehouseName: 'Kho phụ',
                        workCategory: { categoryName: 'Quà tặng' }
                    }
                ],
                appliedPromotions: {
                    PERCENT: {
                        promotionId: 10,
                        promotionCode: 'KM10',
                        promotionType: 'PERCENT',
                        discountValue: 10,
                        maxValue: 500000,
                        description: 'Giảm 10% tổng hóa đơn, tối đa 500K'
                    }
                }
            });
            setEstimateLoading(false);
            return;
        }
        const token = localStorage.getItem('authToken');
        if (!token) return;
        if (!serviceTicketIdNum) return;

        const seq = ++estimateLoadSeqRef.current;
        try {
            setEstimateLoading(true);
            const estimateRes = await fetchServiceTicketEstimate(serviceTicketIdNum, token);
            if (estimateLoadSeqRef.current !== seq) return;
            const latest = await restoreInterruptedAddServiceEstimate(pickLatestEstimate(estimateRes?.data), token);
            setLatestEstimate((prev) => {
                if (!latest) return null;
                const next = prev ? { ...prev, ...latest } : { ...latest };
                // Some APIs/paths may return estimate meta without `items`.
                // Keep previous items to avoid flicker/hiding actions like "Xác nhận báo giá".
                if (!Array.isArray(latest?.items) && Array.isArray(prev?.items)) {
                    next.items = prev.items;
                }
                return next;
            });
        } catch {
            if (estimateLoadSeqRef.current !== seq) return;
            setLatestEstimate(null);
        } finally {
            if (estimateLoadSeqRef.current === seq) setEstimateLoading(false);
        }
    }, [restoreInterruptedAddServiceEstimate, serviceTicketIdNum, ticketCodeParam]);

    const refreshDetailView = useCallback(async (options = {}) => {
        const {
            refreshEstimate = true,
            refreshBill = false,
            refreshAdvisor = refreshEstimate,
        } = options;
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        const ticketCode = String(ticket?.ticketCode || ticketCodeParam || '').trim();
        const tasks = [];

        if (token && ticketCode) {
            tasks.push(
                fetchServiceTicketDetail(ticketCode, token)
                    .then((detailRes) => {
                        if (detailRes?.data) setTicketRaw(detailRes.data);
                    })
                    .catch(() => null),
            );
        }

        if (refreshEstimate) {
            tasks.push(loadLatestEstimate());
        }

        if (refreshBill && token && serviceTicketIdNum) {
            tasks.push(
                fetchPaymentByServiceTicketId(serviceTicketIdNum, token)
                    .then((res) => {
                        setBillPayment(res?.data ?? res ?? null);
                        setBillLookupError('');
                    })
                    .catch((err) => {
                        const message = String(err?.message || '').toLowerCase();
                        const isNotFound = message.includes('not found')
                            || message.includes('404')
                            || message.includes('không tìm thấy')
                            || message.includes('khong tim thay');
                        if (isNotFound) {
                            setBillPayment(null);
                            setBillLookupError('');
                        }
                    }),
            );
        }

        if (tasks.length > 0) {
            await Promise.allSettled(tasks);
        }
        if (refreshAdvisor) triggerRefresh();
        renderPageSoon();
    }, [loadLatestEstimate, renderPageSoon, serviceTicketIdNum, setTicketRaw, ticket?.ticketCode, ticketCodeParam, triggerRefresh]);

    useEffect(() => {
        loadLatestEstimate();
    }, [loadLatestEstimate]);

    // Load assignments to check technician before allowing receipt creation
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        if (!serviceTicketIdNum) return;

        if (ticketCodeParam === 'demo') {
            setAssignments([
                { staffId: 1, fullName: 'Kỹ thuật viên A', roleInTicket: 'TECHNICIAN', status: 'ACTIVE' }
            ]);
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                setAssignmentsLoading(true);
                const res = await fetchTicketAssignments(serviceTicketIdNum, token);
                if (cancelled) return;
                setAssignments(Array.isArray(res?.data) ? res.data : []);
            } catch {
                if (cancelled) return;
                setAssignments([]);
            } finally {
                if (!cancelled) setAssignmentsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [serviceTicketIdNum, ticketCodeParam]);

    const hasTechnician = useMemo(() => {
        if (assignmentsLoading) return true;
        return assignments.some(
            (a) =>
                String(a?.roleInTicket || a?.role || '').toUpperCase() === 'TECHNICIAN'
                && String(a?.status || '').toUpperCase() !== 'CANCELLED',
        );
    }, [assignments, assignmentsLoading]);
    const advisorReadOnlyWithoutTechnician = isAdvisorOnlyViewRole && !assignmentsLoading && !hasTechnician;

    const canRequestPayment = ticketStatus === 'COMPLETED' && !assignmentsLoading && !isActionLocked && isEstimateApproved;
    const canBookMaintenance = hasAdvisorRole && ticketStatus === 'COMPLETED' && !isActionLocked && isEstimateApproved;

    const handleBack = () => navigate(-1);

    const handleGoToWarehouseIssues = useCallback(() => {
        navigate('/warehouse-stock-issues', {
            state: {
                serviceTicketId: serviceTicketIdNum,
                ticketCode: ticket?.ticketCode || ticketCodeParam,
            },
        });
    }, [navigate, serviceTicketIdNum, ticket?.ticketCode, ticketCodeParam]);

    const handleGoToReceiptPayment = useCallback(() => {
        const code = String(ticket?.ticketCode || ticketCodeParam || '').trim();
        if (!code) {
            notify('Thiếu mã phiếu dịch vụ để mở màn hình thanh toán.');
            return;
        }
        navigate(`/service-ticket/${encodeURIComponent(code)}/receipt-payment-method`, {
            state: { ticket: ticketRaw ?? ticket, serviceTicketId: serviceTicketIdNum },
        });
    }, [navigate, notify, serviceTicketIdNum, ticket, ticketCodeParam, ticketRaw]);

    const handleUpdateTicketStatus = async (nextStatus, fallbackSuccessMessage) => {
        if (statusUpdating) return;

        if (isActionLocked) {
            notify('Phiếu dịch vụ đã có hóa đơn, không thể thay đổi trạng thái hoặc thao tác thêm.');
            return;
        }

        const token = localStorage.getItem('authToken');
        if (!token) {
            notify('Vui lòng đăng nhập để cập nhật trạng thái phiếu dịch vụ.');
            return;
        }

        if (!serviceTicketIdNum) {
            notify('Thiếu serviceTicketId hợp lệ để cập nhật trạng thái.');
            return;
        }

        const ticketCode = String(ticket.ticketCode || ticketCodeParam || '').trim();
        if (!ticketCode) {
            notify('Thiếu mã phiếu dịch vụ để tải lại sau khi cập nhật trạng thái.');
            return;
        }

        try {
            setStatusUpdating(true);
            setError('');
            const res = await manageServiceTicketStatus(serviceTicketIdNum, nextStatus, token);

            const detailRes = await fetchServiceTicketDetail(ticketCode, token);
            setTicketRaw(detailRes?.data ?? ticketRaw ?? null);

            await refreshDetailView({ refreshEstimate: true, refreshBill: true });
            notify(res?.message || fallbackSuccessMessage || `Đã cập nhật trạng thái: ${nextStatus}`);
        } catch (err) {
            notify(err?.message || 'Không thể cập nhật trạng thái phiếu dịch vụ.');
        } finally {
            setStatusUpdating(false);
        }
    };

    const handleCancelTicket = async () => {
        if (statusUpdating) return;

        const token = localStorage.getItem('authToken');
        if (!token) {
            notify('Vui lòng đăng nhập để hủy phiếu dịch vụ.');
            return;
        }

        try {
            if (estimateIdNum) {
                await manageServiceTicketEstimateStatus(estimateIdNum, 'CANCELLED', token);
                setLatestEstimate((prev) => (prev ? { ...prev, status: 'CANCELLED', estimateStatus: 'CANCELLED' } : prev));
            }
        } catch (err) {
            notify(err?.message || 'Không thể cập nhật trạng thái báo giá.');
        }

        await handleUpdateTicketStatus('CANCELLED', 'Đã hủy phiếu dịch vụ.');
    };

    const handleStartRepair = async () => {
        if (!estimateIdNum) {
            notify('Chưa có báo giá hợp lệ. Vui lòng tạo và xác nhận báo giá trước khi tiến hành sửa chữa.');
            return;
        }
        if (!isEstimateApproved) {
            notify('Vui lòng xác nhận báo giá trước khi tiến hành sửa chữa.');
            return;
        }

        await handleUpdateTicketStatus('REPAIRING', 'Đã chuyển sang trạng thái "Tiến hành sửa chữa".');
        navigate('/advisor/inspection');
    };

    const handleCompleteRepair = async () => {
        if (statusUpdating) return;

        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        if (!token) {
            notify('Vui lòng đăng nhập để báo hoàn thành.');
            return;
        }

        const ticketCode = String(ticket.ticketCode || ticketCodeParam || '').trim();
        if (!ticketCode) {
            notify('Thiếu mã phiếu dịch vụ.');
            return;
        }

        try {
            setStatusUpdating(true);
            await finishWork(ticketCode, token);

            const detailRes = await fetchServiceTicketDetail(ticketCode, token);
            setTicketRaw(detailRes?.data ?? ticketRaw ?? null);
            await refreshDetailView({ refreshEstimate: true, refreshBill: true });
            notify('Đã chuyển sang trạng thái "Hoàn tất sửa chữa".');
        } catch (err) {
            notify(getFinishWorkErrorMessage(err, 'Không thể báo hoàn thành sửa chữa.'));
        } finally {
            setStatusUpdating(false);
        }
    };

    const handleCancelAppendOnly = useCallback(async () => {
        if (addServiceReverting) return;
        const snapshot = addServiceRevertRef.current;
        // Only revert if we have a snapshot (i.e. this edit session came from "Thêm dịch vụ").
        if (!snapshot) return;

        const token = localStorage.getItem('authToken');
        if (!token) {
            notify('Vui lòng đăng nhập để cập nhật trạng thái phiếu dịch vụ.');
            return;
        }
        if (!serviceTicketIdNum) {
            notify('Thiếu serviceTicketId hợp lệ để cập nhật trạng thái.');
            return;
        }

        const ticketCode = String(ticket.ticketCode || ticketCodeParam || '').trim();
        if (!ticketCode) {
            notify('Thiếu mã phiếu dịch vụ để tải lại sau khi cập nhật trạng thái.');
            return;
        }

        try {
            setAddServiceReverting(true);

            const prevTicketStatus = String(snapshot.prevTicketStatus || '').trim().toUpperCase();
            if (prevTicketStatus) {
                await manageServiceTicketStatus(serviceTicketIdNum, prevTicketStatus, token);
            }

            const prevEstimateStatus = String(snapshot.prevEstimateStatus || '').trim().toUpperCase();
            if (snapshot.estimateIdNum && prevEstimateStatus) {
                await manageServiceTicketEstimateStatus(snapshot.estimateIdNum, prevEstimateStatus, token);
                setLatestEstimate((prev) => prev ? { ...prev, status: prevEstimateStatus, estimateStatus: prevEstimateStatus } : prev);
            }

            const detailRes = await fetchServiceTicketDetail(ticketCode, token);
            setTicketRaw(detailRes?.data ?? ticketRaw ?? null);

            notify('Đã hoàn tác trạng thái trước khi thêm dịch vụ.');
        } catch (err) {
            notify(err?.message || 'Không thể hoàn tác trạng thái.');
        } finally {
            addServiceRevertRef.current = null;
            clearAddServiceRestoreSnapshot(serviceTicketIdNum);
            setAddServiceReverting(false);
            await refreshDetailView({ refreshEstimate: true, refreshBill: true });
        }
    }, [addServiceReverting, notify, refreshDetailView, serviceTicketIdNum, setTicketRaw, ticket, ticketCodeParam, ticketRaw]);

    const handleRestartFromArchived = async () => {
        if (statusUpdating) return;
        const token = localStorage.getItem('authToken');
        if (!token) {
            notify('Vui lòng đăng nhập để cập nhật trạng thái phiếu dịch vụ.');
            throw new Error('No auth token');
        }

        if (!serviceTicketIdNum) {
            notify('Thiếu serviceTicketId hợp lệ để bắt đầu báo giá mới.');
            throw new Error('Missing serviceTicketId');
        }

        try {
            setStatusUpdating(true);
            // Starting a new estimate/version should not be treated as append-only.
            addServiceRevertRef.current = null;
            clearAddServiceRestoreSnapshot(serviceTicketIdNum);
            // Snapshot current ticket status so Cancel during "create new estimate version" can revert.
            if (!createNewEstimateRevertRef.current) {
                createNewEstimateRevertRef.current = { prevTicketStatus: ticketStatus };
            }
            setIsCreatingNewEstimateVersion(true);
            // Simplified rule: "Tạo bản báo giá mới" always brings ticket to ESTIMATED.
            await manageServiceTicketStatus(serviceTicketIdNum, 'ESTIMATED', token);

            const ticketCode = String(ticket.ticketCode || ticketCodeParam || '').trim();
            const detailRes = await fetchServiceTicketDetail(ticketCode, token);
            setTicketRaw(detailRes?.data ?? ticketRaw ?? null);

            await refreshDetailView({ refreshEstimate: false, refreshBill: true, refreshAdvisor: false });
            await refreshAvailablePromotions(token);
            // Notify advisor table to open create mode immediately
            try {
                globalThis.dispatchEvent(new CustomEvent('startCreateEstimate'));
            } catch {
                // ignore if unavailable
            }
            notify('Đã chuyển phiếu dịch vụ về trạng thái để bắt đầu báo giá mới.');
        } catch (err) {
            notify(err?.message || 'Không thể chuyển trạng thái phiếu dịch vụ để bắt đầu báo giá mới.');
            createNewEstimateRevertRef.current = null;
            setIsCreatingNewEstimateVersion(false);
            throw err;
        } finally {
            setStatusUpdating(false);
        }
    };

    const handleCancelCreateNewEstimateVersion = useCallback(async () => {
        const snapshot = createNewEstimateRevertRef.current;
        if (!snapshot?.prevTicketStatus) {
            setIsCreatingNewEstimateVersion(false);
            return;
        }

        const token = localStorage.getItem('authToken');
        if (!token) {
            notify('Vui lòng đăng nhập để cập nhật trạng thái phiếu dịch vụ.');
            return;
        }
        if (!serviceTicketIdNum) {
            notify('Thiếu serviceTicketId hợp lệ để cập nhật trạng thái.');
            return;
        }

        const code = String(ticket.ticketCode || ticketCodeParam || '').trim();
        if (!code) {
            notify('Thiếu mã phiếu dịch vụ để tải lại sau khi cập nhật trạng thái.');
            return;
        }

        try {
            setStatusUpdating(true);
            const prev = String(snapshot.prevTicketStatus || '').trim().toUpperCase();
            if (prev) {
                await manageServiceTicketStatus(serviceTicketIdNum, prev, token);
            }

            const promotionRefsToRestore = Array.isArray(snapshot?.promotionRefsToRestore)
                ? snapshot.promotionRefsToRestore
                : [];
            if (promotionRefsToRestore.length > 0 && estimateIdNum) {
                setPromoApplying(true);
                try {
                    for (const ref of promotionRefsToRestore) {
                        if (!ref?.promotionId || !ref?.promotionCode) continue;
                        await applyPromotionToEstimate(ref.promotionId, estimateIdNum, ref.promotionCode, token);
                    }
                } finally {
                    setPromoApplying(false);
                }
            }

            const detailRes = await fetchServiceTicketDetail(code, token);
            setTicketRaw(detailRes?.data ?? ticketRaw ?? null);
            await refreshDetailView({ refreshEstimate: true, refreshBill: true });
            await refreshAvailablePromotions(token);
            notify('Đã hoàn tác trạng thái phiếu dịch vụ trước khi tạo báo giá mới.');
        } catch (err) {
            notify(err?.message || 'Không thể hoàn tác trạng thái phiếu dịch vụ.');
        } finally {
            createNewEstimateRevertRef.current = null;
            setIsCreatingNewEstimateVersion(false);
            setStatusUpdating(false);
        }
    }, [estimateIdNum, notify, refreshDetailView, serviceTicketIdNum, setTicketRaw, ticket, ticketCodeParam, ticketRaw]);

    const handleOpenEstimateTimePopup = () => {
        setEstimateTimePopupOpen(true);
    };

    const revertEstimateToDraftSilently = useCallback(async (token) => {
        if (!estimateIdNum) return;
        try {
            await manageServiceTicketEstimateStatus(estimateIdNum, 'DRAFT', token);
        } catch {
            // ignore
        }
        setLatestEstimate((prev) => (prev ? { ...prev, status: 'DRAFT', estimateStatus: 'DRAFT' } : prev));
    }, [estimateIdNum]);

    const ensureStockAllocationAfterConfirm = useCallback(async ({ token, shouldUpdateExistingAllocations }) => {
        if (!estimateIdNum) return;

        try {
            if (shouldUpdateExistingAllocations) {
                // Backend expects the full snapshot of allocations; missing rows can be treated as deleted.
                // New API: GET stock-allocation-get returns rows in shape { estimateItemDto, stockAllocationDto }.
                // We must send all warehouse-related items back; items without allocation send allocationId: null.
                try {
                    let currentEstimateItems = Array.isArray(latestEstimate?.items) ? latestEstimate.items : [];
                    try {
                        const estimateRes = await fetchServiceTicketEstimate(serviceTicketIdNum, token);
                        const list = Array.isArray(estimateRes?.data) ? estimateRes.data : [];
                        const found =
                            list.find((row) => getEstimateIdValue(row) === Number(estimateIdNum)) ||
                            pickLatestEstimate(list);
                        if (Array.isArray(found?.items)) {
                            currentEstimateItems = found.items;
                            setLatestEstimate((prev) => {
                                if (!prev) return found;
                                return { ...prev, ...found, items: found.items };
                            });
                        }
                    } catch {
                        // keep current estimate items from state
                    }

                    const allocationRes = await fetchEstimateStockAllocations(estimateIdNum, token);
                    const rows = Array.isArray(allocationRes?.data) ? allocationRes.data : [];
                    debugEstimateAllocation('stock-allocation-snapshot', {
                        estimateId: estimateIdNum,
                        serviceTicketId: serviceTicketIdNum,
                        rows,
                    });

                    const fallbackByEstimateItemId = new Map(
                        currentEstimateItems
                            .map((it) => {
                                const id = toPositiveNumberOrNull(it?.estimateItemId ?? it?.estimateItemID ?? it?.id);
                                return id ? [id, it] : null;
                            })
                            .filter(Boolean),
                    );

                    const payload = rows
                        .map((row) => {
                            const estimateItem = row?.estimateItemDto ?? null;
                            const stockAlloc = row?.stockAllocationDto ?? null;

                            const estimateItemId = toPositiveNumberOrNull(
                                estimateItem?.estimateItemId ?? estimateItem?.estimateItemID ?? estimateItem?.id,
                            );

                            const revisedFromItemId = toPositiveNumberOrNull(estimateItem?.revisedFromItemId);
                            const fallbackItem =
                                (estimateItemId ? fallbackByEstimateItemId.get(estimateItemId) : null) ||
                                (revisedFromItemId ? fallbackByEstimateItemId.get(revisedFromItemId) : null) ||
                                null;

                            const warehouseId = toPositiveNumberOrNull(
                                stockAlloc?.warehouseId ??
                                    estimateItem?.warehouseId ??
                                    estimateItem?.warehouseID ??
                                    estimateItem?.warehouse_id ??
                                    fallbackItem?.warehouseId ??
                                    fallbackItem?.warehouseID ??
                                    fallbackItem?.warehouse_id ??
                                    fallbackItem?.warehouse?.warehouseId ??
                                    fallbackItem?.warehouse?.id,
                            );

                            // Rows without a warehouse cannot be allocated (typically service lines).
                            if (!estimateItemId || !warehouseId) return null;

                            const itemId = toPositiveNumberOrNull(
                                stockAlloc?.itemId ??
                                    estimateItem?.itemId ??
                                    estimateItem?.catalogItemId ??
                                    estimateItem?.serviceItemId ??
                                    estimateItem?.productId ??
                                    fallbackItem?.itemId ??
                                    fallbackItem?.catalogItemId ??
                                    fallbackItem?.serviceItemId ??
                                    fallbackItem?.productId,
                            );
                            const quantity = toPositiveNumberOrNull(
                                estimateItem?.quantity ?? stockAlloc?.quantity ?? fallbackItem?.quantity,
                            );
                            if (!itemId || !quantity) return null;

                            const allocationIdRaw = stockAlloc?.allocationId ?? stockAlloc?.stockAllocationId ?? null;
                            const allocationId = toPositiveNumberOrNull(allocationIdRaw);

                            const createdBy = stockAlloc?.createdBy ?? null;

                            const entryItemId = toPositiveNumberOrNull(
                                stockAlloc?.entryItemId ??
                                    estimateItem?.entryItemId ??
                                    estimateItem?.entry_item_id ??
                                    fallbackItem?.entryItemId ??
                                    fallbackItem?.entry_item_id
                            );

                            return {
                                allocationId: allocationId ?? null,
                                serviceTicketId: serviceTicketIdNum,
                                estimateItemId,
                                warehouseId,
                                itemId,
                                estimateId: estimateIdNum,
                                quantity,
                                status: 'COMMITTED',
                                ...(createdBy == null ? {} : { createdBy }),
                                entryItemId: entryItemId ?? null,
                            };
                        })
                        .filter(Boolean);
                    const payloadEstimateItemIds = new Set(payload.map((item) => Number(item.estimateItemId)).filter(Boolean));
                    const missingWarehouseItemsPayload = buildStockAllocationUpdatePayload({
                        estimateId: estimateIdNum,
                        serviceTicketId: serviceTicketIdNum,
                        estimateItems: currentEstimateItems,
                    }).filter((item) => !payloadEstimateItemIds.has(Number(item.estimateItemId)));
                    const fullPayload = [...payload, ...missingWarehouseItemsPayload];

                    if (fullPayload.length > 0) {
                        await updateEstimateStockAllocation(estimateIdNum, fullPayload, token);
                    }
                    return;
                } catch {
                    // Fallback to legacy mapping from estimate items if the allocation snapshot endpoint fails.
                    // Refetch the estimate to ensure we include all existing allocations (old + new).
                    let estimateItemsForAllocation = Array.isArray(latestEstimate?.items) ? latestEstimate.items : [];
                    try {
                        const estimateRes = await fetchServiceTicketEstimate(serviceTicketIdNum, token);
                        const list = Array.isArray(estimateRes?.data) ? estimateRes.data : [];
                        const found =
                            list.find((row) => getEstimateIdValue(row) === Number(estimateIdNum)) ||
                            pickLatestEstimate(list);
                        debugEstimateAllocation('refetched-estimate-before-allocation-fallback', {
                            estimateId: estimateIdNum,
                            serviceTicketId: serviceTicketIdNum,
                            estimate: found ?? null,
                        });
                        if (Array.isArray(found?.items)) {
                            estimateItemsForAllocation = found.items;
                            setLatestEstimate((prev) => {
                                if (!prev) return prev;
                                const next = { ...prev, ...found };
                                next.items = found.items;
                                return next;
                            });
                        }
                    } catch {
                        // keep fallback to latestEstimate.items
                    }
                    const payload = buildStockAllocationUpdatePayload({
                        estimateId: estimateIdNum,
                        serviceTicketId: serviceTicketIdNum,
                        estimateItems: estimateItemsForAllocation,
                    });
                    if (payload.length > 0) {
                        await updateEstimateStockAllocation(estimateIdNum, payload, token);
                    }
                    return;
                }
            }

            await allocateEstimateStock(estimateIdNum, token);
        } catch (err) {
            await revertEstimateToDraftSilently(token);
            throw err;
        }
    }, [estimateIdNum, latestEstimate?.items, revertEstimateToDraftSilently, serviceTicketIdNum]);

    /**
     * Luồng xác nhận báo giá (confirm estimate).
     * - Đồng bộ giữ chỗ vật tư: gọi `ensureStockAllocationAfterConfirm` để quyết định
     * - Reload dữ liệu chi tiết và kích hoạt refresh UI
     * Gọi khi người dùng bấm "Xác nhận báo giá" hoặc khi submit popup thời gian.
     */
    const executeConfirmEstimate = async (estimatedAt = '') => {
        // Kiểm tra điều kiện (estimate tồn tại, đã login, có item hợp lệ...)
        if (estimateLoading) return;
        if (!estimateIdNum) {
            notify('Chưa có báo giá hợp lệ để xác nhận.');
            return;
        }
        if (isEstimateApproved) {
            notify('Báo giá đã được xác nhận trước đó.');
            return;
        }

        const token = localStorage.getItem('authToken');
        if (!token) {
            notify('Vui lòng đăng nhập để xác nhận báo giá.');
            return;
        }


        const ticketCode = String(ticket.ticketCode || ticketCodeParam || '').trim();
        if (!ticketCode) {
            notify('Thiếu mã phiếu dịch vụ.');
            return;
        }

        const rawItems = Array.isArray(latestEstimate?.items) ? latestEstimate.items : [];
        const activeItems = rawItems.filter((it) => !it?.isRemoved);
        if (activeItems.length === 0) {
            notify('Báo giá không có hạng mục hợp lệ để xác nhận.');
            return;
        }


        try {
            setEstimateLoading(true);

            if (estimatedAt) {
                const estimatedDeliveryAt = formatEstimatedDeliveryAtForApi(estimatedAt);
                if (!estimatedDeliveryAt) {
                    notify('Thời gian ước tính không hợp lệ.');
                    return;
                }
                // Cập nhật thời gian ước tính nếu được truyền vào
                await updateServiceTicketEstimatedDelivery(ticketCode, estimatedDeliveryAt, token);
                setEstimatedTimeDraft(estimatedAt);
            }

            await manageServiceTicketStatus(serviceTicketIdNum, 'ESTIMATED', token);
            await manageServiceTicketEstimateStatus(estimateIdNum, 'APPROVED', token);
            // Đổi trạng thái ticket/estimate trên backend (ESTIMATED, APPROVED)
            setLatestEstimate((prev) => (prev ? { ...prev, status: 'APPROVED', estimateStatus: 'APPROVED' } : prev));

            // Giữ chỗ vật tư:
            // - Báo giá mới / version mới: POST allocateEstimateStock
            // - Thêm dịch vụ (append-only) và xác nhận lại: PUT stock-allocation/update
            const appendSnapshot = addServiceRevertRef.current;
            const snapshotEstimateId = toPositiveNumberOrNull(appendSnapshot?.estimateIdNum);
            const snapshotPrevStatus = normalizeEstimateStatus(appendSnapshot?.prevEstimateStatus);
            const isAppendOnlyConfirm =
                !isCreatingNewEstimateVersion &&
                snapshotEstimateId != null &&
                snapshotEstimateId === estimateIdNum &&
                snapshotPrevStatus === 'APPROVED';

            // Mọi mục trong báo giá đều có trạng thái trả hàng - returnStatus khác null),
            // thì ko  gọi hàm cập nhật (vì không có thay đổi nào về việc giữ hàng mới).
            const anyEstimateItemMissingReturnStatus = Array.isArray(latestEstimate?.items)
                ? latestEstimate.items
                      .filter((it) => !getEstimateItemGiftFlag(it))
                      .some((it) => {
                          const rawReturnStatus =
                              it?.stockAllocation?.returnStatus ??
                              it?.allocation?.returnStatus ??
                              it?.warehouseAllocation?.returnStatus ??
                              it?.returnStatus ??
                              it?.stock_allocation_return_status ??
                              null;
                          return rawReturnStatus == null || String(rawReturnStatus).trim() === '';
                      })
                : true; 

            await ensureStockAllocationAfterConfirm({
                token,
                // Chỉ thực hiện cập nhật khi
                // Phiếu dịch vụ này đã có các stock allocation trước đó (reserved/committed)
                // Và có ít nhất một item trong báo giá chưa có trạng thái trả hàng (returnStatus) 
                shouldUpdateExistingAllocations: isAppendOnlyConfirm || (hasAnyStockAllocation && anyEstimateItemMissingReturnStatus),
            });

            const detailRes = await fetchServiceTicketDetail(ticketCode, token);
            if (detailRes?.data) setTicketRaw(detailRes.data);

            await refreshDetailView({ refreshEstimate: true, refreshBill: true });
            notify('Đã xác nhận báo giá.');

            // End "create new estimate version" flow after confirming.
            createNewEstimateRevertRef.current = null;
            setIsCreatingNewEstimateVersion(false);

            // End "Thêm dịch vụ" append-only flow after confirming.
            addServiceRevertRef.current = null;
            clearAddServiceRestoreSnapshot(serviceTicketIdNum);
        } catch (err) {
            notify(err?.message || 'Không thể xác nhận báo giá.');
        } finally {
            setEstimateLoading(false);
        }
    };

    const handleSubmitEstimateTime = async ({ estimatedAt }) => {
        setEstimateTimePopupOpen(false);
        await executeConfirmEstimate(estimatedAt);
    };

    const reservedAllocationCount = Number(ticket?.reservedAllocationCount ?? 0);
    const committedAllocationCount = Number(ticket?.committedAllocationCount ?? 0);
    const hasAnyStockAllocation = reservedAllocationCount > 0 || committedAllocationCount > 0;

    const advisorItems = useMemo(() => Array.isArray(latestEstimate?.items) ? latestEstimate.items.filter(it => !it?.isRemoved) : [], [latestEstimate]);
    const actionableAdvisorItems = useMemo(
        () => advisorItems.filter(isEstimateItemAvailableForActions),
        [advisorItems],
    );
    const hasAnyActionableAdvisorItem = actionableAdvisorItems.length > 0;
    const hasAnyWarehouseDependentItem = useMemo(
        () => actionableAdvisorItems.some((it) => getEstimateItemWarehouseId(it) != null),
        [actionableAdvisorItems],
    );

    const canCancel =
        ['CREATED', 'INSPECTING', 'PENDING', 'INSPECTED', 'ESTIMATED', 'REPAIRING'].includes(ticketStatus)
        && !hasAnyStockAllocation
        && !isActionLocked;
    const canStartRepair = (ticketStatus === 'ESTIMATED' || ticketStatus === 'PENDING')
        && Boolean(estimateIdNum)
        && isEstimateApproved
        && hasAnyActionableAdvisorItem
        && (ticket?.warehouseReadyForRepair === true || !hasAnyWarehouseDependentItem)
        && !isActionLocked;
    
    const allEstimateItemsAreReturned = useMemo(() => {
        const items = Array.isArray(receiptItems) ? receiptItems : [];
        if (items.length === 0) return false;
        return items.every((item) => isReturnedItem(item));
    }, [receiptItems]);
    
    const hasPendingWarehouseReturnApproval = useMemo(
        () => hasPendingReturnApproval(latestEstimate?.items),
        [latestEstimate?.items],
    );
    
    const canCompleteRepair = ticketStatus === 'REPAIRING'
        && !isActionLocked
        && ticket?.hasDraftStockIssue === false
        && !hasPendingWarehouseReturnApproval
        && !allEstimateItemsAreReturned
        && isEstimateApproved;
    const canOpenReceiptPayment = hasAccountantRole && hasBill;

    const hasAnyRequestableWarehouseDependentItem = useMemo(
        () => actionableAdvisorItems.some((it) => getEstimateItemWarehouseId(it) != null),
        [actionableAdvisorItems],
    );
    const canOpenWarehouseIssues =
        hasWarehouseKeeperRole &&
        ticket?.hasDraftStockIssue === true &&
        hasAnyRequestableWarehouseDependentItem;

    const canRequestStockIssue = useMemo(() => {
        if (isActionLocked) return false;
        if (ticketStatus !== 'ESTIMATED' && ticketStatus !== 'REPAIRING' ) return false;
        if (!hasAnyRequestableWarehouseDependentItem) return false;
        if (!isEstimateApproved) return false;
        return ticket?.canRequestIssueDraft === true;
    }, [hasAnyRequestableWarehouseDependentItem, isActionLocked, isEstimateApproved, ticketStatus, ticket?.canRequestIssueDraft]);

    /**
     * Tạo yêu cầu xuất kho cho phiếu dịch vụ hiện tại.
     * Bấm nút yêu cầu xuất kho
     */
    const handleRequestStockIssue = useCallback(async () => {
        // Kiểm tra quyền/điều kiện (token, serviceTicketId, không có lock do hoá đơn)
        if (stockIssueRequesting) return;
        if (isActionLocked) {
            notify('Phiếu dịch vụ đã có hóa đơn, không thể yêu cầu xuất kho.');
            return;
        }
        if (!serviceTicketIdNum) {
            notify('Thiếu serviceTicketId để yêu cầu xuất kho.');
            return;
        }

        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        if (!token) {
            notify('Vui lòng đăng nhập để yêu cầu xuất kho.');
            return;
        }

        setStockIssueRequesting(true);
        try {
            const response = await requestWarehouseStockIssue(serviceTicketIdNum, token); //api tạo yêu cầu xuất kho
            notify(response?.message || 'Đã tạo yêu cầu xuất kho.');

            const ticketCode = String(ticket?.ticketCode || ticketCodeParam || '').trim();
            if (ticketCode) {
                const detailRes = await fetchServiceTicketDetail(ticketCode, token);
                if (detailRes?.data) setTicketRaw(detailRes.data);
            }
            await refreshDetailView({ refreshEstimate: true, refreshBill: true });
        } catch (err) {
            notify(err?.message || 'Không thể tạo yêu cầu xuất kho.');
        } finally {
            setStockIssueRequesting(false);
        }
    }, [
        isActionLocked,
        notify,
        serviceTicketIdNum,
        stockIssueRequesting,
        ticket?.ticketCode,
        ticketCodeParam,
        setTicketRaw,
        refreshDetailView,
    ]);

    const hasAnyAdvisorItem = actionableAdvisorItems.length > 0;

    const selectedServiceItems = useMemo(
        () => (Array.isArray(ticket.services) ? ticket.services : []).filter((item) => normalizeTicketItemType(item) === 'SERVICE'),
        [ticket.services],
    );
    const selectedPartItems = useMemo(
        () => (Array.isArray(ticket.services) ? ticket.services : []).filter((item) => normalizeTicketItemType(item) === 'PART'),
        [ticket.services],
    );
    // A saved estimate should be considered persisted as soon as the backend returns an estimateId.
    // New version responses may lag on createdAt metadata, but the action row must become usable immediately.
    const isEstimatePersisted = Boolean(estimateIdNum);
    const canPrintServiceReceipt = Boolean(estimateIdNum)
        && (estimateStatus === 'DRAFT' || estimateStatus === 'SENT')
        && hasAnyAdvisorItem
        && isEstimatePersisted
        && !hasPendingWarehouseReturnApproval
        && !shouldHideEstimateUntilInspectionDone
        && !isEstimateEditing
        && !isActionLocked;
    const canConfirmEstimate = Boolean(estimateIdNum)
        && estimateStatus === 'SENT'
        && (ticketStatus === 'CREATED'
            || ticketStatus === 'INSPECTING'
            || ticketStatus === 'INSPECTED'
            || ticketStatus === 'ESTIMATED'
            || ticketStatus === 'PENDING'
            || ticketStatus === 'REPAIRING')
        && hasAnyAdvisorItem
        && isEstimatePersisted
        && !shouldHideEstimateUntilInspectionDone
        && !isEstimateEditing
        && !isActionLocked;
    const handleEstimateStatusChange = useCallback((est) => {
        const nextEstimateId = getEstimateIdValue(est);
        const nextEstimateStatus = normalizeEstimateStatus(est?.estimateStatus ?? est?.status ?? est?.estimate_status);
        const optimisticEstimateStatus =
            nextEstimateStatus || (isCreatingNewEstimateVersion && nextEstimateId ? 'DRAFT' : '');

        setLatestEstimate((prev) => {
            if (!est) return null;
            const next = prev ? { ...prev, ...est } : { ...est };
            if (optimisticEstimateStatus) {
                next.status = optimisticEstimateStatus;
                next.estimateStatus = optimisticEstimateStatus;
            }
            if (nextEstimateId && !getEstimateIdValue(next)) {
                next.estimateId = nextEstimateId;
            }
            // Some update APIs may return estimate meta without items.
            // Keep previous items temporarily to avoid disabling confirm button,
            // then trigger a refetch to sync the real latest estimate.
            if (!Array.isArray(est?.items) && Array.isArray(prev?.items)) {
                next.items = prev.items;
            }
            return next;
        });

        if (!isCreatingNewEstimateVersion && nextEstimateId && nextEstimateStatus === 'DRAFT') {
            createNewEstimateRevertRef.current = null;
            setIsCreatingNewEstimateVersion(false);
        }

        const hasEstimateId = Boolean(nextEstimateId);
        const hasItems = Array.isArray(est?.items) && est.items.length > 0;
        if (hasEstimateId && !hasItems && !isCreatingNewEstimateVersion) {
            loadLatestEstimate();
        }
        const shouldSyncCreatedVersion =
            isCreatingNewEstimateVersion &&
            hasEstimateId &&
            (optimisticEstimateStatus === 'DRAFT' || optimisticEstimateStatus === 'SENT') &&
            createVersionSyncRef.current !== `${nextEstimateId}:${optimisticEstimateStatus}`;

        if (shouldSyncCreatedVersion) {
            createVersionSyncRef.current = `${nextEstimateId}:${optimisticEstimateStatus}`;
            globalThis.setTimeout?.(() => {
                createNewEstimateRevertRef.current = null;
                setIsCreatingNewEstimateVersion(false);
                refreshDetailView({ refreshEstimate: true, refreshBill: true, refreshAdvisor: false });
                refreshAvailablePromotions();
            }, 80);
        } else if (hasEstimateId) {
            globalThis.setTimeout?.(() => {
                refreshDetailView({ refreshEstimate: true, refreshBill: true, refreshAdvisor: false });
                refreshAvailablePromotions();
            }, 120);
        }
    }, [isCreatingNewEstimateVersion, loadLatestEstimate, refreshDetailView]);

    /**
     * Xử lý trước khi thực hiện thao tác làm thay đổi báo giá (mutate):
     * Kiểm tra điều kiện không được phép sửa (ví dụ có hoá đơn, trả hàng đang chờ)
     * Xác định các promotion cần gỡ (nếu có) và gỡ trước khi thao tác
     * Cập nhật state tạm để có thể restore promotion sau khi thao tác thất bại/huỷ
     * Trả về: estimate đã được làm sạch (nếu cần) hoặc null.
     * Gọi trước các hành động thêm/sửa/xoá item báo giá để đảm bảo consistency.
     */
    const handleBeforeEstimateMutate = useCallback(async (options = {}) => {
        if (!estimateIdNum || hasBill) return;
        if (hasPendingWarehouseReturnApproval) {
            notify('Không thể sửa báo giá khi có phiếu hoàn hàng đang chờ xác nhận.');
            throw new Error('Pending warehouse return approval');
        }
        const promotionTypesToUnapply = Array.isArray(options?.promotionTypesToUnapply)
            ? options.promotionTypesToUnapply.map((type) => String(type || '').trim().toUpperCase()).filter(Boolean)
            : [];
        if (options?.skipUnapplyPromotion) {
            if (options?.resetPromotionSelection) {
                setAppliedPromotions({ PERCENT: null, BUY_X_GET_Y: null });
                setPromoCodes({ PERCENT: '', BUY_X_GET_Y: '' });
                setSelectedPromotions({ PERCENT: '', BUY_X_GET_Y: '' });
            }
            return latestEstimate ?? null;
        }
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        if (!token) return;

        const estimateItems = Array.isArray(latestEstimate?.items) ? latestEstimate.items : [];
        const estimatePromotionIds = Array.isArray(latestEstimate?.promotions)
            ? latestEstimate.promotions.map(getPromotionId).filter(Boolean)
            : [];
        const hasPromotionIdsOnItems = estimateItems.some((it) => Boolean(getExplicitPromotionId(it)));
        const hasPromotionIdsOnEstimate = estimatePromotionIds.length > 0 || Boolean(getExplicitPromotionId(latestEstimate));
        const hasPromotionEffects = estimateItems.some((it) => getEstimateItemGiftFlag(it) || pickDiscountAmountValue(it) > 0);
        let promotionLookup = availablePromotions;
        let refs = collectAppliedPromotionRefs(latestEstimate, appliedPromotions, promotionLookup);

        const shouldFetchPromotionLookup =
            refs.length === 0 ||
            refs.some((ref) => !ref.promotionType) ||
            promotionTypesToUnapply.length > 0;

        if (shouldFetchPromotionLookup && (hasPromotionIdsOnEstimate || hasPromotionIdsOnItems || hasPromotionEffects)) {
            try {
                const entries = await Promise.all(PROMOTION_TYPES.map(async ({ type }) => {
                    const res = await fetchAvailablePromotions(token, type, customerIdNum);
                    return [type, Array.isArray(res?.data) ? res.data : []];
                }));
                promotionLookup = Object.fromEntries(entries);
                setAvailablePromotions(promotionLookup);
                refs = collectAppliedPromotionRefs(latestEstimate, appliedPromotions, promotionLookup);
            } catch {
                // Surface the clearer message below if refs still cannot be resolved.
            }
        }

        if (promotionTypesToUnapply.length > 0) {
            const allowed = new Set(promotionTypesToUnapply);
            refs = refs.filter((ref) => allowed.has(String(ref?.promotionType || '').trim().toUpperCase()));
        }

        if (refs.length > 0) {
            if (createNewEstimateRevertRef.current) {
                createNewEstimateRevertRef.current.promotionRefsToRestore = refs.map((ref) => ({
                    promotionId: ref.promotionId,
                    promotionCode: ref.promotionCode,
                    promotionType: ref.promotionType,
                }));
            } else {
                createNewEstimateRevertRef.current = {
                    promotionRefsToRestore: refs.map((ref) => ({
                        promotionId: ref.promotionId,
                        promotionCode: ref.promotionCode,
                        promotionType: ref.promotionType,
                    })),
                };
            }
        }

        if (refs.length === 0) {
            if (!promotionTypesToUnapply.length && (hasPromotionIdsOnEstimate || hasPromotionIdsOnItems || hasPromotionEffects)) {
                notify('Không tìm thấy promotionId/promotionCode để gỡ khuyến mãi khỏi báo giá.');
            }
            return latestEstimate ?? null;
        }

        try {
            setPromoApplying(true);
            for (const ref of refs) {
                await unapplyPromotionFromEstimate(ref.promotionId, estimateIdNum, ref.promotionCode, token);
            }
            setAppliedPromotions((prev) => {
                if (promotionTypesToUnapply.length === 0) return { PERCENT: null, BUY_X_GET_Y: null };
                const next = { ...prev };
                promotionTypesToUnapply.forEach((type) => {
                    next[type] = null;
                });
                return next;
            });
            setPromoCodes({ PERCENT: '', BUY_X_GET_Y: '' });
            setSelectedPromotions({ PERCENT: '', BUY_X_GET_Y: '' });
            const estimateRes = await fetchServiceTicketEstimate(serviceTicketIdNum, token);
            const cleanEstimate = pickLatestEstimate(estimateRes?.data);
            setLatestEstimate(cleanEstimate ?? null);
            setRefreshTick((prev) => prev + 1);
            await refreshAvailablePromotions(token);
            notify(promotionTypesToUnapply.length > 0
                ? 'Đã gỡ khuyến mãi phần trăm khỏi báo giá. Vui lòng áp dụng lại sau khi lưu chỉnh sửa.'
                : 'Đã gỡ khuyến mãi khỏi báo giá. Vui lòng áp dụng lại sau khi lưu chỉnh sửa.');
            return cleanEstimate ?? null;
        } catch (err) {
            notify(err?.message || 'Không thể gỡ khuyến mãi khỏi báo giá.');
            throw err;
        } finally {
            setPromoApplying(false);
        }
    }, [appliedPromotions, availablePromotions, customerIdNum, estimateIdNum, hasBill, hasPendingWarehouseReturnApproval, latestEstimate, notify, serviceTicketIdNum]);

    const handleInspectionCompleted = useCallback(async () => {
        const token = localStorage.getItem('authToken');
        const code = String(ticket.ticketCode || ticketCodeParam || '').trim();
        if (!token || !code) return;

        try {
            const detailRes = await fetchServiceTicketDetail(code, token);
            if (detailRes?.data) setTicketRaw(detailRes.data);
            await refreshDetailView({ refreshEstimate: true, refreshBill: true });
        } catch (err) {
            notify(err?.message || 'Không thể tải lại trạng thái phiếu dịch vụ sau khi hoàn thành kiểm tra.');
        }
    }, [notify, refreshDetailView, setTicketRaw, ticket.ticketCode, ticketCodeParam]);

    /**
     * Áp dụng một khuyến mãi cho báo giá hiện tại.
     * Hành vi:
     * - Kiểm tra điều kiện cho phép áp dụng (trạng thái báo giá, loại promotion, quyền)
     * - Lấy promotion từ `promoCodes` hoặc `selectedPromotions` và validate
     * - Gọi API `applyPromotionToEstimate` và cập nhật state local (appliedPromotions, latestEstimate)
     * - Reload estimate để cập nhật thông tin mới
     */
    const applyPromotion = async (promotionType) => {
        const type = String(promotionType || '').trim().toUpperCase();
        if (isNewEstimateVersionPromotionLimited && type !== 'PERCENT') {
            notify('Version báo giá mới chỉ được áp dụng mã giảm giá phần trăm.');
            return;
        }
        const canApplyForStatus = isEstimateDraft || (isNewEstimateVersionPromotionLimited && isEstimateSent);
        if (!canApplyForStatus) {
            notify('Chỉ có thể áp dụng khuyến mãi khi báo giá đang ở trạng thái DRAFT.');
            return;
        }
        if (ticketStatus === 'PAID') {
            notify('Phiếu dịch vụ đã thanh toán. Không thể áp dụng khuyến mãi.');
            return;
        }
        if (!estimateIdNum) {
            notify('Không tìm thấy báo giá hợp lệ để áp dụng khuyến mãi.');
            return;
        }
        if (hasActivePromotionOnCurrentEstimate) {
            notify('Báo giá đã có mã giảm giá. Vui lòng hủy mã hiện tại trước khi chọn mã khác.');
            return;
        }

        setPromoError('');
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        const code = String(promoCodes[type] || '').trim();
        const selectedId = String(selectedPromotions[type] || '').trim();

        if (!code && !selectedId) {
            setAppliedPromotions((prev) => ({ ...prev, [type]: null }));
            return;
        }

        const list = Array.isArray(availablePromotions[type]) ? availablePromotions[type] : [];
        let picked = null;
        if (code) {
            try {
                setPromoApplying(true);
                const res = await fetchPromotionByCode(code, token);
                picked = normalizePromotion(res?.data ?? null);
            } catch (err) {
                setAppliedPromotions((prev) => ({ ...prev, [type]: null }));
                setPromoError(err?.message || 'Mã không hợp lệ');
                return;
            } finally {
                setPromoApplying(false);
            }
        } else {
            picked = list.find((p) => {
                const id = getPromotionId(p);
                return id != null && String(id) === selectedId;
            }) ?? null;
        }

        const pickedType = getPromotionType(picked);
        if (pickedType && pickedType !== type) {
            setAppliedPromotions((prev) => ({ ...prev, [type]: null }));
            setPromoError(`Mã này thuộc loại ${pickedType}, không áp dụng cho ${type}.`);
            return;
        }

        const validationMessage = validatePromotion(picked, receiptSubtotal);
        if (validationMessage) {
            setAppliedPromotions((prev) => ({ ...prev, [type]: null }));
            setPromoError(validationMessage);
            return;
        }

        const promotionId = getPromotionId(picked);
        const promotionCode = String(picked?.code ?? '').trim();
        if (!promotionId || !promotionCode) {
            setPromoError('Khuyến mãi thiếu promotionId hoặc promotionCode.');
            return;
        }

        try {
            setPromoApplying(true);
            await applyPromotionToEstimate(promotionId, estimateIdNum, promotionCode, token);
            setAppliedPromotions((prev) => ({ ...prev, [type]: normalizePromotion(picked) }));
            setPromoCodes((prev) => ({ ...prev, [type]: '' }));
            setSelectedPromotions((prev) => ({ ...prev, [type]: '' }));
            await loadLatestEstimate();
            setRefreshTick((prev) => prev + 1);
            await refreshAvailablePromotions(token);
            notify('Đã áp dụng khuyến mãi vào báo giá.');
        } catch (err) {
            setAppliedPromotions((prev) => ({ ...prev, [type]: null }));
            setPromoError(err?.message || 'Không thể áp dụng khuyến mãi.');
        } finally {
            setPromoApplying(false);
        }
    };

    /**
     * Hủy áp dụng một khuyến mãi cụ thể khỏi báo giá hiện tại.
     * Kiểm tra điều kiện (có thể hủy không, tồn tại estimate/serviceTicket id, token)
     * Gọi API `unapplyPromotionFromEstimate`, cập nhật state và reload estimate
     */
    const unapplySinglePromotion = async (promotionRow) => {
        if (promoApplying) return;
        if (!canUnapplyPromotionRow(promotionRow)) {
            notify('Không thể hủy áp dụng khuyến mãi Mua X tặng Y ở phiên bản báo giá lớn hơn 1.');
            return;
        }
        if (!estimateIdNum) {
            notify('Không tìm thấy báo giá hợp lệ để hủy mã giảm giá.');
            return;
        }
        if (!serviceTicketIdNum) {
            notify('Thiếu serviceTicketId để tải lại báo giá sau khi hủy mã giảm giá.');
            return;
        }

        const promotionId = getPromotionId(promotionRow);
        const promotionCode = getPromotionCode(promotionRow);
        if (!promotionId || !promotionCode) {
            notify('Không đủ thông tin promotionId/promotionCode để hủy mã giảm giá.');
            return;
        }

        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        if (!token) {
            notify('Vui lòng đăng nhập để hủy mã giảm giá.');
            return;
        }

        try {
            setPromoApplying(true);
            setPromoError('');
            await unapplyPromotionFromEstimate(promotionId, estimateIdNum, promotionCode, token);
            const type = String(promotionRow?.promotionType || '').trim().toUpperCase();
            if (type) {
                setAppliedPromotions((prev) => ({ ...prev, [type]: null }));
                setPromoCodes((prev) => ({ ...prev, [type]: '' }));
                setSelectedPromotions((prev) => ({ ...prev, [type]: '' }));
            }
            const estimateRes = await fetchServiceTicketEstimate(serviceTicketIdNum, token);
            const latest = pickLatestEstimate(estimateRes?.data);
            setLatestEstimate(latest ?? null);
            triggerRefresh();
            await refreshAvailablePromotions(token);
            notify('Đã hủy áp dụng mã giảm giá.');
        } catch (err) {
            setPromoError(err?.message || 'Không thể hủy áp dụng mã giảm giá.');
        } finally {
            setPromoApplying(false);
        }
    };

    const handlePrintServiceReceipt = async () => {
        if (receiptApproving) return;
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        if (!token) {
            notify('Vui lòng đăng nhập để in phiếu dịch vụ.');
            return;
        }
        if (hasPendingWarehouseReturnApproval) {
            notify('Có phiếu hoàn hàng đang chờ kho xét duyệt, không thể in phiếu dịch vụ.');
            return;
        }
        if (!estimateIdNum || (estimateStatus !== 'DRAFT' && estimateStatus !== 'SENT')) {
            notify('Chỉ có thể in phiếu dịch vụ khi báo giá đang ở trạng thái DRAFT hoặc SENT.');
            return;
        }

        try {
            setReceiptApproving(true);
            if (estimateStatus === 'DRAFT') {
                await manageServiceTicketEstimateStatus(estimateIdNum, 'SENT', token);
                setLatestEstimate((prev) => (prev ? { ...prev, status: 'SENT', estimateStatus: 'SENT' } : prev));
                await refreshDetailView({ refreshEstimate: true, refreshBill: true });
                notify('Đã chuyển báo giá sang trạng thái SENT.');
            }
            globalThis.setTimeout?.(() => {
                globalThis.requestAnimationFrame?.(() => globalThis.window?.print?.());
            }, 120);
        } catch (err) {
            notify(err?.message || 'Không thể in phiếu dịch vụ.');
        } finally {
            setReceiptApproving(false);
        }
    };

    const handleRequestPayment = async () => {
        if (billCreating) return;
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        if (!token) {
            notify('Vui lòng đăng nhập để yêu cầu thanh toán.');
            return;
        }
        if (!serviceTicketIdNum) {
            notify('Thiếu serviceTicketId hợp lệ để tạo hoá đơn.');
            return;
        }
        if (!estimateIdNum) {
            notify('Không tìm thấy báo giá hợp lệ để tạo hoá đơn.');
            return;
        }
        if (hasBill) {
            notify('Phiếu dịch vụ đã có hoá đơn.');
            return;
        }
        if (estimateStatus !== 'APPROVED') {
            notify('Vui lòng xác nhận báo giá trước khi yêu cầu thanh toán.');
            return;
        }

        let archivedBeforeBill = false;
        try {
            setBillCreating(true);
            await manageServiceTicketEstimateStatus(estimateIdNum, 'ARCHIVED', token);
            archivedBeforeBill = true;
            setLatestEstimate((prev) => (prev ? { ...prev, status: 'ARCHIVED', estimateStatus: 'ARCHIVED' } : prev));

            const versionRaw = latestEstimate?.version ?? latestEstimate?.estimateVersion ?? latestEstimate?.estimateNo ?? latestEstimate?.versionNo ?? null;
            const versionParsed =
                typeof versionRaw === 'number'
                    ? versionRaw
                    : Number(/\d+/.exec(String(versionRaw ?? ''))?.[0] ?? '');
            const billVersion = Number.isFinite(versionParsed) && versionParsed > 0 ? versionParsed : 1;
            const promotionId = getPromotionId(appliedPromotionList[0]);
            const createPayload = {
                serviceTicketId: serviceTicketIdNum,
                estimateId: estimateIdNum,
                version: billVersion,
                paymentStatus: 'UNPAID',
                subTotal: toMoneyNumber(latestEstimate?.subTotal),
                discountAmount: toMoneyNumber(latestEstimate?.discountAmount ?? 0),
                finalAmount: toMoneyNumber(latestEstimate?.totalPrice ?? latestEstimate?.totalAmount),
                promotionId: promotionId ?? null,
                discount_amount: toMoneyNumber(latestEstimate?.discountAmount ?? 0),
                final_amount: toMoneyNumber(latestEstimate?.totalPrice ?? latestEstimate?.totalAmount),
                totalAmount: toMoneyNumber(latestEstimate?.totalPrice ?? latestEstimate?.totalAmount),
            };

            const billRes = await createPayment(createPayload, token);
            const createdBillId = normalizeBillId(billRes);
            if (!createdBillId) throw new Error('Tạo bill thất bại (không nhận được billId).');

            try {
                const res = await fetchPaymentByServiceTicketId(serviceTicketIdNum, token);
                setBillPayment(res?.data ?? res ?? billRes ?? null);
            } catch {
                setBillPayment(billRes?.data ?? billRes ?? null);
            }
            await refreshDetailView({ refreshEstimate: true, refreshBill: true });
            notify('Đã tạo yêu cầu thanh toán.');
        } catch (err) {
            if (archivedBeforeBill) {
                try {
                    const lookup = await fetchPaymentByServiceTicketId(serviceTicketIdNum, token);
                    const existingBillId = normalizeBillId(lookup?.data ?? lookup);
                    if (existingBillId) {
                        setBillPayment(lookup?.data ?? lookup ?? null);
                    } else {
                        await manageServiceTicketEstimateStatus(estimateIdNum, 'APPROVED', token);
                        setLatestEstimate((prev) => (prev ? { ...prev, status: 'APPROVED', estimateStatus: 'APPROVED' } : prev));
                    }
                } catch {
                    try {
                        await manageServiceTicketEstimateStatus(estimateIdNum, 'APPROVED', token);
                        setLatestEstimate((prev) => (prev ? { ...prev, status: 'APPROVED', estimateStatus: 'APPROVED' } : prev));
                    } catch {
                        // If rollback also fails, surface the original error below.
                    }
                }
            }
            notify(err?.message || 'Không thể tạo yêu cầu thanh toán.');
        } finally {
            setBillCreating(false);
        }
    };

    /**
     * Xử lý khi user gửi form đặt lịch bảo dưỡng từ popup.
     * Kiểm tra token và các ID cần thiết (serviceTicketId, vehicleId, customerId)
     * - Gọi `createServiceTicketReminder` để tạo reminder
     * - Cập nhật local state và thông báo thành công/ lỗi
     */
    const handleSubmitMaintenance = async ({ scheduledAt, note }) => {
        if (maintenanceSubmitting) return;

        const token = localStorage.getItem('authToken');
        if (!token) {
            notify('Vui lòng đăng nhập để đặt lịch bảo dưỡng.');
            return;
        }

        if (!serviceTicketIdNum) {
            notify('Thiếu serviceTicketId hợp lệ để đặt lịch bảo dưỡng.');
            return;
        }

        const raw = String(scheduledAt || '').trim();
        const [reminderDateRaw, reminderTimeRaw] = raw.split('T');
        const reminderDate = String(reminderDateRaw || '').trim();
        const reminderTime = String(reminderTimeRaw || '').slice(0, 5);

        // Validate 
        const source = ticketRaw ?? ticketFromState ?? ticket ?? {};
        const vehicleId =
            toPositiveNumberOrNull(
                source?.vehicleId ??
                    source?.vehicleID ??
                    source?.vehicle?.vehicleId ??
                    source?.vehicle?.vehicleID ??
                    source?.vehicle?.id,
            ) || null;
        const customerId =
            toPositiveNumberOrNull(
                source?.customerId ??
                    source?.customerID ??
                    source?.customer?.customerId ??
                    source?.customer?.customerID ??
                    source?.customer?.id,
            ) || null;

        if (!vehicleId) {
            notify('Thiếu vehicleId hợp lệ để tạo lịch nhắc.');
            return;
        }
        if (!customerId) {
            notify('Thiếu customerId hợp lệ để tạo lịch nhắc.');
            return;
        }

        try {
            setMaintenanceSubmitting(true);
            // API tạo lịch nhắc
            await createServiceTicketReminder(
                {
                    serviceTicketId: serviceTicketIdNum,
                    vehicleId,
                    customerId,
                    reminderDate,
                    reminderTime,
                    note,
                },
                token,
            );
            // Cập nhật state nếu cần, ví dụ thêm vào danh sách reminders hiện tại (nếu có)
            setMaintenanceDraft({ scheduledAt: String(scheduledAt || ''), note: String(note || '') });
            setMaintenancePopupOpen(false);
            renderPageSoon();
            notify('Đã tạo lịch nhắc bảo dưỡng.');
        } catch (err) {
            notify(err?.message || 'Không thể tạo lịch nhắc bảo dưỡng.');
        } finally {
            setMaintenanceSubmitting(false);
        }
    };

    const promotionSectionJSX = (() => {
        if (!canApplyPromotionToCurrentEstimate && activePromotionRows.length === 0) return null;

        return (
            <section id="tour-promotion-section" className={styles.block} style={{ marginTop: 16, marginBottom: 16 }}>
                <h2 className={styles.blockTitle}>Mã giảm giá</h2>
                {activePromotionRows.length > 0 ? (
                    <div className={styles.promotionSummaryList}>
                        {activePromotionRows.map((row) => (
                            <div key={`${row.promotionId || row.promotionCode}`} className={styles.promotionSummary}>
                                <span className={styles.promotionSummaryLabel}>Đang áp dụng:</span>
                                <span className={styles.promotionSummaryText}>{row.label}</span>
                                {(canApplyPromotionToCurrentEstimate ? canUnapplyPromotionRow(row) : canUnapplyPromotionFromCurrentEstimate) ? (
                                    <button
                                        type="button"
                                        className="ui-btn ui-btn--ghost"
                                        onClick={() => unapplySinglePromotion(row)}
                                        disabled={promoApplying || !row.promotionId || !row.promotionCode}
                                    >
                                        Hủy áp dụng
                                    </button>
                                ) : null}
                            </div>
                        ))}
                    </div>
                ) : null}
                {canApplyPromotionToCurrentEstimate && hasActivePromotionOnCurrentEstimate ? (
                    <div className={styles.promotionApplied}>
                        Muốn chọn mã giảm giá khác, vui lòng hủy mã đang áp dụng trước.
                    </div>
                ) : null}
                {canApplyPromotionToCurrentEstimate && (
                    <div className={styles.promotionGrid}>
                        {visiblePromotionTypes.map(({ type, label }) => {
                            const list = Array.isArray(availablePromotions[type]) ? availablePromotions[type] : [];
                            const appliedLabel = buildPromotionDisplayLabel(appliedPromotions[type], { includeUsageRemaining: false });
                            const promotionInputsDisabled = !canApplyPromotionToCurrentEstimate
                                || hasActivePromotionOnCurrentEstimate
                                || billCreating
                                || promoApplying;
                            return (
                                <div key={type} id={visiblePromotionTypes[0]?.type === type ? 'tour-promo-code-input' : undefined} className={styles.promotionBox}>
                                    <div className="ui-field" style={{ marginBottom: 0 }}>
                                        <label htmlFor={`service-ticket-promo-code-${type}`}>{label}</label>
                                        <input
                                            id={`service-ticket-promo-code-${type}`}
                                            value={promoCodes[type] || ''}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setPromoCodes((prev) => ({ ...prev, [type]: value }));
                                                if (selectedPromotions[type]) {
                                                    setSelectedPromotions((prev) => ({ ...prev, [type]: '' }));
                                                }
                                            }}
                                            placeholder="Nhập mã khuyến mãi"
                                            disabled={promotionInputsDisabled}
                                        />
                                    </div>
                                    <div className="ui-field" style={{ marginBottom: 0 }}>
                                        <label htmlFor={`service-ticket-promo-${type}`}>Chọn từ danh sách</label>
                                        <select
                                            id={`service-ticket-promo-${type}`}
                                            value={selectedPromotions[type] || ''}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setSelectedPromotions((prev) => ({ ...prev, [type]: value }));
                                                if (promoCodes[type]) {
                                                    setPromoCodes((prev) => ({ ...prev, [type]: '' }));
                                                }
                                            }}
                                            disabled={promotionInputsDisabled || promotionsLoading}
                                        >
                                            <option value="">{promotionsLoading ? 'Đang tải...' : '-'}</option>
                                            {list.map((p) => {
                                                const id = getPromotionId(p);
                                                if (!id) return null;
                                                return (
                                                    <option key={String(id)} value={String(id)}>
                                                        {buildPromotionDisplayLabel(p) || String(id)}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                    <button
                                        type="button"
                                        className="ui-btn ui-btn--primary"
                                        onClick={() => applyPromotion(type)}
                                        disabled={promotionInputsDisabled || (!promoCodes[type] && !selectedPromotions[type])}
                                    >
                                        {promoApplying ? 'Đang áp dụng...' : 'Áp dụng'}
                                    </button>
                                    {appliedLabel ? (
                                        <div className={styles.promotionApplied}>
                                            Đã áp dụng: {appliedLabel}
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                )}
                {canApplyPromotionToCurrentEstimate && promotionsError ? <div className={styles.errorBanner} style={{ marginTop: 12 }}>{promotionsError}</div> : null}
                {canApplyPromotionToCurrentEstimate && promoError ? <div className={styles.errorBanner} style={{ marginTop: 12 }}>{promoError}</div> : null}
            </section>
        );
    })();

    // Phần giao diện chi tiết phiếu dịch vụ
    return (
        <div className={styles.page} onClickCapture={handlePageButtonClickCapture}>
            <div className={styles.screenOnly}>
                <div className={styles.layout}>
                    <main className={styles.main}>
                        <header className={styles.header}>
                            <div className={styles.headerLeft}>
                                <div className={styles.titleRow}>
                                    <h1 className={styles.title}>Phiếu dịch vụ #{ticket.ticketCode || ticketCodeParam || '-'}</h1>
                                    <span className={styles.statusPill}>{ticket.statusLabel || '-'}</span>
                                </div>
                            </div>
                        </header>

                        {error && <div className={styles.errorBanner}>{error}</div>}

                        {!hasBill && billLookupError ? (
                            <div className={styles.errorBanner}>{billLookupError}</div>
                        ) : null}

                        <div className={`ui-card ${styles.card}`}>
                            <div className={styles.screenInfoSection}>
                                {/* Cột Trái: Thông tin khách & ticket */}
                                <div id="tour-customer-info" className={`${styles.screenInfoColumn} ${styles.screenInfoColumnLeft}`}>
                                    <div className={styles.screenInfoRow}>
                                        <span className={styles.screenInfoLabel}>Họ tên:</span>
                                        {isEditing ? (
                                            <div className="ui-field" style={{ margin: 0, flex: 1 }}>
                                                <input
                                                    type="text"
                                                    value={editForm.customerName}
                                                    onChange={(e) => setCustomerName(e.target.value)}
                                                    disabled={isSaving}
                                                    className={styles.screenInfoInput}
                                                />
                                                {fieldErrors?.customerName && (
                                                    <div className={styles.fieldError}>{fieldErrors.customerName}</div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className={styles.screenInfoValueDotted}>{ticket.customer?.name || '-'}</div>
                                        )}
                                    </div>

                                    <div className={styles.screenInfoRowSub}>
                                        <span className={styles.screenInfoLabel}>Điện thoại:</span>
                                        {isEditing ? (
                                            <div className="ui-field" style={{ margin: 0, flex: 1 }}>
                                                <input
                                                    type="text"
                                                    value={editForm.customerPhone}
                                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                                    disabled={isSaving}
                                                    className={styles.screenInfoInput}
                                                />
                                                {fieldErrors?.customerPhone && (
                                                    <div className={styles.fieldError}>{fieldErrors.customerPhone}</div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className={styles.screenInfoValueDotted}>{ticket.customer?.phone || '-'}</div>
                                        )}
                                        <span className={styles.screenInfoLabel} style={{ marginLeft: '12px' }}>E-mail:</span>
                                        {isEditing ? (
                                            <div className="ui-field" style={{ margin: 0, flex: 1 }}>
                                                <input
                                                    type="text"
                                                    value={editForm.customerEmail}
                                                    onChange={(e) => setCustomerEmail(e.target.value)}
                                                    disabled={isSaving}
                                                    className={styles.screenInfoInput}
                                                />
                                                {fieldErrors?.customerEmail && (
                                                    <div className={styles.fieldError}>{fieldErrors.customerEmail}</div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className={styles.screenInfoValueDotted}>{ticket.customer?.email || '-'}</div>
                                        )}
                                    </div>

                                    <div className={styles.screenInfoRow}>
                                        <span className={styles.screenInfoLabel}>Ngày tiếp nhận:</span>
                                        {isEditing ? (
                                            <div className="ui-field" style={{ margin: 0, flex: 1 }}>
                                                <input
                                                    type="datetime-local"
                                                    value={editForm.receivedAt}
                                                    onChange={(e) => setReceivedAt(e.target.value)}
                                                    disabled={isSaving}
                                                    className={styles.screenInfoInput}
                                                />
                                                {fieldErrors?.receivedAt && (
                                                    <div className={styles.fieldError}>{fieldErrors.receivedAt}</div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className={styles.screenInfoValueDotted}>{receivedAtDisplay}</div>
                                        )}
                                    </div>

                                    <div className={styles.screenInfoRow}>
                                        <span className={styles.screenInfoLabel}>Người tạo:</span>
                                        <div className={styles.screenInfoValueDotted}>{ticket.createdBy || '-'}</div>
                                    </div>

                                    <div className={styles.screenSafetyCheckRow}>
                                        <span className={styles.screenInfoLabel}>Kiểm tra an toàn:</span>
                                        {isEditing ? (
                                            <div className={styles.screenInlineChecks}>
                                                <label className={styles.screenCheckItem} style={{ cursor: 'pointer' }}>
                                                    <input
                                                        type="radio"
                                                        name="safetyInspectionEnabled"
                                                        checked={editForm.safetyInspectionEnabled === true}
                                                        onChange={() => setSafetyInspectionEnabled(true)}
                                                        disabled={isSaving}
                                                    />
                                                    Có
                                                </label>
                                                <label className={styles.screenCheckItem} style={{ cursor: 'pointer' }}>
                                                    <input
                                                        type="radio"
                                                        name="safetyInspectionEnabled"
                                                        checked={editForm.safetyInspectionEnabled === false}
                                                        onChange={() => setSafetyInspectionEnabled(false)}
                                                        disabled={isSaving}
                                                    />
                                                    Không
                                                </label>
                                            </div>
                                        ) : (
                                            <div className={styles.screenInlineChecks}>
                                                <span className={styles.screenCheckItem}>
                                                    <span className={styles.screenCheckBoxSmall}>
                                                        {ticketRaw?.safetyInspectionEnabled === true ? '✓' : ''}
                                                    </span>{' '}
                                                    Có
                                                </span>
                                                <span className={styles.screenCheckItem}>
                                                    <span className={styles.screenCheckBoxSmall}>
                                                        {ticketRaw?.safetyInspectionEnabled === false ? '✓' : ''}
                                                    </span>{' '}
                                                    Không
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                </div>

                                {/* Cột Phải: Thông tin xe & lịch hẹn */}
                                <div className={`${styles.screenInfoColumn} ${styles.screenInfoColumnRight}`}>
                                    <div className={styles.screenInfoRow}>
                                        <span className={styles.screenInfoLabel}>Loại &amp; kiểu xe:</span>
                                        {isEditing ? (
                                            <div className="ui-field" style={{ margin: 0, flex: 1 }}>
                                                <input
                                                    type="text"
                                                    value={editForm.vehicleModel}
                                                    onChange={(e) => setVehicleModel(e.target.value)}
                                                    disabled={isSaving}
                                                    className={styles.screenInfoInput}
                                                />
                                                {fieldErrors?.vehicleModel && (
                                                    <div className={styles.fieldError}>{fieldErrors.vehicleModel}</div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className={styles.screenInfoValueDotted}>{ticket.vehicle?.model || '-'}</div>
                                        )}
                                    </div>

                                    <div className={styles.screenInfoRowSub}>
                                        <span className={styles.screenInfoLabel}>Biển số:</span>
                                        {isEditing ? (
                                            <div className="ui-field" style={{ margin: 0, flex: 1 }}>
                                                <input
                                                    type="text"
                                                    value={editForm.licensePlate}
                                                    onChange={(e) => setLicensePlate(e.target.value)}
                                                    disabled={isSaving}
                                                    className={styles.screenInfoInput}
                                                />
                                                {fieldErrors?.licensePlate && (
                                                    <div className={styles.fieldError}>{fieldErrors.licensePlate}</div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className={styles.screenInfoValueDotted}>{ticket.vehicle?.licensePlate || '-'}</div>
                                        )}
                                        <span className={styles.screenInfoLabel} style={{ marginLeft: '12px' }}>Ki-lô-mét:</span>
                                        {isEditing ? (
                                            <div className="ui-field" style={{ margin: 0, flex: 1 }}>
                                                <input
                                                    type="text"
                                                    value={editForm.odometerKm}
                                                    onChange={(e) => setOdometerKm(e.target.value)}
                                                    disabled={isSaving}
                                                    className={styles.screenInfoInput}
                                                />
                                                {fieldErrors?.odometerKm && (
                                                    <div className={styles.fieldError}>{fieldErrors.odometerKm}</div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className={styles.screenInfoValueDotted}>{odometerDisplay}</div>
                                        )}
                                    </div>

                                    <div className={styles.screenInfoRow}>
                                        <span className={styles.screenInfoLabel}>Ngày &amp; Giờ hẹn:</span>
                                        <div className={styles.screenInfoValueDotted}>
                                            {ticket?.booking?.scheduledDate
                                                ? `${ticket.booking.scheduledDate} ${formatTimeHHmm(ticket.booking.scheduledTime) || ''}`.trim()
                                                : '-'}
                                        </div>
                                    </div>

                                    <div className={styles.screenInfoRow}>
                                        <span className={styles.screenInfoLabel}>Dự kiến hoàn tất:</span>
                                        {isEditing ? (
                                            <div className="ui-field" style={{ margin: 0, flex: 1 }}>
                                                <input
                                                    type="datetime-local"
                                                    value={editForm.estimatedDeliveryAt}
                                                    onChange={(e) => setEstimatedDeliveryAt(e.target.value)}
                                                    disabled={isSaving}
                                                    className={styles.screenInfoInput}
                                                />
                                                {fieldErrors?.estimatedDeliveryAt && (
                                                    <div className={styles.fieldError}>{fieldErrors.estimatedDeliveryAt}</div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className={styles.screenInfoValueDotted}>{estimatedTimeDisplay}</div>
                                        )}
                                    </div>

                                    <div className={styles.screenInfoRow}>
                                        <span className={styles.screenInfoLabel}>Ngày bàn giao:</span>
                                        {isEditing ? (
                                            <div className="ui-field" style={{ margin: 0, flex: 1 }}>
                                                <input
                                                    type="datetime-local"
                                                    value={editForm.deliveredAt}
                                                    onChange={(e) => setDeliveredAt(e.target.value)}
                                                    disabled={isSaving}
                                                    className={styles.screenInfoInput}
                                                />
                                                {fieldErrors?.deliveredAt && (
                                                    <div className={styles.fieldError}>{fieldErrors.deliveredAt}</div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className={styles.screenInfoValueDotted}>{handoverAtDisplay}</div>
                                        )}
                                    </div>

                                    {!isEditing && !isImmutable && (hasAdvisorRole || hasReceptionistRole) && (
                                        <div className={styles.inlineEditBtnWrapper}>
                                            <button
                                                id="tour-edit-info-btn"
                                                type="button"
                                                className={`ui-btn ui-btn--primary ${styles.inlineEditBtn}`}
                                                onClick={toggleEdit}
                                                title="Chỉnh sửa thông tin"
                                            >
                                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                </svg>
                                                Chỉnh sửa
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {isEditing && (
                                <div className={styles.editActionsBar}>
                                    <button
                                        type="button"
                                        className="ui-btn ui-btn--ghost"
                                        onClick={cancelEdit}
                                        disabled={isSaving}
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="button"
                                        className="ui-btn ui-btn--primary"
                                        onClick={saveEdit}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                                    </button>
                                </div>
                            )}

                            <div className={styles.licensePlateAndRequestGrid}>
                                {(licensePlatePhotos.length > 0 || isLoading) && (
                                    <section className={styles.block} style={{ marginBottom: 0 }}>
                                        <h2 className={styles.blockTitle}>Ảnh biển số xe</h2>
                                        {licensePlatePhotos.length > 0 ? (
                                            <div className={styles.licensePlatePhotoGrid}>
                                                {licensePlatePhotos.map((p, idx) => {
                                                    const key = String(p?.photoId ?? `${p?.category || 'photo'}-${idx}`);
                                                    return (
                                                        <div
                                                            key={key}
                                                            className={styles.licensePlatePhotoCard}
                                                            onClick={() => setPreviewPhotoUrl(p.url)}
                                                            title="Xem ảnh phóng to"
                                                        >
                                                            <img
                                                                className={styles.licensePlatePhotoImg}
                                                                src={p.url}
                                                                alt={`Ảnh biển số ${idx + 1}`}
                                                                loading="lazy"
                                                                referrerPolicy="no-referrer"
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className={styles.noteBox}>Đang tải...</div>
                                        )}
                                    </section>
                                )}

                                <section className={styles.block} style={{ marginBottom: 0 }}>
                                    <h2 className={styles.blockTitle}>Yêu cầu khách hàng</h2>
                                    {isEditing ? (
                                        <div className="ui-field" style={{ margin: 0 }}>
                                            <textarea
                                                id="service-ticket-customer-request"
                                                value={editForm.customerRequest}
                                                onChange={(e) => setCustomerRequest(e.target.value)}
                                                maxLength={255}
                                                disabled={isSaving}
                                                className={styles.screenInfoTextarea}
                                                placeholder="Nhập nội dung yêu cầu"
                                                style={{ minHeight: '100px' }}
                                            />
                                            {fieldErrors?.customerRequest && (
                                                <div className={styles.fieldError}>{fieldErrors.customerRequest}</div>
                                            )}
                                            <div className={styles.fieldHint} style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                                                Còn lại {Math.max(0, 255 - String(editForm.customerRequest || '').length)} ký tự
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={styles.noteBox} style={{ minHeight: '60px' }}>
                                            {ticket.requestNote || '-'}
                                        </div>
                                    )}
                                </section>
                            </div>

                            {(selectedServiceItems.length > 0 || selectedPartItems.length > 0 || isLoading) && (
                                <section className={styles.block}>
                                    <h2 className={styles.blockTitle}>Hạng mục đã chọn</h2>
                                    <div className={styles.selectedItemGroups}>
                                        <div>
                                            <h3 className={styles.selectedItemTitle}>Dịch vụ đã chọn</h3>
                                            <div className={styles.servicesList}>
                                                {selectedServiceItems.map((s, idx) => {
                                                    const price = s?.priceVnd ?? s?.price;
                                                    return (
                                                        <div key={`${s?.id ?? s?.name ?? 'service'}-${idx}`} className={styles.serviceRow}>
                                                            <span className={styles.serviceName}>{getTicketItemName(s) || s?.label || '-'}</span>
                                                            <span className={styles.servicePrice}>{price == null ? '-' : formatCurrencyVnd(price)}</span>
                                                        </div>
                                                    );
                                                })}
                                                {selectedServiceItems.length === 0 && <div className={styles.noteBox}>-</div>}
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className={styles.selectedItemTitle}>Phụ tùng đã chọn</h3>
                                            <div className={styles.servicesList}>
                                                {selectedPartItems.map((s, idx) => {
                                                    const price = s?.priceVnd ?? s?.price;
                                                    return (
                                                        <div key={`${s?.id ?? s?.name ?? 'part'}-${idx}`} className={styles.serviceRow}>
                                                            <span className={styles.serviceName}>{getTicketItemName(s) || s?.label || '-'}</span>
                                                            <span className={styles.servicePrice}>{price == null ? '-' : formatCurrencyVnd(price)}</span>
                                                        </div>
                                                    );
                                                })}
                                                {selectedPartItems.length === 0 && <div className={styles.noteBox}>-</div>}
                                            </div>
                                        </div>
                                    </div>

                                    {ticket.externalDependency && (
                                        <div className={styles.tagsRow}>
                                            <span className={styles.tag}>External Dependency</span>
                                        </div>
                                    )}
                                </section>
                            )}



                            {advisorReadOnlyWithoutTechnician ? (
                                <section className={styles.block}>
                                    <h2 className={styles.blockTitle}>Trạng thái xử lý</h2>
                                    <div className={styles.noteBox}>
                                        Phiếu này chưa được phân công kỹ thuật viên. Cố vấn viên hiện chỉ có thể xem thông tin phiếu cho đến khi có phân công kỹ thuật viên.
                                    </div>
                                </section>
                            ) : null}

                            {canViewInspectionAndEstimate && !advisorReadOnlyWithoutTechnician && (
                                <>
                                    <TechnicianServiceTicket
                                        key={`tech-${ticket.ticketCode || ticketCodeParam}-${ticketStatus}-${estimateStatus}`}
                                        ticketCode={ticket.ticketCode || ticketCodeParam}
                                        embedded
                                        mode="advisor"
                                        onInspectionCompleted={handleInspectionCompleted}
                                        readOnly={isInspectionAndEstimateReadOnly}
                                        readOnlyMessage={inspectionAndEstimateReadOnlyMessage}
                                        hideReadOnlyNotice={false}
                                    />

                                    {shouldHideEstimateUntilInspectionDone ? (
                                        <section className={styles.block}>
                                            <h2 className={styles.blockTitle}>Báo giá</h2>
                                            <div className={styles.noteBox}>
                                                {isSafetyInspectionEnabled
                                                    ? 'Phiếu này có kiểm tra an toàn. Vui lòng hoàn thành kiểm tra an toàn trước khi hiển thị phần báo giá.'
                                                    : 'Phiếu này không kiểm tra an toàn. Vui lòng bấm Hoàn thành phiếu kiểm tra trước khi hiển thị phần báo giá.'}
                                            </div>
                                        </section>
                                    ) : (
                                        <AdvisorItemsTable
                                            key={`advisor-${ticket?.serviceTicketId}`}
                                            serviceTicketId={ticket?.serviceTicketId}
                                            ticketStatus={ticketStatus}
                                            ticketPhotos={ticketPhotos}
                                            refreshToken={refreshTick}
                                            estimatedTimeDisplay={estimatedTimeDisplay}
                                            onEstimateStatusChange={handleEstimateStatusChange}
                                            onRestartWorkflow={handleRestartFromArchived}
                                            onCancelCreateNewVersion={handleCancelCreateNewEstimateVersion}
                                            onCancelAppendOnly={handleCancelAppendOnly}
                                            onEstimateEditingChange={setIsEstimateEditing}
                                            onBeforeEstimateMutate={handleBeforeEstimateMutate}
                                            readOnly={isInspectionAndEstimateReadOnly}
                                            readOnlyMessage={inspectionAndEstimateReadOnlyMessage}
                                            hideReadOnlyNotice={false}
                                            disableFullEdit={isAddServicePending}
                                            vehicleBrand={ticket?.vehicle?.make || ticket?.vehicle?.brand || ''}
                                            vehicleModel={ticket?.vehicle?.model || ''}
                                            vehicleOdometer={ticket?.vehicle?.odometerKm}
                                             licensePlate={ticket?.vehicle?.licensePlate || ''}
                                             customerName={ticket?.customer?.name || ticket?.customerName || ''}
                                             customerPhone={ticket?.customer?.phone || ticket?.customerPhone || ''}
                                            promotionSection={promotionSectionJSX}
                                        />
                                    )}

                                    {ticket.hasDraftStockIssue && hasAnyRequestableWarehouseDependentItem ? (
                                    <div className={styles.stockWaitBanner}>Hiện có phụ tùng đang đợi xuất kho</div>
                                    ) : null}
                                </>
                            )}

                            {isTicketCancelled ? null : (
                                <div className={`ui-actions ${styles.actions}`}>
                                    <button type="button" className="ui-btn ui-btn--ghost" onClick={handleBack}>
                                        Quay lại
                                    </button>
                                    <div className={styles.actionsRight}>
                                        {canOpenWarehouseIssues ? (
                                            <button
                                                type="button"
                                                className="ui-btn ui-btn--primary"
                                                onClick={handleGoToWarehouseIssues}
                                            >
                                                Đi đến phiếu xuất kho
                                            </button>
                                        ) : null}
                                        {canOpenReceiptPayment ? (
                                            <button
                                                type="button"
                                                className="ui-btn ui-btn--primary"
                                                onClick={handleGoToReceiptPayment}
                                            >
                                                Thanh toán
                                            </button>
                                        ) : null}
                                        {advisorReadOnlyWithoutTechnician || isInspectionAndEstimateReadOnly ? null : isCreatingNewEstimateVersion ? (
                                            <>
                                                {canPrintServiceReceipt ? (
                                                    <button
                                                        type="button"
                                                        className="ui-btn ui-btn--ghost"
                                                        onClick={handlePrintServiceReceipt}
                                                        disabled={receiptApproving || statusUpdating}
                                                    >
                                                        {receiptApproving ? 'Đang in...' : 'In phiếu dịch vụ'}
                                                    </button>
                                                ) : null}
                                                {canConfirmEstimate ? (
                                                    <button
                                                        type="button"
                                                        className="ui-btn ui-btn--primary"
                                                        onClick={handleOpenEstimateTimePopup}
                                                        disabled={receiptApproving || statusUpdating || estimateLoading}
                                                    >
                                                        {estimateLoading ? 'Đang xác nhận...' : 'Xác nhận báo giá'}
                                                    </button>
                                                ) : null}
                                            </>
                                        ) : null}

                                        {advisorReadOnlyWithoutTechnician || isInspectionAndEstimateReadOnly || isCreatingNewEstimateVersion ? null : (
                                            <>
                                                {canCancel && (
                                                    <button
                                                        type="button"
                                                        className={`ui-btn ui-btn--danger ${styles.dangerBtn}`}
                                                        onClick={handleCancelTicket}
                                                        disabled={statusUpdating}
                                                    >
                                                        Hủy phiếu dịch vụ
                                                    </button>
                                                )}
                                                {canPrintServiceReceipt && (
                                                    <button
                                                        type="button"
                                                        className="ui-btn ui-btn--ghost"
                                                        onClick={handlePrintServiceReceipt}
                                                        disabled={receiptApproving || statusUpdating}
                                                    >
                                                        {receiptApproving ? 'Đang in...' : 'In phiếu dịch vụ'}
                                                    </button>
                                                )}
                                                {canConfirmEstimate && (
                                                    <button
                                                        type="button"
                                                        className="ui-btn ui-btn--primary"
                                                        onClick={handleOpenEstimateTimePopup}
                                                        disabled={receiptApproving || statusUpdating || estimateLoading}
                                                    >
                                                        {estimateLoading ? 'Đang xác nhận...' : 'Xác nhận báo giá'}
                                                    </button>
                                                )}
                                                {canRequestStockIssue && !canConfirmEstimate && (
                                                    <button
                                                        type="button"
                                                        className="ui-btn ui-btn--ghost"
                                                        onClick={handleRequestStockIssue}
                                                        disabled={receiptApproving || statusUpdating || stockIssueRequesting}
                                                    >
                                                        {stockIssueRequesting ? 'Đang tạo yêu cầu...' : 'Yêu cầu xuất kho'}
                                                    </button>
                                                )}
                                                {canStartRepair && (
                                                    <button type="button" className="ui-btn ui-btn--primary" onClick={handleStartRepair} disabled={receiptApproving || statusUpdating}>
                                                        Tiến hành sửa chữa
                                                    </button>
                                                )}
                                                {canCompleteRepair && (
                                                    <button type="button" className="ui-btn ui-btn--primary" onClick={handleCompleteRepair} disabled={receiptApproving || statusUpdating}>
                                                        Hoàn tất sửa chữa
                                                    </button>
                                                )}
                                                {canBookMaintenance && (
                                                    <button
                                                        type="button"
                                                        className="ui-btn ui-btn--ghost"
                                                        onClick={handleOpenMaintenancePopup}
                                                        disabled={statusUpdating || receiptApproving}
                                                    >
                                                        Hẹn lịch bảo dưỡng
                                                    </button>
                                                )}
                                                {canRequestPayment && (
                                                    <button type="button" className="ui-btn ui-btn--primary" onClick={handleRequestPayment} disabled={billCreating}>
                                                        {billCreating ? 'Đang tạo yêu cầu...' : 'Yêu cầu thanh toán'}
                                                    </button>
                                                )}
                                                {!assignmentsLoading && !hasTechnician && ticketStatus === 'COMPLETED' && !isActionLocked && (
                                                    <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
                                                        Cần phân công KTV trước khi tạo hóa đơn.
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                    {maintenancePopupOpen ? (
                        <MaintenanceBookingPopup
                            open
                            initialDateTime={maintenanceDraft.scheduledAt}
                            initialNote={maintenanceDraft.note}
                            durationMinutes={60}
                            submitting={maintenanceSubmitting}
                            onClose={() => setMaintenancePopupOpen(false)}
                            onSubmit={handleSubmitMaintenance}
                        />
                    ) : null}
                    {estimateTimePopupOpen ? (
                        <EstimateTimePopup
                            open
                            initialDateTime={estimatedTimeValue}
                            onClose={() => setEstimateTimePopupOpen(false)}
                            onSubmit={handleSubmitEstimateTime}
                        />
                    ) : null}
                    </main>
                </div>
            </div>
            <div className={styles.printOnly}>
                <Receipt ticket={printTicket} />
            </div>



            {previewPhotoUrl && (
                <dialog
                    className={styles.photoModalDialog}
                    open
                    onClose={() => { setPreviewPhotoUrl(null); setIsLicensePlateZoomed(false); }}
                    onCancel={(e) => {
                        e.preventDefault();
                        setPreviewPhotoUrl(null);
                        setIsLicensePlateZoomed(false);
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setPreviewPhotoUrl(null);
                            setIsLicensePlateZoomed(false);
                        }
                    }}
                    aria-label="Xem ảnh biển số"
                >
                    <div className={styles.photoModalContent}>
                        <div className={styles.photoModalHeader}>
                            <div className={styles.photoModalTitle}>Ảnh biển số xe</div>
                            <button
                                type="button"
                                className="ui-btn ui-btn--ghost"
                                onClick={() => { setPreviewPhotoUrl(null); setIsLicensePlateZoomed(false); }}
                            >
                                Đóng
                            </button>
                        </div>
                        <div 
                            className={`${styles.photoModalBody} ${isLicensePlateZoomed ? styles.photoBodyZoomed : ''}`}
                            onClick={() => setIsLicensePlateZoomed(!isLicensePlateZoomed)}
                        >
                            <img
                                className={`${styles.photoModalImg} ${isLicensePlateZoomed ? styles.photoImgZoomed : ''}`}
                                src={previewPhotoUrl}
                                alt="Ảnh biển số xe"
                                referrerPolicy="no-referrer"
                            />
                            <div className={styles.zoomTip}>
                                {isLicensePlateZoomed ? 'Bấm vào ảnh để thu nhỏ' : 'Bấm vào ảnh để phóng to'}
                            </div>
                        </div>
                    </div>
                </dialog>
            )}
        </div>
    );
}

ServiceTicketDetail.propTypes = {
    ticketCodeOverride: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};



