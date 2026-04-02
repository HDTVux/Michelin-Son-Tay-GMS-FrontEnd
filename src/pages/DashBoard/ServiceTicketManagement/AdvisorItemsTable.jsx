import { useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import styles from './ServiceTicketDetail.module.css';
import {
    formatCurrencyVnd,
    isDraftRowEmpty,
    toIdOrNull,
    useAdvisorItemsTableHandlers,
} from './useAdvisorItemsTableHandlers.js';
import CatalogPicker from './CatalogPicker.jsx';

const PHOTO_SLOTS = 4;

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
                            disabled={isCreatingTaxRule || isSaving}
                        >
                            {isCreatingTaxRule ? 'Đang thêm...' : 'Xác nhận thêm thuế'}
                        </button>
                        <button
                            type="button"
                            className="ui-btn ui-btn--ghost"
                            onClick={stopAddNewTaxRule}
                            disabled={isCreatingTaxRule || isSaving}
                        >
                            Chọn từ danh sách
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        className="ui-btn ui-btn--primary"
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
    toggleChecked,
    canToggleChecked,
    isEditing,
    isCreating,
    softDeleteEditRow,
    softDeleteDraftRow,
    openCatalogPicker,
    showTaxColumn,
}) {
    const isLocked = Boolean(row?.isLockedFromPreviousVersion);
    const allowInputs = showInputs && !isLocked;

    const stt = String(idx + 1).padStart(2, '0');
    const manualTaxRuleId = toIdOrNull(row?.taxRuleId);
    const itemTaxRuleId = toIdOrNull(row?.itemTaxRuleId);
    const categoryTaxRuleId = toIdOrNull(row?.workCategoryTaxRuleId);

    const effectiveTaxRuleId = manualTaxRuleId || itemTaxRuleId || categoryTaxRuleId;
    const taxRule = effectiveTaxRuleId ? taxRuleById.get(effectiveTaxRuleId) : null;
    const taxLabel = getTaxRuleDisplayLabel(taxRule);
    const taxRateText = formatTaxRatePercent(taxRule);
    const isPredefinedCategory = Boolean(toIdOrNull(row?.workCategoryId));
    const subTotalValue = effectiveTaxRuleId ? (row?.subTotalWithVat ?? row?.subTotal) : row?.subTotal;
    const shouldShowTaxDropdown = allowInputs && !itemTaxRuleId && !categoryTaxRuleId;

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
                            placeholder={isPredefinedCategory ? "Chọn sản phẩm từ danh mục" : "Diễn giải"}
                            readOnly={isPredefinedCategory}
                            onChange={isPredefinedCategory ? undefined : (e) => onChange(idx, 'itemName', e.target.value)}
                            disabled={isSaving}
                        />
                        <button
                            type="button"
                            className="ui-btn ui-btn--ghost"
                            onClick={() => openCatalogPicker(idx, row)}
                            disabled={isSaving}
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
                    <input
                        className={`${styles.tableInput} ${styles.tableInputNumber}`}
                        type="text"
                        value={row.quantity}
                        onChange={(e) => onChange(idx, 'quantity', e.target.value)}
                        placeholder="0"
                        disabled={isSaving}
                    />
                ) : (
                    (row.quantity ?? '')
                )}
            </td>
            <td className={styles.tdNumber}>
                {allowInputs ? (
                    <input
                        className={`${styles.tableInput} ${styles.tableInputNumber}`}
                        type="text"
                        value={row.unitPrice}
                        onChange={(e) => onChange(idx, 'unitPrice', e.target.value)}
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
                        checked={Boolean(row.confirmed)}
                        onChange={(e) => toggleChecked(row.sourceIndex, e.target.checked)}
                        disabled={!canToggleChecked || Boolean(row.confirmed)}
                    />
                )}
            </td>
            {(isEditing || isCreating) ? (
                <td className={styles.tdCenter}>
                    <button
                        type="button"
                        className="ui-btn ui-btn--ghost"
                        onClick={() => softDeleteEditRow(idx)}
                        disabled={isSaving || !toIdOrNull(row?.estimateItemId) || isDraftRowEmpty(row)}
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
    toggleChecked: PropTypes.func,
    canToggleChecked: PropTypes.bool,
    isEditing: PropTypes.bool,
    isCreating: PropTypes.bool,
    softDeleteEditRow: PropTypes.func,
    softDeleteDraftRow: PropTypes.func,
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
}) {
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
                    <button type="button" className="ui-btn ui-btn--ghost" onClick={cancelCreate} disabled={isSaving}>
                        Hủy
                    </button>
                    {!isRestrictedStatus ? (
                        <button type="button" className="ui-btn ui-btn--primary" onClick={saveEstimate} disabled={isSaving}>
                            {isSaving ? 'Đang lưu...' : 'Lưu báo giá'}
                        </button>
                    ) : null}
                </div>
            ) : null}

            {isEditing ? (
                <div className="ui-actions" style={{ marginTop: 12 }}>
                    <button type="button" className="ui-btn ui-btn--ghost" onClick={cancelEdit} disabled={isSaving}>
                        Hủy
                    </button>
                    {!isRestrictedStatus ? (
                        <button type="button" className="ui-btn ui-btn--primary" onClick={saveEdit} disabled={isSaving}>
                            {isSaving ? 'Đang lưu...' : 'Lưu chỉnh sửa'}
                        </button>
                    ) : null}
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
};

export default function AdvisorItemsTable({ serviceTicketId, ticketStatus, onEstimateStatusChange, onRestartWorkflow }) {
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
        isCreating,
        isEditing,
        isSaving,
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
        canToggleChecked,
        toggleChecked,
        softDeleteEditRow,
        softDeleteDraftRow,
        inventory,
        estimate,
    } = useAdvisorItemsTableHandlers(serviceTicketId, { onEstimateStatusChange });

    const currentEstimateStatus = estimate?.estimateStatus || estimate?.status || '';
    const isArchived = currentEstimateStatus === 'ARCHIVED';
    // Khi đang tạo mới, chúng ta không bị hạn chế bởi status của báo giá cũ
    const isRestrictedStatus = !isCreating && ['APPROVED', 'REJECTED', 'ARCHIVED', 'CANCELLED'].includes(currentEstimateStatus);

    // Cho phép tạo mới nếu chưa có báo giá hoặc báo giá hiện tại đã ARCHIVED
    const canCreateNew = !isCreating && !isEditing && (showAddEstimate || isArchived);

    const handleStartCreate = async () => {
        if (isStartingCreate) return;
        if (isTicketPaid) {
            notify('Không thể tạo báo giá khi phiếu dịch vụ đã được thanh toán (PAID).');
            return;
        }
        if (startCreate) startCreate();
    };

    const handleStartCreateNewVersion = async () => {
        if (isStartingCreate) return;
        if (isTicketPaid) {
            notify('Không thể tạo báo giá khi phiếu dịch vụ đã được thanh toán (PAID).');
            return;
        }

        // Seed các dòng của version trước sang version mới (read-only)
        startCreate?.({ seedFromPreviousEstimate: true });

        if (!onRestartWorkflow) return;

        try {
            setIsStartingCreate(true);
            notify('Đang chuẩn bị tạo bản báo giá mới...');
            // Đẩy ServiceTicket về DRAFT trước khi tạo Estimate mới
            await onRestartWorkflow();
        } catch {
            cancelCreate?.();
        } finally {
            setIsStartingCreate(false);
        }
    };

    // Ensure create mode can be opened automatically after the ticket is restarted/refreshed.
    useEffect(() => {
        const handler = () => {
            if (isTicketPaid) {
                notify('Không thể tạo báo giá khi phiếu dịch vụ đã được thanh toán (PAID).');
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
    }, [isTicketPaid, isCreating, isEditing, notify, startCreate]);

    const [pickerOpen, setPickerOpen] = useState(false);
    const [activeRowIndex, setActiveRowIndex] = useState(null);

    // Lưu categoryCode để truyền vào CatalogPicker
    const [pickerCategoryCode, setPickerCategoryCode] = useState("");
    const [pickerInitQuery, setPickerInitQuery] = useState("");

    const openCatalogPicker = (rowIndex, rowObj) => {
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
        const price = item?.price ?? item?.unitPrice ?? item?.unit_price ?? '';
        const rawTaxId = item?.taxRuleId ?? item?.tax_rule_id ?? item?.taxRule?.taxRuleId ?? item?.taxRule?.id ?? '';
        onChange(activeRowIndex, 'itemId', id);
        onChange(activeRowIndex, 'itemName', name);
        onChange(activeRowIndex, 'unitPrice', price);
        onChange(activeRowIndex, 'itemTaxRuleId', rawTaxId == null ? '' : String(rawTaxId));

        // Nếu sản phẩm có thuế thì ưu tiên sản phẩm -> clear chọn thuế thủ công.
        const taxIdNum = toIdOrNull(rawTaxId);
        if (taxIdNum) onChange(activeRowIndex, 'taxRuleId', '');
        closeCatalogPicker();
    };

    const showTaxQuickAdd = showInputs && tableRows.some((r) => !isDraftRowEmpty(r) && !toIdOrNull(r?.workCategoryId));

    return (
        <section className={styles.block}>
            <h2 className={styles.blockTitle}>Thông tin tư vấn </h2>


            <div className={styles.advisorStack}>
                <div className={styles.advisorCard}>
                    <h3 className={styles.advisorTitle}>Ảnh tình trạng xe</h3>
                    <div className={styles.photoStrip}>
                        {Array.from({ length: PHOTO_SLOTS }).map((_, idx) => (
                            <div
                                key={`photo-slot-${idx + 1}`}
                                className={styles.photoPlaceholder}
                                aria-label={`Ảnh ${idx + 1}`}
                            />
                        ))}
                    </div>
                </div>

                <div className={styles.advisorCard}>
                    <h3 className={styles.advisorTitle}>Chẩn đoán kỹ thuật</h3>
                    <div className="ui-field" style={{ marginBottom: 0 }}>
                        <textarea
                            placeholder="Nhập kết quả chẩn đoán..."
                            disabled={isRestrictedStatus}
                        />
                    </div>

                    <h3 className={styles.advisorTitle} style={{ marginTop: 14 }}>Dịch vụ đề xuất</h3>
                    <div className={styles.recommendList}>
                        <label className={styles.recommendItem}>
                            <input type="checkbox" defaultChecked disabled={isRestrictedStatus} />
                            <span>Bảo dưỡng định kỳ</span>
                        </label>
                        <label className={styles.recommendItem}>
                            <input type="checkbox" disabled={isRestrictedStatus} />
                            <span>Thay má phanh trước</span>
                        </label>
                        <label className={styles.recommendItem}>
                            <input type="checkbox" disabled={isRestrictedStatus} />
                            <span>Thay dầu phanh</span>
                        </label>
                    </div>
                    <div className="ui-field" style={{ marginBottom: 0, marginTop: 10 }}>
                        <input type="text" placeholder="Thêm dịch vụ khác..." disabled={isRestrictedStatus} />
                    </div>
                </div>

                <div className={styles.advisorCard}>
                    <h3 className={styles.advisorTitle}>Phụ tùng cần thiết</h3>
                    <div className={styles.partRow}>
                        <div className={styles.partName}>Má phanh trước Toyota</div>
                        <div className={styles.partMeta}>
                            <span className={styles.partText}>15 cái</span>
                            <span className={styles.partText}>500,000đ/bộ</span>
                            <span className={styles.tag}>In Stock</span>
                        </div>
                    </div>
                    <button
                        type="button"
                        className={`ui-btn ui-btn--ghost ${styles.fullWidthBtn}`}
                        onClick={inventory.toggleOpen}
                    >
                        {inventory.isOpen ? 'Đóng kiểm tra tồn kho' : 'Kiểm tra tồn kho'}
                    </button>

                    {inventory.isOpen ? (
                        <div className={styles.inventoryPanel}>
                            <form className={styles.inventorySearchRow} onSubmit={inventory.onSubmit}>
                                <div className="ui-field" style={{ marginBottom: 0, flex: 1 }}>
                                    <input
                                        type="text"
                                        placeholder="Nhập tên/mã phụ tùng..."
                                        value={inventory.query}
                                        onChange={inventory.onQueryChange}
                                        disabled={inventory.loading}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="ui-btn ui-btn--primary"
                                    disabled={inventory.loading}
                                >
                                    {inventory.loading ? 'Đang tìm...' : 'Tìm'}
                                </button>
                            </form>

                            {inventory.loading ? (
                                <div className={styles.inventoryHint}>Đang tải dữ liệu kho...</div>
                            ) : null}

                            {inventory.showResults ? (
                                <div className={styles.inventoryResults}>
                                    {inventory.results.map((it, idx) => {
                                        const itemId = it?.itemId ?? it?.id;
                                        const stockQtyRaw = it?.stockQuantity ?? it?.stockQty ?? it?.quantity ?? 0;
                                        const stockQtyNum = typeof stockQtyRaw === 'number' ? stockQtyRaw : Number(stockQtyRaw);
                                        const inStock = Number.isFinite(stockQtyNum) ? stockQtyNum > 0 : Boolean(stockQtyRaw);
                                        return (
                                            <div
                                                key={String(itemId ?? it?.itemCode ?? it?.itemName ?? `inventory-item-${idx}`)}
                                                className={styles.inventoryItem}
                                            >
                                                <div className={styles.inventoryItemMain}>
                                                    <div className={styles.inventoryItemName}>{it?.itemName || '-'}</div>
                                                    <div className={styles.inventoryItemCode}>{it?.itemCode || it?.category || ''}</div>
                                                </div>
                                                <div className={styles.inventoryItemMeta}>
                                                    <span className={styles.partText}>Tồn: {Number.isFinite(stockQtyNum) ? stockQtyNum : stockQtyRaw || 0}</span>
                                                    <span className={styles.partText}>
                                                        {formatCurrencyVnd(it?.unitPrice)}{it?.unit ? `/${it.unit}` : ''}
                                                    </span>
                                                    <span className={styles.tag}>{inStock ? 'In Stock' : 'Out of Stock'}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : null}

                            {inventory.error ? <div className={styles.errorBanner}>{inventory.error}</div> : null}

                            <div className="ui-actions" style={{ marginTop: 0 }}>
                                <button type="button" className="ui-btn ui-btn--ghost" onClick={inventory.close}>
                                    Đóng
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className={styles.advisorCard}>
                    <h3 className={styles.advisorTitle}>Ước tính</h3>
                    <div className={styles.kvList}>
                        <div className={styles.kvRow}>
                            <span className={styles.kvLabel}>Thời gian</span>
                            <span className={styles.kvValue}>-</span>
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
                                {statusLine}
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
                            {isCreating || isEditing ? <th scope="col">XÓA</th> : null}
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
                                toggleChecked={toggleChecked}
                                canToggleChecked={canToggleChecked}
                                isEditing={isEditing}
                                isCreating={isCreating}
                                softDeleteEditRow={softDeleteEditRow}
                                softDeleteDraftRow={softDeleteDraftRow}
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
                            <td colSpan={isCreating || isEditing ? (isCreating ? 3 : 4) : 2} />
                        </tr>
                    </tfoot>
                </table>
            </div>
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
                    startEdit={startEdit}
                    cancelCreate={cancelCreate}
                    cancelEdit={cancelEdit}
                    saveEstimate={saveEstimate}
                    saveEdit={saveEdit}
                    isRestrictedStatus={isRestrictedStatus}
                />
            </div>

            <div className="ui-field" style={{ marginTop: 12, marginBottom: 0 }}>
                <label htmlFor="advisor-recommendation">Khuyến nghị</label>
                <textarea
                    id="advisor-recommendation"
                    placeholder="Nhập khuyến nghị..."
                    value={recommendation}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val.length > 500) {
                            const now = Date.now();
                            if (!toast500LastFired.current['recommendation'] || now - toast500LastFired.current['recommendation'] > 2000) {
                                toast('Tối đa 500 ký tự cho mỗi ô nhập.', { containerId: 'app-toast', autoClose: 2000 });
                                toast500LastFired.current['recommendation'] = now;
                            }
                            setRecommendationError('Tối đa 500 ký tự.');
                            setRecommendation(val);
                        } else {
                            setRecommendation(val);
                            setRecommendationError('');
                        }
                    }}
                    disabled={isRestrictedStatus}
                />
                {recommendationError && (
                    <span style={{ color: '#dc2626', fontSize: '12px', marginTop: '2px', display: 'block' }}>{recommendationError}</span>
                )}
            </div>



            <CatalogPicker
                open={pickerOpen}
                onClose={closeCatalogPicker}
                onPick={handlePickCatalogItem}
                initQuery={pickerInitQuery}
                categoryCode={pickerCategoryCode}
            />
        </section>
    );
}

AdvisorItemsTable.propTypes = {
    serviceTicketId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    ticketStatus: PropTypes.string,
    onEstimateStatusChange: PropTypes.func,
    onRestartWorkflow: PropTypes.func,
};