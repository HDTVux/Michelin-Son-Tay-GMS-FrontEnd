import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Car, Download, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import {
  createVehicleBrand,
  createVehicleModel,
  deactivateVehicleBrand,
  fetchVehicleBrands,
  importVehicleModels,
  updateVehicleBrand,
} from '../../../services/vehicleBrandService.js';
import { invalidateVehicleBrandCache } from '../../../hooks/useVehicleBrands.js';
import styles from './VehicleBrandConfig.module.css';

/**
 * Cấu hình danh mục hãng xe / dòng xe (bảng vehicle_brand, vehicle_model).
 * Danh mục này dùng chung cho mọi form nhập xe: check-in, danh bạ đối tác,
 * tra cứu phụ tùng.
 */
const VehicleBrandConfig = () => {
  useScrollToTop();

  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState(null);
  const [showInactive, setShowInactive] = useState(false);

  const [newBrandName, setNewBrandName] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [busy, setBusy] = useState(false);

  const loadBrands = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchVehicleBrands({ activeOnly: false, withModels: true });
      const list = res?.data || [];
      setBrands(list);
      // Danh mục vừa đổi thì xoá cache để các form nhập xe nạp lại bản mới.
      invalidateVehicleBrandCache();
    } catch (error) {
      toast.error(error.message || 'Không tải được danh mục hãng xe');
      setBrands([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  const visibleBrands = useMemo(() => {
    const q = search.trim().toUpperCase();
    return brands
      .filter((brand) => showInactive || brand.active !== false)
      .filter((brand) => !q || String(brand.name).toUpperCase().includes(q));
  }, [brands, search, showInactive]);

  const selectedBrand = useMemo(
    () => brands.find((brand) => brand.brandId === selectedBrandId) || null,
    [brands, selectedBrandId]
  );

  const handleAddBrand = async (e) => {
    e.preventDefault();
    const name = newBrandName.trim();
    if (!name) {
      toast.warning('Vui lòng nhập tên hãng xe');
      return;
    }

    setBusy(true);
    try {
      const res = await createVehicleBrand({ name });
      toast.success(`Đã thêm hãng "${res?.data?.name || name.toUpperCase()}"`);
      setNewBrandName('');
      await loadBrands();
      if (res?.data?.brandId) setSelectedBrandId(res.data.brandId);
    } catch (error) {
      toast.error(error.message || 'Thêm hãng xe thất bại');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleActive = async (brand) => {
    setBusy(true);
    try {
      if (brand.active === false) {
        await updateVehicleBrand(brand.brandId, { active: true });
        toast.success(`Đã bật lại hãng "${brand.name}"`);
      } else {
        await deactivateVehicleBrand(brand.brandId);
        toast.success(`Đã ngừng sử dụng hãng "${brand.name}"`);
      }
      await loadBrands();
    } catch (error) {
      toast.error(error.message || 'Cập nhật hãng xe thất bại');
    } finally {
      setBusy(false);
    }
  };

  const handleAddModel = async (e) => {
    e.preventDefault();
    if (!selectedBrand) return;

    const name = newModelName.trim();
    if (!name) {
      toast.warning('Vui lòng nhập tên dòng xe');
      return;
    }

    setBusy(true);
    try {
      await createVehicleModel(selectedBrand.brandId, name);
      toast.success(`Đã thêm dòng xe "${name}"`);
      setNewModelName('');
      await loadBrands();
    } catch (error) {
      toast.error(error.message || 'Thêm dòng xe thất bại');
    } finally {
      setBusy(false);
    }
  };

  const handleImportModels = async () => {
    if (!selectedBrand) return;

    setBusy(true);
    try {
      const res = await importVehicleModels(selectedBrand.brandId);
      toast.success(res?.message || `Đã bổ sung ${res?.data || 0} dòng xe`);
      await loadBrands();
    } catch (error) {
      toast.error(error.message || 'Nạp dòng xe thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <Car size={22} /> Cấu hình hãng xe & dòng xe
          </h1>
          <p className={styles.subtitle}>
            Danh mục dùng chung cho mọi form nhập xe: check-in, danh bạ đối tác, tra cứu phụ tùng.
          </p>
        </div>
        <button className={styles.refreshButton} onClick={loadBrands} disabled={loading}>
          <RefreshCw size={15} /> Làm mới
        </button>
      </div>

      <div className={styles.layout}>
        {/* Cột trái: danh sách hãng */}
        <section className={styles.panel}>
          <form className={styles.addRow} onSubmit={handleAddBrand}>
            <input
              type="text"
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              className={styles.input}
              placeholder="Tên hãng xe mới (VD: LYNK & CO)"
            />
            <button type="submit" className={styles.primaryButton} disabled={busy}>
              <Plus size={15} /> Thêm hãng
            </button>
          </form>

          <div className={styles.toolbar}>
            <div className={styles.searchBox}>
              <Search size={15} className={styles.searchIcon} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm hãng xe..."
              />
            </div>
            <label className={styles.inlineCheckbox}>
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              <span>Hiện hãng đã tắt</span>
            </label>
          </div>

          {loading ? (
            <p className={styles.emptyText}>Đang tải danh mục...</p>
          ) : visibleBrands.length === 0 ? (
            <p className={styles.emptyText}>Không có hãng xe nào khớp.</p>
          ) : (
            <ul className={styles.brandList}>
              {visibleBrands.map((brand) => (
                <li
                  key={brand.brandId}
                  className={`${styles.brandItem} ${
                    brand.brandId === selectedBrandId ? styles.brandItemActive : ''
                  } ${brand.active === false ? styles.brandItemInactive : ''}`}
                >
                  <button
                    type="button"
                    className={styles.brandName}
                    onClick={() => setSelectedBrandId(brand.brandId)}
                  >
                    <span>{brand.name}</span>
                    <span className={styles.modelCount}>{(brand.models || []).length} dòng</span>
                  </button>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => handleToggleActive(brand)}
                    disabled={busy}
                    title={brand.active === false ? 'Bật lại hãng này' : 'Ngừng sử dụng hãng này'}
                  >
                    {brand.active === false ? <RefreshCw size={14} /> : <Trash2 size={14} />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Cột phải: dòng xe của hãng đang chọn */}
        <section className={styles.panel}>
          {selectedBrand ? (
            <>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Dòng xe của {selectedBrand.name}</h2>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={handleImportModels}
                  disabled={busy}
                  title="Nạp danh sách dòng xe từ cơ sở dữ liệu công khai NHTSA vPIC"
                >
                  <Download size={15} /> Nạp từ NHTSA
                </button>
              </div>

              <form className={styles.addRow} onSubmit={handleAddModel}>
                <input
                  type="text"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  className={styles.input}
                  placeholder="Tên dòng xe mới (VD: Camry)"
                />
                <button type="submit" className={styles.primaryButton} disabled={busy}>
                  <Plus size={15} /> Thêm dòng
                </button>
              </form>

              {(selectedBrand.models || []).length === 0 ? (
                <p className={styles.emptyText}>
                  Hãng này chưa có dòng xe nào. Thêm tay ở trên hoặc bấm &quot;Nạp từ NHTSA&quot;.
                </p>
              ) : (
                <div className={styles.modelGrid}>
                  {(selectedBrand.models || []).map((model) => (
                    <span key={model} className={styles.modelChip}>
                      {model}
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className={styles.placeholder}>
              <Car size={40} />
              <p>Chọn một hãng xe ở cột bên trái để xem và chỉnh sửa danh sách dòng xe.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default VehicleBrandConfig;
