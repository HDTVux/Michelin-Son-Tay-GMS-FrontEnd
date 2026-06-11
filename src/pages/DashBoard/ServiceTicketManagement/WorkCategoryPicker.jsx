import { useEffect, useState, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import styles from './CatalogPicker.module.css';

export default function WorkCategoryPicker({ open, onClose, onPick, categorySuggestions }) {
    const dialogRef = useRef(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const size = 10;

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (open) {
            setSearch('');
            setPage(0);
            if (!dialog.open) dialog.showModal();
        } else {
            if (dialog.open) dialog.close();
        }
    }, [open]);

    const filteredItems = useMemo(() => {
        const list = Array.isArray(categorySuggestions) ? categorySuggestions : [];
        const q = String(search || '').trim().toLowerCase();
        if (!q) return list;
        return list.filter((item) => String(item || '').toLowerCase().includes(q));
    }, [categorySuggestions, search]);

    const totalElements = filteredItems.length;
    const totalPages = Math.max(1, Math.ceil(totalElements / size));
    const paginatedItems = useMemo(() => {
        const start = page * size;
        return filteredItems.slice(start, start + size);
    }, [filteredItems, page, size]);

    const handleSearchChange = (e) => {
        setSearch(e.target.value);
        setPage(0);
    };

    const handleClose = () => {
        onClose?.();
    };

    const handlePick = (item) => {
        onPick?.(item);
        onClose?.();
    };

    const pageButtons = useMemo(() => {
        const max = 5;
        const last = totalPages - 1;
        const start = Math.max(0, Math.min(page - 2, last - max + 1));
        const items = [];
        for (let i = start; i <= Math.min(last, start + max - 1); i += 1) {
            items.push(i);
        }
        return items;
    }, [page, totalPages]);

    if (!open) return null;

    return (
        <dialog
            ref={dialogRef}
            className={styles.catalogPickerDialog}
            style={{ maxWidth: '600px', height: 'auto', maxHeight: '80vh' }}
            onCancel={(e) => {
                e.preventDefault();
                handleClose();
            }}
        >
            <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Chọn Hạng mục</h3>
                <button type="button" className={styles.modalCloseButton} onClick={handleClose}>
                    ×
                </button>
            </div>
            <div className={styles.modalBody}>
                {/* Search Bar */}
                <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        placeholder="Tìm kiếm hạng mục..."
                        value={search}
                        onChange={handleSearchChange}
                        style={{
                            flex: 1,
                            padding: '10px 12px',
                            borderRadius: '6px',
                            border: '1.5px solid #e5e7eb',
                            fontSize: '14px',
                            outline: 'none',
                        }}
                    />
                </div>

                {/* Categories Table */}
                <div className={styles.tableWrap} style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: '60px', textAlign: 'center' }}>STT</th>
                                <th>Tên Hạng mục</th>
                                <th style={{ width: '100px', textAlign: 'center' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedItems.length === 0 ? (
                                <tr>
                                    <td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                                        Không tìm thấy hạng mục nào.
                                    </td>
                                </tr>
                            ) : (
                                paginatedItems.map((item, idx) => {
                                    const stt = page * size + idx + 1;
                                    return (
                                        <tr key={item || idx}>
                                            <td style={{ textAlign: 'center' }}>{stt}</td>
                                            <td style={{ fontWeight: '600', color: '#374151' }}>{item}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    type="button"
                                                    className="ui-btn ui-btn--primary"
                                                    onClick={() => handlePick(item)}
                                                    style={{ padding: '6px 12px', fontSize: '13px' }}
                                                >
                                                    Chọn
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '16px',
                            paddingTop: '12px',
                            borderTop: '1px solid #e0e0e0',
                        }}
                    >
                        <span style={{ fontSize: '13px', color: '#6b7280' }}>
                            Hiển thị {page * size + 1} - {Math.min((page + 1) * size, totalElements)} trên {totalElements}
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                                type="button"
                                className="ui-btn ui-btn--ghost"
                                disabled={page <= 0}
                                onClick={() => setPage(page - 1)}
                                style={{ padding: '6px 10px', fontSize: '12px' }}
                            >
                                Trước
                            </button>
                            {pageButtons.map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    className={p === page ? 'ui-btn ui-btn--primary' : 'ui-btn ui-btn--ghost'}
                                    onClick={() => setPage(p)}
                                    style={{ padding: '6px 10px', fontSize: '12px', minWidth: '32px' }}
                                >
                                    {p + 1}
                                </button>
                            ))}
                            <button
                                type="button"
                                className="ui-btn ui-btn--ghost"
                                disabled={page >= totalPages - 1}
                                onClick={() => setPage(page + 1)}
                                style={{ padding: '6px 10px', fontSize: '12px' }}
                            >
                                Sau
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </dialog>
    );
}

WorkCategoryPicker.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onPick: PropTypes.func.isRequired,
    categorySuggestions: PropTypes.arrayOf(PropTypes.string).isRequired,
};
