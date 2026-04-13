import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import styles from './ReceiptPaymentMethod.module.css';
import { getVietQrUrl } from '../../../services/paymentQrService.js'; 
import { toast } from 'react-toastify';

// --- Utility Functions ---

function safeRevokeObjectUrl(url) {
    if (!url) return;
    try {
        URL.revokeObjectURL(url);
    } catch {
        // ignore
    }
}

function toMoneyNumber(value) {
    const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
    return Number.isFinite(n) ? n : 0;
}

function formatCurrencyVnd(value) {
    const n = toMoneyNumber(value);
    return `${new Intl.NumberFormat('vi-VN').format(Math.round(n))} VND`;
}

// --- Sub-components ---

function CashEvidenceSection({ file, previewUrl, error, onPick, onRemove }) {
    return (
        <div className={styles.cashSection}>
            <div className={styles.cashTitle}>Xác nhận thanh toán tiền mặt</div>
            <div className={styles.cashHint}>Upload ảnh hoá đơn có chữ ký (dùng để đối soát/ghi nhận đã thanh toán).</div>

            <div className={styles.evidenceBlock}>
                <input
                    id="cash-evidence"
                    type="file"
                    accept="image/*"
                    onChange={onPick}
                    className={styles.fileInput}
                />

                {previewUrl ? (
                    <>
                        <div className={styles.previewWrap}>
                            <img className={styles.previewImg} src={previewUrl} alt="Ảnh hoá đơn" />
                            {file?.name ? <div className={styles.fileName}>{file.name}</div> : null}
                        </div>
                        <div className={styles.evidenceActions}>
                            <label htmlFor="cash-evidence" className={`ui-btn ui-btn--ghost ${styles.evidenceBtn}`}>
                                Chọn ảnh khác
                            </label>
                            <button type="button" className={`ui-btn ui-btn--ghost ${styles.evidenceBtn}`} onClick={onRemove}>
                                Xóa ảnh
                            </button>
                        </div>
                    </>
                ) : (
                    <label htmlFor="cash-evidence" className={styles.uploadLabel}>
                        <div className={styles.uploadText}>Click để chọn ảnh hoá đơn</div>
                        <div className={styles.uploadSubtext}>Hỗ trợ: JPG/PNG. Chỉ chọn 1 ảnh.</div>
                    </label>
                )}
            </div>

            {error ? <div className={styles.error}>{error}</div> : null}
        </div>
    );
}

CashEvidenceSection.propTypes = {
    file: PropTypes.any,
    previewUrl: PropTypes.string,
    error: PropTypes.string,
    onPick: PropTypes.func,
    onRemove: PropTypes.func,
};

// --- Main Modal Component ---

export function ReceiptPaymentMethodModal({ open, onClose, ticketCode, total, printTicket, onConfirmPayment }) {
    const [method, setMethod] = useState('transfer');
    const [cashEvidenceFile, setCashEvidenceFile] = useState(null);
    const [cashEvidencePreview, setCashEvidencePreview] = useState('');
    const [cashError, setCashError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const ticketCodeSafe = String(ticketCode || '').trim();
    const totalSafe = useMemo(() => toMoneyNumber(total), [total]);
    const hasRequiredState = Boolean(printTicket);

    const transferContent = useMemo(() => {
        const code = ticketCodeSafe || 'SERVICE_TICKET';
        return `Thanh toan hoa don ${code}`; 
    }, [ticketCodeSafe]);

    useEffect(() => {
        if (!open) return;
        return () => safeRevokeObjectUrl(cashEvidencePreview);
    }, [open, cashEvidencePreview]);

    const handlePickCashEvidence = (e) => {
        setCashError('');
        const nextFile = e?.target?.files?.[0] ?? null;
        setCashEvidenceFile(nextFile);
        safeRevokeObjectUrl(cashEvidencePreview);
        setCashEvidencePreview(nextFile ? URL.createObjectURL(nextFile) : '');
    };

    const handleRemoveCashEvidence = () => {
        setCashError('');
        setCashEvidenceFile(null);
        safeRevokeObjectUrl(cashEvidencePreview);
        setCashEvidencePreview('');
    };

    const handleConfirm = async () => {
        setCashError('');
        if (submitting) return;

        if (method === 'cash') {
            if (!cashEvidenceFile) {
                setCashError('Vui lòng upload ảnh hoá đơn để xác nhận.');
                return;
            }
            try {
                setSubmitting(true);
                await Promise.resolve(onConfirmPayment?.({ method, evidenceFile: cashEvidenceFile }));
            } catch (error) {
                toast.error(error?.message || 'Thanh toán thất bại.');
                return;
            } finally {
                setSubmitting(false);
            }
        } else if (method === 'transfer') {
            try {
                setSubmitting(true);
                await Promise.resolve(onConfirmPayment?.({ method, evidenceFile: null }));
            } catch (error) {
                toast.error(error?.message || 'Thanh toán thất bại.');
                return;
            } finally {
                setSubmitting(false);
            }
        }
        
        // Giữ nguyên trang hiện tại sau khi xác nhận thanh toán
        onClose?.();
    };

    let sectionContent = null;
    if (method === 'cash') {
        sectionContent = (
            <CashEvidenceSection
                file={cashEvidenceFile}
                previewUrl={cashEvidencePreview}
                error={cashError}
                onPick={handlePickCashEvidence}
                onRemove={handleRemoveCashEvidence}
            />
        );
    } else if (method === 'transfer') {
        const qrImgSrc = getVietQrUrl({ amountVnd: totalSafe, description: transferContent });

        sectionContent = (
            <div className={styles.qrSection}>
                <div className={styles.qrTitle}>Quét mã VietQR để thanh toán</div>
                <div className={styles.qrMeta}>
                    <div className={styles.qrMetaRow}>
                        <span>Số tiền:</span>
                        <strong>{formatCurrencyVnd(totalSafe)}</strong>
                    </div>
                    <div className={styles.qrMetaRow}>
                        <span>Nội dung:</span>
                        <strong className={styles.qrMetaText}>{transferContent}</strong>
                    </div>
                </div>
                
                {/* QR hiện ngay lập tức không cần điều kiện */}
                <div className={styles.qrImageWrapper}>
                    <img className={styles.qrImg} src={qrImgSrc} alt="VietQR" loading="lazy" />
                </div>
            </div>
        );
    }

    if (!open) return null;

    if (!hasRequiredState) {
        return (
            <div className={styles.overlay}>
                <div className={styles.backdrop} aria-hidden="true" />
                <dialog
                    open
                    className={`ui-card ${styles.modal}`}
                    aria-modal="true"
                    aria-labelledby="receipt-payment-method-title"
                    onCancel={(e) => {
                        e.preventDefault();
                    }}
                >
                    <header className={styles.header}>
                        <div>
                            <h2 id="receipt-payment-method-title" className={styles.title}>
                                Chọn phương thức thanh toán
                            </h2>
                            <div className={styles.subTitle}>Phiếu dịch vụ #{ticketCodeSafe || '-'}</div>
                        </div>
                    </header>
                    <div className={styles.error}>Thiếu dữ liệu hoá đơn. Vui lòng quay lại trang xác nhận hoá đơn.</div>
                    <div className="ui-actions ui-actions--end">
                        <button type="button" className="ui-btn ui-btn--ghost" onClick={onClose}>
                            Đóng
                        </button>
                    </div>
                </dialog>
            </div>
        );
    }

    return (
        <div className={styles.overlay}>
            <div className={styles.backdrop} aria-hidden="true" />
            <dialog
                open
                className={`ui-card ${styles.modal}`}
                aria-modal="true"
                aria-labelledby="receipt-payment-method-title"
                onCancel={(e) => {
                    e.preventDefault();
                }}
            >
                <header className={styles.header}>
                    <div>
                        <h2 id="receipt-payment-method-title" className={styles.title}>
                            Chọn phương thức thanh toán
                        </h2>
                        <div className={styles.subTitle}>Phiếu dịch vụ #{ticketCodeSafe || '-'}</div>
                    </div>
                </header>

                <div className={styles.totalRow}>
                    <span>Tổng cần thanh toán:</span>
                    <strong>{formatCurrencyVnd(totalSafe)}</strong>
                </div>

                <div className={styles.methods}>
                    <button
                        type="button"
                        className={`ui-btn ${method === 'cash' ? 'ui-btn--primary' : 'ui-btn--ghost'} ${styles.methodBtn}`}
                        onClick={() => setMethod('cash')}
                    >
                        Tiền mặt
                    </button>

                    <button
                        type="button"
                        className={`ui-btn ${method === 'transfer' ? 'ui-btn--primary' : 'ui-btn--ghost'} ${styles.methodBtn}`}
                        onClick={() => setMethod('transfer')}
                    >
                        Chuyển khoản
                    </button>
                </div>

                {sectionContent}

                <div className="ui-actions ui-actions--end">
                    <button type="button" className="ui-btn ui-btn--ghost" onClick={onClose}>
                        Đóng
                    </button>
                    <button
                        type="button"
                        className="ui-btn ui-btn--primary"
                        onClick={handleConfirm}
                        disabled={submitting || (method === 'cash' && !cashEvidenceFile)}
                    >
                        {submitting ? 'Đang xử lý...' : 'Xác nhận đã thanh toán'}
                    </button>
                </div>
            </dialog>
        </div>
    );
}

ReceiptPaymentMethodModal.propTypes = {
    open: PropTypes.bool,
    onClose: PropTypes.func,
    ticketCode: PropTypes.string,
    total: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    printTicket: PropTypes.any,
    onConfirmPayment: PropTypes.func,
};

// --- Main Page Component ---

export default function ReceiptPaymentMethod() {
    useScrollToTop();
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();

    const ticketCodeParam = String(params?.ticketCode || '').trim();
    const totalFromState = location?.state?.total;
    const total = useMemo(() => toMoneyNumber(totalFromState), [totalFromState]);
    const printTicket = location?.state?.printTicket ?? null;

    const handleConfirmPayment = async ({ method, evidenceFile }) => {
        try {
            // Xử lý gọi API update database ở đây (nếu có)
            console.log("Dữ liệu thanh toán chuẩn bị gửi đi:", { method, evidenceFile });
        } catch (error) {
            console.error("Lỗi khi gọi API xác nhận thanh toán:", error);
            toast.error("Đã xảy ra lỗi khi lưu thông tin thanh toán.");
        }
    };

    return (
        <div className={styles.page}>
            <ReceiptPaymentMethodModal
                open
                onClose={() => navigate(-1)}
                ticketCode={ticketCodeParam}
                total={total}
                printTicket={printTicket}
                onConfirmPayment={handleConfirmPayment}
            />
        </div>
    );
}