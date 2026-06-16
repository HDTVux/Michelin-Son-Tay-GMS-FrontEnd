import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import styles from './ServiceTicketDetail.module.css';
import { fetchManagerEmployees } from '../../../services/managerService.js';

function toPositiveNumberOrNull(value) {
    const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
    return Number.isFinite(n) && n > 0 ? n : null;
}

const DEFECT_CAUSE_OPTIONS = [
    { value: 'TECHNICIAN', label: 'Lỗi do kỹ thuật viên' },
    { value: 'WAREHOUSE',  label: 'Lỗi do kho' },
    { value: 'SUPPLIER',   label: 'Lỗi từ nhà cung cấp' },
];

export default function ReturnEntryRequestModal({ open, item, submitting, onClose, onSubmit }) {
    const maxQuantity = useMemo(() => toPositiveNumberOrNull(item?.quantity) ?? 1, [item]);

    const [returnReason, setReturnReason]             = useState('');
    const [returnReasonType, setReturnReasonType]     = useState('WRONG_TYPE');
    const [defectCause, setDefectCause]               = useState('');
    const [responsibleStaffId, setResponsibleStaffId] = useState('');
    const [quantity, setQuantity]                     = useState('1');
    const [conditionNote, setConditionNote]           = useState('');
    const [files, setFiles]                           = useState([]);
    const [fileInputKey, setFileInputKey]             = useState(0);
    const [error, setError]                           = useState('');
    const [staffList, setStaffList]                   = useState([]);

    // Reset khi mở modal
    useEffect(() => {
        if (!open) return undefined;
        setReturnReason('');
        setReturnReasonType('WRONG_TYPE');
        setDefectCause('');
        setResponsibleStaffId('');
        setQuantity('1');
        setConditionNote('');
        setFiles([]);
        setFileInputKey((k) => k + 1);
        setError('');

        // Fetch danh sách nhân viên ngay khi modal mở
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        if (token) {
            fetchManagerEmployees(token)
                .then((res) => {
                    const data = res?.data?.data ?? res?.data ?? res ?? [];
                    const list = Array.isArray(data) ? data : (Array.isArray(data?.content) ? data.content : []);
                    setStaffList(list);
                })
                .catch(() => setStaffList([]));
        }

        const onKeyDown = (event) => {
            if (event.key === 'Escape' && !submitting) onClose?.();
        };
        globalThis.addEventListener?.('keydown', onKeyDown);
        return () => globalThis.removeEventListener?.('keydown', onKeyDown);
    }, [open, onClose, submitting]);

    if (!open) return null;

    const portalContainer = globalThis.document?.body;
    if (!portalContainer) return null;

    const itemName  = String(item?.itemName || '').trim() || 'Sản phẩm';
    const unitText  = String(item?.unit || '').trim();
    const isDefective = returnReasonType === 'DEFECTIVE';
    const needsStaff  = isDefective && (defectCause === 'TECHNICIAN' || defectCause === 'WAREHOUSE');

    const handleSubmit = () => {
        const reason = String(returnReason || '').trim();
        const qty    = toPositiveNumberOrNull(quantity);
        const note   = String(conditionNote || '').trim();
        const imageFiles = Array.isArray(files) ? files.filter(Boolean) : [];

        if (!reason) {
            setError('Vui lòng nhập lý do hoàn trả.');
            return;
        }
        if (!qty) {
            setError('Số lượng hoàn trả phải lớn hơn 0.');
            return;
        }
        if (qty > maxQuantity) {
            setError(`Số lượng hoàn trả không được vượt quá ${maxQuantity}.`);
            return;
        }
        if (!note) {
            setError('Vui lòng nhập ghi chú tình trạng.');
            return;
        }
        if (imageFiles.length === 0) {
            setError('Vui lòng chọn ít nhất 1 ảnh tình trạng.');
            return;
        }
        if (isDefective && !defectCause) {
            setError('Vui lòng chọn nguyên nhân lỗi.');
            return;
        }
        if (needsStaff && !responsibleStaffId) {
            setError('Vui lòng chọn nhân viên chịu trách nhiệm.');
            return;
        }

        setError('');
        onSubmit?.({
            returnReason: reason,
            returnReasonType,
            defectCause: isDefective ? defectCause : undefined,
            responsibleStaffId: needsStaff && responsibleStaffId ? Number(responsibleStaffId) : undefined,
            quantity: qty,
            conditionNote: note,
            files: imageFiles,
        });
    };

    return createPortal(
        <div className={styles.returnModalOverlay}>
            <dialog className={styles.returnModal} open aria-modal="true" aria-labelledby="return-entry-title">
                <div className={styles.returnModalHeader}>
                    <div>
                        <h3 id="return-entry-title" className={styles.returnModalTitle}>Tạo phiếu hoàn trả</h3>
                        <p className={styles.returnModalSubtitle}>{itemName}</p>
                    </div>
                    <button type="button" className="ui-btn ui-btn--ghost" onClick={onClose} disabled={submitting}>
                        Đóng
                    </button>
                </div>

                <div className={styles.returnModalBody}>
                    {/* Phân loại lý do hoàn */}
                    <div className="ui-field">
                        <label htmlFor="return-reason-type">
                            Phân loại hoàn hàng (<span className={styles.required}>*</span>)
                        </label>
                        <select
                            id="return-reason-type"
                            value={returnReasonType}
                            onChange={(e) => {
                                setReturnReasonType(e.target.value);
                                setDefectCause('');
                                setResponsibleStaffId('');
                            }}
                            disabled={submitting}
                        >
                            <option value="WRONG_TYPE">Xuất nhầm kiểu / mẫu</option>
                            <option value="DEFECTIVE">Hàng bị lỗi</option>
                        </select>
                    </div>

                    {/* Thông tin lỗi — chỉ hiện khi DEFECTIVE */}
                    {isDefective && (
                        <>
                            <div className="ui-field">
                                <label htmlFor="defect-cause">
                                    Nguyên nhân lỗi (<span className={styles.required}>*</span>)
                                </label>
                                <select
                                    id="defect-cause"
                                    value={defectCause}
                                    onChange={(e) => {
                                        setDefectCause(e.target.value);
                                        setResponsibleStaffId('');
                                    }}
                                    disabled={submitting}
                                >
                                    <option value="">-- Chọn nguyên nhân --</option>
                                    {DEFECT_CAUSE_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>

                            {needsStaff && (
                                <div className="ui-field">
                                    <label htmlFor="responsible-staff">
                                        Nhân viên chịu trách nhiệm (<span className={styles.required}>*</span>)
                                    </label>
                                    <select
                                        id="responsible-staff"
                                        value={responsibleStaffId}
                                        onChange={(e) => setResponsibleStaffId(e.target.value)}
                                        disabled={submitting}
                                    >
                                        <option value="">-- Chọn nhân viên --</option>
                                        {Array.isArray(staffList) && staffList.map((s) => (
                                            <option key={s.staffId} value={s.staffId}>
                                                {s.fullName || s.name || `NV #${s.staffId}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </>
                    )}

                    {/* Lý do hoàn trả (mô tả tự do) */}
                    <div className="ui-field">
                        <label htmlFor="return-entry-reason">
                            Lý do hoàn trả (<span className={styles.required}>*</span>)
                        </label>
                        <textarea
                            id="return-entry-reason"
                            value={returnReason}
                            onChange={(e) => { setReturnReason(e.target.value); setError(''); }}
                            placeholder="Nhập lý do hoàn trả..."
                            disabled={submitting}
                            rows={3}
                            required
                        />
                    </div>

                    <div className={styles.returnModalGrid}>
                        <div className="ui-field">
                            <label htmlFor="return-entry-quantity">
                                Số lượng hoàn (<span className={styles.required}>*</span>)
                            </label>
                            <input
                                id="return-entry-quantity"
                                type="number"
                                min="1"
                                max={maxQuantity}
                                step="1"
                                value={quantity}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setQuantity(val);
                                    const num = toPositiveNumberOrNull(val);
                                    if (!num) {
                                        setError('Số lượng hoàn trả phải lớn hơn 0.');
                                    } else if (num > maxQuantity) {
                                        setError(`Số lượng hoàn trả không được vượt quá ${maxQuantity}.`);
                                    } else {
                                        setError('');
                                    }
                                }}
                                disabled={submitting}
                                required
                            />
                            <div className={styles.fieldHint}>
                                Tối đa {maxQuantity}{unitText ? ` ${unitText}` : ''}
                            </div>
                        </div>
                        <div className="ui-field">
                            <label htmlFor="return-entry-files">
                                Ảnh tình trạng (<span className={styles.required}>*</span>)
                            </label>
                            <input
                                id="return-entry-files"
                                key={fileInputKey}
                                type="file"
                                accept="image/*"
                                multiple
                            onChange={(e) => {
                                setFiles(Array.from(e.target.files || []).slice(0, 5));
                                setError('');
                            }}
                                disabled={submitting}
                                required
                            />
                        </div>
                    </div>

                    <div className="ui-field">
                        <label htmlFor="return-entry-condition">
                            Ghi chú tình trạng (<span className={styles.required}>*</span>)
                        </label>
                        <input
                            id="return-entry-condition"
                            value={conditionNote}
                            onChange={(e) => { setConditionNote(e.target.value); setError(''); }}
                            placeholder="Ví dụ: Vỏ bị nứt, xước..."
                            disabled={submitting}
                            required
                        />
                    </div>

                    {error ? <div className={styles.errorBanner}>{error}</div> : null}
                </div>

                <div className={styles.returnModalActions}>
                    <button type="button" className="ui-btn ui-btn--ghost" onClick={onClose} disabled={submitting}>
                        Hủy
                    </button>
                    <button type="button" className="ui-btn ui-btn--primary" onClick={handleSubmit} disabled={submitting || !!error}>
                        {submitting ? 'Đang tạo...' : 'Xác nhận hoàn trả'}
                    </button>
                </div>
            </dialog>
        </div>,
        portalContainer,
    );
}

ReturnEntryRequestModal.propTypes = {
    open: PropTypes.bool,
    item: PropTypes.object,
    submitting: PropTypes.bool,
    onClose: PropTypes.func,
    onSubmit: PropTypes.func,
};
