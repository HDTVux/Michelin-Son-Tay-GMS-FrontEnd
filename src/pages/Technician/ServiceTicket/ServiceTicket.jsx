import { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchTechnicianTicketDetail } from '../../../services/technicianService';
import {
  getSafetyInspectionByTicketCode,
  saveSafetyInspectionData,
  updateSafetyInspectionData,
  getDefaultSafetyInspectionCategories,
  skipSafetyInspection,
  createWorkCategory,
  enableSafetyInspection
} from '../../../services/safetyInspectionService';
import styles from './ServiceTicket.module.css';
import carImage from '../../../assets/oto_4.jpg';

export const ServiceTicket = ({ ticketCode, embedded = false }) => {
  const { id: idParam } = useParams();
  const resolvedTicketCode = String(ticketCode || idParam || '').trim();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [recommendedTireSize, setRecommendedTireSize] = useState('');
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const defaultTireData = useMemo(() => ({
    frontLeft: { size1: '', size2: '', size3: '', mm: '', pressure: '', recommendedPressure: '' },
    frontRight: { size1: '', size2: '', size3: '', mm: '', pressure: '', recommendedPressure: '' },
    rearLeft: { size1: '', size2: '', size3: '', mm: '', pressure: '', recommendedPressure: '' },
    rearRight: { size1: '', size2: '', size3: '', mm: '', pressure: '', recommendedPressure: '' },
    spare: { size1: '', size2: '', size3: '', mm: '', pressure: '', recommendedPressure: '' }
  }), []);

  const [tireData, setTireData] = useState(defaultTireData);
  const [safetyChecks, setSafetyChecks] = useState([]);
  const [notes, setNotes] = useState('');
  const [skipModalOpen, setSkipModalOpen] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [inspectionStatus, setInspectionStatus] = useState('PENDING');
  const [isEditable, setIsEditable] = useState(true);
  const [serviceTicketId, setServiceTicketId] = useState(null);
  const [inspectionId, setInspectionId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setRefreshKey(prev => prev + 1);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('staffToken') || localStorage.getItem('authToken');
        if (!token) {
          toast.error('Vui lòng đăng nhập');
          setLoading(false);
          return;
        }
        if (!resolvedTicketCode) {
          toast.error('Thiếu mã phiếu dịch vụ');
          setLoading(false);
          return;
        }

        const ticketResponse = await fetchTechnicianTicketDetail(resolvedTicketCode, token);
        if (ticketResponse?.data?.serviceTicketId) {
          setServiceTicketId(ticketResponse.data.serviceTicketId);
        }

        let defaultChecks = [];
        try {
          const defaultCategoriesResponse = await getDefaultSafetyInspectionCategories(token);
          if (defaultCategoriesResponse?.data && defaultCategoriesResponse.data.length > 0) {
            defaultChecks = defaultCategoriesResponse.data.map((cat) => ({
              id: cat.id,
              workCategoryId: cat.id,
              customCategoryId: null,
              name: cat.categoryName || '',
              good: false,
              warning: false,
              replace: false,
              note: '',
              displayOrder: cat.displayOrder || 0,
              isCustom: false,
            }));
            setSafetyChecks(defaultChecks);
          }
        } catch (catError) {
          console.log('Không tải được danh mục mặc định:', catError.message);
        }

        try {
          const inspectionResponse = await getSafetyInspectionByTicketCode(resolvedTicketCode, token);
          if (inspectionResponse?.data) {
            const inspection = inspectionResponse.data;

            if (inspection.inspectionId) {
              setInspectionId(inspection.inspectionId);
            }
            if (inspection.serviceTicketId) {
              setServiceTicketId(inspection.serviceTicketId);
            }

            const status = inspection.inspectionStatus || 'PENDING';
            setInspectionStatus(status);
            const canEdit = status === 'PENDING' || status === 'SKIPPED' || !status;
            setIsEditable(!embedded && canEdit);

            if (inspection.tires && inspection.tires.length > 0) {
              const newTireData = { ...defaultTireData };
              inspection.tires.forEach(tire => {
                const positionMap = {
                  'FRONT_LEFT': 'frontLeft',
                  'FRONT_RIGHT': 'frontRight',
                  'REAR_LEFT': 'rearLeft',
                  'REAR_RIGHT': 'rearRight',
                  'SPARE': 'spare'
                };
                const position = positionMap[tire.tirePosition];
                if (position) {
                  let size1 = '', size2 = '', size3 = '';
                  if (tire.tireSpecification) {
                    const match = tire.tireSpecification.match(/(\d+)\/(\d+)R(\d+)/);
                    if (match) {
                      size1 = match[1];
                      size2 = match[2];
                      size3 = match[3];
                    }
                  }

                  const baseData = {
                    size1,
                    size2,
                    size3,
                    mm: tire.treadDepth?.toString() || '',
                    pressure: tire.pressure?.toString() || '',
                    recommendedPressure: tire.recommendedPressure?.toString() || ''
                  };

                  newTireData[position] = baseData;

                  if (tire.recommendedTireSize && !recommendedTireSize) {
                    setRecommendedTireSize(tire.recommendedTireSize);
                  }
                }
              });
              setTireData(newTireData);
            }

            const inspectionItems = Array.isArray(inspection.items) ? inspection.items : [];
            if (inspectionItems.length > 0) {
              const transformedDefaults = defaultChecks.map((defaultCheck) => {
                const existingItem = inspectionItems.find((item) =>
                  item.workCategoryId === defaultCheck.workCategoryId,
                );
                if (!existingItem) return defaultCheck;
                return {
                  ...defaultCheck,
                  itemId: existingItem.itemId,
                  good: existingItem.itemStatus === 'GOOD',
                  warning: existingItem.itemStatus === 'WARNING',
                  replace: existingItem.itemStatus === 'REPLACE',
                  note: existingItem.advisorNote || '',
                };
              });

              const transformedCustoms = inspectionItems
                .filter((item) => item.customCategoryId)
                .map((item) => ({
                  id: item.itemId || ('custom-' + item.customCategoryId),
                  itemId: item.itemId,
                  workCategoryId: null,
                  customCategoryId: item.customCategoryId,
                  name: item.categoryName || '',
                  good: item.itemStatus === 'GOOD',
                  warning: item.itemStatus === 'WARNING',
                  replace: item.itemStatus === 'REPLACE',
                  note: item.advisorNote || '',
                  displayOrder: 9999,
                  isCustom: true,
                }));

              setSafetyChecks([...transformedDefaults, ...transformedCustoms]);
            }

            if (inspection.technicianNotes) {
              setNotes(inspection.technicianNotes);
            }
          }
        } catch {
          console.log('Không tìm thấy phiếu kiểm tra, sử dụng mẫu mặc định');
          setIsEditable(!embedded);
          setInspectionStatus('PENDING');
        }
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu phiếu:', error);
        toast.error('Không thể tải dữ liệu phiếu dịch vụ: ' + (error.message || 'Lỗi không xác định'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTicketCode, defaultTireData, embedded, refreshKey]);

  const handleTireDataChange = (position, field, value) => {
    setTireData(prev => ({
      ...prev,
      [position]: { ...prev[position], [field]: value }
    }));
  };

  const handleSafetyCheck = (itemId, type) => {
    setSafetyChecks(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, good: type === 'good', warning: type === 'warning', replace: type === 'replace' }
          : item
      )
    );
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Vui lòng nhập tên hạng mục');
      return;
    }

    if (!inspectionId) {
      toast.error('Cần tạo phiếu kiểm tra trước khi thêm hạng mục tùy chỉnh');
      return;
    }

    try {
      const token = localStorage.getItem('staffToken') || localStorage.getItem('authToken');

      const maxOrder = safetyChecks.length > 0
        ? Math.max(...safetyChecks.map(c => c.displayOrder || 0))
        : 0;

      const payload = {
        categoryName: newCategoryName.trim(),
        displayOrder: maxOrder + 1
      };

      const response = await createWorkCategory(inspectionId, payload, token);

      if (response?.data) {
        const newCheck = {
          id: response.data.itemId || ('custom-' + response.data.customCategoryId),
          itemId: response.data.itemId,
          workCategoryId: null,
          customCategoryId: response.data.customCategoryId,
          name: response.data.categoryName,
          good: false,
          warning: false,
          replace: false,
          note: response.data.advisorNote || '',
          displayOrder: response.data.displayOrder || maxOrder + 1,
          isCustom: true
        };
        setSafetyChecks(prev => [...prev, newCheck]);
        toast.success('Đã thêm hạng mục mới thành công');
        setShowAddCategoryModal(false);
        setNewCategoryName('');
      }
    } catch (error) {
      console.error('Lỗi khi tạo hạng mục:', error);
      toast.error(error.message || 'Lỗi khi tạo hạng mục mới');
    }
  };

  const confirmSkip = async () => {
    try {
      const token = localStorage.getItem('staffToken') || localStorage.getItem('authToken');
      await skipSafetyInspection(resolvedTicketCode, skipReason || 'Bỏ qua kiểm tra an toàn', token);
      toast.success('Đã bỏ qua kiểm tra an toàn!');
      setSkipModalOpen(false);
      if (!embedded) {
        navigate('/technician/my-tasks');
      }
    } catch (error) {
      console.error('Lỗi khi bỏ qua:', error);
      toast.error('Lỗi khi bỏ qua: ' + (error.message || 'Lỗi không xác định'));
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('staffToken') || localStorage.getItem('authToken');

      if (!inspectionId) {
        try {
          const enableResponse = await enableSafetyInspection(resolvedTicketCode, token);
          if (enableResponse?.data?.inspectionId) {
            setInspectionId(enableResponse.data.inspectionId);
          }
        } catch (enableError) {
          console.error('Lỗi khi kích hoạt phiếu:', enableError);
        }
      }

      const tiresPayload = (() => {
        const getActualData = (data) => {
          if (!data || (!data.mm && !data.pressure && !data.size1)) return null;
          return {
            treadDepth: data.mm ? parseFloat(data.mm) : null,
            pressure: data.pressure ? parseFloat(data.pressure) : null,
            pressureUnit: 'PSI'
          };
        };

        const frontSpec = (tireData.frontLeft?.size1 && tireData.frontLeft?.size2 && tireData.frontLeft?.size3)
          ? `${tireData.frontLeft.size1}/${tireData.frontLeft.size2}R${tireData.frontLeft.size3}`
          : (tireData.frontRight?.size1 && tireData.frontRight?.size2 && tireData.frontRight?.size3)
            ? `${tireData.frontRight.size1}/${tireData.frontRight.size2}R${tireData.frontRight.size3}`
            : null;

        const rearSpec = (tireData.rearLeft?.size1 && tireData.rearLeft?.size2 && tireData.rearLeft?.size3)
          ? `${tireData.rearLeft.size1}/${tireData.rearLeft.size2}R${tireData.rearLeft.size3}`
          : (tireData.rearRight?.size1 && tireData.rearRight?.size2 && tireData.rearRight?.size3)
            ? `${tireData.rearRight.size1}/${tireData.rearRight.size2}R${tireData.rearRight.size3}`
            : null;

        const frontRecommendedPressure = tireData.frontLeft?.recommendedPressure
          ? parseFloat(tireData.frontLeft.recommendedPressure)
          : (tireData.frontRight?.recommendedPressure ? parseFloat(tireData.frontRight.recommendedPressure) : null);

        const rearRecommendedPressure = tireData.rearLeft?.recommendedPressure
          ? parseFloat(tireData.rearLeft.recommendedPressure)
          : (tireData.rearRight?.recommendedPressure ? parseFloat(tireData.rearRight.recommendedPressure) : null);

        const spareRecommendedPressure = tireData.spare?.recommendedPressure
          ? parseFloat(tireData.spare.recommendedPressure)
          : null;

        return {
          frontTireSpecification: frontSpec,
          rearTireSpecification: rearSpec,
          recommendedTireSize: recommendedTireSize || null,
          frontLeft: getActualData(tireData.frontLeft),
          frontRight: getActualData(tireData.frontRight),
          rearLeft: getActualData(tireData.rearLeft),
          rearRight: getActualData(tireData.rearRight),
          spare: getActualData(tireData.spare),
          frontRecommendedPressure: frontRecommendedPressure,
          rearRecommendedPressure: rearRecommendedPressure,
          spareRecommendedPressure: spareRecommendedPressure
        };
      })();

      const itemsPayload = safetyChecks
        .filter(check => check.good || check.warning || check.replace)
        .map(check => ({
          workCategoryId: check.workCategoryId || null,
          customCategoryId: check.customCategoryId || null,
          itemStatus: check.good ? 'GOOD' : check.warning ? 'WARNING' : check.replace ? 'REPLACE' : null
        }));

      const parsedServiceTicketId = Number(resolvedTicketCode);
      const finalServiceTicketId =
        serviceTicketId || (Number.isFinite(parsedServiceTicketId) ? parsedServiceTicketId : null);
      if (!finalServiceTicketId) {
        throw new Error('Thiếu serviceTicketId để lưu phiếu kiểm tra.');
      }

      const safetyPayload = {
        serviceTicketId: finalServiceTicketId,
        technicianNotes: notes || null,
        tires: tiresPayload,
        items: itemsPayload,
        inspectionStatus: 'COMPLETED'
      };

      if (inspectionStatus === 'COMPLETED' && inspectionId && isEditable) {
        await updateSafetyInspectionData(inspectionId, safetyPayload, token);
        toast.success('Đã cập nhật phiếu kiểm tra an toàn!');
        setIsEditable(false);
      } else {
        await saveSafetyInspectionData(safetyPayload, token);
        setInspectionStatus('COMPLETED');
        setIsEditable(false);
        toast.success('Đã lưu và hoàn thành kiểm tra an toàn!');
      }
    } catch (error) {
      console.error('Lỗi khi lưu dữ liệu:', error);
      toast.error('Lỗi khi lưu dữ liệu: ' + (error.message || 'Lỗi không xác định'));
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Phiếu kiểm tra xe</h1>
        </div>
      </div>

      {/* Phần kiểm tra lốp */}
      <div className={styles.card}>
        <div className={styles.tireInspectionHeader}>
          <div>
            <div className={styles.tireSizeRow}>
              <label className={styles.sectionTitle}>Size lốp khuyến cáo:</label>
              <input
                type="text"
                value={recommendedTireSize}
                onChange={(e) => setRecommendedTireSize(e.target.value)}
                className={styles.tireSizeInput}
                placeholder="Nhập size lốp..."
                disabled={!isEditable}
              />
            </div>
          </div>
        </div>

        <div style={{ position: 'relative', height: '550px', marginTop: '20px' }}>
          {/* BÊN TRÁI - 2 lốp: Trước Trái + Sau Trái */}
          <div style={{ position: 'absolute', left: '20px', top: '80px', display: 'flex', flexDirection: 'column', gap: '100px' }}>
            {/* Lốp Trước Bên Trái */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div className={styles.tirePosition}>
                <div className={styles.tireBoxRow}>
                  <input type="text" value={tireData.frontLeft.size1} onChange={(e) => handleTireDataChange('frontLeft', 'size1', e.target.value)} className={styles.tireInputWide} placeholder="" disabled={!isEditable} />
                  <span className={styles.tireSlash}>/</span>
                  <input type="text" value={tireData.frontLeft.size2} onChange={(e) => handleTireDataChange('frontLeft', 'size2', e.target.value)} className={styles.tireInputWide} placeholder="" disabled={!isEditable} />
                  <span className={styles.tireRLabel}>R</span>
                  <input type="text" value={tireData.frontLeft.size3} onChange={(e) => handleTireDataChange('frontLeft', 'size3', e.target.value)} className={styles.tireInputWide} placeholder="" disabled={!isEditable} />
                </div>
                <div className={styles.tireBoxRow}>
                  <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>mm</span></div>
                  <input type="text" value={tireData.frontLeft.mm} onChange={(e) => handleTireDataChange('frontLeft', 'mm', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!isEditable} />
                </div>
                <div className={styles.tireBoxRow}>
                  <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>kg/cm</span></div>
                  <input type="text" value={tireData.frontLeft.pressure} onChange={(e) => handleTireDataChange('frontLeft', 'pressure', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!isEditable} />
                </div>
              </div>
            </div>

            {/* Lốp Sau Bên Trái */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div className={styles.tirePosition}>
                <div className={styles.tireBoxRow}>
                  <input type="text" value={tireData.rearLeft.size1} onChange={(e) => handleTireDataChange('rearLeft', 'size1', e.target.value)} className={styles.tireInputWide} placeholder="" disabled={!isEditable} />
                  <span className={styles.tireSlash}>/</span>
                  <input type="text" value={tireData.rearLeft.size2} onChange={(e) => handleTireDataChange('rearLeft', 'size2', e.target.value)} className={styles.tireInputWide} placeholder="" disabled={!isEditable} />
                  <span className={styles.tireRLabel}>R</span>
                  <input type="text" value={tireData.rearLeft.size3} onChange={(e) => handleTireDataChange('rearLeft', 'size3', e.target.value)} className={styles.tireInputWide} placeholder="" disabled={!isEditable} />
                </div>
                <div className={styles.tireBoxRow}>
                  <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>mm</span></div>
                  <input type="text" value={tireData.rearLeft.mm} onChange={(e) => handleTireDataChange('rearLeft', 'mm', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!isEditable} />
                </div>
                <div className={styles.tireBoxRow}>
                  <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>kg/cm</span></div>
                  <input type="text" value={tireData.rearLeft.pressure} onChange={(e) => handleTireDataChange('rearLeft', 'pressure', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!isEditable} />
                </div>
              </div>
            </div>
          </div>

          {/* THÂN XE - Giữa - có hình ảnh */}
          <div style={{ position: 'absolute', left: '50%', top: '45%', transform: 'translate(-50%, -50%)' }}>
            <img src={carImage} alt="Car" style={{ width: '280px', height: 'auto', objectFit: 'contain' }} />
          </div>

          {/* BÁNH XE - 4 vị trí */}
          <div className={styles.wheel} style={{ position: 'absolute', top: '100px', left: '50%', transform: 'translateX(-130px)' }}>
            <div className={styles.wheelRim}></div>
          </div>
          <div className={styles.wheel} style={{ position: 'absolute', top: '100px', left: '50%', transform: 'translateX(85px)' }}>
            <div className={styles.wheelRim}></div>
          </div>
          <div className={styles.wheel} style={{ position: 'absolute', top: '300px', left: '50%', transform: 'translateX(-130px)' }}>
            <div className={styles.wheelRim}></div>
          </div>
          <div className={styles.wheel} style={{ position: 'absolute', top: '300px', left: '50%', transform: 'translateX(85px)' }}>
            <div className={styles.wheelRim}></div>
          </div>

          {/* BÊN PHẢI - 3 lốp: Trước Phải + Sau Phải + Lốp Dự phòng */}
          <div style={{ position: 'absolute', right: '140px', top: '60px', display: 'flex', flexDirection: 'column', gap: '70px' }}>
            {/* Lốp Trước Bên Phải */}
            <div className={styles.tirePosition}>
              <div className={styles.tireBoxRow}>
                <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>mm</span></div>
                <input type="text" value={tireData.frontRight.mm} onChange={(e) => handleTireDataChange('frontRight', 'mm', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!isEditable} />
              </div>
              <div className={styles.tireBoxRow}>
                <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>kg/cm</span></div>
                <input type="text" value={tireData.frontRight.pressure} onChange={(e) => handleTireDataChange('frontRight', 'pressure', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!isEditable} />
              </div>
            </div>

            {/* Lốp Sau Bên Phải */}
            <div className={styles.tirePosition}>
              <div className={styles.tireBoxRow}>
                <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>mm</span></div>
                <input type="text" value={tireData.rearRight.mm} onChange={(e) => handleTireDataChange('rearRight', 'mm', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!isEditable} />
              </div>
              <div className={styles.tireBoxRow}>
                <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>kg/cm</span></div>
                <input type="text" value={tireData.rearRight.pressure} onChange={(e) => handleTireDataChange('rearRight', 'pressure', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!isEditable} />
              </div>
            </div>

            {/* Lốp Dự phòng */}
            <div className={styles.tirePosition}>
              <div className={styles.tireBoxRow}>
                <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>mm</span></div>
                <input type="text" value={tireData.spare.mm} onChange={(e) => handleTireDataChange('spare', 'mm', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!isEditable} />
              </div>
              <div className={styles.tireBoxRow}>
                <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>kg/cm</span></div>
                <input type="text" value={tireData.spare.pressure} onChange={(e) => handleTireDataChange('spare', 'pressure', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!isEditable} />
              </div>
            </div>
          </div>

          {/* CỘT ÁP SUẤT KHUYẾN CÁO - Bên phải */}
          <div style={{ position: 'absolute', right: '40px', top: '60px', display: 'flex', flexDirection: 'column', gap: '70px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '110px', justifyContent: 'center' }}>
              <label style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textAlign: 'center' }}>Áp suất<br/>khuyến cáo</label>
              <input type="text" value={tireData.frontRight.recommendedPressure} onChange={(e) => handleTireDataChange('frontRight', 'recommendedPressure', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!isEditable} style={{ width: '80px', height: '36px', fontSize: '14px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '110px', justifyContent: 'center' }}>
              <label style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textAlign: 'center' }}>Áp suất<br/>khuyến cáo</label>
              <input type="text" value={tireData.rearRight.recommendedPressure} onChange={(e) => handleTireDataChange('rearRight', 'recommendedPressure', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!isEditable} style={{ width: '80px', height: '36px', fontSize: '14px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '110px', justifyContent: 'center' }}>
              <label style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textAlign: 'center' }}>Áp suất<br/>khuyến cáo</label>
              <input type="text" value={tireData.spare.recommendedPressure} onChange={(e) => handleTireDataChange('spare', 'recommendedPressure', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!isEditable} style={{ width: '80px', height: '36px', fontSize: '14px' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Bảng kiểm tra an toàn - 13 hạng mục mặc định */}
      <div className={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 className={styles.sectionTitle}>HẠNG MỤC KIỂM TRA AN TOÀN</h2>
          {isEditable && (
            <button className={styles.addCategoryButton} onClick={() => setShowAddCategoryModal(true)}>
              + Thêm hạng mục mới
            </button>
          )}
        </div>
        <div className={styles.safetyTable}>
          <table>
            <thead>
              <tr>
                <th>HẠNG MỤC KIỂM TRA</th>
                <th>TỐT</th>
                <th>LƯU Ý</th>
                <th>THAY</th>
                <th>GHI CHÚ</th>
              </tr>
            </thead>
            <tbody>
              {safetyChecks
                .filter(item => !item.isCustom)
                .sort((a, b) => {
                  const aHasNote = a.note && a.note.trim() !== '';
                  const bHasNote = b.note && b.note.trim() !== '';
                  if (inspectionStatus === 'SKIPPED') {
                    if (aHasNote && !bHasNote) return -1;
                    if (!aHasNote && bHasNote) return 1;
                  }
                  return 0;
                })
                .map((item) => (
                <tr key={item.id}>
                  <td className={styles.itemName}>{item.name}</td>
                  <td>
                    <input type="checkbox"
                      checked={inspectionStatus === 'SKIPPED' ? (item.note && item.note.trim() !== '') : item.good}
                      disabled={!isEditable || (inspectionStatus === 'SKIPPED' && !(item.note && item.note.trim() !== ''))}
                      onChange={() => handleSafetyCheck(item.id, 'good')} />
                  </td>
                  <td>
                    <input type="checkbox"
                      checked={inspectionStatus === 'SKIPPED' ? (item.note && item.note.trim() !== '') : item.warning}
                      disabled={!isEditable || (inspectionStatus === 'SKIPPED' && !(item.note && item.note.trim() !== ''))}
                      onChange={() => handleSafetyCheck(item.id, 'warning')} />
                  </td>
                  <td>
                    <input type="checkbox"
                      checked={inspectionStatus === 'SKIPPED' ? (item.note && item.note.trim() !== '') : item.replace}
                      disabled={!isEditable || (inspectionStatus === 'SKIPPED' && !(item.note && item.note.trim() !== ''))}
                      onChange={() => handleSafetyCheck(item.id, 'replace')} />
                  </td>
                  <td className={styles.noteCell}>
                    {item.note && item.note.trim() !== '' ? (
                      <span style={{ color: '#92400e', fontStyle: 'italic', fontSize: '13px' }}>{item.note}</span>
                    ) : (
                      <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '13px' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bảng hạng mục tùy chỉnh */}
      {safetyChecks.some(item => item.isCustom) && (
        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 className={styles.sectionTitle}>HẠNG MỤC TÙY CHỈNH</h2>
          </div>
          <div className={styles.safetyTable}>
            <table>
              <thead>
                <tr>
                  <th>HẠNG MỤC TÙY CHỈNH</th>
                  <th>TỐT</th>
                  <th>LƯU Ý</th>
                  <th>THAY</th>
                  <th>GHI CHÚ</th>
                </tr>
              </thead>
              <tbody>
                {safetyChecks
                  .filter(item => item.isCustom)
                  .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                  .map((item) => (
                  <tr key={item.id}>
                    <td className={styles.itemName}>{item.name}</td>
                    <td><input type="checkbox" checked={item.good} disabled={!isEditable} onChange={() => handleSafetyCheck(item.id, 'good')} /></td>
                    <td><input type="checkbox" checked={item.warning} disabled={!isEditable} onChange={() => handleSafetyCheck(item.id, 'warning')} /></td>
                    <td><input type="checkbox" checked={item.replace} disabled={!isEditable} onChange={() => handleSafetyCheck(item.id, 'replace')} /></td>
                    <td className={styles.noteCell}>
                      {item.note && item.note.trim() !== '' ? (
                        <span style={{ color: '#92400e', fontStyle: 'italic', fontSize: '13px' }}>{item.note}</span>
                      ) : (
                        <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '13px' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Phần ghi chú kỹ thuật viên */}
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Lưu ý:</h2>
        <textarea
          className={styles.notesTextarea}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Nhập ghi chú..."
          disabled={!isEditable}
        />
      </div>

      {!embedded && (
        <div className={styles.actionButtons}>
          <button className={styles.closeButton} onClick={() => navigate('/technician/my-tasks')}>Đóng</button>
          {inspectionStatus === 'COMPLETED' && !isEditable ? (
            <button className={styles.completeButton} onClick={() => setIsEditable(true)}>Chỉnh sửa</button>
          ) : (
            <button className={styles.completeButton} onClick={handleSave}>Hoàn thành</button>
          )}
        </div>
      )}

      {/* Modal thêm hạng mục */}
      {showAddCategoryModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddCategoryModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Thêm hạng mục kiểm tra mới</h3>
              <button className={styles.modalClose} onClick={() => setShowAddCategoryModal(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tên hạng mục:</label>
                <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className={styles.formInput} placeholder="Nhập tên hạng mục kiểm tra..." autoFocus />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalCancelBtn} onClick={() => { setShowAddCategoryModal(false); setNewCategoryName(''); }}>Hủy</button>
              <button className={styles.modalActionBtn} onClick={handleAddCategory}>Thêm</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal xác nhận bỏ qua */}
      {skipModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setSkipModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Xác nhận bỏ qua kiểm tra an toàn</h3>
              <button className={styles.modalClose} onClick={() => setSkipModalOpen(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ marginBottom: '16px', color: '#374151' }}>Bạn có chắc chắn muốn bỏ qua kiểm tra an toàn cho phiếu dịch vụ này không?</p>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Lý do bỏ qua:</label>
                <textarea value={skipReason} onChange={(e) => setSkipReason(e.target.value)} className={styles.formInput} rows={3} placeholder="Nhập lý do bỏ qua kiểm tra..." />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalCancelBtn} onClick={() => setSkipModalOpen(false)}>Hủy</button>
              <button className={styles.modalActionBtn} onClick={confirmSkip} style={{ background: '#dc2626' }}>Xác nhận bỏ qua</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

ServiceTicket.propTypes = {
  ticketCode: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  embedded: PropTypes.bool,
};

export default ServiceTicket;
