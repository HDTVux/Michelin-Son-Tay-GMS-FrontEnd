/**
 * Trạng thái form và chuyển đổi payload dùng chung cho Danh bạ đối tác
 * (modal thêm mới và modal chỉnh sửa).
 */

export const PARTNER_TEXT_FIELDS = [
  // Thông tin chung
  'taxCode',
  'customerCode',
  'identityCard',
  'idIssuePlace',
  'provinceId',
  'provinceName',
  'districtId',
  'districtName',
  'wardId',
  'wardName',
  'address',
  'note',
  // Pháp nhân
  'representativeName',
  'repIdentityCard',
  'position',
  'contractNumber',
  'bankAccountInfo',
  // Liên hệ khác
  'contactName',
  'contactPhone',
  'contactEmail',
  'contactAddress',
];

const PARTNER_DATE_FIELDS = ['idIssueDate', 'contractDate'];
const PARTNER_NUMBER_FIELDS = ['latitude', 'longitude'];

/** Giá trị rỗng cho toàn bộ trường đối tác. */
export const emptyPartnerFields = () => {
  const base = {};
  [...PARTNER_TEXT_FIELDS, ...PARTNER_DATE_FIELDS, ...PARTNER_NUMBER_FIELDS].forEach((key) => {
    base[key] = '';
  });
  base.customerGroupId = '';
  // Mặc định để hệ thống tự sinh mã khách hàng khi thêm mới.
  base.autoCustomerCode = true;
  return base;
};

/** Mã khách hàng hệ thống sinh theo id hồ sơ. */
export const buildAutoCustomerCode = (customerId) => {
  const id = Number(customerId);
  if (!Number.isFinite(id) || id <= 0) return '';
  return `KH${String(id).padStart(5, '0')}`;
};

/** Nạp dữ liệu từ hồ sơ khách hàng trả về từ API vào state form. */
export const partnerFieldsFromCustomer = (customer) => {
  const base = emptyPartnerFields();
  if (!customer) return base;

  Object.keys(base).forEach((key) => {
    const value = customer[key];
    base[key] = value === null || value === undefined ? '' : String(value);
  });
  // Hồ sơ đã có mã thì giữ mã đó, chưa có mới bật chế độ tự sinh.
  base.autoCustomerCode = !customer.customerCode;
  return base;
};

/**
 * Chuẩn hoá state form thành payload gửi backend:
 * chuỗi rỗng -> null (tránh lỗi parse ngày/số ở backend).
 */
export const buildPartnerPayload = (formData) => {
  const payload = {};

  PARTNER_TEXT_FIELDS.forEach((key) => {
    const value = typeof formData[key] === 'string' ? formData[key].trim() : formData[key];
    payload[key] = value ? value : null;
  });

  PARTNER_DATE_FIELDS.forEach((key) => {
    const value = (formData[key] || '').toString().trim();
    payload[key] = value || null;
  });

  PARTNER_NUMBER_FIELDS.forEach((key) => {
    const value = (formData[key] ?? '').toString().trim();
    const parsed = Number(value);
    payload[key] = value !== '' && Number.isFinite(parsed) ? parsed : null;
  });

  const groupId = Number(formData.customerGroupId);
  payload.customerGroupId = formData.customerGroupId !== '' && Number.isFinite(groupId) ? groupId : null;

  return payload;
};

/** Ghép các thành phần địa chỉ thành một dòng để hiển thị. */
export const formatPartnerAddress = (customer) => {
  if (!customer) return '';
  return [customer.address, customer.wardName, customer.districtName, customer.provinceName]
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join(', ');
};
