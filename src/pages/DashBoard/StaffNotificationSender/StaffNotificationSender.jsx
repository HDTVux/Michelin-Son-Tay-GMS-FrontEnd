import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { fetchAllStaff } from '../../../services/adminService.js';
import { createStaffNotification } from '../../../services/staffNotificationService.js';
import styles from './StaffNotificationSender.module.css';

const getToken = () =>
  localStorage.getItem('authToken') || localStorage.getItem('staffToken') || localStorage.getItem('adminToken') || '';

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

const unwrapStaffRows = (response) => {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

const getStaffName = (staff) =>
  staff?.fullName || staff?.staffName || staff?.name || `NV-${staff?.staffId ?? staff?.id ?? ''}`;

export default function StaffNotificationSender() {
  const [sendMode, setSendMode] = useState('all');
  const [staffId, setStaffId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [notificationType, setNotificationType] = useState('INFO');
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [sending, setSending] = useState(false);

  const selectedStaff = useMemo(() => {
    const id = Number(staffId);
    if (!Number.isFinite(id) || id <= 0) return null;
    return staffList.find((staff) => Number(staff?.staffId ?? staff?.id) === id) || null;
  }, [staffId, staffList]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    let cancelled = false;
    setStaffLoading(true);
    setStaffError('');

    fetchAllStaff({ page: 0, size: 500 }, token)
      .then((response) => {
        if (cancelled) return;
        setStaffList(unwrapStaffRows(response));
      })
      .catch((err) => {
        if (cancelled) return;
        setStaffError(err?.message || 'Không tải được danh sách nhân viên.');
        setStaffList([]);
      })
      .finally(() => {
        if (!cancelled) setStaffLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const cleanTitle = title.trim();
    const cleanMessage = message.trim();
    const targetStaffId = sendMode === 'all' ? null : Number(staffId);

    if (!cleanTitle) {
      toast.error('Vui lòng nhập tiêu đề thông báo.');
      return;
    }

    if (!cleanMessage) {
      toast.error('Vui lòng nhập nội dung thông báo.');
      return;
    }

    if (sendMode === 'staff' && (!Number.isFinite(targetStaffId) || targetStaffId <= 0)) {
      toast.error('Vui lòng chọn hoặc nhập Staff ID hợp lệ.');
      return;
    }

    setSending(true);
    try {
      await createStaffNotification({
        staffId: targetStaffId,
        title: cleanTitle,
        message: cleanMessage,
        notificationType,
        isRead: false,
        sentBy: readCurrentStaffId(),
      });

      toast.success(sendMode === 'all' ? 'Đã gửi thông báo chung.' : 'Đã gửi thông báo cho nhân viên.');
      setTitle('');
      setMessage('');
      if (sendMode === 'staff') setStaffId('');
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
      </header>

      <main className={styles.grid}>
        <form className={styles.panel} onSubmit={handleSubmit}>
          <section className={styles.section}>
            <h2>Người nhận</h2>
            <div className={styles.segmented}>
              <button
                type="button"
                className={sendMode === 'all' ? styles.active : ''}
                onClick={() => setSendMode('all')}
              >
                Tất cả nhân viên
              </button>
              <button
                type="button"
                className={sendMode === 'staff' ? styles.active : ''}
                onClick={() => setSendMode('staff')}
              >
                Một nhân viên
              </button>
            </div>

            {sendMode === 'staff' && (
              <div className={styles.targetGrid}>
                <label>
                  Chọn nhân viên
                  <select value={staffId} onChange={(event) => setStaffId(event.target.value)}>
                    <option value="">Chọn từ danh sách</option>
                    {staffList.map((staff) => {
                      const id = staff?.staffId ?? staff?.id;
                      if (!id) return null;
                      return (
                        <option key={id} value={id}>
                          {getStaffName(staff)} - ID {id}
                        </option>
                      );
                    })}
                  </select>
                </label>
                <label>
                  Hoặc nhập Staff ID
                  <input
                    type="number"
                    min="1"
                    value={staffId}
                    onChange={(event) => setStaffId(event.target.value)}
                    placeholder="Ví dụ: 5"
                  />
                </label>
              </div>
            )}

            {staffLoading && <p className={styles.hint}>Đang tải danh sách nhân viên...</p>}
            {staffError && <p className={styles.warning}>{staffError}</p>}
          </section>

          <section className={styles.section}>
            <h2>Nội dung</h2>
            <label>
              Loại thông báo
              <select value={notificationType} onChange={(event) => setNotificationType(event.target.value)}>
                <option value="INFO">Thông tin</option>
                <option value="WARNING">Cảnh báo</option>
                <option value="URGENT">Khẩn cấp</option>
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
                rows={7}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Nhập nội dung cần gửi đến nhân viên..."
              />
            </label>
          </section>

          <div className={styles.actions}>
            <button type="button" className={styles.secondaryButton} onClick={() => {
              setTitle('');
              setMessage('');
              setStaffId('');
              setNotificationType('INFO');
            }}>
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
              {notificationType}
            </span>
            <span>{sendMode === 'all' ? 'Thông báo chung' : selectedStaff ? getStaffName(selectedStaff) : 'Thông báo riêng'}</span>
          </div>
          <h2>{title.trim() || 'Tiêu đề thông báo'}</h2>
          <p>{message.trim() || 'Nội dung thông báo sẽ hiển thị ở đây trước khi gửi.'}</p>
        </aside>
      </main>
    </div>
  );
}
