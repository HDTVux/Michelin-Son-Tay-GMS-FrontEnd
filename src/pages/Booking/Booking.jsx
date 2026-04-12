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

const STEPS = [
  { id: 'service', label: 'Chọn dịch vụ' },
  { id: 'schedule', label: 'Chọn ngày & giờ' },
  { id: 'info', label: 'Thông tin' },
  { id: 'done', label: 'Hoàn tất' },
];

const toItemType = (value) => {
  const text = String(value || '').trim().toUpperCase();
  if (text === 'PART' || text === 'PRODUCT' || text === 'SPARE_PART' || text === 'SPAREPART') return 'PART';
  return 'SERVICE';
};

const extractHomeProductsList = (res) => {
  const payload = res?.data?.data ?? res?.data ?? res;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
};

const toCategoryKey = (item) => String(
  item?.itemCategoryCode
  ?? item?.categoryCode
  ?? item?.itemCategoryName
  ?? item?.categoryName
  ?? 'all',
).trim() || 'all';

const toPriceNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

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

export default function Booking() {
  const location = useLocation();
  const prefilledPhone = location.state?.phone || '';
  const preselectedCatalogItemId = location.state?.catalogItemId != null
    ? String(location.state.catalogItemId)
    : null;
  const legacyServiceId = location.state?.serviceId != null ? Number(location.state.serviceId) : null;
  const preselectedItemType = toItemType(location.state?.itemType);

  const [stepIndex, setStepIndex] = useState(0);
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState('');

  const [selectedIds, setSelectedIds] = useState(() => (preselectedCatalogItemId ? [preselectedCatalogItemId] : []));
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [activeTab, setActiveTab] = useState(preselectedItemType);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [priceSort, setPriceSort] = useState('');

  const [schedule, setSchedule] = useState({ date: '', time: '' });
  const [info, setInfo] = useState({ name: '', phone: prefilledPhone, note: '' });
  const [customerToken, setCustomerToken] = useState(() => getValidToken('customerToken'));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [bookingData, setBookingData] = useState(null);
  const [modifyBookingId, setModifyBookingId] = useState(null);

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

  useEffect(() => {
    if (!prefilledPhone) return undefined;
    const t = setTimeout(() => setInfo((prev) => ({ ...prev, phone: prefilledPhone })), 0);
    return () => clearTimeout(t);
  }, [prefilledPhone]);

  useEffect(() => {
    if (!customerToken) return;
    const profile = decodeTokenProfile(customerToken);
    setInfo((prev) => ({
      ...prev,
      name: prev.name || profile.name,
      phone: prev.phone || profile.phone,
    }));
  }, [customerToken]);

  useEffect(() => {
    const handleStorage = (e) => {
      if (!e.key || e.key === 'customerToken') {
        setCustomerToken(getValidToken('customerToken'));
      }
    };
    globalThis.addEventListener('storage', handleStorage);
    return () => globalThis.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    let active = true;
    setServicesLoading(true);
    setServicesError('');

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
            ? extractHomeProductsList(serviceRes.value).map((item) => ({ ...item, __sourceType: 'SERVICE' }))
            : []),
          ...(partRes?.status === 'fulfilled'
            ? extractHomeProductsList(partRes.value).map((item) => ({ ...item, __sourceType: 'PART' }))
            : []),
          ...(productRes?.status === 'fulfilled'
            ? extractHomeProductsList(productRes.value).map((item) => ({ ...item, __sourceType: 'PART' }))
            : []),
        ];

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

            return {
              id: String(catalogItemId),
              serviceId: Number(item?.serviceId ?? item?.service_id),
              itemType,
              name: String(item?.title || item?.itemName || (itemType === 'PART' ? 'Phụ tùng' : 'Dịch vụ')).trim(),
              desc: String(item?.shortDescription || item?.description || 'Hiện chưa có mô tả ngắn.').trim(),
              category,
              categoryLabel,
              price: getCatalogPrice(item),
              thumbnail: item?.thumbnailUrl || item?.imageUrl || item?.mediaThumbnail || '',
            };
          })
          .filter(Boolean);

        const dedupedMap = new Map();
        mapped.forEach((item) => {
          if (!dedupedMap.has(item.id)) dedupedMap.set(item.id, item);
        });

        const finalList = Array.from(dedupedMap.values());
        setServices(finalList);

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

        const serviceFailed = serviceRes?.status === 'rejected';
        const partFailed = partRes?.status === 'rejected';
        const productFailed = productRes?.status === 'rejected';
        if (serviceFailed && partFailed && productFailed) {
          const msg = serviceRes?.reason?.message
            || partRes?.reason?.message
            || productRes?.reason?.message
            || 'Không thể tải danh sách dịch vụ/phụ tùng.';
          setServicesError(msg);
        }
      })
      .catch((err) => {
        if (!active) return;
        setServicesError(err?.message || 'Không thể tải danh sách dịch vụ/phụ tùng.');
      })
      .finally(() => {
        if (active) setServicesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [legacyServiceId, preselectedCatalogItemId]);

  useScrollToTop([stepIndex], 'smooth');

  useEffect(() => {
    if (!bookingData) return;

    if (bookingData?.scheduledDate || bookingData?.scheduledTime) {
      setSchedule((prev) => ({
        ...prev,
        date: bookingData?.scheduledDate || prev.date,
        time: bookingData?.scheduledTime || prev.time,
      }));
    }

    if (typeof bookingData?.description === 'string') {
      const sanitized = bookingData.description.replaceAll(/[<>{}]/g, '').slice(0, 500);
      setInfo((prev) => ({ ...prev, note: sanitized }));
    }

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

  const handleChangeTab = (nextTab) => {
    setActiveTab(toItemType(nextTab));
    setFilter('all');
    setSearch('');
    setMinPrice('');
    setMaxPrice('');
    setPriceSort('');
  };

  const goNextFromService = () => {
    setStepIndex(1);
  };

  const goBackFromSchedule = () => setStepIndex(0);
  const goNextFromSchedule = () => {
    if (!schedule.date || !schedule.time) return;
    setStepIndex(2);
  };

  const goBackFromInfo = () => setStepIndex(1);

  const goSubmitInfo = async () => {
    if (!info.name || !info.phone || submitting) return;

    setSubmitError('');
    setSubmitting(true);

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

    const isModify = !!customerToken && modifyBookingId != null && `${modifyBookingId}` !== '';

    try {
      let res;
      if (isModify) {
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
        res = await createCustomerBooking(basePayload, customerToken);
      } else {
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

  const goReschedule = () => {
    if (customerToken && bookingData?.bookingId != null) {
      setModifyBookingId(bookingData.bookingId);
    } else {
      setModifyBookingId(null);
    }
    setStepIndex(1);
  };

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
