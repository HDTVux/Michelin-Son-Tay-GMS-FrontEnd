import { useEffect, useState, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Search, X, ChevronRight, FolderOpen, Tag } from 'lucide-react';
import styles from './WorkCategoryPicker.module.css';

export default function WorkCategoryPicker({ open, onClose, onPick, categorySuggestions }) {
    const dialogRef = useRef(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (open) {
            setSearch('');
            if (!dialog.open) {
                const isDemoMode = typeof window !== 'undefined' && window.location.pathname.includes('/demo');
                if (isDemoMode) {
                    dialog.show();
                } else {
                    dialog.showModal();
                }
            }
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

    const handleSearchChange = (e) => {
        setSearch(e.target.value);
    };

    const handleClose = () => {
        onClose?.();
    };

    const handlePick = (item) => {
        onPick?.(item);
        onClose?.();
    };

    // Generate avatar color/gradients based on the category name
    const getAvatarGradient = (name) => {
        const gradients = [
            'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)', // Blue/Indigo
            'linear-gradient(135deg, #10b981 0%, #059669 100%)', // Emerald
            'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', // Amber
            'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', // Pink
            'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', // Purple
        ];
        let sum = 0;
        for (let i = 0; i < name.length; i++) {
            sum += name.charCodeAt(i);
        }
        return gradients[sum % gradients.length];
    };

    if (!open) return null;

    return (
        <dialog
            ref={dialogRef}
            className={styles.dialog}
            onCancel={(e) => {
                e.preventDefault();
                handleClose();
            }}
        >
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.titleContainer}>
                    <Tag size={20} className={styles.titleIcon} />
                    <h3 id="work-category-title" className={styles.title}>Chọn Hạng mục</h3>
                </div>
                <button 
                    type="button" 
                    className={styles.closeButton} 
                    onClick={handleClose}
                    aria-label="Đóng popup"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Body */}
            <div className={styles.body}>
                {/* Search Bar */}
                <div className={styles.searchWrapper}>
                    <span className={styles.searchIcon}>
                        <Search size={18} />
                    </span>
                    <input
                        type="text"
                        placeholder="Tìm kiếm nhanh hạng mục..."
                        value={search}
                        onChange={handleSearchChange}
                        className={styles.searchInput}
                        autoFocus
                    />
                </div>

                {/* Categories Scroll Area */}
                <div className={styles.listContainer}>
                    {filteredItems.length === 0 ? (
                        <div className={styles.emptyState}>
                            <FolderOpen size={44} className={styles.emptyIcon} />
                            <p className={styles.emptyText}>Không tìm thấy hạng mục nào</p>
                            <p className={styles.emptySubtext}>Vui lòng kiểm tra lại từ khóa tìm kiếm</p>
                        </div>
                    ) : (
                        filteredItems.map((item, idx) => {
                            const trimmedName = String(item || '').trim();
                            const initialChar = trimmedName.charAt(0).toUpperCase() || '?';
                            const avatarStyle = {
                                background: getAvatarGradient(trimmedName),
                            };

                            return (
                                <button
                                    key={trimmedName || idx}
                                    type="button"
                                    className={styles.categoryCard}
                                    onClick={() => handlePick(item)}
                                >
                                    <div className={styles.categoryAvatar} style={avatarStyle}>
                                        {initialChar}
                                    </div>
                                    <div className={styles.categoryContent}>
                                        <p className={styles.categoryName}>{trimmedName}</p>
                                    </div>
                                    <span className={styles.selectIndicator}>
                                        <ChevronRight size={18} />
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className={styles.footer}>
                <div className={styles.countInfo}>
                    Tổng số: <span className={styles.highlightText}>{filteredItems.length}</span> hạng mục
                </div>
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

