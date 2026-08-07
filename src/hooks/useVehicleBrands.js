import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createVehicleBrand, createVehicleModel, fetchVehicleBrands } from '../services/vehicleBrandService.js';
import { POPULAR_MODELS, VEHICLE_MAKES } from '../components/vehicleConstants.js';

/**
 * Danh mục hãng xe / dòng xe lấy từ backend (bảng vehicle_brand, vehicle_model).
 * Nếu API lỗi thì lùi về danh sách tĩnh trong vehicleConstants.js để form vẫn
 * dùng được — chỉ mất khả năng thêm hãng mới.
 *
 * Kết quả được cache ở cấp module: các form mở sau không gọi lại API.
 */

let cachedBrands = null;
let inflight = null;

const loadBrands = () => {
  if (cachedBrands) return Promise.resolve(cachedBrands);
  inflight ??= fetchVehicleBrands()
    .then((res) => {
      const list = res?.data || [];
      if (list.length > 0) cachedBrands = list;
      return cachedBrands || [];
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
};

export const invalidateVehicleBrandCache = () => {
  cachedBrands = null;
};

export const useVehicleBrands = () => {
  const [brands, setBrands] = useState(cachedBrands || []);
  const [loading, setLoading] = useState(!cachedBrands);
  const [usingFallback, setUsingFallback] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Mọi setState đều nằm trong callback của promise: gọi thẳng trong useEffect
  // mà không tạo render thừa.
  const reload = useCallback((force = false) => {
    if (force) invalidateVehicleBrandCache();
    return loadBrands()
      .then((list) => {
        if (!mountedRef.current) return;
        setBrands(list);
        setUsingFallback(list.length === 0);
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setBrands([]);
        setUsingFallback(true);
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    // Đã có cache thì state khởi tạo từ cache rồi, không cần gọi lại API.
    if (!cachedBrands) reload();
  }, [reload]);

  const makes = useMemo(
    () => (usingFallback || brands.length === 0 ? VEHICLE_MAKES : brands.map((b) => b.name)),
    [brands, usingFallback]
  );

  const modelsByMake = useMemo(() => {
    if (usingFallback || brands.length === 0) return POPULAR_MODELS;
    const map = {};
    brands.forEach((brand) => {
      map[String(brand.name || '').toUpperCase()] = brand.models || [];
    });
    return map;
  }, [brands, usingFallback]);

  const findBrandId = useCallback(
    (name) => brands.find((b) => String(b.name).toUpperCase() === String(name || '').toUpperCase())?.brandId ?? null,
    [brands]
  );

  /** Thêm hãng xe mới vào danh mục; trả về bản ghi vừa tạo. */
  const addBrand = useCallback(
    async (name) => {
      const res = await createVehicleBrand({ name });
      const created = res?.data;
      if (created) {
        cachedBrands = [...(cachedBrands || brands), { ...created, models: created.models || [] }];
        setBrands(cachedBrands);
        setUsingFallback(false);
      }
      return created;
    },
    [brands]
  );

  /** Thêm dòng xe cho một hãng; tự tạo hãng nếu chưa có trong danh mục. */
  const addModel = useCallback(
    async (makeName, modelName) => {
      let brandId = findBrandId(makeName);
      if (!brandId) {
        const created = await addBrand(makeName);
        brandId = created?.brandId;
      }
      if (!brandId) return null;

      const res = await createVehicleModel(brandId, modelName);
      const savedName = res?.data || modelName;
      cachedBrands = (cachedBrands || brands).map((brand) =>
        brand.brandId === brandId
          ? { ...brand, models: [...(brand.models || []), savedName] }
          : brand
      );
      setBrands(cachedBrands);
      return savedName;
    },
    [addBrand, brands, findBrandId]
  );

  return { makes, modelsByMake, brands, loading, usingFallback, reload, addBrand, addModel, findBrandId };
};

export default useVehicleBrands;
