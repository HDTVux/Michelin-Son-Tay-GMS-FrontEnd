import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import styles from './BookingRequestDetail.module.css';
import { buildAllSlots } from './scheduleUtils.js';
import { fetchAllSlots, fetchManagedBookingsPaged } from '../../../services/bookingService.js';
import { formatTimeHHmm } from '../../../components/timeUtils.js';

const isConfirmed = (status) => String(status || '').trim().toUpperCase() === 'CONFIRMED';

function normalizeSlotDataToConfirmed(source, defaultCapacity) {
  const src = source && typeof source === 'object' ? source : {};
  const result = {};

  for (const [timeKey, slot] of Object.entries(src)) {
    const capacity = Number.isFinite(Number(slot?.capacity)) ? Number(slot.capacity) : defaultCapacity;
    const bookings = Array.isArray(slot?.bookings) ? slot.bookings : [];
    const confirmedBookings = bookings.filter((b) => isConfirmed(b?.status));
    const customers = confirmedBookings
      .map((b) => b?.label || b?.bookingCode || b?.licensePlate || b?.customerName || b?.fullName)
      .filter(Boolean);

    result[timeKey] = {
      ...slot,
      capacity,
      bookings: confirmedBookings,
      customers,
      current: confirmedBookings.length,
    };
  }

  return result;
}


export default function SchedulePanel({
  dateLabel,        // Ngày đang hiển thị (vd: 2026-02-13)
  pickedTime,       // Khung giờ khách hàng mong muốn
  slotData,         // Dữ liệu khách hàng đã đặt từ Server
  token,            // JWT token (optional). If not provided, will try localStorage.
  startHour = 7,    // Giờ mở cửa garage
  endHour = 20,     // Giờ đóng cửa garage
  defaultCapacity = 6, // Sức chứa xe tối đa mỗi slot
  title = 'Lịch ngày',
  subtitlePrefix = 'Khung giờ khách chọn:',
  showPickedTag = true,
  onBookingClick,
}) {
  const [loadedSlotData, setLoadedSlotData] = useState({});
  const [baseSlots, setBaseSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selectedDate, setSelectedDate] = useState(String(dateLabel || '').trim());
  const pickedTimeKey = useMemo(() => formatTimeHHmm(String(pickedTime || '').trim()), [pickedTime]);

  /**
   * useMemo (dateOptions): Tạo danh sách 10 ngày tới cho ô chọn Select.
   * Để nhân viên có thể nhanh chóng kiểm tra lịch của những ngày lân cận mà không cần tải lại trang.
   */
  const dateOptions = useMemo(() => buildDateOptions(10), []);

  // Sync with parent-provided date when it changes (eg: user changes date in the left form)
  useEffect(() => {
    setSelectedDate(String(dateLabel || '').trim());
  }, [dateLabel]);

  const dateValueSet = useMemo(() => new Set(dateOptions.map((o) => o.value)), [dateOptions]);
  const isSelectedDateOutOfRange = !!selectedDate && !dateValueSet.has(selectedDate);
  const baseDateLabel = String(dateLabel || '').trim();

  const effectiveToken = token || localStorage.getItem('authToken');

  // Load canonical slots from backend so the number/time of slots matches the booking flow.
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const res = await fetchAllSlots(effectiveToken);
        const list = Array.isArray(res?.data) ? res.data : [];
        const filtered = list.filter((s) => s && (s.isActive ?? true));
        filtered.sort((a, b) => formatTimeHHmm(a?.startTime).localeCompare(formatTimeHHmm(b?.startTime)));
        if (active) setBaseSlots(filtered);
      } catch {
        if (active) setBaseSlots([]);
      }
    })();

    return () => {
      active = false;
    };
  }, [effectiveToken]);

  useEffect(() => {
    const safeDate = String(selectedDate || '').trim();
    if (!safeDate) {
      setLoadedSlotData({});
      setIsLoading(false);
      setLoadError('');
      return;
    }

    if (!effectiveToken) {
      setLoadedSlotData({});
      setIsLoading(false);
      setLoadError('Vui lòng đăng nhập để xem lịch.');
      return;
    }

    let active = true;
    setIsLoading(true);
    setLoadError('');
  setLoadedSlotData({});

    (async () => {
      try {
        const size = 200;
        const maxPages = 10;
        const collected = [];

        for (let page = 0; page < maxPages; page++) {
          const res = await fetchManagedBookingsPaged({ page, size, date: safeDate }, effectiveToken);
          const pageData = res?.data;
          const content = Array.isArray(pageData?.content) ? pageData.content : [];
          collected.push(...content);

          const totalPages = Number.isFinite(pageData?.totalPages) ? pageData.totalPages : 1;
          if (page >= totalPages - 1) break;
          if (content.length === 0) break;
        }

        if (active) {
          setLoadedSlotData(buildSlotDataFromManagedBookings(collected, defaultCapacity));
        }
      } catch (err) {
        if (active) {
          setLoadedSlotData({});
          setLoadError(err?.message || 'Không thể tải lịch theo ngày.');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [selectedDate, effectiveToken, defaultCapacity]);

  const effectiveSlotData = (() => {
    const provided = slotData && typeof slotData === 'object' ? slotData : {};
    const hasProvided = Object.keys(provided).length > 0;
    const canUseProvided = hasProvided && String(selectedDate || '').trim() === baseDateLabel;
    const sourceData = canUseProvided ? provided : loadedSlotData;
    return normalizeSlotDataToConfirmed(sourceData, defaultCapacity);
  })();

  /**
   * useMemo (slots): Xử lý danh sách khung giờ để hiển thị.
   * Kết hợp dữ liệu thô từ API (buildAllSlots) và trạng thái "đang chọn" (selected).
   * Nếu giờ của slot trùng với pickedTime, nó sẽ nổi bật lên để nhân viên dễ đối chiếu.
   */
  const slots = useMemo(() => {
    const isPickedDate = String(selectedDate || '').trim() === baseDateLabel;
    const slotData = effectiveSlotData || {};

    const apiTimes = Array.isArray(baseSlots) && baseSlots.length > 0
      ? baseSlots.map((s) => formatTimeHHmm(s?.startTime)).filter(Boolean)
      : [];

    // Keep any extra times that exist in slotData (to avoid hiding bookings).
    const apiTimeSet = new Set(apiTimes);
    const extraTimes = Object.keys(slotData)
      .filter((t) => !apiTimeSet.has(t))
      .sort((a, b) => String(a).localeCompare(String(b)));

    if (apiTimes.length > 0) {
      const times = [...apiTimes, ...extraTimes];
      return times.map((time) => {
        const data = slotData[time] || {};
        const bookings = Array.isArray(data?.bookings) ? data.bookings : [];
        const customers = Array.isArray(data?.customers) ? data.customers : [];
        const current = Number.isFinite(Number(data?.current)) ? Number(data.current) : bookings.length;
        const capacity = Number.isFinite(Number(data?.capacity)) ? Number(data.capacity) : defaultCapacity;

        let state = 'ok';
        if (current === capacity) state = 'full';
        if (current > capacity) state = 'over';
        if (isPickedDate && pickedTimeKey && time === pickedTimeKey) state = 'selected';

        return {
          time,
          bookings,
          customers,
          current,
          capacity,
          quota: `${current}/${capacity}`,
          state,
        };
      });
    }

    const built = buildAllSlots({ slotData, startHour, endHour, defaultCapacity });
    return built.map((slot) => ({
      ...slot,
      state: isPickedDate && pickedTimeKey && slot.time === pickedTimeKey ? 'selected' : slot.state,
    }));
  }, [effectiveSlotData, startHour, endHour, defaultCapacity, pickedTimeKey, selectedDate, baseDateLabel, baseSlots]);

  const renderSlotCustomers = (slot) => {
    const hasBookings = Array.isArray(slot?.bookings) && slot.bookings.length > 0;
    const clickable = typeof onBookingClick === 'function';

    if (hasBookings) {
      return slot.bookings.map((b, idx) => {
        const key = b?.bookingCode || b?.bookingId || `${slot.time}-${idx}`;
        const label = b?.bookingCode || b?.licensePlate || b?.customerName || b?.fullName || 'Booking';

        return clickable ? (
          <button
            key={key}
            type="button"
            className={`${styles.slotBadge} ${styles.slotBadgeButton}`}
            onClick={() => onBookingClick(b)}
            title="Xem chi tiết"
          >
            {label}
          </button>
        ) : (
          <span key={key} className={styles.slotBadge}>{label}</span>
        );
      });
    }

    if (!slot?.customers || slot.customers.length === 0) {
      return <span className={styles.slotEmpty}>Trống</span>;
    }

    return slot.customers.map((c) => <span key={c} className={styles.slotBadge}>{c}</span>);
  };

  return (
    <aside className={styles.schedulePanel}>
      <div className={styles.scheduleHeader}>
        <div className={styles.scheduleDateRow}>
          <div className={styles.scheduleTitle}>{title} {selectedDate}</div>
          {/* Ô chọn ngày: Cho phép xem lịch của các ngày khác */}
          <select
            className={styles.scheduleDateSelect}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          >
            <option value="">Chọn ngày</option>
            {isSelectedDateOutOfRange && (
              <option value={selectedDate}>{selectedDate}</option>
            )}
            {dateOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        {/* Nhắc lại khung giờ khách đang yêu cầu để nhân viên không bị quên khi cuộn danh sách */}
        <div className={styles.scheduleSub}>{subtitlePrefix} {pickedTimeKey}</div>
      </div>

      <div className={styles.slotList}>
        {isLoading && <div className={styles.serviceStatus}>Đang tải lịch...</div>}
        {!isLoading && loadError && <div className={`${styles.serviceStatus} ${styles.serviceStatusError}`}>{loadError}</div>}
        {slots.map((slot) => (
          /* Mỗi slotItem sẽ có class màu sắc dựa trên state (ok, full, selected) */
          <div key={slot.time} className={`${styles.slotItem} ${styles['slotItem--' + slot.state]}`}>
            <div className={styles.slotTime}>{slot.time}</div>
            
            <div className={styles.slotCustomers}>
              {renderSlotCustomers(slot)}
            </div>

            <div className={styles.slotMeta}>
              {/* Hiển thị tỉ lệ lấp đầy (vd: 1/3) */}
              <span className={styles.slotQuota}>{slot.quota}</span>
              {/* Nếu là giờ khách chọn, hiển thị thêm nhãn "Muốn đặt" để nhấn mạnh */}
              {showPickedTag && slot.state === 'selected' && <span className={styles.slotTag}>Muốn đặt</span>}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

const queueOrderKey = (item) => {
  const n = Number(item?.queueOrder);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
};

function getBookingBadgeLabel(item) {
  const plate =
    item?.licensePlate ||
    item?.plateNumber ||
    item?.vehiclePlate ||
    item?.vehicleNumber ||
    item?.carPlate ||
    item?.vehicleLicensePlate;
  if (plate) return String(plate);

  const name = item?.customerName || item?.fullName || item?.customer?.fullName || item?.name;
  if (name) return String(name);

  const code = item?.bookingCode || item?.booking_code || item?.code;
  if (code) return String(code);

  const id = item?.bookingId || item?.id;
  return id == null ? 'Khách' : `#${id}`;
}

function buildSlotDataFromManagedBookings(bookings, capacity) {
  const list = Array.isArray(bookings) ? bookings : [];
  const byTime = new Map();

  for (const item of list) {
    if (!isConfirmed(item?.status)) continue;
    const key = formatTimeHHmm(item?.scheduledTime);
    if (!key) continue;
    const entry = byTime.get(key) || [];
    entry.push(item);
    byTime.set(key, entry);
  }

  const result = {};
  for (const [key, items] of byTime.entries()) {
    const sorted = [...items].sort((a, b) => {
      const byOrder = queueOrderKey(a) - queueOrderKey(b);
      if (byOrder !== 0) return byOrder;
      return String(a?.createdAt || '').localeCompare(String(b?.createdAt || ''));
    });

    const bookingsView = sorted.map((item) => ({
      bookingId: item?.bookingId ?? item?.id,
      bookingCode: item?.bookingCode ?? item?.booking_code ?? item?.code,
      queueOrder: item?.queueOrder,
      createdAt: item?.createdAt,
      status: item?.status,
      label: getBookingBadgeLabel(item),
    }));

    result[key] = {
      bookings: bookingsView,
      customers: bookingsView.map((b) => b.label).filter(Boolean),
      current: bookingsView.length,
      capacity,
    };
  }

  return result;
}

/**
 * Hàm buildDateOptions: Tạo mảng các đối tượng ngày.
 * Chuyển đổi đối tượng Date thuần của JS sang định dạng dễ đọc cho người Việt (vd: T6 13/02/2026).
 */
function buildDateOptions(days) {
  const today = new Date();
  return Array.from({ length: days }, (_, idx) => {
    const d = new Date(today);
    d.setDate(d.getDate() + idx);
    const value = d.toISOString().split('T')[0]; // Định dạng YYYY-MM-DD để gửi lên Server
    const label = formatDateLabel(d);           // Định dạng hiển thị cho người dùng
    return { value, label };
  });
}

/**
 * Hàm formatDateLabel: Định dạng ngày theo kiểu Việt Nam.
 * Ví dụ: "T6 13/02/2026"
 */
function formatDateLabel(date) {
  const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const wd = weekdays[date.getDay()];
  return `${wd} ${dd}/${mm}/${yyyy}`;
}

SchedulePanel.propTypes = {
  dateLabel: PropTypes.string,
  pickedTime: PropTypes.string,
  slotData: PropTypes.object,
  token: PropTypes.string,
  startHour: PropTypes.number,
  endHour: PropTypes.number,
  defaultCapacity: PropTypes.number,
  title: PropTypes.string,
  subtitlePrefix: PropTypes.string,
  showPickedTag: PropTypes.bool,
  onBookingClick: PropTypes.func,
};