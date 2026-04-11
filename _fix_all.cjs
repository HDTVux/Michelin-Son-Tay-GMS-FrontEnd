const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/Technician/ServiceTicket/ServiceTicket.jsx');
let lines = fs.readFileSync(filePath, 'utf-8').split('\n');

// Track if BOM exists on first line
const hasBOM = lines[0].startsWith('\uFEFF');

const replacements = {
  // Line 154: toast.error('Vui lòng Ä'Äƒng nhập');
  154: "          toast.error('Vui lòng đăng nhập');",

  // Line 352: console.error('Lá»—i khi tải dá»¯ liệu phiếu:', error);
  352: "        console.error('Lỗi khi tải dữ liệu phiếu:', error);",

  // Line 383: // Validate 500 k? t? cho c?c tr??ng kh?c
  383: "    // Validate 500 ký tự cho các trường khác",

  // Line 473: toast.error('Thiếu serviceTicketId Ä'á»ƒ táº¡o phiếu kiá»ƒm tra.');
  473: "          toast.error('Thiếu serviceTicketId để tạo phiếu kiểm tra.');",

  // Line 547: console.error('Lá»—i khi táº¡o háº¡ng má»¥c:', error);
  547: "      console.error('Lỗi khi tạo hạng mục:', error);",

  // Line 548: toast.error(error.message || 'Lá»—i khi táº¡o háº¡ng má»¥c mưới');
  548: "      toast.error(error.message || 'Lỗi khi tạo hạng mục mới');",

  // Line 571: console.error('Lá»—i khi xÃƒÂ³a háº¡ng má»¥c tÃƒÂ¹y chỹnh:', error);
  571: "      console.error('Lỗi khi xóa hạng mục tùy chỉnh:', error);",

  // Line 591: console.error('Lá»—i khi bá» qua:', error);
  591: "      console.error('Lỗi khi bỏ qua:', error);",

  // Line 718: throw new Error('Thiếu serviceTicketId Ä'á»ƒ lưu phiếu kiá»ƒm tra.');
  718: "        throw new Error('Thiếu serviceTicketId để lưu phiếu kiểm tra.');",

  // Line 753: toast.success('Da luu du lieu phieu kiem tra an toan.');
  753: "      toast.success('Đã lưu dữ liệu phiếu kiểm tra an toàn.');",

  // Line 755: console.error('Lá»—i khi lưu dá»¯ liệu phiếu:', error);
  755: "      console.error('Lỗi khi lưu dữ liệu phiếu:', error);",

  // Line 859: throw new Error('Thiếu serviceTicketId Ä'á»ƒ lưu phiếu kiá»ƒm tra.');
  859: "        throw new Error('Thiếu serviceTicketId để lưu phiếu kiểm tra.');",

  // Line 935: setRefreshKey(prev => prev + 1); // reload Ä'á»ƒ dá»¯ liệu advisor/technician map Ä'á»"ng bá»™ qua API
  935: "      setRefreshKey(prev => prev + 1); // reload để dữ liệu advisor/technician map đồng bộ qua API",

  // Line 937: console.error('Lá»—i khi lưu dá»¯ liệu:', error);
  937: "      console.error('Lỗi khi lưu dữ liệu:', error);",

  // Line 953: <p>Äang tải dá»¯ liệu...</p>
  953: "          <p>Đang tải dữ liệu...</p>",

  // Line 974: Phieu dich vu da o trang thai PAID/COMPLETED...
  974: "              Phiếu dịch vụ đã ở trạng thái PAID/COMPLETED. Phiếu kiểm tra an toàn đang bị khóa chỉnh sửa.",

  // Line 980: {/* Pháº§n kiá»ƒm tra lốp */}
  980: "      {/* Phần kiểm tra lốp */}",

  // Line 997: setRecommendedTireSizeError('Tối Ä'a 500 ký tự.');
  997: "                    setRecommendedTireSizeError('Tối đa 500 ký tự.');",

  // Line 1083: {/* THÃƒâ€šN XE - Giá»¯a */}
  1083: "          {/* THÂN XE - Giữa */}",

  // Line 1102: {/* BÃŠN PHáº¢I - FRONT RIGHT + REAR RIGHT + SPARE */}
  1102: "          {/* BÊN PHẢI - FRONT RIGHT + REAR RIGHT + SPARE */}",

  // Line 1273: <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '13px' }}>â€"</span>
  1273: "                          <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '13px' }}>—</span>",

  // Line 1302: setNotesError('Tối Ä'a 500 ký tự.');
  1302: "              setNotesError('Tối đa 500 ký tự.');",

  // Line 1400: setSkipReasonError('Tối Ä'a 500 ký tự.');
  1400: "                            setSkipReasonError('Tối đa 500 ký tự.');",
};

let fixCount = 0;
for (const [lineNum, newContent] of Object.entries(replacements)) {
  const idx = parseInt(lineNum) - 1;
  if (idx >= 0 && idx < lines.length) {
    const oldLine = lines[idx];
    lines[idx] = newContent;
    fixCount++;
    console.log(`Fixed line ${lineNum}`);
  } else {
    console.warn(`Line ${lineNum} out of range (file has ${lines.length} lines)`);
  }
}

// Now implement safety inspection lock
// Find line 115: const isServiceTicketLocked = ...
// We need to add isInspectionCompleted check after it and update canEdit lines

const lockLineIdx = lines.findIndex(l => l.includes('const isServiceTicketLocked = LOCKED_SERVICE_TICKET_STATUSES.has'));
if (lockLineIdx === -1) {
  console.error('Could not find isServiceTicketLocked line!');
  process.exit(1);
}
console.log(`Found isServiceTicketLocked at line ${lockLineIdx + 1}`);

// The line after isServiceTicketLocked should be serviceTicketLockMessage
// We insert isInspectionCompleted right after isServiceTicketLocked
const inspectionCheckLine = "  const isInspectionCompleted = String(inspectionStatus).trim().toUpperCase() === 'COMPLETED';";
lines.splice(lockLineIdx + 1, 0, inspectionCheckLine);
console.log('Inserted isInspectionCompleted check');

// Now line numbers shifted by 1. Find canEditTechnicalFields
const canEditTechIdx = lines.findIndex(l => l.includes('const canEditTechnicalFields = !isServiceTicketLocked;'));
if (canEditTechIdx === -1) {
  console.error('Could not find canEditTechnicalFields line!');
  process.exit(1);
}
lines[canEditTechIdx] = "  const canEditTechnicalFields = !isServiceTicketLocked && !isInspectionCompleted;";
console.log(`Updated canEditTechnicalFields at line ${canEditTechIdx + 1}`);

const canEditAdvisorIdx = lines.findIndex(l => l.includes('const canEditAdvisorNotes = !isServiceTicketLocked;'));
if (canEditAdvisorIdx === -1) {
  console.error('Could not find canEditAdvisorNotes line!');
  process.exit(1);
}
lines[canEditAdvisorIdx] = "  const canEditAdvisorNotes = !isServiceTicketLocked && !isInspectionCompleted;";
console.log(`Updated canEditAdvisorNotes at line ${canEditAdvisorIdx + 1}`);

// Update guardServiceTicketEditable to also check inspection completed
const guardIdx = lines.findIndex(l => l.includes('const guardServiceTicketEditable = () => {'));
if (guardIdx === -1) {
  console.error('Could not find guardServiceTicketEditable!');
  process.exit(1);
}

// Replace the guard function (4 lines: function declaration, if check, toast, return, closing brace)
// Let's find the exact extent
let guardEndIdx = guardIdx;
for (let i = guardIdx; i < lines.length; i++) {
  if (lines[i].trim() === '};' && i > guardIdx) {
    guardEndIdx = i;
    break;
  }
}

const newGuard = [
  "  const guardServiceTicketEditable = () => {",
  "    if (isInspectionCompleted) {",
  "      toast.info('Phiếu kiểm tra an toàn đã hoàn thành. Không thể chỉnh sửa.');",
  "      return false;",
  "    }",
  "    if (!isServiceTicketLocked) return true;",
  "    toast.info(serviceTicketLockMessage);",
  "    return false;",
  "  };",
];

lines.splice(guardIdx, guardEndIdx - guardIdx + 1, ...newGuard);
console.log(`Replaced guardServiceTicketEditable (lines ${guardIdx + 1}-${guardEndIdx + 1})`);

// Write the file back
const output = lines.join('\n');
fs.writeFileSync(filePath, output, 'utf-8');
console.log(`\nDone! Fixed ${fixCount} mojibake lines and implemented safety inspection lock.`);
