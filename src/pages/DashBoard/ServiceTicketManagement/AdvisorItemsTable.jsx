import { useCallback, useEffect, useMemo, useState } from 'react';
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
    return name || code;
}

function getTaxRuleDisplayLabel(rule) {
    if (!rule) return '';
    const rateText = formatTaxRatePercent(rule);
    if (rateText) return rateText;
    return getTaxRuleSelectLabel(rule);
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
    isSaving,
    taxRulesLoading,
    taxRules,
    taxRuleById,
    isEditing,
    softDeleteEditRow,
    openCatalogPicker,
    showTaxColumn,
}) {
    const isLocked = Boolean(row?.isLockedFromPreviousVersion);
    const allowInputs = showInputs && !isLocked;

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
    const taxRateText = formatTaxRatePercent(taxRule);
    const isPredefinedCategory = Boolean(toIdOrNull(row?.workCategoryId));
    const subTotalValue = effectiveTaxRuleId ? (row?.subTotalWithVat ?? row?.subTotal) : row?.subTotal;
    const shouldShowTaxDropdown = allowInputs && !itemTaxRuleId && !categoryTaxRuleId;

    const unitText = String(row?.unit ?? '').trim();

    let itemPlaceholder = 'Diễn giải';
    if (categoryFilled) {
        if (isPredefinedCategory) itemPlaceholder = 'Chọn sản phẩm ';
    } else {
        itemPlaceholder = 'Nhập hạng mục trước';
    }

    return (
        <tr key={`advisor-row-${stt}-${row.key}`}>
            <td>{stt}</td>
            <td>
                {allowInputs ? (
                    <input
                        className={styles.tableInput}
                        value={row.newCategoryName}
                        onChange={(e) => onChange(idx, 'newCategoryName', e.target.value)}
                        placeholder="Hạng mục"
                        list="estimate-category-suggestions"
                        disabled={isSaving}
                    />
                ) : (
                    row.categoryName || ''
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
                    row.itemName || ''
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
                    formatCurrencyVnd(row.unitPriceDisplay ?? row.unitPrice)
                )}
            </td>
            <td className={styles.tdNumber}>
                {showInputs ? formatCurrencyVnd(subTotalValue) : formatCurrencyVnd(row.subTotalDisplay ?? row.subTotal)}
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
                                {effectiveTaxRuleId && taxRateText ? (
                                    <span style={{ color: 'var(--ui-muted)', whiteSpace: 'nowrap' }}>{taxRateText}</span>
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

            <td />
            <td className={styles.tdCenter}>
                {showInputs ? (
                    <input
                        type="checkbox"
                        checked={Boolean(row.confirmed)}
                        onChange={(e) => onChange(idx, 'confirmed', e.target.checked)}
                        disabled={isSaving || isLocked}
                    />
                ) : (
                    <input
                        type="checkbox"
                        checked={true}
                        disabled={true}
                    />
                )}
            </td>
            {isEditing ? (
                <td className={styles.tdCenter}>
                    <button
                        type="button"
                        className="ui-btn ui-btn--ghost"
                        onClick={() => softDeleteEditRow(idx)}
                        disabled={isSaving || !toIdOrNull(row?.estimateItemId) || isDraftRowEmpty(row) || isLocked}
                        title="Xóa dòng này"
                    >
                        Xóa
                    </button>
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
    isSaving: PropTypes.bool,
    taxRulesLoading: PropTypes.bool,
    taxRules: PropTypes.array,
    taxRuleById: PropTypes.object,
    isEditing: PropTypes.bool,
    softDeleteEditRow: PropTypes.func,
    openCatalogPicker: PropTypes.func,
    showTaxColumn: PropTypes.bool,
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
        softDeleteEditRow,
        estimate,
    } = useAdvisorItemsTableHandlers(serviceTicketId, { onEstimateStatusChange, refreshToken });

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

    const errorLine = saveError || loadError || taxRulesError || workCategoriesError || '';

    // Let parent know whether estimate is currently being created/edited/saved.
    // Used to hide actions like "Xác nhận báo giá" until user presses Save successfully.
    useEffect(() => {
        try {
            onEstimateEditingChange?.(Boolean(isCreating || isEditing || isSaving));
        } catch {
            // ignore
        }
    }, [isCreating, isEditing, isSaving, onEstimateEditingChange]);

    const currentEstimateStatus = estimate?.estimateStatus || estimate?.status || '';
    const isArchived = currentEstimateStatus === 'ARCHIVED';
    // Khi đang tạo mới / đang chỉnh sửa, chúng ta không bị hạn chế bởi status của báo giá cũ
    const isRestrictedStatus = !(isCreating || isEditing) && ['APPROVED', 'REJECTED', 'ARCHIVED', 'CANCELLED'].includes(currentEstimateStatus);

    // Cho phép tạo mới nếu chưa có báo giá hoặc báo giá hiện tại đã ARCHIVED
    const ticketStatusUpper = String(ticketStatus || '').trim().toUpperCase();
    const isTicketPaid = ticketStatusUpper === 'PAID';
    const isTicketCancelled = ['CANCELLED', 'CANCELED', 'CANCEL'].includes(ticketStatusUpper);
    const isTicketLocked = isTicketPaid || isTicketCancelled;
    // "Tạo báo giá mới" chỉ dành cho trường hợp chưa có bất kì báo giá nào.
    const canCreateNew = !isCreating && !isEditing && showAddEstimate && !isTicketLocked;

    // "Tạo version báo giá mới" chỉ dành cho trường hợp báo giá hiện tại là ARCHIVED.
    const canCreateNewVersion = !isCreating && !isEditing && Boolean(estimate) && isArchived && !isTicketLocked;

    const notify = useCallback((message) => toast(message, { containerId: 'app-toast' }), []);

    const [isStartingCreate, setIsStartingCreate] = useState(false);

    const handleStartCreate = async () => {
        if (isStartingCreate) return;
        if (isTicketLocked) {
            notify('Không thể tạo báo giá khi phiếu dịch vụ đã bị khóa (PAID/CANCELLED).');
            return;
        }
		setRevertOnCancel(false);
		setRevertTicketOnCancel(false);
        if (startCreate) startCreate();
    };

    const handleStartCreateNewVersion = async () => {
        if (isStartingCreate) return;
        if (isTicketLocked) {
            notify('Không thể tạo báo giá khi phiếu dịch vụ đã bị khóa (PAID/CANCELLED).');
            return;
        }
		setRevertOnCancel(false);
        setRevertTicketOnCancel(true);

        // Seed các dòng của version trước sang version mới (read-only)
        startCreate?.({ seedFromPreviousEstimate: true });

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
        const handler = () => {
            if (isTicketLocked) {
                notify('Không thể tạo báo giá khi phiếu dịch vụ đã bị khóa (PAID/CANCELLED).');
                return;
            }
            if (isCreating || isEditing) return;
            startCreate?.();
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
    }, [isTicketLocked, isCreating, isEditing, notify, startCreate]);

    // Ensure append-only edit mode can be opened automatically (add service: keep current estimate version,
    // lock existing rows, only allow adding new rows).
    useEffect(() => {
        const handler = () => {
            if (isTicketLocked) {
                notify('Không thể sửa báo giá khi phiếu dịch vụ đã bị khóa (PAID/CANCELLED).');
                return;
            }
            if (isCreating || isEditing) return;
			setRevertOnCancel(true);

            // If there is no estimate yet, fall back to create mode.
            if (!estimate) {
                startCreate?.();
                return;
            }

            startEdit?.({ appendOnly: true });
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
    }, [estimate, isTicketLocked, isCreating, isEditing, notify, startCreate, startEdit]);

    const handleStartEdit = useCallback(() => {
        setRevertOnCancel(false);
        startEdit?.();
    }, [startEdit]);

    const [pickerOpen, setPickerOpen] = useState(false);
    const [activeRowIndex, setActiveRowIndex] = useState(null);

    // Lưu categoryCode để truyền vào CatalogPicker
    const [pickerCategoryCode, setPickerCategoryCode] = useState("");
    const [pickerInitQuery, setPickerInitQuery] = useState("");

    const openCatalogPicker = (rowIndex, rowObj) => {
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

    const handlePickCatalogItem = (item) => {
        if (activeRowIndex == null) return;
        const id = item?.itemId ?? item?.id ?? null;
        const name = item?.itemName ?? item?.name ?? '';
        const price = item?.sellingPrice ?? item?.price ?? item?.unitPrice ?? item?.unit_price ?? '';
        const unit = String(item?.unit ?? '').trim();
        const warehouseId = item?.warehouseId ?? item?.selectedWarehouse?.warehouseId ?? null;
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
        <section className={styles.block}>
            <h2 className={styles.blockTitle}>Thông tin tư vấn </h2>


            <div className={styles.advisorStack}>
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



                <div className={styles.advisorCard}>
                    <h3 className={styles.advisorTitle}>Ước tính</h3>
                    <div className={styles.kvList}>
                        <div className={styles.kvRow}>
                            <span className={styles.kvLabel}>Thời gian</span>
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
            </div>
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

            <div className={styles.tableWrap}>
                <datalist id="estimate-category-suggestions">
                    {workCategoriesLoading ? null : (
                        (Array.isArray(categorySuggestions) ? categorySuggestions : []).map((label) => (
                            <option key={label} value={label} />
                        ))
                    )}
                </datalist>

                {isTicketPaid ? (
                <div className={styles.errorBanner} style={{ marginTop: 8 }}>
                    Phiếu dịch vụ đã được thanh toán — không thể tạo báo giá mới.
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
                            <th scope="col">THÀNH TIỀN</th>
                            {isCreating || isEditing ? <th scope="col">THUẾ </th> : null}
                            <th scope="col">KHO</th>
                            <th scope="col">XÁC NHẬN</th>
                            {isEditing ? <th scope="col">XÓA</th> : null}
                        </tr>
                    </thead>
                    <tbody>
                        {tableRows.map((row, idx) => (
                            <EstimateItemRow
                                key={`advisor-row-${idx}-${row?.key ?? 'row'}`}
                                row={row}
                                idx={idx}
                                showInputs={showInputs}
                                showTaxColumn={isCreating || isEditing}
                                onChange={onChange}
                                isSaving={isSaving}
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
                            <td className={styles.tableFooterLabel} colSpan={5}>
                                TỔNG CỘNG
                            </td>
                            <td className={styles.tdNumber}>{footerTotalText}</td>
                            <td colSpan={isCreating || isEditing ? (isEditing ? 4 : 3) : 2} />
                        </tr>
                    </tfoot>
                </table>
            </div>

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
                        canEdit={canEdit}
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

            <div className="ui-field" style={{ marginTop: 12, marginBottom: 0 }}>
                <label htmlFor="advisor-recommendation">Khuyến nghị</label>
                <textarea
                    id="advisor-recommendation"
                    placeholder="Nhập khuyến nghị..."
                    value={recommendation}
                    onChange={(e) => setRecommendation(e.target.value)}
                    disabled={Boolean(recommendationSaving) || isTicketLocked}
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

                {isTicketLocked ? null : (
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




            <CatalogPicker
                open={pickerOpen}
                onClose={closeCatalogPicker}
                onPick={handlePickCatalogItem}
                initQuery={pickerInitQuery}
                categoryCode={pickerCategoryCode}
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
    serviceTicketId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    ticketStatus: PropTypes.string,
    ticketPhotos: PropTypes.array,
    refreshToken: PropTypes.any,
    estimatedTimeDisplay: PropTypes.string,
    onEstimateStatusChange: PropTypes.func,
    onEstimateEditingChange: PropTypes.func,
    onRestartWorkflow: PropTypes.func,
    onCancelCreateNewVersion: PropTypes.func,
    onCancelAppendOnly: PropTypes.func,
};