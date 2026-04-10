import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { fetchCustomerVehicles } from '../../../services/vehicleService.js';
import styles from './VehicleManagement.module.css';

const ALLOWED_ROLES = ['ADVISOR', 'RECEPTIONIST'];

const readStaffRolesFromStorage = () => {
  try {
    const raw = localStorage.getItem('staffRoles');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => typeof item === 'string')
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);
  } catch {
    return [];
  }
};

const getAuthToken = () =>
  localStorage.getItem('authToken')
  || localStorage.getItem('staffToken')
  || localStorage.getItem('adminToken');

const toPositiveInteger = (value) => {
  const num = Number.parseInt(String(value || '').trim(), 10);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num;
};

const normalizeVehicle = (item, index) => {
  const vehicleId = Number(item?.vehicleId ?? item?.id ?? index + 1);
  const year = Number(item?.year ?? item?.manufactureYear ?? item?.productionYear ?? 0);
  const odometer = Number(
    item?.lastOdometerReading
    ?? item?.odometer
    ?? item?.mileage
    ?? item?.latestMileage
    ?? NaN,
  );

  return {
    vehicleId: Number.isFinite(vehicleId) ? vehicleId : index + 1,
    licensePlate: String(item?.licensePlate ?? item?.plateNumber ?? '-').trim() || '-',
    brand: String(item?.brand ?? item?.make ?? item?.manufacturer ?? '-').trim() || '-',
    model: String(item?.model ?? item?.vehicleModel ?? '-').trim() || '-',
    color: String(item?.color ?? '-').trim() || '-',
    year: Number.isFinite(year) && year > 0 ? year : null,
    lastOdometerReading: Number.isFinite(odometer) && odometer >= 0 ? odometer : null,
    lastServiceDate:
      item?.lastServiceDate
      || item?.lastMaintenanceDate
      || item?.latestServiceDate
      || null,
  };
};

const resolvePayload = (response) => {
  const payload = response?.data?.data ?? response?.data ?? response ?? {};
  const vehicles = Array.isArray(payload?.vehicles)
    ? payload.vehicles
    : Array.isArray(payload?.content)
      ? payload.content
      : Array.isArray(payload)
        ? payload
        : [];

  const customerId = Number(
    payload?.customerId
    ?? payload?.customer?.customerId
    ?? payload?.customer?.id
    ?? 0,
  );

  const customerName = String(
    payload?.customerName
    ?? payload?.customer?.fullName
    ?? '',
  ).trim();

  return {
    customerId: Number.isFinite(customerId) && customerId > 0 ? customerId : null,
    customerName,
    vehicles,
  };
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('vi-VN');
};

const formatOdometer = (value) => {
  if (!Number.isFinite(value)) return '-';
  return `${value.toLocaleString('vi-VN')} km`;
};

export default function VehicleManagement() {
  useScrollToTop();
  const [searchParams] = useSearchParams();

  const staffRoles = useMemo(() => readStaffRolesFromStorage(), []);
  const canAccessPage = useMemo(
    () => staffRoles.some((role) => ALLOWED_ROLES.includes(String(role).toUpperCase())),
    [staffRoles],
  );

  const [customerIdInput, setCustomerIdInput] = useState('');
  const [customerInfo, setCustomerInfo] = useState({ customerId: null, customerName: '' });
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const presetCustomerId = searchParams.get('customerId') || '';
  const presetCustomerName = String(searchParams.get('customerName') || '').trim();

  const loadVehicles = useCallback(async (rawCustomerId, fallbackCustomerName = '') => {
    const customerId = toPositiveInteger(rawCustomerId);
    if (!customerId) {
      setError('Vui lòng nhập customerId hợp lệ (> 0).');
      setVehicles([]);
      setCustomerInfo({ customerId: null, customerName: '' });
      toast.warning('CustomerId không hợp lệ.');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      toast.error('Vui lòng đăng nhập để tiếp tục.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await fetchCustomerVehicles(customerId, token);
      const payload = resolvePayload(response);
      const normalizedVehicles = payload.vehicles.map(normalizeVehicle);

      const resolvedCustomerName = String(payload.customerName || fallbackCustomerName || '').trim();
      setVehicles(normalizedVehicles);
      setCustomerInfo({
        customerId: payload.customerId ?? customerId,
        customerName: resolvedCustomerName,
      });
      setSelectedVehicle(null);
    } catch (err) {
      const message = err?.message || 'Không thể tải danh sách phương tiện.';
      setError(message);
      setVehicles([]);
      setCustomerInfo({ customerId: customerId, customerName: '' });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    loadVehicles(customerIdInput);
  };

  const handleRefresh = () => {
    if (!customerInfo.customerId) {
      toast.info('Nhập customerId trước khi làm mới.');
      return;
    }
    loadVehicles(customerInfo.customerId, customerInfo.customerName);
  };

  useEffect(() => {
    if (!canAccessPage) return;
    const customerId = toPositiveInteger(presetCustomerId);
    if (!customerId) return;
    setCustomerIdInput(String(customerId));
    loadVehicles(customerId, presetCustomerName);
  }, [canAccessPage, presetCustomerId, presetCustomerName, loadVehicles]);

  if (!canAccessPage) {
    return (
      <div className={styles.page}>
        <div className={styles.deniedCard}>
          <h1>Không có quyền truy cập</h1>
          <p>Màn hình này chỉ dành cho vai trò Cố vấn viên và Lễ tân.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>Quản lý phương tiện khách hàng</h1>
        
        </div>
        <span className={styles.countBadge}>{vehicles.length} xe</span>
      </div>

      <form className={styles.filterCard} onSubmit={handleSubmit}>
        <div className={styles.inputGroup}>
          <label htmlFor="customerId">Customer ID</label>
          <input
            id="customerId"
            type="number"
            min="1"
            inputMode="numeric"
            value={customerIdInput}
            onChange={(event) => setCustomerIdInput(event.target.value)}
            placeholder="Nhập customerId..."
          />
        </div>

        <div className={styles.filterActions}>
          <button type="submit" className={styles.primaryButton} disabled={loading}>
            {loading ? 'Đang tải...' : 'Tìm phương tiện'}
          </button>
          <button type="button" className={styles.ghostButton} onClick={handleRefresh} disabled={loading}>
            Làm mới
          </button>
        </div>
      </form>

      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      {customerInfo.customerId ? (
        <div className={styles.customerInfoCard}>
          <div className={styles.customerInfoItem}>
            <span>Customer ID</span>
            <strong>{customerInfo.customerId}</strong>
          </div>
          <div className={styles.customerInfoItem}>
            <span>Khách hàng</span>
            <strong>{customerInfo.customerName || '-'}</strong>
          </div>
          <div className={styles.customerInfoItem}>
            <span>Tổng xe</span>
            <strong>{vehicles.length}</strong>
          </div>
        </div>
      ) : null}

      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <p>Đang tải danh sách xe...</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Chưa có dữ liệu xe. Hãy nhập customerId để tra cứu.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Biển số</th>
                  <th>Hãng</th>
                  <th>Dòng xe</th>
                  <th>Màu</th>
                  <th>Năm SX</th>
                  <th>Km gần nhất</th>
                  <th>Bảo dưỡng gần nhất</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((vehicle, index) => (
                  <tr key={vehicle.vehicleId}>
                    <td>{index + 1}</td>
                    <td>
                      <span className={styles.plateBadge}>{vehicle.licensePlate}</span>
                    </td>
                    <td>{vehicle.brand}</td>
                    <td>{vehicle.model}</td>
                    <td>{vehicle.color}</td>
                    <td>{vehicle.year ?? '-'}</td>
                    <td>{formatOdometer(vehicle.lastOdometerReading)}</td>
                    <td>{formatDate(vehicle.lastServiceDate)}</td>
                    <td>
                      <button
                        type="button"
                        className={`${styles.actionButton} ${styles.viewButton}`}
                        onClick={() => setSelectedVehicle(vehicle)}
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedVehicle ? (
        <div className={styles.modalOverlay} onClick={() => setSelectedVehicle(null)}>
          <div className={styles.modalCard} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Chi tiết phương tiện</h3>
              <button type="button" onClick={() => setSelectedVehicle(null)} aria-label="Đóng">
                x
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailGrid}>
                <div>
                  <span>Vehicle ID</span>
                  <strong>{selectedVehicle.vehicleId}</strong>
                </div>
                <div>
                  <span>Biển số</span>
                  <strong>{selectedVehicle.licensePlate}</strong>
                </div>
                <div>
                  <span>Hãng</span>
                  <strong>{selectedVehicle.brand}</strong>
                </div>
                <div>
                  <span>Dòng xe</span>
                  <strong>{selectedVehicle.model}</strong>
                </div>
                <div>
                  <span>Màu</span>
                  <strong>{selectedVehicle.color}</strong>
                </div>
                <div>
                  <span>Năm sản xuất</span>
                  <strong>{selectedVehicle.year ?? '-'}</strong>
                </div>
                <div>
                  <span>Số km gần nhất</span>
                  <strong>{formatOdometer(selectedVehicle.lastOdometerReading)}</strong>
                </div>
                <div>
                  <span>Ngày bảo dưỡng gần nhất</span>
                  <strong>{formatDate(selectedVehicle.lastServiceDate)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
