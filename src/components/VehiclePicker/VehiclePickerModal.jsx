import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { Download, Plus } from 'lucide-react';
import { yearsList } from '../vehicleConstants.js';
import { useVehicleBrands } from '../../hooks/useVehicleBrands.js';
import { importVehicleModels } from '../../services/vehicleBrandService.js';
// Dùng chung stylesheet của màn check-in để hai màn chọn xe trông giống hệt nhau
// và không bị lệch khi một bên đổi giao diện.
import styles from '../../pages/DashBoard/CheckInManagenent/CheckIn.module.css';

const WHEEL_ITEM_HEIGHT = 44;

/**
 * Modal chọn xe 3 bước (biển số + hãng → dòng xe → năm sản xuất),
 * thiết kế giống màn "Thêm xe mới cho khách" ở check-in.
 */
const VehiclePickerModal = ({ open, initialVehicle, onCancel, onSubmit }) => {
  const [step, setStep] = useState(1);
  const [licensePlate, setLicensePlate] = useState('');
  const [makeSearch, setMakeSearch] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [importing, setImporting] = useState(false);

  const wheelRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  const { makes, modelsByMake, addBrand, addModel, findBrandId, reload } = useVehicleBrands();

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setLicensePlate(initialVehicle?.licensePlate || '');
    setMake(initialVehicle?.make || '');
    setModel(initialVehicle?.model || '');
    setYear(initialVehicle?.year ? String(initialVehicle.year) : '');
    setMakeSearch('');
  }, [open, initialVehicle]);

  useEffect(
    () => () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    },
    []
  );

  // Căn giữa năm đang chọn khi mở bước 3.
  useEffect(() => {
    if (step !== 3) return undefined;
    const index = yearsList.indexOf(Number(year || 2020));
    if (index === -1) return undefined;
    const timer = setTimeout(() => {
      if (wheelRef.current) wheelRef.current.scrollTop = index * WHEEL_ITEM_HEIGHT;
    }, 80);
    return () => clearTimeout(timer);
  }, [step, year]);

  const filteredMakes = useMemo(() => {
    const q = String(makeSearch || '').trim().toUpperCase();
    if (!q) return makes;
    return makes.filter((item) => item.toUpperCase().includes(q));
  }, [makeSearch, makes]);

  const suggestedModels = useMemo(
    () => modelsByMake[String(make || '').trim().toUpperCase()] || [],
    [make, modelsByMake]
  );

  const handleWheelScroll = useCallback((e) => {
    const index = Math.round(e.target.scrollTop / WHEEL_ITEM_HEIGHT);
    if (index < 0 || index >= yearsList.length) return;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => setYear(String(yearsList[index])), 80);
  }, []);

  const handleSelectYear = (value, index) => {
    setYear(String(value));
    wheelRef.current?.scrollTo({ top: index * WHEEL_ITEM_HEIGHT, behavior: 'smooth' });
  };

  const handleNextFromStep1 = () => {
    if (!licensePlate.trim()) {
      toast.warning('Vui lòng nhập biển số xe.');
      return;
    }
    if (!make.trim()) {
      toast.warning('Vui lòng chọn hoặc nhập thương hiệu xe.');
      return;
    }
    setStep(2);
  };

  const handleNextFromStep2 = () => {
    if (!model.trim()) {
      toast.warning('Vui lòng nhập hoặc chọn dòng xe.');
      return;
    }
    setStep(3);
  };

  const handleFinish = () => {
    onSubmit({
      licensePlate: licensePlate.trim().toUpperCase(),
      make: make.trim(),
      model: model.trim(),
      year: year || '',
    });
  };

  // ─── Bổ sung danh mục ngay khi đang nhập ──────────────────────────────────
  const handleAddMakeToCatalog = async () => {
    const name = make.trim();
    if (!name) {
      toast.warning('Chưa có thương hiệu để thêm');
      return;
    }
    try {
      await addBrand(name);
      toast.success(`Đã thêm thương hiệu "${name.toUpperCase()}" vào danh mục`);
    } catch (error) {
      toast.error(error.message || 'Thêm thương hiệu thất bại');
    }
  };

  const handleAddModelToCatalog = async () => {
    if (!make.trim() || !model.trim()) {
      toast.warning('Cần có cả thương hiệu và dòng xe');
      return;
    }
    try {
      await addModel(make.trim(), model.trim());
      toast.success(`Đã thêm dòng xe "${model.trim()}" vào danh mục`);
    } catch (error) {
      toast.error(error.message || 'Thêm dòng xe thất bại');
    }
  };

  const handleImportModels = async () => {
    const brandId = findBrandId(make);
    if (!brandId) {
      toast.warning('Thương hiệu chưa có trong danh mục, hãy thêm thương hiệu trước');
      return;
    }
    setImporting(true);
    try {
      const res = await importVehicleModels(brandId);
      toast.success(res?.message || `Đã bổ sung ${res?.data || 0} dòng xe`);
      await reload(true);
    } catch (error) {
      toast.error(error.message || 'Nạp dòng xe thất bại');
    } finally {
      setImporting(false);
    }
  };

  if (!open) return null;

  const steps = [
    { index: 1, label: 'Thương hiệu' },
    { index: 2, label: 'Dòng xe' },
    { index: 3, label: 'Năm sản xuất' },
  ];

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            {initialVehicle ? 'Sửa thông tin xe' : 'Thêm xe cho đối tác'}
          </h3>
          <button type="button" className={styles.closeBtn} onClick={onCancel}>
            &times;
          </button>
        </div>

        <div className={styles.modalStepper}>
          {steps.map((item, position) => (
            <div key={item.index} style={{ display: 'contents' }}>
              {position > 0 && <div className={styles.modalStepLine} />}
              <div
                className={`${styles.modalStepIndicator} ${
                  step >= item.index ? styles.modalStepIndicatorActive : ''
                }`}
              >
                <span className={styles.indicatorNumber}>{item.index}</span>
                <span className={styles.indicatorLabel}>{item.label}</span>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.modalBody}>
          {step === 1 && (
            <div className={styles.modalStepContent}>
              <div className="ui-field" style={{ marginBottom: 0 }}>
                <label htmlFor="vp_licensePlate">
                  Biển số xe<span className={styles.required}>*</span>
                </label>
                <input
                  id="vp_licensePlate"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  placeholder="Ví dụ: 29A12345"
                  autoComplete="off"
                />
              </div>

              <div className="ui-field">
                <label htmlFor="vp_makeSearch">Tìm thương hiệu xe</label>
                <input
                  id="vp_makeSearch"
                  value={makeSearch}
                  onChange={(e) => setMakeSearch(e.target.value)}
                  placeholder="Nhập tên thương hiệu (ví dụ: Toyota)"
                  autoComplete="off"
                />
              </div>

              <div className={styles.brandListContainer}>
                <div className={styles.brandGrid}>
                  {filteredMakes.length > 0 ? (
                    filteredMakes.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`${styles.brandBtn} ${make === item ? styles.brandBtnActive : ''}`}
                        onClick={() => {
                          setMake(item);
                          setModel('');
                        }}
                      >
                        {item}
                      </button>
                    ))
                  ) : (
                    <div className={styles.noResults}>Không tìm thấy thương hiệu nào</div>
                  )}
                </div>
              </div>

              {makeSearch.trim() && filteredMakes.length === 0 && (
                <button
                  type="button"
                  className="ui-btn ui-btn--ghost"
                  onClick={() => {
                    setMake(makeSearch.trim());
                    handleAddMakeToCatalog();
                  }}
                >
                  <Plus size={14} /> Thêm &quot;{makeSearch.trim().toUpperCase()}&quot; vào danh mục
                </button>
              )}
            </div>
          )}

          {step === 2 && (
            <div className={styles.modalStepContent}>
              <div className={styles.selectedMeta}>
                <span>
                  Thương hiệu đã chọn: <strong>{make}</strong>
                </span>
              </div>

              <div className="ui-field">
                <label htmlFor="vp_model">
                  Dòng xe (Nhập tay hoặc chọn dưới đây)<span className={styles.required}>*</span>
                </label>
                <input
                  id="vp_model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Nhập dòng xe (Ví dụ: Camry)"
                  autoComplete="off"
                />
              </div>

              <div className={styles.modelListTitle}>Dòng xe gợi ý:</div>
              <div className={styles.modelListContainer}>
                <div className={styles.modelGrid}>
                  {suggestedModels.length > 0 ? (
                    suggestedModels.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`${styles.modelBtn} ${model === item ? styles.modelBtnActive : ''}`}
                        onClick={() => setModel(item)}
                      >
                        {item}
                      </button>
                    ))
                  ) : (
                    <div className={styles.noResults}>
                      Không có gợi ý cho thương hiệu này, vui lòng nhập tay ở trên.
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="ui-btn ui-btn--ghost" onClick={handleAddModelToCatalog}>
                  <Plus size={14} /> Lưu dòng xe vào danh mục
                </button>
                <button
                  type="button"
                  className="ui-btn ui-btn--ghost"
                  onClick={handleImportModels}
                  disabled={importing}
                >
                  <Download size={14} /> {importing ? 'Đang nạp...' : 'Nạp gợi ý từ NHTSA'}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className={styles.modalStepContent}>
              <div className={styles.selectedMeta}>
                <span>
                  Thương hiệu: <strong>{make}</strong> • Dòng xe: <strong>{model}</strong>
                </span>
              </div>
              <div
                className="ui-field"
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
              >
                <label style={{ textAlign: 'center', marginBottom: 12 }}>
                  Năm sản xuất đã chọn:{' '}
                  <strong className={styles.yearHighlight}>{year || 'Chưa chọn'}</strong>
                </label>
                <div className={styles.wheelContainer}>
                  <div className={styles.wheelIndicator} />
                  <div className={styles.wheelList} ref={wheelRef} onScroll={handleWheelScroll}>
                    {yearsList.map((item, index) => (
                      <div
                        key={item}
                        className={`${styles.wheelItem} ${
                          String(year) === String(item) ? styles.wheelItemActive : ''
                        }`}
                        onClick={() => handleSelectYear(item, index)}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          {step === 1 ? (
            <button type="button" className="ui-btn ui-btn--ghost" onClick={onCancel}>
              Hủy
            </button>
          ) : (
            <button
              type="button"
              className="ui-btn ui-btn--ghost"
              onClick={() => setStep((prev) => Math.max(1, prev - 1))}
            >
              Quay lại
            </button>
          )}

          {step === 1 && (
            <button type="button" className="ui-btn ui-btn--primary" onClick={handleNextFromStep1}>
              Tiếp tục
            </button>
          )}
          {step === 2 && (
            <button type="button" className="ui-btn ui-btn--primary" onClick={handleNextFromStep2}>
              Tiếp tục
            </button>
          )}
          {step === 3 && (
            <button type="button" className="ui-btn ui-btn--primary" onClick={handleFinish}>
              Xong
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

VehiclePickerModal.propTypes = {
  open: PropTypes.bool.isRequired,
  initialVehicle: PropTypes.object,
  onCancel: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default VehiclePickerModal;
