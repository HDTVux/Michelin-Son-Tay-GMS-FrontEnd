import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import styles from './CheckIn.module.css';

function formatViDateTime(value) {
    if (!value) return '-';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('vi-VN');
}

export default function CheckIn() {
    useScrollToTop();
    const navigate = useNavigate();
    const location = useLocation();
// Giới hạn số lượng ảnh chụp tình trạng xe 
    const MAX_VEHICLE_IMAGES = 6;

    const [licensePlate, setLicensePlate] = useState('');
    const [booking, setBooking] = useState(() => location?.state?.booking ?? null);   // Thông tin đặt chỗ tìm được từ hệ thống
    const [odometerKm, setOdometerKm] = useState('');
    const [lastOdometerKm, setLastOdometerKm] = useState(null);
    const [damageNote, setDamageNote] = useState('');

    const fileInputRef = useRef(null);
    const vehicleImagesRef = useRef([]);// Dùng ref để cleanup URL khi unmount hoặc khi ảnh bị xóa, tránh rò rỉ bộ nhớ do URL.createObjectURL tạo ra.
    const [vehicleImages, setVehicleImages] = useState([]); // [{ file, url }]

    const appointmentTimeDisplay = booking?.appointmentAt ? formatViDateTime(booking.appointmentAt) : '-';

    // Chuyển đổi giá trị Odometer nhập vào thành số nguyên, loại bỏ ký tự không phải số. Nếu không hợp lệ, trả về null.
    const odometerNumber = useMemo(() => {
        const normalized = String(odometerKm || '').replaceAll(/\D/g, '');
        if (!normalized) return null;
        const n = Number(normalized);
        return Number.isFinite(n) ? n : null;
    }, [odometerKm]);

    // So sánh số Odometer mới nhập với lần trước nếu có để cảnh báo nếu số mới thấp hơn số cũ, tránh trường hợp nhập sai.
    const isOdometerLower = useMemo(() => {
        if (odometerNumber == null) return false;
        if (lastOdometerKm == null) return false;
        return odometerNumber < lastOdometerKm;
    }, [odometerNumber, lastOdometerKm]);

    // Đồng bộ ref để phục vụ việc giải phóng bộ nhớ 
    useEffect(() => {
        vehicleImagesRef.current = vehicleImages;
    }, [vehicleImages]);

    // Cleanup: Giải phóng các Blob URL khi component bị hủy để tránh rò rỉ bộ nhớ
    useEffect(() => {
        return () => {
            vehicleImagesRef.current.forEach((img) => URL.revokeObjectURL(img.url));
        };
    }, []);

    const handleFindBooking = () => {
        const plate = licensePlate.trim();
        if (!plate) {
            setBooking(null);
            setLastOdometerKm(null);
            return;
        }

        // UI wireframe: chưa có API tìm booking theo biển số -> dùng dữ liệu tạm để hiển thị đúng layout.
        setBooking({
            customerName: 'Tên Khách hàng',
            licensePlate: plate,
            serviceName: 'Tên Dịch vụ',
            appointmentAt: new Date(),
        });
        setLastOdometerKm(12000);
    };

    const handlePickImages = () => fileInputRef.current?.click();

    const handleImagesChange = (e) => {
        const files = Array.from(e.target.files ?? []).filter((f) => f?.type?.startsWith('image/'));

        const created = files.map((file) => ({
            file,
            url: URL.createObjectURL(file),
        }));

        setVehicleImages((prev) => {
            const combined = [...prev, ...created];
            const next = combined.slice(0, MAX_VEHICLE_IMAGES);

            // Revoke URLs that were created but not kept (e.g. exceeded max)
            const dropped = combined.slice(next.length);
            dropped.forEach((img) => URL.revokeObjectURL(img.url));
            return next;
        });
        e.target.value = '';
    };

    const handleRemoveImage = (idx) => {
        setVehicleImages((prev) => {
            const removed = prev[idx];
            const next = prev.filter((_, i) => i !== idx);
            if (removed?.url) URL.revokeObjectURL(removed.url);
            return next;
        });
    };

    const handleCancel = () => navigate(-1);

    const handleConfirm = () => {
        // Chưa có API submit check-in trong codebase -> giữ hành vi tối thiểu.
        // Nơi tích hợp sau: gọi service tạo check-in và upload ảnh.
        console.log('CHECK_IN_SUBMIT', {
            licensePlate: licensePlate.trim(),
            odometerKm: odometerNumber,
            damageNote,
            imageCount: vehicleImages.length,
        });
    };

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.title}>Tiếp nhận xe</h1>
                <div className={styles.infoList}>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Khách hàng:</span>
                        <span className={styles.infoValue}>{booking?.customerName || 'Tên Khách hàng'}</span>
                    </div>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Biển số:</span>
                        <span className={styles.infoValue}>{booking?.licensePlate || 'Biển số xe'}</span>
                    </div>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Dịch vụ:</span>
                        <span className={styles.infoValue}>{booking?.serviceName || 'Tên Dịch vụ'}</span>
                    </div>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Thời gian hẹn:</span>
                        <span className={styles.infoValue}>{appointmentTimeDisplay}</span>
                    </div>
                </div>
            </div>

            <div className={styles.card}>
                <section className={styles.step}>
                    <h2 className={styles.stepTitle}>Step 1: Nhập biển số</h2>
                    <div className={styles.stepRow}>
                        <div className="ui-field" style={{ marginBottom: 0 }}>
                            <label htmlFor="licensePlate">Biển số xe</label>
                            <input
                                id="licensePlate"
                                value={licensePlate}
                                onChange={(e) => setLicensePlate(e.target.value)}
                                onBlur={handleFindBooking}
                                placeholder="Biển số xe"
                                autoComplete="off"
                            />
                        </div>

                    </div>
                    <div className={styles.hint}>Thông tin booking tìm thấy</div>
                </section>

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
                    {isOdometerLower && (
                        <div className={styles.warningBox}>Số km thấp hơn lần trước, vui lòng xác nhận</div>
                    )}
                </section>

                <section className={styles.step}>
                    <h2 className={styles.stepTitle}>Step 3: Chụp ảnh tình trạng xe</h2>
                    <div className={styles.imagesGrid}>
                        {vehicleImages.map((img, idx) => (
                            <div key={img.url} className={styles.imageSlot}>
                                <img className={styles.previewImg} src={img.url} alt={`vehicle-${idx + 1}`} />
                                <button
                                    type="button"
                                    className={styles.removeBtn}
                                    onClick={() => handleRemoveImage(idx)}
                                    aria-label="Xóa ảnh"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: 12 }}>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImagesChange}
                            style={{ display: 'none' }}
                        />
                        <button type="button" className="ui-btn" onClick={handlePickImages}>
                            Chụp ảnh
                        </button>
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

                <div className={styles.actions}>
                    <button type="button" className="ui-btn ui-btn--ghost" onClick={handleCancel}>
                        Hủy
                    </button>
                    <div className={styles.actionsRight}>
                        <button type="button" className="ui-btn ui-btn--primary" onClick={handleConfirm}>
                            Xác nhận tiếp nhận
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}