import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './BookingRequestEdit.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import SchedulePanel from './SchedulePanel.jsx';
import { toast } from 'react-toastify';
import {
  fetchAllSlots,
  fetchAvailableSlotStaff,
  fetchBookingRequestDetail,
  updateBookingRequest,
} from '../../../services/bookingService.js';
import { formatTimeHHmm } from '../../../components/timeUtils.js';
import { getBookingStatusTextVi, normalizeStatusCode } from '../../../components/statusUtils.js';

function mapStatusTone(status) {
  const upper = (status || '').toUpperCase();
  if (upper === 'PENDING') return 'warning';
  if (upper === 'CONTACTED') return 'info';
  if (upper === 'APPROVED' || upper === 'CONFIRM' || upper === 'CONFIRMED') return 'success';
  if (upper === 'REJECTED' || upper === 'CANCEL' || upper === 'CANCELLED' || upper === 'CANCELED' || upper === 'SPAM') return 'danger';
  return 'info';
}

function mapBooking(apiData) {
  if (!apiData) return null;

  const services = Array.isArray(apiData.services)
    ? apiData.services.map((s) => s?.itemName || s?.itemType).filter(Boolean)
    : [];

  const rawStatus = apiData.status || 'PENDING';
  const status = normalizeStatusCode(rawStatus) || 'PENDING';
  const statusTone = mapStatusTone(status);

  return {
    id: apiData.requestId?.toString() || '',
    code: apiData.requestCode || apiData.request_code || '',
    name: apiData.fullName || apiData.customer?.fullName || '',
    phone: apiData.phone || apiData.customer?.phone || '',
    email: apiData.customer?.email || '',
    customerType: apiData.isGuest ? 'Khách vãng lai' : 'Khách có tài khoản',
    history: apiData.customer?.firstBookingAt ? 'Đã có lịch sử' : 'Chưa có lịch sử',
    services,
    servicesDisplay: services.length ? services.join(', ') : (apiData.serviceCategory || ''),
    status,
    statusTone,
    desiredDate: apiData.scheduledDate || '',
    desiredTime: formatTimeHHmm(apiData.scheduledTime),
    note: apiData.description || apiData.rejectionReason || '',
    isGuest: !!apiData.isGuest,
    slotData: {},
    _raw: apiData,
  };
}

function normalizeBackendTime(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^\d{2}:\d{2}$/.test(raw)) return `${raw}:00`;
  return raw;
}

const DURATION_MINUTES = 60;
const DATE_RANGE_DAYS = 10;

const formatLocalDateYYYYMMDD = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const buildDateOptions = () => {
  const today = new Date();
  const options = [];
  for (let i = 0; i < DATE_RANGE_DAYS; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const value = formatLocalDateYYYYMMDD(d);
    const label = d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
    options.push({ value, label });
  }
  return options;
};

const normalizePeriodLabel = (raw) => {
  if (!raw) return '';
  const v = String(raw).trim().toLowerCase();
  if (v === 'morning' || v === 'am' || v === 'sang' || v === 'sáng') return 'Sáng';
  if (v === 'afternoon' || v === 'pm' || v === 'chieu' || v === 'chiều') return 'Chiều';
  if (v === 'evening' || v === 'night' || v === 'toi' || v === 'tối') return 'Tối';
  return raw;
};

const timeKey = (t) => formatTimeHHmm(t || '');

const toLocalDateTime = (dateYYYYMMDD, timeRaw) => {
  if (!dateYYYYMMDD || !timeRaw) return null;
  const [yStr, mStr, dStr] = String(dateYYYYMMDD).split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;

  const parts = String(timeRaw).split(':');
  const hh = Number(parts[0]);
  const mm = Number(parts[1] ?? 0);
  const ss = Number(parts[2] ?? 0);
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || !Number.isFinite(ss)) return null;

  return new Date(y, m - 1, d, hh, mm, ss, 0);
};

const isPastSlot = (dateYYYYMMDD, timeRaw) => {
  const slotStart = toLocalDateTime(dateYYYYMMDD, timeRaw);
  if (!slotStart) return false;
  return slotStart.getTime() <= Date.now();
};

function parseServiceIdsFromText(text) {
  return String(text || '')
    .split(',')
    .map((part) => Number(String(part).trim()))
    .filter((n) => Number.isFinite(n));
}

function extractServiceIds(apiData) {
  const list = Array.isArray(apiData?.services) ? apiData.services : [];
  return list
    .map((s) => s?.serviceId ?? s?.itemId ?? s?.id)
    .map(Number)
    .filter((n) => Number.isFinite(n));
}


export default function BookingRequestEdit() {
  // Đảm bảo trang luôn hiển thị từ đầu khi chuyển hướng tới
  useScrollToTop();
  
  const navigate = useNavigate();
  const params = useParams();
  const requestCodeParam = params?.requestCode ?? params?.id;

  const notify = (message) => toast(message, { containerId: 'app-toast' });

  const [booking, setBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const [baseSlots, setBaseSlots] = useState([]);
  const [baseSlotsLoading, setBaseSlotsLoading] = useState(false);
  const [baseSlotsError, setBaseSlotsError] = useState('');

  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');

  /**
   * useState (form): Quản lý trạng thái các ô nhập liệu.
   * Tạo một bản sao dữ liệu để chỉnh sửa độc lập, 
   * chỉ khi nhấn "Lưu" thì dữ liệu mới thực sự được gửi đi.
   */
  const [form, setForm] = useState({
    desiredDate: '',
    desiredTime: '',
    services: '',
    note: '',
  });

  /**
   * Hàm handleChange: Cập nhật giá trị vào state form.
   * @param {string} key: Tên trường dữ liệu (ví dụ: 'note')
   * @param {any} value: Giá trị mới người dùng nhập vào
   */
  const handleChange = (key, value) => {
    setForm((prev) => {
      // Khi đổi ngày thì reset giờ đã chọn để tránh giữ giờ cũ
      if (key === 'desiredDate') {
        return { ...prev, desiredDate: value, desiredTime: '' };
      }
      return { ...prev, [key]: value };
    });
  };

  /**
   * Hàm handleSave: Xử lý lưu dữ liệu.
   * Gom toàn bộ dữ liệu đã sửa để gọi API. 
   * Sau khi lưu thành công sẽ điều hướng người dùng quay lại trang chi tiết.
   */
  const handleSave = async () => {
    if (!booking?.id || isSaving) return;
    if (!requestCodeParam) {
      setError('Không tìm thấy mã yêu cầu (requestCode) để cập nhật.');
      return;
    }

    if (!form.desiredDate || !form.desiredTime) {
      setError('Vui lòng chọn ngày và khung giờ.');
      return;
    }

    // Nếu hệ thống không tải được trạng thái còn chỗ theo ngày đã chọn,
    // không cho phép lưu vì không thể đảm bảo slot còn trống.
    if (form.desiredDate && slotsLoading) {
      setError('Đang tải trạng thái chỗ trống, vui lòng đợi...');
      return;
    }
    if (form.desiredDate && slotsError) {
      setError('Không thể kiểm tra chỗ trống cho ngày đã chọn. Vui lòng thử lại hoặc chọn ngày khác.');
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      setError('Vui lòng đăng nhập để lưu thay đổi.');
      return;
    }

    const rawNote = String(form.note || '');
    if (/[<>{}]/.test(rawNote)) {
      setError('Yêu cầu thêm không được chứa ký tự <, >, {, }.');
      return;
    }

    const trimmedNote = rawNote.trim();
    if (trimmedNote.length > 500) {
      setError('Yêu cầu thêm tối đa 500 ký tự.');
      return;
    }

    const apiData = booking?._raw;
    const extractedIds = extractServiceIds(apiData);
    const typedIds = parseServiceIdsFromText(form.services);
    const serviceIds = typedIds.length ? typedIds : extractedIds;

    const payload = {
      scheduledDate: String(form.desiredDate).trim(),
      scheduledTime: normalizeBackendTime(form.desiredTime),
      description: trimmedNote,
      serviceCategory: String(form.services || '').trim(),
      isGuest: !!booking?.isGuest,
      services: serviceIds,
    };

    try {
      setIsSaving(true);
      setError('');
      const res = await updateBookingRequest(requestCodeParam, payload, token);
      notify(res?.message || 'Cập nhật yêu cầu thành công.');
      navigate(`/booking-request-management/${encodeURIComponent(String(requestCodeParam || ''))}`);
    } catch (err) {
      setError(err?.message || 'Không thể cập nhật yêu cầu.');
    } finally {
      setIsSaving(false);
    }
  };

  const requestCode = useMemo(() => String(requestCodeParam || '').trim(), [requestCodeParam]);

  const dateOptions = useMemo(() => buildDateOptions(), []);
  const allowedDateSet = useMemo(() => new Set(dateOptions.map((o) => o.value)), [dateOptions]);
  const isDateOutOfRange = !!form.desiredDate && !allowedDateSet.has(form.desiredDate);

  // Lấy danh sách slot nền (không theo ngày) để có UI ngay cả khi chưa chọn ngày
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setBaseSlots([]);
      setBaseSlotsError('Vui lòng đăng nhập để xem khung giờ.');
      return;
    }

    let active = true;
    setBaseSlotsLoading(true);
    setBaseSlotsError('');

    fetchAllSlots(token)
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res?.data) ? res.data : [];
        const filtered = list.filter((s) => s && (s.isActive ?? true));
        filtered.sort((a, b) => timeKey(a?.startTime).localeCompare(timeKey(b?.startTime)));
        setBaseSlots(filtered);
      })
      .catch((err) => {
        if (!active) return;
        setBaseSlotsError(err?.message || 'Không thể tải khung giờ.');
        setBaseSlots([]);
      })
      .finally(() => {
        if (active) setBaseSlotsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Khi đã chọn ngày: gọi API lấy trạng thái còn chỗ (không áp rule "đặt trước 2 tiếng")
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!form.desiredDate) {
      setAvailableSlots([]);
      setSlotsError('');
      setSlotsLoading(false);
      return;
    }

    if (!token) {
      setAvailableSlots([]);
      setSlotsError('Vui lòng đăng nhập để xem trạng thái chỗ trống.');
      setSlotsLoading(false);
      return;
    }

    let active = true;
    setSlotsLoading(true);
    setSlotsError('');

    fetchAvailableSlotStaff(form.desiredDate, token, DURATION_MINUTES)
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res?.data?.slots) ? res.data.slots : [];
        setAvailableSlots(list);
      })
      .catch((err) => {
        if (!active) return;
        setSlotsError(err?.message || 'Không thể tải trạng thái chỗ trống.');
        setAvailableSlots([]);
      })
      .finally(() => {
        if (active) setSlotsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [form.desiredDate]);

  // Nếu giờ đang chọn bị đầy/không khả dụng theo API => reset (không refetch)
  useEffect(() => {
    if (!form.desiredDate || !form.desiredTime) return;
    if (slotsLoading || slotsError) return;
    if (!Array.isArray(availableSlots) || availableSlots.length === 0) return;

    const pickedKey = timeKey(form.desiredTime);
    const match = availableSlots.find((s) => timeKey(s.startTime) === pickedKey);
    if (!match) return;

    const remaining = Number(match?.remainingCapacity);
    const hasRemaining = Number.isFinite(remaining);
    const isFull = hasRemaining && remaining <= 0;
    if (!match.isAvailable || isFull) {
      setForm((prev) => ({ ...prev, desiredTime: '' }));
    }
  }, [availableSlots, form.desiredDate, form.desiredTime, slotsError, slotsLoading]);

  const displaySlots = useMemo(() => {
    // Chưa chọn ngày: hiển thị slot nền để tham khảo.
    if (!form.desiredDate) return baseSlots;

    // Đã chọn ngày:
    // - Nếu đang loading: vẫn hiển thị slot nền nhưng sẽ bị disable ở UI
    // - Nếu lỗi: vẫn hiển thị slot nền nhưng sẽ bị disable ở UI (không cho chọn bừa)
    // - Nếu OK: hiển thị slot theo ngày (có remainingCapacity)
    const slots = !slotsLoading && !slotsError ? availableSlots : baseSlots;
    return slots.filter((s) => !isPastSlot(form.desiredDate, s?.startTime));
  }, [availableSlots, baseSlots, form.desiredDate, slotsError, slotsLoading]);

  const handlePickSlot = (rawTime) => {
    if (!form.desiredDate) return;
    if (slotsLoading || slotsError) return;
    const hhmm = formatTimeHHmm(rawTime);
    setForm((prev) => ({ ...prev, desiredTime: hhmm }));
  };

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!requestCode) {
      setError('Không tìm thấy mã yêu cầu (requestCode).');
      setIsLoading(false);
      return;
    }
    if (!token) {
      setError('Vui lòng đăng nhập để chỉnh sửa yêu cầu.');
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);
    setError('');

    fetchBookingRequestDetail(requestCode, token)
      .then((response) => {
        if (!active) return;
        const payload = response?.data?.data ?? response?.data;
        const mapped = mapBooking(payload);
        setBooking(mapped);
        setForm({
          desiredDate: mapped?.desiredDate || '',
          desiredTime: mapped?.desiredTime || '',
          services: mapped?.servicesDisplay || '',
          note: mapped?.note || '',
        });
      })
      .catch((err) => {
        if (!active) return;
        const msg = err?.message || 'Không thể tải chi tiết yêu cầu.';
        const isUnauthorized = err?.status === 401 || err?.status === 403 || msg.toLowerCase().includes('token');

        if (isUnauthorized) {
          localStorage.removeItem('authToken');
          setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        } else {
          setError(msg);
        }
        setBooking(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [requestCode]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>← Quay lại</button>
        <div className={styles.headerTitle}>Chỉnh sửa yêu cầu</div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}
      {isLoading && <div className={styles.loadingBox}>Đang tải dữ liệu...</div>}

      {!isLoading && !booking && !error && (
        <div className={styles.loadingBox}>Không tìm thấy dữ liệu yêu cầu.</div>
      )}

      {!isLoading && booking && (
      <div className={styles.layout}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.label}>Mã yêu cầu</div>
              <div className={styles.requestId}>{booking.code || requestCodeParam || ''}</div>
            </div>
            <span className={`${styles.statusPill} ${styles['statusPill--' + booking.statusTone]}`}>
              {getBookingStatusTextVi(booking.status)}
            </span>
          </div>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Thông tin khách hàng</h3>
            <div className={styles.infoGrid}>
              <InfoRow label="Họ và tên" value={booking.name} link />
              <InfoRow label="Số điện thoại" value={booking.phone} link type="tel" extraAction={<a className={styles.callButton} href={`tel:${booking.phone}`}>Gọi ngay</a>} />
              <InfoRow label="Loại khách hàng" value={booking.customerType} />
              <InfoRow label="Lịch sử" value={booking.history} link />
              <InfoRow label="Dịch vụ đã chọn" value={booking.services.join(', ')} full />
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Điều chỉnh lịch</h3>
            <div className={styles.formRow}>
              <div className={styles.formField}>
                <label className={styles.label} htmlFor="desiredDate">Ngày mong muốn</label>
                <div className={styles.dateInput}>
                  <span className={styles.dateIcon}>📅</span>
                  <select
                    id="desiredDate"
                    value={form.desiredDate}
                    onChange={(e) => handleChange('desiredDate', e.target.value)}
                  >
                    <option value="">Chọn ngày</option>
                    {isDateOutOfRange && (
                      <option value={form.desiredDate} disabled>
                         {form.desiredDate}
                      </option>
                    )}
                    {dateOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                {isDateOutOfRange && (
                  <div className={styles.helperText}>
                    Chỉ cho phép chọn trong 10 ngày tới.
                  </div>
                )}
              </div>
              <div className={styles.formField}>
                <label className={styles.label} htmlFor="desiredTime">Khung giờ</label>
                <input
                  id="desiredTime"
                  type="time"
                  value={form.desiredTime}
                  onChange={(e) => handleChange('desiredTime', e.target.value)}
                  disabled={!form.desiredDate || slotsLoading || !!slotsError}
                />
              </div>
            </div>

            <div className={styles.slotSection}>
              <div className={styles.slotTitle}>Chọn khung giờ theo danh sách</div>
              <div className={styles.slotSub}>
                Hiển thị các khung giờ theo ngày đã chọn; các khung đã đầy sẽ bị khóa.
              </div>

              {baseSlotsLoading && <div className={styles.serviceStatus}>Đang tải khung giờ...</div>}
              {!baseSlotsLoading && baseSlotsError && <div className={`${styles.serviceStatus} ${styles.serviceStatusError}`}>{baseSlotsError}</div>}

              {!!form.desiredDate && slotsLoading && <div className={styles.serviceStatus}>Đang tải trạng thái chỗ trống...</div>}
              {!!form.desiredDate && !slotsLoading && slotsError && <div className={`${styles.serviceStatus} ${styles.serviceStatusError}`}>{slotsError}</div>}

              <div className={styles.slotGrid}>
                {displaySlots.map((slot) => {
                  const rawTime = slot?.startTime;
                  const displayTime = formatTimeHHmm(rawTime);

                  const remaining = Number(slot?.remainingCapacity);
                  const hasRemaining = Number.isFinite(remaining);
                  const isFull = hasRemaining && remaining <= 0;

                  const hasCapacityInfo = !!form.desiredDate && !slotsError && !slotsLoading;
                  const isDisabled = hasCapacityInfo ? (!slot?.isAvailable || isFull) : false;

                  const blockPicking = !form.desiredDate || slotsLoading || !!slotsError;

                  const active = timeKey(form.desiredTime) === timeKey(rawTime);

                  let capacityText = '';
                  if (hasCapacityInfo) {
                    if (isDisabled) capacityText = ' · Hết chỗ';
                    else if (hasRemaining) capacityText = ` · Còn ${remaining}`;
                  }

                  return (
                    <button
                      key={slot?.slotId ?? timeKey(rawTime) ?? rawTime}
                      type="button"
                      className={[
                        styles.slotBtn,
                        active ? styles.slotBtnActive : '',
                        isDisabled ? styles.slotBtnDisabled : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => !isDisabled && !blockPicking && handlePickSlot(rawTime)}
                      disabled={blockPicking || isDisabled}
                    >
                      <div className={styles.slotTime}>{displayTime}</div>
                      <div className={styles.slotMeta}>
                        {normalizePeriodLabel(slot?.period)}
                        {capacityText}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.formField}>
              <label className={styles.label} htmlFor="services">Dịch vụ</label>
              <input
                id="services"
                type="text"
                value={form.services}
                onChange={(e) => handleChange('services', e.target.value)}
                placeholder="Nhập dịch vụ, phân tách bằng dấu phẩy"
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.label} htmlFor="note">Yêu cầu thêm</label>
              <textarea
                id="note"
                value={form.note}
                onChange={(e) => handleChange('note', e.target.value)}
                placeholder="Ghi chú thêm"
                rows={3}
              />
            </div>
        <div className={styles.headerActions}>
          <button className={styles.secondaryBtn} onClick={() => navigate(`/booking-request-management/${encodeURIComponent(String(requestCodeParam || ''))}`)}>Hủy</button>
          <button
            className={styles.primaryBtn}
            onClick={handleSave}
            disabled={
              isSaving ||
              (!!form.desiredDate && (slotsLoading || !!slotsError))
            }
          >
            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
          </section>
        </div>

        <SchedulePanel
          dateLabel={form.desiredDate}
          pickedTime={form.desiredTime}
          slotData={booking.slotData}
          title="Lịch ngày"
          subtitlePrefix="Khung giờ đang chọn:"
        />
      </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, link, type, extraAction, full }) {
  const safeValue = value == null ? '' : String(value);
  const href = (() => {
    if (!link) return '';
    if (type === 'tel' && safeValue) return `tel:${safeValue}`;
    if (type === 'mailto' && safeValue) return `mailto:${safeValue}`;
    return '';
  })();

  let rendered;
  if (href) rendered = <a className={styles.link} href={href}>{safeValue}</a>;
  else if (link) rendered = <span className={styles.link}>{safeValue}</span>;
  else rendered = <span className={styles.value}>{safeValue}</span>;

  return (
    <div className={`${styles.infoBox} ${full ? styles.full : ''}`}>
      <div className={styles.label}>{label}</div>
      <div className={styles.infoRow}>
        {rendered}
        {extraAction}
      </div>
    </div>
  );
}
