import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { fetchCheckInAdvisors, fetchCheckInTechnicians } from '../../services/checkInService.js';
import { fetchCustomerVehicles } from '../../services/vehicleService.js';
import styles from './PreAssignPicker.module.css';

/** Chuẩn hoá danh sách nhân sự trả về từ API phân công. */
const normalizeStaffList = (response) => {
    const payload = response?.data?.data ?? response?.data ?? response;
    const list = Array.isArray(payload) ? payload : [];
    return list
        .map((item) =>
            item
                ? { staffId: item.staffId ?? item.id ?? 0, fullName: item.fullName ?? item.name ?? '' }
                : null
        )
        .filter(Boolean);
};

const normalizeVehicles = (response) => {
    const payload = response?.data?.data ?? response?.data ?? response;
    const list = Array.isArray(payload?.vehicles) ? payload.vehicles : Array.isArray(payload) ? payload : [];
    return list.filter(Boolean);
};

/**
 * Chọn trước xe / tư vấn viên / kỹ thuật viên khi tạo lịch hoặc bán hàng.
 * Tất cả đều không bắt buộc — bỏ trống thì màn check-in sẽ chọn.
 */
const PreAssignPicker = ({ customerId, value, onChange, title = 'Phân công trước' }) => {
    const [vehicles, setVehicles] = useState([]);
    const [advisors, setAdvisors] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [loadedFor, setLoadedFor] = useState(0);

    const numericCustomerId = Number(customerId) || 0;

    // Nhân sự tải một lần, không phụ thuộc khách hàng.
    useEffect(() => {
        let cancelled = false;
        const token = localStorage.getItem('authToken');

        Promise.allSettled([fetchCheckInAdvisors(token), fetchCheckInTechnicians(token)]).then(
            ([advisorResult, technicianResult]) => {
                if (cancelled) return;
                setAdvisors(advisorResult.status === 'fulfilled' ? normalizeStaffList(advisorResult.value) : []);
                setTechnicians(
                    technicianResult.status === 'fulfilled' ? normalizeStaffList(technicianResult.value) : []
                );
            }
        );

        return () => {
            cancelled = true;
        };
    }, []);

    // Chỉ set state trong callback của promise để không tạo render thừa.
    // loadedFor cho biết danh sách hiện có thuộc về khách nào — khác khách đang
    // chọn nghĩa là đang tải.
    useEffect(() => {
        if (!numericCustomerId) return undefined;

        let cancelled = false;
        const token = localStorage.getItem('authToken');

        fetchCustomerVehicles(numericCustomerId, token)
            .then((res) => {
                if (cancelled) return;
                setVehicles(normalizeVehicles(res));
                setLoadedFor(numericCustomerId);
            })
            .catch(() => {
                if (cancelled) return;
                setVehicles([]);
                setLoadedFor(numericCustomerId);
            });

        return () => {
            cancelled = true;
        };
    }, [numericCustomerId]);

    const isLoadingVehicles = Boolean(numericCustomerId) && loadedFor !== numericCustomerId;

    const vehiclePlaceholder = useMemo(() => {
        if (!numericCustomerId) return 'Nhập số điện thoại khách trước';
        if (isLoadingVehicles) return 'Đang tải danh sách xe...';
        if (!vehicles.length) return 'Khách chưa có xe trong hệ thống';
        return 'Chọn khi check-in';
    }, [isLoadingVehicles, numericCustomerId, vehicles.length]);

    const handleChange = (field) => (e) => onChange({ ...value, [field]: e.target.value });

    return (
        <div className={styles.wrapper}>
            <div className={styles.header}>
                <span className={styles.title}>{title}</span>
                <span className={styles.optionalTag}>Không bắt buộc</span>
            </div>
            <p className={styles.hint}>
                Chọn sẵn ở đây để lúc check-in đỡ phải nhập lại. Bỏ trống cũng được — lễ tân sẽ chọn khi tiếp nhận xe.
            </p>

            <div className={styles.grid}>
                <div className="ui-field" style={{ marginBottom: 0 }}>
                    <label htmlFor="preassign-vehicle">Xe của khách</label>
                    <select
                        id="preassign-vehicle"
                        value={value.vehicleId || ''}
                        onChange={handleChange('vehicleId')}
                        disabled={!numericCustomerId || isLoadingVehicles || !vehicles.length}
                    >
                        <option value="">{vehiclePlaceholder}</option>
                        {vehicles.map((vehicle) => {
                            const detail = [vehicle.brand || vehicle.make, vehicle.model, vehicle.year]
                                .filter(Boolean)
                                .join(' ');
                            return (
                                <option key={vehicle.vehicleId} value={String(vehicle.vehicleId)}>
                                    {detail ? `${vehicle.licensePlate} - ${detail}` : vehicle.licensePlate}
                                </option>
                            );
                        })}
                    </select>
                </div>

                <div className="ui-field" style={{ marginBottom: 0 }}>
                    <label htmlFor="preassign-advisor">Tư vấn viên</label>
                    <select
                        id="preassign-advisor"
                        value={value.advisorId || ''}
                        onChange={handleChange('advisorId')}
                        disabled={!advisors.length}
                    >
                        <option value="">{advisors.length ? 'Chọn khi check-in' : 'Không có tư vấn viên'}</option>
                        {advisors.map((staff) => (
                            <option key={staff.staffId} value={String(staff.staffId)}>
                                {staff.fullName || `#${staff.staffId}`}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="ui-field" style={{ marginBottom: 0 }}>
                    <label htmlFor="preassign-technician">Kỹ thuật viên</label>
                    <select
                        id="preassign-technician"
                        value={value.technicianId || ''}
                        onChange={handleChange('technicianId')}
                        disabled={!technicians.length}
                    >
                        <option value="">{technicians.length ? 'Chọn khi check-in' : 'Không có kỹ thuật viên'}</option>
                        {technicians.map((staff) => (
                            <option key={staff.staffId} value={String(staff.staffId)}>
                                {staff.fullName || `#${staff.staffId}`}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
};

PreAssignPicker.propTypes = {
    customerId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    value: PropTypes.shape({
        vehicleId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        advisorId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        technicianId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    }).isRequired,
    onChange: PropTypes.func.isRequired,
    title: PropTypes.string,
};

export default PreAssignPicker;
