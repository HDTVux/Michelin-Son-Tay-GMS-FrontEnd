import { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchTechnicianTicketDetail } from '../../../services/technicianService';
import { fetchServiceTicketDetail } from '../../../services/serviceTicketService';
import {
  getSafetyInspectionByTicketCode,
  saveSafetyInspectionData,
  updateSafetyInspectionData,
  getDefaultSafetyInspectionCategories,
  skipSafetyInspection,
  createWorkCategory,
  deleteCustomCategory,
  enableSafetyInspection,
  reopenSafetyInspection,
  updateAdvisorNotes,
} from '../../../services/safetyInspectionService';
import { updateServiceTicket } from '../../../services/serviceTicketService';
import styles from './ServiceTicket.module.css';
import carImage from '../../../assets/oto_4.jpg';

export const ServiceTicket = ({
  ticketCode,
  embedded = false,
  mode = 'technician',
  backPath = '/technician/my-tasks',
  onClose = null,
}) => {
  const { id: idParam } = useParams();
  const resolvedTicketCode = String(ticketCode || idParam || '').trim();
  const navigate = useNavigate();
  const isAdvisorMode = mode === 'advisor';
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
  const canEditTechnicalFields = isEditable;
  const canEditAdvisorNotes = isEditable;

  const mergedSafetyChecks = useMemo(() => (
    [...safetyChecks].sort((a, b) => {
      if (Boolean(a.isCustom) !== Boolean(b.isCustom)) {
        return a.isCustom ? 1 : -1;
      }
      return (a.displayOrder || 0) - (b.displayOrder || 0);
    })
  ), [safetyChecks]);

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

        let ticketResponse;
        if (isAdvisorMode) {
          ticketResponse = await fetchServiceTicketDetail(resolvedTicketCode, token);
        } else {
          ticketResponse = await fetchTechnicianTicketDetail(resolvedTicketCode, token);
        }

        if (ticketResponse?.data?.serviceTicketId) {
          setServiceTicketId(ticketResponse.data.serviceTicketId);
        } else if (ticketResponse?.data?.id) {
          setServiceTicketId(ticketResponse.data.id);
        } else if (ticketResponse?.data?.ticketId) {
          setServiceTicketId(ticketResponse.data.ticketId);
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
          if (ticketResponse?.data?.safetyInspectionEnabled === false) {
            setInspectionStatus('SKIPPED');
            setIsEditable(canEdit);
            return;
          }

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
            setIsEditable(canEdit); // COMPLETED -> khóa, phải bấm Chỉnh sửa để reopen rồi mới sửa tiếp (advisor+tech) // COMPLETED -> khóa, phải bấm Chỉnh sửa để reopen rồi mới sửa tiếp (advisor+tech)

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
                if (!existingItem) return { ...defaultCheck, advisorNote: '' };
                return {
                  ...defaultCheck,
                  itemId: existingItem.itemId,
                  good: existingItem.itemStatus === 'GOOD',
                  warning: existingItem.itemStatus === 'WARNING',
                  replace: existingItem.itemStatus === 'REPLACE',
                  note: existingItem.advisorNote || '',
                  advisorNote: existingItem.advisorNote || '',
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
                  advisorNote: item.advisorNote || '',
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
          setIsEditable(true);
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
  }, [resolvedTicketCode, defaultTireData, embedded, refreshKey, isAdvisorMode]);

  const handleTireDataChange = (position, field, value) => {
    setTireData(prev => ({
      ...prev,
      [position]: { ...prev[position], [field]: value }
    }));
  };

  const handleSafetyCheck = (itemId, type) => {
    if (!canEditTechnicalFields) return;
    setSafetyChecks(prev =>
      prev.map(item =>
        item.id !== itemId
          ? item
          : item[type]
            ? { ...item, good: false, warning: false, replace: false }
            : { ...item, good: type === 'good', warning: type === 'warning', replace: type === 'replace' }
      )
    );
  };

  const handleAdvisorNoteChange = (itemId, value) => {
    setSafetyChecks(prev => prev.map(item =>
      item.id === itemId ? { ...item, advisorNote: value } : item
    ));
  };

  const handleCloseTicket = () => {
    if (typeof onClose === 'function') {
      onClose();
      return;
    }
    navigate(backPath);
  };

  const resolveServiceTicketId = () => {
    const parsedServiceTicketId = Number(resolvedTicketCode);
    return serviceTicketId || (Number.isFinite(parsedServiceTicketId) ? parsedServiceTicketId : null);
  };

  const handleEnableEdit = async () => {
    try {
      const token = localStorage.getItem('staffToken') || localStorage.getItem('authToken');
      if (!token) {
        toast.error('Vui lòng đăng nhập');
        return;
      }

      if (inspectionStatus === 'COMPLETED') {
        await reopenSafetyInspection(resolvedTicketCode, token);
        setInspectionStatus('PENDING');
        setRefreshKey((prev) => prev + 1);
      }

      setIsEditable(true);
      toast.info('Đã bật chế độ chỉnh sửa phiếu.');
    } catch (error) {
      console.error('Lỗi khi mở lại phiếu:', error);
      toast.error('Không thể mở lại phiếu để chỉnh sửa: ' + (error.message || 'Lỗi không xác định'));
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Vui lòng nhập tên hạng mục');
      return;
    }

    try {
      const token = localStorage.getItem('staffToken') || localStorage.getItem('authToken');
      let currentInspectionId = inspectionId;

      if (!currentInspectionId) {
        const finalServiceTicketId = resolveServiceTicketId();
        if (!finalServiceTicketId) {
          toast.error('Thiếu serviceTicketId để tạo phiếu kiểm tra.');
          return;
        }

        const bootstrapPayload = {
          serviceTicketId: finalServiceTicketId,
          technicianNotes: null,
          tires: {
            frontTireSpecification: null,
            rearTireSpecification: null,
            recommendedTireSize: null,
            frontLeft: null,
            frontRight: null,
            rearLeft: null,
            rearRight: null,
            spare: null,
            frontRecommendedPressure: null,
            rearRecommendedPressure: null,
            spareRecommendedPressure: null,
          },
          items: [],
          inspectionStatus: 'SKIPPED',
        };
        const bootstrapRes = await saveSafetyInspectionData(bootstrapPayload, token);
        currentInspectionId = bootstrapRes?.data?.inspectionId || null;
        if (!currentInspectionId) {
          toast.error('Không tạo được phiếu kiểm tra để thêm hạng mục.');
          return;
        }
        setInspectionId(currentInspectionId);
      }

      if (inspectionStatus === 'COMPLETED') {
        await reopenSafetyInspection(resolvedTicketCode, token);
        setInspectionStatus('PENDING');
        setRefreshKey((prev) => prev + 1);
      }

      const maxOrder = safetyChecks.length > 0
        ? Math.max(...safetyChecks.map(c => c.displayOrder || 0))
        : 0;

      const payload = {
        categoryName: newCategoryName.trim(),
        displayOrder: maxOrder + 1
      };

      let response;
      try {
        response = await createWorkCategory(currentInspectionId, payload, token);
      } catch (createErr) {
        response = await createWorkCategory(
          currentInspectionId,
          { categoryName: newCategoryName.trim() },
          token,
        );
        void createErr;
      }

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

  const handleDeleteCustomCategory = async (item) => {
    if (!item?.isCustom) return;

    const ok = window.confirm('Bạn có chắc muốn xóa hạng mục thêm mới này?');
    if (!ok) return;

    if (!inspectionId || !item.customCategoryId) {
      setSafetyChecks((prev) => prev.filter((check) => check.id !== item.id));
      toast.success('Đã xóa hạng mục thêm mới.');
      return;
    }

    try {
      const token = localStorage.getItem('staffToken') || localStorage.getItem('authToken');
      await deleteCustomCategory(inspectionId, item.customCategoryId, token);
      setSafetyChecks((prev) => prev.filter((check) => check.id !== item.id));
      toast.success('Đã xóa hạng mục thêm mới.');
    } catch (error) {
      console.error('Lỗi khi xóa hạng mục tùy chỉnh:', error);
      toast.error(error.message || 'Không thể xóa hạng mục thêm mới');
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
      const isAdvisorSkipMode = isAdvisorMode && inspectionStatus === 'SKIPPED';

      if (!inspectionId && !isAdvisorSkipMode) {
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
        .map(check => ({
          workCategoryId: check.workCategoryId || null,
          customCategoryId: check.customCategoryId || null,
          itemStatus: check.good ? 'GOOD' : check.warning ? 'WARNING' : check.replace ? 'REPLACE' : null,
        }))
        .filter(check => (check.workCategoryId || check.customCategoryId) && check.itemStatus);

      const finalServiceTicketId = resolveServiceTicketId();
      if (!finalServiceTicketId) {
        throw new Error('Thiếu serviceTicketId để lưu phiếu kiểm tra.');
      }

      const safetyPayload = {
        serviceTicketId: finalServiceTicketId,
        technicianNotes: notes || null,
        tires: tiresPayload,
        items: itemsPayload,
        inspectionStatus,
      };

      let currentInspectionId = inspectionId;

      if (isAdvisorSkipMode) {
        if (inspectionId) {
          const updateRes = await updateSafetyInspectionData(inspectionId, safetyPayload, token);
          currentInspectionId = updateRes?.data?.inspectionId || inspectionId;
        } else {
          const saveRes = await saveSafetyInspectionData(safetyPayload, token);
          currentInspectionId = saveRes?.data?.inspectionId || inspectionId;
        }
        setInspectionStatus('SKIPPED');
      } else if (inspectionStatus === 'COMPLETED' && inspectionId && isEditable) {
        const updateRes = await updateSafetyInspectionData(inspectionId, safetyPayload, token);
        currentInspectionId = updateRes?.data?.inspectionId || inspectionId;
      } else {
        const saveRes = await saveSafetyInspectionData(safetyPayload, token);
        currentInspectionId = saveRes?.data?.inspectionId || inspectionId;
        setInspectionStatus('COMPLETED');
      }

      // Advisor note lưu cùng phiếu kỹ thuật viên
      if (isAdvisorMode && currentInspectionId) {
        const advisorItems = safetyChecks
          .filter((item) => String(item.advisorNote || '').trim() !== '')
          .map((item) => ({
            workCategoryId: item.workCategoryId ?? null,
            customCategoryId: item.customCategoryId ?? null,
            advisorNote: item.advisorNote,
          }));

        if (advisorItems.length > 0) {
          await updateAdvisorNotes(currentInspectionId, advisorItems, token);
        }
      }

      if (currentInspectionId) {
        setInspectionId(currentInspectionId);
      }

      // Khi hoàn thành kiểm tra an toàn -> chuyển ticket status sang INSPECTION
      if ((isAdvisorMode || !embedded) && !isAdvisorSkipMode) {
        try {
          await updateServiceTicket(
            resolvedTicketCode,
            { ticketStatus: 'INSPECTION' },
            token,
          );
        } catch (statusErr) {
          console.warn('Không sync được ticket status:', statusErr);
        }
      }

      toast.success(isAdvisorSkipMode ? 'Đã lưu ghi chú phiếu SKIPPED.' : 'Đã lưu phiếu kiểm tra an toàn!');
      setIsEditable(isAdvisorSkipMode);
      setRefreshKey(prev => prev + 1); // reload để dữ liệu advisor/technician map đồng bộ qua API
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
          <h1 className={styles.title}>{isAdvisorMode ? 'Phiếu kiểm tra - Cố vấn viên' : 'Phiếu kiểm tra xe'}</h1>
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
                disabled={!canEditTechnicalFields}
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
                  <input type="text" value={tireData.frontLeft.size1} onChange={(e) => handleTireDataChange('frontLeft', 'size1', e.target.value)} className={styles.tireInputWide} placeholder="" disabled={!canEditTechnicalFields} />
                  <span className={styles.tireSlash}>/</span>
                  <input type="text" value={tireData.frontLeft.size2} onChange={(e) => handleTireDataChange('frontLeft', 'size2', e.target.value)} className={styles.tireInputWide} placeholder="" disabled={!canEditTechnicalFields} />
                  <span className={styles.tireRLabel}>R</span>
                  <input type="text" value={tireData.frontLeft.size3} onChange={(e) => handleTireDataChange('frontLeft', 'size3', e.target.value)} className={styles.tireInputWide} placeholder="" disabled={!canEditTechnicalFields} />
                </div>
                <div className={styles.tireBoxRow}>
                  <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>mm</span></div>
                  <input type="text" value={tireData.frontLeft.mm} onChange={(e) => handleTireDataChange('frontLeft', 'mm', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!canEditTechnicalFields} />
                </div>
                <div className={styles.tireBoxRow}>
                  <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>kg/cm</span></div>
                  <input type="text" value={tireData.frontLeft.pressure} onChange={(e) => handleTireDataChange('frontLeft', 'pressure', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!canEditTechnicalFields} />
                </div>
              </div>
            </div>

            {/* Lốp Sau Bên Trái */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div className={styles.tirePosition}>
                <div className={styles.tireBoxRow}>
                  <input type="text" value={tireData.rearLeft.size1} onChange={(e) => handleTireDataChange('rearLeft', 'size1', e.target.value)} className={styles.tireInputWide} placeholder="" disabled={!canEditTechnicalFields} />
                  <span className={styles.tireSlash}>/</span>
                  <input type="text" value={tireData.rearLeft.size2} onChange={(e) => handleTireDataChange('rearLeft', 'size2', e.target.value)} className={styles.tireInputWide} placeholder="" disabled={!canEditTechnicalFields} />
                  <span className={styles.tireRLabel}>R</span>
                  <input type="text" value={tireData.rearLeft.size3} onChange={(e) => handleTireDataChange('rearLeft', 'size3', e.target.value)} className={styles.tireInputWide} placeholder="" disabled={!canEditTechnicalFields} />
                </div>
                <div className={styles.tireBoxRow}>
                  <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>mm</span></div>
                  <input type="text" value={tireData.rearLeft.mm} onChange={(e) => handleTireDataChange('rearLeft', 'mm', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!canEditTechnicalFields} />
                </div>
                <div className={styles.tireBoxRow}>
                  <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>kg/cm</span></div>
                  <input type="text" value={tireData.rearLeft.pressure} onChange={(e) => handleTireDataChange('rearLeft', 'pressure', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!canEditTechnicalFields} />
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
                <input type="text" value={tireData.frontRight.mm} onChange={(e) => handleTireDataChange('frontRight', 'mm', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!canEditTechnicalFields} />
              </div>
              <div className={styles.tireBoxRow}>
                <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>kg/cm</span></div>
                <input type="text" value={tireData.frontRight.pressure} onChange={(e) => handleTireDataChange('frontRight', 'pressure', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!canEditTechnicalFields} />
              </div>
            </div>

            {/* Lốp Sau Bên Phải */}
            <div className={styles.tirePosition}>
              <div className={styles.tireBoxRow}>
                <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>mm</span></div>
                <input type="text" value={tireData.rearRight.mm} onChange={(e) => handleTireDataChange('rearRight', 'mm', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!canEditTechnicalFields} />
              </div>
              <div className={styles.tireBoxRow}>
                <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>kg/cm</span></div>
                <input type="text" value={tireData.rearRight.pressure} onChange={(e) => handleTireDataChange('rearRight', 'pressure', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!canEditTechnicalFields} />
              </div>
            </div>

            {/* Lốp Dự phòng */}
            <div className={styles.tirePosition}>
              <div className={styles.tireBoxRow}>
                <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>mm</span></div>
                <input type="text" value={tireData.spare.mm} onChange={(e) => handleTireDataChange('spare', 'mm', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!canEditTechnicalFields} />
              </div>
              <div className={styles.tireBoxRow}>
                <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>kg/cm</span></div>
                <input type="text" value={tireData.spare.pressure} onChange={(e) => handleTireDataChange('spare', 'pressure', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!canEditTechnicalFields} />
              </div>
            </div>
          </div>

          {/* CỘT ÁP SUẤT KHUYẾN CÁO - Bên phải */}
          <div style={{ position: 'absolute', right: '40px', top: '60px', display: 'flex', flexDirection: 'column', gap: '70px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '110px', justifyContent: 'center' }}>
              <label style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textAlign: 'center' }}>Áp suất<br/>khuyến cáo</label>
              <input type="text" value={tireData.frontRight.recommendedPressure} onChange={(e) => handleTireDataChange('frontRight', 'recommendedPressure', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!canEditTechnicalFields} style={{ width: '80px', height: '36px', fontSize: '14px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '110px', justifyContent: 'center' }}>
              <label style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textAlign: 'center' }}>Áp suất<br/>khuyến cáo</label>
              <input type="text" value={tireData.rearRight.recommendedPressure} onChange={(e) => handleTireDataChange('rearRight', 'recommendedPressure', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!canEditTechnicalFields} style={{ width: '80px', height: '36px', fontSize: '14px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '110px', justifyContent: 'center' }}>
              <label style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textAlign: 'center' }}>Áp suất<br/>khuyến cáo</label>
              <input type="text" value={tireData.spare.recommendedPressure} onChange={(e) => handleTireDataChange('spare', 'recommendedPressure', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!canEditTechnicalFields} style={{ width: '80px', height: '36px', fontSize: '14px' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Bảng kiểm tra an toàn - 13 hạng mục mặc định */}
      <div className={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 className={styles.sectionTitle}>HẠNG MỤC KIỂM TRA AN TOÀN</h2>
          {canEditTechnicalFields && inspectionStatus !== 'COMPLETED' && (
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
                <th>{isAdvisorMode ? 'GHI CHÚ CỐ VẤN' : 'GHI CHÚ'}</th>
              </tr>
            </thead>
            <tbody>
              {mergedSafetyChecks.map((item) => (
                <tr key={item.id}>
                  <td className={styles.itemName}>
                    <span className={styles.itemNameText}>{item.name}</span>
                    {item.isCustom && <span className={styles.customBadge}>Thêm mới</span>}
                    {item.isCustom && canEditTechnicalFields && inspectionStatus !== 'COMPLETED' && (
                      <button
                        type="button"
                        className={styles.deleteCustomButton}
                        onClick={() => handleDeleteCustomCategory(item)}
                      >
                        Xóa
                      </button>
                    )}
                  </td>
                  <td>
                    <input type="checkbox"
                      checked={item.good}
                      disabled={!canEditTechnicalFields}
                      onChange={() => handleSafetyCheck(item.id, 'good')} />
                  </td>
                  <td>
                    <input type="checkbox"
                      checked={item.warning}
                      disabled={!canEditTechnicalFields}
                      onChange={() => handleSafetyCheck(item.id, 'warning')} />
                  </td>
                  <td>
                    <input type="checkbox"
                      checked={item.replace}
                      disabled={!canEditTechnicalFields}
                      onChange={() => handleSafetyCheck(item.id, 'replace')} />
                  </td>
                  <td className={styles.noteCell}>
                    {isAdvisorMode ? (
                      <input
                        type="text"
                        className={styles.noteInput}
                        value={item.advisorNote || ''}
                        onChange={(e) => handleAdvisorNoteChange(item.id, e.target.value)}
                        placeholder="Nhập ghi chú cố vấn..."
                        disabled={!canEditAdvisorNotes}
                      />
                    ) : (item.advisorNote || item.note || '').trim() !== '' ? (
                      <span style={{ color: '#92400e', fontStyle: 'italic', fontSize: '13px' }}>{item.advisorNote || item.note}</span>
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

      {/* Phần ghi chú kỹ thuật viên */}
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Lưu ý:</h2>
        <textarea
          className={styles.notesTextarea}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Nhập ghi chú..."
          disabled={!canEditTechnicalFields}
        />
      </div>

      {(isAdvisorMode || !embedded) && (
        <div className={styles.actionButtons}>
          <div className={styles.actionLeft}>
            <button className={styles.closeButton} onClick={handleCloseTicket}>Đóng</button>
          </div>
          <div className={styles.actionRight}>
            {inspectionStatus === 'COMPLETED' && !isEditable ? (
              <button className={styles.completeButton} onClick={handleEnableEdit}>Chỉnh sửa</button>
            ) : (
              <button className={styles.completeButton} onClick={handleSave}>
                {isAdvisorMode && inspectionStatus === 'SKIPPED' ? 'Lưu' : 'Hoàn thành'}
              </button>
            )}
          </div>
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
  mode: PropTypes.oneOf(['technician', 'advisor']),
  backPath: PropTypes.string,
  onClose: PropTypes.func,
};

export default ServiceTicket;
