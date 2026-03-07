import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import styles from './CheckIn.module.css';
import { formatTimeHHmm } from '../../../components/timeUtils.js';
import {
    completeAllCheckInMultipart,
    createCheckInVehicle,
    fetchCheckInCustomerVehicles,
    lookupCheckInByBookingCode,
} from '../../../services/checkInService.js';
import { toast } from 'react-toastify';

/** Chuẩn hóa thông tin từng xe từ dữ liệu thô của API.
 * Đảm bảo các trường thông tin quan trọng như ID, biển số luôn có giá trị mặc định.
 */
const mapVehicleItem = (item) => {
    if (!item) return null;
    return {
        vehicleId: item.vehicleId ?? item.id ?? 0,
        licensePlate: item.licensePlate ?? '',
        make: item.make ?? '',
        model: item.model ?? '',
        year: item.year ?? 0,
        lastOdometerReading: item.lastOdometerReading ?? null,
        lastServiceDate: item.lastServiceDate ?? null,
    };
};

/** Trích xuất danh sách xe từ phản hồi của API.
 * Xử lý các trường hợp dữ liệu lồng nhau phức tạp (data.data hoặc data).
 */
const normalizeVehiclesPayload = (raw) => {
    const payload = raw?.data?.data ?? raw?.data ?? raw;
    const list = Array.isArray(payload?.vehicles) ? payload.vehicles : Array.isArray(payload) ? payload : [];
    return list.map(mapVehicleItem).filter(Boolean);
};

export default function CheckIn() {
    useScrollToTop(); // Hook tự động cuộn lên đầu trang khi component mount
    const navigate = useNavigate();
    const location = useLocation();

    // Lấy mã booking từ state của router
    const [bookingCode] = useState(() => {
        const code = location?.state?.bookingCode ?? location?.state?.booking?.bookingCode ?? '';
        return String(code || '');
    });

    // Quản lý trạng thái danh sách xe và xe đang được chọn
    const [vehicles, setVehicles] = useState([]);
    const [isVehiclesLoading, setIsVehiclesLoading] = useState(false);
    const [selectedVehicleId, setSelectedVehicleId] = useState('');

    // Quản lý trạng thái khi nhân viên chọn "Thêm xe mới" thay vì chọn xe có sẵn
    const [isAddingNewVehicle, setIsAddingNewVehicle] = useState(false);
    const previousVehicleIdRef = useRef(''); // Lưu lại ID xe cũ để khôi phục nếu hủy thêm mới

    // Các state lưu thông tin chi tiết của xe (dùng khi thêm mới hoặc hiển thị xe đã chọn)
    const [licensePlate, setLicensePlate] = useState('');
    const [vehicleMake, setVehicleMake] = useState('');
    const [vehicleModel, setVehicleModel] = useState('');
    const [vehicleYear, setVehicleYear] = useState('');

    // State lưu trữ thông tin booking sau khi lookup từ hệ thống
    const [booking, setBooking] = useState(() => location?.state?.booking ?? null);
    const [isLookupLoading, setIsLookupLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false); // Trạng thái khi đang tạo phiếu dịch vụ
    const [isCreatingVehicle, setIsCreatingVehicle] = useState(false); // Trạng thái khi đang tạo xe mới
    const [odometerKm, setOdometerKm] = useState(''); // Số km hiện tại nhân viên nhập
    const [lastOdometerKm, setLastOdometerKm] = useState(null); // Số km lần trước (từ hệ thống)
    const [damageNote, setDamageNote] = useState(''); // Ghi chú hư hỏng bên ngoài

    // State quản lý 7 loại ảnh chụp tình trạng xe (Lưu cả File, Blob URL để preview và DataUrl để gửi đi)
    const [photos, setPhotos] = useState(() => ({
        licensePlatePhoto: { file: null, url: '', dataUrl: '' },
        photoFront: { file: null, url: '', dataUrl: '' },
        photoRear: { file: null, url: '', dataUrl: '' },
        photoLeftSide: { file: null, url: '', dataUrl: '' },
        photoRightSide: { file: null, url: '', dataUrl: '' },
        photoInterior: { file: null, url: '', dataUrl: '' },
        photoDamage: { file: null, url: '', dataUrl: '' },
    }));

    // Ghi chú chi tiết cho từng bức ảnh chụp các góc độ xe
    const [photoDescriptions, setPhotoDescriptions] = useState(() => ({
        photoFrontDescription: '',
        photoRearDescription: '',
        photoLeftSideDescription: '',
        photoRightSideDescription: '',
        photoInteriorDescription: '',
        photoDamageDescription: '',
    }));

    // Ref dùng để theo dõi state photos mới nhất trong hàm cleanup (tránh rò rỉ bộ nhớ)
    const photosRef = useRef(photos);

    const notify = useCallback((message) => toast(message, { containerId: 'app-toast' }), []);

    // Hiển thị thời gian hẹn và danh sách tên dịch vụ từ thông tin booking
    const scheduledTimeDisplay = booking?.scheduledTime ? (formatTimeHHmm(booking.scheduledTime) || '-') : '-';

    const servicesDisplay = useMemo(() => {
        const services = Array.isArray(booking?.services) ? booking.services : [];
        const names = services.map((s) => s?.serviceName).filter(Boolean);
        return names.length ? names.join(', ') : '-';
    }, [booking?.services]);

    // Xử lý logic số Odometer: Chuyển đổi chuỗi nhập liệu thành số nguyên an toàn
    const odometerNumber = useMemo(() => {
        const normalized = String(odometerKm || '').replaceAll(/\D/g, '');
        if (!normalized) return null;
        const n = Number(normalized);
        return Number.isFinite(n) ? n : null;
    }, [odometerKm]);

    // Kiểm tra xem số km mới có thấp hơn số km cũ không để đưa ra cảnh báo cho nhân viên
    const isOdometerLower = useMemo(() => {
        if (odometerNumber == null) return false;
        if (lastOdometerKm == null) return false;
        return odometerNumber < lastOdometerKm;
    }, [odometerNumber, lastOdometerKm]);

    // Đồng bộ ref mỗi khi state photos thay đổi
    useEffect(() => {
        photosRef.current = photos;
    }, [photos]);

    // Cleanup: Giải phóng các Blob URL (Object URL) khi đóng component để tránh treo bộ nhớ trình duyệt
    useEffect(() => {
        return () => {
            const current = photosRef.current || {};
            Object.values(current).forEach((p) => {
                if (p?.url) URL.revokeObjectURL(p.url);
            });
        };
    }, []);

    // Đọc file ảnh dưới dạng Data URL (Base64) để phục vụ việc gửi dữ liệu hoặc hiển thị
    const readFileAsDataUrl = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
            reader.onerror = () => reject(new Error('Không thể đọc file ảnh'));
            reader.readAsDataURL(file);
        });
    };

    // Kích hoạt cửa sổ chọn file bằng cách click vào input ẩn
    const handlePickPhoto = (key) => {
        const input = document.getElementById(`checkin-${key}`);
        input?.click?.();
    };

    // Xử lý khi người dùng chọn xong ảnh: Tạo preview URL và đọc Base64
    const handlePhotoChange = async (key, file) => {
        if (!file?.type?.startsWith('image/')) return;

        const url = URL.createObjectURL(file); // Tạo URL tạm thời để hiển thị img src
        let dataUrl = '';
        try {
            dataUrl = await readFileAsDataUrl(file);
        } catch {
            dataUrl = '';
        }

        setPhotos((prev) => {
            const prevUrl = prev?.[key]?.url;
            if (prevUrl) URL.revokeObjectURL(prevUrl); // Xóa URL cũ để tối ưu bộ nhớ
            return {
                ...prev,
                [key]: { file, url, dataUrl },
            };
        });
    };

    // Xóa ảnh đã chọn và giải phóng tài nguyên liên quan
    const handleRemovePhoto = (key) => {
        setPhotos((prev) => {
            const prevUrl = prev?.[key]?.url;
            if (prevUrl) URL.revokeObjectURL(prevUrl);
            return {
                ...prev,
                [key]: { file: null, url: '', dataUrl: '' },
            };
        });
    };

    // Chuẩn hóa dữ liệu booking lấy từ API Lookup
    const mapLookupPayload = (payload) => {
        if (!payload) return null;
        const customer = payload.customer || payload.customerInfo || payload.customerProfile || {};
        const customerId =
            payload.customerId ??
            customer?.customerId ??
            customer?.id ??
            payload.customer?.id ??
            null;

        const bookingId = payload.bookingId ?? payload.id ?? payload.booking?.bookingId ?? payload.booking?.id ?? null;
        const bookingCodeVal = payload.bookingCode ?? payload.booking?.bookingCode ?? payload.code ?? '';

        return {
            bookingId,
            bookingCode: bookingCodeVal ?? '',
            scheduledDate: payload.scheduledDate ?? '',
            scheduledTime: payload.scheduledTime ?? '',
            customerId,
            customerName: payload.customerName ?? customer?.fullName ?? payload.fullName ?? '',
            customerPhone: payload.customerPhone ?? customer?.phone ?? payload.phone ?? '',
            customerEmail: payload.customerEmail ?? customer?.email ?? payload.email ?? null,
            services: Array.isArray(payload.services) ? payload.services : [],
        };
    };

    // Hàm gọi API để lấy thông tin chi tiết về booking dựa trên mã code
    const handleLookupBooking = async () => {
        const code = String(bookingCode || '').trim();
        if (!code) return;

        try {
            setIsLookupLoading(true);
            const token = localStorage.getItem('authToken');
            const response = await lookupCheckInByBookingCode(code, token);
            const payload = response?.data?.data ?? response?.data ?? response;
            setBooking(mapLookupPayload(payload));
        } catch (err) {
            notify(err?.message || 'Không thể tải thông tin booking.');
            setBooking(null);
            setLastOdometerKm(null);
        } finally {
            setIsLookupLoading(false);
        }
    };

    // Tự động tìm kiếm booking khi trang vừa được load
    useEffect(() => {
        const code = String(bookingCode || '').trim();
        if (!code) return;
        handleLookupBooking();
    }, []);

    // Xác định thông tin xe đang được chọn trong danh sách để hiển thị chi tiết
    const selectedVehicle = useMemo(() => {
        const id = String(selectedVehicleId || '').trim();
        if (!id) return null;
        return vehicles.find((v) => String(v?.vehicleId) === id) ?? null;
    }, [selectedVehicleId, vehicles]);

    // Khi đổi xe trong danh sách, cập nhật các field thông tin tương ứng
    useEffect(() => {
        if (isAddingNewVehicle) return;
        if (!selectedVehicle) return;
        setLicensePlate(String(selectedVehicle.licensePlate || '').trim());
        setVehicleMake(String(selectedVehicle.make || '').trim());
        setVehicleModel(String(selectedVehicle.model || '').trim());
        setVehicleYear(selectedVehicle.year ? String(selectedVehicle.year) : '');

        const lastKm = selectedVehicle.lastOdometerReading;
        setLastOdometerKm(lastKm == null ? null : Number(lastKm) || null);
    }, [isAddingNewVehicle, selectedVehicle]);

    // Tự động tải danh sách xe của khách hàng ngay sau khi tìm thấy thông tin booking
    useEffect(() => {
        const customerId = booking?.customerId ?? null;
        if (!customerId) {
            setVehicles([]);
            setSelectedVehicleId('');
            setIsAddingNewVehicle(false);
            setLicensePlate('');
            setVehicleMake('');
            setVehicleModel('');
            setVehicleYear('');
            setLastOdometerKm(null);
            return;
        }

        let cancelled = false;
        const run = async () => {
            try {
                setIsVehiclesLoading(true);
                const token = localStorage.getItem('authToken');
                const response = await fetchCheckInCustomerVehicles(customerId, token);
                const list = normalizeVehiclesPayload(response);
                if (cancelled) return;

                setVehicles(list);
                if (!list.length) {
                    setSelectedVehicleId('');
                    setLastOdometerKm(null);
                    setIsAddingNewVehicle(false);
                    setLicensePlate('');
                    setVehicleMake('');
                    setVehicleModel('');
                    setVehicleYear('');
                    return;
                }

                // Mặc định chọn xe đầu tiên trong danh sách nếu có
                setIsAddingNewVehicle(false);
                setSelectedVehicleId(String(list[0].vehicleId));
            } catch (err) {
                if (cancelled) return;
                notify(err?.message || 'Không thể tải danh sách xe của khách hàng.');
                setVehicles([]);
                setSelectedVehicleId('');
                setLastOdometerKm(null);
            } finally {
                if (!cancelled) setIsVehiclesLoading(false);
            }
        };

        run();
        return () => {
            cancelled = true; // Chặn cập nhật state nếu component đã unmount
        };
    }, [booking?.customerId, notify]);

    // Chuyển sang giao diện thêm xe mới
    const startAddNewVehicle = () => {
        previousVehicleIdRef.current = String(selectedVehicleId || '');
        setIsAddingNewVehicle(true);
        setSelectedVehicleId('');
        setLastOdometerKm(null);
        setLicensePlate('');
        setVehicleMake('');
        setVehicleModel('');
        setVehicleYear('');
    };

    // Quay lại danh sách xe hiện có
    const stopAddNewVehicle = () => {
        setIsAddingNewVehicle(false);
        const restored = previousVehicleIdRef.current;
        const restoredExists = restored && vehicles.some((v) => String(v?.vehicleId) === String(restored));
        const nextId = restoredExists ? restored : vehicles?.[0]?.vehicleId ? String(vehicles[0].vehicleId) : '';
        setSelectedVehicleId(nextId);
    };

    // Xử lý gọi API tạo xe mới cho khách hàng
    const handleCreateVehicle = async () => {
        if (isCreatingVehicle || isSubmitting) return;

        const customerIdRaw = booking?.customerId ?? null;
        const customerId = Number(customerIdRaw) || 0;
        if (!customerId) {
            notify('Thiếu thông tin khách hàng. Vui lòng tải lại trang.');
            return;
        }

        const licensePlateValue = String(licensePlate || '').trim();
        if (!licensePlateValue) {
            notify('Vui lòng nhập biển số cho xe mới.');
            return;
        }

        const yearValue = Number(String(vehicleYear || '').replaceAll(/\D/g, '')) || 0;
        if (yearValue && yearValue < 1900) {
            notify('Năm sản xuất không hợp lệ.');
            return;
        }

        const createPayload = {
            customerId,
            licensePlate: licensePlateValue,
            make: String(vehicleMake || '').trim(),
            model: String(vehicleModel || '').trim(),
            ...(yearValue ? { year: yearValue } : {}),
        };

        try {
            setIsCreatingVehicle(true);
            const token = localStorage.getItem('authToken');
            const response = await createCheckInVehicle(createPayload, token);
            const result = response?.data?.data ?? response?.data ?? response;
            const data = result?.data ?? result;

            const newVehicle = mapVehicleItem(data);
            const newVehicleId = Number(newVehicle?.vehicleId) || 0;
            if (!newVehicleId) {
                notify('Tạo xe thất bại, không nhận được vehicleId.');
                return;
            }

            // Thêm xe vừa tạo vào danh sách hiển thị và tự động chọn nó
            setVehicles((prev) => {
                const list = Array.isArray(prev) ? prev : [];
                const withoutDup = list.filter((v) => Number(v?.vehicleId) !== newVehicleId);
                return [newVehicle, ...withoutDup];
            });

            setIsAddingNewVehicle(false);
            setSelectedVehicleId(String(newVehicleId));
            setLastOdometerKm(newVehicle?.lastOdometerReading == null ? null : Number(newVehicle.lastOdometerReading) || null);
            notify('Đã thêm xe mới.');
        } catch (err) {
            notify(err?.message || 'Không thể tạo xe mới.');
        } finally {
            setIsCreatingVehicle(false);
        }
    };

    /** * Hàm render giao diện cho từng ô chọn ảnh.
     * Tái sử dụng cho cả 7 góc chụp để giữ code gọn gàng.
     */
    const renderPhotoPicker = ({
        keyName,
        label,
        descriptionKey,
        descriptionLabel,
        withDescription,
    }) => {
        const photo = photos?.[keyName];
        const hasPhoto = Boolean(photo?.url);

        return (
            <div className={styles.photoItem}>
                <div className={styles.photoLabel}>{label}</div>
                {hasPhoto && (
                    <div className={styles.imageSlot}>
                        <img className={styles.previewImg} src={photo.url} alt={label} />
                        <button
                            type="button"
                            className={styles.removeBtn}
                            onClick={() => handleRemovePhoto(keyName)}
                            aria-label="Xóa ảnh"
                        >
                            ×
                        </button>
                    </div>
                )}

                <input
                    id={`checkin-${keyName}`}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        handlePhotoChange(keyName, file);
                        e.target.value = ''; // Reset để có thể chọn lại cùng 1 file
                    }}
                    style={{ display: 'none' }}
                />

                <div className={styles.photoActions}>
                    <button type="button" className="ui-btn" onClick={() => handlePickPhoto(keyName)}>
                        Chọn ảnh
                    </button>
                </div>

                {withDescription && descriptionKey && (
                    <div className="ui-field" style={{ marginBottom: 0 }}>
                        <label htmlFor={`checkin-${descriptionKey}`}>{descriptionLabel || 'Mô tả'}</label>
                        <textarea
                            id={`checkin-${descriptionKey}`}
                            value={photoDescriptions?.[descriptionKey] ?? ''}
                            onChange={(e) =>
                                setPhotoDescriptions((prev) => ({
                                    ...prev,
                                    [descriptionKey]: e.target.value,
                                }))
                            }
                            placeholder=""
                        />
                    </div>
                )}
            </div>
        );
    };

    const handleCancel = () => navigate(-1);

    /** * Xử lý xác nhận cuối cùng: Tổng hợp dữ liệu và gửi API tạo phiếu dịch vụ.
     * Sử dụng định dạng Multipart để gửi kèm các file ảnh thực tế.
     */
    const handleConfirm = async () => {
        if (isSubmitting) return;

        const code = String(bookingCode || '').trim();
        if (!code) {
            notify('Thiếu bookingCode, vui lòng quay lại danh sách booking.');
            return;
        }

        const bookingIdRaw = booking?.bookingId ?? null;
        const customerIdRaw = booking?.customerId ?? null;
        const bookingId = Number(bookingIdRaw) || 0;
        const customerId = Number(customerIdRaw) || 0;

        if (!bookingId || !customerId) {
            notify('Thiếu thông tin booking/khách hàng (ID không hợp lệ). Vui lòng tải lại trang.');
            return;
        }

        if (isAddingNewVehicle) {
            notify('Vui lòng xác nhận thêm xe mới trước khi tiếp nhận.');
            return;
        }

        const existingVehicleId = Number(selectedVehicle?.vehicleId) || 0;
        if (!existingVehicleId) {
            notify('Vui lòng chọn xe của khách hàng.');
            return;
        }

        // Lấy thông tin nhân viên thực hiện từ session/localStorage
        const staffProfileRaw = localStorage.getItem('staffProfile');
        let staffId = 0;
        try {
            const staffProfile = staffProfileRaw ? JSON.parse(staffProfileRaw) : null;
            staffId = Number(staffProfile?.staffId) || 0;
        } catch {
            staffId = 0;
        }

        // Chuẩn bị payload chứa thông tin chữ
        const payload = {
            bookingId,
            customerId,
            vehicleId: existingVehicleId,
            licensePlate: String(selectedVehicle?.licensePlate || '').trim(),
            make: String(selectedVehicle?.make || '').trim(),
            model: String(selectedVehicle?.model || '').trim(),
            year: Number(selectedVehicle?.year) || 0,
            licensePlatePhoto: photos?.licensePlatePhoto?.dataUrl || '',
            photoFront: photos?.photoFront?.dataUrl || '',
            photoFrontDescription: String(photoDescriptions?.photoFrontDescription || '').trim(),
            photoRear: photos?.photoRear?.dataUrl || '',
            photoRearDescription: String(photoDescriptions?.photoRearDescription || '').trim(),
            photoLeftSide: photos?.photoLeftSide?.dataUrl || '',
            photoLeftSideDescription: String(photoDescriptions?.photoLeftSideDescription || '').trim(),
            photoRightSide: photos?.photoRightSide?.dataUrl || '',
            photoRightSideDescription: String(photoDescriptions?.photoRightSideDescription || '').trim(),
            photoInterior: photos?.photoInterior?.dataUrl || '',
            photoInteriorDescription: String(photoDescriptions?.photoInteriorDescription || '').trim(),
            photoDamage: photos?.photoDamage?.dataUrl || '',
            photoDamageDescription: String(photoDescriptions?.photoDamageDescription || '').trim(),
            odometerReading: Number(odometerNumber) || 0,
            checkInNotes: String(damageNote || '').trim(),
            staffId: Number(staffId) || 0,
        };

        try {
            setIsSubmitting(true);
            const token = localStorage.getItem('authToken');

            // Tổng hợp các file ảnh thực tế để gửi Multipart
            const photoFiles = {
                licensePlatePhoto: photos?.licensePlatePhoto?.file ?? null,
                photoFront: photos?.photoFront?.file ?? null,
                photoRear: photos?.photoRear?.file ?? null,
                photoLeftSide: photos?.photoLeftSide?.file ?? null,
                photoRightSide: photos?.photoRightSide?.file ?? null,
                photoInterior: photos?.photoInterior?.file ?? null,
                photoDamage: photos?.photoDamage?.file ?? null,
            };

            const response = await completeAllCheckInMultipart(payload, photoFiles, token);
            const data = response?.data?.data ?? response?.data ?? response;
            const ticketCode = data?.ticketCode || '';
            notify(ticketCode ? `Tạo phiếu thành công: ${ticketCode}` : 'Tạo phiếu thành công');
        } catch (err) {
            notify(err?.message || 'Tạo phiếu thất bại, vui lòng thử lại.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.page}>
            {/* Phần Header: Hiển thị thông tin khách hàng và dịch vụ từ Booking */}
            <div className={styles.header}>
                <h1 className={styles.title}>Tiếp nhận xe và tạo phiếu dịch vụ</h1>
                <div className={styles.infoList}>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Khách hàng:</span>
                        <span className={styles.infoValue}>{booking?.customerName || '-'}</span>
                    </div>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Số điện thoại:</span>
                        <span className={styles.infoValue}>{booking?.customerPhone || '-'}</span>
                    </div>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Dịch vụ:</span>
                        <span className={styles.infoValue}>{servicesDisplay}</span>
                    </div>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Giờ hẹn:</span>
                        <span className={styles.infoValue}>{scheduledTimeDisplay}</span>
                    </div>
                </div>
            </div>

            <div className={styles.card}>
                {/* Step 1: Lựa chọn xe của khách hoặc đăng ký xe mới cho khách */}
                <section className={styles.step}>
                    <h2 className={styles.stepTitle}>Step 1: Chọn xe</h2>
                    <div className={styles.stepRow}>
                        <div className="ui-field" style={{ marginBottom: 0 }}>
                            <label htmlFor={isAddingNewVehicle ? 'licensePlate' : 'vehicleSelect'}>
                                {isAddingNewVehicle ? 'Biển số xe (mới)' : 'Xe của khách'}
                            </label>

                            {isAddingNewVehicle ? (
                                <input
                                    id="licensePlate"
                                    value={licensePlate}
                                    onChange={(e) => setLicensePlate(e.target.value)}
                                    placeholder="Biển số xe"
                                    autoComplete="off"
                                />
                            ) : (
                                <select
                                    id="vehicleSelect"
                                    value={selectedVehicleId}
                                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                                    disabled={isVehiclesLoading || !vehicles.length}
                                >
                                    <option value="" disabled>
                                        {isVehiclesLoading
                                            ? 'Đang tải danh sách xe...'
                                            : vehicles.length
                                                ? 'Chọn xe'
                                                : 'Khách hàng chưa có xe'}
                                    </option>
                                    {vehicles.map((v) => {
                                        const modelText = [v?.make, v?.model, v?.year].filter(Boolean).join(' ');
                                        const optionLabel = modelText ? `${v?.licensePlate} - ${modelText}` : String(v?.licensePlate || '');
                                        return (
                                            <option key={v.vehicleId} value={String(v.vehicleId)}>
                                                {optionLabel}
                                            </option>
                                        );
                                    })}
                                </select>
                            )}
                        </div>

                        <div className={styles.vehicleActions}>
                            {!isAddingNewVehicle ? (
                                <button
                                    type="button"
                                    className="ui-btn"
                                    onClick={startAddNewVehicle}
                                    disabled={isVehiclesLoading}
                                >
                                    Thêm xe mới
                                </button>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        className="ui-btn ui-btn--primary"
                                        onClick={handleCreateVehicle}
                                        disabled={isCreatingVehicle || isSubmitting || isVehiclesLoading}
                                    >
                                        {isCreatingVehicle ? 'Đang thêm xe...' : 'Xác nhận thêm xe'}
                                    </button>
                                    <button
                                        type="button"
                                        className="ui-btn ui-btn--ghost"
                                        onClick={stopAddNewVehicle}
                                        disabled={isCreatingVehicle || isSubmitting || isVehiclesLoading}
                                    >
                                        Chọn từ danh sách
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {!isVehiclesLoading && !isAddingNewVehicle && !vehicles.length && (
                        <div className={styles.warningBox}>Khách hàng chưa có xe. Vui lòng thêm xe mới để tiếp nhận.</div>
                    )}

                    {/* Form nhập thông tin chi tiết xe mới */}
                    {isAddingNewVehicle && (
                        <div className={styles.vehicleFormGrid}>
                            <div className="ui-field" style={{ marginBottom: 0 }}>
                                <label htmlFor="vehicleMake">Hãng xe</label>
                                <input
                                    id="vehicleMake"
                                    value={vehicleMake}
                                    onChange={(e) => setVehicleMake(e.target.value)}
                                    placeholder="Ví dụ: Toyota"
                                    autoComplete="off"
                                />
                            </div>
                            <div className="ui-field" style={{ marginBottom: 0 }}>
                                <label htmlFor="vehicleModel">Dòng xe</label>
                                <input
                                    id="vehicleModel"
                                    value={vehicleModel}
                                    onChange={(e) => setVehicleModel(e.target.value)}
                                    placeholder="Ví dụ: Camry"
                                    autoComplete="off"
                                />
                            </div>
                            <div className="ui-field" style={{ marginBottom: 0 }}>
                                <label htmlFor="vehicleYear">Năm sản xuất</label>
                                <input
                                    id="vehicleYear"
                                    inputMode="numeric"
                                    value={vehicleYear}
                                    onChange={(e) => setVehicleYear(e.target.value)}
                                    placeholder="Ví dụ: 2020"
                                    autoComplete="off"
                                />
                            </div>
                        </div>
                    )}

                    <div className={styles.hint}>
                        {isLookupLoading
                            ? 'Đang tải thông tin booking...'
                            : isVehiclesLoading
                                ? 'Đang tải danh sách xe...'
                                : !isAddingNewVehicle && selectedVehicle
                                    ? `Xe đã chọn: ${selectedVehicle.licensePlate || '-'}${selectedVehicle.lastServiceDate ? ` (lần bảo dưỡng gần nhất: ${selectedVehicle.lastServiceDate})` : ''}`
                                    : 'Thông tin booking'}
                    </div>

                    <div style={{ marginTop: 12 }}>
                        {renderPhotoPicker({
                            keyName: 'licensePlatePhoto',
                            label: 'Ảnh biển số',
                            withDescription: false,
                        })}
                    </div>
                </section>

                {/* Step 2: Nhập số Km hiện tại và kiểm tra tính hợp lệ so với lần trước */}
                <section className={styles.step}>
                    <h2 className={styles.stepTitle}>Step 2: Ghi số Odometer</h2>
                    <div className="ui-field" style={{ marginBottom: 0 }}>
                        <label htmlFor="odometer">Số km hiện tại</label>
                        <input
                            id="odometer"
                            inputMode="numeric"
                            value={odometerKm}
                            onChange={(e) => setOdometerKm(e.target.value)}
                            placeholder="Số km hiện tại"
                            autoComplete="off"
                        />
                    </div>
                    {lastOdometerKm != null && (
                        <div className={styles.hint}>Số km lần trước: {Number(lastOdometerKm).toLocaleString('vi-VN')}</div>
                    )}
                    {isOdometerLower && (
                        <div className={styles.warningBox}>Số km thấp hơn lần trước, vui lòng xác nhận</div>
                    )}
                </section>

                {/* Step 3: Chụp ảnh hiện trạng xe để làm bằng chứng lúc tiếp nhận */}
                <section className={styles.step}>
                    <h2 className={styles.stepTitle}>Step 3: Chụp ảnh tình trạng xe</h2>
                    <div className={styles.photoGrid}>
                        {renderPhotoPicker({
                            keyName: 'photoFront',
                            label: 'Ảnh phía trước',
                            withDescription: true,
                            descriptionKey: 'photoFrontDescription',
                            descriptionLabel: 'Mô tả ảnh phía trước',
                        })}
                        {renderPhotoPicker({
                            keyName: 'photoRear',
                            label: 'Ảnh phía sau',
                            withDescription: true,
                            descriptionKey: 'photoRearDescription',
                            descriptionLabel: 'Mô tả ảnh phía sau',
                        })}
                        {renderPhotoPicker({
                            keyName: 'photoLeftSide',
                            label: 'Ảnh bên trái',
                            withDescription: true,
                            descriptionKey: 'photoLeftSideDescription',
                            descriptionLabel: 'Mô tả ảnh bên trái',
                        })}
                        {renderPhotoPicker({
                            keyName: 'photoRightSide',
                            label: 'Ảnh bên phải',
                            withDescription: true,
                            descriptionKey: 'photoRightSideDescription',
                            descriptionLabel: 'Mô tả ảnh bên phải',
                        })}
                        {renderPhotoPicker({
                            keyName: 'photoInterior',
                            label: 'Ảnh nội thất',
                            withDescription: true,
                            descriptionKey: 'photoInteriorDescription',
                            descriptionLabel: 'Mô tả ảnh nội thất',
                        })}
                        {renderPhotoPicker({
                            keyName: 'photoDamage',
                            label: 'Ảnh hư hỏng',
                            withDescription: true,
                            descriptionKey: 'photoDamageDescription',
                            descriptionLabel: 'Mô tả ảnh hư hỏng',
                        })}
                    </div>

                    <div className="ui-field" style={{ marginTop: 12, marginBottom: 0 }}>
                        <label htmlFor="damageNote">Ghi chú hư hỏng</label>
                        <textarea
                            id="damageNote"
                            value={damageNote}
                            onChange={(e) => setDamageNote(e.target.value)}
                            placeholder="Ghi chú hư hỏng"
                        />
                    </div>
                </section>

                {/* Footer: Các nút điều hướng Hủy/Xác nhận */}
                <div className={styles.actions}>
                    <button type="button" className="ui-btn ui-btn--ghost" onClick={handleCancel}>
                        Hủy
                    </button>
                    <div className={styles.actionsRight}>
                        <button
                            type="button"
                            className="ui-btn ui-btn--primary"
                            onClick={handleConfirm}
                            disabled={isSubmitting }
                        >
                            {isSubmitting ? 'Đang tạo phiếu...' : 'Xác nhận tiếp nhận'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}