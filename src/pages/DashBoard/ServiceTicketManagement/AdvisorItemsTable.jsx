import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import PropTypes from 'prop-types';
import styles from './ServiceTicketDetail.module.css';
import { validateTaxName, validateTaxRatePercent, validateTextInput } from '../../../components/inputValidation.js';
import {
    formatCurrencyVnd,
    isDraftRowEmpty,
    toIdOrNull,
    useAdvisorItemsTableHandlers,
} from './useAdvisorItemsTableHandlers.js';
import CatalogPicker from './CatalogPicker.jsx';

const ADD_SERVICE_RESTORE_STORAGE_PREFIX = 'serviceTicketAddServicePending:';

function normalizeSuggestionText(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replaceAll(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function readAddServicePendingSnapshot(serviceTicketId) {
    const id = serviceTicketId == null ? '' : String(serviceTicketId).trim();
    if (!id) return null;
    try {
        const raw = localStorage.getItem(`${ADD_SERVICE_RESTORE_STORAGE_PREFIX}${id}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
}

function CategorySuggestDropdownPortal({ open, anchorRef, items, disabled, onPick, onClose }) {
    const dropdownRef = useRef(null);
    const [pos, setPos] = useState(null);

    useEffect(() => {
        if (!open) return undefined;

        const update = () => {
            const el = anchorRef?.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            setPos({
                left: rect.left,
                top: rect.bottom + 6,
                width: rect.width,
            });
        };

        update();
        globalThis.addEventListener?.('resize', update);
        // capture scroll from any scroll container
        globalThis.addEventListener?.('scroll', update, true);

        return () => {
            globalThis.removeEventListener?.('resize', update);
            globalThis.removeEventListener?.('scroll', update, true);
        };
    }, [open, anchorRef]);

    useEffect(() => {
        if (!open) return undefined;

        const onPointerDown = (e) => {
            const anchor = anchorRef?.current;
            const dropdown = dropdownRef.current;
            const target = e?.target;
            if (anchor && target && anchor.contains(target)) return;
            if (dropdown && target && dropdown.contains(target)) return;
            onClose?.();
        };

        globalThis.document?.addEventListener?.('pointerdown', onPointerDown);
        return () => {
            globalThis.document?.removeEventListener?.('pointerdown', onPointerDown);
        };
    }, [open, onClose, anchorRef]);

    if (!open) return null;
    if (!pos) return null;
    if (!Array.isArray(items) || items.length === 0) return null;

    const portalContainer = globalThis.document?.body;
    if (!portalContainer) return null;

    return createPortal(
        <div
            ref={dropdownRef}
            className={styles.categorySuggestList}
            style={{
                position: 'fixed',
                left: pos.left,
                top: pos.top,
                width: pos.width,
                zIndex: 9999,
            }}
        >
            {items.map((label) => (
                <button
                    key={label}
                    type="button"
                    className={styles.categorySuggestItem}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                        if (disabled) return;
                        onPick?.(label);
                        onClose?.();
                    }}
                    disabled={disabled}
                >
                    {label}
                </button>
            ))}
        </div>,
        portalContainer,
    );
}

CategorySuggestDropdownPortal.propTypes = {
    open: PropTypes.bool,
    anchorRef: PropTypes.object,
    items: PropTypes.array,
    disabled: PropTypes.bool,
    onPick: PropTypes.func,
    onClose: PropTypes.func,
};

function formatTaxRatePercent(rule) {
    const raw = rule?.taxRate ?? rule?.rate;
    const n = typeof raw === 'number' ? raw : Number(String(raw ?? '').trim());
    if (!Number.isFinite(n)) return '';
    let rate = n;
    if (rate > 1) rate = rate / 100;
    if (rate < 0) rate = 0;
    const pct = rate * 100;
    const text = pct.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
    return `${text}%`;
}

function getTaxRuleSelectLabel(rule) {
    if (!rule) return '';
    const name = String(rule?.taxName ?? rule?.name ?? '').trim();
    const code = String(rule?.taxCode ?? rule?.code ?? '').trim();
    const label = name || code;
    const rateText = formatTaxRatePercent(rule);
    if (label && rateText) return `${label} (${rateText})`;
    return label || rateText;
}

function getTaxRuleDisplayLabel(rule) {
    if (!rule) return '';
    return getTaxRuleSelectLabel(rule);
}

function getStockAllocationDisplay(status) {
    const normalized = String(status || '').trim().toUpperCase();
    if (normalized === 'COMMITTED') return 'Đã xuất hàng';
    if (normalized === 'RESERVED') return 'Đang giữ hàng';
    return '-';
}

function TaxRuleQuickAdd({
    show,
    isAddingNewTaxRule,
    taxRulesLoading,
    isSaving,
    isCreatingTaxRule,
    taxName,
    setTaxName,
    taxRate,
    setTaxRate,
    startAddNewTaxRule,
    stopAddNewTaxRule,
    handleCreateTaxRule,
}) {
    const taxNameValidation = validateTaxName(taxName, { required: true });
    const taxRateValidation = validateTaxRatePercent(taxRate, { required: true });
    const taxHasError = Boolean(taxNameValidation.error || taxRateValidation.error);

    if (!show) return null;

    return (
        <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div style={{ fontWeight: 600 }}>Thuế</div>
                {isAddingNewTaxRule ? (
                    <div className="ui-actions" style={{ marginTop: 0 }}>
                        <button
                            type="button"
                            className="ui-btn ui-btn--primary"
                            onClick={handleCreateTaxRule}
                            disabled={isCreatingTaxRule || isSaving || taxHasError}
                        >
                            {isCreatingTaxRule ? 'Đang thêm...' : 'Xác nhận thêm thuế'}
                        </button>
                        <button
                            type="button"
                            className="ui-btn ui-btn--ghost"
                            onClick={stopAddNewTaxRule}
                            disabled={isCreatingTaxRule || isSaving}
                        >
                            Hủy
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        className="ui-btn ui-btn--ghost"
                        onClick={startAddNewTaxRule}
                        disabled={taxRulesLoading || isSaving}
                    >
                        Thêm thuế
                    </button>
                )}
            </div>

            {isAddingNewTaxRule ? (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginTop: 10 }}>
                    <div className="ui-field" style={{ marginBottom: 0 }}>
                        <label htmlFor="estimate-tax-name">Tên thuế (mới)</label>
                        <input
                            id="estimate-tax-name"
                            value={taxName}
                            onChange={(e) => setTaxName(e.target.value)}
                            placeholder="Nhập tên thuế"
                            autoComplete="off"
                            disabled={isCreatingTaxRule || isSaving}
                        />
                        {taxNameValidation.error ? (
                            <div style={{ marginTop: 6, fontSize: 12, color: '#991b1b' }}>{taxNameValidation.error}</div>
                        ) : null}
                    </div>
                    <div className="ui-field" style={{ marginBottom: 0 }}>
                        <label htmlFor="estimate-tax-rate">Thuế suất</label>
                        <input
                            id="estimate-tax-rate"
                            type="number"
                            step="0.01"
                            value={taxRate}
                            onChange={(e) => setTaxRate(e.target.value)}
                            placeholder="0"
                            disabled={isCreatingTaxRule || isSaving}
                        />
                        {taxRateValidation.error ? (
                            <div style={{ marginTop: 6, fontSize: 12, color: '#991b1b' }}>{taxRateValidation.error}</div>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

TaxRuleQuickAdd.propTypes = {
    show: PropTypes.bool,
    isAddingNewTaxRule: PropTypes.bool,
    taxRulesLoading: PropTypes.bool,
    isSaving: PropTypes.bool,
    isCreatingTaxRule: PropTypes.bool,
    taxName: PropTypes.string,
    setTaxName: PropTypes.func,
    taxRate: PropTypes.string,
    setTaxRate: PropTypes.func,
    startAddNewTaxRule: PropTypes.func,
    stopAddNewTaxRule: PropTypes.func,
    handleCreateTaxRule: PropTypes.func,
};

function EstimateItemRow({
    row,
    idx,
    showInputs,
    onChange,
    onClearRow,
    isSaving,
    categorySuggestions,
    taxRulesLoading,
    taxRules,
    taxRuleById,
    isEditing,
    softDeleteEditRow,
    openCatalogPicker,
    showTaxColumn,
    showDiscountColumn,
}) {
    const giftRaw = row?.isGift ?? row?.is_gift;
    const isGift = giftRaw === true || String(giftRaw ?? '').trim().toLowerCase() === 'true';
    const isLocked = Boolean(row?.isLockedFromPreviousVersion) || isGift;
    const allowInputs = showInputs && !isLocked;

    const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
    const categoryInputRef = useRef(null);

    const filteredCategorySuggestions = useMemo(() => {
        const list = Array.isArray(categorySuggestions) ? categorySuggestions : [];
        const q = normalizeSuggestionText(row.newCategoryName).trim();
        if (!q) return list.slice(0, 50);
        return list.filter((label) => normalizeSuggestionText(label).includes(q)).slice(0, 50);
    }, [categorySuggestions, row.newCategoryName]);

    const categoryFilled =
        Boolean(String(row?.newCategoryName ?? row?.categoryName ?? '').trim()) || Boolean(toIdOrNull(row?.workCategoryId));
    const allowItemActions = allowInputs && categoryFilled;

    const stt = String(idx + 1).padStart(2, '0');
    const manualTaxRuleId = toIdOrNull(row?.taxRuleId);
    const itemTaxRuleId = toIdOrNull(row?.itemTaxRuleId);
    const categoryTaxRuleId = toIdOrNull(row?.workCategoryTaxRuleId);

    // Business rule: ưu tiên thuế sản phẩm; nếu không có mới lấy thuế hạng mục;
    // chỉ khi cả 2 đều null mới dùng thuế thủ công.
    const effectiveTaxRuleId = itemTaxRuleId || categoryTaxRuleId || manualTaxRuleId;
    const taxRule = effectiveTaxRuleId ? taxRuleById.get(effectiveTaxRuleId) : null;
    const taxLabel = getTaxRuleDisplayLabel(taxRule);
    const isPredefinedCategory = Boolean(toIdOrNull(row?.workCategoryId));
    const subTotalValue = effectiveTaxRuleId ? (row?.subTotalWithVat ?? row?.subTotal) : row?.subTotal;
    const amountDisplayValue = showInputs ? subTotalValue : (row?.finalPriceDisplay ?? row?.subTotalDisplay ?? row?.subTotal);
    const discountAmountValue = Number(row?.discountAmount ?? 0);
    const shouldShowTaxDropdown = allowInputs && !itemTaxRuleId && !categoryTaxRuleId;

    const unitText = String(row?.unit ?? '').trim();
    const warehouseText = String(
        row?.warehouseName ?? row?.warehouse?.warehouseName ?? row?.warehouse?.name ?? '',
    ).trim();
    const stockAllocationText = getStockAllocationDisplay(row?.stockAllocationStatus);

    let itemPlaceholder = 'Diễn giải';
    if (categoryFilled) {
        if (isPredefinedCategory) itemPlaceholder = 'Chọn sản phẩm ';
    } else {
        itemPlaceholder = 'Nhập hạng mục trước';
    }

    return (
        <tr key={`advisor-row-${stt}-${row.key}`} className={isGift ? styles.giftRow : undefined}>
            <td>{stt}</td>
            <td>
                {allowInputs ? (
                    <>
                        <input
                            ref={categoryInputRef}
                            className={styles.tableInput}
                            value={row.newCategoryName}
                            onChange={(e) => {
                                onChange(idx, 'newCategoryName', e.target.value);
                                setCategoryDropdownOpen(true);
                            }}
                            onFocus={() => setCategoryDropdownOpen(true)}
                            placeholder="Hạng mục"
                            autoComplete="off"
                            disabled={isSaving}
                        />
                        <CategorySuggestDropdownPortal
                            open={categoryDropdownOpen && !isSaving}
                            anchorRef={categoryInputRef}
                            items={filteredCategorySuggestions}
                            disabled={isSaving}
                            onPick={(label) => onChange(idx, 'newCategoryName', label)}
                            onClose={() => setCategoryDropdownOpen(false)}
                        />
                    </>
                ) : (
                    row.categoryName || row.newCategoryName || ''
                )}
            </td>
            <td>
                {allowInputs ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                            className={styles.tableInput}
                            value={row.itemName ?? ''}
                            placeholder={itemPlaceholder}
                            readOnly={isPredefinedCategory}
                            onChange={
                                !allowItemActions || isPredefinedCategory
                                    ? undefined
                                    : (e) => onChange(idx, 'itemName', e.target.value)
                            }
                            disabled={isSaving || !allowItemActions}
                        />
                        <button
                            type="button"
                            className={`ui-btn ui-btn--ghost ${styles.pickButtonNoWrap}`}
                            onClick={() => openCatalogPicker(idx, row)}
                            disabled={isSaving || !allowItemActions}
                        >
                            Chọn
                        </button>
                    </div>
                ) : (
                    <div className={styles.itemNameCell}>
                        <span>{row.itemName || ''}</span>
                        {isGift ? <span className={styles.giftBadge}>Quà tặng</span> : null}
                    </div>
                )}
            </td>
            <td className={styles.tdNumber}>
                {allowInputs ? (
                    <div className={styles.qtyWithUnit}>
                        <input
                            className={`${styles.tableInput} ${styles.tableInputNumber}`}
                            type="text"
                            value={row.quantity}
                            onChange={(e) => onChange(idx, 'quantity', String(e.target.value || '').replaceAll(/\D/g, ''))}
                            placeholder="0"
                            disabled={isSaving}
                        />
                        {unitText ? (
                            <span className={styles.qtyUnit}>{unitText}</span>
                        ) : null}
                    </div>
                ) : (
                    <div className={styles.qtyWithUnit}>
                        <span>{row.quantity ?? ''}</span>
                        {unitText ? (
                            <span className={styles.qtyUnit}>{unitText}</span>
                        ) : null}
                    </div>
                )}
            </td>
            <td className={styles.tdNumber}>
                {allowInputs ? (
                    <input
                        className={`${styles.tableInput} ${styles.tableInputNumber}`}
                        type="text"
                        value={row.unitPrice}
                        onChange={(e) => {
                            const raw = String(e.target.value || '').replaceAll(/[^\d.]/g, '');
                            // Ensure only one decimal point
                            const parts = raw.split('.');
                            const sanitized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : raw;
                            onChange(idx, 'unitPrice', sanitized);
                        }}
                        placeholder="0"
                        disabled={isSaving}
                    />
                ) : (
                    isGift ? <span className={styles.giftAmount}>0đ</span> : formatCurrencyVnd(row.unitPriceDisplay ?? row.unitPrice)
                )}
            </td>
            {showDiscountColumn ? (
                <td className={styles.tdNumber}>
                    {Number.isFinite(discountAmountValue) && discountAmountValue > 0
                        ? formatCurrencyVnd(discountAmountValue)
                        : '-'}
                </td>
            ) : null}
            <td className={styles.tdNumber}>
                {isGift ? (
                    <span className={styles.giftAmount}>0đ</span>
                ) : (
                    formatCurrencyVnd(amountDisplayValue)
                )}
            </td>
            
            {showTaxColumn ? (
                <td>
                    {showInputs ? (
                        shouldShowTaxDropdown ? (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <select
                                    className={styles.tableInput}
                                    value={row.taxRuleId ?? ''}
                                    onChange={(e) => onChange(idx, 'taxRuleId', e.target.value)}
                                    disabled={isSaving || taxRulesLoading}
                                >
                                    <option value="">{taxRulesLoading ? 'Đang tải...' : 'Không áp dụng'}</option>
                                    {(Array.isArray(taxRules) ? taxRules : []).map((rule) => (
                                        <option key={String(rule?.taxRuleId ?? '')} value={String(rule?.taxRuleId ?? '')}>
                                            {getTaxRuleSelectLabel(rule) || `Tax #${rule?.taxRuleId}`}
                                        </option>
                                    ))}
                                </select>
                                {effectiveTaxRuleId && taxLabel ? (
                                    <span style={{ color: 'var(--ui-muted)', whiteSpace: 'nowrap' }}>{taxLabel}</span>
                                ) : null}
                            </div>
                        ) : (
                            taxLabel || ''
                        )
                    ) : (
                        taxLabel || ''
                    )}
                </td>
            ) : null}

            <td>{warehouseText || '-'}</td>
            {!showInputs ? <td>{stockAllocationText}</td> : null}
            {showInputs ? (
                <td className={styles.tdCenter}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        {allowInputs ? (
                            isEditing && toIdOrNull(row?.estimateItemId) ? (
                                <button
                                    type="button"
                                    className="ui-btn ui-btn--ghost"
                                    onClick={() => softDeleteEditRow(idx)}
                                    disabled={isSaving || !toIdOrNull(row?.estimateItemId) || isDraftRowEmpty(row) || isLocked}
                                    title="Xóa dòng này"
                                >
                                    Xóa
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="ui-btn ui-btn--ghost"
                                    onClick={() => onClearRow?.(idx)}
                                    disabled={isSaving}
                                    title="Xóa các ô đã nhập của dòng này"
                                >
                                    Xóa 
                                </button>
                            )
                        ) : null}
                    </div>
                </td>
            ) : null}
        </tr>
    );
}

EstimateItemRow.propTypes = {
    row: PropTypes.object,
    idx: PropTypes.number,
    showInputs: PropTypes.bool,
    onChange: PropTypes.func,
    onClearRow: PropTypes.func,
    isSaving: PropTypes.bool,
    categorySuggestions: PropTypes.array,
    taxRulesLoading: PropTypes.bool,
    taxRules: PropTypes.array,
    taxRuleById: PropTypes.object,
    isEditing: PropTypes.bool,
    softDeleteEditRow: PropTypes.func,
    openCatalogPicker: PropTypes.func,
    showTaxColumn: PropTypes.bool,
    showDiscountColumn: PropTypes.bool,
};

function EstimateActions({
    canCreateNew,
    canCreateNewVersion,
    createBusy,
    canEdit,
    isCreating,
    isEditing,
    isSaving,
    startCreate,
    startCreateNewVersion,
    startEdit,
    cancelCreate,
    cancelEdit,
    saveEstimate,
    saveEdit,
    isRestrictedStatus,
    onCancelAppendOnly,
    isAppendOnlyEdit,
    shouldRevertOnCancel,
    setShouldRevertOnCancel,
    shouldRevertTicketOnCancel,
    setShouldRevertTicketOnCancel,
    onCancelCreateNewVersion,
}) {
    const [cancelBusy, setCancelBusy] = useState(false);

    const handleCancelCreate = useCallback(async () => {
        if (cancelBusy) return;
        cancelCreate?.();

        const shouldRevertTicket = Boolean(shouldRevertTicketOnCancel && onCancelCreateNewVersion);
        const shouldRevertAppendOnly = Boolean(shouldRevertOnCancel && onCancelAppendOnly);
        if (!shouldRevertTicket && !shouldRevertAppendOnly) return;

        try {
            setCancelBusy(true);

            if (shouldRevertTicket) {
                await onCancelCreateNewVersion();
            }
            if (shouldRevertAppendOnly) {
                await onCancelAppendOnly();
            }
        } finally {
            setCancelBusy(false);
            setShouldRevertOnCancel?.(false);
            setShouldRevertTicketOnCancel?.(false);
        }
    }, [
        cancelBusy,
        cancelCreate,
        onCancelAppendOnly,
        onCancelCreateNewVersion,
        setShouldRevertOnCancel,
        setShouldRevertTicketOnCancel,
        shouldRevertOnCancel,
        shouldRevertTicketOnCancel,
    ]);

    const handleCancelEdit = useCallback(async () => {
        if (cancelBusy) return;
        cancelEdit?.();
        if ((!isAppendOnlyEdit && !shouldRevertOnCancel) || !onCancelAppendOnly) return;
        try {
            setCancelBusy(true);
            await onCancelAppendOnly();
        } finally {
            setCancelBusy(false);
            setShouldRevertOnCancel?.(false);
        }
    }, [cancelBusy, cancelEdit, isAppendOnlyEdit, onCancelAppendOnly, setShouldRevertOnCancel, shouldRevertOnCancel]);

    return (
        <>
            {canCreateNew ? (
                <div className="ui-actions" style={{ marginTop: 12 }}>
                    <button
                        type="button"
                        className="ui-btn ui-btn--primary"
                        onClick={startCreate}
                        disabled={Boolean(createBusy) || isSaving}
                    >
                        {createBusy ? 'Đang chuẩn bị...' : 'Tạo báo giá mới'}
                    </button>
                </div>
            ) : null}

            {canCreateNewVersion ? (
                <div className="ui-actions" style={{ marginTop: 12 }}>
                    <button
                        type="button"
                        className="ui-btn ui-btn--primary"
                        onClick={startCreateNewVersion}
                        disabled={Boolean(createBusy) || isSaving}
                    >
                        {createBusy ? 'Đang chuẩn bị...' : 'Tạo bản báo giá mới'}
                    </button>
                </div>
            ) : null}

            {/* CHỈ CÒN NÚT "SỬA BÁO GIÁ" NẾU ĐƯỢC PHÉP */}
            {!isCreating && !isEditing && !isRestrictedStatus ? (
                <div className="ui-actions" style={{ marginTop: 12 }}>
                    {canEdit ? (
                        <button type="button" className="ui-btn ui-btn--ghost" onClick={startEdit}>
                            Sửa báo giá
                        </button>
                    ) : null}
                </div>
            ) : null}

            {isCreating ? (
                <div className="ui-actions" style={{ marginTop: 12 }}>
                    <button type="button" className="ui-btn ui-btn--ghost" onClick={handleCancelCreate} disabled={isSaving || cancelBusy}>
                        Hủy
                    </button>
                    {isRestrictedStatus ? null : (
                        <button type="button" className="ui-btn ui-btn--primary" onClick={saveEstimate} disabled={isSaving}>
                            {isSaving ? 'Đang lưu...' : 'Lưu báo giá'}
                        </button>
                    )}
                </div>
            ) : null}

            {isEditing ? (
                <div className="ui-actions" style={{ marginTop: 12 }}>
                    <button type="button" className="ui-btn ui-btn--ghost" onClick={handleCancelEdit} disabled={isSaving || cancelBusy}>
                        Hủy
                    </button>
                    {isRestrictedStatus ? null : (
                        <button type="button" className="ui-btn ui-btn--primary" onClick={saveEdit} disabled={isSaving || cancelBusy}>
                            {isSaving ? 'Đang lưu...' : 'Lưu chỉnh sửa'}
                        </button>
                    )}
                </div>
            ) : null}
        </>
    );
}

EstimateActions.propTypes = {
    canCreateNew: PropTypes.bool,
    canCreateNewVersion: PropTypes.bool,
    createBusy: PropTypes.bool,
    canEdit: PropTypes.bool,
    isCreating: PropTypes.bool,
    isEditing: PropTypes.bool,
    isSaving: PropTypes.bool,
    startCreate: PropTypes.func,
    startCreateNewVersion: PropTypes.func,
    startEdit: PropTypes.func,
    cancelCreate: PropTypes.func,
    cancelEdit: PropTypes.func,
    saveEstimate: PropTypes.func,
    saveEdit: PropTypes.func,
    isRestrictedStatus: PropTypes.bool,
    onCancelAppendOnly: PropTypes.func,
    isAppendOnlyEdit: PropTypes.bool,
    shouldRevertOnCancel: PropTypes.bool,
    setShouldRevertOnCancel: PropTypes.func,
    shouldRevertTicketOnCancel: PropTypes.bool,
    setShouldRevertTicketOnCancel: PropTypes.func,
    onCancelCreateNewVersion: PropTypes.func,
};

export default function AdvisorItemsTable({
    className = '',
    serviceTicketId,
    ticketStatus,
    ticketPhotos,
    refreshToken,
    estimatedTimeDisplay,
    onEstimateStatusChange,
    onRestartWorkflow,
    onCancelCreateNewVersion,
    onCancelAppendOnly,
    onEstimateEditingChange,
    onBeforeEstimateMutate,
    readOnly = false,
    readOnlyMessage = '',
    hideReadOnlyNotice = false,
    title = 'Thông tin tư vấn',
    draftStorageKey,
    autoStartCreate = false,
    hideVehiclePhotos = false,
    hideRecommendation = false,
    hideEstimateSummary = false,
    hideEmptyTableBeforeCreate = false,
    disableFullEdit = false,
}) {
    const [revertOnCancel, setRevertOnCancel] = useState(false);
    const [revertTicketOnCancel, setRevertTicketOnCancel] = useState(false);
    const {
        categorySuggestions,
        workCategoriesLoading,
        taxRules,
        taxRulesLoading,
        taxRuleById,
        isAddingNewTaxRule,
        taxName,
        setTaxName,
        taxRate,
        setTaxRate,
        isCreatingTaxRule,
        startAddNewTaxRule,
        stopAddNewTaxRule,
        handleCreateTaxRule,
        recommendation,
        setRecommendation,
        recommendationSaving,
        saveRecommendation,
        isCreating,
        isEditing,
        isAppendOnlyEdit,
        isSaving,
        loadError,
        taxRulesError,
        workCategoriesError,
        saveError,
        estimateCostText,
        statusLine,
        footerTotalText,
        tableRows,
        showInputs,
        onChange,
        showAddEstimate,
        canEdit,
        startCreate,
        cancelCreate,
        startEdit,
        cancelEdit,
        saveEstimate,
        saveEdit,
        syncEstimate,
        softDeleteEditRow,
        estimate,
    } = useAdvisorItemsTableHandlers(serviceTicketId, {
        onEstimateStatusChange,
        refreshToken,
        draftStorageKey,
        autoStartCreate,
    });

    const showTaxColumn = isCreating || isEditing;
    const showDiscountColumn = !showInputs;
    const isReadOnly = Boolean(readOnly);
    const hasPendingAddServiceSnapshot = useMemo(() => {
        const snapshot = readAddServicePendingSnapshot(serviceTicketId);
        const previousEstimateStatus = String(snapshot?.prevEstimateStatus || '').trim().toUpperCase();
        return previousEstimateStatus === 'APPROVED';
    }, [serviceTicketId]);
    const errorLine = saveError || loadError || taxRulesError || workCategoriesError || '';
    const tableHasRows = Array.isArray(tableRows) && tableRows.length > 0;
    const shouldShowTable =
        !hideEmptyTableBeforeCreate ||
        tableHasRows ||
        Boolean(estimate) ||
        isCreating ||
        isEditing ||
        isReadOnly ||
        Boolean(errorLine);

    const footerSpacerColSpan =
        (showTaxColumn ? 1 : 0) +
        1 +
        (!showInputs ? 1 : 0) +
        (showInputs ? 1 : 0);

    const RECOMMEND_MAX_LENGTH = 255;
    const recommendationValidation = useMemo(
        () =>
            validateTextInput(recommendation, {
                fieldLabel: 'Khuyến nghị',
                required: false,
                trim: false,
                maxLength: RECOMMEND_MAX_LENGTH,
            }),
        [recommendation],
    );
    const recommendationRemaining = RECOMMEND_MAX_LENGTH - String(recommendation ?? '').length;
    const recommendationHasError = Boolean(recommendationValidation?.error);

    // Let parent know whether estimate is currently being created/edited/saved.
    // Used to hide actions like "Xác nhận báo giá" until user presses Save successfully.
    useEffect(() => {
        try {
            onEstimateEditingChange?.(Boolean(isCreating || isEditing || isSaving));
        } catch {
            // ignore
        }

        return () => {
            try {
                onEstimateEditingChange?.(false);
            } catch {
                // ignore
            }
        };
    }, [isCreating, isEditing, isSaving, onEstimateEditingChange]);

    const currentEstimateStatus = String(estimate?.estimateStatus || estimate?.status || '').trim().toUpperCase();
    const canVersionFromCurrentEstimate = currentEstimateStatus === 'SENT' || currentEstimateStatus === 'APPROVED';
    // Khi đang tạo mới / đang chỉnh sửa, chúng ta không bị hạn chế bởi status của báo giá cũ
    const isRestrictedStatus = !(isCreating || isEditing) && ['APPROVED', 'REJECTED', 'ARCHIVED', 'CANCELLED'].includes(currentEstimateStatus);

    // Cho phép tạo mới nếu chưa có báo giá.
    const ticketStatusUpper = String(ticketStatus || '').trim().toUpperCase();
    const isTicketPaid = ticketStatusUpper === 'PAID';
    const isTicketCancelled = ['CANCELLED', 'CANCELED', 'CANCEL'].includes(ticketStatusUpper);
    const isTicketLocked = isTicketPaid || isTicketCancelled;
    // "Tạo báo giá mới" chỉ dành cho trường hợp chưa có bất kì báo giá nào.
    const canCreateNew = !isReadOnly && !isCreating && !isEditing && showAddEstimate && !isTicketLocked;

    // "Tạo version báo giá mới" dành cho báo giá đã gửi hoặc đã xác nhận.
    // ARCHIVED tương ứng đã có bill và bị khóa ở parent, không cho tạo version mới.
    const canCreateNewVersion = !isReadOnly && !isCreating && !isEditing && Boolean(estimate) && canVersionFromCurrentEstimate && !isTicketLocked;

    const notify = useCallback((message) => toast(message, { containerId: 'app-toast' }), []);

    const [isStartingCreate, setIsStartingCreate] = useState(false);

    const handleStartCreate = async () => {
        if (isStartingCreate) return;
        if (isReadOnly) {
            notify(readOnlyMessage || 'Phiếu đang ở chế độ chỉ xem.');
            return;
        }
        if (isTicketLocked) {
            notify('Không thể tạo báo giá khi phiếu dịch vụ đã bị khóa (PAID/CANCELLED).');
            return;
        }
		setRevertOnCancel(false);
		setRevertTicketOnCancel(false);
        try {
            const cleanEstimate = await onBeforeEstimateMutate?.();
            if (cleanEstimate !== undefined) syncEstimate?.(cleanEstimate);
            if (startCreate) startCreate(cleanEstimate !== undefined ? { estimateOverride: cleanEstimate } : undefined);
        } catch {
            return;
        }
    };

    const handleStartCreateNewVersion = async () => {
        if (isStartingCreate) return;
        if (isReadOnly) {
            notify(readOnlyMessage || 'Phiếu đang ở chế độ chỉ xem.');
            return;
        }
        if (isTicketLocked) {
            notify('Không thể tạo báo giá khi phiếu dịch vụ đã bị khóa (PAID/CANCELLED).');
            return;
        }
		setRevertOnCancel(false);
        setRevertTicketOnCancel(true);
        try {
            const seedEstimate = await onBeforeEstimateMutate?.({
                promotionTypesToUnapply: ['PERCENT'],
                resetPromotionSelection: true,
            });
            if (seedEstimate !== undefined) syncEstimate?.(seedEstimate);
            startCreate?.(
                seedEstimate !== undefined
                    ? { seedFromPreviousEstimate: true, estimateOverride: seedEstimate }
                    : { seedFromPreviousEstimate: true },
            );
        } catch {
            setRevertTicketOnCancel(false);
            return;
        }

        if (!onRestartWorkflow) return;

        try {
            setIsStartingCreate(true);
            notify('Đang chuẩn bị tạo bản báo giá mới...');
            // Đẩy ServiceTicket về ESTIMATED trước khi tạo Estimate mới (backend không cho phép DRAFT)
            await onRestartWorkflow();
        } catch {
            setRevertTicketOnCancel(false);
            cancelCreate?.();
        } finally {
            setIsStartingCreate(false);
        }
    };

    useEffect(() => {
        if (!isCreating) {
            setRevertTicketOnCancel(false);
        }
    }, [isCreating]);

    // Ensure create mode can be opened automatically after the ticket is restarted/refreshed.
    useEffect(() => {
        const handler = async () => {
            if (isReadOnly) return;
            if (isTicketLocked) {
                notify('Không thể tạo báo giá khi phiếu dịch vụ đã bị khóa (PAID/CANCELLED).');
                return;
            }
            if (isCreating || isEditing) return;
            try {
                const cleanEstimate = await onBeforeEstimateMutate?.();
                if (cleanEstimate !== undefined) syncEstimate?.(cleanEstimate);
                startCreate?.(cleanEstimate !== undefined ? { estimateOverride: cleanEstimate } : undefined);
            } catch {
                return;
            }
        };

        try {
            globalThis.addEventListener('startCreateEstimate', handler);
        } catch {
            return undefined;
        }

        return () => {
            try {
                globalThis.removeEventListener('startCreateEstimate', handler);
            } catch {
                // ignore
            }
        };
    }, [isReadOnly, isTicketLocked, isCreating, isEditing, notify, onBeforeEstimateMutate, startCreate, syncEstimate]);

    // Ensure append-only edit mode can be opened automatically (add service: keep current estimate version,
    // lock existing rows, only allow adding new rows).
    useEffect(() => {
        const handler = async () => {
            if (isReadOnly) return;
            if (isTicketLocked) {
                notify('Không thể sửa báo giá khi phiếu dịch vụ đã bị khóa (PAID/CANCELLED).');
                return;
            }
            if (isCreating || isEditing) return;
			setRevertOnCancel(true);

            // If there is no estimate yet, fall back to create mode.
            if (!estimate) {
                try {
                    const cleanEstimate = await onBeforeEstimateMutate?.();
                    if (cleanEstimate !== undefined) syncEstimate?.(cleanEstimate);
                    startCreate?.(cleanEstimate !== undefined ? { estimateOverride: cleanEstimate } : undefined);
                } catch {
                    return;
                }
                return;
            }

            try {
                const cleanEstimate = await onBeforeEstimateMutate?.();
                if (cleanEstimate !== undefined) syncEstimate?.(cleanEstimate);
                startEdit?.(
                    cleanEstimate !== undefined
                        ? { appendOnly: true, estimateOverride: cleanEstimate }
                        : { appendOnly: true },
                );
            } catch {
                return;
            }
        };

        try {
            globalThis.addEventListener('startAppendEstimate', handler);
        } catch {
            return undefined;
        }

        return () => {
            try {
                globalThis.removeEventListener('startAppendEstimate', handler);
            } catch {
                // ignore
            }
        };
    }, [estimate, isReadOnly, isTicketLocked, isCreating, isEditing, notify, onBeforeEstimateMutate, startCreate, startEdit, syncEstimate]);

    const handleStartEdit = useCallback(async () => {
        if (isReadOnly) {
            notify(readOnlyMessage || 'Phiếu đang ở chế độ chỉ xem.');
            return;
        }
        setRevertOnCancel(false);
        try {
            const cleanEstimate = await onBeforeEstimateMutate?.();
            if (cleanEstimate !== undefined) syncEstimate?.(cleanEstimate);
            startEdit?.(cleanEstimate !== undefined ? { estimateOverride: cleanEstimate } : undefined);
        } catch {
            return;
        }
    }, [isReadOnly, notify, onBeforeEstimateMutate, readOnlyMessage, startEdit, syncEstimate]);

    const [pickerOpen, setPickerOpen] = useState(false);
    const [activeRowIndex, setActiveRowIndex] = useState(null);

    const selectedProductWarehouseKeys = useMemo(() => {
        const keys = new Set();
        const rows = Array.isArray(tableRows) ? tableRows : [];
        for (const r of rows) {
            // Only count rows that are actually editable in current mode.
            // Locked rows (seeded from previous estimate version) should not lock selection.
            if (r?.isLockedFromPreviousVersion) continue;
            const giftRaw = r?.isGift ?? r?.is_gift;
            if (giftRaw === true || String(giftRaw ?? '').trim().toLowerCase() === 'true') continue;
            const itemId = toIdOrNull(r?.itemId);
            if (!itemId) continue;
            const warehouseId = toIdOrNull(r?.warehouseId);
            const key = `${itemId}|${warehouseId ?? ''}`;
            keys.add(key);
        }
        return keys;
    }, [tableRows]);

    const activeRowSelectionKey = useMemo(() => {
        if (activeRowIndex == null) return null;
        const row = Array.isArray(tableRows) ? tableRows[activeRowIndex] : null;
        const itemId = toIdOrNull(row?.itemId);
        if (!itemId) return null;
        const warehouseId = toIdOrNull(row?.warehouseId);
        return `${itemId}|${warehouseId ?? ''}`;
    }, [activeRowIndex, tableRows]);

    // Lưu categoryCode để truyền vào CatalogPicker
    const [pickerCategoryCode, setPickerCategoryCode] = useState("");
    const [pickerInitQuery, setPickerInitQuery] = useState("");

    const openCatalogPicker = (rowIndex, rowObj) => {
        const giftRaw = rowObj?.isGift ?? rowObj?.is_gift;
        if (giftRaw === true || String(giftRaw ?? '').trim().toLowerCase() === 'true') return;
        const hasCategory =
            Boolean(String(rowObj?.newCategoryName ?? rowObj?.categoryName ?? '').trim()) || Boolean(toIdOrNull(rowObj?.workCategoryId));
        if (!hasCategory) {
            notify('Vui lòng nhập/chọn hạng mục trước khi thao tác diễn giải hoặc chọn sản phẩm.');
            return;
        }
        setActiveRowIndex(rowIndex);
        // Lấy categoryCode từ dòng (đã map từ workCategory)
        const code = String(rowObj?.workCategoryCode ?? '').trim();
        setPickerCategoryCode(code || "");
        // Không nhét categoryCode vào ô search; chỉ truyền qua query param categoryCode.
        setPickerInitQuery("");
        setPickerOpen(true);
    };

    const closeCatalogPicker = () => {
        setPickerOpen(false);
        setActiveRowIndex(null);
        setPickerInitQuery("");
    };

    const handleClearRowInputs = useCallback((rowIndex) => {
        if (!showInputs) return;
        if (rowIndex == null) return;

        const row = Array.isArray(tableRows) ? tableRows[rowIndex] : null;
        const giftRaw = row?.isGift ?? row?.is_gift;
        if (!row || row?.isLockedFromPreviousVersion || giftRaw === true || String(giftRaw ?? '').trim().toLowerCase() === 'true') return;

        if (activeRowIndex === rowIndex) {
            setPickerOpen(false);
            setActiveRowIndex(null);
            setPickerInitQuery("");
        }

        onChange(rowIndex, 'newCategoryName', '');
        onChange(rowIndex, 'workCategoryId', '');
        onChange(rowIndex, 'workCategoryCode', '');

        onChange(rowIndex, 'itemId', '');
        onChange(rowIndex, 'itemName', '');
        onChange(rowIndex, 'unit', '');

        onChange(rowIndex, 'quantity', '');
        onChange(rowIndex, 'unitPrice', '');

        onChange(rowIndex, 'warehouseId', '');
        onChange(rowIndex, 'warehouseName', '');
        onChange(rowIndex, 'warehouseAvailableQuantity', null);

        onChange(rowIndex, 'taxRuleId', '');
        onChange(rowIndex, 'itemTaxRuleId', '');

    }, [activeRowIndex, onChange, showInputs, tableRows]);

    const handlePickCatalogItem = (item) => {
        if (activeRowIndex == null) return;
        const id = item?.itemId ?? item?.id ?? null;
        const name = item?.itemName ?? item?.name ?? '';
        const price = item?.sellingPrice ?? item?.price ?? item?.unitPrice ?? item?.unit_price ?? '';
        const unit = String(item?.unit ?? '').trim();
        const warehouseId = item?.warehouseId ?? item?.selectedWarehouse?.warehouseId ?? null;
        const warehouseName = String(
            item?.warehouseName ??
            item?.selectedWarehouse?.warehouseName ??
            item?.selectedWarehouse?.name ??
            '',
        ).trim();
        const availableQtyRaw =
            item?.availableQuantity ??
            item?.selectedWarehouse?.quantity ??
            item?.selectedWarehouse?.availableQuantity ??
            null;
        const availableQtyNum =
            typeof availableQtyRaw === 'number' ? availableQtyRaw : Number(String(availableQtyRaw ?? '').trim());
        const rawTaxId = item?.taxRuleId ?? item?.tax_rule_id ?? item?.taxRule?.taxRuleId ?? item?.taxRule?.id ?? '';
        onChange(activeRowIndex, 'itemId', id);
        onChange(activeRowIndex, 'itemName', name);
        onChange(activeRowIndex, 'unitPrice', price);
        onChange(activeRowIndex, 'unit', unit);
        if (warehouseId != null && String(warehouseId).trim() !== '') {
            onChange(activeRowIndex, 'warehouseId', warehouseId);
        } else {
            onChange(activeRowIndex, 'warehouseId', '');
        }
        onChange(activeRowIndex, 'warehouseName', warehouseName);
        if (Number.isFinite(availableQtyNum) && availableQtyNum >= 0) {
            onChange(activeRowIndex, 'warehouseAvailableQuantity', availableQtyNum);
        } else {
            onChange(activeRowIndex, 'warehouseAvailableQuantity', null);
        }
        onChange(activeRowIndex, 'itemTaxRuleId', rawTaxId == null ? '' : String(rawTaxId));

        // Nếu sản phẩm có thuế thì ưu tiên sản phẩm -> clear chọn thuế thủ công.
        const taxIdNum = toIdOrNull(rawTaxId);
        if (taxIdNum) onChange(activeRowIndex, 'taxRuleId', '');
        closeCatalogPicker();
    };

    const showTaxQuickAdd = !isTicketLocked && showInputs;

    const [photoPreview, setPhotoPreview] = useState(null);
    const closePhotoPreview = useCallback(() => setPhotoPreview(null), []);

    const conditionPhotos = useMemo(() => {
        const allowed = new Set(['FRONT', 'BACK', 'LEFT', 'RIGHT', 'OVERALL', 'DAMAGE']);
        const arr = Array.isArray(ticketPhotos) ? ticketPhotos : [];
        return arr.filter((p) => allowed.has(String(p?.category || '').toUpperCase()) && String(p?.url || '').trim() !== '');
    }, [ticketPhotos]);

    useEffect(() => {
        if (!photoPreview?.url) return undefined;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') closePhotoPreview();
        };
        try {
            globalThis.addEventListener('keydown', onKeyDown);
        } catch {
            return undefined;
        }
        return () => {
            try {
                globalThis.removeEventListener('keydown', onKeyDown);
            } catch {
                // ignore
            }
        };
    }, [photoPreview, closePhotoPreview]);

    return (
        <section className={`${styles.block}${className ? ` ${className}` : ''}`}>
            <h2 className={styles.blockTitle}>{title}</h2>


            {!hideVehiclePhotos || !hideEstimateSummary ? (
                <div className={styles.advisorStack}>
                    {!hideVehiclePhotos ? (
                        <div className={styles.advisorCard}>
                            <h3 className={styles.advisorTitle}>Ảnh tình trạng xe</h3>
                            {conditionPhotos.length > 0 ? (
                                <div className={styles.vehiclePhotoGrid}>
                                    {conditionPhotos.map((p, idx) => {
                                        const key = String(p?.photoId ?? `${p?.category || 'photo'}-${idx}`);
                                        const label = String(p?.label || p?.category || '').trim();
                                        const caption = label || (p?.description ? String(p.description) : `Ảnh ${idx + 1}`);
                                        return (
                                            <figure key={key} className={styles.vehiclePhotoCard}>
                                                <button
                                                    type="button"
                                                    className={styles.vehiclePhotoButton}
                                                    onClick={() => setPhotoPreview({ url: p?.url, caption })}
                                                    aria-label={`Phóng to: ${caption}`}
                                                >
                                                    <img
                                                        className={styles.vehiclePhotoImg}
                                                        src={p.url}
                                                        alt={caption}
                                                        loading="lazy"
                                                        referrerPolicy="no-referrer"
                                                    />
                                                </button>
                                                <figcaption className={styles.vehiclePhotoCaption}>{caption}</figcaption>
                                            </figure>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className={styles.noteBox}>-</div>
                            )}
                        </div>
                    ) : null}

                    {!hideEstimateSummary ? (
                        <div className={styles.advisorCard}>
                            <h3 className={styles.advisorTitle}>Ước tính</h3>
                            <div className={styles.kvList}>
                                <div className={styles.kvRow}>
                                    <span className={styles.kvLabel}>Thời gian ước tính hoàn tất:</span>
                                    <span className={styles.kvValue}>{estimatedTimeDisplay || '-'}</span>
                                </div>
                                <div className={styles.kvRow}>
                                    <span className={styles.kvLabel}>Chi phí dự kiến</span>
                                    <span className={styles.kvValue} style={{ fontWeight: 900 }}>
                                        {estimateCostText}
                                    </span>
                                </div>
                                <div className={styles.kvRow}>
                                    <span className={styles.kvLabel} />
                                    <span className={styles.kvValue} style={{ color: 'var(--ui-muted)' }}>
                                        {errorLine ? '' : statusLine}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            ) : null}
            <TaxRuleQuickAdd
                show={showTaxQuickAdd}
                isAddingNewTaxRule={isAddingNewTaxRule}
                taxRulesLoading={taxRulesLoading}
                isSaving={isSaving}
                isCreatingTaxRule={isCreatingTaxRule}
                taxName={taxName}
                setTaxName={setTaxName}
                taxRate={taxRate}
                setTaxRate={setTaxRate}
                startAddNewTaxRule={startAddNewTaxRule}
                stopAddNewTaxRule={stopAddNewTaxRule}
                handleCreateTaxRule={handleCreateTaxRule}
            />

            {shouldShowTable ? (
            <div className={styles.tableWrap}>
                {!hideReadOnlyNotice && isTicketPaid ? (
                <div className={styles.errorBanner} style={{ marginTop: 8 }}>
                    Phiếu dịch vụ đã được thanh toán — không thể tạo báo giá mới.
                </div>
            ) : !hideReadOnlyNotice && isReadOnly ? (
                <div className={styles.errorBanner} style={{ marginTop: 8 }}>
                    {readOnlyMessage || 'Phiếu đang ở chế độ chỉ xem.'}
                </div>
            ) : null}

                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th scope="col">STT</th>
                            <th scope="col">HẠNG MỤC</th>
                            <th scope="col">DIỄN GIẢI</th>
                            <th scope="col">SL</th>
                            <th scope="col">ĐƠN GIÁ</th>
                            {showDiscountColumn ? <th scope="col">GIẢM GIÁ</th> : null}
                            <th scope="col">THÀNH TIỀN</th>
                            {showTaxColumn ? <th scope="col">THUẾ </th> : null}
                            <th scope="col">KHO</th>
                            {!showInputs ? <th scope="col">XUẤT KHO</th> : null}
                            {showInputs ? <th scope="col">THAO TÁC</th> : null}
                        </tr>
                    </thead>
                    <tbody>
                        {tableRows.map((row, idx) => (
                            <EstimateItemRow
                                key={`advisor-row-${idx}-${row?.key ?? 'row'}`}
                                row={row}
                                idx={idx}
                                showInputs={showInputs}
                                showTaxColumn={showTaxColumn}
                                showDiscountColumn={showDiscountColumn}
                                onChange={onChange}
                                onClearRow={handleClearRowInputs}
                                isSaving={isSaving}
                                categorySuggestions={workCategoriesLoading ? [] : categorySuggestions}
                                taxRulesLoading={taxRulesLoading}
                                taxRules={taxRules}
                                taxRuleById={taxRuleById}
                                isEditing={isEditing}
                                softDeleteEditRow={softDeleteEditRow}
                                openCatalogPicker={openCatalogPicker}
                            />
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td className={styles.tableFooterLabel} colSpan={showDiscountColumn ? 6 : 5}>
                                TỔNG CỘNG
                            </td>
                            <td className={styles.tdNumber}>{footerTotalText}</td>
                            <td colSpan={footerSpacerColSpan} />
                        </tr>
                    </tfoot>
                </table>
            </div>
            ) : null}

            {errorLine ? (
                <div className={styles.errorBanner} style={{ marginTop: 12, marginBottom: 0, textAlign: 'center' }}>
                    {errorLine}
                </div>
            ) : null}
            {isTicketLocked ? null : (
                <div style={{ marginTop: 16 }}>
                    <EstimateActions
                        canCreateNew={canCreateNew}
                        canCreateNewVersion={canCreateNewVersion}
                        createBusy={isStartingCreate}
                        canEdit={canEdit && currentEstimateStatus !== 'SENT' && !isReadOnly && !disableFullEdit && !hasPendingAddServiceSnapshot}
                        isCreating={isCreating}
                        isEditing={isEditing}
                        isSaving={isSaving}
                        startCreate={handleStartCreate}
                        startCreateNewVersion={handleStartCreateNewVersion}
                        startEdit={handleStartEdit}
                        cancelCreate={cancelCreate}
                        cancelEdit={cancelEdit}
                        saveEstimate={saveEstimate}
                        saveEdit={saveEdit}
                        isRestrictedStatus={isRestrictedStatus}
                        onCancelAppendOnly={onCancelAppendOnly}
                        isAppendOnlyEdit={isAppendOnlyEdit}
					shouldRevertOnCancel={revertOnCancel}
					setShouldRevertOnCancel={setRevertOnCancel}
                        shouldRevertTicketOnCancel={revertTicketOnCancel}
                        setShouldRevertTicketOnCancel={setRevertTicketOnCancel}
                        onCancelCreateNewVersion={onCancelCreateNewVersion}
                    />
                </div>
            )}

            {hideRecommendation ? null : (
                <>
                    <div className="ui-field" style={{ marginTop: 12, marginBottom: 0 }}>
                        <label htmlFor="advisor-recommendation">Khuyến nghị</label>
                        <textarea
                            id="advisor-recommendation"
                            placeholder="Nhập khuyến nghị..."
                            value={recommendation}
                            onChange={(e) => setRecommendation(e.target.value)}
                            disabled={isReadOnly || Boolean(recommendationSaving) || isTicketLocked}
                        />
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: 12,
                                marginTop: 6,
                                fontSize: 12,
                                color: '#6b7280',
                            }}
                        >
                            <span>
                                {recommendationRemaining >= 0
                                    ? `Còn ${recommendationRemaining} ký tự`
                                    : `Vượt ${Math.abs(recommendationRemaining)} ký tự`}
                            </span>
                        </div>
                        {recommendationHasError ? (
                            <div style={{ marginTop: 6, fontSize: 12, color: '#991b1b' }}>
                                {recommendationValidation.error}
                            </div>
                        ) : null}
                    </div>

                    {isTicketLocked || isReadOnly ? null : (
                        <div className="ui-actions" style={{ marginTop: 8 }}>
                            <button
                                type="button"
                                className="ui-btn ui-btn--primary"
                                onClick={() => {
								const validated = validateTextInput(recommendation, {
									fieldLabel: 'Khuyến nghị',
									required: false,
									trim: true,
									maxLength: RECOMMEND_MAX_LENGTH,
								});
								if (validated.error) {
									notify(validated.error);
									return;
								}
								Promise.resolve(saveRecommendation?.(validated.value))
                                        .then((saved) => {
                                            if (saved) notify('Đã lưu khuyến nghị.');
                                        })
                                        .catch((err) => {
                                            notify(err?.message || 'Không thể cập nhật khuyến nghị.');
                                        });
                                }}
								disabled={Boolean(recommendationSaving) || Boolean(isSaving) || recommendationHasError}
                            >
                                {recommendationSaving ? 'Đang lưu...' : 'Lưu khuyến nghị'}
                            </button>
                        </div>
                    )}
                </>
            )}




            <CatalogPicker
                open={pickerOpen}
                onClose={closeCatalogPicker}
                onPick={handlePickCatalogItem}
                initQuery={pickerInitQuery}
                categoryCode={pickerCategoryCode}
                existingSelectionKeys={selectedProductWarehouseKeys}
                excludeSelectionKey={activeRowSelectionKey}
            />

            {photoPreview?.url ? (
                <dialog
                    className={styles.photoModalDialog}
                    open
                    onClose={closePhotoPreview}
                    onCancel={(e) => {
                        e.preventDefault();
                        closePhotoPreview();
                    }}
                    aria-label={photoPreview.caption || 'Xem ảnh'}
                >
                    <div className={styles.photoModalContent}>
                        <div className={styles.photoModalHeader}>
                            <div className={styles.photoModalTitle}>{photoPreview.caption || ''}</div>
                            <button type="button" className="ui-btn ui-btn--ghost" onClick={closePhotoPreview}>
                                Đóng
                            </button>
                        </div>
                        <img
                            className={styles.photoModalImg}
                            src={photoPreview.url}
                            alt={photoPreview.caption || 'Ảnh'}
                            referrerPolicy="no-referrer"
                        />
                    </div>
                </dialog>
            ) : null}
        </section>
    );
}

AdvisorItemsTable.propTypes = {
    className: PropTypes.string,
    serviceTicketId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    ticketStatus: PropTypes.string,
    ticketPhotos: PropTypes.array,
    refreshToken: PropTypes.any,
    estimatedTimeDisplay: PropTypes.string,
    onEstimateStatusChange: PropTypes.func,
    onEstimateEditingChange: PropTypes.func,
    onBeforeEstimateMutate: PropTypes.func,
    onRestartWorkflow: PropTypes.func,
    onCancelCreateNewVersion: PropTypes.func,
    onCancelAppendOnly: PropTypes.func,
    readOnly: PropTypes.bool,
    readOnlyMessage: PropTypes.string,
    hideReadOnlyNotice: PropTypes.bool,
    title: PropTypes.string,
    draftStorageKey: PropTypes.string,
    autoStartCreate: PropTypes.bool,
    hideVehiclePhotos: PropTypes.bool,
    hideRecommendation: PropTypes.bool,
    hideEstimateSummary: PropTypes.bool,
    hideEmptyTableBeforeCreate: PropTypes.bool,
    disableFullEdit: PropTypes.bool,
};
