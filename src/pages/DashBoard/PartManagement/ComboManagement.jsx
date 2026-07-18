import { useCallback, useEffect, useMemo, useState } from 'react';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { fetchCatalogItems } from '../../../services/blogService.js';
import { fetchComboItems, saveComboItems } from '../../../services/comboService.js';
import {
  createWarehouseCatalogItem,
  updateWarehouseCatalogItem,
  searchWarehouseCatalogItemsDetail,
  fetchWarehouseItemCategories,
  fetchWarehouseBrands,
  fetchWarehouseProductLines
} from '../../../services/warehouseService.js';
import styles from './ServiceManagement.module.css';
import { Settings, Pencil, Plus, Search, X, Check, Eye, Trash2, Layers } from 'lucide-react';

const extractPayload = (res) => res?.data?.data ?? res?.data ?? res;

const getLotsForCatalogItem = (catalogItem) => {
  if (!catalogItem) return [];
  const warehouses = catalogItem.warehouseDetails || [];
  const lots = [];
  warehouses.forEach(w => {
    if (Array.isArray(w.lots)) {
      w.lots.forEach(lot => {
        if ((lot.remainingQuantity || 0) > 0) {
          lots.push({
            ...lot,
            warehouseId: w.warehouseId,
            warehouseName: w.warehouseName || w.warehouseCode || `Kho #${w.warehouseId}`
          });
        }
      });
    }
  });
  return lots;
};

export default function ComboManagement() {
  useScrollToTop();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Table lists
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Form modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form dropdown/catalog lists
  const [catalogList, setCatalogList] = useState([]);

  // Form inputs (Only name, price, duration, descriptions - no SKU/Brand/Category as requested)
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [showPrice, setShowPrice] = useState(true);
  const [comboDurationMonths, setComboDurationMonths] = useState(12);
  const [isRecurring, setIsRecurring] = useState(false);
  const [comboDescription, setComboDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Database lists to prevent foreign key constraint violations
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [productLines, setProductLines] = useState([]);

  // Form sub-items (parts/services in combo) state
  const [subItems, setSubItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemToAdd, setSelectedItemToAdd] = useState(null);
  const [odometerKmToAdd, setOdometerKmToAdd] = useState(0);
  const [quantityToAdd, setQuantityToAdd] = useState(1);
  const [allocationMethodToAdd, setAllocationMethodToAdd] = useState('FIFO');
  const [entryItemIdToAdd, setEntryItemIdToAdd] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Load all available catalog items (parts & services) for picker and default catalog settings
  useEffect(() => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
    const loadCatalogData = async () => {
      try {
        const [servicesRes, partsRes, categoriesRes, brandsRes, productLinesRes] = await Promise.all([
          searchWarehouseCatalogItemsDetail({ size: 1000, itemType: 'SERVICE' }, token).catch(() => null),
          searchWarehouseCatalogItemsDetail({ size: 1000, itemType: 'PART' }, token).catch(() => null),
          fetchWarehouseItemCategories(token).catch(() => null),
          fetchWarehouseBrands(token).catch(() => null),
          fetchWarehouseProductLines(token).catch(() => null)
        ]);

        const extractList = (res) => {
          const payload = res?.data?.data ?? res?.data ?? res;
          return Array.isArray(payload?.content) ? payload.content : (Array.isArray(payload) ? payload : []);
        };
        const services = extractList(servicesRes);
        const parts = extractList(partsRes);
        setCatalogList([...services, ...parts]);

        const catsPayload = categoriesRes?.data?.data ?? categoriesRes?.data ?? categoriesRes ?? [];
        const cats = Array.isArray(catsPayload) ? catsPayload : (Array.isArray(catsPayload?.content) ? catsPayload.content : []);
        setCategories(cats);

        const brandsPayload = brandsRes?.data?.data ?? brandsRes?.data ?? brandsRes ?? [];
        const brs = Array.isArray(brandsPayload) ? brandsPayload : (Array.isArray(brandsPayload?.content) ? brandsPayload.content : []);
        setBrands(brs);

        const plsPayload = productLinesRes?.data?.data ?? productLinesRes?.data ?? productLinesRes ?? [];
        const pls = Array.isArray(plsPayload) ? plsPayload : (Array.isArray(plsPayload?.content) ? plsPayload.content : []);
        setProductLines(pls);
        console.log('Combo configuration default lists loaded:', { cats, brs, pls });
      } catch (err) {
        console.error('Failed to load catalog items for combos:', err);
      }
    };
    loadCatalogData();
  }, []);

  // Fetch combos list
  const fetchCombos = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
      const params = {
        page,
        size,
        itemType: 'COMBO',
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter) params.isActive = statusFilter === 'true';

      const res = await fetchCatalogItems(params, token);
      const payload = extractPayload(res);
      const content = Array.isArray(payload?.content) ? payload.content : (Array.isArray(payload) ? payload : []);

      setItems(content);
      setTotalElements(Number(payload?.totalElements ?? content.length));
      setTotalPages(Number(payload?.totalPages ?? Math.max(1, Math.ceil(content.length / size))));
    } catch (err) {
      setError(err?.message || 'Không thể tải danh sách gói Combo.');
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, size, debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchCombos();
  }, [fetchCombos]);

  // Catalog mapping for lookup
  const catalogMap = useMemo(() => {
    const map = new Map();
    catalogList.forEach(item => {
      if (item.itemId != null) {
        map.set(Number(item.itemId), item);
      }
    });
    return map;
  }, [catalogList]);

  // Autocomplete filtering for picker inside form modal
  const filteredCatalog = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase().trim();
    return catalogList.filter(item => {
      const matchName = String(item.itemName || '').toLowerCase().includes(query);
      const matchSku = String(item.sku || '').toLowerCase().includes(query);
      return matchName || matchSku;
    }).slice(0, 10);
  }, [catalogList, searchQuery]);

  // Open Form modal for Create
  const handleOpenCreate = () => {
    setEditingItem(null);
    setItemName('');
    setPrice('');
    setShowPrice(true);
    setComboDurationMonths(12);
    setIsRecurring(false);
    setComboDescription('');
    setIsActive(true);
    setSubItems([]);
    setSelectedItemToAdd(null);
    setSearchQuery('');
    setIsFormOpen(true);
  };

  // Open Form modal for Edit
  const handleOpenEdit = async (item) => {
    setEditingItem(item);
    setItemName(item.itemName || '');
    setPrice(item.price != null ? String(item.price) : '');
    setShowPrice(item.showPrice !== false);
    setComboDurationMonths(item.comboDurationMonths ?? 12);
    setIsRecurring(item.isRecurring === true || item.isRecurring === 1);
    setComboDescription(item.comboDescription || item.description || '');
    setIsActive(item.isActive !== false && item.is_active !== 0);
    setSubItems([]);
    setSelectedItemToAdd(null);
    setSearchQuery('');
    setIsFormOpen(true);

    // Fetch existing combo items
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
      const res = await fetchComboItems(item.itemId, null, token);
      const payload = res?.data?.data ?? res?.data ?? res;
      const data = Array.isArray(payload) ? payload : [];
      setSubItems(data);
    } catch (err) {
      console.error('Failed to load combo sub-items:', err);
    }
  };

  // Add sub-item locally to combo list in form
  const handleAddLocalItem = () => {
    if (!selectedItemToAdd) return;
    const includedItemId = Number(selectedItemToAdd.itemId);
    const quantity = Number(quantityToAdd) || 1;
    const odometerKm = Number(odometerKmToAdd) || 0;
    const allocationMethod = selectedItemToAdd.itemType === 'PART' ? allocationMethodToAdd : 'FIFO';
    const entryItemId = (selectedItemToAdd.itemType === 'PART' && allocationMethod === 'MANUAL' && entryItemIdToAdd)
      ? Number(entryItemIdToAdd)
      : null;

    // Check duplicate combo item
    const duplicateIndex = subItems.findIndex(
      item => Number(item.includedItemId) === includedItemId && 
              Number(item.odometerKm || 0) === odometerKm &&
              (item.allocationMethod || 'FIFO') === allocationMethod &&
              (item.entryItemId || null) === entryItemId
    );

    if (duplicateIndex !== -1) {
      const next = [...subItems];
      next[duplicateIndex].quantity = (next[duplicateIndex].quantity || 0) + quantity;
      setSubItems(next);
    } else {
      setSubItems([...subItems, {
        includedItemId,
        quantity,
        odometerKm,
        allocationMethod,
        entryItemId,
        comboId: editingItem ? editingItem.itemId : null
      }]);
    }

    setSelectedItemToAdd(null);
    setSearchQuery('');
    setQuantityToAdd(1);
    setOdometerKmToAdd(0);
    setAllocationMethodToAdd('FIFO');
    setEntryItemIdToAdd('');
  };

  // Remove local sub-item
  const handleRemoveLocalItem = (index) => {
    const next = [...subItems];
    next.splice(index, 1);
    setSubItems(next);
  };

  // Edit quantity inline
  const handleQtyChange = (index, value) => {
    const next = [...subItems];
    next[index].quantity = Math.max(1, Number(value) || 1);
    setSubItems(next);
  };

  // Edit odometer km inline
  const handleOdometerChange = (index, value) => {
    const next = [...subItems];
    next[index].odometerKm = Math.max(0, Number(value) || 0);
    setSubItems(next);
  };

  const handleAllocationMethodChange = (index, value) => {
    const next = [...subItems];
    next[index].allocationMethod = value;
    if (value === 'FIFO') {
      next[index].entryItemId = null;
    } else {
      const matchedCatalog = catalogMap.get(Number(next[index].includedItemId));
      const lots = getLotsForCatalogItem(matchedCatalog);
      next[index].entryItemId = lots[0]?.entryItemId || null;
    }
    setSubItems(next);
  };

  const handleEntryItemIdChange = (index, value) => {
    const next = [...subItems];
    next[index].entryItemId = value ? Number(value) : null;
    setSubItems(next);
  };

  // Handle submit form (Create or Update BOTH master and sub-items)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!itemName.trim()) {
      alert('Vui lòng nhập tên gói Combo.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      setSuccess('');
      const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');

      // Generate a random SKU code & defaults for database compatibility constraints
      const defaultSku = editingItem?.sku || `CB-${Date.now().toString().slice(-6)}`;
      
      // Resolve valid defaults from databases to prevent foreign key errors
      const firstActiveCategory = categories[0]?.workCategoryId || categories[0]?.itemCategoryId || 1;
      const firstActiveBrand = brands[0]?.brandId || 1;
      const firstActiveProductLine = productLines[0]?.productLineId || 1;

      const defaultCategoryId = editingItem?.workCategoryId || editingItem?.itemCategoryId || firstActiveCategory;
      const defaultBrandId = editingItem?.brandId || firstActiveBrand;
      const defaultProductLineId = editingItem?.productLineId || editingItem?.product_line_id || firstActiveProductLine;

      const masterPayload = {
        itemName: itemName.trim(),
        itemType: 'COMBO',
        sku: defaultSku,
        price: price ? Number(price) : 0,
        showPrice,
        description: comboDescription.trim(),
        comboDescription: comboDescription.trim(),
        comboDurationMonths: Number(comboDurationMonths) || 0,
        isRecurring,
        brandId: defaultBrandId,
        productLineId: defaultProductLineId,
        product_line_id: defaultProductLineId,
        itemCategoryId: defaultCategoryId,
        workCategoryId: defaultCategoryId,
        isActive: isActive ? 1 : 0
      };

      let finalCatalogItemId = null;
      if (editingItem) {
        await updateWarehouseCatalogItem(editingItem.itemId, masterPayload, token);
        finalCatalogItemId = editingItem.itemId;
      } else {
        const res = await createWarehouseCatalogItem(masterPayload, token);
        const created = extractPayload(res);
        finalCatalogItemId = Number(created?.itemId ?? created?.catalogItemId ?? created?.id ?? 0) || null;
      }

      if (!finalCatalogItemId) {
        throw new Error('Không lấy được ID của gói Combo sau khi lưu.');
      }

      // Save sub-items
      const subItemsPayload = subItems.map(item => ({
        comboItemId: item.comboItemId || null,
        comboId: finalCatalogItemId,
        includedItemId: item.includedItemId,
        quantity: item.quantity,
        odometerKm: item.odometerKm || 0,
        allocationMethod: item.allocationMethod || 'FIFO',
        entryItemId: item.entryItemId || null
      }));

      await saveComboItems(finalCatalogItemId, subItemsPayload, token);

      setSuccess(editingItem ? 'Đã cập nhật thông tin và thành phần gói Combo thành công!' : 'Đã tạo gói Combo và cấu hình thành công!');
      setTimeout(() => {
        setIsFormOpen(false);
        fetchCombos();
      }, 1000);
    } catch (err) {
      setError(err?.message || 'Lỗi lưu thông tin hoặc cấu hình gói Combo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles['service-page']}>
      {/* Header */}
      <div className={styles['service-header']}>
        <div className={styles['service-header-title']}>
          <span className={styles['header-icon']}>
            <Layers size={22} style={{ color: '#9333ea' }} />
          </span>
          <h1>Quản lý gói Combo bảo dưỡng</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className={styles['primary-button']} onClick={handleOpenCreate}>
            <Plus size={16} /> Thêm gói Combo mới
          </button>
          <span className={styles['total-count']}>{totalElements} Gói Combo</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={styles['pending-filters']}>
        <div className={styles['filter-card-actions']}>
          <div className={styles['search-box']}>
            <Search size={16} color="#9ca3af" style={{ flexShrink: 0 }} />
            <input
              placeholder="Tìm kiếm theo tên combo bảo dưỡng..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
          </div>
          <select
            className={styles['status-filter']}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Hoạt động</option>
            <option value="false">Không hoạt động</option>
          </select>
          <button 
            className={styles['ghost-button']} 
            onClick={() => { setSearch(''); setStatusFilter(''); setPage(0); }}
          >
            Xóa bộ lọc
          </button>
        </div>
      </div>

      {error && !isFormOpen && <div className={styles['error-banner']} style={{ marginBottom: '15px' }}>{error}</div>}
      {success && !isFormOpen && <div className={styles['success-banner']} style={{ marginBottom: '15px', color: '#16a34a', backgroundColor: '#f0fdf4', padding: '10px', borderRadius: '6px', fontWeight: 500 }}>{success}</div>}

      {/* Main Table */}
      <div className={styles['service-card']}>
        <div className={styles['table-wrapper']}>
          <table className={styles['service-table']}>
            <thead>
              <tr>
                <th style={{ width: '60px' }}>ID</th>
                <th>TÊN GÓI COMBO BẢO DƯỠNG</th>
                <th>GIÁ BÁN GÓI</th>
                <th>HẠN DÙNG (THÁNG)</th>
                <th>ĐỊNH KỲ</th>
                <th>TRẠNG THÁI</th>
                <th style={{ width: '100px', textAlign: 'center' }}>HÀNH ĐỘNG</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan="7" className={styles['empty-row']}>Đang tải dữ liệu...</td></tr>
              )}
              {!isLoading && totalElements === 0 && (
                <tr><td colSpan="7" className={styles['empty-row']}>Chưa có gói Combo nào được cấu hình.</td></tr>
              )}
              {!isLoading && items.map((item) => (
                <tr key={item.itemId}>
                  <td style={{ color: '#9333ea', fontWeight: 600, fontSize: 13 }}>{item.itemId}</td>
                  <td style={{ textAlign: 'left', fontWeight: 500 }}>{item.itemName || '-'}</td>
                  <td>
                    {item.showPrice !== false && item.price != null
                      ? `${Number(item.price).toLocaleString('vi-VN')} ₫`
                      : 'Liên hệ'}
                  </td>
                  <td>{item.comboDurationMonths != null ? `${item.comboDurationMonths} tháng` : '-'}</td>
                  <td>
                    {item.isRecurring === true || item.isRecurring === 1 ? (
                      <span style={{ color: '#16a34a', fontWeight: 600, fontSize: 12 }}>Định kỳ</span>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: 12 }}>Một lần</span>
                    )}
                  </td>
                  <td>
                    <span className={`${styles['status-badge']} ${(item.isActive !== false && item.is_active !== 0) ? styles['status-active'] : styles['status-inactive']}`}>
                      {(item.isActive !== false && item.is_active !== 0) ? 'Hoạt động' : 'Không hoạt động'}
                    </span>
                  </td>
                  <td>
                    <div className={styles['action-buttons']} style={{ justifyContent: 'center' }}>
                      <button
                        className={`${styles['action-btn']} ${styles['edit-btn']}`}
                        onClick={() => handleOpenEdit(item)}
                        title="Sửa thông tin & cấu hình sản phẩm con"
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', padding: 0 }}
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className={styles['service-footer']}>
          <div className={styles['page-size']}>
            <span>Hiển thị:</span>
            <select value={String(size)} onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
          <div className={styles['pagination']}>
            <button
              className={styles['primary-button']}
              disabled={page <= 0 || isLoading}
              onClick={() => setPage(page - 1)}
            >
              Trước
            </button>
            {Array.from({ length: totalPages }).map((_, p) => (
              <button
                key={p}
                className={p === page ? styles['ghost-button'] : `${styles['primary-button']} ${styles['is-ghost']}`}
                disabled={p === page || isLoading}
                onClick={() => setPage(p)}
              >
                {p + 1}
              </button>
            ))}
            <button
              className={styles['primary-button']}
              disabled={page >= totalPages - 1 || isLoading}
              onClick={() => setPage(page + 1)}
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {/* Modal Form Thêm/Sửa gói Combo và Thành phần con (Không có SKU/Brand/Category đầu vào) */}
      {isFormOpen && (
        <div className={styles['modal-overlay']}>
          <div className={styles['modal-box']} style={{ maxWidth: '850px', width: '100%', borderRadius: '12px' }}>
            <div className={styles['modal-header']}>
              <h3>{editingItem ? 'Sửa thông tin & thành phần gói Combo' : 'Thêm gói Combo mới'}</h3>
              <button className={styles['modal-close']} onClick={() => setIsFormOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitForm}>
              <div className={styles['modal-body']} style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                
                {error && <div className={styles['error-banner']}>{error}</div>}
                {success && <div className={styles['success-banner']} style={{ color: '#16a34a', backgroundColor: '#f0fdf4', padding: '10px', borderRadius: '6px', fontWeight: 500 }}>{success}</div>}

                {/* Phần 1: Thông tin Master Combo */}
                <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>1. Thông tin gói Combo</h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                          Tên gói Combo bảo dưỡng *
                        </label>
                        <input
                          placeholder="Ví dụ: Gói bảo dưỡng cấp 10.000km"
                          value={itemName}
                          onChange={(e) => setItemName(e.target.value)}
                          style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', fontSize: '13px', outline: 'none' }}
                          required
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                          Đơn giá trọn gói (₫)
                        </label>
                        <input
                          type="number"
                          placeholder="Nhập giá trọn gói hoặc để 0"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', fontSize: '13px', outline: 'none' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                          Thời hạn combo (tháng)
                        </label>
                        <input
                          type="number"
                          value={comboDurationMonths}
                          onChange={(e) => setComboDurationMonths(Number(e.target.value))}
                          style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', fontSize: '13px', outline: 'none' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', height: '100%', marginTop: '20px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 500, color: '#334155', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={showPrice}
                            onChange={(e) => setShowPrice(e.target.checked)}
                            style={{ width: '16px', height: '16px' }}
                          />
                          Hiển thị đơn giá
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 500, color: '#334155', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={isRecurring}
                            onChange={(e) => setIsRecurring(e.target.checked)}
                            style={{ width: '16px', height: '16px' }}
                          />
                          Định kỳ
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 500, color: '#334155', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            style={{ width: '16px', height: '16px' }}
                          />
                          Hoạt động
                        </label>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Mô tả gói bảo dưỡng
                      </label>
                      <textarea
                        rows="2"
                        placeholder="Mô tả các hạng mục kiểm tra, thay thế..."
                        value={comboDescription}
                        onChange={(e) => setComboDescription(e.target.value)}
                        style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', fontSize: '13px', outline: 'none', resize: 'vertical' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Phần 2: Cấu hình Phụ tùng / Dịch vụ con */}
                <div>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>2. Danh sách phụ tùng & dịch vụ có trong gói Combo</h4>

                  {/* Thanh thêm phụ tùng con */}
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '15px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 100px auto', gap: '10px', alignItems: 'end', position: 'relative' }}>
                      
                      {/* Autocomplete Search */}
                      <div style={{ position: 'relative' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>
                          Tìm kiếm phụ tùng hoặc dịch vụ
                        </label>
                        {selectedItemToAdd ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'between', border: '1px solid #c084fc', padding: '6px 10px', borderRadius: '6px', background: '#faf5ff' }}>
                            <span style={{ fontSize: '12.5px', fontWeight: 500, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                              [{selectedItemToAdd.itemType === 'SERVICE' ? 'Dịch vụ' : 'Phụ tùng'}] {selectedItemToAdd.itemName}
                            </span>
                            <button 
                              type="button"
                              onClick={() => setSelectedItemToAdd(null)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a855f7', display: 'flex', marginLeft: 'auto' }}
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', padding: '0 8px' }}>
                            <Search size={15} color="#94a3b8" />
                            <input
                              placeholder="Gõ tên sản phẩm con để tìm..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              style={{ width: '100%', border: 'none', outline: 'none', padding: '6px 8px', fontSize: '12.5px' }}
                            />
                          </div>
                        )}

                        {/* Search Results list */}
                        {!selectedItemToAdd && filteredCatalog.length > 0 && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', zIndex: 1000, maxHeight: '180px', overflowY: 'auto', marginTop: '4px' }}>
                            {filteredCatalog.map(item => (
                              <div
                                key={item.itemId}
                                onClick={() => {
                                  setSelectedItemToAdd(item);
                                  setSearchQuery('');
                                }}
                                style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '12.5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <span style={{ fontWeight: 500 }}>
                                  [{item.itemType === 'SERVICE' ? 'DV' : 'PT'}] {item.itemName}
                                </span>
                                <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                                  SKU: {item.sku || '-'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Mốc KM */}
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>
                          Mốc bảo dưỡng (km)
                        </label>
                        <select
                          value={String(odometerKmToAdd)}
                          onChange={(e) => setOdometerKmToAdd(Number(e.target.value))}
                          style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 8px', fontSize: '12.5px', background: '#fff', outline: 'none' }}
                        >
                          <option value="0">Mặc định (Mọi mốc)</option>
                          <option value="5000">5.000 km</option>
                          <option value="10000">10.000 km</option>
                          <option value="20000">20.000 km</option>
                          <option value="40000">40.000 km</option>
                          <option value="80000">80.000 km</option>
                        </select>
                      </div>

                      {/* Số lượng */}
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>
                          Số lượng
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={quantityToAdd}
                          onChange={(e) => setQuantityToAdd(Math.max(1, Number(e.target.value) || 1))}
                          style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 8px', fontSize: '12.5px', outline: 'none' }}
                        />
                      </div>

                      {/* Nút thêm */}
                      <button
                        type="button"
                        className={styles['primary-button']}
                        onClick={handleAddLocalItem}
                        disabled={!selectedItemToAdd}
                        style={{ height: '32px', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0 12px', fontSize: '12.5px' }}
                      >
                        <Plus size={14} /> Thêm
                      </button>

                    </div>
                  </div>

                  {/* Bảng phụ tùng con đã chọn */}
                  {subItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '25px 0', border: '2px dashed #e2e8f0', borderRadius: '8px', color: '#94a3b8', fontSize: '13px' }}>
                      Chưa có sản phẩm hoặc dịch vụ con nào được thêm vào gói Combo này.
                    </div>
                  ) : (
                    <div className={styles['table-wrapper']} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                      <table className={styles['service-table']} style={{ fontSize: '12.5px' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '40px' }}>STT</th>
                            <th>TÊN PHỤ TÙNG / DỊCH VỤ CON</th>
                            <th style={{ width: '90px' }}>LOẠI</th>
                            <th style={{ width: '130px' }}>MỐC KM BẢO DƯỠNG</th>
                            <th style={{ width: '140px' }}>PHƯƠNG THỨC CẤP PHÁT</th>
                            <th style={{ width: '200px' }}>LÔ HÀNG THỦ CÔNG</th>
                            <th style={{ width: '90px' }}>SỐ LƯỢNG</th>
                            <th style={{ width: '60px', textAlign: 'center' }}>XÓA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subItems.map((item, idx) => {
                            const matchedCatalog = catalogMap.get(Number(item.includedItemId));
                            const isPart = matchedCatalog?.itemType === 'PART';
                            const lots = getLotsForCatalogItem(matchedCatalog);
                            return (
                              <tr key={idx}>
                                <td>{idx + 1}</td>
                                <td style={{ textAlign: 'left' }}>
                                  <div style={{ fontWeight: 500, color: '#1e293b' }}>
                                    {matchedCatalog?.itemName || 'Sản phẩm #' + item.includedItemId}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace', marginTop: '1px' }}>
                                    Mã SKU: {matchedCatalog?.sku || '-'}
                                  </div>
                                </td>
                                <td>
                                  <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>
                                    {isPart ? 'Phụ tùng' : 'Dịch vụ'}
                                  </span>
                                </td>
                                <td>
                                  <select
                                    value={String(item.odometerKm || 0)}
                                    onChange={(e) => handleOdometerChange(idx, e.target.value)}
                                    style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px 4px', fontSize: '11.5px', background: '#fff' }}
                                  >
                                    <option value="0">Mặc định (Mọi mốc)</option>
                                    <option value="5000">5.000 km</option>
                                    <option value="10000">10.000 km</option>
                                    <option value="20000">20.000 km</option>
                                    <option value="40000">40.000 km</option>
                                    <option value="80000">80.000 km</option>
                                  </select>
                                </td>
                                <td>
                                  {isPart ? (
                                    <select
                                      value={item.allocationMethod || 'FIFO'}
                                      onChange={(e) => handleAllocationMethodChange(idx, e.target.value)}
                                      style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px 4px', fontSize: '11.5px', background: '#fff' }}
                                    >
                                      <option value="FIFO">FIFO (Tự động)</option>
                                      <option value="MANUAL">Chọn lô thủ công</option>
                                    </select>
                                  ) : (
                                    <span style={{ color: '#64748b', fontSize: '11.5px' }}>Tự động (FIFO)</span>
                                  )}
                                </td>
                                <td>
                                  {isPart && (item.allocationMethod === 'MANUAL') ? (
                                    <select
                                      value={item.entryItemId || ''}
                                      onChange={(e) => handleEntryItemIdChange(idx, e.target.value)}
                                      style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px 4px', fontSize: '11.5px', background: '#fff' }}
                                    >
                                      <option value="">-- Chọn lô hàng --</option>
                                      {lots.map(lot => (
                                        <option key={lot.entryItemId} value={lot.entryItemId}>
                                          {lot.entryCode} ({lot.warehouseName} - Còn {lot.remainingQuantity} - Giá {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(lot.sellingPrice)})
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span style={{ color: '#94a3b8', fontSize: '11.5px' }}>Không áp dụng</span>
                                  )}
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => handleQtyChange(idx, e.target.value)}
                                    style={{ width: '50px', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px', textAlign: 'center', fontSize: '11.5px' }}
                                  />
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveLocalItem(idx)}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>

              <div className={styles['modal-footer']} style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                <button type="button" className={styles['ghost-button']} onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>
                  Hủy bỏ
                </button>
                <button type="submit" className={styles['primary-button']} disabled={isSubmitting}>
                  {isSubmitting ? 'Đang lưu...' : 'Lưu gói Combo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
