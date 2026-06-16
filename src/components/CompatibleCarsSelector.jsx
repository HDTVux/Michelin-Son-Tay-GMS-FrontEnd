import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './CompatibleCarsSelector.module.css';
import { VEHICLE_MAKES, POPULAR_MODELS, yearsList } from './vehicleConstants.js';
import { toast } from 'react-toastify';

export default function CompatibleCarsSelector({ value, onChange, disabled }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalStep, setModalStep] = useState(1);
    const [makeSearch, setMakeSearch] = useState('');
    const [vehicleMake, setVehicleMake] = useState('');
    const [vehicleModel, setVehicleModel] = useState('');
    const [vehicleYear, setVehicleYear] = useState('');

    const wheelRef = useRef(null);
    const scrollTimeoutRef = useRef(null);

    // Parse existing compatible cars
    const selectedCars = useMemo(() => {
        return String(value || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
    }, [value]);

    const handleOpenModal = useCallback(() => {
        if (disabled) return;
        setModalStep(1);
        setMakeSearch('');
        setVehicleMake('');
        setVehicleModel('');
        setVehicleYear('2020'); // Default starting year in wheel
        setIsModalOpen(true);
    }, [disabled]);

    const handleCloseModal = useCallback(() => {
        setIsModalOpen(false);
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }
    }, []);

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
        setVehicleMake(make);
        setVehicleModel('');
        setModalStep(2);
    }, []);

    const handleSelectModel = useCallback((model) => {
        setVehicleModel(model);
        setModalStep(3);
    }, []);

    const handleNextStepFrom2 = useCallback(() => {
        const model = String(vehicleModel || '').trim();
        if (!model) {
            toast.warning('Vui lòng nhập hoặc chọn dòng xe.');
            return;
        }
        setModalStep(3);
    }, [vehicleModel]);

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
    }, []);

    const handleSelectYear = useCallback((y, index) => {
        setVehicleYear(String(y));
        if (wheelRef.current) {
            wheelRef.current.scrollTo({
                top: index * 44,
                behavior: 'smooth'
            });
        }
    }, []);

    // Centering the selected year in the scroll roller when step 3 opens
    useEffect(() => {
        if (isModalOpen && modalStep === 3) {
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
    }, [modalStep, isModalOpen, vehicleYear]);

    const handleConfirmCar = useCallback((includeYear = true) => {
        const make = String(vehicleMake || '').trim();
        const model = String(vehicleModel || '').trim();
        const year = includeYear ? String(vehicleYear || '').trim() : '';

        if (!make || !model) {
            toast.warning('Thiếu hãng xe hoặc dòng xe.');
            return;
        }

        const carString = year ? `${make} ${model} ${year}` : `${make} ${model}`;

        // Check duplicate
        if (selectedCars.includes(carString)) {
            toast.warning('Xe này đã có trong danh sách tương thích.');
            return;
        }

        const updated = [...selectedCars, carString];
        onChange(updated.join(', '));
        handleCloseModal();
    }, [vehicleMake, vehicleModel, vehicleYear, selectedCars, onChange, handleCloseModal]);

    const handleRemoveCar = useCallback((car) => {
        if (disabled) return;
        const updated = selectedCars.filter(c => c !== car);
        onChange(updated.join(', '));
    }, [selectedCars, onChange, disabled]);

    return (
        <div className={styles.container}>
            {/* Tag/Chip list of compatible vehicles */}
            <div className={styles.tagList}>
                {selectedCars.map(car => (
                    <div key={car} className={styles.tag}>
                        <span className={styles.tagName}>{car}</span>
                        {!disabled && (
                            <button
                                type="button"
                                className={styles.removeBtn}
                                onClick={() => handleRemoveCar(car)}
                                aria-label="Xóa"
                            >
                                &times;
                            </button>
                        )}
                    </div>
                ))}
                
                {!disabled && (
                    <button
                        type="button"
                        className={styles.addBtn}
                        onClick={handleOpenModal}
                    >
                        <span className={styles.plusIcon}>+</span> Thêm xe tương thích
                    </button>
                )}
            </div>

            {/* Modal Popup */}
            {isModalOpen && (
                <div className={styles.modalOverlay} onClick={handleCloseModal}>
                    <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>Thêm xe tương thích</h3>
                            <button type="button" className={styles.closeBtn} onClick={handleCloseModal}>&times;</button>
                        </div>

                        {/* Stepper Progress */}
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

                        {/* Modal Body */}
                        <div className={styles.modalBody}>
                            {modalStep === 1 && (
                                <div className={styles.modalStepContent}>
                                    <div className={styles.field}>
                                        <label htmlFor="comp-modal-make-search">Tìm thương hiệu xe</label>
                                        <input
                                            id="comp-modal-make-search"
                                            value={makeSearch}
                                            onChange={(e) => setMakeSearch(e.target.value)}
                                            placeholder="Nhập tên thương hiệu (ví dụ: Toyota)"
                                            autoComplete="off"
                                            autoFocus
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
                                    <div className={styles.field}>
                                        <label htmlFor="comp-modal-model-input">Dòng xe (Nhập tay hoặc chọn dưới đây)<span className={styles.required}>*</span></label>
                                        <input
                                            id="comp-modal-model-input"
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
                                    <div className={styles.yearPickerWrapper}>
                                        <label className={styles.yearPickerLabel}>
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

                        {/* Modal Footer */}
                        <div className={styles.modalFooter}>
                            {modalStep === 1 && (
                                <button type="button" className={styles.ghostBtn} onClick={handleCloseModal}>Hủy</button>
                            )}
                            {modalStep > 1 && (
                                <button type="button" className={styles.ghostBtn} onClick={handlePrevStep}>Quay lại</button>
                            )}

                            <div className={styles.footerRight}>
                                {modalStep === 2 && (
                                    <button
                                        type="button"
                                        className={styles.primaryBtn}
                                        onClick={handleNextStepFrom2}
                                        disabled={!vehicleModel.trim()}
                                    >
                                        Tiếp tục
                                    </button>
                                )}
                                {modalStep === 3 && (
                                    <>
                                        <button
                                            type="button"
                                            className={styles.allYearsBtn}
                                            onClick={() => handleConfirmCar(false)}
                                        >
                                            Tất cả năm
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.primaryBtn}
                                            onClick={() => handleConfirmCar(true)}
                                            disabled={!vehicleYear}
                                        >
                                            Xác nhận
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
