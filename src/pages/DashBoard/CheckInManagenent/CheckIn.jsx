import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import styles from './CheckIn.module.css';
import { formatTimeHHmm } from '../../../components/timeUtils.js';
import { fetchCheckInAdvisors, fetchCheckInCustomerVehicles } from '../../../services/checkInService.js';
import { toast } from 'react-toastify';
import { normalizeVehiclesPayload, useCheckInHandlers } from './useCheckInHandlers.js';
const CONDITION_PHOTO_KEYS = [
    'photoFront',
    'photoRear',
    'photoLeftSide',
    'photoRightSide',
    'photoInterior',
    'photoDamage',
];
const DESCRIPTION_MAX_LENGTH = 255;

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

    // Thông tin bổ sung cho phiếu dịch vụ (chưa có backend)
        const [safetyInspection, setSafetyInspection] = useState(false);
    const [selectedAdvisorId, setSelectedAdvisorId] = useState('');

    // Advisors for receptionist check-in
    const [advisors, setAdvisors] = useState([]);
    const [isAdvisorsLoading, setIsAdvisorsLoading] = useState(false);

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

    const advisorPlaceholder = useMemo(() => {
        if (isAdvisorsLoading) return 'Đang tải danh sách tư vấn viên...';
        if (advisors.length) return 'Chọn tư vấn viên';
        return 'Không có tư vấn viên';
    }, [advisors.length, isAdvisorsLoading]);

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

    const damageNoteLength = useMemo(() => String(damageNote || '').length, [damageNote]);
    const damageNoteRemaining = useMemo(() => Math.max(0, DESCRIPTION_MAX_LENGTH - damageNoteLength), [damageNoteLength]);

    const descriptionLengths = useMemo(() => {
        const result = {};
        const keys = [
            'photoFrontDescription', 'photoRearDescription', 'photoLeftSideDescription',
            'photoRightSideDescription', 'photoInteriorDescription', 'photoDamageDescription',
        ];
        keys.forEach(key => {
            const len = String(photoDescriptions?.[key] || '').length;
            result[key] = Math.max(0, DESCRIPTION_MAX_LENGTH - len);
        });
        return result;
    }, [photoDescriptions]);

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

    // Xác định thông tin xe đang được chọn trong danh sách để hiển thị chi tiết
    const selectedVehicle = useMemo(() => {
        const id = String(selectedVehicleId || '').trim();
        if (!id) return null;
        return vehicles.find((v) => String(v?.vehicleId) === id) ?? null;
    }, [selectedVehicleId, vehicles]);

    const {
		handlePickPhoto,
		handlePhotoChange,
		handleRemovePhoto,
		handleLookupBooking,
		startAddNewVehicle,
		stopAddNewVehicle,
		handleCreateVehicle,
		handleCancel,
		handleConfirm,
	} = useCheckInHandlers({
		bookingCode,
		booking,
		vehicles,
		selectedVehicle,
		selectedVehicleId,
		isAddingNewVehicle,
		isCreatingVehicle,
		isSubmitting,
		licensePlate,
		vehicleMake,
		vehicleModel,
		vehicleYear,
        safetyInspection,
        selectedAdvisorId,
		photos,
		photoDescriptions,
		odometerNumber,
		damageNote,
		previousVehicleIdRef,
		notify,
		navigate,

		setBooking,
		setLastOdometerKm,
		setIsLookupLoading,
		setVehicles,
		setIsAddingNewVehicle,
		setSelectedVehicleId,
		setLicensePlate,
		setVehicleMake,
		setVehicleModel,
		setVehicleYear,
		setIsCreatingVehicle,
		setIsSubmitting,
		setPhotos,
	});

    // Load danh sách tư vấn viên cho receptionist check-in 
    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            try {
                setIsAdvisorsLoading(true);
                const token = localStorage.getItem('authToken');
                const response = await fetchCheckInAdvisors(token);
                const payload = response?.data?.data ?? response?.data ?? response;
                const list = Array.isArray(payload) ? payload : [];

                const normalized = list
                    .map((item) => {
                        if (!item) return null;
                        return {
                            staffId: item.staffId ?? item.id ?? 0,
                            fullName: item.fullName ?? item.name ?? '',
                            phone: item.phone ?? '',
                            avatar: item.avatar ?? '',
                            roles: Array.isArray(item.roles) ? item.roles : [],
                        };
                    })
                    .filter(Boolean);

                if (cancelled) return;
                setAdvisors(normalized);
            } catch (err) {
                if (cancelled) return;
                setAdvisors([]);
                notify(err?.message || 'Không thể tải danh sách tư vấn viên.');
            } finally {
                if (!cancelled) setIsAdvisorsLoading(false);
            }
        };

        run();
        return () => {
            cancelled = true;
        };
    }, [notify]);

    const handleConfirmWithValidation = useCallback(() => {
        const hasLicensePlatePhoto = Boolean(
            photos?.licensePlatePhoto?.file || photos?.licensePlatePhoto?.url || photos?.licensePlatePhoto?.dataUrl,
        );

        if (!hasLicensePlatePhoto) {
            notify('Vui lòng chụp ảnh biển số (Bước 1) trước khi tiếp nhận.');
            return;
        }

        const hasAnyConditionPhoto = CONDITION_PHOTO_KEYS.some((key) => {
            const p = photos?.[key];
            return Boolean(p?.file || p?.url || p?.dataUrl);
        });

        if (!hasAnyConditionPhoto) {
            notify('Vui lòng chụp ít nhất 1 ảnh tình trạng xe (Bước 4) trước khi tiếp nhận.');
            return;
        }

        handleConfirm();
    }, [handleConfirm, notify, photos]);

    // Tự động tìm kiếm booking khi trang vừa được load
    useEffect(() => {
        const code = String(bookingCode || '').trim();
        if (!code) return;
        handleLookupBooking();
    }, [bookingCode, handleLookupBooking]);

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


    /** * Hàm render giao diện cho từng ô chọn ảnh.
     * Tái sử dụng cho cả 7 góc chụp để giữ code gọn gàng.
     */
    const renderPhotoPicker = ({
        keyName,
        label,
        descriptionKey,
        descriptionLabel,
        withDescription,
        labelClassName,
        required,
    }) => {
        const photo = photos?.[keyName];
        const hasPhoto = Boolean(photo?.url);

        return (
            <div className={styles.photoItem}>
                <div className={`${styles.photoLabel} ${labelClassName || ''}`.trim()}>
                    {label}
                    {required ? <span className={styles.required}>*</span> : null}
                </div>
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
                            maxLength={DESCRIPTION_MAX_LENGTH}
                            placeholder=""
                        />
                        <div className={styles['char-count']}>{descriptionLengths[descriptionKey]} ký tự còn lại</div>
                    </div>
                )}
            </div>
        );
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
                    <h2 className={styles.stepTitle}>Bước 1: Chọn xe (<span className={styles.required}>*</span>)</h2>
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
                                    onChange={(e) =>
                                        setVehicleYear(String(e.target.value || '').replaceAll(/\D/g, '').slice(0, 4))
                                    }
                                    maxLength={4}
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
                            labelClassName: styles.photoLabelFieldLike,
                            withDescription: false,
                            required: true,
                        })}
                    </div>
                </section>

                {/* Step 2: Nhập số Km hiện tại và kiểm tra tính hợp lệ so với lần trước */}
                <section className={styles.step}>
                    <h2 className={styles.stepTitle}>Bước 2: Ghi số Odometer</h2>
                    <div className="ui-field" style={{ marginBottom: 0 }}>
                        <label htmlFor="odometer">Số km hiện tại</label>
                        <input
                            id="odometer"
                            inputMode="numeric"
                            value={odometerKm}
                            onChange={(e) => setOdometerKm(String(e.target.value || '').replaceAll(/\D/g, ''))}
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

                {/* Step 3: Thông tin bổ sung cho phiếu dịch vụ  */}
                <section className={styles.step}>
                    <h2 className={styles.stepTitle}>Bước 3: Thông tin phiếu dịch vụ (<span className={styles.required}>*</span>)</h2>
                    <div className={styles.ticketFormGrid}>
                        <div className="ui-field" style={{ marginBottom: 0 }}>
                            <label htmlFor="safetyInspection">Kiểm tra an toàn</label>
                                <div id="safetyInspection" style={{ display: 'flex', gap: 16, alignItems: 'center', height: 40 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                                        <input
                                            type="radio"
                                            name="safetyInspection"
                                            value="false"
                                            checked={!safetyInspection}
                                            onChange={() => setSafetyInspection(false)}
                                        />
                                        <span>Không</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                                        <input
                                            type="radio"
                                            name="safetyInspection"
                                            value="true"
                                            checked={safetyInspection}
                                            onChange={() => setSafetyInspection(true)}
                                        />
                                        <span>Có</span>
                                    </label>
                                </div>
                        </div>

                        <div className="ui-field" style={{ marginBottom: 0 }}>
                            <label htmlFor="advisorSelect">Tư vấn viên</label>
                            <select
                                id="advisorSelect"
                                value={selectedAdvisorId}
                                onChange={(e) => setSelectedAdvisorId(e.target.value)}
                                disabled={isAdvisorsLoading || !advisors.length}
                            >
                                <option value="">{advisorPlaceholder}</option>
                                {advisors.map((a) => (
                                    <option key={String(a.staffId)} value={String(a.staffId)}>
                                        {a.fullName || `#${a.staffId}`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </section>

                {/* Step 4: Chụp ảnh hiện trạng xe để làm bằng chứng lúc tiếp nhận */}
                <section className={styles.step}>
                    <h2 className={styles.stepTitle}>Bước 4: Chụp ảnh tình trạng xe( Yêu cầu phải có ít nhất 1 ảnh tình trạng xe!)</h2>
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
                            maxLength={DESCRIPTION_MAX_LENGTH}
                            placeholder="Ghi chú hư hỏng"
                        />
                        <div className={styles['char-count']}>{damageNoteRemaining} ký tự còn lại</div>
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
                            onClick={handleConfirmWithValidation}
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