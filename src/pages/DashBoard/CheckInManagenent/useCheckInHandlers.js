import { useCallback } from 'react';


import {
    completeAllCheckInMultipart,
    createCheckInVehicle,
    lookupCheckInByBookingCode,
} from '../../../services/checkInService.js';
import {
    validateFixedDigitsYear,
    validateLicensePlateStrict,
    validateTextInput,
    validatePositiveNumber,
} from '../../../components/inputValidation.js';

// Đọc role của nhân viên từ localStorage, chuẩn hóa thành mảng các string (chữ hoa).
const readStaffRolesFromStorage = () => {
    try {
        const raw = localStorage.getItem('staffRoles');
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((r) => typeof r === 'string')
            .map((r) => r.trim().toUpperCase())
            .filter(Boolean);
    } catch {
        return [];
    }
};

const CHECKIN_DESCRIPTION_FIELDS = Object.freeze([
    { key: 'photoFrontDescription', label: 'Mô tả ảnh phía trước' },
    { key: 'photoRearDescription', label: 'Mô tả ảnh phía sau' },
    { key: 'photoLeftSideDescription', label: 'Mô tả ảnh bên trái' },
    { key: 'photoRightSideDescription', label: 'Mô tả ảnh bên phải' },
    { key: 'photoInteriorDescription', label: 'Mô tả ảnh nội thất' },
    { key: 'photoDamageDescription', label: 'Mô tả ảnh hư hỏng' },
]);

const validateCheckInForm = ({ selectedVehicle, odometerNumber, damageNote, photoDescriptions }) => {
    const plate = validateLicensePlateStrict(selectedVehicle?.licensePlate);
    if (plate.error) return { error: plate.error };

    const odometer = validatePositiveNumber(odometerNumber, {
        fieldLabel: 'Số km hiện tại',
        required: false,
        integer: true,
    });
    if (odometer.error) return { error: odometer.error };

    const damage = validateTextInput(damageNote, {
        fieldLabel: 'Ghi chú hư hỏng',
        required: false,
        maxLength: 255,
        trim: true,
    });
    if (damage.error) return { error: damage.error };

    const descriptions = {};
    for (const f of CHECKIN_DESCRIPTION_FIELDS) {
        const v = validateTextInput(photoDescriptions?.[f.key], {
            fieldLabel: f.label,
            required: false,
            maxLength: 255,
            trim: true,
        });
        if (v.error) return { error: v.error };
        descriptions[f.key] = v.value;
    }

    return {
        error: '',
        licensePlate: plate.value,
        odometerValue: odometer.value,
        checkInNotes: damage.value,
        descriptions,
    };
};


/** Chuẩn hóa thông tin từng xe từ dữ liệu thô của API.
 * Đảm bảo các trường thông tin quan trọng như ID, biển số luôn có giá trị mặc định.
 */
export const mapVehicleItem = (item) => {
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
export const normalizeVehiclesPayload = (raw) => {
    const payload = raw?.data?.data ?? raw?.data ?? raw;
    let list = [];
    if (Array.isArray(payload?.vehicles)) list = payload.vehicles;
    else if (Array.isArray(payload)) list = payload;
    return list.map(mapVehicleItem).filter(Boolean);
};


// Chuẩn hóa dữ liệu booking lấy từ API Lookup
export const mapLookupPayload = (payload) => {
    if (!payload) return null;
    const customer = payload.customer || payload.customerInfo || payload.customerProfile || {};
    const customerId = payload.customerId ?? customer?.customerId ?? customer?.id ?? payload.customer?.id ?? null;


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
        serviceCategory: payload.serviceCategory ?? payload.category ?? '',
        items: Array.isArray(payload.items) ? payload.items : [],
        parts: Array.isArray(payload.parts) ? payload.parts : [],
        partItems: Array.isArray(payload.partItems) ? payload.partItems : [],
        services: Array.isArray(payload.services) ? payload.services : [],
    };
};


// Đọc file ảnh dưới dạng Data URL (Base64) để phục vụ việc gửi dữ liệu hoặc hiển thị
export const readFileAsDataUrl = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => reject(new Error('Không thể đọc file ảnh'));
        reader.readAsDataURL(file);
    });
};


export function useCheckInHandlers({
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
})
{
    const handlePickPhoto = useCallback((key) => {
        const input = document.getElementById(`checkin-${key}`);
        input?.click?.();
    }, []);


    const handlePhotoChange = useCallback(
        async (key, file) => {
            if (!file?.type?.startsWith('image/')) return;


            const url = URL.createObjectURL(file);
            let dataUrl = '';
            try {
                dataUrl = await readFileAsDataUrl(file);
            } catch {
                dataUrl = '';
            }


            setPhotos((prev) => {
                const prevUrl = prev?.[key]?.url;
                if (prevUrl) URL.revokeObjectURL(prevUrl);
                return {
                    ...prev,
                    [key]: { file, url, dataUrl },
                };
            });
        },
        [setPhotos],
    );


    const handleRemovePhoto = useCallback(
        (key) => {
            setPhotos((prev) => {
                const prevUrl = prev?.[key]?.url;
                if (prevUrl) URL.revokeObjectURL(prevUrl);
                return {
                    ...prev,
                    [key]: { file: null, url: '', dataUrl: '' },
                };
            });
        },
        [setPhotos],
    );


    const handleLookupBooking = useCallback(async () => {
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
    }, [bookingCode, notify, setBooking, setIsLookupLoading, setLastOdometerKm]);


    const startAddNewVehicle = useCallback(() => {
        previousVehicleIdRef.current = String(selectedVehicleId || '');
        setIsAddingNewVehicle(true);
        setSelectedVehicleId('');
        setLastOdometerKm(null);
        setLicensePlate('');
        setVehicleMake('');
        setVehicleModel('');
        setVehicleYear('');
    }, [
        previousVehicleIdRef,
        selectedVehicleId,
        setIsAddingNewVehicle,
        setLastOdometerKm,
        setLicensePlate,
        setSelectedVehicleId,
        setVehicleMake,
        setVehicleModel,
        setVehicleYear,
    ]);


    const stopAddNewVehicle = useCallback(() => {
        setIsAddingNewVehicle(false);
        const restored = previousVehicleIdRef.current;
        const restoredExists = restored && vehicles.some((v) => String(v?.vehicleId) === String(restored));
        let nextId = '';
        if (restoredExists) nextId = restored;
        else if (vehicles?.[0]?.vehicleId) nextId = String(vehicles[0].vehicleId);
        setSelectedVehicleId(nextId);
    }, [previousVehicleIdRef, setIsAddingNewVehicle, setSelectedVehicleId, vehicles]);


    const handleCreateVehicle = useCallback(async () => {
        if (isCreatingVehicle || isSubmitting) return;


        const customerIdRaw = booking?.customerId ?? null;
        const customerId = Number(customerIdRaw) || 0;
        if (!customerId) {
            notify('Thiếu thông tin khách hàng. Vui lòng tải lại trang.');
            return;
        }


        const plateValidation = validateLicensePlateStrict(licensePlate);
        if (plateValidation.error) {
            notify(plateValidation.error);
            return;
        }
        const licensePlateValue = plateValidation.value;

        const makeValidation = validateTextInput(vehicleMake, {
            fieldLabel: 'Hãng xe',
            required: false,
            maxLength: 100,
            trim: true,
        });
        if (makeValidation.error) {
            notify(makeValidation.error);
            return;
        }

        const modelValidation = validateTextInput(vehicleModel, {
            fieldLabel: 'Dòng xe',
            required: false,
            maxLength: 100,
            trim: true,
        });
        if (modelValidation.error) {
            notify(modelValidation.error);
            return;
        }

        const yearValidation = validateFixedDigitsYear(vehicleYear, {
            fieldLabel: 'Năm sản xuất',
            required: false,
            digits: 4,
            min: 1900,
            max: 9999,
        });
        if (yearValidation.error) {
            notify(yearValidation.error);
            return;
        }
        const hasYearValue = Number.isInteger(yearValidation.value);

        const createPayload = {
            customerId,
            licensePlate: licensePlateValue,
            make: makeValidation.value,
            model: modelValidation.value,
            ...(hasYearValue ? { year: yearValidation.value } : {}),
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


            setVehicles((prev) => {
                const list = Array.isArray(prev) ? prev : [];
                const withoutDup = list.filter((v) => Number(v?.vehicleId) !== newVehicleId);
                return [newVehicle, ...withoutDup];
            });


            setIsAddingNewVehicle(false);
            setSelectedVehicleId(String(newVehicleId));
            setLastOdometerKm(
                newVehicle?.lastOdometerReading == null ? null : Number(newVehicle.lastOdometerReading) || null,
            );
            notify('Đã thêm xe mới.');
        } catch (err) {
            notify(err?.message || 'Không thể tạo xe mới.');
        } finally {
            setIsCreatingVehicle(false);
        }
    }, [
        booking?.customerId,
        isCreatingVehicle,
        isSubmitting,
        licensePlate,
        notify,
        setIsAddingNewVehicle,
        setIsCreatingVehicle,
        setLastOdometerKm,
        setSelectedVehicleId,
        setVehicles,
        vehicleMake,
        vehicleModel,
        vehicleYear,
    ]);


    const handleCancel = useCallback(() => navigate(-1), [navigate]);


    const handleConfirm = useCallback(async () => {
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

        const validated = validateCheckInForm({
            selectedVehicle,
            odometerNumber,
            damageNote,
            photoDescriptions,
        });
        if (validated.error) {
            notify(validated.error);
            return;
        }


        const staffProfileRaw = localStorage.getItem('staffProfile');
        let staffId = 0;
        try {
            const staffProfile = staffProfileRaw ? JSON.parse(staffProfileRaw) : null;
            staffId = Number(staffProfile?.staffId) || 0;
        } catch {
            staffId = 0;
        }


        const payload = {
            bookingId,
            customerId,
            vehicleId: existingVehicleId,
            licensePlate: validated.licensePlate,
            make: String(selectedVehicle?.make || '').trim(),
            model: String(selectedVehicle?.model || '').trim(),
            year: Number(selectedVehicle?.year) || 0,
           
            safetyInspection: safetyInspection ? 'true' : 'false',
            advisorId: Number(selectedAdvisorId) || null,
            licensePlatePhoto: photos?.licensePlatePhoto?.dataUrl || '',
            photoFront: photos?.photoFront?.dataUrl || '',
            photoFrontDescription: validated.descriptions.photoFrontDescription,
            photoRear: photos?.photoRear?.dataUrl || '',
            photoRearDescription: validated.descriptions.photoRearDescription,
            photoLeftSide: photos?.photoLeftSide?.dataUrl || '',
            photoLeftSideDescription: validated.descriptions.photoLeftSideDescription,
            photoRightSide: photos?.photoRightSide?.dataUrl || '',
            photoRightSideDescription: validated.descriptions.photoRightSideDescription,
            photoInterior: photos?.photoInterior?.dataUrl || '',
            photoInteriorDescription: validated.descriptions.photoInteriorDescription,
            photoDamage: photos?.photoDamage?.dataUrl || '',
            photoDamageDescription: validated.descriptions.photoDamageDescription,
            odometerReading: validated.odometerValue,
            checkInNotes: validated.checkInNotes,
            staffId: Number(staffId) || 0,
        };


        try {
            setIsSubmitting(true);
            const token = localStorage.getItem('authToken');


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

            const staffRoles = readStaffRolesFromStorage();
            navigate(staffRoles.includes('ADVISOR') ? '/advisor/inspection' : '/booking-management');
        } catch (err) {
            notify(err?.message || 'Tạo phiếu thất bại, vui lòng thử lại.');
        } finally {
            setIsSubmitting(false);
        }
    }, [
        booking?.bookingId,
        booking?.customerId,
        bookingCode,
        damageNote,
        isAddingNewVehicle,
        isSubmitting,
        navigate,
        notify,
        odometerNumber,
        photoDescriptions,
        photos,
        safetyInspection,
        selectedAdvisorId,
        selectedVehicle,
        setIsSubmitting,
    ]);


    return {
        handlePickPhoto,
        handlePhotoChange,
        handleRemovePhoto,
        handleLookupBooking,
        startAddNewVehicle,
        stopAddNewVehicle,
        handleCreateVehicle,
        handleCancel,
        handleConfirm,
    };
}



