import './Services.css';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Link, useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchHomeProducts } from '../../../services/homeService';
import { useCart } from '../../../context/CartContext.jsx';
import serviceFallback from '../../../assets/lop and mam.jpg';
import serviceHeroImage from '../../../assets/anh_dich_vu.jpg';
import partHeroImage from '../../../assets/anh_kho.jpg';
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

  const match = text.match(/\d[\d.,]*/);
  if (!match) return null;

  const rawNumber = match[0];
  const suffix = text.slice(match.index + rawNumber.length);
  const hasScaleSuffix = /^\s*k\b/.test(suffix)
    || suffix.includes('nghìn')
    || suffix.includes('ngàn')
    || suffix.includes('triệu')
    || suffix.includes('trieu');
  const normalizedNumber = hasScaleSuffix
    ? (rawNumber.includes(',')
        ? rawNumber.replace(/\./g, '').replace(',', '.')
        : rawNumber)
    : rawNumber.replace(/[.,]/g, '');
  const parsed = Number(normalizedNumber);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

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
const normalizeCategoryToken = (value) => String(value ?? '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replaceAll(/[\u0300-\u036f]/g, '')
  .replaceAll(/\s+/g, ' ');
// categoryCode giờ là mã thật của Hạng mục báo giá (bảng work_category) do backend trả về,
// server lọc bằng exact match nên FE truyền thẳng, không map/đổi mã nữa.
const resolveHomePublicCategoryCode = (categoryCode) => String(categoryCode || '').trim().toUpperCase();
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
const hasCategoryOptionMatch = (item, categoryOption) => {
  if (!categoryOption) return false;

  const optionCode = normalizeCategoryToken(categoryOption?.categoryCode);
  const itemCode = normalizeCategoryToken(item?.categoryCode);
  if (optionCode && itemCode) return optionCode === itemCode;

  const optionId = toPositiveNumber(categoryOption?.categoryId);
  const itemId = toPositiveNumber(item?.categoryId);
  if (optionId != null && itemId != null) return optionId === itemId;

  const matchKeys = categoryOption?.categoryMatchKeys?.length
    ? categoryOption.categoryMatchKeys
    : [categoryOption?.categoryKey].filter(Boolean);
  return hasCategoryMatch(item?.categoryMatchKeys || [], matchKeys);
};
const toDisplayPrice = (item) => {
  if (item?.showPrice !== true) return 'Giá: Liên hệ';
  const display = String(item?.displayPrice || '').trim();
  if (display) {
    if (/liên hệ|lien he/i.test(display)) return 'Giá: Liên hệ';
    const formatted = parsePriceNumber(display);
    if (formatted != null) return `Giá: ${formatted.toLocaleString('vi-VN')} VND`;
    return `Giá: ${/vnd/i.test(display) ? display : `${display} VND`}`;
  }
  const numeric = parsePriceNumber(item?.price);
  return numeric != null ? `Giá: ${numeric.toLocaleString('vi-VN')} VND` : 'Giá: Liên hệ';
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

const ITEMS_PER_ROW = 6;
const MAX_ROWS_PER_PAGE = 6;
const PAGE_SIZE = ITEMS_PER_ROW * MAX_ROWS_PER_PAGE;

// Dữ liệu hãng xe / dòng xe phổ biến tại VN để lọc phụ tùng theo xe tương thích (compatibleCars)
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
const HOME_ROW_LIMIT = 5;
const HOME_PRODUCTS_PAGE_SIZE = 500;
const HOME_ALL_PRODUCT_TYPES = ['SERVICE', 'PART'];
const logServicesDebug = (label, payload) => {
  console.info(`[Services] ${label}`, payload);
};

const buildHomeProductParams = (itemType, categoryCode = '') => {
  const params = { page: 0, size: HOME_PRODUCTS_PAGE_SIZE, itemType };
  if (categoryCode) params.categoryCode = categoryCode;
  return params;
};

const getCatalogFetchTypes = (catalogType) => [catalogType];
const countCatalogItemsByType = (items = [], catalogType = 'SERVICE') => (
  items.filter((item) => item?.itemType === catalogType).length
);

const normalizeHomeProductResults = (settledResults, requestedTypes) => {
  const mergedRaw = settledResults.flatMap((result, index) => {
    if (result?.status !== 'fulfilled') return [];
    return extractList(result.value).map((item) => ({
      ...item,
      __sourceType: normalizeItemType(requestedTypes[index]),
    }));
  });

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
        brandName: String(item?.brandName || '').trim(),
        productLineName: String(item?.productLineName || '').trim(),
        compatibleCars: String(item?.compatibleCars || '').trim(),
        inStock: item?.inStock === true,
        availableQty: Number.isFinite(Number(item?.availableQty)) ? Number(item.availableQty) : null,
      };
    })
    .filter((item) => item.id || item.title);

  const deduped = new Map();
  mapped.forEach((item) => {
    const key = `${item.itemType}:${item.catalogItemId ?? item.serviceId ?? item.title}`;
    if (!deduped.has(key)) deduped.set(key, item);
  });

  const allRejected = settledResults.length > 0 && settledResults.every((result) => result?.status === 'rejected');
  const firstError = settledResults.find((result) => result?.status === 'rejected')?.reason?.message;

  return {
    items: Array.from(deduped.values()),
    error: allRejected
      ? (firstError || 'Không thể tải danh sách dịch vụ và phụ tùng.')
      : '',
  };
};

const getBestSellingItems = (items) => {
  if (!items || items.length === 0) return [];
  const popularKeywords = ['lốp', 'vỏ', 'dầu', 'nhớt', 'cân chỉnh', 'thước lái', 'phanh', 'thắng', 'ắc quy', 'bình', 'bảo dưỡng'];
  return items
    .map(item => {
      let score = 0;
      const titleLower = (item.title || '').toLowerCase();
      
      // Boost score based on popular keywords
      popularKeywords.forEach((kw, index) => {
        if (titleLower.includes(kw)) {
          score += (popularKeywords.length - index) * 15;
        }
      });
      
      // Boost items with images
      if (item.image) score += 50;
      
      // Boost if in stock
      if (item.inStock) score += 20;

      // Deterministic pseudo-randomness based on ID/title to keep it stable
      const hash = item.id ? (item.id % 10) : ((item.title || '').length % 10);
      score += hash;

      return { ...item, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
};

const loadHomeCatalogItems = async (requestedTypes, categoryCode = '') => {
  logServicesDebug('loadHomeCatalogItems:start', { requestedTypes, categoryCode });
  const settledResults = await Promise.allSettled(
    requestedTypes.map((itemType) => fetchHomeProducts(buildHomeProductParams(itemType, categoryCode))),
  );
  const normalized = normalizeHomeProductResults(settledResults, requestedTypes);
  logServicesDebug('loadHomeCatalogItems:done', {
    requestedTypes,
    categoryCode,
    itemCount: normalized.items.length,
    error: normalized.error || '',
  });
  return normalized;
};

const Services = ({ homeRows = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const routeCatalogType = String(searchParams.get('type') || '').trim().toUpperCase();
  const routeCategoryCode = String(searchParams.get('categoryCode') || '').trim();
  const routeVehicleMake = String(searchParams.get('vehicleMake') || '').trim();
  const routeVehicleModel = String(searchParams.get('vehicleModel') || '').trim();
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState('');
  const [currentCatalogServices, setCurrentCatalogServices] = useState([]);
  const [currentCatalogLoading, setCurrentCatalogLoading] = useState(() => !homeRows);
  const [currentCatalogError, setCurrentCatalogError] = useState('');
  const [catalogFilter, setCatalogFilter] = useState(() => {
    return homeRows ? 'SERVICE' : (location.pathname.startsWith('/parts') ? 'PART' : 'SERVICE');
  });
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(0);
  const [priceSort, setPriceSort] = useState('DEFAULT');
  const [searchQuery, setSearchQuery] = useState(() => {
    return String(searchParams.get('search') || '').trim();
  });
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [vehicleMake, setVehicleMake] = useState(() => routeVehicleMake);
  const [vehicleModel, setVehicleModel] = useState(() => routeVehicleModel);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [expandedSidebarItems, setExpandedSidebarItems] = useState({
    'sv-1': true,
    'pt-1': true,
  });
  const didResetCatalogScrollRef = useRef(false);
  const categoryDropdownRef = useRef(null);

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

  const { addItem } = useCart();

  // Thêm nhanh một sản phẩm/dịch vụ từ card vào giỏ hàng
  const handleAddToCart = (service) => {
    const catalogId = service?.catalogItemId || service?.serviceId;
    if (!catalogId) {
      toast('Sản phẩm này chưa hỗ trợ thêm vào giỏ hàng.', { containerId: 'app-toast' });
      return;
    }
    addItem({
      id: catalogId,
      serviceId: service.serviceId,
      itemType: service.itemType,
      name: service.title,
      price: service.rawPrice,
      priceText: String(service.price || '').replace(/^Giá:\s*/, ''),
      thumbnail: service.image,
    });
    toast(`Đã thêm "${service.title}" vào giỏ hàng.`, { containerId: 'app-toast' });
  };

  const handleAddToCartAndGo = (service) => {
    const catalogId = service?.catalogItemId || service?.serviceId;
    if (!catalogId) {
      toast('Sản phẩm này chưa hỗ trợ thêm vào giỏ hàng.', { containerId: 'app-toast' });
      return;
    }
    addItem({
      id: catalogId,
      serviceId: service.serviceId,
      itemType: service.itemType,
      name: service.title,
      price: service.rawPrice,
      priceText: String(service.price || '').replace(/^Giá:\s*/, ''),
      thumbnail: service.image,
    });
    navigate('/cart');
  };

  const partItems = useMemo(() => services.filter((item) => item.itemType === 'PART'), [services]);
  const serviceItems = useMemo(() => services.filter((item) => item.itemType === 'SERVICE'), [services]);
  const homePartItems = useMemo(() => partItems.slice(0, HOME_ROW_LIMIT), [partItems]);
  const homeServiceItems = useMemo(() => serviceItems.slice(0, HOME_ROW_LIMIT), [serviceItems]);
  const bestSellers = useMemo(() => getBestSellingItems(services), [services]);

  const renderCatalogCard = (service, idx) => (
    <div key={service.id || `${service.itemType}-${idx}`} className="serviceGridItem">
      <Link
        to={service.serviceId || service.catalogItemId ? (service.itemType === 'PART' ? `/parts/${service.catalogItemId || service.serviceId}` : `/services/${service.serviceId || service.catalogItemId}`) : (service.itemType === 'PART' ? '/parts' : '/services')}
        state={
          service.catalogItemId != null || service.serviceId != null
            ? { catalogItemId: service.catalogItemId, serviceId: service.serviceId, itemType: service.itemType || 'SERVICE' }
            : undefined
        }
        className="serviceCardLink"
      >
        <div className="serviceCard">
          <div className="serviceCard-imageTop">
            <img src={service.image || serviceFallback} alt={service.title} className="serviceCard-image" />
            <div className="catalogTypeBadge">{service.itemType === 'PART' ? 'Phụ tùng' : 'Dịch vụ'}</div>
            {service.itemType === 'PART' && service.inStock && (
              <div className="stockBadge">Còn hàng</div>
            )}
          </div>
          <div className="serviceCard-content">
            <h3 className="serviceTitle">{service.title}</h3>
            <div className="servicePriceInCard">{service.price || 'Liên hệ'}</div>
          </div>
        </div>
      </Link>
    </div>
  );

  const renderHomeSidebarAccordion = () => {
    const serviceItemsList = [
      {
        id: 'sv-1',
        name: 'Thay lốp & cân mâm',
        subItems: [
          { name: 'Lốp du lịch chính hãng', link: '/services?search=lốp' },
          { name: 'Cân mâm bấm chì', link: '/services?search=mâm' },
          { name: 'Vá lốp chuẩn Michelin', link: '/services?search=vá lốp' }
        ]
      },
      {
        id: 'sv-2',
        name: 'Cân chỉnh thước lái',
        subItems: [
          { name: 'Cân thước lái Hunter', link: '/services?search=thước lái' },
          { name: 'Góc đặt bánh xe chuẩn', link: '/services?search=thước lái' }
        ]
      },
      {
        id: 'sv-3',
        name: 'Bảo dưỡng định kỳ',
        subItems: [
          { name: 'Bảo dưỡng nhanh', link: '/services?search=bảo dưỡng' },
          { name: 'Thay nước làm mát', link: '/services?search=nước làm mát' }
        ]
      },
      {
        id: 'sv-4',
        name: 'Thay dầu động cơ',
        subItems: [
          { name: 'Thay dầu chính hãng', link: '/services?search=dầu' },
          { name: 'Thay lọc dầu động cơ', link: '/services?search=lọc dầu' }
        ]
      },
      {
        id: 'sv-5',
        name: 'Cân bằng động bánh xe',
        subItems: [
          { name: 'Cân bằng động Hunter', link: '/services?search=cân bằng' }
        ]
      },
      {
        id: 'sv-6',
        name: 'Sửa chữa hệ thống phanh',
        subItems: [
          { name: 'Thay thế má phanh', link: '/services?search=phanh' },
          { name: 'Láng đĩa phanh', link: '/services?search=phanh' }
        ]
      },
      {
        id: 'sv-7',
        name: 'Cứu hộ ô tô 24/7',
        subItems: [
          { name: 'Cứu hộ lốp Sơn Tây', link: 'tel:0987545680' },
          { name: 'Cứu hộ ắc quy 24/7', link: 'tel:0987545680' }
        ]
      }
    ];

    const partItemsList = [
      {
        id: 'pt-1',
        name: 'Lốp xe Michelin',
        subItems: [
          { name: 'Michelin Primacy 4', link: '/parts?search=primacy' },
          { name: 'Michelin Pilot Sport 5', link: '/parts?search=pilot' },
          { name: 'Michelin Energy XM2+', link: '/parts?search=energy' }
        ]
      },
      {
        id: 'pt-2',
        name: 'Ắc quy xe hơi',
        subItems: [
          { name: 'Ắc quy Atlas BX', link: '/parts?search=atlas' },
          { name: 'Ắc quy Varta', link: '/parts?search=varta' },
          { name: 'Ắc quy GS', link: '/parts?search=gs' }
        ]
      },
      {
        id: 'pt-3',
        name: 'Dầu nhớt chính hãng',
        subItems: [
          { name: 'Dầu nhớt Mobil 1', link: '/parts?search=mobil' },
          { name: 'Dầu Castrol Magnatec', link: '/parts?search=castrol' }
        ]
      },
      {
        id: 'pt-4',
        name: 'Má phanh & đĩa phanh',
        subItems: [
          { name: 'Má phanh Bendix', link: '/parts?search=phanh' },
          { name: 'Má phanh Bosch', link: '/parts?search=phanh' }
        ]
      },
      {
        id: 'pt-5',
        name: 'Lọc dầu & lọc gió',
        subItems: [
          { name: 'Lọc gió động cơ', link: '/parts?search=lọc' },
          { name: 'Lọc gió cabin', link: '/parts?search=lọc' }
        ]
      },
      {
        id: 'pt-6',
        name: 'Gạt mưa cao cấp',
        subItems: [
          { name: 'Gạt mưa Bosch', link: '/parts?search=gạt' },
          { name: 'Gạt mưa silicone', link: '/parts?search=gạt' }
        ]
      },
      {
        id: 'pt-7',
        name: 'Mâm lazang thể thao',
        subItems: [
          { name: 'Mâm đúc lazang', link: '/parts?search=mâm' }
        ]
      }
    ];

    const toggleItem = (itemId) => {
      setExpandedSidebarItems((prev) => ({
        ...prev,
        [itemId]: !prev[itemId],
      }));
    };

    const handleStoreClick = (storeId) => {
      const storeUrls = {
        sontay1: 'https://maps.app.goo.gl/5p1HHhrirKYLRCCe9',
        sontay2: 'https://maps.app.goo.gl/Y5rKFqkFBD2JUoyi6'
      };
      window.open(storeUrls[storeId], '_blank', 'noopener,noreferrer');
    };

    return (
      <div className="homeSidebarAccordion">
        {/* Nhóm Dịch Vụ */}
        <div className="homeSidebarGroup">
          <h3 className="homeSidebarGroupTitle">Dịch vụ chính hãng</h3>
          <div className="homeSidebarItemsList">
            {serviceItemsList.map((item) => (
              <div key={item.id} className="homeSidebarItemBox">
                <button
                  type="button"
                  className={`homeSidebarItemTrigger ${expandedSidebarItems[item.id] ? 'expanded' : ''}`}
                  onClick={() => toggleItem(item.id)}
                >
                  <span className="triggerName">{item.name}</span>
                  <span className="triggerCaret">▾</span>
                </button>
                {expandedSidebarItems[item.id] && (
                  <ul className="homeSidebarSubList">
                    {item.subItems.map((sub, idx) => (
                      <li key={idx} className="homeSidebarSubItem">
                        {sub.link.startsWith('tel:') ? (
                          <a href={sub.link} className="homeSidebarSubLink">{sub.name}</a>
                        ) : (
                          <Link to={sub.link} className="homeSidebarSubLink">{sub.name}</Link>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Nhóm Phụ Tùng */}
        <div className="homeSidebarGroup">
          <h3 className="homeSidebarGroupTitle">Phụ tùng chính hãng</h3>
          <div className="homeSidebarItemsList">
            {partItemsList.map((item) => (
              <div key={item.id} className="homeSidebarItemBox">
                <button
                  type="button"
                  className={`homeSidebarItemTrigger ${expandedSidebarItems[item.id] ? 'expanded' : ''}`}
                  onClick={() => toggleItem(item.id)}
                >
                  <span className="triggerName">{item.name}</span>
                  <span className="triggerCaret">▾</span>
                </button>
                {expandedSidebarItems[item.id] && (
                  <ul className="homeSidebarSubList">
                    {item.subItems.map((sub, idx) => (
                      <li key={idx} className="homeSidebarSubItem">
                        {sub.link.startsWith('tel:') ? (
                          <a href={sub.link} className="homeSidebarSubLink">{sub.name}</a>
                        ) : (
                          <Link to={sub.link} className="homeSidebarSubLink">{sub.name}</Link>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Nhóm Cửa Hàng */}
        <div className="homeSidebarGroup">
          <h3 className="homeSidebarGroupTitle">Cơ sở Michelin</h3>
          <div className="homeSidebarStoreBtns">
            <button
              type="button"
              className="homeSidebarStoreBtn"
              onClick={() => handleStoreClick('sontay1')}
            >
              📍 Cơ sở 1: QL21 Sơn Tây
            </button>
            <button
              type="button"
              className="homeSidebarStoreBtn"
              onClick={() => handleStoreClick('sontay2')}
            >
              📍 Cơ sở 2: Biên Phòng
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderBestSellersRow = () => {
    if (bestSellers.length === 0) return null;
    return (
      <section className="bestSellersSection" aria-label="Sản phẩm bán chạy nhất">
        <div className="bestSellersGrid">
          {bestSellers.map((item, index) => {
            const rank = index + 1;
            return (
              <div key={item.id || `${item.itemType}-${index}`} className="serviceGridItem">
                <Link
                  to={item.serviceId || item.catalogItemId ? (item.itemType === 'PART' ? `/parts/${item.catalogItemId || item.serviceId}` : `/services/${item.serviceId || item.catalogItemId}`) : (item.itemType === 'PART' ? '/parts' : '/services')}
                  state={
                    item.catalogItemId != null || item.serviceId != null
                      ? { catalogItemId: item.catalogItemId, serviceId: item.serviceId, itemType: item.itemType || 'SERVICE' }
                      : undefined
                  }
                  className="serviceCardLink"
                >
                  <div className={`serviceCard bestSellerCard rank-${rank}`}>
                    {/* Rank Badge */}
                    <div className={`rankBadge rankBadge-${rank}`}>
                      <span className="rankNumber">#{rank}</span>
                      {rank === 1 && <span className="rankCrown" role="img" aria-label="Crown">👑</span>}
                    </div>

                    <div className="serviceCard-imageTop">
                      <img src={item.image || serviceFallback} alt={item.title} className="serviceCard-image" />
                      <div className="catalogTypeBadge">{item.itemType === 'PART' ? 'Phụ tùng' : 'Dịch vụ'}</div>
                      {item.itemType === 'PART' && item.inStock && (
                        <div className="stockBadge">Còn hàng</div>
                      )}
                    </div>
                    
                    <div className="serviceCard-content">
                      <h3 className="serviceTitle">{item.title}</h3>
                      <div className="servicePriceInCard">{item.price || 'Liên hệ'}</div>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const renderCatalogRow = (title, subtitle, items, moreTo) => {
    const isService = title.toLowerCase().includes('dịch vụ');
    
    return (
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

        {/* 2 Banners hình chữ nhật ngay dưới Tiêu đề và ở trên các Items */}
        <div className="catalogRowBanners">
          {isService ? (
            <>
              <div className="rowPromoBanner bannerService1">
                <div className="rowPromoBannerOverlay" />
                <div className="rowPromoBannerContent">
                  <span className="rowBannerBadge">BẢO DƯỠNG NHANH</span>
                  <h4 className="rowBannerTitle">Đặt lịch hẹn trực tuyến</h4>
                  <p className="rowBannerDesc">Giảm ngay 10% chi phí công thợ cho gói bảo dưỡng định kỳ tiếp theo.</p>
                  <Link to="/booking" className="rowBannerBtn btnBlue">Đặt lịch ngay →</Link>
                </div>
              </div>
              <div className="rowPromoBanner bannerService2">
                <div className="rowPromoBannerOverlay" />
                <div className="rowPromoBannerContent">
                  <span className="rowBannerBadge">TIÊU CHUẨN HUNTER</span>
                  <h4 className="rowBannerTitle">Cân chỉnh thước lái 3D</h4>
                  <p className="rowBannerDesc">Đảm bảo lốp xe mòn đều, tay lái chuẩn xác và hành trình êm ái.</p>
                  <Link to="/services?search=thước lái" className="rowBannerBtn btnGold">Tìm hiểu thêm →</Link>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="rowPromoBanner bannerPart1">
                <div className="rowPromoBannerOverlay" />
                <div className="rowPromoBannerContent">
                  <span className="rowBannerBadge">LỐP CHÍNH HÃNG</span>
                  <h4 className="rowBannerTitle">Thay lốp Michelin cao cấp</h4>
                  <p className="rowBannerDesc">Mua 4 lốp Michelin miễn phí cân chỉnh thước lái Hunter 3D trị giá 800k.</p>
                  <Link to="/parts?search=lốp" className="rowBannerBtn btnGold">Mua lốp ngay →</Link>
                </div>
              </div>
              <div className="rowPromoBanner bannerPart2">
                <div className="rowPromoBannerOverlay" />
                <div className="rowPromoBannerContent">
                  <span className="rowBannerBadge">ẮC QUY & DẦU NHỚT</span>
                  <h4 className="rowBannerTitle">Ắc quy & Dầu chính hiệu</h4>
                  <p className="rowBannerDesc">Atlas, Varta, GS và dầu Castrol, Mobil chính hãng giá cạnh tranh nhất.</p>
                  <Link to="/parts?search=dầu" className="rowBannerBtn btnBlue">Xem phụ tùng →</Link>
                </div>
              </div>
            </>
          )}
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
  };

  useEffect(() => {
    let active = true;
    setTimeout(() => { if (active) { setServicesLoading(true); setServicesError(''); }}, 0);

    loadHomeCatalogItems(HOME_ALL_PRODUCT_TYPES)
      .then(({ items, error }) => {
        if (!active) return;
        setServices(items);
        if (error) setServicesError(error);
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

  // Scroll reveal cho 3 phần: dịch vụ, quy trình, combo

  useEffect(() => {
    if (homeRows) return;
    
    const targetType = location.pathname.startsWith('/parts') ? 'PART' : 'SERVICE';
    setCatalogFilter(targetType);
    if (!routeCategoryCode) setCategoryFilter('ALL');
    
    const searchVal = String(searchParams.get('search') || '').trim();
    setSearchQuery(searchVal);
    
    setCurrentPage(0);
    
    if (location.state?.resetCatalogScroll && !didResetCatalogScrollRef.current) {
      didResetCatalogScrollRef.current = true;
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [homeRows, location.pathname, location.state?.resetCatalogScroll, routeCategoryCode, searchParams]);

  useEffect(() => {
    if (homeRows) return;
    document.title = 'Đại lý garage Sơn Tây - michelinsontay - Trung tâm dịch vụ lốp xe uy tín';
  }, [catalogFilter, homeRows]);

  const servicesHeroRef = useRef(null);
  const processHeaderRef = useRef(null);

  const [servicesIntroVisible, setServicesIntroVisible] = useState(false);
  const [processIntroVisible, setProcessIntroVisible] = useState(false);

  // Danh mục được suy ra trực tiếp từ dữ liệu dịch vụ/phụ tùng công khai (services),
  // không còn gọi API nội bộ work-category (yêu cầu đăng nhập nhân viên) vì API đó
  // trả 403 với khách vãng lai và làm apiClient tự động điều hướng cả trang ra /login.
  const categoryOptions = useMemo(() => {
    const derived = new Map();
    const typedServices = services.filter((item) => item.itemType === catalogFilter);

    typedServices.forEach((item) => {
      if (!item.categoryKey) return;
      if (!derived.has(item.categoryKey)) {
        derived.set(item.categoryKey, {
          categoryId: item.categoryId,
          categoryKey: item.categoryKey,
          categoryMatchKeys: item.categoryMatchKeys?.length ? item.categoryMatchKeys : [item.categoryKey],
          categoryCode: item.categoryCode,
          categoryName: item.categoryName,
          categoryType: item.itemType,
          label: item.categoryName || item.categoryCode || 'Khác',
        });
      }
    });

    const options = Array.from(derived.values()).map((item) => ({
      ...item,
      count: typedServices.filter((service) => hasCategoryOptionMatch(service, item)).length,
    }));

    const sortedOptions = options.sort((a, b) => {
      const countDiff = (b.count || 0) - (a.count || 0);
      if (countDiff !== 0) return countDiff;
      return String(a.label || '').localeCompare(String(b.label || ''), 'vi');
    });

    const activeCategoryItemCount = !homeRows && categoryFilter !== 'ALL'
      ? countCatalogItemsByType(currentCatalogServices, catalogFilter)
      : 0;

    if (activeCategoryItemCount <= 0) return sortedOptions;

    return sortedOptions.map((item) => (
      item.categoryKey === categoryFilter && (item.count || 0) < activeCategoryItemCount
        ? { ...item, count: activeCategoryItemCount }
        : item
    ));
  }, [catalogFilter, services, homeRows, categoryFilter, currentCatalogServices]);

  const activeCategoryFilter = categoryFilter === 'ALL'
    || categoryOptions.some((item) => item.categoryKey === categoryFilter)
    ? categoryFilter
    : 'ALL';
  const selectedCategoryOption = useMemo(
    () => (activeCategoryFilter === 'ALL'
      ? null
      : categoryOptions.find((item) => item.categoryKey === activeCategoryFilter) || null),
    [activeCategoryFilter, categoryOptions],
  );
  const activeCategoryCode = resolveHomePublicCategoryCode(
    selectedCategoryOption?.categoryCode,
    selectedCategoryOption?.label || selectedCategoryOption?.categoryName || '',
  );
  const activeCategoryLabel = activeCategoryFilter === 'ALL'
    ? 'Tất cả'
    : (selectedCategoryOption?.label || 'Tất cả');
  const totalCatalogItemCount = useMemo(
    () => services.filter((item) => item.itemType === catalogFilter).length,
    [catalogFilter, services],
  );
  const activeCategoryCount = activeCategoryFilter === 'ALL'
    ? totalCatalogItemCount
    : (selectedCategoryOption?.count ?? 0);

  const loadCurrentCatalog = useCallback(() => {
    let active = true;
    setCurrentCatalogLoading(true);
    setCurrentCatalogError('');

    loadHomeCatalogItems(getCatalogFetchTypes(catalogFilter), activeCategoryCode)
      .then(({ items, error }) => {
        if (!active) return;
        setCurrentCatalogServices(items);
        setCurrentCatalogError(error || '');
      })
      .catch((err) => {
        if (!active) return;
        console.error('[Services] Error loading current catalog:', err);
        setCurrentCatalogServices([]);
        setCurrentCatalogError(err?.message || 'Không thể tải danh mục hiện tại.');
      })
      .finally(() => {
        if (active) setCurrentCatalogLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeCategoryCode, catalogFilter]);

  useEffect(() => {
    if (homeRows) return undefined;
    let cleanup = () => {};
    const timeoutId = window.setTimeout(() => {
      cleanup = loadCurrentCatalog();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      cleanup();
    };
  }, [homeRows, loadCurrentCatalog]);

  const catalogItems = homeRows ? services : currentCatalogServices;
  const isCatalogLoading = homeRows ? servicesLoading : currentCatalogLoading;
  const effectiveCatalogError = homeRows ? servicesError : currentCatalogError;
  const updateCatalogSearchParams = useCallback((nextCategoryCode = '') => {
    const nextParams = new URLSearchParams();
    const safeCategoryCode = String(nextCategoryCode || '').trim();
    if (safeCategoryCode) nextParams.set('categoryCode', safeCategoryCode);
    setSearchParams(nextParams, { replace: true });
  }, [setSearchParams]);

  const handleCategorySelect = useCallback((item = null) => {
    if (!item) {
      setCategoryFilter('ALL');
      setCurrentPage(0);
      setCategoryDropdownOpen(false);
      updateCatalogSearchParams('');
      return;
    }

    setCategoryFilter(item.categoryKey);
    setCurrentPage(0);
    setCategoryDropdownOpen(false);
    updateCatalogSearchParams(
      resolveHomePublicCategoryCode(item.categoryCode, item.label || item.categoryName || ''),
    );
  }, [updateCatalogSearchParams]);

  const syncCategoryFilterFromRoute = useCallback(() => {
    const normalizedRouteCategoryCode = routeCategoryCode.toUpperCase();
    if (!normalizedRouteCategoryCode) {
      if (categoryFilter !== 'ALL') setCategoryFilter('ALL');
      return;
    }

    if (servicesLoading && categoryOptions.length === 0) return;

    const matchedCategory = categoryOptions.find((item) => (
      resolveHomePublicCategoryCode(item?.categoryCode, item?.label || item?.categoryName || '') === normalizedRouteCategoryCode
    ));
    logServicesDebug('syncCategoryFromUrl', {
      routeCategoryCode: normalizedRouteCategoryCode,
      matchedCategory: matchedCategory
        ? {
            categoryKey: matchedCategory.categoryKey,
            categoryCode: matchedCategory.categoryCode,
            publicCategoryCode: resolveHomePublicCategoryCode(
              matchedCategory.categoryCode,
              matchedCategory.label || matchedCategory.categoryName || '',
            ),
            label: matchedCategory.label,
          }
        : null,
    });
    if (!matchedCategory) return;
    if (categoryFilter !== matchedCategory.categoryKey) {
      setCategoryFilter(matchedCategory.categoryKey);
      setCurrentPage(0);
    }
  }, [servicesLoading, categoryFilter, categoryOptions, routeCategoryCode]);

  useEffect(() => {
    if (homeRows) return;
    const timeoutId = window.setTimeout(() => {
      syncCategoryFilterFromRoute();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [homeRows, syncCategoryFilterFromRoute]);

  useEffect(() => {
    if (homeRows || !categoryDropdownOpen) return undefined;

    const handlePointerDownOutside = (event) => {
      if (categoryDropdownRef.current?.contains(event.target)) return;
      setCategoryDropdownOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDownOutside);
    document.addEventListener('touchstart', handlePointerDownOutside);

    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside);
      document.removeEventListener('touchstart', handlePointerDownOutside);
    };
  }, [categoryDropdownOpen, homeRows]);

  const visibleServices = useMemo(() => {
    let filtered = catalogItems.filter((item) => item.itemType === catalogFilter);

    // Search filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((item) =>
        (item.title || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q)
      );
    }

    // Lọc theo hãng xe / dòng xe tương thích (chỉ áp dụng cho phụ tùng)
    if (catalogFilter === 'PART' && (vehicleMake || vehicleModel)) {
      filtered = filtered.filter((item) => {
        const cars = String(item.compatibleCars || '').toLowerCase();
        if (!cars) return false;
        if (vehicleMake && !cars.includes(vehicleMake.toLowerCase())) return false;
        if (vehicleModel && !cars.includes(vehicleModel.toLowerCase())) return false;
        return true;
      });
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
  }, [catalogFilter, catalogItems, priceSort, searchQuery, priceMin, priceMax, vehicleMake, vehicleModel]);

  // Phân trang client-side: tối đa 6 hàng × 6 sản phẩm mỗi trang
  const totalPages = Math.max(1, Math.ceil(visibleServices.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages - 1);
  const gridItemsToShow = useMemo(
    () => visibleServices.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE),
    [safePage, visibleServices],
  );

  const handlePageChange = useCallback((nextPage) => {
    setCurrentPage(nextPage);
    document.querySelector('.servicesCatalogLayout')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Dynamic title/label/subtitle based on active filter
  const dynamicLabel = useMemo(() => {
    if (catalogFilter === 'PART') return 'DANH MỤC PHỤ TÙNG';
    return 'DANH MỤC DỊCH VỤ';
  }, [catalogFilter]);

  const dynamicTitlePart1 = useMemo(() => {
    if (catalogFilter === 'PART') return 'Phụ tùng';
    return 'Dịch vụ';
  }, [catalogFilter]);

  const heroDescription = useMemo(() => {
    if (catalogFilter === 'PART') {
      return 'Michelin Sơn Tây cung cấp đầy đủ các loại phụ tùng chính hãng, đáp ứng đa dạng nhu cầu từ bảo dưỡng đến sửa chữa chuyên sâu. Mỗi sản phẩm đều được kiểm định kỹ lưỡng về chất lượng, đảm bảo độ bền, độ an toàn và khả năng vận hành tối ưu cho xe. Với nguồn gốc rõ ràng cùng sự tư vấn tận tâm từ đội ngũ kỹ thuật viên, khách hàng có thể dễ dàng lựa chọn phụ tùng phù hợp nhất cho chiếc xe của mình. Sử dụng phụ tùng tại Michelin Sơn Tây không chỉ giúp xe hoạt động ổn định mà còn góp phần kéo dài tuổi thọ và nâng cao trải nghiệm lái xe.';
    }

    return 'Michelin Sơn Tây là điểm đến lý tưởng cho những ai muốn chăm sóc xe theo tiêu chuẩn chuyên nghiệp và đẳng cấp. Với đội ngũ kỹ thuật viên giàu kinh nghiệm, quy trình hiện đại và sản phẩm chính hãng Michelin, mọi dịch vụ đều được thực hiện nhanh chóng, chính xác và tận tâm. Không chỉ là bảo dưỡng, đây còn là nơi mang đến trải nghiệm dịch vụ xịn xò, đáng tin cậy cho mỗi hành trình của bạn.';
  }, [catalogFilter]);
  const heroImage = catalogFilter === 'PART' ? partHeroImage : serviceHeroImage;
  const heroImageAlt = catalogFilter === 'PART'
    ? 'Phụ tùng chính hãng tại Michelin Sơn Tây'
    : 'Dịch vụ chăm sóc xe Michelin Sơn Tây';
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
      <section className={`servicesPage ${homeRows ? 'isHomePage' : ''}`}>
        <div className="servicesPage-bg" />
        {!homeRows && (
          <Link to="/" className="servicesBackHome">
            ← Về trang chủ
          </Link>
        )}
        {homeRows && (
          <div
            ref={servicesHeroRef}
            className={`servicesHero ${servicesIntroVisible ? 'visible' : ''} isHome`}
          />
        )}

        {!homeRows && (
        <>
        {/* Grid layout */}
        <div className="servicesCatalogLayout">
          <aside
            ref={categoryDropdownRef}
            className={`categorySidebar ${categoryDropdownOpen ? 'is-open' : ''}`}
            aria-label="Lọc theo danh mục"
          >
            {/* Sidebar Title */}
            <h2 className="sidebarPageTitle">
              {catalogFilter === 'PART' ? 'Phụ tùng chính hãng' : 'Dịch vụ chính hãng'}
            </h2>

            {/* Search Input */}
            <div className="sidebarSearch">
              <div className="toolbarSearch">
                <svg className="searchIcon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <input
                  type="text"
                  className="searchInput"
                  placeholder={catalogFilter === 'PART' ? 'Tìm phụ tùng...' : 'Tìm dịch vụ...'}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(0);
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="searchClear"
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentPage(0);
                    }}
                    aria-label="Xóa tìm kiếm"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Category Select */}
            <div className="categorySidebarGroup">
              <div className="categorySidebarLabel">Danh mục</div>
              <button
                type="button"
                className={`categorySidebarTrigger ${categoryDropdownOpen ? 'is-open' : ''}`}
                onClick={() => setCategoryDropdownOpen((prev) => !prev)}
                aria-expanded={categoryDropdownOpen}
                disabled={servicesLoading && categoryOptions.length === 0}
              >
                <span className="categorySidebarTriggerText">{activeCategoryLabel}</span>
                <span className="categoryCount categoryCountTrigger">{activeCategoryCount}</span>
                <span className="categorySidebarTriggerIcon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </button>
              {categoryDropdownOpen && (
              <div className="categorySidebarList" role="listbox" aria-label="Danh mục">
                <button
                  type="button"
                  className={`categorySidebarItem ${activeCategoryFilter === 'ALL' ? 'is-active' : ''}`}
                  onClick={() => handleCategorySelect()}
                >
                  <span>Tất cả</span>
                  <span className="categoryCount">{services.filter((item) => item.itemType === catalogFilter).length}</span>
                </button>
                {categoryOptions.map((item) => (
                  <button
                    key={item.categoryKey}
                    type="button"
                    className={`categorySidebarItem ${activeCategoryFilter === item.categoryKey ? 'is-active' : ''}`}
                    onClick={() => handleCategorySelect(item)}
                  >
                    <span>{item.label}</span>
                    <span className="categoryCount">{item.count}</span>
                  </button>
                ))}
                {servicesLoading && categoryOptions.length === 0 && (
                  <div className="categorySidebarHint">Đang tải danh mục...</div>
                )}
                {!servicesLoading && categoryOptions.length === 0 && (
                  <div className="categorySidebarHint">Chưa có danh mục.</div>
                )}
              </div>
              )}
            </div>

            {/* Filters Stacked Below Category */}
            <div className="sidebarFilters">
              {/* Sort Filter */}
              <div className="sidebarFilterGroup">
                <span className="sidebarFilterLabel">Sắp xếp giá</span>
                <label className="sortSelectWrap" htmlFor="servicesPriceSort">
                  <select
                    id="servicesPriceSort"
                    className="sortSelect"
                    value={priceSort}
                    onChange={(e) => {
                      setPriceSort(e.target.value);
                      setCurrentPage(0);
                    }}
                  >
                    <option value="DEFAULT">Mặc định</option>
                    <option value="ASC">Giá tăng dần</option>
                    <option value="DESC">Giá giảm dần</option>
                  </select>
                </label>
              </div>

              {/* Compatible vehicles filter (parts only) */}
              {catalogFilter === 'PART' && (
                <div className="sidebarFilterGroup">
                  <span className="sidebarFilterLabel">Dòng xe tương thích</span>
                  <div className="sidebarVehicleFilter">
                    <label className="sortSelectWrap" htmlFor="servicesVehicleMake">
                      <span>Hãng xe</span>
                      <select
                        id="servicesVehicleMake"
                        className="sortSelect"
                        value={vehicleMake}
                        onChange={(e) => {
                          setVehicleMake(e.target.value);
                          setVehicleModel('');
                          setCurrentPage(0);
                        }}
                      >
                        <option value="">Tất cả</option>
                        {Object.keys(CAR_DATA).map((make) => (
                          <option key={make} value={make}>{make}</option>
                        ))}
                      </select>
                    </label>
                    <label className="sortSelectWrap" htmlFor="servicesVehicleModel">
                      <span>Dòng xe</span>
                      <select
                        id="servicesVehicleModel"
                        className="sortSelect"
                        value={vehicleModel}
                        disabled={!vehicleMake}
                        onChange={(e) => {
                          setVehicleModel(e.target.value);
                          setCurrentPage(0);
                        }}
                      >
                        <option value="">Tất cả</option>
                        {(CAR_DATA[vehicleMake] || []).map((model) => (
                          <option key={model} value={model}>{model}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              )}

              {/* Price range filter */}
              <div className="sidebarFilterGroup">
                <span className="sidebarFilterLabel">Khoảng giá</span>
                <div className="priceRangeFilter sidebarPriceRange">
                  <label className="priceRangeField">
                    <span>Từ</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={priceMin}
                      placeholder="0"
                      onChange={(e) => {
                        setPriceMin(sanitizePriceInput(e.target.value));
                        setCurrentPage(0);
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
                        setCurrentPage(0);
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
                        setCurrentPage(0);
                      }}
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </div>
            </div>
          </aside>

          <div className="servicesGridWrapper">
          {isCatalogLoading && (
            <div className="serviceStatus">
              <div className="loadingSpinner" />
              <span>Đang tải danh mục...</span>
            </div>
          )}
          {!isCatalogLoading && effectiveCatalogError && (
            <div className="serviceStatus error">
              {effectiveCatalogError}
            </div>
          )}
          {!isCatalogLoading && !effectiveCatalogError && visibleServices.length === 0 && (
            <div className="serviceStatus">
              Chưa có hạng mục phù hợp để hiển thị.
            </div>
          )}
          {gridItemsToShow.length > 0 && (
            <div className="servicesGrid">
              {gridItemsToShow.map((service, idx) => (
                <div key={service.id || idx} className="serviceGridItem">
                  <Link
                    to={service.serviceId || service.catalogItemId ? (service.itemType === 'PART' ? `/parts/${service.catalogItemId || service.serviceId}` : `/services/${service.serviceId || service.catalogItemId}`) : (service.itemType === 'PART' ? '/parts' : '/services')}
                    state={
                      service.catalogItemId != null || service.serviceId != null
                        ? { catalogItemId: service.catalogItemId, serviceId: service.serviceId, itemType: service.itemType || 'SERVICE' }
                        : undefined
                    }
                    className="serviceCardLink"
                  >
                    <div className="serviceCard">
                      <div className="serviceCard-imageTop">
                        <img src={service.image || serviceFallback} alt={service.title} className="serviceCard-image" />
                        <div className="catalogTypeBadge">{service.itemType === 'PART' ? 'Phụ tùng' : 'Dịch vụ'}</div>
                        {service.itemType === 'PART' && service.inStock && (
                          <div className="stockBadge">Còn hàng</div>
                        )}
                      </div>
                      <div className="serviceCard-content">
                        <h3 className="serviceTitle">{service.title}</h3>
                        <div className="servicePriceInCard">{service.price || 'Liên hệ'}</div>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
          {totalPages > 1 && !isCatalogLoading && (
            <div className="gridPagination" role="navigation" aria-label="Phân trang sản phẩm">
              <button
                type="button"
                className="gridPageBtn gridPageBtn--nav"
                onClick={() => handlePageChange(safePage - 1)}
                disabled={safePage === 0}
                aria-label="Trang trước"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              {Array.from({ length: totalPages }, (_, pageIdx) => (
                <button
                  key={pageIdx}
                  type="button"
                  className={`gridPageBtn ${pageIdx === safePage ? 'is-active' : ''}`}
                  onClick={() => handlePageChange(pageIdx)}
                  aria-current={pageIdx === safePage ? 'page' : undefined}
                >
                  {pageIdx + 1}
                </button>
              ))}
              <button
                type="button"
                className="gridPageBtn gridPageBtn--nav"
                onClick={() => handlePageChange(safePage + 1)}
                disabled={safePage >= totalPages - 1}
                aria-label="Trang sau"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
              </button>
            </div>
          )}
          </div>
        </div>
        </>
        )}

        {homeRows && (
        <div className="homeServicesLayout">
          <aside className="homeQuickAccessSidebar">
            {renderHomeSidebarAccordion()}
          </aside>

          <div className="homeServicesMain">
            <div className="servicesRowsWrapper" style={{ padding: 0 }}>
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
                  {renderBestSellersRow()}
                  {renderCatalogRow('Dịch vụ', 'Dịch vụ bảo dưỡng và sửa chữa chuyên nghiệp.', homeServiceItems, '/services')}
                  {renderCatalogRow('Phụ tùng', 'Phụ tùng chính hãng, đa dạng chủng loại.', homePartItems, '/parts')}
                </>
              )}
            </div>
          </div>
        </div>
        )}
      </section>

      {/* Quy trình dịch vụ */}
      {homeRows && (
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
      )}

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

