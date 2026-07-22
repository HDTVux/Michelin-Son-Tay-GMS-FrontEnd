import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import styles from './Booking.module.css';
import StepService from './steps/StepService.jsx';
import StepSchedule from './steps/StepSchedule.jsx';
import StepInfo from './steps/StepInfo.jsx';
import StepDone from './steps/StepDone.jsx';
import { toast } from 'react-toastify';
import { fetchHomeProducts } from '../../services/homeService.js';
import {
  cancelCustomerBooking,
  createCustomerBooking,
  createGuestBooking,
  modifyCustomerBooking,
} from '../../services/bookingService.js';
import { getValidToken } from '../../services/tokenUtils.js';
import { useScrollToTop } from '../../hooks/useScrollToTop.js';

// Định nghĩa các bước của quy trình đặt lịch
const STEPS = [
  { id: 'service', label: 'Chọn dịch vụ' },
  { id: 'schedule', label: 'Chọn ngày & giờ' },
  { id: 'info', label: 'Thông tin' },
  { id: 'done', label: 'Hoàn tất' },
];

// Chuyển đổi giá trị đầu vào thành loại mục (SERVICE hoặc PART)
const toItemType = (value) => {
  const text = String(value || '').trim().toUpperCase();
  if (text === 'PART' || text === 'PRODUCT' || text === 'SPARE_PART' || text === 'SPAREPART' || text === 'EQUIPMENT' || text === 'MACHINERY') return 'PART';
  return 'SERVICE';
};

// Xử lý kết quả trả về từ API để trích xuất danh sách sản phẩm/dịch vụ, phân trang,...
const extractHomeProductsList = (res) => {
  const payload = res?.data?.data ?? res?.data ?? res;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
};

// Chuyển đổi thông tin danh mục của mục thành một khóa duy nhất để lọc/sắp xếp
const toCategoryKey = (item) => String(
  item?.itemCategoryCode
  ?? item?.categoryCode
  ?? item?.itemCategoryName
  ?? item?.categoryName
  ?? 'all',
).trim() || 'all';

// Chuyển đổi các giá trị khác nhau có thể chứa thông tin giá thành một số hợp lệ để so sánh/sắp xếp
const toPriceNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const normalized = String(value).replace(/[^\d.-]/g, '');
  if (!normalized || normalized === '-' || normalized === '.' || normalized === '-.') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

// Tìm giá sản phẩm từ nhiều nguồn thuộc tính khác nhau của Backend
// Ưu tiên các thuộc tính như price, sellingPrice, salePrice,... 
const getCatalogPrice = (item) => {
  const candidates = [
    item?.price,
    item?.sellingPrice,
    item?.salePrice,
    item?.currentPrice,
    item?.basePrice,
    item?.unitPrice,
    item?.listPrice,
    item?.displayPrice,
    item?.catalogPrice,
    item?.data?.price,
    item?.data?.sellingPrice,
  ];
  for (const value of candidates) {
    const price = toPriceNumber(value);
    if (price != null) return price;
  }
  return null;
};

// Xử lý để hiển thị thông tin giá, có thể chứa thông tin dạng text như "Liên hệ"
const getCatalogPriceText = (item) => {
  const candidates = [
    item?.displayPrice,
    item?.priceLabel,
    item?.data?.displayPrice,
    item?.data?.priceLabel,
  ];

  // Nếu có giá trị nào đó không phải là số hợp lệ, coi đó là text hiển thị giá
  for (const value of candidates) {
    if (typeof value !== 'string') continue;
    const text = value.trim();
    if (text && toPriceNumber(text) == null) return text;
  }

  return item?.showPrice === false ? 'Liên hệ' : '';
};

// Component chính của trang đặt lịch
export default function Booking() {
  const location = useLocation();

  // Lấy thông tin được truyền qua state khi điều hướng đến trang này, ví dụ như số điện thoại đã điền sẵn, dịch vụ đã chọn,...
  const prefilledPhone = location.state?.phone || '';
  const preselectedCatalogItemId = location.state?.catalogItemId != null
    ? String(location.state.catalogItemId)
    : null;
  const legacyServiceId = location.state?.serviceId != null ? Number(location.state.serviceId) : null;
  const preselectedItemType = toItemType(location.state?.itemType);

  // Luồng đến từ trang thanh toán giỏ hàng (nhận tại xưởng, đã đặt cọc):
  // sản phẩm đã chọn sẵn nên bỏ qua bước chọn dịch vụ, chỉ cần chọn ngày giờ.
  const cartCatalogItemIds = Array.isArray(location.state?.catalogItemIds)
    ? location.state.catalogItemIds.map(String).filter(Boolean)
    : [];
  const fromCart = location.state?.fromCart === true && cartCatalogItemIds.length > 0;
  const cartOrderCode = String(location.state?.orderCode || '').trim();
  const cartCustomerName = String(location.state?.customerName || '').trim();

  // Các state để quản lý bước hiện tại
  const [stepIndex, setStepIndex] = useState(fromCart ? 1 : 0); // 0: chọn dịch vụ, 1: chọn lịch, 2: điền thông tin, 3: hoàn tất
  useScrollToTop([stepIndex], 'smooth');
  const [services, setServices] = useState([]);  // Danh sách dịch vụ/phụ tùng được tải về từ API
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState('');

  // State để quản lý lựa chọn dịch vụ/phụ tùng, thông tin tìm kiếm/lọc, thông tin lịch hẹn và khách hàng
  const [selectedIds, setSelectedIds] = useState(() => {
    if (fromCart) return cartCatalogItemIds;
    return preselectedCatalogItemId ? [preselectedCatalogItemId] : [];
  });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [activeTab, setActiveTab] = useState(preselectedItemType);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [priceSort, setPriceSort] = useState('');

  // State để quản lý thông tin lịch hẹn và khách hàng
  const [schedule, setSchedule] = useState({ date: '', time: '' });
  const [info, setInfo] = useState({
    name: cartCustomerName,
    phone: prefilledPhone,
    // Gắn mã đơn đã đặt cọc vào ghi chú để lễ tân đối soát khi xác nhận lịch
    note: cartOrderCode ? `Đơn hàng ${cartOrderCode} - đã đặt cọc online.` : '',
  });

  // State để quản lý token khách hàng
  const [customerToken, setCustomerToken] = useState(() => getValidToken('customerToken'));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [bookingData, setBookingData] = useState(null);
  const [modifyBookingId, setModifyBookingId] = useState(null);

  // Hàm giải mã token để lấy thông tin hồ sơ khách hàng như tên và số điện thoại
  const decodeTokenProfile = (token) => {
    try {
      const payload = token.split('.')[1];
      const json = JSON.parse(atob(payload));
      return {
        name: json?.fullName || json?.name || '',
        phone: json?.sub || '',
      };
    } catch {
      return { name: '', phone: '' };
    }
  };

  // Khi có số điện thoại được truyền vào qua state, tự động điền vào thông tin khách hàng
  useEffect(() => {
    if (!prefilledPhone) return undefined;
    const t = setTimeout(() => setInfo((prev) => ({ ...prev, phone: prefilledPhone })), 0);
    return () => clearTimeout(t);
  }, [prefilledPhone]);

  // Khi có token khách hàng hợp lệ, giải mã để lấy thông tin hồ sơ và điền vào form nếu chưa có
  useEffect(() => {
    if (!customerToken) return;
    const profile = decodeTokenProfile(customerToken);
    setInfo((prev) => ({
      ...prev,
      name: prev.name || profile.name,
      phone: prev.phone || profile.phone,
    }));
  }, [customerToken]);

  // Lắng nghe sự kiện thay đổi localStorage để cập nhật token khách hàng khi có sự thay đổi từ tab khác
  useEffect(() => {
    const handleStorage = (e) => {
      if (!e.key || e.key === 'customerToken') {
        setCustomerToken(getValidToken('customerToken'));
      }
    };
    globalThis.addEventListener('storage', handleStorage);
    return () => globalThis.removeEventListener('storage', handleStorage);
  }, []);

  // Gọi API lấy danh sách Dịch vụ & Phụ tùng cùng lúc
  useEffect(() => {
    let active = true;
    setServicesLoading(true);
    setServicesError('');

    // Fetch tất cả sản phẩm mà không giới hạn itemType, sau đó phân loại ở client
    fetchHomeProducts({ page: 0, size: 500 })
      .then((res) => {
        if (!active) return;
        const mergedRaw = extractHomeProductsList(res) || [];

        // Chuyển đổi dữ liệu thô từ API thành định dạng chuẩn để hiển thị trong UI, đồng thời lọc bỏ các mục không có catalogItemId hợp lệ
        const mapped = mergedRaw
          .map((item) => {
            const catalogItemId = Number(item?.catalogItemId ?? item?.catalog_item_id ?? item?.itemId);
            if (!Number.isFinite(catalogItemId) || catalogItemId <= 0) return null;

            const itemType = toItemType(item?.itemType ?? item?.type ?? item?.__sourceType);
            const category = toCategoryKey(item);
            const categoryLabel = String(
              item?.itemCategoryName
                ?? item?.categoryName
                ?? item?.itemCategoryCode
                ?? item?.categoryCode
                ?? 'Khác',
            ).trim() || 'Khác';

            // Tạo một đối tượng mới với các thuộc tính cần thiết cho UI, đồng thời chuẩn hóa tên trường và xử lý các giá trị khác nhau từ API
            return {
              id: String(catalogItemId),
              serviceId: Number(item?.serviceId ?? item?.service_id),
              itemType,
              name: String(item?.title || item?.itemName || (itemType === 'PART' ? 'Phụ tùng' : 'Dịch vụ')).trim(),
              desc: String(item?.shortDescription || item?.description || 'Hiện chưa có mô tả ngắn.').trim(),
              category,
              categoryLabel,
              price: getCatalogPrice(item),
              priceText: getCatalogPriceText(item),
              thumbnail: item?.thumbnailUrl || item?.imageUrl || item?.mediaThumbnail || '',
            };
          })
          .filter(Boolean);

        // Loại bỏ các mục trùng lặp dựa trên id, ưu tiên giữ lại mục đầu tiên xuất hiện trong danh sách kết hợp
        const dedupedMap = new Map();
        // Nếu có nhiều mục trùng id, giữ lại mục có itemType là SERVICE nếu có, ưu tiên hơn PART
        mapped.forEach((item) => {
          if (!dedupedMap.has(item.id)) dedupedMap.set(item.id, item);
        });

        // Chuyển Map đã loại bỏ trùng lặp thành mảng để hiển thị trong UI
        const finalList = Array.from(dedupedMap.values());
        setServices(finalList);

        // Nếu có id dịch vụ được truyền vào qua state (legacyServiceId), tự động chọn dịch vụ đó nếu tồn tại trong danh sách kết hợp, chuyển tab tương ứng
        if (!preselectedCatalogItemId && Number.isFinite(legacyServiceId) && legacyServiceId != null) {
          const found = finalList.find((s) => Number(s.serviceId) === legacyServiceId);
          if (found?.id) {
            setSelectedIds([String(found.id)]);
            setActiveTab(toItemType(found.itemType));
          }
        }

        if (preselectedCatalogItemId) {
          const selectedItem = finalList.find((s) => s.id === preselectedCatalogItemId);
          if (selectedItem?.itemType) setActiveTab(toItemType(selectedItem.itemType));
        }
      })
      .catch((err) => {
        if (active) setServicesError(err?.message || 'Không thể tải danh sách dịch vụ/phụ tùng.');
      })
      .finally(() => {
        if (active) setServicesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [legacyServiceId, preselectedCatalogItemId]);

  // Khi có dữ liệu lịch hẹn từ API (sau khi tạo hoặc sửa lịch), tự động điền thông tin vào form và cập nhật lựa chọn dịch vụ nếu có
  useEffect(() => {
    if (!bookingData) return;

    if (bookingData?.scheduledDate || bookingData?.scheduledTime) {
      setSchedule((prev) => ({
        ...prev,
        date: bookingData?.scheduledDate || prev.date,
        time: bookingData?.scheduledTime || prev.time,
      }));
    }

    // Xử lý để loại bỏ các ký tự không hợp lệ và giới hạn độ dài của ghi chú
    if (typeof bookingData?.description === 'string') {
      const sanitized = bookingData.description.replaceAll(/[<>{}]/g, '').slice(0, 500);
      setInfo((prev) => ({ ...prev, note: sanitized }));
    }

    // Nếu có danh sách serviceIds trong dữ liệu lịch hẹn, tự động chọn các dịch vụ đó trong form
    if (Array.isArray(bookingData?.serviceIds) && bookingData.serviceIds.length > 0) {
      const ids = bookingData.serviceIds.map(String).filter(Boolean);
      const idSet = new Set((Array.isArray(services) ? services : []).map((s) => String(s.id)));
      const allMatch = ids.length > 0 && ids.every((id) => idSet.has(id));
      if (allMatch) setSelectedIds(ids);
    }
  }, [bookingData, services]);

  const toggle = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // Khi chuyển tab giữa SERVICE và PART, reset các bộ lọc và tìm kiếm 
  const handleChangeTab = (nextTab) => {
    setActiveTab(toItemType(nextTab));
    setFilter('all');
    setSearch('');
    setMinPrice('');
    setMaxPrice('');
    setPriceSort('');
  };

  // Các hàm điều hướng giữa các bước của quy trình đặt lịch
  const goNextFromService = () => {
    setStepIndex(1);
  };

  // Từ bước chọn lịch, có thể quay lại bước chọn dịch vụ hoặc tiếp tục đến bước điền thông tin
  const goBackFromSchedule = () => setStepIndex(0);
  const goNextFromSchedule = () => {
    if (!schedule.date || !schedule.time) return;
    setStepIndex(2);
  };

  // Từ bước điền thông tin, có thể quay lại bước chọn lịch hoặc tiếp tục đến bước hoàn tất 
  const goBackFromInfo = () => setStepIndex(1);
  const goSubmitInfo = async () => {
    if (!info.name || !info.phone || submitting) return;

    setSubmitError('');
    setSubmitting(true);

    // Xử lý để loại bỏ các ký tự không hợp lệ và giới hạn độ dài của ghi chú trước khi gửi lên API
    const rawNote = String(info.note || '');
    const hasForbiddenChars = /[<>{}]/.test(rawNote);
    const trimmedNote = rawNote.trim();

    if (hasForbiddenChars) {
      setSubmitError('Ghi chú không được chứa ký tự <, >, {, }.');
      setSubmitting(false);
      return;
    }

    if (trimmedNote.length > 500) {
      setSubmitError('Ghi chú tối đa 500 ký tự.');
      setSubmitting(false);
      return;
    }

    const catalogItemIds = selectedIds
      .map(Number)
      .filter((n) => Number.isFinite(n) && n >= 0);

    const basePayload = {
      appointmentDate: schedule.date,
      appointmentTime: schedule.time,
      userNote: trimmedNote,
      selectedServiceIds: catalogItemIds,
    };

    // Cập nhật logic để xác định xem là tạo mới hay sửa lịch dựa trên customerToken và modifyBookingId
    const isModify = !!customerToken && modifyBookingId != null && `${modifyBookingId}` !== '';

    try {
      let res;
      if (isModify) {
        // Nếu có token khách hàng hợp lệ và modifyBookingId đã được thiết lập, gọi API sửa lịch với modifyBookingId
        res = await modifyCustomerBooking(
          modifyBookingId,
          {
            newAppointmentDate: schedule.date,
            newAppointmentTime: schedule.time,
            newUserNote: trimmedNote,
            newServiceIds: catalogItemIds,
          },
          customerToken,
        );
      } else if (customerToken) {
        // Nếu chỉ có token khách hàng mà chưa có modifyBookingId, gọi API tạo lịch mới cho khách hàng đã đăng nhập
        res = await createCustomerBooking(basePayload, customerToken);
      } else {
        // Nếu không có token khách hàng, gọi API tạo lịch mới cho khách chưa đăng nhập
        res = await createGuestBooking({
          ...basePayload,
          fullName: info.name.trim(),
          phone: info.phone.trim(),
        });
      }

      setBookingData(res?.data || null);
      if (res?.data?.bookingId != null) {
        setModifyBookingId(res.data.bookingId);
      }
      setStepIndex(3);
    } catch (err) {
      const errorMsg = err?.message || (isModify ? 'Không thể đổi lịch hẹn.' : 'Không thể tạo lịch hẹn.');
      setSubmitError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Từ bước hoàn tất, có thể chọn đổi lịch hoặc hủy lịch 
  const goReschedule = () => {
    if (customerToken && bookingData?.bookingId != null) {
      setModifyBookingId(bookingData.bookingId);
    } else {
      setModifyBookingId(null);
    }
    setStepIndex(1);
  };

  // Hàm xử lý khi người dùng chọn hủy lịch, gọi API hủy lịch và cập nhật trạng thái trên UI
  const goCancel = async () => {
    if (submitting) return;
    const bookingId = bookingData?.bookingId;
    const notify = (message) => toast(message, { containerId: 'app-toast' });
    setSubmitError('');
    setSubmitting(true);
    try {
      const res = await cancelCustomerBooking(bookingId, customerToken);
      notify(res?.message || 'Hủy lịch thành công.');
      if (bookingData) {
        setBookingData((prev) => ({ ...prev, status: prev?.status || 'CANCELLED' }));
      }
    } catch (err) {
      const errorMsg = err?.message || 'Không thể hủy lịch hẹn.';
      setSubmitError(errorMsg);
      notify(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const goHome = () => {
    globalThis.location.href = '/';
  };

  return (
    <div className={styles['booking-page']}>
      <div className={styles['stepper-wrapper']}>
        <div className={styles['progress-track']}>
          <div className={styles['progress-fill']} style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }} />
        </div>
        <div className={styles.stepper}>
          {STEPS.map((step, idx) => {
            const isCompleted = idx < stepIndex || (idx === 3 && stepIndex === 3);
            const isActive = idx === stepIndex;
            const stepClass = [styles.step, isCompleted ? styles.completed : '', isActive ? styles.active : '']
              .filter(Boolean)
              .join(' ');
            return (
              <div key={step.id} className={stepClass}>
                <div className={styles.dot}>{isCompleted ? '✓' : idx + 1}</div>
                <div className={styles.label}>{step.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* HIỂN THỊ COMPONENT THEO TỪNG BƯỚC */}
      {stepIndex === 0 && (
        <StepService
          services={services}
          selectedIds={selectedIds}
          onToggle={toggle}
          search={search}
          onSearch={setSearch}
          filter={filter}
          onFilter={setFilter}
          loading={servicesLoading}
          error={servicesError}
          activeTab={activeTab}
          onChangeTab={handleChangeTab}
          layoutMode="grid-scroll"
          showPriceFilter
          minPrice={minPrice}
          maxPrice={maxPrice}
          priceSort={priceSort}
          onMinPriceChange={setMinPrice}
          onMaxPriceChange={setMaxPrice}
          onPriceSortChange={setPriceSort}
          onNext={goNextFromService}
        />
      )}

      {stepIndex === 1 && (
        <StepSchedule
          value={schedule}
          onChange={(patch) => setSchedule((prev) => ({ ...prev, ...patch }))}
          onBack={goBackFromSchedule}
          onNext={goNextFromSchedule}
          token={customerToken}
          isAuthed={!!customerToken}
        />
      )}

      {stepIndex === 2 && (
        <StepInfo
          value={info}
          onChange={(patch) => setInfo((prev) => ({ ...prev, ...patch }))}
          onBack={goBackFromInfo}
          onSubmit={goSubmitInfo}
          isAuthed={!!customerToken}
          loading={submitting}
          error={submitError}
        />
      )}

      {stepIndex === 3 && (
        <StepDone
          schedule={schedule}
          info={info}
          bookingData={bookingData}
          services={services}
          selectedIds={selectedIds}
          isAuthed={!!customerToken}
          onReschedule={goReschedule}
          onCancel={goCancel}
          onHome={goHome}
        />
      )}
    </div>
  );
}
