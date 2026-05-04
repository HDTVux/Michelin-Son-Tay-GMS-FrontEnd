import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { fetchAllStaff } from '../../../services/adminService.js';
import { createStaffNotification } from '../../../services/staffNotificationService.js';
import styles from './StaffNotificationSender.module.css';

const RECIPIENT_MODE = {
  ALL: 'ALL',
  STAFF: 'STAFF',
};

const NOTIFICATION_TYPES = [
  { value: 'INFO', label: 'Thông tin' },
  { value: 'WARNING', label: 'Cảnh báo' },
  { value: 'URGENT', label: 'Khẩn cấp' },
];

const getAuthToken = () =>
  localStorage.getItem('authToken') || localStorage.getItem('adminToken') || localStorage.getItem('staffToken') || '';

const readCurrentStaffId = () => {
  try {
    const raw = localStorage.getItem('staffProfile');
    const profile = raw ? JSON.parse(raw) : null;
    const id = Number(profile?.staffId ?? profile?.id);
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
};

const normalizeStaffStatus = (value) => {
  const raw = value == null ? '' : String(value).trim().toUpperCase();
  if (raw === 'ACTIVE' || raw === 'INACTIVE' || raw === 'LOCKED' || raw === 'DELETED') return raw;
  return raw;
};

const resolveStaffStatus = (staff) =>
  staff?.status ??
  staff?.authStatus ??
  staff?.staffAuthStatus ??
  staff?.accountStatus ??
  staff?.userStatus ??
  staff?.staffAuth?.status;

const resolveStaffId = (staff) => {
  const id = Number(staff?.staffId ?? staff?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
};

const resolveStaffName = (staff) => {
  const name = staff?.fullName || staff?.name || staff?.email || staff?.phone || '';
  return String(name).trim() || 'Nhân viên';
};

const getRoleText = (staff) => {
  if (!Array.isArray(staff?.roles) || staff.roles.length === 0) return staff?.position || '';

  return staff.roles
    .map((role) => role?.roleName || role?.roleCode || '')
    .map((value) => String(value).trim())
    .filter(Boolean)
    .join(', ');
};

const normalizeStaffItems = (response) => {
  const source =
    response?.data?.content ??
    response?.data?.items ??
    response?.data ??
    response?.content ??
    response?.items ??
    response;

  if (!Array.isArray(source)) return [];

  const seen = new Set();
  return source
    .map((staff) => {
      const id = resolveStaffId(staff);
      return id ? { ...staff, staffId: id } : null;
    })
    .filter(Boolean)
    .filter((staff) => normalizeStaffStatus(resolveStaffStatus(staff)) !== 'DELETED')
    .filter((staff) => {
      if (seen.has(staff.staffId)) return false;
      seen.add(staff.staffId);
      return true;
    })
    .sort((a, b) => resolveStaffName(a).localeCompare(resolveStaffName(b), 'vi'));
};

export default function StaffNotificationSender() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [notificationType, setNotificationType] = useState('INFO');
  const [recipientMode, setRecipientMode] = useState(RECIPIENT_MODE.ALL);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let ignore = false;

    const loadStaff = async () => {
      const token = getAuthToken();
      if (!token) {
        setStaffList([]);
        setStaffError('Vui lòng đăng nhập để tải danh sách nhân viên.');
        return;
      }

      setStaffLoading(true);
      setStaffError('');

      try {
        const response = await fetchAllStaff({ page: 0, size: 300, status: 'ACTIVE' }, token);
        if (ignore) return;
        const items = normalizeStaffItems(response);
        setStaffList(items);
        if (items.length === 0) setStaffError('Chưa có nhân viên phù hợp để chọn.');
      } catch (err) {
        if (ignore) return;
        setStaffList([]);
        setStaffError(err?.message || 'Không tải được danh sách nhân viên.');
      } finally {
        if (!ignore) setStaffLoading(false);
      }
    };

    loadStaff();

    return () => {
      ignore = true;
    };
  }, []);

  const filteredStaffList = useMemo(() => {
    const keyword = staffSearch.trim().toLowerCase();
    if (!keyword) return staffList;

    return staffList.filter((staff) => {
      const haystack = [
        resolveStaffName(staff),
        staff?.email,
        staff?.phone,
        staff?.phoneNumber,
        getRoleText(staff),
        staff?.employeeNo,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [staffList, staffSearch]);

  const selectedStaff = useMemo(() => {
    const id = Number(selectedStaffId);
    if (!Number.isFinite(id) || id <= 0) return null;
    return staffList.find((staff) => staff.staffId === id) || null;
  }, [selectedStaffId, staffList]);

  const selectedTypeLabel =
    NOTIFICATION_TYPES.find((type) => type.value === notificationType)?.label || notificationType;
  const previewRecipient =
    recipientMode === RECIPIENT_MODE.STAFF
      ? selectedStaff
        ? resolveStaffName(selectedStaff)
        : 'Chưa chọn nhân viên'
      : 'Tất cả nhân viên';

  const handleReset = () => {
    setTitle('');
    setMessage('');
    setNotificationType('INFO');
    setRecipientMode(RECIPIENT_MODE.ALL);
    setSelectedStaffId('');
    setStaffSearch('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const cleanTitle = title.trim();
    const cleanMessage = message.trim();
    const privateStaffId = Number(selectedStaffId);

    if (!cleanTitle) {
      toast.error('Vui lòng nhập tiêu đề thông báo.');
      return;
    }

    if (!cleanMessage) {
      toast.error('Vui lòng nhập nội dung thông báo.');
      return;
    }

    if (recipientMode === RECIPIENT_MODE.STAFF && (!Number.isFinite(privateStaffId) || privateStaffId <= 0)) {
      toast.error('Vui lòng chọn nhân viên nhận thông báo riêng.');
      return;
    }

    setSending(true);
    try {
      await createStaffNotification({
        staffId: recipientMode === RECIPIENT_MODE.STAFF ? privateStaffId : null,
        title: cleanTitle,
        message: cleanMessage,
        notificationType,
        isRead: false,
        sentBy: readCurrentStaffId(),
      });

      toast.success(
        recipientMode === RECIPIENT_MODE.STAFF
          ? `Đã gửi thông báo riêng cho ${resolveStaffName(selectedStaff)}.`
          : 'Đã gửi thông báo chung.',
      );
      setTitle('');
      setMessage('');
    } catch (err) {
      toast.error(err?.message || 'Không gửi được thông báo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Thông báo nội bộ</p>
          <h1>Thông báo cho nhân viên</h1>
        </div>
        <div className={styles.headerStats}>
          <span>{staffList.length} nhân viên</span>
        </div>
      </header>

      <main className={styles.grid}>
        <form className={styles.panel} onSubmit={handleSubmit}>
          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <h2>Người nhận</h2>
              <span>{recipientMode === RECIPIENT_MODE.STAFF ? 'Gửi riêng' : 'Gửi chung'}</span>
            </div>

            <div className={styles.segmentedControl} role="radiogroup" aria-label="Phạm vi nhận thông báo">
              <label className={recipientMode === RECIPIENT_MODE.ALL ? styles.activeSegment : ''}>
                <input
                  type="radio"
                  name="recipientMode"
                  value={RECIPIENT_MODE.ALL}
                  checked={recipientMode === RECIPIENT_MODE.ALL}
                  onChange={() => setRecipientMode(RECIPIENT_MODE.ALL)}
                />
                Tất cả nhân viên
              </label>
              <label className={recipientMode === RECIPIENT_MODE.STAFF ? styles.activeSegment : ''}>
                <input
                  type="radio"
                  name="recipientMode"
                  value={RECIPIENT_MODE.STAFF}
                  checked={recipientMode === RECIPIENT_MODE.STAFF}
                  onChange={() => setRecipientMode(RECIPIENT_MODE.STAFF)}
                />
                Một nhân viên
              </label>
            </div>

            {recipientMode === RECIPIENT_MODE.STAFF ? (
              <div className={styles.staffPicker}>
                <label>
                  Tìm nhân viên
                  <input
                    value={staffSearch}
                    onChange={(event) => setStaffSearch(event.target.value)}
                    placeholder="Nhập tên, email, SĐT hoặc vai trò"
                  />
                </label>
                <label>
                  Nhân viên nhận
                  <select
                    value={selectedStaffId}
                    onChange={(event) => setSelectedStaffId(event.target.value)}
                    disabled={staffLoading || staffList.length === 0}
                  >
                    <option value="">
                      {staffLoading ? 'Đang tải danh sách...' : 'Chọn nhân viên'}
                    </option>
                    {filteredStaffList.map((staff) => (
                      <option key={staff.staffId} value={String(staff.staffId)}>
                        {resolveStaffName(staff)}
                        {getRoleText(staff) ? ` - ${getRoleText(staff)}` : ''}
                        {staff.email ? ` - ${staff.email}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                {staffError && <p className={styles.alertWarning}>{staffError}</p>}
              </div>
            ) : (
              <div className={styles.recipientBox}>Tất cả nhân viên</div>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <h2>Nội dung</h2>
              <span>{selectedTypeLabel}</span>
            </div>
            <label>
              Loại thông báo
              <select value={notificationType} onChange={(event) => setNotificationType(event.target.value)}>
                {NOTIFICATION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tiêu đề
              <input
                value={title}
                maxLength={200}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ví dụ: Lịch họp đầu ca"
              />
            </label>
            <label>
              Nội dung thông báo
              <textarea
                value={message}
                rows={9}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Nhập nội dung cần gửi đến nhân viên..."
              />
            </label>
          </section>

          <div className={styles.actions}>
            <button type="button" className={styles.secondaryButton} onClick={handleReset}>
              Làm mới
            </button>
            <button type="submit" className={styles.primaryButton} disabled={sending}>
              {sending ? 'Đang gửi...' : 'Gửi thông báo'}
            </button>
          </div>
        </form>

        <aside className={styles.preview}>
          <div className={styles.previewHeader}>
            <span className={`${styles.typeBadge} ${styles[notificationType.toLowerCase()]}`}>
              {selectedTypeLabel}
            </span>
            <span>{recipientMode === RECIPIENT_MODE.STAFF ? 'Thông báo riêng' : 'Thông báo chung'}</span>
          </div>
          <div className={styles.previewRecipient}>
            <span>Người nhận</span>
            <strong>{previewRecipient}</strong>
          </div>
          <h2>{title.trim() || 'Tiêu đề thông báo'}</h2>
          <p>{message.trim() || 'Nội dung thông báo sẽ hiển thị ở đây trước khi gửi.'}</p>
        </aside>
      </main>
    </div>
  );
}
