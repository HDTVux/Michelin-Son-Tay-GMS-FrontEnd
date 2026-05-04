import PropTypes from 'prop-types';
import styles from './Receipt.module.css';
import logo from '../../../assets/logo1.png';
import CarIcon from '../../../assets/car.jpg';

const MIN_SERVICE_LINE_COUNT = 15;
const FIRST_PAGE_SERVICE_LINE_COUNT = 15;
const CONTINUATION_PAGE_SERVICE_LINE_COUNT = 30;

function safeText(value) {
	if (value == null) return '';
	return String(value);
}

function toMoneyNumber(value) {
    const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
    return Number.isFinite(n) ? n : 0;
}

function formatCurrencyVnd(value) {
    const n = toMoneyNumber(value);
    return n ? new Intl.NumberFormat('vi-VN').format(Math.round(n)) : '';
}

function firstMoneyValue(...values) {
    const found = values.find(hasPrintValue);
    return found == null ? 0 : toMoneyNumber(found);
}

function getGiftFlag(item) {
    const raw = item?.isGift ?? item?.is_gift;
    return raw === true || String(raw ?? '').trim().toLowerCase() === 'true';
}

function getLineDiscountAmount(item) {
    return Math.max(0, firstMoneyValue(
        item?.discountAmount,
        item?.discount_amount,
        item?.promotionDiscountAmount,
        item?.promotion_discount_amount,
        item?.discountValue,
        item?.discount_value,
    ));
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

function CarDiagram({ src }) {
	const resolvedSrc = typeof src === 'string' && src.trim() ? src.trim() : CarIcon;
	return <img className={styles.carImg} src={resolvedSrc} alt="" />;
}

function CheckboxCell() {
	return <span className={styles.checkbox} aria-hidden="true" />;
}

function CheckedCell() {
    return <span className={styles.checkMark} aria-hidden="true">✓</span>;
}

function normalizeCategoryName(value) {
    return String(value ?? '').trim().toLowerCase();
}

function getSafetyItemKey(item) {
    const workCategoryId =
        item?.workCategoryId ??
        item?.workCategory?.workCategoryId ??
        item?.workCategory?.id ??
        null;
    if (workCategoryId != null && String(workCategoryId).trim() !== '') return `work:${workCategoryId}`;

    const customCategoryId = item?.customCategoryId ?? null;
    if (customCategoryId != null && String(customCategoryId).trim() !== '') return `custom:${customCategoryId}`;

    const fallbackCategoryId = item?.id ?? null;
    if (fallbackCategoryId != null && item?.itemStatus == null && item?.status == null) return `work:${fallbackCategoryId}`;

    const categoryName = normalizeCategoryName(item?.categoryName || item?.newCategoryName || item?.displayName);
    return categoryName ? `name:${categoryName}` : '';
}

function getSafetyItemName(item) {
    return safeText(
        item?.categoryName ||
        item?.newCategoryName ||
        item?.workCategory?.categoryName ||
        item?.workCategory?.categoryCode ||
        item?.displayName ||
        '',
    );
}

function getSafetyAdvisorNote(item) {
    return safeText(item?.advisorNote || item?.note || item?.advisor_note || '');
}

function hasPrintValue(value) {
    return value != null && String(value).trim() !== '';
}

function firstPrintValue(...values) {
    const found = values.find(hasPrintValue);
    return found == null ? '' : String(found);
}

function normalizeTaxRatePercentText(rawRate) {
    const n = typeof rawRate === 'number' ? rawRate : Number(String(rawRate ?? '').trim());
    if (!Number.isFinite(n) || n <= 0) return '';
    const rate = n > 1 ? n : n * 100;
    return `${rate.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`;
}

function getLineTaxRateText(item) {
    const directText = safeText(item?.taxRateText ?? item?.tax_rate_text);
    if (directText && directText !== '0%' && directText !== '--') return directText;

    const rateText = normalizeTaxRatePercentText(
        item?.appliedTaxRate ??
            item?.applied_tax_rate ??
            item?.taxRate ??
            item?.tax_rate ??
            item?.taxRule?.taxRate ??
            item?.taxRule?.rate ??
            item?.workCategory?.taxRule?.taxRate ??
            item?.workCategory?.taxRule?.rate,
    );
    if (rateText) return rateText;

    return '';
}

function getLineTaxIncludedNote(item) {
    const taxRateText = getLineTaxRateText(item);
    if (!taxRateText && toMoneyNumber(item?.taxAmount ?? item?.tax_amount) <= 0) return '';
    return taxRateText ? `(đã bao gồm thuế ${taxRateText})` : '(đã bao gồm thuế)';
}

function resolveSafetyEnabled(ticket, safetyInspection) {
    const status = String(
        safetyInspection?.inspectionStatus ??
            safetyInspection?.status ??
            ticket?.safetyInspectionStatus ??
            ticket?.inspectionStatus ??
            ticket?.inspection?.inspectionStatus ??
            '',
    ).trim().toUpperCase();

    if (['SKIPPED', 'CANCELLED', 'DISABLED', 'NOT_REQUIRED'].includes(status)) return false;

    const explicit = ticket?.safetyInspectionEnabled;
    if (typeof explicit === 'boolean') return explicit;
    if (typeof explicit === 'number') return explicit === 1;
    if (typeof explicit === 'string') {
        const normalized = explicit.trim().toLowerCase();
        if (['false', '0', 'no', 'khong', 'không'].includes(normalized)) return false;
        if (['true', '1', 'yes', 'co', 'có'].includes(normalized)) return true;
    }

    return Boolean(
        safetyInspection?.technicianNotes ||
            safetyInspection?.recommendedTireSize ||
            safetyInspection?.tires?.length ||
            safetyInspection?.items?.length,
    );
}

export default function Receipt({ ticket, carDiagramSrc }) {
	const customer = ticket?.customer || {};
	const vehicle = ticket?.vehicle || {};
    const invoice = ticket?.invoice || {};
    const safetyInspection = ticket?.safetyInspection || {};

	const receivedAt = safeText(ticket?.receivedAtDisplay || ticket?.receivedAt || '');
	const handoverAt = safeText(ticket?.handoverAtDisplay || ticket?.handoverAt || '');
	const model = safeText(vehicle?.model || '');
	const licensePlate = safeText(vehicle?.licensePlate || '');
    const ticketCode = firstPrintValue(
        ticket?.ticketCode,
        ticket?.serviceTicketCode,
        ticket?.code,
        ticket?.serviceTicket?.ticketCode,
    );
    const odometer = vehicle?.odometerKm == null ? '' : `${Number(vehicle.odometerKm).toLocaleString('vi-VN')}`;

    const invoiceItemsRaw = Array.isArray(invoice?.items)
        ? invoice.items.filter((item) => !isReturnedInvoiceItem(item))
        : [];
    const invoiceItems = invoiceItemsRaw.map((it, idx) => {
        const quantity = toMoneyNumber(it?.quantity);
        const unitPrice = toMoneyNumber(it?.unitPrice);
        const discountLineAmount = getLineDiscountAmount(it);
        const grossAmount = quantity * unitPrice;
        const subTotal = firstMoneyValue(
            it?.subTotal,
            it?.sub_total,
            it?.finalPrice,
            it?.final_price,
            it?.finalAmount,
            it?.final_amount,
        ) || Math.max(0, grossAmount - discountLineAmount);
        const isGift = getGiftFlag(it);
        return {
            key: String(it?.key ?? it?.estimateItemId ?? it?.itemId ?? idx),
            categoryName: safeText(it?.categoryName || it?.workCategory?.categoryName || it?.workCategory?.categoryCode || ''),
            itemName: safeText(it?.itemName || it?.description || ''),
            warehouseName: safeText(it?.warehouseName || it?.warehouse?.warehouseName || it?.warehouse?.name || ''),
            quantity,
            unitPrice: isGift ? 0 : unitPrice,
            discountAmount: isGift ? 0 : discountLineAmount,
            subTotal: isGift ? 0 : subTotal,
            taxRateText: getLineTaxRateText(it),
            taxIncludedNote: isGift ? '' : getLineTaxIncludedNote(it),
            isGift,
        };
    });

    const subtotal = Number.isFinite(Number(invoice?.subtotal)) ? Number(invoice.subtotal) : invoiceItems.reduce((acc, it) => acc + toMoneyNumber(it.subTotal), 0);
    const discountAmount = toMoneyNumber(invoice?.discountAmount);
    const vatAmount = toMoneyNumber(invoice?.vatAmount);
    const total = Number.isFinite(Number(invoice?.total)) ? Number(invoice.total) : Math.max(0, subtotal - discountAmount) + vatAmount;
    const serviceLineKeys = Array.from({ length: Math.max(MIN_SERVICE_LINE_COUNT, invoiceItems.length) }).map(
        (_, i) => `service-line-${String(i + 1).padStart(2, '0')}`,
    );
    const hasOverflowServicePage = serviceLineKeys.length > FIRST_PAGE_SERVICE_LINE_COUNT;
    const firstPageServiceLineKeys = hasOverflowServicePage
        ? serviceLineKeys.slice(0, FIRST_PAGE_SERVICE_LINE_COUNT)
        : serviceLineKeys;
    const overflowServiceLineKeys = hasOverflowServicePage
        ? serviceLineKeys.slice(FIRST_PAGE_SERVICE_LINE_COUNT)
        : [];
    const overflowServiceLinePages = [];
    for (let startIndex = FIRST_PAGE_SERVICE_LINE_COUNT; startIndex < serviceLineKeys.length; startIndex += CONTINUATION_PAGE_SERVICE_LINE_COUNT) {
        overflowServiceLinePages.push({
            startIndex,
            rowKeys: serviceLineKeys.slice(startIndex, startIndex + CONTINUATION_PAGE_SERVICE_LINE_COUNT),
        });
    }

    // Safety inspection data
    // Ưu tiên trạng thái/cờ của phiếu để trường hợp SKIPPED không bị in nhầm là "Có".
    const hasSafetyEnabled = resolveSafetyEnabled(ticket, safetyInspection);

    const technicianNotes = safeText(safetyInspection?.technicianNotes || '');

    // Tire data - normalize from API
    const tireDataMap = {};
    if (Array.isArray(safetyInspection?.tires)) {
        safetyInspection.tires.forEach(t => {
            const posMap = {
                'FRONT_LEFT': 'frontLeft',
                'FRONT_RIGHT': 'frontRight',
                'REAR_LEFT': 'rearLeft',
                'REAR_RIGHT': 'rearRight',
                'SPARE': 'spare',
            };
            const pos = posMap[t.tirePosition];
            if (pos) {
                tireDataMap[pos] = t;
            }
        });
    }

    const tireFrontLeft = tireDataMap['frontLeft'] || {};
    const tireFrontRight = tireDataMap['frontRight'] || {};
    const tireRearLeft = tireDataMap['rearLeft'] || {};
    const tireRearRight = tireDataMap['rearRight'] || {};
    const tireSpare = tireDataMap['spare'] || {};

    const recommendedTireSize = firstPrintValue(
        safetyInspection?.recommendedTireSize,
        tireFrontLeft?.recommendedTireSize,
        tireFrontRight?.recommendedTireSize,
        tireRearLeft?.recommendedTireSize,
        tireRearRight?.recommendedTireSize,
        tireSpare?.recommendedTireSize,
    );

    // Áp suất khuyến cáo cho từng vị trí lốp.
    const frontRecommendedPressure = firstPrintValue(
        tireFrontRight?.recommendedPressure,
        safetyInspection?.frontRecommendedPressure,
        safetyInspection?.frontTireRecommendedPressure,
    );
    const rearRecommendedPressure = firstPrintValue(
        tireRearRight?.recommendedPressure,
        safetyInspection?.rearRecommendedPressure,
        safetyInspection?.rearTireRecommendedPressure,
    );
    const spareRecommendedPressure = firstPrintValue(
        tireSpare?.recommendedPressure,
        safetyInspection?.spareRecommendedPressure,
        safetyInspection?.spareTireRecommendedPressure,
    );

    // Build tire specification strings
    const buildTireSpec = (t) => {
        if (!t?.tireSpecification) return '___ / ___ R ___';
        return t.tireSpecification;
    };

    // Safety items from inspection - lookup by workCategoryId
    const safetyItemsMap = new Map();
    if (Array.isArray(safetyInspection?.items)) {
        safetyInspection.items.forEach(item => {
            const key = getSafetyItemKey(item);
            if (key) safetyItemsMap.set(key, item);

            const nameKey = `name:${normalizeCategoryName(getSafetyItemName(item))}`;
            if (nameKey !== 'name:') safetyItemsMap.set(nameKey, item);
        });
    }

    // Danh sách hạng mục kiểm tra: dùng defaultCategories từ API
    const defaultCategories = ticket?.defaultCategories || [];
    const displayItems = [];
    const displayItemKeys = new Set();
    const addDisplayItem = (item) => {
        const label = getSafetyItemName(item);
        const key = getSafetyItemKey(item) || `name:${normalizeCategoryName(label)}`;
        if (!label || displayItemKeys.has(key)) return;
        displayItemKeys.add(key);
        displayItems.push(item);
    };

    if (Array.isArray(defaultCategories)) defaultCategories.forEach(addDisplayItem);
    if (Array.isArray(safetyInspection?.items)) safetyInspection.items.forEach(addDisplayItem);

    const renderServiceTable = (rowKeys, startIndex = 0, showTotal = true) => (
        <div className={styles.serviceTableWrap}>
            <table className={styles.serviceTable}>
                <thead>
                    <tr>
                        <th className={styles.thStt}>STT</th>
                        <th className={styles.thItem}>HẠNG MỤC</th>
                        <th className={styles.thDesc}>DIỄN GIẢI</th>
                        <th className={styles.thQty}>SL</th>
                        <th className={styles.thPrice}>ĐƠN GIÁ</th>
                        <th className={styles.thDiscount}>GIẢM GIÁ</th>
                        <th className={styles.thAmount}>THÀNH TIỀN</th>
                        <th className={styles.thKho}>KHO</th>
                    </tr>
                </thead>
                <tbody>
                    {rowKeys.map((rowKey, rowIndex) => {
                        const idx = startIndex + rowIndex;
                        const it = invoiceItems[idx] ?? null;
                        const label = it?.categoryName || '';
                        const desc = it?.itemName || '';
                        const qty = it?.quantity ? String(it.quantity) : '';
                        const price = it?.unitPrice ? formatCurrencyVnd(it.unitPrice) : '';
                        const discount = it?.discountAmount ? formatCurrencyVnd(it.discountAmount) : '';
                        const amount = it?.subTotal ? formatCurrencyVnd(it.subTotal) : '';
                        const warehouseName = it?.warehouseName || '';
                        const taxIncludedNote = it?.taxIncludedNote || '';
                        const warehouseClassName = warehouseName.length > 28
                            ? `${styles.tdWarehouse} ${styles.tdWarehouseLong}`
                            : styles.tdWarehouse;
                        return (
                            <tr key={rowKey} className={it?.isGift ? styles.giftRow : undefined}>
                                <td className={styles.tdCenter}>{String(idx + 1).padStart(2, '0')}</td>
                                <td>{label}</td>
                                <td>{desc}</td>
                                <td className={styles.tdCenter}>{qty}</td>
                                <td className={styles.tdRight}>{price}</td>
                                <td className={styles.tdRight}>{discount}</td>
                                <td className={`${styles.tdRight} ${styles.amountCell}`}>
                                    <div>{amount}</div>
                                    {taxIncludedNote ? <div className={styles.taxIncludedNote}>{taxIncludedNote}</div> : null}
                                </td>
                                <td className={warehouseClassName} title={warehouseName}>{warehouseName}</td>
                            </tr>
                        );
                    })}
                    {showTotal ? (
                        <tr>
                            <td colSpan={6} className={styles.totalLabel}>TỔNG CỘNG</td>
                            <td className={`${styles.tdRight} ${styles.tdTotalValue}`}>{formatCurrencyVnd(total)}</td>
                            <td />
                        </tr>
                    ) : null}
                </tbody>
            </table>
        </div>
    );

    const renderFooter = () => (
        <div className={styles.footer}>
            <div className={`${styles.recommendation} ${styles.recommendationLine}`}>
                <div className={styles.footerTitle}>Khuyến nghị:</div>
                <div className={styles.legalText}>
                    {safeText(ticket?.recommendation || '')}
                </div>
            </div>

            <div className={`${styles.recommendation} ${styles.privacyNotice}`}>
                <div className={styles.legalText}>
                    <span className={styles.checkBoxSmall} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                    {' '}
                    Tôi đồng ý rằng bất kỳ dữ liệu cá nhân nào được cung cấp theo mẫu này có thể được thu thập và xử lý bởi Michelin Việt Nam (Công Ty) và bất kỳ công ty nào thuộc tập đoàn Michelin (có thể nằm ngoài Việt Nam), nhằm mục đích cải thiện chất lượng dịch vụ và tiếp thị. Tôi đồng ý thêm rằng Công Ty có thể liên hệ với tôi (i) để nhận phản hồi về chất lượng dịch vụ cũng như (ii) cung cấp cho tôi về các sản phẩm, dịch vụ và khuyến mại của Michelin. Tôi cũng đồng ý rằng Công Ty chỉ chuyển dữ liệu cá nhân cho các nhà cung cấp dịch vụ và / hoặc chi nhánh của Michelin tại Việt Nam hoặc bên ngoài Việt Nam.
                    Công Ty sẽ xử lý dữ liệu cá nhân của bạn theo Chính sách bảo mật của Michelin (https://www.michelin.vn/privacy-policy). Vui lòng liên hệ với công ty theo số hotline + 84 28 3942 1111 nếu bạn muốn giới hạn việc chúng tôi xử lý, truy cập hoặc chỉnh sửa dữ liệu của bạn"
                </div>
            </div>

            <div className={styles.signRow}>
                <div className={styles.signCol}>
                    <div className={styles.signTitle}>Đại lý</div>
                    <div className={styles.signHint}>(Ký tên)</div>
                    <div className={styles.signLine} />
                </div>
                <div className={styles.signCol}>
                    <div className={styles.signTitle}>Khách hàng</div>
                    <div className={styles.signHint}>(Ký tên)</div>
                    <div className={styles.signLine} />
                </div>
            </div>
        </div>
    );

    return (
    <>
    <section className={`${styles.sheet} ${hasOverflowServicePage ? styles.hasContinuation : ''}`}>

        {/* ===== HEADER ===== */}
        <header className={styles.topHeader}>
            <div className={styles.topHeaderLeft} />
            <div className={styles.topHeaderCenter}>
                <div className={styles.titleStack}>
                    <div className={styles.sheetTitle}>PHIẾU KIỂM TRA XE</div>
                    {ticketCode ? <div className={styles.ticketCodeLine}>MÃ PHIẾU: {ticketCode}</div> : null}
                </div>
            </div>
            <div className={styles.topHeaderRight}>
                <img className={styles.logo} src={logo} alt="Michelin" />
                <div className={styles.brandText}>{"MICHELIN\nCAR SERVICE"}</div>
            </div>
        </header>

        {/* ===== 1. THÔNG TIN CHUNG ===== */}
        <div className={styles.infoSection}>

            {/* Cột Trái: Thông tin khách */}
            <div className={`${styles.infoColumn} ${styles.infoColumnLeft}`}>
                <div className={styles.infoRow}>
                    <div className={styles.infoLabel}>Họ tên:</div>
                    <div className={styles.infoDotted}>{safeText(customer?.name)}</div>
                </div>

                <div className={styles.infoRowSub}>
                    <div className={styles.infoLabel}>Điện thoại:</div>
                    <div className={styles.infoDotted}>{safeText(customer?.phone)}</div>
                    <div className={styles.infoLabel} style={{marginLeft: '6px'}}>E-mail:</div>
                    <div className={styles.infoDotted}>{safeText(customer?.email)}</div>
                </div>

                <div className={styles.infoRow}>
                    <div className={styles.infoLabel}>Ngày giờ nhận xe:</div>
                    <div className={styles.infoDotted}>{receivedAt}</div>
                </div>

                <div className={styles.safetyCheckRow}>
                    <div className={styles.infoLabel}>Kiểm tra an toàn:</div>
                    <div className={styles.inlineChecks}>
                        <span className={styles.checkItem}>
                            <span className={styles.checkBoxSmall}>{hasSafetyEnabled ? '✓' : ''}</span> Có
                        </span>
                        <span className={styles.checkItem}>
                            <span className={styles.checkBoxSmall}>{!hasSafetyEnabled ? '✓' : ''}</span> Không
                        </span>
                    </div>
                </div>
            </div>

            {/* Cột Phải: Thông tin xe */}
            <div className={`${styles.infoColumn} ${styles.infoColumnRight}`}>
                <div className={styles.infoRow}>
                    <div className={styles.infoLabel}>Loại &amp; kiểu xe:</div>
                    <div className={styles.infoDotted}>{model}</div>
                </div>

                <div className={styles.infoRowSub}>
                    <div className={styles.infoLabel}>Biển số:</div>
                    <div className={styles.infoDotted}>{licensePlate}</div>
                    <div className={styles.infoLabel} style={{marginLeft: '6px'}}>Ki-lô-mét:</div>
                    <div className={styles.infoDotted}>{odometer}</div>
                </div>

                <div className={styles.infoRow}>
                    <div className={styles.infoLabel}>Ngày giờ giao xe:</div>
                    <div className={styles.infoDotted}>{handoverAt}</div>
                </div>
            </div>
        </div>

        {/* ===== 2. SƠ ĐỒ XE & BẢNG AN TOÀN ===== */}
        <div className={styles.middleSplit}>

            {/* Phần trái: 2 cụm thông số lốp — căn ngang bánh trước / bánh sau */}
            <div className={styles.leftTires}>
                {/* Cụm trước trái */}
                <div className={styles.tireClusterLeft}>
                    <div className={styles.tireClusterHeader}>
                        <span className={styles.tireClusterLabel}>Thông số lốp</span>
                    </div>
                    <div className={styles.tireClusterSize}>{buildTireSpec(tireFrontLeft)}</div>
                    <div className={styles.tireClusterRow}>
                        <div className={styles.tireClusterUnit}>mm</div>
                        <div className={styles.tireClusterValue}>{tireFrontLeft?.treadDepth != null ? tireFrontLeft.treadDepth : ''}</div>
                    </div>
                    <div className={styles.tireClusterRow}>
                        <div className={styles.tireClusterUnit}>kg/cm²</div>
                        <div className={styles.tireClusterValue}>{tireFrontLeft?.pressure != null ? tireFrontLeft.pressure : ''}</div>
                    </div>
                </div>

                {/* Cụm sau trái */}
                <div className={styles.tireClusterLeft}>
                    <div className={styles.tireClusterSize}>{buildTireSpec(tireRearLeft)}</div>
                    <div className={styles.tireClusterRow}>
                        <div className={styles.tireClusterUnit}>mm</div>
                        <div className={styles.tireClusterValue}>{tireRearLeft?.treadDepth != null ? tireRearLeft.treadDepth : ''}</div>
                    </div>
                    <div className={styles.tireClusterRow}>
                        <div className={styles.tireClusterUnit}>kg/cm²</div>
                        <div className={styles.tireClusterValue}>{tireRearLeft?.pressure != null ? tireRearLeft.pressure : ''}</div>
                    </div>
                </div>
            </div>

            {/* Phần giữa: Hình xe + Size lốp + Lưu ý */}
            <div className={styles.carArea}>
                {/* Hình xe */}
                <div className={styles.carBox}>
                    <CarDiagram src={carDiagramSrc} />
                </div>
                {/* Size lốp & Lưu ý nằm dưới đuôi xe, sát cả 2 bên */}
                <div className={styles.sizeNoteWrap}>
                    <div className={styles.sizeNoteRow}>
                        <span className={styles.infoLabel}>Size lốp khuyến cáo:</span>
                        <div className={styles.infoDotted}>{recommendedTireSize}</div>
                    </div>
                    <div className={styles.sizeNoteRow}>
                        <span className={styles.infoLabel}>Lưu ý:</span>
                        <div className={styles.infoDotted}>{technicianNotes}</div>
                    </div>
                </div>
            </div>

            {/* Phần phải: 3 cụm áp suất + nhãn xoay dọc */}
            <div className={styles.rightPressures}>
                <div className={styles.pressureClustersWrap}>
                    <div className={styles.pressureCluster}>
                        <div className={styles.pressureClusterUnit}>Trước</div>
                        <div className={styles.pressureClusterRow}>
                            <div className={styles.pressureUnit}>mm</div>
                            <div className={styles.pressureValue}>{tireFrontRight?.treadDepth != null ? tireFrontRight.treadDepth : ''}</div>
                        </div>
                        <div className={styles.pressureClusterRow}>
                            <div className={styles.pressureUnit}>kg/cm²</div>
                            <div className={styles.pressureValue}>{tireFrontRight?.pressure != null ? tireFrontRight.pressure : ''}</div>
                        </div>
                        <div className={styles.recommendedPressureValue}>{frontRecommendedPressure}</div>
                    </div>
                    <div className={styles.pressureCluster}>
                        <div className={styles.pressureClusterUnit}>Sau</div>
                        <div className={styles.pressureClusterRow}>
                            <div className={styles.pressureUnit}>mm</div>
                            <div className={styles.pressureValue}>{tireRearRight?.treadDepth != null ? tireRearRight.treadDepth : ''}</div>
                        </div>
                        <div className={styles.pressureClusterRow}>
                            <div className={styles.pressureUnit}>kg/cm²</div>
                            <div className={styles.pressureValue}>{tireRearRight?.pressure != null ? tireRearRight.pressure : ''}</div>
                        </div>
                        <div className={styles.recommendedPressureValue}>{rearRecommendedPressure}</div>
                    </div>
                    <div className={styles.pressureCluster}>
                        <div className={styles.pressureClusterUnit}>Dự phòng</div>
                        <div className={styles.pressureClusterRow}>
                            <div className={styles.pressureUnit}>mm</div>
                            <div className={styles.pressureValue}>{tireSpare?.treadDepth != null ? tireSpare.treadDepth : ''}</div>
                        </div>
                        <div className={styles.pressureClusterRow}>
                            <div className={styles.pressureUnit}>kg/cm²</div>
                            <div className={styles.pressureValue}>{tireSpare?.pressure != null ? tireSpare.pressure : ''}</div>
                        </div>
                        <div className={styles.recommendedPressureValue}>{spareRecommendedPressure}</div>
                    </div>
                </div>
                {/* Chữ xoay 90° nằm sát mép phải bên ngoài */}
                <div className={styles.pressureVerticalLabel}>Áp suất khuyến cáo</div>
            </div>

            {/* Cột phải: Bảng hạng mục kiểm tra an toàn */}
                <div className={styles.safetyBox}>
                    <div className={styles.safetyHeader}>
                    <div className={styles.safetyTitle}>HẠNG MỤC KIỂM TRA AN TOÀN</div>
                    <div className={styles.safetyCols}>
                        <div className={styles.safetyCol}>TỐT</div>
                        <div className={styles.safetyCol}>LƯU Ý</div>
                        <div className={styles.safetyCol}>THAY</div>
                    </div>
                    </div>
                <div className={styles.safetyBody}>
                    {displayItems.length > 0 ? displayItems.map((cat) => {
                        const key = getSafetyItemKey(cat) || `name:${normalizeCategoryName(getSafetyItemName(cat))}`;
                        const label = getSafetyItemName(cat);
                        const item = safetyItemsMap.get(key) || safetyItemsMap.get(`name:${normalizeCategoryName(label)}`);
                        const status = item?.itemStatus;
                        const isGood = status === 'GOOD';
                        const isWarning = status === 'WARNING';
                        const isReplace = status === 'REPLACE';
                        const advisorNote = getSafetyAdvisorNote(item);
                        return (
                            <div key={key || label} className={styles.safetyRow}>
                                <div className={styles.safetyItem}>
                                    {label}
                                    {advisorNote ? <span className={styles.safetyInlineNote}> ({advisorNote})</span> : null}
                                </div>
                                <div className={styles.safetyChecks}>
                                    {isGood ? <CheckedCell /> : <CheckboxCell />}
                                    {isWarning ? <CheckedCell /> : <CheckboxCell />}
                                    {isReplace ? <CheckedCell /> : <CheckboxCell />}
                                </div>
                            </div>
                        );
                    }) : (
                        (Array.isArray(safetyInspection?.items) ? safetyInspection.items : []).map((item, idx) => {
                            const status = item?.itemStatus;
                            const label = item?.categoryName || `Hạng mục ${idx + 1}`;
                            const isGood = status === 'GOOD';
                            const isWarning = status === 'WARNING';
                            const isReplace = status === 'REPLACE';
                            const advisorNote = getSafetyAdvisorNote(item);
                            return (
                                <div key={item?.itemId || item?.id || idx} className={styles.safetyRow}>
                                    <div className={styles.safetyItem}>
                                        {label}
                                        {advisorNote ? <span className={styles.safetyInlineNote}> ({advisorNote})</span> : null}
                                    </div>
                                    <div className={styles.safetyChecks}>
                                        {isGood ? <CheckedCell /> : <CheckboxCell />}
                                        {isWarning ? <CheckedCell /> : <CheckboxCell />}
                                        {isReplace ? <CheckedCell /> : <CheckboxCell />}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>

        {/* ===== 3. BẢNG DỊCH VỤ ===== */}
        <div className={styles.serviceTableWrap}>
            <table className={styles.serviceTable}>
                <thead>
                    <tr>
                        <th className={styles.thStt}>STT</th>
                        <th className={styles.thItem}>HẠNG MỤC</th>
                        <th className={styles.thDesc}>DIỄN GIẢI</th>
                        <th className={styles.thQty}>SL</th>
                        <th className={styles.thPrice}>ĐƠN GIÁ</th>
                        <th className={styles.thDiscount}>GIẢM GIÁ</th>
                        <th className={styles.thAmount}>THÀNH TIỀN</th>
                        <th className={styles.thKho}>KHO</th>
                    </tr>
                </thead>
                <tbody>
                    {firstPageServiceLineKeys.map((rowKey, idx) => {
                        const it = invoiceItems[idx] ?? null;
                        const label = it?.categoryName || '';
                        const desc = it?.itemName || '';
                        const qty = it?.quantity ? String(it.quantity) : '';
                        const price = it?.unitPrice ? formatCurrencyVnd(it.unitPrice) : '';
                        const discount = it?.discountAmount ? formatCurrencyVnd(it.discountAmount) : '';
                        const amount = it?.subTotal ? formatCurrencyVnd(it.subTotal) : '';
                        const warehouseName = it?.warehouseName || '';
                        const taxIncludedNote = it?.taxIncludedNote || '';
                        const warehouseClassName = warehouseName.length > 28
                            ? `${styles.tdWarehouse} ${styles.tdWarehouseLong}`
                            : styles.tdWarehouse;
                        return (
                            <tr key={rowKey} className={it?.isGift ? styles.giftRow : undefined}>
                                <td className={styles.tdCenter}>{String(idx + 1).padStart(2, '0')}</td>
                                <td>{label}</td>
                                <td>{desc}</td>
                                <td className={styles.tdCenter}>{qty}</td>
                                <td className={styles.tdRight}>{price}</td>
                                <td className={styles.tdRight}>{discount}</td>
                                <td className={`${styles.tdRight} ${styles.amountCell}`}>
                                    <div>{amount}</div>
                                    {taxIncludedNote ? <div className={styles.taxIncludedNote}>{taxIncludedNote}</div> : null}
                                </td>
                                <td className={warehouseClassName} title={warehouseName}>{warehouseName}</td>
                            </tr>
                        );
                    })}
                    {/* Dòng TỔNG CỘNG */}
                    <tr>
                        <td colSpan={6} className={styles.totalLabel}>TỔNG CỘNG</td>
                        <td className={`${styles.tdRight} ${styles.tdTotalValue}`}>{formatCurrencyVnd(total)}</td>
                        <td />
                    </tr>
                </tbody>
            </table>
        </div>

        {/* ===== 4. FOOTER ===== */}
        <div className={styles.footer}>
            <div className={`${styles.recommendation} ${styles.recommendationLine}`}>
                <div className={styles.footerTitle}>Khuyến nghị:</div>
                <div className={styles.legalText}>
                    {safeText(ticket?.recommendation || '')}
                </div>
            </div>

            <div className={`${styles.recommendation} ${styles.privacyNotice}`}>
                <div className={styles.legalText}>
                    <span className={styles.checkBoxSmall} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                    {' '}
                    Tôi đồng ý rằng bất kỳ dữ liệu cá nhân nào được cung cấp theo mẫu này có thể được thu thập và xử lý bởi Michelin Việt Nam (Công Ty) và bất kỳ công ty nào thuộc tập đoàn Michelin (có thể nằm ngoài Việt Nam), nhằm mục đích cải thiện chất lượng dịch vụ và tiếp thị. Tôi đồng ý thêm rằng Công Ty có thể liên hệ với tôi (i) để nhận phản hồi về chất lượng dịch vụ cũng như (ii) cung cấp cho tôi về các sản phẩm, dịch vụ và khuyến mại của Michelin. Tôi cũng đồng ý rằng Công Ty chỉ chuyển dữ liệu cá nhân cho các nhà cung cấp dịch vụ và / hoặc chi nhánh của Michelin tại Việt Nam hoặc bên ngoài Việt Nam.
                    Công Ty sẽ xử lý dữ liệu cá nhân của bạn theo Chính sách bảo mật của Michelin (https://www.michelin.vn/privacy-policy). Vui lòng liên hệ với công ty theo số hotline + 84 28 3942 1111 nếu bạn muốn giới hạn việc chúng tôi xử lý, truy cập hoặc chỉnh sửa dữ liệu của bạn"
                </div>
            </div>

            {/* Chữ ký */}
            <div className={styles.signRow}>
                <div className={styles.signCol}>
                    <div className={styles.signTitle}>Đại lý</div>
                    <div className={styles.signHint}>(Ký tên)</div>
                    <div className={styles.signLine} />
                </div>
                <div className={styles.signCol}>
                    <div className={styles.signTitle}>Khách hàng</div>
                    <div className={styles.signHint}>(Ký tên)</div>
                    <div className={styles.signLine} />
                </div>
            </div>
        </div>

    </section>
    {hasOverflowServicePage ? (
        <section className={`${styles.sheet} ${styles.continuationSheet}`}>
            <header className={styles.continuationHeader}>
                <div className={styles.continuationTitle}>PHIẾU KIỂM TRA XE - TIẾP THEO</div>
                {ticketCode ? <div className={styles.continuationCode}>MÃ PHIẾU: {ticketCode}</div> : null}
            </header>
            {renderServiceTable(overflowServiceLineKeys, FIRST_PAGE_SERVICE_LINE_COUNT, true)}
            {renderFooter()}
        </section>
    ) : null}
    </>
    );
}

Receipt.propTypes = {
	ticket: PropTypes.shape({
		customer: PropTypes.shape({
			name: PropTypes.string,
			phone: PropTypes.string,
			email: PropTypes.string,
		}),
		vehicle: PropTypes.shape({
			model: PropTypes.string,
			licensePlate: PropTypes.string,
			odometerKm: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		}),
		receivedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
		handoverAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
		receivedAtDisplay: PropTypes.string,
		handoverAtDisplay: PropTypes.string,
		safetyInspectionEnabled: PropTypes.bool,
		recommendation: PropTypes.string,
        invoice: PropTypes.shape({
            items: PropTypes.arrayOf(
                PropTypes.shape({
                    key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
                    categoryName: PropTypes.string,
                    itemName: PropTypes.string,
                    warehouseName: PropTypes.string,
                    quantity: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
                    unitPrice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
                    discountAmount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
                    discount_amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
                    subTotal: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
                    taxRateText: PropTypes.string,
                    taxAmount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
                    appliedTaxRate: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
                    isGift: PropTypes.bool,
                    is_gift: PropTypes.bool,
                }),
            ),
            subtotal: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            discountAmount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            vatRate: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            vatAmount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            total: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            promotionLabel: PropTypes.string,
        }),
		defaultCategories: PropTypes.arrayOf(PropTypes.shape({
			id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
			workCategoryId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
			categoryName: PropTypes.string,
			displayName: PropTypes.string,
		})),
		safetyInspection: PropTypes.shape({
			recommendedTireSize: PropTypes.string,
			technicianNotes: PropTypes.string,
			frontRecommendedPressure: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
			rearRecommendedPressure: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
			spareRecommendedPressure: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
			tires: PropTypes.arrayOf(PropTypes.shape({
				tirePosition: PropTypes.string,
				tireSpecification: PropTypes.string,
				treadDepth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
				pressure: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
				recommendedPressure: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
			})),
			items: PropTypes.arrayOf(PropTypes.shape({
				workCategoryId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
				customCategoryId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
				categoryName: PropTypes.string,
				itemStatus: PropTypes.string,
			})),
            inspectionStatus: PropTypes.string,
		}),
	}),
	carDiagramSrc: PropTypes.string,
};

CarDiagram.propTypes = {
	src: PropTypes.string,
};
