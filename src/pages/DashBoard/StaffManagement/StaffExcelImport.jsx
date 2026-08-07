import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { createStaff, fetchAllStaffRoles } from '../../../services/adminService.js';
import styles from './StaffExcelImport.module.css';

const parseExcelDate = (val) => {
  if (!val) return '';
  const str = String(val).trim();
  if (!str) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  return str;
};

const mapGenderToEnum = (genderText) => {
  const clean = String(genderText || '').trim().toLowerCase();
  if (clean === 'nam' || clean === 'male') return 'MALE';
  if (clean === 'nữ' || clean === 'nu' || clean === 'female') return 'FEMALE';
  if (clean === 'khác' || clean === 'khac' || clean === 'other') return 'OTHER';
  return 'MALE';
};

const mapGenderToText = (genderEnum) => {
  if (genderEnum === 'MALE') return 'Nam';
  if (genderEnum === 'FEMALE') return 'Nữ';
  if (genderEnum === 'OTHER') return 'Khác';
  return genderEnum || 'Nam';
};

const parseBooleanYesNo = (val) => {
  const clean = String(val || '').trim().toLowerCase();
  return clean === 'có' || clean === 'co' || clean === 'yes' || clean === 'true' || clean === '1';
};

function getAuthToken() {
  return (
    localStorage.getItem('authToken') ||
    localStorage.getItem('adminToken') ||
    localStorage.getItem('staffToken') ||
    ''
  );
}

export default function StaffExcelImport() {
  useScrollToTop();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [availableRoles, setAvailableRoles] = useState([]);
  const [originalFile, setOriginalFile] = useState(null);
  const [items, setItems] = useState([]);
  const [hasEdits, setHasEdits] = useState(false);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [editingRowId, setEditingRowId] = useState(null);
  const [editValues, setEditValues] = useState({});

  const [isImporting, setIsImporting] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [failedList, setFailedList] = useState([]);
  const [importCompleted, setImportCompleted] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    fetchAllStaffRoles(token)
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        setAvailableRoles(list);
      })
      .catch(() => setAvailableRoles([]));
  }, []);

  const handleDownloadTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();
      const headers = [
        'STT',
        'Username (*)',
        'Mật khẩu (*)',
        'Email (*)',
        'Số điện thoại (*)',
        'Họ và tên (*)',
        'Vai trò (ADMIN/MANAGER/ADVISOR/RECEPTIONIST/TECHNICIAN/ACCOUNTANT) (*)',
        'Mã nhân viên',
        'Chức vụ',
        'Bộ phận',
        'Giới tính (Nam/Nữ/Khác)',
        'Ngày sinh (yyyy-mm-dd)',
        'Ngày vào làm (yyyy-mm-dd)',
        'Nghỉ việc (Có/Không)',
        'Trình độ',
        'Ngành nghề',
        'HK thường trú',
        'Nơi sinh',
        'Địa chỉ hiện tại',
        'Người đại diện',
        'Dân tộc',
        'Tôn giáo',
        'Quốc tịch',
        'Số CMND/CCCD',
        'Nơi cấp CMND',
        'Ngày cấp CMND (yyyy-mm-dd)',
        'Mã số thuế TNCN',
        'Nơi cấp Mã TNCN',
        'Ngày cấp Mã TNCN (yyyy-mm-dd)',
        'Số sổ BHXH',
        'Nơi cấp BHXH',
        'Ngày cấp BHXH (yyyy-mm-dd)',
        'TG đã đóng BHXH',
        'TG đã đóng BHTN'
      ];

      const sampleRows = [
        headers,
        [
          1,
          'nv_kythuat01',
          'Pass123456',
          'kythuat01@garage.vn',
          '0987654321',
          'Nguyễn Văn Kỹ Thật',
          'TECHNICIAN',
          'NV001',
          'Kỹ thuật viên trưởng',
          'Kỹ thuật ô tô',
          'Nam',
          '1992-05-10',
          '2022-01-15',
          'Không',
          'Đại học',
          'Công nghệ kỹ thuật ô tô',
          'Số 10 Nguyễn Trãi, Sơn Tây, Hà Nội',
          'Hà Nội',
          'Số 10 Nguyễn Trãi, Sơn Tây, Hà Nội',
          'Nguyễn Văn B (Bố)',
          'Kinh',
          'Không',
          'Việt Nam',
          '001092012345',
          'Cục QLHC về TTXH',
          '2020-03-20',
          '8012345678',
          'Chi cục thuế Sơn Tây',
          '2021-04-10',
          '0123456789',
          'BHXH Thành phố Hà Nội',
          '2021-05-01',
          '3 năm 2 tháng',
          '2 năm'
        ],
        [
          2,
          'nv_letan02',
          'Pass123456',
          'letan02@garage.vn',
          '0912345678',
          'Trần Thị Lễ Tân',
          'RECEPTIONIST',
          'NV002',
          'Lễ tân showroom',
          'Dịch vụ khách hàng',
          'Nữ',
          '1996-08-25',
          '2023-03-01',
          'Không',
          'Cao đẳng',
          'Quản trị lễ tân',
          'Phường Lê Lợi, Sơn Tây, Hà Nội',
          'Hà Tây',
          'Phường Lê Lợi, Sơn Tây, Hà Nội',
          'Trần Văn C (Chồng)',
          'Kinh',
          'Phật giáo',
          'Việt Nam',
          '001196098765',
          'Cục QLHC về TTXH',
          '2021-09-12',
          '8098765432',
          'Chi cục thuế Sơn Tây',
          '2022-01-05',
          '0987654321',
          'BHXH Thành phố Hà Nội',
          '2022-02-15',
          '1 năm 6 tháng',
          '1 năm'
        ]
      ];

      const ws = XLSX.utils.aoa_to_sheet(sampleRows);
      XLSX.utils.book_append_sheet(wb, ws, 'ImportTemplate');

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = globalThis.URL.createObjectURL(blob);

      const a = globalThis.document.createElement('a');
      a.href = url;
      a.download = 'import-nhan-vien-mau.xlsx';
      globalThis.document.body.appendChild(a);
      a.click();
      a.remove();
      globalThis.URL.revokeObjectURL(url);

      toast.success('Tải file mẫu Excel thành công.');
    } catch {
      toast.error('Không thể tải mẫu Excel.');
    }
  };

  const parseStaffRows = (rawRows) => {
    if (!Array.isArray(rawRows) || rawRows.length <= 1) {
      setError('File Excel rỗng hoặc không đúng định dạng mẫu.');
      setItems([]);
      return;
    }

    const parsedList = [];
    for (let i = 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.length === 0) continue;

      const username = String(row[1] || '').trim();
      const password = String(row[2] || '').trim();
      const email = String(row[3] || '').trim();
      const phoneNumber = String(row[4] || '').trim();
      const fullName = String(row[5] || '').trim();
      const rolesText = String(row[6] || '').trim();

      // Skip row if completely empty
      if (!username && !fullName && !phoneNumber && !email) continue;

      const employeeCode = String(row[7] || '').trim();
      const position = String(row[8] || '').trim();
      const department = String(row[9] || '').trim();
      const genderText = String(row[10] || '').trim();
      const dob = parseExcelDate(row[11]);
      const startDate = parseExcelDate(row[12]);
      const isResigned = parseBooleanYesNo(row[13]);
      const educationLevel = String(row[14] || '').trim();
      const profession = String(row[15] || '').trim();
      const permanentAddress = String(row[16] || '').trim();
      const placeOfBirth = String(row[17] || '').trim();
      const address = String(row[18] || '').trim();
      const representative = String(row[19] || '').trim();
      const ethnicity = String(row[20] || '').trim();
      const religion = String(row[21] || '').trim();
      const nationality = String(row[22] || 'Việt Nam').trim();
      const identityCard = String(row[23] || '').trim();
      const idIssuePlace = String(row[24] || '').trim();
      const idIssueDate = parseExcelDate(row[25]);
      const pitCode = String(row[26] || '').trim();
      const pitIssuePlace = String(row[27] || '').trim();
      const pitIssueDate = parseExcelDate(row[28]);
      const socialInsuranceCode = String(row[29] || '').trim();
      const siIssuePlace = String(row[30] || '').trim();
      const siIssueDate = parseExcelDate(row[31]);
      const siPaidPeriod = String(row[32] || '').trim();
      const uiPaidPeriod = String(row[33] || '').trim();

      const validationErrors = [];
      if (!username) validationErrors.push('Thiếu Username');
      if (!password) validationErrors.push('Thiếu Mật khẩu');
      if (!email) validationErrors.push('Thiếu Email');
      if (!phoneNumber) validationErrors.push('Thiếu SĐT');
      if (!fullName) validationErrors.push('Thiếu Họ và tên');
      if (!rolesText) validationErrors.push('Thiếu Vai trò (Role)');

      parsedList.push({
        _rowId: i,
        username,
        password,
        email,
        phoneNumber,
        fullName,
        rolesText,
        employeeCode,
        position,
        department,
        gender: mapGenderToEnum(genderText),
        genderText: mapGenderToText(mapGenderToEnum(genderText)),
        dob,
        startDate,
        isResigned,
        educationLevel,
        profession,
        permanentAddress,
        placeOfBirth,
        address,
        representative,
        ethnicity,
        religion,
        nationality,
        identityCard,
        idIssuePlace,
        idIssueDate,
        pitCode,
        pitIssuePlace,
        pitIssueDate,
        socialInsuranceCode,
        siIssuePlace,
        siIssueDate,
        siPaidPeriod,
        uiPaidPeriod,
        validationErrors,
        isEdited: false
      });
    }

    setItems(parsedList);
    setError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    const isExcel = /\.(xlsx|xls)$/i.test(file.name);
    if (!isExcel) {
      setError('Chỉ chấp nhận file Excel (.xlsx, .xls).');
      return;
    }

    setOriginalFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        parseStaffRows(rawRows);
      } catch {
        setError('Không thể đọc dữ liệu file Excel này.');
        setItems([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleStartEdit = (item) => {
    setEditingRowId(item._rowId);
    setEditValues({ ...item });
  };

  const handleSaveEdit = (rowId) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it._rowId !== rowId) return it;

        const updated = { ...it, ...editValues, isEdited: true };
        const validationErrors = [];
        if (!updated.username?.trim()) validationErrors.push('Thiếu Username');
        if (!updated.password?.trim()) validationErrors.push('Thiếu Mật khẩu');
        if (!updated.email?.trim()) validationErrors.push('Thiếu Email');
        if (!updated.phoneNumber?.trim()) validationErrors.push('Thiếu SĐT');
        if (!updated.fullName?.trim()) validationErrors.push('Thiếu Họ và tên');
        if (!updated.rolesText?.trim()) validationErrors.push('Thiếu Vai trò');

        updated.validationErrors = validationErrors;
        return updated;
      })
    );

    setEditingRowId(null);
    setEditValues({});
    setHasEdits(true);
  };

  const handleDeleteRow = (rowId) => {
    setItems((prev) => prev.filter((it) => it._rowId !== rowId));
    setHasEdits(true);
  };

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase().trim();
    return items.filter(
      (it) =>
        it.fullName?.toLowerCase().includes(term) ||
        it.username?.toLowerCase().includes(term) ||
        it.phoneNumber?.includes(term) ||
        it.email?.toLowerCase().includes(term) ||
        it.employeeCode?.toLowerCase().includes(term)
    );
  }, [items, searchTerm]);

  const validCount = useMemo(
    () => items.filter((it) => (it.validationErrors || []).length === 0).length,
    [items]
  );
  const invalidCount = items.length - validCount;

  const resolveRolesPayload = (rolesText) => {
    if (!rolesText) return [{ roleId: 1, roleCode: 'ADMIN', roleName: 'Admin' }];
    const parts = rolesText.split(/[,;\/]+/).map((s) => s.trim().toUpperCase()).filter(Boolean);

    const matched = [];
    for (const part of parts) {
      const found = availableRoles.find(
        (r) =>
          r.roleCode?.toUpperCase() === part ||
          r.roleName?.toUpperCase() === part ||
          r.label?.toUpperCase() === part
      );
      if (found) {
        matched.push({
          roleId: found.roleId,
          roleCode: found.roleCode,
          roleName: found.roleName || found.label
        });
      }
    }

    if (matched.length > 0) return matched;

    // Fallback: match by standard role names
    if (parts.some((p) => p.includes('TECH') || p.includes('KỸ THUẬT'))) {
      const techRole = availableRoles.find((r) => r.roleCode === 'TECHNICIAN');
      if (techRole) return [{ roleId: techRole.roleId, roleCode: 'TECHNICIAN' }];
    }
    if (parts.some((p) => p.includes('REC') || p.includes('LỄ TÂN'))) {
      const recRole = availableRoles.find((r) => r.roleCode === 'RECEPTIONIST');
      if (recRole) return [{ roleId: recRole.roleId, roleCode: 'RECEPTIONIST' }];
    }
    if (parts.some((p) => p.includes('ADV') || p.includes('CỐ VẤN'))) {
      const advRole = availableRoles.find((r) => r.roleCode === 'ADVISOR');
      if (advRole) return [{ roleId: advRole.roleId, roleCode: 'ADVISOR' }];
    }
    if (parts.some((p) => p.includes('MAN') || p.includes('QUẢN LÝ'))) {
      const mgrRole = availableRoles.find((r) => r.roleCode === 'MANAGER');
      if (mgrRole) return [{ roleId: mgrRole.roleId, roleCode: 'MANAGER' }];
    }

    const first = availableRoles[0];
    return first
      ? [{ roleId: first.roleId, roleCode: first.roleCode }]
      : [{ roleId: 1, roleCode: 'ADMIN' }];
  };

  const handleStartImport = async () => {
    const token = getAuthToken();
    if (!token) {
      toast.error('Vui lòng đăng nhập để thực hiện import.');
      return;
    }

    const validRows = items.filter((it) => (it.validationErrors || []).length === 0);
    if (validRows.length === 0) {
      toast.error('Không có dòng dữ liệu hợp lệ để import.');
      return;
    }

    setIsImporting(true);
    setProcessedCount(0);
    setSuccessCount(0);
    setFailedCount(0);
    setFailedList([]);
    setImportCompleted(false);

    let sCount = 0;
    let fCount = 0;
    const errors = [];

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        const rolesPayload = resolveRolesPayload(row.rolesText);

        await createStaff(
          {
            fullName: row.fullName || row.username,
            phone: row.phoneNumber,
            position: row.position || '',
            password: row.password,
            avatar: null,
            email: row.email,
            status: 'ACTIVE',
            dob: row.dob || null,
            roles: rolesPayload,

            // Extended employee attributes
            employeeCode: row.employeeCode || undefined,
            startDate: row.startDate || null,
            isResigned: row.isResigned,
            permanentAddress: row.permanentAddress || null,
            placeOfBirth: row.placeOfBirth || null,
            address: row.address || null,
            representative: row.representative || null,
            gender: row.gender || 'MALE',
            ethnicity: row.ethnicity || null,
            religion: row.religion || null,
            nationality: row.nationality || 'Việt Nam',
            identityCard: row.identityCard || null,
            idIssuePlace: row.idIssuePlace || null,
            idIssueDate: row.idIssueDate || null,
            pitCode: row.pitCode || null,
            pitIssuePlace: row.pitIssuePlace || null,
            pitIssueDate: row.pitIssueDate || null,
            socialInsuranceCode: row.socialInsuranceCode || null,
            siIssuePlace: row.siIssuePlace || null,
            siIssueDate: row.siIssueDate || null,
            siPaidPeriod: row.siPaidPeriod || null,
            uiPaidPeriod: row.uiPaidPeriod || null,
            educationLevel: row.educationLevel || null,
            profession: row.profession || null,
            department: row.department || null
          },
          token
        );

        sCount++;
        setSuccessCount(sCount);
      } catch (err) {
        fCount++;
        setFailedCount(fCount);
        errors.push({
          fullName: row.fullName,
          phone: row.phoneNumber,
          email: row.email,
          reason: err?.message || 'Tạo nhân viên thất bại'
        });
        setFailedList([...errors]);
      } finally {
        setProcessedCount(i + 1);
      }
    }

    setImportCompleted(true);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => navigate('/staff-manager')}
            aria-label="Quay lại"
          >
            &larr;
          </button>
          <div>
            <h1>Nhập danh sách nhân viên từ Excel</h1>
            <p>Tải file mẫu, kiểm tra dữ liệu và thêm hàng loạt nhân viên vào hệ thống</p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button type="button" className={styles.ghostBtn} onClick={handleDownloadTemplate}>
            Tải file mẫu (.xlsx)
          </button>
        </div>
      </header>

      {error && <div className={styles.errorAlert}>{error}</div>}

      {/* Progress Overlay */}
      {isImporting && (
        <div className={styles.progressOverlay}>
          <h2>{importCompleted ? 'Hoàn tất Nhập Excel' : 'Đang xử lý Import nhân viên...'}</h2>
          <p>
            Đã xử lý {processedCount} / {items.filter((it) => (it.validationErrors || []).length === 0).length} nhân viên
          </p>

          <div className={styles.progressBarContainer}>
            <div
              className={styles.progressBar}
              style={{
                width: `${(processedCount / Math.max(1, items.filter((it) => (it.validationErrors || []).length === 0).length)) * 100}%`
              }}
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
              <h4>Danh sách thất bại ({failedList.length}):</h4>
              {failedList.map((f, idx) => (
                <div key={idx} className={styles.failedItem}>
                  <span>
                    <strong>{f.fullName || f.email}</strong> ({f.phone})
                  </span>
                  <span className={styles.failedItemReason}>{f.reason}</span>
                </div>
              ))}
            </div>
          )}

          {importCompleted && (
            <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className={styles.confirmBtn}
                onClick={() => navigate('/staff-manager')}
              >
                Về danh sách nhân viên
              </button>
            </div>
          )}
        </div>
      )}

      {/* Upload Drop Zone if no items loaded */}
      {!isImporting && items.length === 0 && (
        <div className={styles.dropZone} onClick={() => fileInputRef.current?.click()}>
          <svg className={styles.uploadIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <h3>Nhấp hoặc kéo thả file Excel vào đây</h3>
          <p>Hỗ trợ định dạng .xlsx, .xls</p>
          <div className={styles.specsHint}>
            File Excel cần chứa các cột: Username (*), Mật khẩu (*), Email (*), Số điện thoại (*), Họ tên (*), Vai trò (*), Mã NV, Chức vụ, Bộ phận, Giới tính, CMND, BHXH...
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls"
            className={styles.fileInput}
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* Preview and Edit Panel if items parsed */}
      {!isImporting && items.length > 0 && (
        <main className={styles.workspace}>
          <div className={styles.summaryStats}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Tổng số bản ghi</div>
              <div className={styles.statValue}>{items.length}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Hợp lệ</div>
              <div className={`${styles.statValue} ${styles.progressStatValSuccess}`}>{validCount}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Lỗi validation</div>
              <div className={`${styles.statValue} ${styles.progressStatValFailed}`}>{invalidCount}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Tên file gốc</div>
              <div className={styles.statValueText}>
                {originalFile?.name || 'Excel import'}
                {hasEdits && <span className={styles.editedBadge}>Đã chỉnh sửa</span>}
              </div>
            </div>
          </div>

          <div className={styles.previewPanel}>
            <div className={styles.panelHeader}>
              <h2>Xem trước &amp; Kiểm tra danh sách ({items.length})</h2>
              <div className={styles.panelSearch}>
                <div className={styles.searchWrapper}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Tìm theo Username/Tên/SĐT/Mã NV..."
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
                  }}
                >
                  Chọn file khác
                </button>
              </div>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.previewTable}>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Trạng thái</th>
                    <th>Mã NV</th>
                    <th>Username (*)</th>
                    <th>Mật khẩu (*)</th>
                    <th>Họ và tên (*)</th>
                    <th>SĐT (*)</th>
                    <th>Email (*)</th>
                    <th>Vai trò (*)</th>
                    <th>Chức vụ</th>
                    <th>Bộ phận</th>
                    <th>Giới tính</th>
                    <th>Ngày sinh</th>
                    <th>Số CMND</th>
                    <th>Số BHXH</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, idx) => {
                    const isEditing = editingRowId === item._rowId;
                    const hasError = (item.validationErrors || []).length > 0;

                    return (
                      <tr key={item._rowId} className={hasError ? styles.errorRow : ''}>
                        <td>{idx + 1}</td>
                        <td className={styles.errorCell}>
                          {hasError ? (
                            <ul className={styles.errorList}>
                              {item.validationErrors.map((err, eIdx) => (
                                <li key={eIdx} className={styles.errorItem}>
                                  {err}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className={styles.successBadge}>Hợp lệ</span>
                          )}
                        </td>

                        <td>
                          {isEditing ? (
                            <input
                              className={styles.tableInput}
                              value={editValues.employeeCode || ''}
                              onChange={(e) => setEditValues({ ...editValues, employeeCode: e.target.value })}
                            />
                          ) : (
                            item.employeeCode || '-'
                          )}
                        </td>

                        <td>
                          {isEditing ? (
                            <input
                              className={styles.tableInput}
                              value={editValues.username || ''}
                              onChange={(e) => setEditValues({ ...editValues, username: e.target.value })}
                            />
                          ) : (
                            item.username || '-'
                          )}
                        </td>

                        <td>
                          {isEditing ? (
                            <input
                              className={styles.tableInput}
                              type="text"
                              value={editValues.password || ''}
                              onChange={(e) => setEditValues({ ...editValues, password: e.target.value })}
                            />
                          ) : (
                            '••••••••'
                          )}
                        </td>

                        <td className={styles.nameCell}>
                          {isEditing ? (
                            <input
                              className={styles.tableInput}
                              value={editValues.fullName || ''}
                              onChange={(e) => setEditValues({ ...editValues, fullName: e.target.value })}
                            />
                          ) : (
                            item.fullName || '-'
                          )}
                        </td>

                        <td className={styles.phoneCell}>
                          {isEditing ? (
                            <input
                              className={styles.tableInput}
                              value={editValues.phoneNumber || ''}
                              onChange={(e) => setEditValues({ ...editValues, phoneNumber: e.target.value })}
                            />
                          ) : (
                            item.phoneNumber || '-'
                          )}
                        </td>

                        <td className={styles.emailCell}>
                          {isEditing ? (
                            <input
                              className={styles.tableInput}
                              value={editValues.email || ''}
                              onChange={(e) => setEditValues({ ...editValues, email: e.target.value })}
                            />
                          ) : (
                            item.email || '-'
                          )}
                        </td>

                        <td>
                          {isEditing ? (
                            <input
                              className={styles.tableInput}
                              value={editValues.rolesText || ''}
                              onChange={(e) => setEditValues({ ...editValues, rolesText: e.target.value })}
                            />
                          ) : (
                            item.rolesText || '-'
                          )}
                        </td>

                        <td>
                          {isEditing ? (
                            <input
                              className={styles.tableInput}
                              value={editValues.position || ''}
                              onChange={(e) => setEditValues({ ...editValues, position: e.target.value })}
                            />
                          ) : (
                            item.position || '-'
                          )}
                        </td>

                        <td>
                          {isEditing ? (
                            <input
                              className={styles.tableInput}
                              value={editValues.department || ''}
                              onChange={(e) => setEditValues({ ...editValues, department: e.target.value })}
                            />
                          ) : (
                            item.department || '-'
                          )}
                        </td>

                        <td>
                          {isEditing ? (
                            <select
                              className={styles.tableSelect}
                              value={editValues.gender || 'MALE'}
                              onChange={(e) => setEditValues({ ...editValues, gender: e.target.value })}
                            >
                              <option value="MALE">Nam</option>
                              <option value="FEMALE">Nữ</option>
                              <option value="OTHER">Khác</option>
                            </select>
                          ) : (
                            item.genderText || '-'
                          )}
                        </td>

                        <td>
                          {isEditing ? (
                            <input
                              type="date"
                              className={styles.tableInput}
                              value={editValues.dob || ''}
                              onChange={(e) => setEditValues({ ...editValues, dob: e.target.value })}
                            />
                          ) : (
                            item.dob || '-'
                          )}
                        </td>

                        <td>
                          {isEditing ? (
                            <input
                              className={styles.tableInput}
                              value={editValues.identityCard || ''}
                              onChange={(e) => setEditValues({ ...editValues, identityCard: e.target.value })}
                            />
                          ) : (
                            item.identityCard || '-'
                          )}
                        </td>

                        <td>
                          {isEditing ? (
                            <input
                              className={styles.tableInput}
                              value={editValues.socialInsuranceCode || ''}
                              onChange={(e) => setEditValues({ ...editValues, socialInsuranceCode: e.target.value })}
                            />
                          ) : (
                            item.socialInsuranceCode || '-'
                          )}
                        </td>

                        <td>
                          <div className={styles.rowActions}>
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  className={styles.saveBtn}
                                  onClick={() => handleSaveEdit(item._rowId)}
                                >
                                  Lưu
                                </button>
                                <button
                                  type="button"
                                  className={styles.cancelBtn}
                                  onClick={() => setEditingRowId(null)}
                                >
                                  Hủy
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className={styles.editBtn}
                                  onClick={() => handleStartEdit(item)}
                                >
                                  Sửa
                                </button>
                                <button
                                  type="button"
                                  className={styles.deleteBtn}
                                  onClick={() => handleDeleteRow(item._rowId)}
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
                {invalidCount > 0 && (
                  <span className={styles.warningText}>
                    Chú ý: Có {invalidCount} dòng dữ liệu lỗi. Vui lòng sửa trực tiếp trên bảng hoặc xóa trước khi import.
                  </span>
                )}
              </div>
              <div className={styles.submitActions}>
                <button
                  type="button"
                  className={styles.cancelMainBtn}
                  onClick={() => navigate('/staff-manager')}
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  className={styles.confirmBtn}
                  disabled={validCount === 0}
                  onClick={handleStartImport}
                >
                  Bắt đầu Import ({validCount} dòng hợp lệ)
                </button>
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
