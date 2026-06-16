import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import styles from './CheckIn.module.css';
import { formatTimeHHmm } from '../../../components/timeUtils.js';
import { fetchCheckInAdvisors, fetchCheckInCustomerVehicles } from '../../../services/checkInService.js';
import { toast } from 'react-toastify';
import { normalizeVehiclesPayload, useCheckInHandlers } from './useCheckInHandlers.js';
import { validateLicensePlateStrict } from '../../../components/inputValidation.js';
const CONDITION_PHOTO_KEYS = [
    'photoFront',
    'photoRear',
    'photoLeftSide',
    'photoRightSide',
    'photoInterior',
    'photoDamage',
];
const DESCRIPTION_MAX_LENGTH = 255;

const getItemTypeText = (item) => {
    return String(
        item?.__forcedType
        ?? item?.itemType
        ?? item?.type
        ?? item?.catalogItemType
        ?? item?.productType
        ?? item?.categoryType
        ?? item?.itemCategoryType
        ?? item?.catalogItem?.itemType
        ?? item?.itemCategory?.categoryType
        ?? item?.itemCategory?.itemType
        ?? item?.category?.categoryType
        ?? item?.category?.itemType
        ?? '',
    ).trim();
};

const hasPartText = (value) => {
    const text = String(value || '').trim().toLowerCase();
    if (!text) return false;
    return (
        text.includes('part')
        || text.includes('product')
        || text.includes('spare')
        || text.includes('phụ tùng')
        || text.includes('phu tung')
    );
};

const normalizeSearchText = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .replaceAll('đ', 'd')
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '');

const hasPartNameSignal = (value) => {
    const text = normalizeSearchText(value);
    if (!text || text.includes('dich vu')) return false;

    return (
        text.includes('phu tung')
        || text.includes('lop')
        || text.includes('vo xe')
        || text.includes('tire')
        || text.includes('tyre')
        || text.includes('miche')
        || text.includes('bridgestone')
        || text.includes('goodyear')
        || text.includes('continental')
        || text.includes('pirelli')
        || text.includes('yokohama')
        || text.includes('maxxis')
        || text.includes('gat mua')
        || text.includes('can gat')
        || text.includes('dau nhot')
        || text.includes('nhot')
        || text.includes('dau may')
        || text.includes('ac quy')
        || text.includes('loc dau')
        || text.includes('loc gio')
        || text.includes('loc dieu hoa')
        || text.includes('bugi')
        || text.includes('bong den')
        || text.includes('nuoc lam mat')
        || text.includes('ma phanh')
        || /\b\d{1,2}w[-\s]?\d{2}\b/.test(text)
    );
};

const hasPartSignal = (item) => {
    return Boolean(
        item?.partId
        || item?.productId
        || item?.sparePartId
        || hasPartText(item?.itemCategoryName)
        || hasPartText(item?.categoryName)
        || hasPartText(item?.categoryCode)
        || hasPartText(item?.itemCategoryCode)
        || hasPartText(item?.catalogItem?.itemCategoryName)
        || hasPartText(item?.itemCategory?.categoryName)
        || hasPartText(item?.category?.categoryName)
        || hasPartNameSignal(getBookingItemName(item))
    );
};

const normalizeBookingItemType = (item) => {
    const text = getItemTypeText(item).toUpperCase();
    if (text === 'SERVICE') return 'SERVICE';
    if (
        text === 'PART'
        || text === 'PRODUCT'
        || text === 'SPARE_PART'
        || text === 'SPAREPART'
        || text === 'ACCESSORY'
        || text === 'EQUIPMENT'
        || hasPartText(text)
    ) {
        return 'PART';
    }
    if (hasPartSignal(item)) return 'PART';
    return 'SERVICE';
};

const getBookingItemName = (item) => {
    return String(
        item?.serviceName
        ?? item?.itemName
        ?? item?.name
        ?? item?.title
        ?? item?.catalogItemName
        ?? item?.partName
        ?? item?.productName
        ?? '',
    ).trim();
};

const collectBookingItems = (booking) => {
    const sources = [
        { list: booking?.services },
        { list: booking?.items },
        { list: booking?.bookingItems },
        { list: booking?.selectedItems },
        { list: booking?.serviceItems, forcedType: 'SERVICE' },
        { list: booking?.parts, forcedType: 'PART' },
        { list: booking?.partItems, forcedType: 'PART' },
    ];

    const map = new Map();
    sources.forEach(({ list, forcedType }) => {
        if (!Array.isArray(list)) return;
        list.forEach((item) => {
            if (!item) return;
            const normalized = forcedType ? { ...item, __forcedType: forcedType } : item;
            const name = getBookingItemName(normalized);
            if (!name) return;
            const id = normalized?.itemId ?? normalized?.catalogItemId ?? normalized?.serviceId ?? normalized?.partId ?? normalized?.id ?? '';
            const key = String(id || name).trim();
            const existing = map.get(key);
            if (!existing || normalizeBookingItemType(existing) !== 'PART') {
                map.set(key, normalized);
            }
        });
    });

    return Array.from(map.values());
};

const hasBookingCatalogItems = (booking) => {
    if (!booking) return false;
    return [
        booking?.services,
        booking?.items,
        booking?.bookingItems,
        booking?.selectedItems,
        booking?.serviceItems,
        booking?.parts,
        booking?.partItems,
    ].some((list) => Array.isArray(list) && list.length > 0);
};

const mergeBookingSnapshotForDisplay = (booking, snapshot) => {
    if (!snapshot) return booking;
    if (hasBookingCatalogItems(booking)) return booking;
    return {
        ...(booking || {}),
        selectedItems: Array.isArray(snapshot?.selectedItems)
            ? snapshot.selectedItems
            : booking?.selectedItems,
        serviceItems: Array.isArray(snapshot?.serviceItems)
            ? snapshot.serviceItems
            : Array.isArray(snapshot?.services)
                ? snapshot.services
                : booking?.serviceItems,
        parts: Array.isArray(snapshot?.parts) ? snapshot.parts : booking?.parts,
        partItems: Array.isArray(snapshot?.partItems) ? snapshot.partItems : booking?.partItems,
    };
};

import { VEHICLE_MAKES, POPULAR_MODELS, yearsList } from '../../../components/vehicleConstants.js';

export default function CheckIn() {
    useScrollToTop(); // Hook tự động cuộn lên đầu trang khi component mount
    const navigate = useNavigate();
    const location = useLocation();

    // Lấy mã booking từ state của router
    const [bookingCode] = useState(() => {
        const code = location?.state?.bookingCode ?? location?.state?.booking?.bookingCode ?? '';
        return String(code || '');
    });

    // Trạng thái thu gọn/mở rộng header thông tin đặt lịch
    const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);

    // Quản lý trạng thái danh sách xe và xe đang được chọn
    const [vehicles, setVehicles] = useState([]);
    const [isVehiclesLoading, setIsVehiclesLoading] = useState(false);
    const [selectedVehicleId, setSelectedVehicleId] = useState('');

    // Quản lý trạng thái khi nhân viên chọn "Thêm xe mới" thay vì chọn xe có sẵn
    const [isAddingNewVehicle, setIsAddingNewVehicle] = useState(false);
    const previousVehicleIdRef = useRef(''); // Lưu lại ID xe cũ để khôi phục nếu hủy thêm mới

    // States cho popup thêm xe mới
    const [modalStep, setModalStep] = useState(1);
    const [makeSearch, setMakeSearch] = useState('');
    const wheelRef = useRef(null);
    const scrollTimeoutRef = useRef(null);

    // Các state lưu thông tin chi tiết của xe (dùng khi thêm mới hoặc hiển thị xe đã chọn)
    const [licensePlate, setLicensePlate] = useState('');
    const [vehicleMake, setVehicleMake] = useState('');
    const [vehicleModel, setVehicleModel] = useState('');
    const [vehicleYear, setVehicleYear] = useState('');
    const [vehicleMakeError, setVehicleMakeError] = useState('');

    // State lưu trữ thông tin booking sau khi lookup từ hệ thống
    const [booking, setBooking] = useState(() => location?.state?.booking ?? null);
    const bookingSnapshot = useMemo(() => location?.state?.booking ?? null, [location?.state?.booking]);
    const [isLookupLoading, setIsLookupLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false); // Trạng thái khi đang tạo phiếu dịch vụ
    const [isCreatingVehicle, setIsCreatingVehicle] = useState(false); // Trạng thái khi đang tạo xe mới
    const [odometerKm, setOdometerKm] = useState(''); // Số km hiện tại nhân viên nhập
    const [lastOdometerKm, setLastOdometerKm] = useState(null); // Số km lần trước (từ hệ thống)

    // Thông tin bổ sung cho phiếu dịch vụ (chưa có backend)
    const [safetyInspection, setSafetyInspection] = useState(true);
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

    // State for photo zoom preview modal
    const [zoomedPhotoUrl, setZoomedPhotoUrl] = useState(null);

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

    const bookingItems = useMemo(() => {
        return collectBookingItems(mergeBookingSnapshotForDisplay(booking, bookingSnapshot));
    }, [booking, bookingSnapshot]);

    const serviceItemNames = useMemo(() => {
        return bookingItems
            .filter((item) => normalizeBookingItemType(item) === 'SERVICE')
            .map(getBookingItemName)
            .filter(Boolean);
    }, [bookingItems]);

    const partItemNames = useMemo(() => {
        return bookingItems
            .filter((item) => normalizeBookingItemType(item) === 'PART')
            .map(getBookingItemName)
            .filter(Boolean);
    }, [bookingItems]);

    const servicesDisplay = serviceItemNames.length ? serviceItemNames.join(', ') : (booking?.serviceCategory || '-');
    const partsDisplay = partItemNames.join(', ');

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
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
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

    const handleOpenVehicleModal = useCallback(() => {
        setModalStep(1);
        setMakeSearch('');
        startAddNewVehicle(); // Gọi handler có sẵn để xóa thông tin xe cũ
    }, [startAddNewVehicle]);

    const licensePlateError = useMemo(() => {
        if (!licensePlate) return '';
        const validation = validateLicensePlateStrict(licensePlate);
        return validation.error;
    }, [licensePlate]);

    const filteredMakes = useMemo(() => {
        const q = String(makeSearch || '').trim().toUpperCase();
        if (!q) return VEHICLE_MAKES;
        return VEHICLE_MAKES.filter(make => make.toUpperCase().includes(q));
    }, [makeSearch]);

    const suggestedModels = useMemo(() => {
        const make = String(vehicleMake || '').trim().toUpperCase();
        return POPULAR_MODELS[make] || [];
    }, [vehicleMake]);

    const handleSelectMake = useCallback((make) => {
        const plate = String(licensePlate || '').trim();
        if (!plate) {
            notify('Vui lòng nhập biển số xe trước khi chọn thương hiệu.');
            return;
        }
        const validation = validateLicensePlateStrict(licensePlate);
        if (validation.error) {
            notify(validation.error);
            return;
        }
        setVehicleMake(make);
        setModalStep(2);
    }, [licensePlate, notify, setVehicleMake]);

    const handleSelectModel = useCallback((model) => {
        setVehicleModel(model);
        setModalStep(3);
    }, [setVehicleModel]);

    const handleNextStepFrom2 = useCallback(() => {
        const model = String(vehicleModel || '').trim();
        if (!model) {
            notify('Vui lòng nhập hoặc chọn dòng xe.');
            return;
        }
        setModalStep(3);
    }, [vehicleModel, notify]);

    const handlePrevStep = useCallback(() => {
        setModalStep((prev) => Math.max(1, prev - 1));
    }, []);

    const handleWheelScroll = useCallback((e) => {
        const scrollTop = e.target.scrollTop;
        const index = Math.round(scrollTop / 44);
        if (index >= 0 && index < yearsList.length) {
            const year = yearsList[index];
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
            scrollTimeoutRef.current = setTimeout(() => {
                setVehicleYear(String(year));
            }, 80);
        }
    }, [setVehicleYear]);

    const handleSelectYear = useCallback((y, index) => {
        setVehicleYear(String(y));
        if (wheelRef.current) {
            wheelRef.current.scrollTo({
                top: index * 44,
                behavior: 'smooth'
            });
        }
    }, [setVehicleYear]);

    // Tự động căn giữa năm đã chọn trong con lăn khi mở bước 3 (chỉ chạy một lần lúc mở bước)
    useEffect(() => {
        if (modalStep === 3) {
            const targetYear = vehicleYear || '2020';
            const idx = yearsList.indexOf(Number(targetYear));
            if (idx !== -1) {
                const timer = setTimeout(() => {
                    if (wheelRef.current) {
                        wheelRef.current.scrollTop = idx * 44;
                    }
                }, 80);
                return () => clearTimeout(timer);
            }
        }
    }, [modalStep]);

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
        handleConfirm();
    }, [handleConfirm]);

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
        setVehicleMakeError('');

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
        className,
    }) => {
        const photo = photos?.[keyName];
        const hasPhoto = Boolean(photo?.url);

        return (
            <div className={`${styles.photoItem} ${className || ''}`.trim()}>
                <div className={`${styles.photoLabel} ${labelClassName || ''}`.trim()}>
                    {label}
                    {required ? <span className={styles.required}>*</span> : null}
                </div>
                {hasPhoto && (
                    <div className={styles.imageSlot} onClick={() => setZoomedPhotoUrl(photo.url)} style={{ cursor: 'zoom-in' }}>
                        <img className={styles.previewImg} src={photo.url} alt={label} />
                        <button
                            type="button"
                            className={styles.removeBtn}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRemovePhoto(keyName);
                            }}
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
                <div className={styles.headerTop}>
                    <div className={styles.headerTitleGroup}>
                        <span className={styles.headerBadgeIcon}>🚗</span>
                        <h1 className={styles.title}>Tiếp nhận & Tạo phiếu</h1>
                        <span className={styles.headerSeparator}>•</span>
                        <div className={styles.headerInfoInline}>
                            <span className={styles.infoItem}>
                                <span className={styles.infoLabel}>KH:</span>
                                <span className={styles.infoValue}>{booking?.customerName || '-'}</span>
                            </span>
                            <span className={styles.infoItem}>
                                <span className={styles.infoLabel}>SĐT:</span>
                                <span className={styles.infoValue}>{booking?.customerPhone || '-'}</span>
                            </span>
                            <span className={styles.infoItem}>
                                <span className={styles.infoLabel}>Hẹn:</span>
                                <span className={styles.infoValue}>{scheduledTimeDisplay}</span>
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        className={`${styles.toggleHeaderBtn} ui-btn ui-btn--ghost`}
                        onClick={() => setIsHeaderExpanded((prev) => !prev)}
                    >
                        {isHeaderExpanded ? 'Thu gọn' : 'Chi tiết DV/PT'}
                    </button>
                </div>
                {isHeaderExpanded && (
                    <div className={styles.expandedDrawer}>
                        <div className={styles.drawerItem}>
                            <span className={styles.drawerLabel}>Dịch vụ đã chọn:</span>
                            <span className={styles.drawerValue}>{servicesDisplay}</span>
                        </div>
                        <div className={styles.drawerItem}>
                            <span className={styles.drawerLabel}>Phụ tùng yêu cầu:</span>
                            <span className={styles.drawerValue}>{partsDisplay || '-'}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className={styles.card}>
                {/* Step 1: Lựa chọn xe của khách hoặc đăng ký xe mới cho khách */}
                <section className={styles.stepCard}>
                    <div className={styles.stepHeader}>
                        <div className={styles.stepBadge}>1</div>
                        <h2 className={styles.stepTitle}>Chọn xe<span className={styles.required}>*</span></h2>
                    </div>
                    <div className={styles.twoColGrid}>
                        {/* Cột trái: Lựa chọn xe */}
                        <div>
                            <div className={styles.stepRow}>
                                <div className="ui-field" style={{ marginBottom: 0 }}>
                                    <label htmlFor="vehicleSelect">Xe của khách</label>
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
                                </div>

                                <div className={styles.vehicleActions}>
                                    <button
                                        type="button"
                                        className="ui-btn ui-btn--primary"
                                        onClick={handleOpenVehicleModal}
                                        disabled={isVehiclesLoading}
                                    >
                                        Thêm xe mới
                                    </button>
                                </div>
                            </div>

                            {!isVehiclesLoading && !isAddingNewVehicle && !vehicles.length && (
                                <div className={styles.warningBox}>Khách hàng chưa có xe. Vui lòng thêm xe mới để tiếp nhận.</div>
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
                        </div>

                        {/* Cột phải: Ảnh biển số */}
                        <div className="ui-field" style={{ marginBottom: 0 }}>
                            <label htmlFor="checkin-licensePlatePhoto">Ảnh biển số</label>
                            <div className={styles.compactPhotoField}>
                                {photos.licensePlatePhoto?.url ? (
                                    <div className={styles.compactPhotoPreviewWrapper}>
                                        <div 
                                            className={styles.compactPhotoPreview} 
                                            onClick={() => setZoomedPhotoUrl(photos.licensePlatePhoto.url)}
                                            style={{ cursor: 'zoom-in' }}
                                        >
                                            <img src={photos.licensePlatePhoto.url} alt="Biển số" />
                                        </div>
                                        <button
                                            type="button"
                                            className={styles.compactRemoveBtn}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemovePhoto('licensePlatePhoto');
                                            }}
                                            aria-label="Xóa ảnh"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ) : null}

                                <input
                                    id="checkin-licensePlatePhoto"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] ?? null;
                                        handlePhotoChange('licensePlatePhoto', file);
                                        e.target.value = ''; // Reset
                                    }}
                                    style={{ display: 'none' }}
                                />

                                <button 
                                    type="button" 
                                    className="ui-btn ui-btn--ghost" 
                                    onClick={() => handlePickPhoto('licensePlatePhoto')}
                                    style={{ flex: 1, minHeight: '44px', padding: '8px 16px' }}
                                >
                                    {photos.licensePlatePhoto?.url ? 'Thay đổi' : 'Chọn ảnh'}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Step 2: Thông tin phiếu dịch vụ & Số Odometer */}
                <section className={styles.stepCard}>
                    <div className={styles.stepHeader}>
                        <div className={styles.stepBadge}>2</div>
                        <h2 className={styles.stepTitle}>Bước 2: Thông tin phiếu dịch vụ &amp; Số Odometer<span className={styles.required}>*</span></h2>
                    </div>
                    <div className={styles.twoColGrid}>
                        {/* Cột Odometer */}
                        <div>
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
                                <div className={styles.warningBox} style={{ marginTop: 8 }}>Số km thấp hơn lần trước, vui lòng xác nhận</div>
                            )}
                        </div>

                        {/* Cột Tư vấn viên */}
                        <div className="ui-field" style={{ marginBottom: 0 }}>
                            <label htmlFor="advisorSelect">Tư vấn viên<span className={styles.required}>*</span></label>
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

                {/* Step 3: Chụp ảnh hiện trạng xe để làm bằng chứng lúc tiếp nhận */}
                <section className={styles.stepCard}>
                    <div className={styles.stepHeader}>
                        <div className={styles.stepBadge}>3</div>
                        <h2 className={styles.stepTitle}>Bước 3: Chụp ảnh tình trạng xe</h2>
                    </div>
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
                </section>
            </div>

            {/* Footer: Các nút điều hướng Hủy/Xác nhận */}
            <div className={styles.actions}>
                <button type="button" className={`ui-btn ${styles.cancelBtn}`} onClick={handleCancel}>
                    Hủy
                </button>
                <div className={styles.actionsRight}>
                    <button
                        type="button"
                        className="ui-btn ui-btn--primary"
                        onClick={handleConfirmWithValidation}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Đang tạo...' : 'Xác nhận'}
                    </button>
                </div>
            </div>

            {/* Modal popup thêm xe mới */}
            {isAddingNewVehicle && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContainer}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>Thêm xe mới cho khách</h3>
                            <button type="button" className={styles.closeBtn} onClick={stopAddNewVehicle}>&times;</button>
                        </div>
                        
                        {/* Stepper progress */}
                        <div className={styles.modalStepper}>
                            <div className={`${styles.modalStepIndicator} ${modalStep >= 1 ? styles.modalStepIndicatorActive : ''}`}>
                                <span className={styles.indicatorNumber}>1</span>
                                <span className={styles.indicatorLabel}>Thương hiệu</span>
                            </div>
                            <div className={styles.modalStepLine} />
                            <div className={`${styles.modalStepIndicator} ${modalStep >= 2 ? styles.modalStepIndicatorActive : ''}`}>
                                <span className={styles.indicatorNumber}>2</span>
                                <span className={styles.indicatorLabel}>Dòng xe</span>
                            </div>
                            <div className={styles.modalStepLine} />
                            <div className={`${styles.modalStepIndicator} ${modalStep >= 3 ? styles.modalStepIndicatorActive : ''}`}>
                                <span className={styles.indicatorNumber}>3</span>
                                <span className={styles.indicatorLabel}>Năm sản xuất</span>
                            </div>
                        </div>

                        <div className={styles.modalBody}>
                            {modalStep === 1 && (
                                <div className={styles.modalStepContent}>
                                    <div className="ui-field" style={{ marginBottom: 0 }}>
                                        <label htmlFor="modalLicensePlate">Biển số xe<span className={styles.required}>*</span></label>
                                        <input
                                            id="modalLicensePlate"
                                            value={licensePlate}
                                            onChange={(e) => setLicensePlate(e.target.value)}
                                            placeholder="Ví dụ: 29A12345"
                                            autoComplete="off"
                                            autoFocus
                                        />
                                        {licensePlateError ? (
                                            <div className={styles.inputErrorMsg}>{licensePlateError}</div>
                                        ) : null}
                                    </div>
                                    <div className="ui-field">
                                        <label htmlFor="modalMakeSearch">Tìm thương hiệu xe</label>
                                        <input
                                            id="modalMakeSearch"
                                            value={makeSearch}
                                            onChange={(e) => setMakeSearch(e.target.value)}
                                            placeholder="Nhập tên thương hiệu (ví dụ: Toyota)"
                                            autoComplete="off"
                                        />
                                    </div>
                                    <div className={styles.brandListContainer}>
                                        <div className={styles.brandGrid}>
                                            {filteredMakes.length > 0 ? (
                                                filteredMakes.map((make) => (
                                                    <button
                                                        key={make}
                                                        type="button"
                                                        className={`${styles.brandBtn} ${vehicleMake === make ? styles.brandBtnActive : ''}`}
                                                        onClick={() => handleSelectMake(make)}
                                                    >
                                                        {make}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className={styles.noResults}>Không tìm thấy thương hiệu nào</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {modalStep === 2 && (
                                <div className={styles.modalStepContent}>
                                    <div className={styles.selectedMeta}>
                                        <span>Thương hiệu đã chọn: <strong>{vehicleMake}</strong></span>
                                    </div>
                                    <div className="ui-field">
                                        <label htmlFor="modalModelInput">Dòng xe (Nhập tay hoặc chọn dưới đây)<span className={styles.required}>*</span></label>
                                        <input
                                            id="modalModelInput"
                                            value={vehicleModel}
                                            onChange={(e) => setVehicleModel(e.target.value)}
                                            placeholder="Nhập dòng xe (Ví dụ: Camry)"
                                            autoComplete="off"
                                            autoFocus
                                        />
                                    </div>
                                    <div className={styles.modelListTitle}>Dòng xe gợi ý:</div>
                                    <div className={styles.modelListContainer}>
                                        <div className={styles.modelGrid}>
                                            {suggestedModels.length > 0 ? (
                                                suggestedModels.map((model) => (
                                                    <button
                                                        key={model}
                                                        type="button"
                                                        className={`${styles.modelBtn} ${vehicleModel === model ? styles.modelBtnActive : ''}`}
                                                        onClick={() => handleSelectModel(model)}
                                                    >
                                                        {model}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className={styles.noResults}>Không có gợi ý cho thương hiệu này, vui lòng nhập tay ở trên.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {modalStep === 3 && (
                                <div className={styles.modalStepContent}>
                                    <div className={styles.selectedMeta}>
                                        <span>Thương hiệu: <strong>{vehicleMake}</strong> • Dòng xe: <strong>{vehicleModel}</strong></span>
                                    </div>
                                    <div className="ui-field" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <label style={{ textAlign: 'center', marginBottom: 12 }}>
                                            Năm sản xuất đã chọn: <strong className={styles.yearHighlight}>{vehicleYear || 'Chưa chọn'}</strong>
                                        </label>
                                        <div className={styles.wheelContainer}>
                                            <div className={styles.wheelIndicator} />
                                            <div 
                                                className={styles.wheelList} 
                                                ref={wheelRef} 
                                                onScroll={handleWheelScroll}
                                            >
                                                {yearsList.map((y, index) => (
                                                    <div 
                                                        key={y} 
                                                        className={`${styles.wheelItem} ${String(vehicleYear) === String(y) ? styles.wheelItemActive : ''}`}
                                                        onClick={() => handleSelectYear(y, index)}
                                                    >
                                                        {y}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={styles.modalFooter}>
                            {modalStep === 1 && (
                                <button type="button" className="ui-btn ui-btn--ghost" onClick={stopAddNewVehicle}>Hủy</button>
                            )}
                            {modalStep > 1 && (
                                <button type="button" className="ui-btn ui-btn--ghost" onClick={handlePrevStep}>Quay lại</button>
                            )}
                            
                            <div className={styles.footerRight}>
                                {modalStep === 2 && (
                                    <button 
                                        type="button" 
                                        className="ui-btn ui-btn--primary" 
                                        onClick={handleNextStepFrom2}
                                        disabled={!vehicleModel.trim()}
                                    >
                                        Tiếp tục
                                    </button>
                                )}
                                {modalStep === 3 && (
                                    <button 
                                        type="button" 
                                        className="ui-btn ui-btn--primary" 
                                        onClick={handleCreateVehicle}
                                        disabled={isCreatingVehicle || !vehicleYear}
                                    >
                                        {isCreatingVehicle ? 'Đang thêm...' : 'Xác nhận thêm xe'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox photo zoom modal */}
            {zoomedPhotoUrl && (
                <div className={styles.zoomModal} onClick={() => setZoomedPhotoUrl(null)}>
                    <div className={styles.zoomModalContent} onClick={(e) => e.stopPropagation()}>
                        <img src={zoomedPhotoUrl} alt="Zoomed view" className={styles.zoomImg} />
                        <button 
                            type="button" 
                            className={styles.zoomCloseBtn} 
                            onClick={() => setZoomedPhotoUrl(null)}
                        >
                            &times;
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
