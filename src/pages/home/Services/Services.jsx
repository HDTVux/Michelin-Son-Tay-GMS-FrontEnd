import './Services.css';
import { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { fetchHomeProducts } from '../../../services/homeService';
import { fetchWarehouseItemCategories } from '../../../services/warehouseService';
import serviceFallback from '../../../assets/lop and mam.jpg';
import processImg from '../../../assets/Quy trình 7 bước (1).png';

const extractPayload = (res) => res?.data?.data ?? res?.data ?? res;
const toPositiveNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
};
const parsePriceNumber = (value) => {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;

  const text = String(value).toLowerCase().trim();
  if (!text || text.includes('liên hệ')) return null;

  const match = text.match(/\d+(?:[.,]\d+)?/);
  if (!match) return null;

  const rawNumber = match[0];
  const normalizedNumber = rawNumber.includes(',')
    ? rawNumber.replace(/\./g, '').replace(',', '.')
    : rawNumber.replace(/\./g, '');
  const parsed = Number(normalizedNumber);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  const suffix = text.slice(match.index + rawNumber.length);
  if (/^\s*k\b/.test(suffix) || suffix.includes('nghìn') || suffix.includes('ngàn')) return parsed * 1000;
  if (suffix.includes('triệu') || suffix.includes('trieu')) return parsed * 1000000;
  return parsed;
};
const sanitizePriceInput = (value) => String(value || '').replace(/[^\d]/g, '');
const parsePriceFilterValue = (value) => {
  const text = sanitizePriceInput(value);
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};
const normalizeItemType = (value) => {
  const text = String(value || '').trim().toUpperCase();
  if (text === 'PART' || text === 'PRODUCT' || text === 'SPARE_PART' || text === 'SPAREPART') return 'PART';
  return 'SERVICE';
};
const normalizeCategoryType = (value) => {
  const text = String(value || '').trim().toUpperCase();
  if (text === 'PART' || text === 'PRODUCT' || text === 'SPARE_PART' || text === 'SPAREPART') return 'PART';
  if (text === 'SERVICE') return 'SERVICE';
  return '';
};
const normalizeCategoryToken = (value) => String(value ?? '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replaceAll(/[\u0300-\u036f]/g, '')
  .replaceAll(/\s+/g, ' ');
const getCategoryId = (item) => toPositiveNumber(
  item?.workCategoryId
  ?? item?.itemCategoryId
  ?? item?.categoryId
  ?? item?.category?.id
  ?? item?.category?.categoryId
  ?? item?.category?.workCategoryId
  ?? item?.category?.itemCategoryId
  ?? item?.itemCategory?.id
  ?? item?.itemCategory?.categoryId
  ?? item?.itemCategory?.workCategoryId
  ?? item?.itemCategory?.itemCategoryId
  ?? item?.workCategory?.id
  ?? item?.workCategory?.categoryId
  ?? item?.workCategory?.workCategoryId
  ?? item?.workCategory?.itemCategoryId,
);
const firstNonEmptyString = (...values) => {
  for (const value of values) {
    if (value == null || typeof value === 'object') continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
};
const getCategoryCode = (item) => firstNonEmptyString(
  item?.categoryCode,
  item?.itemCategoryCode,
  item?.workCategoryCode,
  item?.code,
  item?.category?.code,
  item?.category?.categoryCode,
  item?.category?.itemCategoryCode,
  item?.category?.workCategoryCode,
  item?.itemCategory?.code,
  item?.itemCategory?.categoryCode,
  item?.itemCategory?.itemCategoryCode,
  item?.workCategory?.code,
  item?.workCategory?.categoryCode,
  item?.workCategory?.workCategoryCode,
);
const getCategoryName = (item) => firstNonEmptyString(
  item?.categoryName,
  item?.itemCategoryName,
  item?.workCategoryName,
  item?.name,
  typeof item?.category === 'string' ? item.category : undefined,
  typeof item?.itemCategory === 'string' ? item.itemCategory : undefined,
  typeof item?.workCategory === 'string' ? item.workCategory : undefined,
  item?.category?.name,
  item?.category?.categoryName,
  item?.category?.itemCategoryName,
  item?.category?.workCategoryName,
  item?.itemCategory?.name,
  item?.itemCategory?.categoryName,
  item?.itemCategory?.itemCategoryName,
  item?.workCategory?.name,
  item?.workCategory?.categoryName,
  item?.workCategory?.workCategoryName,
);
const getCategoryKey = (item) => {
  const id = getCategoryId(item);
  if (id != null) return `id:${id}`;
  const code = normalizeCategoryToken(getCategoryCode(item));
  if (code) return `code:${code}`;
  const name = getCategoryName(item);
  const normalizedName = normalizeCategoryToken(name);
  return normalizedName ? `name:${normalizedName}` : '';
};
const getCategoryMatchKeys = (item) => {
  const keys = new Set();
  const id = getCategoryId(item);
  const code = normalizeCategoryToken(getCategoryCode(item));
  const name = normalizeCategoryToken(getCategoryName(item));
  if (id != null) keys.add(`id:${id}`);
  if (code) keys.add(`code:${code}`);
  if (name) keys.add(`name:${name}`);
  return Array.from(keys);
};
const hasCategoryMatch = (left = [], right = []) => {
  const rightSet = new Set(right);
  return left.some((key) => rightSet.has(key));
};
const isCategoryActive = (value) => {
  if (value === false || value === 0) return false;
  if (typeof value === 'string') {
    const text = value.trim().toLowerCase();
    if (text === 'false' || text === '0' || text === 'inactive') return false;
  }
  return true;
};
const toDisplayPrice = (item) => {
  if (item?.showPrice !== true) return 'Liên hệ';
  const display = String(item?.displayPrice || '').trim();
  if (display) return display;
  const numeric = Number(item?.price);
  return Number.isFinite(numeric) ? `${numeric.toLocaleString('vi-VN')} đ` : 'Liên hệ';
};
const extractList = (res) => {
  const payload = extractPayload(res);
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.list)) return payload.list;
  if (Array.isArray(payload?.categories)) return payload.categories;
  if (Array.isArray(payload?.data)) return payload.data;
  return Array.isArray(payload) ? payload : [];
};

const ITEMS_PER_ROW = 4;
const INITIAL_ROWS = 1;
const HOME_ROW_LIMIT = 5;

const Services = ({ homeRows = false }) => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const routeCatalogType = String(searchParams.get('type') || '').trim().toUpperCase();
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [catalogFilter, setCatalogFilter] = useState('SERVICE');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [gridExpanded, setGridExpanded] = useState(false);
  const [priceSort, setPriceSort] = useState('DEFAULT');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [categoryCollapsed, setCategoryCollapsed] = useState(true);
  const didResetCatalogScrollRef = useRef(false);

  // Gói dịch vụ được tin dùng (commented out - not used currently)
  /*
  const combos = [
    {
      title: 'Combo "Trước chuyến đi"',
      description: 'Kiểm tra toàn diện trước khi đi xa',
      features: [
        'Kiểm tra lốp xe và áp suất',
        'Kiểm tra hệ thống phanh',
        'Kiểm tra đèn và hệ thống điện',
        'Kiểm tra dầu nhớt và nước làm mát'
      ],
      image: combo1,
      price: 'Liên hệ'
    },
    {
      title: 'Combo "Êm lái – hết rung"',
      description: 'Giải quyết vấn đề rung lắc khi lái xe',
      features: [
        'Cân bằng lốp xe',
        'Kiểm tra hệ thống treo',
        'Kiểm tra vành và mâm xe',
        'Điều chỉnh góc đặt bánh xe'
      ],
      image: combo2,
      price: 'Liên hệ'
    },
    {
      title: 'Combo "Lốp an toàn"',
      description: 'Đảm bảo lốp xe luôn trong tình trạng tốt nhất',
      features: [
        'Thay lốp mới chính hãng',
        'Cân bằng và điều chỉnh góc đặt',
        'Kiểm tra áp suất định kỳ',
        'Bảo hành chính thức'
      ],
      image: combo3,
      price: 'Liên hệ'
    },
    {
      title: 'Combo "Phanh an tâm"',
      description: 'Đảm bảo hệ thống phanh luôn hoạt động an toàn và hiệu quả',
      features: [
        'Kiểm tra hệ thống phanh toàn diện',
        'Thay thế má phanh khi cần',
        'Kiểm tra dầu phanh',
        'Bảo hành chính thức'
      ],
      image: combo4,
      price: 'Liên hệ'
    }
  ];
  */

  const partItems = useMemo(() => services.filter((item) => item.itemType === 'PART'), [services]);
  const serviceItems = useMemo(() => services.filter((item) => item.itemType === 'SERVICE'), [services]);
  const homePartItems = useMemo(() => partItems.slice(0, HOME_ROW_LIMIT), [partItems]);
  const homeServiceItems = useMemo(() => serviceItems.slice(0, HOME_ROW_LIMIT), [serviceItems]);

  const renderCatalogCard = (service, idx) => (
    <div key={service.id || `${service.itemType}-${idx}`} className="serviceGridItem">
      <div className="serviceCard">
        <div className="serviceCard-imageTop">
          <img src={service.image || serviceFallback} alt={service.title} className="serviceCard-image" />
          <div className="serviceCard-overlay">
            <Link
              to={service.serviceId || service.catalogItemId ? `/services/${service.serviceId || service.catalogItemId}` : '/services'}
              state={
                service.catalogItemId != null || service.serviceId != null
                  ? { catalogItemId: service.catalogItemId, serviceId: service.serviceId, itemType: service.itemType || 'SERVICE' }
                  : undefined
              }
              className="overlayViewBtn"
            >
              Xem chi tiết →
            </Link>
          </div>
          <div className="catalogTypeBadge">{service.itemType === 'PART' ? 'Phụ tùng' : 'Dịch vụ'}</div>
        </div>
        <div className="serviceCard-content">
          <h3 className="serviceTitle">{service.title}</h3>
          <p className="serviceDescription">{service.description || 'Hiện chưa có mô tả.'}</p>
          <div className="serviceCard-footer">
            <div className="servicePrice">{service.price || 'Liên hệ'}</div>
            <Link
              to="/booking"
              state={service.catalogItemId != null ? { catalogItemId: service.catalogItemId, itemType: service.itemType } : undefined}
              className="btnBookNow"
            >
              Đặt lịch
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCatalogRow = (title, subtitle, items, moreTo) => (
    <section className="servicesTypeSection" aria-label={title}>
      <div className="servicesTypeHeader">
        <div>
          <h2 className="servicesTypeTitle">{title}</h2>
          <p className="servicesTypeSubtitle">{subtitle}</p>
        </div>
        <div className="servicesTypeActions">
          <Link to={moreTo} state={{ resetCatalogScroll: true }} className="servicesTypeMore">
            Xem thêm
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="serviceStatus serviceStatusInline">Chưa có hạng mục để hiển thị.</div>
      ) : (
        <div className="servicesRowScroller">
          <div className="servicesRowGrid">
            {items.map(renderCatalogCard)}
          </div>
        </div>
      )}
    </section>
  );

  useEffect(() => {
    let active = true;
    setTimeout(() => { if (active) { setServicesLoading(true); setServicesError(''); }}, 0);

    Promise.allSettled([
      fetchHomeProducts({ page: 0, size: 500, itemType: 'SERVICE' }),
      fetchHomeProducts({ page: 0, size: 500, itemType: 'PART' }),
      fetchHomeProducts({ page: 0, size: 500, itemType: 'PRODUCT' }),
    ])
      .then((results) => {
        if (!active) return;

        const [serviceRes, partRes, productRes] = results;
        const mergedRaw = [
          ...(serviceRes?.status === 'fulfilled'
            ? extractList(serviceRes.value).map((item) => ({ ...item, __sourceType: 'SERVICE' }))
            : []),
          ...(partRes?.status === 'fulfilled'
            ? extractList(partRes.value).map((item) => ({ ...item, __sourceType: 'PART' }))
            : []),
          ...(productRes?.status === 'fulfilled'
            ? extractList(productRes.value).map((item) => ({ ...item, __sourceType: 'PART' }))
            : []),
        ];

        const mapped = mergedRaw
          .map((item) => {
            const itemType = normalizeItemType(item?.itemType ?? item?.type ?? item?.__sourceType);
            const catalogItemId = toPositiveNumber(item?.catalogItemId ?? item?.itemId);
            const serviceId = toPositiveNumber(item?.serviceId);
            const categoryId = getCategoryId(item);
            const categoryCode = getCategoryCode(item);
            const categoryName = getCategoryName(item);
            const categoryKey = getCategoryKey(item);
            const categoryMatchKeys = getCategoryMatchKeys(item);
            return {
              id: catalogItemId ?? serviceId,
              catalogItemId,
              serviceId,
              itemType,
              categoryId,
              categoryCode,
              categoryName,
              categoryKey,
              categoryMatchKeys,
              title: String(item?.title || item?.itemName || (itemType === 'PART' ? 'Phụ tùng' : 'Dịch vụ')).trim(),
              description: String(item?.shortDescription || item?.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
              image: String(item?.thumbnailUrl || item?.imageUrl || item?.mediaThumbnail || '').trim(),
              price: toDisplayPrice(item),
              rawPrice: item?.showPrice === true
                ? (parsePriceNumber(item?.price) ?? parsePriceNumber(item?.displayPrice))
                : null,
            };
          })
          .filter((item) => item.id || item.title);

        const deduped = new Map();
        mapped.forEach((item) => {
          const key = `${item.itemType}:${item.catalogItemId ?? item.serviceId ?? item.title}`;
          if (!deduped.has(key)) deduped.set(key, item);
        });

        setServices(Array.from(deduped.values()));

        if (serviceRes?.status === 'rejected' && partRes?.status === 'rejected' && productRes?.status === 'rejected') {
          setServicesError(
            serviceRes?.reason?.message ||
            partRes?.reason?.message ||
            productRes?.reason?.message ||
            'Không thể tải danh sách dịch vụ và phụ tùng.',
          );
        }
      })
      .catch((err) => {
        if (!active) return;
        console.error('[Services] Error loading services:', err);
        setServicesError(err?.message || 'Không thể tải danh sách dịch vụ và phụ tùng.');
      })
      .finally(() => {
        if (active) setServicesLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setCategoriesLoading(true);

    fetchWarehouseItemCategories()
      .then((res) => {
        if (!active) return;
        const normalized = extractList(res)
          .map((item) => {
            const categoryType = normalizeCategoryType(item?.categoryType ?? item?.itemType ?? item?.type);
            const categoryId = getCategoryId(item) ?? toPositiveNumber(item?.id);
            const categoryCode = getCategoryCode(item);
            const categoryName = getCategoryName(item);
            const categoryKey = getCategoryKey(item) || (categoryId != null ? `id:${categoryId}` : '');
            const categoryMatchKeys = getCategoryMatchKeys(item);
            if (!categoryKey || !isCategoryActive(item?.isActive ?? item?.status)) return null;
            return {
              categoryId,
              categoryCode,
              categoryName,
              categoryType,
              categoryKey,
              categoryMatchKeys,
              label: categoryName || categoryCode || `Nhóm #${categoryId}`,
            };
          })
          .filter(Boolean);

        const deduped = new Map();
        normalized.forEach((item) => {
          const key = `${item.categoryType}:${item.categoryKey}`;
          if (!deduped.has(key)) deduped.set(key, item);
        });
        setCategories(Array.from(deduped.values()));
      })
      .catch((err) => {
        console.error('[Services] Error loading categories:', err);
        if (active) setCategories([]);
      })
      .finally(() => {
        if (active) setCategoriesLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Scroll reveal cho 3 phần: dịch vụ, quy trình, combo

  useEffect(() => {
    if (homeRows) return;
    if (routeCatalogType !== 'PART' && routeCatalogType !== 'SERVICE') return;
    setCatalogFilter(routeCatalogType);
    setCategoryFilter('ALL');
    setGridExpanded(false);
    if (location.state?.resetCatalogScroll && !didResetCatalogScrollRef.current) {
      didResetCatalogScrollRef.current = true;
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [homeRows, location.state?.resetCatalogScroll, routeCatalogType]);

  useEffect(() => {
    if (homeRows) return;
    document.title = catalogFilter === 'PART'
      ? 'Phụ tùng - Michelin Sơn Tây'
      : 'Dịch vụ - Michelin Sơn Tây';
  }, [catalogFilter, homeRows]);

  const servicesHeroRef = useRef(null);
  const processHeaderRef = useRef(null);

  const [servicesIntroVisible, setServicesIntroVisible] = useState(false);
  const [processIntroVisible, setProcessIntroVisible] = useState(false);

  const categoryOptions = useMemo(() => {
    const derived = new Map();
    const typedServices = services.filter((item) => item.itemType === catalogFilter);

    typedServices
      .forEach((item) => {
        if (!item.categoryKey) return;
        if (!derived.has(item.categoryKey)) {
          derived.set(item.categoryKey, {
            categoryKey: item.categoryKey,
            categoryMatchKeys: item.categoryMatchKeys?.length ? item.categoryMatchKeys : [item.categoryKey],
            categoryCode: item.categoryCode,
            categoryName: item.categoryName,
            categoryType: item.itemType,
            label: item.categoryName || item.categoryCode || 'Khác',
          });
        }
      });

    const options = categories
      .filter((item) => !item.categoryType || item.categoryType === catalogFilter)
      .map((item) => {
        const matchKeys = item.categoryMatchKeys?.length ? item.categoryMatchKeys : [item.categoryKey];
        return {
          ...item,
          count: typedServices.filter((service) => hasCategoryMatch(service.categoryMatchKeys || [], matchKeys)).length,
        };
      });

    derived.forEach((item, key) => {
      const matchKeys = item.categoryMatchKeys?.length ? item.categoryMatchKeys : [key];
      if (!options.some((opt) => {
        const optionMatchKeys = opt.categoryMatchKeys?.length ? opt.categoryMatchKeys : [opt.categoryKey];
        return hasCategoryMatch(optionMatchKeys, matchKeys);
      })) {
        options.push({
          ...item,
          count: typedServices.filter((service) => hasCategoryMatch(service.categoryMatchKeys || [], matchKeys)).length,
        });
      }
    });

    return options.sort((a, b) => {
      const countDiff = (b.count || 0) - (a.count || 0);
      if (countDiff !== 0) return countDiff;
      return String(a.label || '').localeCompare(String(b.label || ''), 'vi');
    });
  }, [catalogFilter, categories, services]);

  const activeCategoryFilter = categoryFilter === 'ALL'
    || categoryOptions.some((item) => item.categoryKey === categoryFilter)
    ? categoryFilter
    : 'ALL';
  const activeCategoryLabel = activeCategoryFilter === 'ALL'
    ? 'Tất cả'
    : (categoryOptions.find((item) => item.categoryKey === activeCategoryFilter)?.label || 'Tất cả');

  const handleCatalogFilterChange = (nextType) => {
    setCatalogFilter(nextType);
    setCategoryFilter('ALL');
    setGridExpanded(false);
    setSearchParams({ type: nextType }, { replace: true });
  };

  const visibleServices = useMemo(() => {
    let filtered = services.filter((item) => item.itemType === catalogFilter);

    if (activeCategoryFilter !== 'ALL') {
      const selectedCategory = categoryOptions.find((item) => item.categoryKey === activeCategoryFilter);
      const matchKeys = selectedCategory?.categoryMatchKeys?.length
        ? selectedCategory.categoryMatchKeys
        : [activeCategoryFilter];
      filtered = filtered.filter((item) => hasCategoryMatch(item.categoryMatchKeys || [], matchKeys));
    }

    // Search filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((item) =>
        (item.title || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q)
      );
    }

    const minPrice = parsePriceFilterValue(priceMin);
    const maxPrice = parsePriceFilterValue(priceMax);
    if (minPrice != null || maxPrice != null) {
      filtered = filtered.filter((item) => {
        if (item.rawPrice == null) return false;
        if (minPrice != null && item.rawPrice < minPrice) return false;
        if (maxPrice != null && item.rawPrice > maxPrice) return false;
        return true;
      });
    }

    if (priceSort === 'ASC') {
      filtered = [...filtered].sort((a, b) => {
        const pa = a.rawPrice ?? Infinity;
        const pb = b.rawPrice ?? Infinity;
        return pa - pb;
      });
    } else if (priceSort === 'DESC') {
      filtered = [...filtered].sort((a, b) => {
        const pa = a.rawPrice ?? -Infinity;
        const pb = b.rawPrice ?? -Infinity;
        return pb - pa;
      });
    }

    return filtered;
  }, [activeCategoryFilter, catalogFilter, categoryOptions, services, priceSort, searchQuery, priceMin, priceMax]);

  const gridItemsToShow = useMemo(() => {
    if (gridExpanded) return visibleServices;
    return visibleServices.slice(0, ITEMS_PER_ROW * INITIAL_ROWS);
  }, [gridExpanded, visibleServices]);

  const hasMoreItems = visibleServices.length > ITEMS_PER_ROW * INITIAL_ROWS;

  // Dynamic title/label/subtitle based on active filter
  const dynamicLabel = useMemo(() => {
    if (catalogFilter === 'PART') return 'DANH MỤC PHỤ TÙNG';
    return 'DANH MỤC DỊCH VỤ';
  }, [catalogFilter]);

  const dynamicTitlePart1 = useMemo(() => {
    if (catalogFilter === 'PART') return 'Phụ tùng';
    return 'Dịch vụ';
  }, [catalogFilter]);

  const dynamicSubtitle = useMemo(() => {
    if (catalogFilter === 'PART')
      return 'Phụ tùng chính hãng, đa dạng chủng loại, đảm bảo chất lượng và giá cả hợp lý.';
    return 'Các dịch vụ bảo dưỡng, sửa chữa chuyên nghiệp với đội ngũ kỹ thuật viên giàu kinh nghiệm.';
  }, [catalogFilter]);
  // IntersectionObserver cho tiêu đề các phần

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          if (entry.target === servicesHeroRef.current) {
            setServicesIntroVisible(true);
          }
          if (entry.target === processHeaderRef.current) {
            setProcessIntroVisible(true);
          }
        });
      },
      { threshold: 0.25 }
    );

    const servicesEl = servicesHeroRef.current;
    const processEl = processHeaderRef.current;

    if (servicesEl) observer.observe(servicesEl);
    if (processEl) observer.observe(processEl);

    return () => {
      if (servicesEl) observer.unobserve(servicesEl);
      if (processEl) observer.unobserve(processEl);
      observer.disconnect();
    };
  }, []);
  return (
    <>
      {/* Hero + Grid Section */}
      <section className="servicesPage">
        <div className="servicesPage-bg" />
        {!homeRows && (
          <Link to="/" className="servicesBackHome">
            ← Về trang chủ
          </Link>
        )}
        <div
          ref={servicesHeroRef}
          className={`servicesHero ${servicesIntroVisible ? 'visible' : ''}`}
        >
          <div className="servicesLabel">{homeRows ? 'DANH MỤC' : dynamicLabel}</div>
          <h1 className="servicesTitle">
            <span className="titlePart1">{homeRows ? 'Dịch vụ & phụ tùng' : dynamicTitlePart1}</span>
            <span className="titlePart2">chính hãng</span>
          </h1>
          <p className="servicesSubtitle">
            {homeRows
              ? 'Phụ tùng chính hãng và dịch vụ bảo dưỡng, sửa chữa chuyên nghiệp.'
              : dynamicSubtitle}
          </p>
        </div>

        {!homeRows && (
        <>
        {/* Unified Toolbar: filters + sort + search */}
        <div className="unifiedToolbar">
          <div className="toolbarLeft">
            {[
              { value: 'SERVICE', label: 'Dịch vụ' },
              { value: 'PART', label: 'Phụ tùng' },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                className={`catalogFilterButton ${catalogFilter === item.value ? 'is-active' : ''}`}
                onClick={() => handleCatalogFilterChange(item.value)}
              >
                {item.label}
                {catalogFilter === item.value && (
                  <span className="filterCount">{services.filter(s => s.itemType === item.value).length}</span>
                )}
              </button>
            ))}

            <span className="toolbarDivider" />

            <label className="sortSelectWrap" htmlFor="servicesPriceSort">
              <span>Sắp xếp giá</span>
              <select
                id="servicesPriceSort"
                className="sortSelect"
                value={priceSort}
                onChange={(e) => {
                  setPriceSort(e.target.value);
                  setGridExpanded(false);
                }}
              >
                <option value="DEFAULT">Mặc định</option>
                <option value="ASC">Giá tăng dần</option>
                <option value="DESC">Giá giảm dần</option>
              </select>
            </label>
            <div className="priceRangeFilter">
              <div className="priceRangeTitle">Khoảng giá</div>
              <label className="priceRangeField">
                <span>Từ</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={priceMin}
                  placeholder="0"
                  onChange={(e) => {
                    setPriceMin(sanitizePriceInput(e.target.value));
                    setGridExpanded(false);
                  }}
                />
              </label>
              <label className="priceRangeField">
                <span>Đến</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={priceMax}
                  placeholder="VD: 500000"
                  onChange={(e) => {
                    setPriceMax(sanitizePriceInput(e.target.value));
                    setGridExpanded(false);
                  }}
                />
              </label>
              {(priceMin || priceMax) && (
                <button
                  type="button"
                  className="priceRangeClear"
                  onClick={() => {
                    setPriceMin('');
                    setPriceMax('');
                    setGridExpanded(false);
                  }}
                >
                  Xóa
                </button>
              )}
            </div>
          </div>

          <div className="toolbarSearch">
            <svg className="searchIcon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input
              type="text"
              className="searchInput"
              placeholder="Tìm kiếm dịch vụ, phụ tùng..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setGridExpanded(false);
              }}
            />
            {searchQuery && (
              <button
                type="button"
                className="searchClear"
                onClick={() => {
                  setSearchQuery('');
                  setGridExpanded(false);
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Grid layout */}
        <div className="servicesCatalogLayout">
          <aside className={`categorySidebar ${categoryCollapsed ? 'is-collapsed' : ''}`} aria-label="Lọc theo danh mục">
            <button
              type="button"
              className="categorySidebarHeader"
              onClick={() => setCategoryCollapsed((prev) => !prev)}
              aria-expanded={!categoryCollapsed}
            >
              <span>Danh mục</span>
              <span className="categorySidebarToggle">{categoryCollapsed ? 'Mở rộng' : 'Thu gọn'}</span>
            </button>
            {categoryCollapsed && (
              <div className="categorySidebarSummary">{activeCategoryLabel}</div>
            )}
            {!categoryCollapsed && (
            <div className="categorySidebarList">
              <button
                type="button"
                className={`categorySidebarItem ${activeCategoryFilter === 'ALL' ? 'is-active' : ''}`}
                onClick={() => {
                  setCategoryFilter('ALL');
                  setGridExpanded(false);
                }}
              >
                <span>Tất cả</span>
                <span className="categoryCount">{services.filter((item) => item.itemType === catalogFilter).length}</span>
              </button>
              {categoryOptions.map((item) => (
                <button
                  key={item.categoryKey}
                  type="button"
                  className={`categorySidebarItem ${activeCategoryFilter === item.categoryKey ? 'is-active' : ''}`}
                  onClick={() => {
                    setCategoryFilter(item.categoryKey);
                    setGridExpanded(false);
                  }}
                >
                  <span>{item.label}</span>
                  <span className="categoryCount">{item.count}</span>
                </button>
              ))}
              {categoriesLoading && categoryOptions.length === 0 && (
                <div className="categorySidebarHint">Đang tải danh mục...</div>
              )}
              {!categoriesLoading && categoryOptions.length === 0 && (
                <div className="categorySidebarHint">Chưa có danh mục.</div>
              )}
            </div>
            )}
          </aside>

          <div className="servicesGridWrapper">
          {servicesLoading && (
            <div className="serviceStatus">
              <div className="loadingSpinner" />
              <span>Đang tải danh mục...</span>
            </div>
          )}
          {!servicesLoading && servicesError && (
            <div className="serviceStatus error">
              {servicesError}
            </div>
          )}
          {!servicesLoading && !servicesError && visibleServices.length === 0 && (
            <div className="serviceStatus">
              Chưa có hạng mục phù hợp để hiển thị.
            </div>
          )}
          {gridItemsToShow.length > 0 && (
            <div className="servicesGrid">
              {gridItemsToShow.map((service, idx) => (
                <div key={service.id || idx} className="serviceGridItem">
                  <div className="serviceCard">
                    <div className="serviceCard-imageTop">
                      <img src={service.image || serviceFallback} alt={service.title} className="serviceCard-image" />
                      <div className="serviceCard-overlay">
                        <Link
                          to={service.serviceId || service.catalogItemId ? `/services/${service.serviceId || service.catalogItemId}` : '/services'}
                          state={
                            service.catalogItemId != null || service.serviceId != null
                              ? { catalogItemId: service.catalogItemId, serviceId: service.serviceId, itemType: service.itemType || 'SERVICE' }
                              : undefined
                          }
                          className="overlayViewBtn"
                        >
                          Xem chi tiết →
                        </Link>
                      </div>
                      <div className="catalogTypeBadge">{service.itemType === 'PART' ? 'Phụ tùng' : 'Dịch vụ'}</div>
                    </div>
                    <div className="serviceCard-content">
                      <h3 className="serviceTitle">{service.title}</h3>
                      <p className="serviceDescription">{service.description || 'Hiện chưa có mô tả.'}</p>
                      <div className="serviceCard-footer">
                        <div className="servicePrice">{service.price || 'Liên hệ'}</div>
                        <Link
                          to="/booking"
                          state={service.catalogItemId != null ? { catalogItemId: service.catalogItemId, itemType: service.itemType } : undefined}
                          className="btnBookNow"
                        >
                          Đặt lịch
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {hasMoreItems && !servicesLoading && (
            <div className="gridToggleWrapper">
              <button
                type="button"
                className="gridToggleButton"
                onClick={() => setGridExpanded((prev) => !prev)}
              >
                {gridExpanded ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
                    Thu gọn
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                    Xem thêm ({visibleServices.length - ITEMS_PER_ROW * INITIAL_ROWS} sản phẩm)
                  </>
                )}
              </button>
            </div>
          )}
          </div>
        </div>
        </>
        )}

        {homeRows && (
        <div className="servicesRowsWrapper">
          {servicesLoading && (
            <div className="serviceStatus">
              <div className="loadingSpinner" />
              <span>Đang tải danh mục...</span>
            </div>
          )}
          {!servicesLoading && servicesError && (
            <div className="serviceStatus error">
              {servicesError}
            </div>
          )}
          {!servicesLoading && !servicesError && (
            <>
              {renderCatalogRow('Phụ tùng', 'Phụ tùng chính hãng, đa dạng chủng loại.', homePartItems, '/services?type=PART')}
              {renderCatalogRow('Dịch vụ', 'Dịch vụ bảo dưỡng và sửa chữa chuyên nghiệp.', homeServiceItems, '/services?type=SERVICE')}
            </>
          )}
        </div>
        )}
      </section>

      {/* Quy trình dịch vụ */}
      <section className="processSection">
        <div className="processInner">
          <div
            ref={processHeaderRef}
            className={`processHeader ${processIntroVisible ? 'visible' : ''}`}
          >
            <div className="servicesLabel">QUY TRÌNH DỊCH VỤ</div>
            <h2 className="processTitle">
              <span className="titlePart1">Quy trình</span>
              <span className="titlePart2">chăm sóc & bảo dưỡng xe chuẩn Michelin</span>
            </h2>
            <p className="processSub">
              7 bước rõ ràng, minh bạch – từ tiếp nhận đến bàn giao, mang lại cho bạn trải nghiệm an tâm và chuyên nghiệp.
            </p>
          </div>

          <div className="processDiagram">
            <div className="processImageWrapper">
              <img className="processImageCenter" src={processImg} alt="Quy trình dịch vụ Michelin Sơn Tây" />
            </div>

            {[
              {
                no: 1,
                title: 'Tiếp nhận yêu cầu khách hàng',
                desc: 'Ghi nhận thông tin, nhu cầu và mong muốn của khách trước khi thao tác trên xe.'
              },
              {
                no: 2,
                title: 'Đưa xe vào khoang dịch vụ',
                desc: 'Hướng dẫn đưa xe vào đúng vị trí, đảm bảo an toàn cho người và phương tiện.'
              },
              {
                no: 3,
                title: 'Kiểm tra an toàn xe',
                desc: 'Kiểm tra sơ bộ các hạng mục an toàn chính trước khi tiến hành công việc.'
              },
              {
                no: 4,
                title: 'Thực hiện dịch vụ',
                desc: 'Thực hiện bảo dưỡng, sửa chữa theo quy trình và tiêu chuẩn kỹ thuật.'
              },
              {
                no: 5,
                title: 'Kiểm tra chất lượng',
                desc: 'Rà soát lại kết quả công việc, đảm bảo xe hoạt động ổn định sau dịch vụ.'
              },
              {
                no: 6,
                title: 'Chuẩn bị bàn giao xe',
                desc: 'Vệ sinh, sắp xếp và hoàn thiện các thủ tục cần thiết trước khi giao xe.'
              },
              {
                no: 7,
                title: 'Bàn giao xe',
                desc: 'Giải thích hạng mục đã thực hiện, bàn giao xe và hướng dẫn sử dụng an toàn.'
              }
            ].map((s) => (
              <div
                key={s.no}
                className={`processStepBubble step-${s.no}`}
              >
                <div className="processNo">{s.no}</div>
                <div className="processText">
                  <div className="processStepTitle">{s.title}</div>
                  <div className="processStepDesc">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gói dịch vụ được tin dùng */}
      {/* <section className="combosPage">
        <div
          ref={combosHeroRef}
          className={`servicesHero ${combosIntroVisible ? 'visible' : ''}`}
        >
          <div className="servicesLabel">GÓI COMBO ƯU ĐÃI</div>
          <h1 className="servicesTitle">
            <span className="titlePart1">Combo</span>
            <span className="titlePart2">dịch vụ được khách hàng tin dùng</span>
          </h1>
          <p className="servicesSubtitle">
            Giá cả minh bạch, tối ưu chi phí – phù hợp cho từng nhu cầu sử dụng và bảo dưỡng xe của bạn.
          </p>
        </div>

        <div
          className="servicesSlider"
          onMouseEnter={() => setIsComboPaused(true)}
          onMouseLeave={() => setIsComboPaused(false)}
        >
          <button 
            className="sliderArrow left" 
            onClick={comboPrev} 
            aria-label="Previous" 
            disabled={comboIndex === 0}
          >
            &lt;
          </button>
          <div className="sliderViewport">
            <div
              className="sliderTrack"
              ref={comboTrackRef}
              style={{ 
                transform: `translateX(-${comboOffset}%)`,
                display: 'flex',
                transition: 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)'
              }}
              onPointerDown={handleComboPointerDown}
              onPointerMove={handleComboPointerMove}
              onPointerUp={handleComboPointerUp}
              onPointerCancel={handleComboPointerUp}
              onTouchStart={handleComboPointerDown}
              onTouchMove={handleComboPointerMove}
              onTouchEnd={handleComboPointerUp}
            >
              {combos.map((combo, idx) => (
                <div key={idx} className="serviceSlide">
                  <div className="serviceCard">
                    <div className="serviceCard-imageTop">
                      <img src={combo.image} alt={combo.title} className="serviceCard-image" />
                    </div>
                    <div className="serviceCard-content">
                      <h3 className="serviceTitle">{combo.title}</h3>
                      <p className="serviceDescription comboDescription">
                        {combo.description}
                        {combo.features?.length ? ` • ${combo.features.join(' • ')}` : ''}
                      </p>
                      <div className="servicePrice">Giá: {combo.price}</div>
                      <div className="serviceActions">
                        <Link to="/services" className="btnViewDetail">Xem chi tiết</Link>
                        <Link to="/booking" className="btnBookNow">Đặt lịch ngay</Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button 
            className="sliderArrow right" 
            onClick={comboNext} 
            aria-label="Next" 
            disabled={comboIndex >= comboMaxIndex}
          >
            &gt;
          </button>
        </div>
      </section> */}
    </>
  );
};

export default Services;
