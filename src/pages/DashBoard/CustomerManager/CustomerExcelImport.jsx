import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { createCustomer } from '../../../services/adminService.js';
import styles from './CustomerExcelImport.module.css';

// Helper to format/parse dates (dd/mm/yyyy -> yyyy-mm-dd)
const parseExcelDate = (val) => {
  if (!val) return '';
  const str = String(val).trim();
  if (!str) return '';

  // Check if standard yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Check if dd/mm/yyyy
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  return str;
};

// Gender mapping helpers
const mapGenderToEnum = (genderText) => {
  const clean = String(genderText || '').trim().toLowerCase();
  if (clean === 'nam') return 'MALE';
  if (clean === 'nữ' || clean === 'nu') return 'FEMALE';
  if (clean === 'khác' || clean === 'khac') return 'OTHER';
  return '';
};

const mapGenderToText = (genderEnum) => {
  if (genderEnum === 'MALE') return 'Nam';
  if (genderEnum === 'FEMALE') return 'Nữ';
  if (genderEnum === 'OTHER') return 'Khác';
  return genderEnum || '';
};

// Customer type mapping helpers
const mapTypeToEnum = (typeText) => {
  const clean = String(typeText || '').trim().toLowerCase();
  if (clean === 'khách lẻ' || clean === 'khach le' || clean === 'individual' || !clean) return 'INDIVIDUAL';
  if (clean === 'đại lý' || clean === 'dai ly' || clean === 'dealer') return 'DEALER';
  if (clean === 'garage khác' || clean === 'garage khac' || clean === 'garage') return 'GARAGE';
  return 'INDIVIDUAL';
};

const mapTypeToText = (typeEnum) => {
  if (typeEnum === 'INDIVIDUAL') return 'Khách lẻ';
  if (typeEnum === 'DEALER') return 'Đại lý';
  if (typeEnum === 'GARAGE') return 'Garage khác';
  return typeEnum || 'Khách lẻ';
};

export default function CustomerExcelImport() {
  useScrollToTop();
  const navigate = useNavigate();

  const fileInputRef = useRef(null);

  const [originalFile, setOriginalFile] = useState(null);
  const [items, setItems] = useState([]);
  const [hasEdits, setHasEdits] = useState(false);
  const [error, setError] = useState('');

  // Search & Edit Preview
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRowId, setEditingRowId] = useState(null);
  const [editValues, setEditValues] = useState({});

  // Importing execution states
  const [isImporting, setIsImporting] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [failedList, setFailedList] = useState([]); // List of { fullName, phone, reason }
  const [importCompleted, setImportCompleted] = useState(false);

  const handleDownloadTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();
      const headers = [
        'STT',
        'Họ và tên (*)',
        'Số điện thoại (*)',
        'Email (*)',
        'Giới tính (*)',
        'Ngày sinh (yyyy-mm-dd hoặc dd/mm/yyyy)',
        'Loại khách hàng (Khách lẻ / Đại lý / Garage khác)',
        'Mã PIN (6 chữ số)',
      ];

      const sampleRows = [
        headers,
        [
          1,
          'Nguyễn Văn A',
          '0987654321',
          'nguyenvana@gmail.com',
          'Nam',
          '1990-01-15',
          'Khách lẻ',
          '111111',
        ],
        [
          2,
          'Trần Thị B',
          '0912345678',
          'tranthib@gmail.com',
          'Nữ',
          '25/12/1995',
          'Đại lý',
          '123456',
        ],
      ];

      const ws = XLSX.utils.aoa_to_sheet(sampleRows);
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = globalThis.URL.createObjectURL(blob);
      
      const a = globalThis.document.createElement('a');
      a.href = url;
      a.download = 'import-khach-hang-mau.xlsx';
      globalThis.document.body.appendChild(a);
      a.click();
      a.remove();
      globalThis.URL.revokeObjectURL(url);
      
      toast.success('Tải file mẫu Excel thành công.');
    } catch (err) {
      toast.error('Không thể tải mẫu Excel.');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    if (fileInputRef.current) fileInputRef.current.value = '';

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to 2D array
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        // Find header row (contains 'họ' or 'tên' and 'điện thoại' or 'sđt')
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(rawRows.length, 12); i++) {
          const row = rawRows[i];
          if (
            row.some((cell) => String(cell).toLowerCase().includes('họ') || String(cell).toLowerCase().includes('tên')) &&
            row.some((cell) => String(cell).toLowerCase().includes('thoại') || String(cell).toLowerCase().includes('sđt') || String(cell).toLowerCase().includes('sdt'))
          ) {
            headerRowIndex = i;
            break;
          }
        }

        const startIdx = headerRowIndex !== -1 ? headerRowIndex + 1 : 1;
        const parsed = [];

        for (let i = startIdx; i < rawRows.length; i++) {
          const row = rawRows[i];
          const fullName = String(row[1] ?? '').trim();
          const phone = String(row[2] ?? '').replace(/\s+/g, '').trim();
          const email = String(row[3] ?? '').trim();

          if (!fullName && !phone && !email) continue; // Skip empty rows

          const genderText = String(row[4] ?? '').trim();
          const dobText = String(row[5] ?? '').trim();
          const typeText = String(row[6] ?? '').trim();
          const pinText = String(row[7] ?? '').trim();

          parsed.push({
            id: i, // Local unique identifier
            stt: parsed.length + 1,
            fullName,
            phone,
            email,
            gender: mapGenderToEnum(genderText),
            dob: parseExcelDate(dobText),
            customerType: mapTypeToEnum(typeText),
            pin: pinText || '111111',
          });
        }

        setItems(parsed);
        setOriginalFile(file);
        setHasEdits(false);
        setEditingRowId(null);
        setError('');
        toast.success(`Đọc thành công ${parsed.length} khách hàng từ file Excel!`);
      } catch (err) {
        console.error(err);
        setError('Không thể đọc file Excel. Vui lòng kiểm tra lại định dạng file hoặc tải file mẫu.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0] || null;
    if (file) {
      const isExcel = /\.(xlsx|xls)$/i.test(file.name);
      if (!isExcel) {
        setError('Chỉ chấp nhận file Excel (.xlsx, .xls).');
        return;
      }
      
      const fileEvent = { target: { files: [file] } };
      handleFileChange(fileEvent);
    }
  };

  const handleDeleteRow = (id) => {
    setItems((prev) => prev.filter((row) => row.id !== id));
    setHasEdits(true);
    toast.info('Đã xóa khách hàng khỏi danh sách.');
  };

  const startEditRow = (row) => {
    setEditingRowId(row.id);
    setEditValues({ ...row });
  };

  const handleEditChange = (field, val) => {
    setEditValues((prev) => ({
      ...prev,
      [field]: val,
    }));
  };

  const saveEditRow = () => {
    setItems((prev) =>
      prev.map((row) => {
        if (row.id === editingRowId) {
          return {
            ...editValues,
            dob: parseExcelDate(editValues.dob),
          };
        }
        return row;
      })
    );
    setEditingRowId(null);
    setHasEdits(true);
    toast.success('Cập nhật thông tin thành công.');
  };

  const cancelEditRow = () => {
    setEditingRowId(null);
  };

  // Real-time Data Integrity & Duplicate Check
  const validatedItems = useMemo(() => {
    return items.map((item) => {
      const errors = [];
      if (!item.fullName.trim()) {
        errors.push('Họ tên không được rỗng');
      }
      if (!item.phone.trim()) {
        errors.push('Số điện thoại không được rỗng');
      } else if (!/^\d{10}$/.test(item.phone)) {
        errors.push('SĐT phải gồm đúng 10 chữ số');
      }
      if (!item.email.trim()) {
        errors.push('Email không được rỗng');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email)) {
        errors.push('Định dạng email không hợp lệ');
      }
      if (!item.gender) {
        errors.push('Giới tính bắt buộc chọn (Nam/Nữ/Khác)');
      }
      if (item.pin && !/^\d{6}$/.test(item.pin)) {
        errors.push('Mã PIN nếu nhập phải có 6 chữ số');
      }
      if (item.dob && !/^\d{4}-\d{2}-\d{2}$/.test(item.dob)) {
        errors.push('Ngày sinh không đúng định dạng YYYY-MM-DD');
      }

      // Duplicate Check in the same sheet
      if (item.phone) {
        const samePhone = items.filter(
          (x) => x.id !== item.id && x.phone && x.phone.trim() === item.phone.trim()
        );
        if (samePhone.length > 0) {
          errors.push(`Số điện thoại trùng lặp với dòng khác`);
        }
      }
      if (item.email) {
        const sameEmail = items.filter(
          (x) => x.id !== item.id && x.email && x.email.trim().toLowerCase() === item.email.trim().toLowerCase()
        );
        if (sameEmail.length > 0) {
          errors.push(`Email trùng lặp với dòng khác`);
        }
      }

      return {
        ...item,
        errors,
      };
    });
  }, [items]);

  const hasErrors = useMemo(() => {
    return validatedItems.some((row) => row.errors.length > 0);
  }, [validatedItems]);

  const handleConfirmSync = async () => {
    if (items.length === 0) {
      setError('Danh sách khách hàng rỗng.');
      return;
    }

    if (hasErrors) {
      setError('Có dòng chứa dữ liệu không hợp lệ hoặc bị trùng lặp. Vui lòng sửa lại các dòng lỗi.');
      return;
    }

    const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
    if (!token) {
      setError('Vui lòng đăng nhập lại để thực hiện thao tác.');
      return;
    }

    setIsImporting(true);
    setProcessedCount(0);
    setSuccessCount(0);
    setFailedCount(0);
    setFailedList([]);
    setImportCompleted(false);

    // Call API sequentially for each customer
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const payload = {
        fullName: item.fullName,
        phone: item.phone,
        email: item.email,
        pin: item.pin || '111111',
        gender: item.gender,
        dob: item.dob || null,
        avatar: '',
        customerType: item.customerType || 'INDIVIDUAL',
      };

      try {
        const res = await createCustomer(payload, token);
        if (res?.success) {
          setSuccessCount((prev) => prev + 1);
        } else {
          setFailedCount((prev) => prev + 1);
          setFailedList((prev) => [
            ...prev,
            { fullName: item.fullName, phone: item.phone, reason: res?.message || 'Không thể tạo' },
          ]);
        }
      } catch (err) {
        setFailedCount((prev) => prev + 1);
        setFailedList((prev) => [
          ...prev,
          { fullName: item.fullName, phone: item.phone, reason: err?.message || 'Số điện thoại hoặc Email đã tồn tại' },
        ]);
      } finally {
        setProcessedCount((prev) => prev + 1);
      }
    }

    setImportCompleted(true);
  };

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return validatedItems;
    const term = searchTerm.toLowerCase();
    return validatedItems.filter(
      (item) =>
        item.fullName.toLowerCase().includes(term) ||
        item.phone.toLowerCase().includes(term) ||
        item.email.toLowerCase().includes(term)
    );
  }, [validatedItems, searchTerm]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <button className={styles.backBtn} onClick={() => navigate('/customer-manager')} disabled={isImporting && !importCompleted}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1>Nhập khách hàng từ Excel</h1>
            <p>Tải lên danh sách khách hàng để tạo tài khoản đồng loạt</p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.ghostBtn}
            onClick={handleDownloadTemplate}
            disabled={isImporting}
          >
            Tải Excel mẫu
          </button>
        </div>
      </div>

      {error && <div className={styles.errorAlert}>{error}</div>}

      {/* Progress View */}
      {isImporting ? (
        <div className={styles.progressOverlay}>
          <h2>{importCompleted ? 'Hoàn tất quá trình nhập' : 'Đang xử lý dữ liệu...'}</h2>
          <p>
            {importCompleted
              ? `Đã xử lý xong toàn bộ ${items.length} khách hàng.`
              : `Đang tạo tài khoản khách hàng: ${processedCount} / ${items.length}`}
          </p>

          <div className={styles.progressBarContainer}>
            <div
              className={styles.progressBar}
              style={{ width: `${(processedCount / items.length) * 100}%` }}
            />
          </div>

          <div className={styles.progressStats}>
            <div>
              <div className={styles.progressStatVal}>{processedCount}</div>
              <div className={styles.progressStatLabel}>Đã xử lý</div>
            </div>
            <div>
              <div className={`${styles.progressStatVal} ${styles.progressStatValSuccess}`}>
                {successCount}
              </div>
              <div className={styles.progressStatLabel}>Thành công</div>
            </div>
            <div>
              <div className={`${styles.progressStatVal} ${styles.progressStatValFailed}`}>
                {failedCount}
              </div>
              <div className={styles.progressStatLabel}>Thất bại</div>
            </div>
          </div>

          {failedList.length > 0 && (
            <div className={styles.failedListWrapper}>
              <h4>Danh sách tài khoản lỗi ({failedList.length})</h4>
              {failedList.map((item, idx) => (
                <div key={idx} className={styles.failedItem}>
                  <span>
                    <strong>{item.fullName}</strong> ({item.phone})
                  </span>
                  <span className={styles.failedItemReason}>{item.reason}</span>
                </div>
              ))}
            </div>
          )}

          {importCompleted && (
            <div className={styles.submitActions} style={{ justifyContent: 'center', marginTop: '24px' }}>
              {failedCount > 0 && (
                <button
                  type="button"
                  className={styles.ghostBtn}
                  onClick={() => {
                    setIsImporting(false);
                    setImportCompleted(false);
                    // Filter items to keep only failed ones so the user can fix and retry
                    const failedPhones = new Set(failedList.map((x) => x.phone));
                    setItems((prev) => prev.filter((x) => failedPhones.has(x.phone)));
                    setHasEdits(true);
                  }}
                >
                  Sửa các dòng lỗi
                </button>
              )}
              <button
                type="button"
                className={styles.confirmBtn}
                onClick={() => navigate('/customer-manager')}
              >
                Hoàn tất
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Upload / Edit View */
        <>
          {items.length === 0 ? (
            <div
              className={styles.dropZone}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <svg className={styles.uploadIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h3>Kéo thả file Excel vào đây</h3>
              <p>hoặc nhấn để chọn file (.xlsx, .xls) từ máy tính</p>
              <div className={styles.specsHint}>
                Cột yêu cầu (8 cột): STT | Họ tên (*) | SĐT (*) | Email (*) | Giới tính (*) | Ngày sinh | Loại khách hàng | Mã PIN
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                className={styles.fileInput}
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className={styles.workspace}>
              {/* Summary stats */}
              <div className={styles.summaryStats}>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Tổng số khách hàng</div>
                  <div className={styles.statValue}>{items.length}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Số dòng hợp lệ</div>
                  <div className={`${styles.statValue} ${styles.progressStatValSuccess}`}>
                    {validatedItems.filter((x) => x.errors.length === 0).length}
                  </div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Số dòng lỗi</div>
                  <div className={`${styles.statValue} ${styles.progressStatValFailed}`}>
                    {validatedItems.filter((x) => x.errors.length > 0).length}
                  </div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Tên tệp</div>
                  <div className={styles.statValueText}>
                    {originalFile?.name || 'Danh sách'} {hasEdits && <span className={styles.editedBadge}>(Đã chỉnh sửa)</span>}
                  </div>
                </div>
              </div>

              {/* Preview Panel */}
              <div className={styles.previewPanel}>
                <div className={styles.panelHeader}>
                  <h2>Xem trước danh sách khách hàng</h2>
                  <div className={styles.panelSearch}>
                    <div className={styles.searchWrapper}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Tìm tên, SĐT, email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      className={styles.dangerGhostBtn}
                      onClick={() => {
                        setItems([]);
                        setOriginalFile(null);
                        setHasEdits(false);
                        setEditingRowId(null);
                      }}
                    >
                      Chọn lại file
                    </button>
                  </div>
                </div>

                <div className={styles.tableWrapper}>
                  <table className={styles.previewTable}>
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>Họ và tên</th>
                        <th>Số điện thoại</th>
                        <th>Email</th>
                        <th>Giới tính</th>
                        <th>Ngày sinh</th>
                        <th>Loại khách hàng</th>
                        <th>Mã PIN</th>
                        <th>Trạng thái / Lỗi</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((item, idx) => {
                        const isEditing = editingRowId === item.id;
                        const rowErrors = item.errors || [];
                        const isRowInvalid = rowErrors.length > 0;

                        return (
                          <tr key={item.id} className={isRowInvalid ? styles.errorRow : ''}>
                            <td>{idx + 1}</td>
                            <td className={styles.nameCell}>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editValues.fullName}
                                  onChange={(e) => handleEditChange('fullName', e.target.value)}
                                  className={styles.tableInput}
                                />
                              ) : (
                                item.fullName || <span className={styles.errorText}>LỖI: Rỗng</span>
                              )}
                            </td>
                            <td className={styles.phoneCell}>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editValues.phone}
                                  onChange={(e) => handleEditChange('phone', e.target.value)}
                                  className={styles.tableInput}
                                />
                              ) : (
                                item.phone || <span className={styles.errorText}>LỖI: Rỗng</span>
                              )}
                            </td>
                            <td className={styles.emailCell}>
                              {isEditing ? (
                                <input
                                  type="email"
                                  value={editValues.email}
                                  onChange={(e) => handleEditChange('email', e.target.value)}
                                  className={styles.tableInput}
                                />
                              ) : (
                                item.email || <span className={styles.errorText}>LỖI: Rỗng</span>
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <select
                                  value={editValues.gender}
                                  onChange={(e) => handleEditChange('gender', e.target.value)}
                                  className={styles.tableSelect}
                                >
                                  <option value="">Chọn...</option>
                                  <option value="MALE">Nam</option>
                                  <option value="FEMALE">Nữ</option>
                                  <option value="OTHER">Khác</option>
                                </select>
                              ) : (
                                mapGenderToText(item.gender) || <span className={styles.errorText}>LỖI: Trống/Lỗi</span>
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <input
                                  type="text"
                                  placeholder="yyyy-mm-dd"
                                  value={editValues.dob}
                                  onChange={(e) => handleEditChange('dob', e.target.value)}
                                  className={styles.tableInput}
                                />
                              ) : (
                                item.dob || '-'
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <select
                                  value={editValues.customerType}
                                  onChange={(e) => handleEditChange('customerType', e.target.value)}
                                  className={styles.tableSelect}
                                >
                                  <option value="INDIVIDUAL">Khách lẻ</option>
                                  <option value="DEALER">Đại lý</option>
                                  <option value="GARAGE">Garage khác</option>
                                </select>
                              ) : (
                                mapTypeToText(item.customerType)
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <input
                                  type="text"
                                  maxLength={6}
                                  value={editValues.pin}
                                  onChange={(e) => handleEditChange('pin', e.target.value)}
                                  className={styles.tableInput}
                                />
                              ) : (
                                item.pin || '111111'
                              )}
                            </td>
                            <td className={styles.errorCell}>
                              {isRowInvalid ? (
                                <ul className={styles.errorList}>
                                  {rowErrors.map((err, errIdx) => (
                                    <li key={errIdx} className={styles.errorItem}>{err}</li>
                                  ))}
                                </ul>
                              ) : (
                                <span className={styles.successBadge}>Hợp lệ</span>
                              )}
                            </td>
                            <td>
                              <div className={styles.rowActions}>
                                {isEditing ? (
                                  <>
                                    <button type="button" className={styles.saveBtn} onClick={saveEditRow}>
                                      Lưu
                                    </button>
                                    <button type="button" className={styles.cancelBtn} onClick={cancelEditRow}>
                                      Hủy
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      className={styles.editBtn}
                                      onClick={() => startEditRow(item)}
                                    >
                                      Sửa
                                    </button>
                                    <button
                                      type="button"
                                      className={styles.deleteBtn}
                                      onClick={() => handleDeleteRow(item.id)}
                                    >
                                      Xóa
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className={styles.submitPanel}>
                  <div className={styles.submitLeft}>
                    {hasErrors ? (
                      <span className={styles.errorText}>
                        * Có dữ liệu lỗi hoặc trùng lặp trong danh sách xem trước. Vui lòng sửa hoặc xóa để tiếp tục.
                      </span>
                    ) : hasEdits ? (
                      <span className={styles.warningText}>
                        * Bạn đã thay đổi dữ liệu xem trước.
                      </span>
                    ) : null}
                  </div>
                  <div className={styles.submitActions}>
                    <button
                      type="button"
                      className={styles.cancelMainBtn}
                      onClick={() => navigate('/customer-manager')}
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="button"
                      className={styles.confirmBtn}
                      onClick={handleConfirmSync}
                      disabled={items.length === 0 || hasErrors}
                    >
                      Xác nhận nhập ({items.length})
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
