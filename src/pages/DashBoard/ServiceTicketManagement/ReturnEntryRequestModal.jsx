import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import styles from './ServiceTicketDetail.module.css';

function toPositiveNumberOrNull(value) {
    const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
    return Number.isFinite(n) && n > 0 ? n : null;
}

export default function ReturnEntryRequestModal({ open, item, submitting, onClose, onSubmit }) {
    const maxQuantity = useMemo(() => toPositiveNumberOrNull(item?.quantity) ?? 1, [item]);
    const [returnReason, setReturnReason] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [conditionNote, setConditionNote] = useState('');
    const [files, setFiles] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return undefined;
        const onKeyDown = (event) => {
            if (event.key === 'Escape' && !submitting) onClose?.();
        };
        globalThis.addEventListener?.('keydown', onKeyDown);
        return () => globalThis.removeEventListener?.('keydown', onKeyDown);
    }, [open, onClose, submitting]);

    if (!open) return null;

    const portalContainer = globalThis.document?.body;
    if (!portalContainer) return null;

    const itemName = String(item?.itemName || '').trim() || 'Sản phẩm';
    const unitText = String(item?.unit || '').trim();

    const handleSubmit = () => {
        const reason = String(returnReason || '').trim();
        const qty = toPositiveNumberOrNull(quantity);
        const note = String(conditionNote || '').trim();

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

        setError('');
        onSubmit?.({
            returnReason: reason,
            quantity: qty,
            conditionNote: note,
            files,
        });
    };

    return createPortal(
        <div className={styles.returnModalOverlay} role="presentation">
            <section className={styles.returnModal} role="dialog" aria-modal="true" aria-labelledby="return-entry-title">
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
                    <div className="ui-field">
                        <label htmlFor="return-entry-reason">Lý do hoàn trả</label>
                        <textarea
                            id="return-entry-reason"
                            value={returnReason}
                            onChange={(e) => setReturnReason(e.target.value)}
                            placeholder="Nhập lý do hoàn trả..."
                            disabled={submitting}
                            rows={3}
                        />
                    </div>

                    <div className={styles.returnModalGrid}>
                        <div className="ui-field">
                            <label htmlFor="return-entry-quantity">Số lượng hoàn</label>
                            <input
                                id="return-entry-quantity"
                                type="number"
                                min="1"
                                max={maxQuantity}
                                step="1"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                disabled={submitting}
                            />
                            <div className={styles.fieldHint}>
                                Tối đa {maxQuantity}{unitText ? ` ${unitText}` : ''}
                            </div>
                        </div>
                        <div className="ui-field">
                            <label htmlFor="return-entry-files">Ảnh tình trạng</label>
                            <input
                                id="return-entry-files"
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 5))}
                                disabled={submitting}
                            />
                            <div className={styles.fieldHint}>Tối đa 5 ảnh.</div>
                        </div>
                    </div>

                    <div className="ui-field">
                        <label htmlFor="return-entry-condition">Ghi chú tình trạng</label>
                        <input
                            id="return-entry-condition"
                            value={conditionNote}
                            onChange={(e) => setConditionNote(e.target.value)}
                            placeholder="Ví dụ: Vỏ bị nứt, xước..."
                            disabled={submitting}
                        />
                    </div>

                    {error ? <div className={styles.errorBanner}>{error}</div> : null}
                </div>

                <div className={styles.returnModalActions}>
                    <button type="button" className="ui-btn ui-btn--ghost" onClick={onClose} disabled={submitting}>
                        Hủy
                    </button>
                    <button type="button" className="ui-btn ui-btn--primary" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? 'Đang tạo...' : 'Xác nhận hoàn trả'}
                    </button>
                </div>
            </section>
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
