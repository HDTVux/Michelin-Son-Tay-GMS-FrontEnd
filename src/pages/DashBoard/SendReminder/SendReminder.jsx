import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import styles from './SendReminder.module.css';

const NOW = new Date();

function daysAgo(days) {
  const d = new Date(NOW);
  d.setDate(d.getDate() - days);
  return d;
}

function monthsAgo(months) {
  const d = new Date(NOW);
  d.setMonth(d.getMonth() - months);
  return d;
}

function formatDate(date) {
  if (!date) return '-';
  try {
    return new Intl.DateTimeFormat('vi-VN').format(date);
  } catch {
    return String(date);
  }
}

function diffHours(a, b) {
  if (!a || !b) return Infinity;
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60);
}

function getSpamRiskLevel(lastRemindedAt) {
  if (!lastRemindedAt) return 'none';
  const hours = diffHours(NOW, lastRemindedAt);
  if (hours <= 24) return 'danger';
  if (hours <= 48) return 'warning';
  return 'none';
}

function getReminderStatusText(lastRemindedAt) {
  if (!lastRemindedAt) return 'Chưa nhắc';
  const hours = diffHours(NOW, lastRemindedAt);
  if (hours < 24) return `Đã nhắc ${Math.max(1, Math.floor(hours))}h trước`;
  const days = Math.floor(hours / 24);
  return `Đã nhắc ${Math.max(1, days)} ngày trước`;
}

function getMockCustomers() {
  return [
    {
      id: 'C001',
      name: 'Nguyễn Văn A',
      phone: '0912 345 678',
      licensePlate: '30A-123.45',
      lastMaintenanceAt: monthsAgo(7),
      lastService: 'Thay lốp',
      lastRemindedAt: daysAgo(1), // < 24h
    },
    {
      id: 'C002',
      name: 'Trần Thị B',
      phone: '0987 654 321',
      licensePlate: '88A-678.90',
      lastMaintenanceAt: monthsAgo(6),
      lastService: 'Cân mâm',
      lastRemindedAt: daysAgo(2), // ~48h
    },
    {
      id: 'C003',
      name: 'Phạm Văn C',
      phone: '0901 222 333',
      licensePlate: '29B-456.78',
      lastMaintenanceAt: monthsAgo(10),
      lastService: 'Đảo lốp',
      lastRemindedAt: null,
    },
    {
      id: 'C004',
      name: 'Lê Thị D',
      phone: '0933 111 999',
      licensePlate: '18C-222.11',
      lastMaintenanceAt: monthsAgo(5),
      lastService: 'Thay dầu',
      lastRemindedAt: daysAgo(5),
    },
    {
      id: 'C005',
      name: 'Hoàng Văn E',
      phone: '0977 888 666',
      licensePlate: '21A-909.09',
      lastMaintenanceAt: monthsAgo(12),
      lastService: 'Thay lốp',
      lastRemindedAt: null,
    },
  ];
}

function computeSendResult({ total, channel }) {
  const failed = total <= 0 ? 0 : Math.min(2, Math.floor(total * 0.04));
  const success = Math.max(0, total - failed);

  const byChannel = { zalo: 0, email: 0, sms: 0 };
  if (success <= 0) return { total, success, failed, byChannel };

  if (channel === 'auto') {
    const zalo = Math.round(success * 0.58);
    byChannel.zalo = Math.min(success, zalo);
    byChannel.email = Math.max(0, success - byChannel.zalo);
    return { total, success, failed, byChannel };
  }
  if (channel === 'email') {
    byChannel.email = success;
    return { total, success, failed, byChannel };
  }
  byChannel.sms = success;
  return { total, success, failed, byChannel };
}

function buildInitialSelection(list) {
  const next = new Set();
  for (const c of list) {
    const risk = getSpamRiskLevel(c.lastRemindedAt);
    if (risk === 'none') next.add(c.id);
  }
  return next;
}

function ResultModal({ open, onClose, result }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      onClose?.();
    };
    globalThis.addEventListener('keydown', onKeyDown);
    return () => globalThis.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const modal = (
    <div className={styles.modalOverlay}>
      <button type="button" className={styles.modalBackdrop} aria-label="Đóng" onClick={onClose} />
      <dialog
        open
        className={styles.modalContent}
        aria-modal="true"
        aria-labelledby="send-reminder-result-title"
        onCancel={(e) => {
          e.preventDefault();
          onClose?.();
        }}
      >
        <header className={styles.modalHeader}>
          <h3 id="send-reminder-result-title" className={styles.modalTitle}>
            Kết quả gửi nhắc
          </h3>
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </header>

        <div className={styles.modalBody}>
          <div className={styles.resultGrid}>
            <div className={styles.resultItem}>
              <div className={styles.resultLabel}>Tổng gửi</div>
              <div className={styles.resultValue}>{result?.total ?? 0}</div>
            </div>
            <div className={styles.resultItem}>
              <div className={styles.resultLabel}>Thành công</div>
              <div className={styles.resultValue}>{result?.success ?? 0}</div>
              <div className={styles.resultMeta}>
                {result?.byChannel?.zalo ? `${result.byChannel.zalo} Zalo` : null}
                {result?.byChannel?.zalo && result?.byChannel?.email ? ' • ' : null}
                {result?.byChannel?.email ? `${result.byChannel.email} Email` : null}
                {(result?.byChannel?.zalo || result?.byChannel?.email) && result?.byChannel?.sms ? ' • ' : null}
                {result?.byChannel?.sms ? `${result.byChannel.sms} SMS` : null}
              </div>
            </div>
            <div className={styles.resultItem}>
              <div className={styles.resultLabel}>Thất bại</div>
              <div className={styles.resultValue}>{result?.failed ?? 0}</div>
            </div>
          </div>
        </div>

        <div className="ui-actions ui-actions--end">
          <button type="button" className="ui-btn ui-btn--primary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </dialog>
    </div>
  );

  if (typeof document === 'undefined') return modal;
  return createPortal(modal, document.body);
}

ResultModal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  result: PropTypes.shape({
    total: PropTypes.number,
    success: PropTypes.number,
    failed: PropTypes.number,
    byChannel: PropTypes.shape({
      zalo: PropTypes.number,
      email: PropTypes.number,
      sms: PropTypes.number,
    }),
  }),
};

export default function SendReminder() {
  const [timeFilter, setTimeFilter] = useState('6m');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [channel, setChannel] = useState('auto');
  const [template, setTemplate] = useState('rotation');
  const [sendMode, setSendMode] = useState('now');
  const [scheduleDate, setScheduleDate] = useState('');
  const [testPhone, setTestPhone] = useState('');

  const allCustomers = useMemo(() => getMockCustomers(), []);
  const [filtered, setFiltered] = useState(() => allCustomers);
  const [selectedIds, setSelectedIds] = useState(() => buildInitialSelection(allCustomers));
  const [openResult, setOpenResult] = useState(false);
  const [result, setResult] = useState({ total: 0, success: 0, failed: 0, byChannel: { zalo: 0, email: 0, sms: 0 } });

  const services = useMemo(() => {
    const unique = new Set(allCustomers.map((c) => c.lastService).filter(Boolean));
    return ['all', ...Array.from(unique)];
  }, [allCustomers]);

  const eligibleCount = filtered.length;

  const autoExcludedCount = useMemo(() => {
    let count = 0;
    for (const c of filtered) {
      const risk = getSpamRiskLevel(c.lastRemindedAt);
      if (risk === 'warning' || risk === 'danger') {
        if (!selectedIds.has(c.id)) count += 1;
      }
    }
    return count;
  }, [filtered, selectedIds]);

  const selectedCount = selectedIds.size;

  const applyFilters = () => {
    const thresholdByTime = {
      '1m': monthsAgo(1),
      '3m': monthsAgo(3),
      '6m': monthsAgo(6),
      '9m': monthsAgo(9),
      '12m': monthsAgo(12),
    };
    const threshold = thresholdByTime[timeFilter] ?? monthsAgo(6);

    const next = allCustomers.filter((c) => {
      const timeOk = c.lastMaintenanceAt && c.lastMaintenanceAt <= threshold;
      const serviceOk = serviceFilter === 'all' ? true : c.lastService === serviceFilter;
      return Boolean(timeOk && serviceOk);
    });
    setFiltered(next);
    setSelectedIds(buildInitialSelection(next));
  };

  const templatePreview = useMemo(() => {
    const templates = {
      rotation: 'Chào {Tên KH}, đã ~6 tháng từ lần thay lốp gần nhất. Mời anh/chị ghé xưởng để đảo lốp/cân mâm giúp xe vận hành ổn định.',
      maintenance: 'Chào {Tên KH}, xe {Biển số} đến kỳ bảo dưỡng định kỳ. Anh/chị vui lòng đặt lịch để được phục vụ sớm nhất.',
    };
    return templates[template] ?? templates.maintenance;
  }, [template]);

  const handleToggle = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSendBulk = () => {
    const sendTotal = selectedIds.size;
    const nextResult = computeSendResult({ total: sendTotal, channel });
    setResult(nextResult);
    setOpenResult(true);
  };

  const handleSendTest = () => {
    const nextResult = computeSendResult({ total: 1, channel });
    setResult(nextResult);
    setOpenResult(true);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Gửi nhắc bảo dưỡng</h1>
      </header>

      <section className={`ui-card ${styles.card}`}>
        <div className={styles.filterRow}>
          <div className={styles.filterControls}>
            <select className={styles.filterSelect} value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} aria-label="Lọc khách hàng theo thời gian">
              <option value="1m">Lọc khách hàng theo thời gian: 1 tháng</option>
              <option value="3m">Lọc khách hàng theo thời gian: 3 tháng</option>
              <option value="6m">Lọc khách hàng theo thời gian: 6 tháng</option>
              <option value="9m">Lọc khách hàng theo thời gian: 9 tháng</option>
              <option value="12m">Lọc khách hàng theo thời gian: 12 tháng</option>
            </select>

            <select className={styles.filterSelect} value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} aria-label="Lọc theo dịch vụ đã làm">
              <option value="all">Dịch vụ đã làm: Tất cả</option>
              {services
                .filter((s) => s !== 'all')
                .map((s) => (
                  <option key={s} value={s}>
                    Dịch vụ đã làm: {s}
                  </option>
                ))}
            </select>
          </div>

          <div className={styles.filterMeta}>
            <button type="button" className="ui-btn" onClick={applyFilters}>
              Lọc
            </button>
            <div className={styles.eligibleText}>{eligibleCount} khách hàng đủ điều kiện</div>
          </div>
        </div>

        {eligibleCount > 0 ? (
          <div className={styles.tableCard}>
            <div className={styles.tableTopMeta}>
              <div className={styles.excludedText}>
                Đã loại bỏ <b>{autoExcludedCount}</b> khách hàng để tránh Spam
              </div>
              <div className={styles.selectedText}>
                Đang chọn: <b>{selectedCount}</b>
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.thCheck}>Chọn</th>
                    <th className={styles.thName}>Khách hàng</th>
                    <th>Biển số</th>
                    <th>Số điện thoại</th>
                    <th>Ngày bảo dưỡng cuối</th>
                    <th>Dịch vụ gần nhất</th>
                    <th>Trạng thái nhắc</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const risk = getSpamRiskLevel(c.lastRemindedAt);
                    const checked = selectedIds.has(c.id);
                    return (
                      <tr key={c.id} className={risk === 'none' ? '' : styles.rowSpamRisk}>
                      <td className={styles.tdCheck}>
                        <input type="checkbox" checked={checked} onChange={() => handleToggle(c.id)} aria-label={`Chọn ${c.name}`} />
                      </td>
                      <td className={styles.tdName}>
                        <div className={styles.nameCell}>
                          <div className={styles.nameMain}>{c.name}</div>
                        </div>
                      </td>
                      <td className={styles.tdMono}>{c.licensePlate}</td>
                      <td className={styles.tdMono}>{c.phone}</td>
                      <td>{formatDate(c.lastMaintenanceAt)}</td>
                      <td>{c.lastService || '-'}</td>
                      <td>
                        <div className={styles.statusCell}>
                          <span className={styles.statusText}>{getReminderStatusText(c.lastRemindedAt)}</span>
                          {risk === 'none' ? null : (
                            <span className={`${styles.badge} ${risk === 'danger' ? styles.badgeDanger : styles.badgeWarning}`}>
                              Rủi ro Spam 
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>Không tìm thấy KH</div>
        )}

        <div className={styles.formGrid}>
          <div className={styles.left}>
            <div className={styles.section}>
              <div className={styles.radioGroup}>
                <label className={styles.radioItem}>
                  <input type="radio" name="channel" value="auto" checked={channel === 'auto'} onChange={(e) => setChannel(e.target.value)} />
                  <span>Zalo (Mặc định)</span>
                </label>
                <label className={styles.radioItem}>
                  <input type="radio" name="channel" value="email" checked={channel === 'email'} onChange={(e) => setChannel(e.target.value)} />
                  <span>Email</span>
                </label>
                <label className={styles.radioItem}>
                  <input type="radio" name="channel" value="sms" checked={channel === 'sms'} onChange={(e) => setChannel(e.target.value)} />
                  <span>SMS</span>
                </label>
              </div>
            </div>

            <div className="ui-field">
              <label htmlFor="send-reminder-template">Chọn mẫu tin nhắn</label>
              <select id="send-reminder-template" value={template} onChange={(e) => setTemplate(e.target.value)}>
                <option value="rotation">Đảo lốp / cân mâm (gợi ý)</option>
                <option value="maintenance">Bảo dưỡng định kỳ</option>
              </select>
            </div>

            <div className={styles.preview}>
              <div className={styles.previewTitle}>
                Xem trước nội dung với  <span className={styles.previewHint}>Tên KH, Biển số</span>
              </div>
              <div className={styles.previewBox}>{templatePreview}</div>
            </div>
          </div>

          <div className={styles.right}>
            <div className={styles.section}>
              <div className={styles.radioGroup}>
                <label className={styles.radioItem}>
                  <input type="radio" name="sendMode" value="now" checked={sendMode === 'now'} onChange={(e) => setSendMode(e.target.value)} />
                  <span>Gửi ngay</span>
                </label>
                <label className={styles.radioItemInline}>
                  <input type="radio" name="sendMode" value="schedule" checked={sendMode === 'schedule'} onChange={(e) => setSendMode(e.target.value)} />
                  <span>Lên lịch</span>
                  <input
                    type="date"
                    className={styles.dateInput}
                    disabled={sendMode !== 'schedule'}
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    aria-label="Chọn ngày lên lịch"
                  />
                </label>
              </div>
            </div>

            <div className={styles.testRow}>
              <button type="button" className="ui-btn" disabled={!testPhone.trim()} onClick={handleSendTest}>
                Gửi thử
              </button>
              <input
                type="text"
                className={styles.testInput}
                placeholder="Số điện thoại"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="ui-actions ui-actions--end">
          <button
            type="button"
            className="ui-btn ui-btn--ghost"
            onClick={() => {
              setTimeFilter('6m');
              setServiceFilter('all');
              setFiltered(allCustomers);
              setSelectedIds(buildInitialSelection(allCustomers));
            }}
          >
            Hủy
          </button>
          <button type="button" className="ui-btn ui-btn--primary" onClick={handleSendBulk} disabled={selectedIds.size === 0}>
            Gửi hàng loạt
          </button>
        </div>
      </section>

      <ResultModal
        open={openResult}
        onClose={() => setOpenResult(false)}
        result={result}
      />
    </div>
  );
}