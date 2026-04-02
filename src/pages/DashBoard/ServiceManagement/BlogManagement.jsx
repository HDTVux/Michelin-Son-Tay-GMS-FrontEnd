import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import styles from './BlogManagement.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import BlogFormModal from './BlogFormModal.jsx';
import { fetchCatalogItemDetail, fetchCatalogItems } from '../../../services/blogService.js';

const extractPayload = (res) => res?.data?.data ?? res?.data ?? res;
const stripHtml = (value) => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const toNullablePositiveNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
};
const getServiceIdFromUnknownShape = (input, maxDepth = 3) => {
  if (!input || typeof input !== 'object') return null;
  const visited = new Set();
  const queue = [{ node: input, depth: 0 }];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    const { node, depth } = current;
    if (!node || typeof node !== 'object' || visited.has(node)) continue;
    visited.add(node);
    for (const [rawKey, rawValue] of Object.entries(node)) {
      const key = String(rawKey || '').toLowerCase();
      const looksLikeServiceId =
        (key.includes('service') && key.includes('id'))
        || key === 'serviceid'
        || key === 'service_id'
        || key === 'service_service_id';
      if (looksLikeServiceId) {
        if (rawValue && typeof rawValue === 'object') {
          const nestedParsed = toNullablePositiveNumber(
            rawValue.id ?? rawValue.serviceId ?? rawValue.service_id ?? rawValue.service_service_id,
          );
          if (nestedParsed != null) return nestedParsed;
        } else {
          const parsed = toNullablePositiveNumber(rawValue);
          if (parsed != null) return parsed;
        }
      }
      if (depth < maxDepth && rawValue && typeof rawValue === 'object') {
        queue.push({ node: rawValue, depth: depth + 1 });
      }
    }
  }
  return null;
};

const getServiceServiceId = (item) => {
  if (!item || typeof item !== 'object') return null;

  const direct = [
    item.id,
    item.service_service_id,
    item.serviceServiceId,
    item.service_serviceId,
    item.serviceServiceID,
    item.serviceId,
    item.service_id,
    item?.service?.service_service_id,
    item?.service?.serviceServiceId,
    item?.service?.service_id,
    item?.service?.id,
    item?.serviceInfo?.service_service_id,
    item?.serviceInfo?.serviceServiceId,
    item?.serviceInfo?.service_id,
    item?.serviceInfo?.id,
  ];

  for (const value of direct) {
    const parsed = toNullablePositiveNumber(value);
    if (parsed != null) return parsed;
  }

  return getServiceIdFromUnknownShape(item);
};

const TYPE_LABELS = {
  PART: 'Phụ tùng',
  SERVICE: 'Dịch vụ',
  EQUIPMENT: 'Thiết bị',
  COMBO: 'Combo',
  MAINTENANCE_PACKAGE: 'Gói bảo dưỡng',
};

export default function BlogManagement() {
  useScrollToTop();

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [itemTypeFilter, setItemTypeFilter] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('');

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [modalMode, setModalMode] = useState('create');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const notify = useCallback((message, type = 'info') => {
    toast[type](message, { containerId: 'app-toast' });
  }, []);

  const loadItems = useCallback(async () => {
    try {
      setIsLoading(true);
      setFetchError('');

      const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
      const params = { page, size };

      if (debouncedSearch) params.search = debouncedSearch;
      if (itemTypeFilter) params.itemType = itemTypeFilter;
      if (isActiveFilter) params.isActive = isActiveFilter === 'true';

      const res = await fetchCatalogItems(params, token);
      const payload = extractPayload(res);
      const content = Array.isArray(payload?.content)
        ? payload.content
        : Array.isArray(payload)
          ? payload
          : [];

      const unresolved = content.filter((entry) => getServiceServiceId(entry) == null && toNullablePositiveNumber(entry?.itemId) != null);
      let normalizedContent = content;

      if (unresolved.length > 0) {
        const detailResults = await Promise.all(
          unresolved.map(async (entry) => {
            try {
              const detailRes = await fetchCatalogItemDetail(entry.itemId, token);
              const detail = extractPayload(detailRes);
              return {
                itemId: entry.itemId,
                serviceId: getServiceServiceId(detail),
                isActive: detail?.isActive,
              };
            } catch {
              return { itemId: entry.itemId, serviceId: null, isActive: undefined };
            }
          }),
        );

        const detailMap = new Map(detailResults.map((entry) => [entry.itemId, entry]));
        normalizedContent = content.map((entry) => {
          const mapped = detailMap.get(entry.itemId);
          if (!mapped || mapped.serviceId == null) return entry;
          return {
            ...entry,
            serviceServiceId: mapped.serviceId,
            service_service_id: mapped.serviceId,
            isActive: mapped.isActive ?? entry.isActive,
          };
        });
      }

      setItems(normalizedContent);
      setTotalElements(Number(payload?.totalElements ?? normalizedContent.length));
      setTotalPages(
        Number(
          payload?.totalPages
          ?? Math.max(1, Math.ceil((payload?.totalElements ?? normalizedContent.length) / Math.max(1, size))),
        ),
      );
    } catch (err) {
      setFetchError(err?.message || 'Không thể tải danh sách.');
      setItems([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, isActiveFilter, itemTypeFilter, page, size]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleSaved = useCallback(() => {
    setShowModal(false);
    setEditItem(null);
    setModalMode('create');
    loadItems();
  }, [loadItems]);

  const safePage = Math.min(Math.max(0, page), Math.max(0, totalPages - 1));

  const pageButtons = useMemo(() => {
    const maxButtons = 5;
    const last = totalPages - 1;
    const start = Math.max(0, Math.min(safePage - 2, last - (maxButtons - 1)));
    const end = Math.min(last, start + (maxButtons - 1));
    const result = [];
    for (let i = start; i <= end; i += 1) result.push(i);
    return result;
  }, [safePage, totalPages]);

  const resetFilters = useCallback(() => {
    setSearch('');
    setItemTypeFilter('');
    setIsActiveFilter('');
    setPage(0);
  }, []);

  const openCreateService = useCallback(() => {
    setEditItem(null);
    setModalMode('create');
    setShowModal(true);
  }, []);

  const openCreateFromCatalog = useCallback((item) => {
    setEditItem(item || null);
    setModalMode('createFromCatalog');
    setShowModal(true);
  }, []);

  const openEditService = useCallback((item) => {
    setEditItem(item || null);
    setModalMode('edit');
    setShowModal(true);
  }, []);

  const handleDeleteService = useCallback((item) => {
    const serviceId = getServiceServiceId(item);
    if (!serviceId) {
      notify('Catalog này chưa liên kết service để xóa.', 'info');
      return;
    }

    notify('Đã hiển thị đúng nút Xóa theo service_service_id. API xóa sẽ xử lý ở bước tiếp theo.', 'info');
  }, [notify]);

  return (
    <div className={styles.bookingPage}>
      <div className={styles.bookingHeader}>
        <div className={styles.bookingHeaderTitle}>
          <svg className={styles.headerIcon} viewBox="0 0 24 24" aria-hidden="true" style={{ width: 28, height: 28 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.6" fill="none" />
            <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="1.6" fill="none" />
            <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="1.6" />
            <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="1.6" />
            <line x1="10" y1="9" x2="8" y2="9" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Quản lý Blog / Dịch vụ</h1>
          <span className={styles.totalCount}>{totalElements} hạng mục</span>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.primaryButton} onClick={openCreateService}>
            Tạo dịch vụ
          </button>
        </div>
      </div>

      {fetchError && <div className={styles.errorBanner}>{fetchError}</div>}

      <div className={styles.pendingFilters}>
        <div className={styles.filterCardControls}>
          <div className={styles.searchBox}>
            <svg viewBox="0 0 24 24" fill="none" style={{ width: 16, height: 16, color: '#9ca3af', flexShrink: 0 }}>
              <path d="M10.8 18.2a7.4 7.4 0 1 1 0-14.8 7.4 7.4 0 0 1 0 14.8Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M16.6 16.6 21 21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, SKU, hãng..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </div>

          <select
            value={itemTypeFilter}
            onChange={(e) => {
              setItemTypeFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Tất cả loại</option>
            <option value="PART">Phụ tùng</option>
            <option value="SERVICE">Dịch vụ</option>
          </select>

          <select
            value={isActiveFilter}
            onChange={(e) => {
              setIsActiveFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Hoạt động</option>
            <option value="false">Không hoạt động</option>
          </select>
        </div>

        <div className={styles.filterCardActions}>
          <button type="button" className={styles.ghostButton} onClick={resetFilters}>
            Xóa bộ lọc
          </button>
        </div>
      </div>

      <div className={styles.bookingCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.bookingTable}>
            <thead>
              <tr>
                <th style={{ width: 60 }}>ID</th>
                <th>Tên hạng mục</th>
                <th style={{ width: 90 }}>SKU</th>
                <th style={{ width: 110 }}>Loại</th>
                <th style={{ width: 120 }}>Hãng</th>
                <th style={{ width: 120 }}>Dòng SP</th>
                <th style={{ width: 130 }}>Giá</th>
                <th style={{ width: 130 }}>ID dịch vụ</th>
                <th style={{ width: 110 }}>Trạng thái</th>
                <th style={{ width: 200 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={10} className={styles.emptyRow}>Đang tải dữ liệu...</td>
                </tr>
              )}

              {!isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={10} className={styles.emptyRow}>
                    {totalElements === 0 && (debouncedSearch || itemTypeFilter || isActiveFilter)
                      ? 'Không có kết quả phù hợp.'
                      : 'Chưa có hạng mục nào.'}
                  </td>
                </tr>
              )}

              {!isLoading && items.map((item) => {
                const serviceServiceId = getServiceServiceId(item);
                const hasService = serviceServiceId != null;

                return (
                  <tr key={item.itemId}>
                    <td style={{ color: '#9333ea', fontWeight: 600, fontSize: 13 }}>{item.itemId}</td>

                    <td>
                      <div className={styles.titleCell}>
                        <span className={styles.title}>{item.itemName || '-'}</span>
                        {item.description && <span className={styles.desc}>{stripHtml(item.description)}</span>}
                      </div>
                    </td>

                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>
                        {item.sku || '-'}
                      </span>
                    </td>

                    <td>
                      <span
                        style={{
                          background: item.itemType === 'SERVICE' ? '#eff6ff' : '#f0fdf4',
                          color: item.itemType === 'SERVICE' ? '#1d4ed8' : '#15803d',
                          padding: '3px 10px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      >
                        {TYPE_LABELS[item.itemType] || item.itemType || '-'}
                      </span>
                    </td>

                    <td style={{ fontSize: 13, color: '#374151' }}>{item.brand || '-'}</td>
                    <td style={{ fontSize: 13, color: '#374151' }}>{item.productLine || '-'}</td>

                    <td>
                      {item.showPrice ? (
                        <span className={styles.price}>
                          {item.price != null ? `${Number(item.price).toLocaleString('vi-VN')} d` : '-'}
                        </span>
                      ) : (
                        <span className={styles.noPrice}>Liên hệ</span>
                      )}
                    </td>

                    <td>
                      {hasService ? (
                        <span className={styles.linkedServiceBadge}>#{serviceServiceId}</span>
                      ) : (
                        <span className={styles.unlinkedServiceBadge}>Chưa tạo</span>
                      )}
                    </td>

                    <td>
                      <span className={`${styles.statusBadge} ${item.isActive ? styles.statusActive : styles.statusInactive}`}>
                        {item.isActive ? 'Hoạt động' : 'Không hoạt động'}
                      </span>
                    </td>

                    <td>
                      <div className={styles.actionButtons}>
                        {hasService ? (
                          <>
                            <button type="button" className={styles.viewBtn} onClick={() => openEditService(item)}>
                              Sửa
                            </button>
                            <button type="button" className={styles.deleteBtn} onClick={() => handleDeleteService(item)}>
                              Xóa
                            </button>
                          </>
                        ) : (
                          <button type="button" className={styles.createBtn} onClick={() => openCreateFromCatalog(item)}>
                            Tạo mới
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!isLoading && totalElements > 0 && (
          <div className={styles.bookingFooter}>
            <div className={styles.pageSize}>
              <span>Hiển thị:</span>
              <select
                value={String(size)}
                onChange={(e) => {
                  setSize(Number(e.target.value));
                  setPage(0);
                }}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>

            <div className={styles.pagination}>
              <button className={styles.primaryButton} disabled={safePage <= 0} onClick={() => setPage(safePage - 1)}>
                Trước
              </button>

              {pageButtons.map((p) => (
                <button
                  key={p}
                  className={p === safePage ? styles.primaryButton : `${styles.primaryButton} ${styles.isGhost}`}
                  disabled={p === safePage}
                  onClick={() => setPage(p)}
                >
                  {p + 1}
                </button>
              ))}

              <button className={styles.primaryButton} disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)}>
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <BlogFormModal
          item={editItem}
          mode={modalMode}
          onClose={() => {
            setShowModal(false);
            setEditItem(null);
            setModalMode('create');
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
