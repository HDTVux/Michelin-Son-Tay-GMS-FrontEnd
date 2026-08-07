/**
 * Trạng thái form và chuyển đổi payload dùng chung cho Danh bạ đối tác
 * (modal thêm mới và modal chỉnh sửa).
 */
import { toast } from 'react-toastify';
import { createCheckInVehicle } from '../../../services/checkInService.js';

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
  // Xe sẽ được tạo cho đối tác ngay sau khi lưu hồ sơ.
  base.vehicles = [];
  return base;
};

/** Một dòng xe trống trong tab "Xe của đối tác". */
export const emptyVehicleRow = () => ({
  key: `veh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  licensePlate: '',
  make: '',
  model: '',
  year: '',
});

/**
 * Chuẩn hoá danh sách xe thành payload cho POST
 * /api/receptionist/check-in/vehicles/create. Bỏ qua dòng chưa nhập biển số.
 */
export const buildVehiclePayloads = (formData, customerId) =>
  (formData.vehicles || [])
    .filter((vehicle) => (vehicle.licensePlate || '').trim())
    .map((vehicle) => {
      const year = Number((vehicle.year || '').toString().trim());
      return {
        customerId: Number(customerId),
        licensePlate: vehicle.licensePlate.trim().toUpperCase(),
        make: (vehicle.make || '').trim() || null,
        model: (vehicle.model || '').trim() || null,
        year: Number.isFinite(year) && year > 0 ? year : null,
      };
    });

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
  base.vehicles = [];
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

/**
 * Tạo lần lượt các xe đã khai trong tab "Xe của đối tác".
 * Lỗi từng xe (trùng biển số...) được báo riêng, không chặn các xe còn lại và
 * không làm hỏng kết quả lưu hồ sơ đã thành công trước đó.
 *
 * @returns {Promise<number>} số xe tạo thành công
 */
export const createVehiclesForCustomer = async (formData, customerId, token) => {
  const payloads = buildVehiclePayloads(formData, customerId);
  if (payloads.length === 0) return 0;

  if (!customerId) {
    toast.warning('Đã lưu hồ sơ nhưng không xác định được mã khách hàng nên chưa tạo được xe.');
    return 0;
  }

  let created = 0;
  const failures = [];

  for (const payload of payloads) {
    try {
      await createCheckInVehicle(payload, token);
      created += 1;
    } catch (error) {
      failures.push(`${payload.licensePlate}: ${error.message || 'lỗi không xác định'}`);
    }
  }

  if (created > 0) toast.success(`Đã tạo ${created} xe cho đối tác`);
  failures.forEach((message) => toast.error(`Không tạo được xe ${message}`));
  return created;
};

/** Ghép các thành phần địa chỉ thành một dòng để hiển thị. */
export const formatPartnerAddress = (customer) => {
  if (!customer) return '';
  return [customer.address, customer.wardName, customer.districtName, customer.provinceName]
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join(', ');
};
