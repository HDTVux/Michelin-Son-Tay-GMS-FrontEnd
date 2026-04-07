import { useState, useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchTechnicianTicketDetail, startInspection } from '../../../services/technicianService';
import { fetchServiceTicketDetail, manageServiceTicketStatus } from '../../../services/serviceTicketService';
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
  const [hasSafetyInspectionEnabled, setHasSafetyInspectionEnabled] = useState(true);
  const [isEditable, setIsEditable] = useState(true);
  const [serviceTicketId, setServiceTicketId] = useState(null);
  const [inspectionId, setInspectionId] = useState(null);

  // Error state cho validate 500 ký tự
  const [recommendedTireSizeError, setRecommendedTireSizeError] = useState('');
  const [notesError, setNotesError] = useState('');
  const [skipReasonError, setSkipReasonError] = useState('');

  // Error state cho advisor note (keyed by itemId)
  const [advisorNoteErrors, setAdvisorNoteErrors] = useState({});

  // Error state cho mm lốp (keyed by position)
  const [tireMmErrors, setTireMmErrors] = useState({});

  // Ref chống spam toast khi validate 500 ký tự
  const toast500LastFired = useRef({});

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
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
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

        const safetyEnabledFromTicket = ticketResponse?.data?.safetyInspectionEnabled !== false;
        setHasSafetyInspectionEnabled(safetyEnabledFromTicket);
        setTireData(defaultTireData);
        setRecommendedTireSize('');

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

            const status = inspection.inspectionStatus || (safetyEnabledFromTicket ? 'PENDING' : 'SKIPPED');
            setInspectionStatus(status);
            const canEdit = status === 'PENDING' || status === 'SKIPPED' || !status;
            setIsEditable(canEdit);

            if (inspection.tires && inspection.tires.length > 0) {
              const newTireData = { ...defaultTireData };
              let loadedRecommendedTireSize = '';
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

                  if (!loadedRecommendedTireSize && tire.recommendedTireSize) {
                    loadedRecommendedTireSize = tire.recommendedTireSize;
                  }
                }
              });
              setTireData(newTireData);
              setRecommendedTireSize(loadedRecommendedTireSize || '');
            }

            const inspectionItems = Array.isArray(inspection.items) ? inspection.items : [];
            if (inspectionItems.length > 0) {
              const sameId = (left, right) => String(left ?? '') === String(right ?? '');
              const transformedDefaults = defaultChecks.map((defaultCheck) => {
                const existingItem = inspectionItems.find((item) =>
                  sameId(item.workCategoryId, defaultCheck.workCategoryId),
                );
                if (!existingItem) return { ...defaultCheck, note: '', advisorNote: '' };
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
          setInspectionStatus(safetyEnabledFromTicket ? 'PENDING' : 'SKIPPED');
        }
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu phiếu:', error);
        toast.error('Không thể tải dữ liệu phiếu dịch vụ: ' + (error.message || 'Lỗi không xác định'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [resolvedTicketCode, defaultTireData, embedded, refreshKey, isAdvisorMode]);

  const handleTireDataChange = (position, field, value) => {
    const key = `${position}_${field}`;

    // Validate độ sâu mm: chỉ cho số từ 0–255
    if (field === 'mm') {
      const raw = String(value);
      if (raw !== '') {
        const num = parseFloat(raw);
        if (!Number.isFinite(num) || num < 0 || num > 255) {
          // Vẫn cho nhập để user thấy lỗi, nhưng KHÔNG cắt giá trị
          setTireMmErrors(prev => ({ ...prev, [key]: 'Chỉ cho phép số từ 0 đến 255.' }));
        } else {
          setTireMmErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
        }
      } else {
        setTireMmErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
      }
      setTireData(prev => ({
        ...prev,
        [position]: { ...prev[position], [field]: raw }
      }));
      return;
    }

    // Validate 500 ký tự cho các trường khác (size, pressure, recommendedPressure)
    if (String(value).length > 500) {
      setTireData(prev => ({
        ...prev,
        [position]: { ...prev[position], [field]: String(value).slice(0, 500) }
      }));
      return;
    }

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
    const raw = String(value);
    if (raw.length > 500) {
      const now = Date.now();
      if (!toast500LastFired.current[`note_${itemId}`] || now - toast500LastFired.current[`note_${itemId}`] > 2000) {
        toast('Tối đa 500 ký tự cho mỗi ô nhập.', { containerId: 'app-toast', autoClose: 2000 });
        toast500LastFired.current[`note_${itemId}`] = now;
      }
      setAdvisorNoteErrors(prev => ({ ...prev, [itemId]: 'Tối đa 500 ký tự.' }));
    } else {
      setAdvisorNoteErrors(prev => { const n = { ...prev }; delete n[itemId]; return n; });
    }
    // Vẫn cập nhật giá trị để user thấy lỗi
    setSafetyChecks(prev => prev.map(item =>
      item.id === itemId ? { ...item, advisorNote: raw, note: raw } : item
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
      const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
      if (!token) {
        toast.error('Vui lòng đăng nhập');
        return;
      }

      if (!isAdvisorMode && !hasSafetyInspectionEnabled) {
        toast.error('Phiếu không kiểm tra an toàn chỉ có cố vấn viên mới được mở lại để chỉnh sửa.');
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
      const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
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
      const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
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
      const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
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

  const validateSafetyChecklistCompletion = () => {
    // Nếu ticket không bật kiểm tra an toàn từ lúc check-in thì không bắt buộc tick hạng mục.
    if (!hasSafetyInspectionEnabled) return null;

    const checklistItems = Array.isArray(safetyChecks)
      ? safetyChecks.filter((item) => item?.workCategoryId || item?.customCategoryId)
      : [];

    if (checklistItems.length === 0) {
      return 'Chưa có hạng mục kiểm tra an toàn. Vui lòng tải lại phiếu và kiểm tra lại danh mục.';
    }

    const uncheckedCount = checklistItems.filter(
      (item) => !(item?.good || item?.warning || item?.replace),
    ).length;

    if (uncheckedCount > 0) {
      return `Còn ${uncheckedCount} hạng mục chưa được tích trạng thái. Vui lòng tích đầy đủ trước khi hoàn thành.`;
    }

    return null;
  };

  const validateTechnicianCompletion = () => validateSafetyChecklistCompletion();

  const validateAdvisorCompletion = () => validateSafetyChecklistCompletion();

  const handleSaveAdvisorNotes = async () => {
    if (!isAdvisorMode) return;

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
      if (!token) {
        toast.error('Vui lòng đăng nhập');
        return;
      }

      let currentInspectionId = inspectionId;
      if (!currentInspectionId) {
        try {
          const inspectionResponse = await getSafetyInspectionByTicketCode(resolvedTicketCode, token);
          currentInspectionId = inspectionResponse?.data?.inspectionId || null;
        } catch {
          currentInspectionId = null;
        }
      }

      if (!currentInspectionId && hasSafetyInspectionEnabled) {
        try {
          const enableResponse = await enableSafetyInspection(resolvedTicketCode, token);
          currentInspectionId = enableResponse?.data?.inspectionId || null;
        } catch (enableError) {
          console.error('Lỗi khi kích hoạt phiếu trước khi lưu:', enableError);
        }
      }

      const getActualData = (data) => {
        if (!data || (!data.mm && !data.pressure)) return null;
        const mmRaw = data.mm ? parseFloat(data.mm) : NaN;
        const mm = Number.isFinite(mmRaw) ? mmRaw : null;
        const pressureRaw = data.pressure ? parseFloat(data.pressure) : NaN;
        const pressure = Number.isFinite(pressureRaw) ? pressureRaw : null;
        if (mm == null && pressure == null) return null;
        return {
          treadDepth: mm,
          pressure,
          pressureUnit: 'PSI',
        };
      };

      const frontSpec = (tireData.frontLeft?.size1 && tireData.frontLeft?.size2 && tireData.frontLeft?.size3)
        ? `${tireData.frontLeft.size1}/${tireData.frontLeft.size2}R${tireData.frontLeft.size3}`
        : null;

      const rearSpec = (tireData.rearLeft?.size1 && tireData.rearLeft?.size2 && tireData.rearLeft?.size3)
        ? `${tireData.rearLeft.size1}/${tireData.rearLeft.size2}R${tireData.rearLeft.size3}`
        : null;

      const frontRecommendedPressure = tireData.frontRight?.recommendedPressure
        ? parseFloat(tireData.frontRight.recommendedPressure)
        : null;

      const rearRecommendedPressure = tireData.rearRight?.recommendedPressure
        ? parseFloat(tireData.rearRight.recommendedPressure)
        : null;

      const spareRecommendedPressure = tireData.spare?.recommendedPressure
        ? parseFloat(tireData.spare.recommendedPressure)
        : null;

      const tiresPayload = {
        frontTireSpecification: frontSpec,
        rearTireSpecification: rearSpec,
        recommendedTireSize: recommendedTireSize || null,
        frontLeft: getActualData(tireData.frontLeft),
        frontRight: getActualData(tireData.frontRight),
        rearLeft: getActualData(tireData.rearLeft),
        rearRight: getActualData(tireData.rearRight),
        spare: getActualData(tireData.spare),
        frontRecommendedPressure,
        rearRecommendedPressure,
        spareRecommendedPressure,
      };

      const itemsPayload = safetyChecks
        .map((check) => ({
          workCategoryId: check.workCategoryId || null,
          customCategoryId: check.customCategoryId || null,
          itemStatus: check.good ? 'GOOD' : check.warning ? 'WARNING' : check.replace ? 'REPLACE' : null,
        }))
        .filter((check) => check.workCategoryId || check.customCategoryId);

      const finalServiceTicketId = resolveServiceTicketId();
      if (!finalServiceTicketId) {
        throw new Error('Thiếu serviceTicketId để lưu phiếu kiểm tra.');
      }

      const safetyPayload = {
        serviceTicketId: finalServiceTicketId,
        technicianNotes: notes || null,
        tires: tiresPayload,
        items: itemsPayload,
      };

      if (currentInspectionId) {
        const updateRes = await updateSafetyInspectionData(currentInspectionId, safetyPayload, token);
        currentInspectionId = updateRes?.data?.inspectionId || currentInspectionId;
      } else {
        const saveRes = await saveSafetyInspectionData(safetyPayload, token);
        currentInspectionId = saveRes?.data?.inspectionId || null;
      }

      if (!currentInspectionId) {
        throw new Error('Không lấy được inspectionId sau khi lưu phiếu.');
      }

      const advisorItems = safetyChecks
        .filter((item) => item.workCategoryId || item.customCategoryId)
        .map((item) => ({
          workCategoryId: item.workCategoryId ?? null,
          customCategoryId: item.customCategoryId ?? null,
          advisorNote: String(item.advisorNote ?? item.note ?? ''),
        }));

      await updateAdvisorNotes(currentInspectionId, advisorItems, token);

      // Lưu mềm cho advisor: giữ phiếu ở trạng thái có thể tiếp tục chỉnh sửa
      try {
        await reopenSafetyInspection(resolvedTicketCode, token);
        setInspectionStatus('PENDING');
      } catch (reopenError) {
        console.warn('Không reopen được phiếu sau khi lưu mềm:', reopenError);
      }

      setInspectionId(currentInspectionId);
      setIsEditable(true);
      setRefreshKey((prev) => prev + 1);
      toast.success('Đã lưu dữ liệu phiếu kiểm tra an toàn.');
    } catch (error) {
      console.error('Lỗi khi lưu dữ liệu phiếu (advisor):', error);
      toast.error('Không thể lưu phiếu: ' + (error.message || 'Lỗi không xác định'));
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
      const completionInspectionStatus = 'COMPLETED';

      if (!isAdvisorMode) {
        const validationError = validateTechnicianCompletion();
        if (validationError) {
          toast.error(validationError);
          return;
        }
      } else {
        const validationError = validateAdvisorCompletion();
        if (validationError) {
          toast.error(validationError);
          return;
        }
      }

      if (!inspectionId && hasSafetyInspectionEnabled) {
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
          if (!data || (!data.mm && !data.pressure)) return null;
          const mmRaw = data.mm ? parseFloat(data.mm) : NaN;
          const mm = Number.isFinite(mmRaw) ? mmRaw : null;
          const pressureRaw = data.pressure ? parseFloat(data.pressure) : NaN;
          const pressure = Number.isFinite(pressureRaw) ? pressureRaw : null;
          if (mm == null && pressure == null) return null;
          return {
            treadDepth: mm,
            pressure: pressure,
            pressureUnit: 'PSI'
          };
        };

        const frontSpec = (tireData.frontLeft?.size1 && tireData.frontLeft?.size2 && tireData.frontLeft?.size3)
          ? `${tireData.frontLeft.size1}/${tireData.frontLeft.size2}R${tireData.frontLeft.size3}`
          : null;

        const rearSpec = (tireData.rearLeft?.size1 && tireData.rearLeft?.size2 && tireData.rearLeft?.size3)
          ? `${tireData.rearLeft.size1}/${tireData.rearLeft.size2}R${tireData.rearLeft.size3}`
          : null;

        const frontRecommendedPressure = tireData.frontRight?.recommendedPressure
          ? parseFloat(tireData.frontRight.recommendedPressure)
          : null;

        const rearRecommendedPressure = tireData.rearRight?.recommendedPressure
          ? parseFloat(tireData.rearRight.recommendedPressure)
          : null;

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
        .filter(check => (check.workCategoryId || check.customCategoryId));

      const finalServiceTicketId = resolveServiceTicketId();
      if (!finalServiceTicketId) {
        throw new Error('Thiếu serviceTicketId để lưu phiếu kiểm tra.');
      }

      const safetyPayload = {
        serviceTicketId: finalServiceTicketId,
        technicianNotes: notes || null,
        tires: tiresPayload,
        items: itemsPayload,
        inspectionStatus: completionInspectionStatus,
      };

      let currentInspectionId = inspectionId;

      if (inspectionId) {
        const updateRes = await updateSafetyInspectionData(inspectionId, safetyPayload, token);
        currentInspectionId = updateRes?.data?.inspectionId || inspectionId;
      } else {
        const saveRes = await saveSafetyInspectionData(safetyPayload, token);
        currentInspectionId = saveRes?.data?.inspectionId || inspectionId;
      }
      setInspectionStatus(completionInspectionStatus);

      // Advisor note lưu cùng phiếu kỹ thuật viên
      if (isAdvisorMode && currentInspectionId) {
        const advisorItems = safetyChecks
          .filter((item) => String(item.advisorNote || item.note || '').trim() !== '')
          .map((item) => ({
            workCategoryId: item.workCategoryId ?? null,
            customCategoryId: item.customCategoryId ?? null,
            advisorNote: item.advisorNote ?? item.note ?? '',
          }));

        if (advisorItems.length > 0) {
          await updateAdvisorNotes(currentInspectionId, advisorItems, token);
        }
      }

      // Khi cố vấn viên hoàn thành phiếu an toàn: đồng bộ trạng thái công việc KTV ngay,
      // không chờ kỹ thuật viên bấm "Bắt đầu làm việc".
      if (isAdvisorMode) {
        const finalServiceTicketId = resolveServiceTicketId();
        let syncedTechnicianStatus = false;
        let syncError = null;

        try {
          await startInspection(resolvedTicketCode, token);
          syncedTechnicianStatus = true;
        } catch (error) {
          syncError = error;
        }

        if (!syncedTechnicianStatus && finalServiceTicketId) {
          try {
            await manageServiceTicketStatus(finalServiceTicketId, 'INSPECTION', token);
            syncedTechnicianStatus = true;
          } catch (error) {
            syncError = error;
          }
        }

        if (!syncedTechnicianStatus && syncError) {
          toast.warn(
            `Phiếu đã hoàn thành nhưng chưa đồng bộ trạng thái KTV: ${syncError.message || 'Lỗi không xác định'}`,
          );
        }
      }

      if (currentInspectionId) {
        setInspectionId(currentInspectionId);
      }

      toast.success('Đã hoàn thành phiếu kiểm tra an toàn.');
      setIsEditable(false);
      setRefreshKey(prev => prev + 1); // reload để dữ liệu advisor/technician map đồng bộ qua API
    } catch (error) {
      console.error('Lỗi khi lưu dữ liệu:', error);
      toast.error('Lỗi khi lưu dữ liệu: ' + (error.message || 'Lỗi không xác định'));
    }
  };

  const shouldShowEnableEditButton =
    isAdvisorMode &&
    inspectionStatus === 'COMPLETED' &&
    !isEditable;

  const isTechnicianLockedAfterSaveNoSafety =
    !isAdvisorMode &&
    !hasSafetyInspectionEnabled &&
    inspectionStatus === 'COMPLETED' &&
    !isEditable;

  const isTechnicianLockedAfterSave =
    !isAdvisorMode &&
    inspectionStatus === 'COMPLETED' &&
    !isEditable;

  const technicianCompletionError = !isAdvisorMode ? validateTechnicianCompletion() : null;
  const advisorCompletionError = isAdvisorMode ? validateAdvisorCompletion() : null;

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
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.length > 500) {
                    const now = Date.now();
                    if (!toast500LastFired.current['recommendedTireSize'] || now - toast500LastFired.current['recommendedTireSize'] > 2000) {
                      toast('Tối đa 500 ký tự cho mỗi ô nhập.', { containerId: 'app-toast', autoClose: 2000 });
                      toast500LastFired.current['recommendedTireSize'] = now;
                    }
                    setRecommendedTireSizeError('Tối đa 500 ký tự.');
                    setRecommendedTireSize(val);
                  } else {
                    setRecommendedTireSize(val);
                    setRecommendedTireSizeError('');
                  }
                }}
                className={styles.tireSizeInput}
                placeholder="Nhập size lốp..."
                disabled={!canEditTechnicalFields}
              />
              {recommendedTireSizeError && (
                <span style={{ color: '#dc2626', fontSize: '12px', marginTop: '2px' }}>{recommendedTireSizeError}</span>
              )}
            </div>
          </div>
        </div>

        <div style={{ position: 'relative', height: '520px', marginTop: '20px' }}>
          {/* BÊN TRÁI - FRONT LEFT (trên-trái) + REAR LEFT (dưới-trái) */}
          <div style={{ position: 'absolute', left: '10px', top: '50px', display: 'flex', flexDirection: 'column', gap: '100px' }}>
            {/* FRONT LEFT */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div className={styles.tireBoxRow}>
                  <input type="text" value={tireData.frontLeft.size1} onChange={(e) => handleTireDataChange('frontLeft', 'size1', e.target.value)} className={styles.tireInputWide} placeholder="" disabled={!canEditTechnicalFields} />
                  <span className={styles.tireSlash}>/</span>
                  <input type="text" value={tireData.frontLeft.size2} onChange={(e) => handleTireDataChange('frontLeft', 'size2', e.target.value)} className={styles.tireInputWide} placeholder="" disabled={!canEditTechnicalFields} />
                  <span className={styles.tireRLabel}>R</span>
                  <input type="text" value={tireData.frontLeft.size3} onChange={(e) => handleTireDataChange('frontLeft', 'size3', e.target.value)} className={styles.tireInputWide} placeholder="" disabled={!canEditTechnicalFields} />
                </div>
                <div className={styles.tireBoxRow}>
                  <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>mm</span></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <input type="text" value={tireData.frontLeft.mm} onChange={(e) => handleTireDataChange('frontLeft', 'mm', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!canEditTechnicalFields} />
                    {tireMmErrors['frontLeft_mm'] && <span style={{ color: '#dc2626', fontSize: '10px' }}>{tireMmErrors['frontLeft_mm']}</span>}
                  </div>
                </div>
                <div className={styles.tireBoxRow}>
                  <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>kg/cm²</span></div>
                  <input type="text" value={tireData.frontLeft.pressure} onChange={(e) => handleTireDataChange('frontLeft', 'pressure', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!canEditTechnicalFields} />
                </div>
              </div>
            </div>

            {/* REAR LEFT */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div className={styles.tireBoxRow}>
                  <input type="text" value={tireData.rearLeft.size1} onChange={(e) => handleTireDataChange('rearLeft', 'size1', e.target.value)} className={styles.tireInputWide} placeholder="" disabled={!canEditTechnicalFields} />
                  <span className={styles.tireSlash}>/</span>
                  <input type="text" value={tireData.rearLeft.size2} onChange={(e) => handleTireDataChange('rearLeft', 'size2', e.target.value)} className={styles.tireInputWide} placeholder="" disabled={!canEditTechnicalFields} />
                  <span className={styles.tireRLabel}>R</span>
                  <input type="text" value={tireData.rearLeft.size3} onChange={(e) => handleTireDataChange('rearLeft', 'size3', e.target.value)} className={styles.tireInputWide} placeholder="" disabled={!canEditTechnicalFields} />
                </div>
                <div className={styles.tireBoxRow}>
                  <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>mm</span></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <input type="text" value={tireData.rearLeft.mm} onChange={(e) => handleTireDataChange('rearLeft', 'mm', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!canEditTechnicalFields} />
                    {tireMmErrors['rearLeft_mm'] && <span style={{ color: '#dc2626', fontSize: '10px' }}>{tireMmErrors['rearLeft_mm']}</span>}
                  </div>
                </div>
                <div className={styles.tireBoxRow}>
                  <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>kg/cm²</span></div>
                  <input type="text" value={tireData.rearLeft.pressure} onChange={(e) => handleTireDataChange('rearLeft', 'pressure', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!canEditTechnicalFields} />
                </div>
              </div>
            </div>
          </div>

          {/* THÂN XE - Giữa */}
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
            <img src={carImage} alt="Car" style={{ width: '260px', height: 'auto', objectFit: 'contain' }} />
          </div>

          {/* BÁNH XE - 4 vị trí hiển thị */}
          <div className={styles.wheel} style={{ position: 'absolute', top: '80px', left: '50%', transform: 'translateX(-120px)' }}>
            <div className={styles.wheelRim}></div>
          </div>
          <div className={styles.wheel} style={{ position: 'absolute', top: '80px', left: '50%', transform: 'translateX(75px)' }}>
            <div className={styles.wheelRim}></div>
          </div>
          <div className={styles.wheel} style={{ position: 'absolute', top: '280px', left: '50%', transform: 'translateX(-120px)' }}>
            <div className={styles.wheelRim}></div>
          </div>
          <div className={styles.wheel} style={{ position: 'absolute', top: '280px', left: '50%', transform: 'translateX(75px)' }}>
            <div className={styles.wheelRim}></div>
          </div>

          {/* BÊN PHẢI - FRONT RIGHT + REAR RIGHT + SPARE */}
          {/* Mỗi tire block gồm: [mm] [PSI] | [Áp suất khuyến cáo] */}
          <div style={{ position: 'absolute', right: '10px', top: '50px', display: 'flex', flexDirection: 'column', gap: '50px' }}>

            {/* FRONT RIGHT - [mm][PSI] | [Áp suất khuyến cáo] */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              {/* [mm] [PSI] */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div className={styles.tireBoxRow}>
                  <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>mm</span></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <input type="text" value={tireData.frontRight.mm} onChange={(e) => handleTireDataChange('frontRight', 'mm', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!canEditTechnicalFields} />
                    {tireMmErrors['frontRight_mm'] && <span style={{ color: '#dc2626', fontSize: '10px' }}>{tireMmErrors['frontRight_mm']}</span>}
                  </div>
                </div>
                <div className={styles.tireBoxRow}>
                  <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>kg/cm²</span></div>
                  <input type="text" value={tireData.frontRight.pressure} onChange={(e) => handleTireDataChange('frontRight', 'pressure', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!canEditTechnicalFields} />
                </div>
              </div>
              {/* [Áp suất khuyến cáo] */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '4px' }}>
                <label style={{ fontSize: '10px', color: '#6b7280', marginBottom: '3px', textAlign: 'center', whiteSpace: 'nowrap' }}>Áp suất<br/>khuyến cáo</label>
                <input type="text" value={tireData.frontRight.recommendedPressure} onChange={(e) => handleTireDataChange('frontRight', 'recommendedPressure', e.target.value)} className={styles.tireInputDashed} placeholder="" disabled={!canEditTechnicalFields} style={{ width: '72px', height: '32px', fontSize: '13px' }} />
              </div>
            </div>

            {/* REAR RIGHT - [mm][PSI] | [Áp suất khuyến cáo] */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div className={styles.tireBoxRow}>
                  <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>mm</span></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <input type="text" value={tireData.rearRight.mm} onChange={(e) => handleTireDataChange('rearRight', 'mm', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!canEditTechnicalFields} />
                    {tireMmErrors['rearRight_mm'] && <span style={{ color: '#dc2626', fontSize: '10px' }}>{tireMmErrors['rearRight_mm']}</span>}
                  </div>
                </div>
                <div className={styles.tireBoxRow}>
                  <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>kg/cm²</span></div>
                  <input type="text" value={tireData.rearRight.pressure} onChange={(e) => handleTireDataChange('rearRight', 'pressure', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!canEditTechnicalFields} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '4px' }}>
                <label style={{ fontSize: '10px', color: '#6b7280', marginBottom: '3px', textAlign: 'center', whiteSpace: 'nowrap' }}>Áp suất<br/>khuyến cáo</label>
                <input type="text" value={tireData.rearRight.recommendedPressure} onChange={(e) => handleTireDataChange('rearRight', 'recommendedPressure', e.target.value)} className={styles.tireInputDashed} placeholder="" disabled={!canEditTechnicalFields} style={{ width: '72px', height: '32px', fontSize: '13px' }} />
              </div>
            </div>

            {/* SPARE - [mm][PSI] | [Áp suất khuyến cáo] */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div className={styles.tireBoxRow}>
                  <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>mm</span></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <input type="text" value={tireData.spare.mm} onChange={(e) => handleTireDataChange('spare', 'mm', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!canEditTechnicalFields} />
                    {tireMmErrors['spare_mm'] && <span style={{ color: '#dc2626', fontSize: '10px' }}>{tireMmErrors['spare_mm']}</span>}
                  </div>
                </div>
                <div className={styles.tireBoxRow}>
                  <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>kg/cm²</span></div>
                  <input type="text" value={tireData.spare.pressure} onChange={(e) => handleTireDataChange('spare', 'pressure', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!canEditTechnicalFields} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '4px' }}>
                <label style={{ fontSize: '10px', color: '#6b7280', marginBottom: '3px', textAlign: 'center', whiteSpace: 'nowrap' }}>Áp suất<br/>khuyến cáo</label>
                <input type="text" value={tireData.spare.recommendedPressure} onChange={(e) => handleTireDataChange('spare', 'recommendedPressure', e.target.value)} className={styles.tireInputDashed} placeholder="" disabled={!canEditTechnicalFields} style={{ width: '72px', height: '32px', fontSize: '13px' }} />
              </div>
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
                    <div
                      onClick={canEditTechnicalFields ? () => handleSafetyCheck(item.id, 'good') : undefined}
                      className={`${styles.checkCell} ${item.good ? styles.checkGood : styles.checkEmpty}`}
                      title={canEditTechnicalFields ? (item.good ? 'Bỏ chọn TỐT' : 'Chọn TỐT') : ''}
                    >
                      {item.good ? '✓' : '□'}
                    </div>
                  </td>
                  <td>
                    <div
                      onClick={canEditTechnicalFields ? () => handleSafetyCheck(item.id, 'warning') : undefined}
                      className={`${styles.checkCell} ${item.warning ? styles.checkWarning : styles.checkEmpty}`}
                      title={canEditTechnicalFields ? (item.warning ? 'Bỏ chọn LƯU Ý' : 'Chọn LƯU Ý') : ''}
                    >
                      {item.warning ? '✓' : '□'}
                    </div>
                  </td>
                  <td>
                    <div
                      onClick={canEditTechnicalFields ? () => handleSafetyCheck(item.id, 'replace') : undefined}
                      className={`${styles.checkCell} ${item.replace ? styles.checkReplace : styles.checkEmpty}`}
                      title={canEditTechnicalFields ? (item.replace ? 'Bỏ chọn THAY' : 'Chọn THAY') : ''}
                    >
                      {item.replace ? '✓' : '□'}
                    </div>
                  </td>
                  <td className={styles.noteCell}>
                    {isAdvisorMode ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <input
                          type="text"
                          className={styles.noteInput}
                          value={item.advisorNote || ''}
                          onChange={(e) => handleAdvisorNoteChange(item.id, e.target.value)}
                          placeholder="Nhập ghi chú cố vấn..."
                          disabled={!canEditAdvisorNotes}
                        />
                        {advisorNoteErrors[item.id] && (
                          <span style={{ color: '#dc2626', fontSize: '11px' }}>{advisorNoteErrors[item.id]}</span>
                        )}
                      </div>
                    ) : (
                      <>
                        {(item.advisorNote || item.note || '').trim() !== '' ? (
                          <span style={{ color: '#92400e', fontStyle: 'italic', fontSize: '13px' }}>{item.advisorNote || item.note}</span>
                        ) : (
                          <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '13px' }}>—</span>
                        )}
                      </>
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
          onChange={(e) => {
            const val = e.target.value;
            if (val.length > 500) {
              const now = Date.now();
              if (!toast500LastFired.current['notes'] || now - toast500LastFired.current['notes'] > 2000) {
                toast('Tối đa 500 ký tự cho mỗi ô nhập.', { containerId: 'app-toast', autoClose: 2000 });
                toast500LastFired.current['notes'] = now;
              }
              setNotesError('Tối đa 500 ký tự.');
              setNotes(val);
            } else {
              setNotes(val);
              setNotesError('');
            }
          }}
          rows={4}
          placeholder="Nhập ghi chú..."
          disabled={!canEditTechnicalFields}
        />
        {notesError && (
          <span style={{ color: '#dc2626', fontSize: '12px', marginTop: '2px', display: 'block' }}>{notesError}</span>
        )}
      </div>

      {(isAdvisorMode || !embedded) && (
        <div className={styles.actionButtons}>
          <div className={styles.actionLeft}>
            {!(isAdvisorMode && embedded) && (
              <button className={styles.closeButton} onClick={handleCloseTicket}>Đóng</button>
            )}
            {isAdvisorMode && !shouldShowEnableEditButton && (
              <button
                className={styles.completeButton}
                onClick={handleSaveAdvisorNotes}
                disabled={!isEditable}
              >
                Lưu
              </button>
            )}
          </div>
          <div className={styles.actionRight}>
            {shouldShowEnableEditButton ? (
              <button className={styles.completeButton} onClick={handleEnableEdit}>Chỉnh sửa</button>
            ) : isAdvisorMode ? (
              <button
                className={styles.completeButton}
                onClick={handleSave}
                disabled={!isEditable || Boolean(advisorCompletionError)}
                title={advisorCompletionError || ''}
              >
                Hoàn thành
              </button>
            ) : (
              <button
                className={styles.completeButton}
                onClick={handleSave}
                disabled={isTechnicianLockedAfterSaveNoSafety || isTechnicianLockedAfterSave || Boolean(technicianCompletionError)}
                title={technicianCompletionError || ''}
              >
                Hoàn thành
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
                <textarea
                    value={skipReason}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val.length > 500) {
                            const now = Date.now();
                            if (!toast500LastFired.current['skipReason'] || now - toast500LastFired.current['skipReason'] > 2000) {
                                toast('Tối đa 500 ký tự cho mỗi ô nhập.', { containerId: 'app-toast', autoClose: 2000 });
                                toast500LastFired.current['skipReason'] = now;
                            }
                            setSkipReasonError('Tối đa 500 ký tự.');
                            setSkipReason(val);
                        } else {
                            setSkipReason(val);
                            setSkipReasonError('');
                        }
                    }}
                    className={styles.formInput}
                    rows={3}
                    placeholder="Nhập lý do bỏ qua kiểm tra..."
                />
                {skipReasonError && (
                  <span style={{ color: '#dc2626', fontSize: '12px', marginTop: '2px', display: 'block' }}>{skipReasonError}</span>
                )}
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
