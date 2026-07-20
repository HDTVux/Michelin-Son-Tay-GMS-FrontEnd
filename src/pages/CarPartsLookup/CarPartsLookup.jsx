import React, { useState, useEffect } from 'react';
import {
  fetchWarehouseItemCategories,
  searchWarehouseCatalogItemsDetail,
} from '../../services/warehouseService';
import { toast } from 'react-toastify';
import { Search, Package, Filter, AlertCircle } from 'lucide-react';
import styles from './CarPartsLookup.module.css';

const CAR_DATA = {
  Toyota: ['Vios', 'Camry', 'Innova', 'Corolla Cross', 'Fortuner', 'Yaris', 'Hilux', 'Wigo'],
  Honda: ['City', 'Civic', 'CR-V', 'HR-V', 'Accord', 'Brio'],
  Hyundai: ['Accent', 'Grand i10', 'Elantra', 'Tucson', 'Santa Fe', 'Creta', 'Kona'],
  Kia: ['Morning', 'Soluto', 'K3', 'Seltos', 'Sorento', 'Carnival', 'Sonet'],
  Mazda: ['Mazda 2', 'Mazda 3', 'Mazda 6', 'CX-5', 'CX-8', 'BT-50'],
  Ford: ['Ranger', 'Everest', 'Explorer', 'Territory'],
  Mitsubishi: ['Xpander', 'Outlander', 'Attrage', 'Triton', 'Pajero Sport'],
  VinFast: ['Fadil', 'Lux A2.0', 'Lux SA2.0', 'VF e34', 'VF 8', 'VF 9', 'VF 5'],
};

export default function CarPartsLookup() {
  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

  const [results, setResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoadingCats(true);
    try {
      const res = await fetchWarehouseItemCategories();
      if (res?.success) {
        // Chỉ lấy các danh mục thuộc loại PART
        const partCats = (res.data || []).filter((c) => c.categoryType === 'PART' && c.isActive);
        setCategories(partCats);
      }
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải danh sách danh mục.');
    } finally {
      setLoadingCats(false);
    }
  };

  const handleBrandChange = (e) => {
    setSelectedBrand(e.target.value);
    setSelectedModel(''); // Reset model when brand changes
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!selectedBrand && !selectedCategory && !selectedModel) {
      toast.warning('Vui lòng chọn ít nhất 1 tiêu chí tìm kiếm.');
      return;
    }

    setLoadingSearch(true);
    setHasSearched(true);
    try {
      const params = {
        itemType: 'PART',
        isActive: true,
        size: 50, // Load enough results
      };

      if (selectedCategory) params.categoryCode = selectedCategory;
      if (selectedBrand) params.vehicleBrand = selectedBrand;
      if (selectedModel) params.vehicleModel = selectedModel;

      const res = await searchWarehouseCatalogItemsDetail(params);
      if (res?.success) {
        setResults(res.data?.content || []);
      } else {
        setResults([]);
        toast.error(res?.message || 'Lỗi khi tìm kiếm');
      }
    } catch (err) {
      console.error(err);
      setResults([]);
      toast.error('Đã xảy ra lỗi khi kết nối với máy chủ.');
    } finally {
      setLoadingSearch(false);
    }
  };

  const formatCurrency = (val) => {
    const num = Number(val);
    if (!Number.isFinite(num)) return '0 ₫';
    return num.toLocaleString('vi-VN') + ' ₫';
  };

  return (
    <div className={styles.container}>
      <div className={styles.heroSection}>
        <div className={styles.heroOverlay}></div>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Tra Cứu Phụ Tùng Theo Xe</h1>
          <p className={styles.heroSubtitle}>
            Tìm kiếm lốp, ắc quy, dầu nhớt và các phụ tùng chính hãng phù hợp nhất cho xế yêu của bạn
          </p>
        </div>
      </div>

      <div className={styles.searchCardWrapper}>
        <div className={styles.searchCard}>
          <h2 className={styles.searchCardTitle}>
            <Filter className={styles.iconTitle} /> Bộ Lọc Tìm Kiếm
          </h2>
          <form className={styles.searchForm} onSubmit={handleSearch}>
            <div className={styles.formGroup}>
              <label>Loại phụ tùng</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                disabled={loadingCats}
              >
                <option value="">-- Tất cả phụ tùng --</option>
                {categories.map((c) => (
                  <option key={c.categoryCode} value={c.categoryCode}>
                    {c.categoryName}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Hãng xe</label>
              <select value={selectedBrand} onChange={handleBrandChange}>
                <option value="">-- Chọn hãng xe --</option>
                {Object.keys(CAR_DATA).map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Dòng xe</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={!selectedBrand}
              >
                <option value="">-- Chọn dòng xe --</option>
                {selectedBrand &&
                  CAR_DATA[selectedBrand]?.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
              </select>
            </div>

            <div className={styles.formAction}>
              <button type="submit" className={styles.searchBtn} disabled={loadingSearch}>
                {loadingSearch ? (
                  <span className={styles.spinner}></span>
                ) : (
                  <>
                    <Search /> Tìm kiếm
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className={styles.resultsSection}>
        {loadingSearch ? (
          <div className={styles.loadingWrapper}>
            <span className={styles.bigSpinner}></span>
            <p>Đang tìm kiếm phụ tùng phù hợp...</p>
          </div>
        ) : hasSearched && results.length === 0 ? (
          <div className={styles.noResults}>
            <AlertCircle className={styles.noResultIcon} />
            <h3>Không tìm thấy phụ tùng phù hợp</h3>
            <p>Vui lòng thử điều chỉnh lại bộ lọc tìm kiếm.</p>
          </div>
        ) : (
          hasSearched && (
            <>
              <h3 className={styles.resultsTitle}>
                Hiển thị {results.length} kết quả phù hợp
              </h3>
              <div className={styles.grid}>
                {results.map((item) => {
                  // Lấy giá thấp nhất nếu có nhiều kho, hoặc giá mặc định
                  let bestPrice = item.price;
                  if (item.warehouseDetails?.length > 0) {
                    const validPrices = item.warehouseDetails
                      .map((w) => w.sellingPrice)
                      .filter((p) => p && p > 0);
                    if (validPrices.length > 0) {
                      bestPrice = Math.min(...validPrices);
                    }
                  }

                  return (
                    <div key={item.itemId} className={styles.productCard}>
                      <div className={styles.productImageWrapper}>
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.itemName}
                            className={styles.productImage}
                          />
                        ) : (
                          <div className={styles.placeholderImage}>
                            <Package size={48} />
                          </div>
                        )}
                        {item.brandName && (
                          <span className={styles.brandBadge}>{item.brandName}</span>
                        )}
                      </div>
                      <div className={styles.productInfo}>
                        <h4 className={styles.productName}>{item.itemName}</h4>
                        <div className={styles.productMeta}>
                          <span className={styles.sku}>Mã SP: {item.sku}</span>
                          <span className={styles.warranty}>
                            Bảo hành: {item.warrantyDurationMonths || 0} tháng
                          </span>
                        </div>
                        {item.compatibleCars && (
                          <p className={styles.compatibleCars} title={item.compatibleCars}>
                            <strong>Tương thích:</strong> {item.compatibleCars}
                          </p>
                        )}
                        <div className={styles.productFooter}>
                          <div className={styles.priceContainer}>
                            {item.showPrice === false ? (
                              <span className={styles.contactPrice}>Liên hệ</span>
                            ) : (
                              <span className={styles.price}>{formatCurrency(bestPrice)}</span>
                            )}
                          </div>
                          <button className={styles.viewDetailBtn} onClick={() => window.location.href = `/parts?search=${item.sku}`}>
                            Xem chi tiết
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}
