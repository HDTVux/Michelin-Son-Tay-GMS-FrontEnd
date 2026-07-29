import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Bug, ImagePlus, Loader2, X } from 'lucide-react';

import {
  CATEGORY_LABELS,
  MODULE_LABELS,
  SEVERITY_LABELS,
  collectClientContext,
  getReporterToken,
  submitBugReport,
} from '../../services/bugReportService.js';
import { uploadImage } from '../../services/imageService.js';
import styles from './BugReport.module.css';

const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB — trùng giới hạn upload Cloudinary của dự án

const EMPTY_FORM = {
  title: '',
  description: '',
  category: 'BUG',
  severity: 'MEDIUM',
  module: '',
  reporterContact: '',
};

/**
 * Form báo lỗi phần mềm dùng chung cho cả nhân viên và khách hàng.
 * Ngữ cảnh kỹ thuật (URL, kích thước màn hình, trình duyệt, IP) do FE/BE tự
 * thu thập nên người dùng chỉ cần mô tả hiện tượng.
 */
export default function BugReportModal({ open, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [attachments, setAttachments] = useState([]); // [{ url, name }]
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // Reset form mỗi lần mở lại để không mang theo nội dung phiếu trước.
  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM);
      setAttachments([]);
      setError('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handlePickFiles = async (event) => {
    const files = [...(event.target.files || [])];
    event.target.value = '';
    if (files.length === 0) return;

    const room = MAX_ATTACHMENTS - attachments.length;
    if (room <= 0) {
      toast.warning(`Chỉ đính kèm tối đa ${MAX_ATTACHMENTS} ảnh.`, { containerId: 'app-toast' });
      return;
    }

    const accepted = files.slice(0, room).filter((file) => {
      if (!file.type.startsWith('image/')) {
        toast.warning(`"${file.name}" không phải ảnh nên đã bỏ qua.`, { containerId: 'app-toast' });
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.warning(`"${file.name}" vượt quá 5MB nên đã bỏ qua.`, { containerId: 'app-toast' });
        return false;
      }
      return true;
    });
    if (accepted.length === 0) return;

    setUploading(true);
    try {
      const token = getReporterToken();
      const uploaded = await Promise.all(
        accepted.map(async (file) => {
          const response = await uploadImage(file, token);
          const url = response?.data?.imageUrl || response?.imageUrl;
          if (!url) throw new Error(`Không lấy được đường dẫn ảnh "${file.name}"`);
          return { url, name: file.name };
        }),
      );
      setAttachments((prev) => [...prev, ...uploaded].slice(0, MAX_ATTACHMENTS));
    } catch (err) {
      toast.error(err?.message || 'Tải ảnh lên thất bại.', { containerId: 'app-toast' });
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (url) => setAttachments((prev) => prev.filter((item) => item.url !== url));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || uploading) return;

    const title = form.title.trim();
    const description = form.description.trim();
    if (!title) {
      setError('Vui lòng nhập tiêu đề lỗi.');
      return;
    }
    if (description.length < 10) {
      setError('Vui lòng mô tả chi tiết hơn (tối thiểu 10 ký tự) để đội kỹ thuật tái hiện được lỗi.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await submitBugReport({
        title,
        description,
        category: form.category,
        severity: form.severity,
        module: form.module || null,
        reporterContact: form.reporterContact.trim() || null,
        attachmentUrls: attachments.map((item) => item.url),
        ...collectClientContext(),
      });
      toast.success('Đã gửi báo lỗi. Cảm ơn bạn đã giúp cải thiện phần mềm!', { containerId: 'app-toast' });
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Gửi báo lỗi thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bug-report-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3 id="bug-report-title">
            <Bug size={18} /> Báo lỗi phần mềm
          </h3>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <p className={styles.hint}>
          Mô tả càng chi tiết, đội kỹ thuật càng sửa nhanh. Hệ thống tự ghi lại trang bạn đang mở và
          thông tin thiết bị nên bạn không cần khai báo.
          <span className={styles.mobileHint}> Mẹo: lắc nhẹ điện thoại để mở nhanh form này.</span>
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="bug-report-input-title">
              Tiêu đề <span className={styles.required}>*</span>
            </label>
            <input
              id="bug-report-input-title"
              type="text"
              maxLength={200}
              placeholder="VD: Không lưu được phiếu dịch vụ khi bấm Hoàn tất"
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="bug-report-input-description">
              Mô tả chi tiết / các bước tái hiện <span className={styles.required}>*</span>
            </label>
            <textarea
              id="bug-report-input-description"
              rows={5}
              maxLength={5000}
              placeholder={'VD:\n1. Mở phiếu dịch vụ PDV-0012\n2. Bấm nút Hoàn tất\n3. Màn hình quay vòng mãi, phiếu không đổi trạng thái'}
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
            />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="bug-report-input-category">Loại phản hồi</label>
              <select
                id="bug-report-input-category"
                value={form.category}
                onChange={(e) => setField('category', e.target.value)}
              >
                {Object.entries(CATEGORY_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="bug-report-input-severity">Mức độ ảnh hưởng</label>
              <select
                id="bug-report-input-severity"
                value={form.severity}
                onChange={(e) => setField('severity', e.target.value)}
              >
                {Object.entries(SEVERITY_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="bug-report-input-module">Phân hệ (nếu biết)</label>
              <select
                id="bug-report-input-module"
                value={form.module}
                onChange={(e) => setField('module', e.target.value)}
              >
                <option value="">Không xác định</option>
                {Object.entries(MODULE_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="bug-report-input-contact">Liên hệ lại (tuỳ chọn)</label>
              <input
                id="bug-report-input-contact"
                type="text"
                maxLength={100}
                placeholder="Số điện thoại hoặc email"
                value={form.reporterContact}
                onChange={(e) => setField('reporterContact', e.target.value)}
              />
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.label}>Ảnh chụp màn hình (tối đa {MAX_ATTACHMENTS} ảnh)</span>
            <div className={styles.attachmentRow}>
              {attachments.map((item) => (
                <div key={item.url} className={styles.thumb}>
                  <img src={item.url} alt={item.name} />
                  <button
                    type="button"
                    className={styles.thumbRemove}
                    onClick={() => removeAttachment(item.url)}
                    aria-label={`Xoá ảnh ${item.name}`}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              {attachments.length < MAX_ATTACHMENTS && (
                <button
                  type="button"
                  className={styles.addThumb}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 size={18} className={styles.spin} /> : <ImagePlus size={18} />}
                  <span>{uploading ? 'Đang tải...' : 'Thêm ảnh'}</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={handlePickFiles}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={submitting}>
              Huỷ
            </button>
            <button type="submit" className={styles.submitBtn} disabled={submitting || uploading}>
              {submitting ? 'Đang gửi...' : 'Gửi báo lỗi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
