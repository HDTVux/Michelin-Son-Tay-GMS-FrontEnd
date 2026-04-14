import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchTechnicianTicketDetail, startInspection } from '../../../services/technicianService';
import { fetchSafetyInspectionCurrentRecommend, fetchServiceTicketDetail, manageServiceTicketStatus } from '../../../services/serviceTicketService';
import {
  getSafetyInspectionByTicketCode,
  saveSafetyInspectionData,
  updateSafetyInspectionData,
  getDefaultSafetyInspectionCategories,
  skipSafetyInspection,
  createWorkCategory,
  deleteCustomCategory,
  enableSafetyInspection,
  updateAdvisorNotes,
  upsertSafetyInspectionItems,
  reopenSafetyInspection,
} from '../../../services/safetyInspectionService';
import styles from './ServiceTicket.module.css';
import carImage from '../../../assets/oto_4.jpg';

const LOCKED_SERVICE_TICKET_STATUSES = new Set(['PAID', 'COMPLETED']);
const TEXT_FIELD_CHAR_LIMIT = 500;
const CATEGORY_NAME_CHAR_LIMIT = 100;
const getRecommendationStorageKey = (serviceTicketId) => `serviceTicketRecommendation:${serviceTicketId}`;

const normalizeServiceTicketStatus = (status) => String(status ?? '')
  .trim()
  .toUpperCase()
  .replaceAll(/\s+/g, '_');

const normalizeSafetyInspectionStatus = (status) => {
  const raw = String(status ?? '')
    .trim()
    .toUpperCase()
    .replaceAll(/[\s-]+/g, '_');
  if (!raw) return '';
  if (['SKIP', 'SKIPPED', 'DISABLED', 'NOT_REQUIRED', 'NO_SAFETY_INSPECTION'].includes(raw)) return 'SKIPPED';
  if (['DONE', 'FINISHED', 'PASSED'].includes(raw)) return 'COMPLETED';
  if (['WAITING', 'REPAIRING'].includes(raw)) return 'PENDING';
  return raw;
};

const INTEGER_TIRE_FIELDS = new Set(['size1', 'size2', 'size3']);

const TIRE_POSITION_LABELS = {
  frontLeft: 'Lốp trước trái',
  frontRight: 'Lốp trước phải',
  rearLeft: 'Lốp sau trái',
  rearRight: 'Lốp sau phải',
  spare: 'Lốp dự phòng',
};

const TIRE_FIELD_LABELS = {
  size1: 'bề rộng lốp',
  size2: 'tỷ lệ hông lốp',
  size3: 'đường kính mâm',
  mm: 'độ sâu gai lốp',
  pressure: 'áp suất thực tế',
  recommendedPressure: 'áp suất khuyến cáo',
};

const TIRE_FIELD_RANGES = {
  size1: { min: 100, max: 405, unit: 'mm' },
  size2: { min: 20, max: 100, unit: '%' },
  size3: { min: 10, max: 30, unit: 'inch' },
  mm: { min: 0, max: 25, unit: 'mm' },
  pressure: { min: 0.5, max: 6, unit: 'kg/cm2' },
  recommendedPressure: { min: 0.5, max: 6, unit: 'kg/cm2' },
};

const RECOMMENDED_TIRE_SIZE_EXAMPLE = '205/55R16';
const RECOMMENDED_TIRE_SIZE_PATTERN = /^\d{2,3}\/\d{2,3}R\d{1,2}$/i;

const normalizeRecommendedTireSizeValue = (value) => String(value ?? '').replaceAll(/\s+/g, '').toUpperCase();

const extractRecommendationValue = (response) => {
  const payload = response?.data?.data ?? response?.data ?? response;
  if (typeof payload === 'string') return payload.trim();
  if (!payload || typeof payload !== 'object') return '';
  return String(
    payload?.recommend
    ?? payload?.recommendation
    ?? payload?.recommendationText
    ?? payload?.currentRecommend
    ?? '',
  ).trim();
};

const getTireFieldLabel = (position, field) => {
  const positionLabel = TIRE_POSITION_LABELS[position] || 'Lốp';
  const fieldLabel = TIRE_FIELD_LABELS[field] || 'thông số';
  return `${positionLabel} - ${fieldLabel}`;
};

const getRangeError = (value, label, range) => {
  if (!range) return '';
  if (value < range.min || value > range.max) {
    return `${label} phải nằm trong khoảng ${range.min}-${range.max} ${range.unit}.`;
  }
  return '';
};

const getNumericTireFieldError = (rawValue, fieldLabel, options = {}) => {
  const raw = String(rawValue ?? '').trim();
  if (!raw) return '';
  if (raw.startsWith('-')) return `${fieldLabel} không được nhập số âm.`;
  const numberPattern = options.integer ? /^\d+$/ : /^\d*\.?\d*$/;
  if (!numberPattern.test(raw) || raw === '.') {
    return options.integer
      ? `${fieldLabel} chỉ được nhập số nguyên dương.`
      : `${fieldLabel} chỉ được nhập số dương, không nhập chữ hoặc ký tự đặc biệt.`;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return `${fieldLabel} không hợp lệ.`;
  if (parsed < 0) return `${fieldLabel} không được nhập số âm.`;
  const rangeError = getRangeError(parsed, fieldLabel, options.range);
  if (rangeError) return rangeError;
  return '';
};

const getTireInputError = (position, field, value) => {
  const label = getTireFieldLabel(position, field);
  return getNumericTireFieldError(value, label, {
    integer: INTEGER_TIRE_FIELDS.has(field),
    range: TIRE_FIELD_RANGES[field],
  });
};

const getTireInputErrorMap = (tireData) => {
  const errors = {};
  Object.keys(TIRE_POSITION_LABELS).forEach((position) => {
    Object.keys(TIRE_FIELD_RANGES).forEach((field) => {
      const error = getTireInputError(position, field, tireData?.[position]?.[field]);
      if (error) errors[`${position}_${field}`] = error;
    });
  });
  return errors;
};

const getRecommendedTireSizeError = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (raw.length > TEXT_FIELD_CHAR_LIMIT) return `Size lốp khuyến cáo tối đa ${TEXT_FIELD_CHAR_LIMIT} ký tự.`;
  if (raw.includes('-')) return 'Size lốp khuyến cáo không được nhập số âm.';
  const normalized = normalizeRecommendedTireSizeValue(raw);
  if (!RECOMMENDED_TIRE_SIZE_PATTERN.test(normalized)) {
    return `Size lốp khuyến cáo phải đúng định dạng ${RECOMMENDED_TIRE_SIZE_EXAMPLE}.`;
  }

  const match = /^(\d{2,3})\/(\d{2,3})R(\d{1,2})$/i.exec(normalized);
  const rangeChecks = [
    { label: 'Size lốp khuyến cáo - bề rộng lốp', value: Number(match?.[1]), range: TIRE_FIELD_RANGES.size1 },
    { label: 'Size lốp khuyến cáo - tỷ lệ hông lốp', value: Number(match?.[2]), range: TIRE_FIELD_RANGES.size2 },
    { label: 'Size lốp khuyến cáo - đường kính mâm', value: Number(match?.[3]), range: TIRE_FIELD_RANGES.size3 },
  ];
  const rangeError = rangeChecks
    .map((item) => getRangeError(item.value, item.label, item.range))
    .find(Boolean);
  if (rangeError) return rangeError;

  return '';
};

const normalizeCategoryNameForCompare = (value) => String(value ?? '')
  .trim()
  .toLowerCase()
  .replaceAll(/\s+/g, ' ');

const getNewCategoryNameError = (value, existingChecks = []) => {
  const raw = String(value ?? '');
  const name = raw.trim();
  if (!name) return 'Vui lòng nhập tên hạng mục kiểm tra.';
  if (name.length < 2) return 'Tên hạng mục kiểm tra phải có ít nhất 2 ký tự.';
  if (name.length > CATEGORY_NAME_CHAR_LIMIT) {
    return `Tên hạng mục kiểm tra tối đa ${CATEGORY_NAME_CHAR_LIMIT} ký tự.`;
  }
  if (/[<>{}]/.test(name)) {
    return 'Tên hạng mục kiểm tra không được chứa ký tự <, >, {, }.';
  }
  if (/^\d+$/.test(name)) {
    return 'Tên hạng mục kiểm tra không được chỉ gồm chữ số.';
  }

  const normalizedName = normalizeCategoryNameForCompare(name);
  const isDuplicated = (Array.isArray(existingChecks) ? existingChecks : []).some((item) => {
    return normalizeCategoryNameForCompare(item?.name || item?.categoryName) === normalizedName;
  });
  if (isDuplicated) return 'Hạng mục kiểm tra này đã tồn tại.';

  return '';
};

const getSafetyItemKey = (item) => {
  const customCategoryId = item?.customCategoryId ?? item?.custom_category_id ?? null;
  if (customCategoryId != null && String(customCategoryId).trim() !== '') {
    return `custom:${String(customCategoryId).trim()}`;
  }

  const workCategoryId = item?.workCategoryId ?? item?.work_category_id ?? null;
  if (workCategoryId != null && String(workCategoryId).trim() !== '') {
    return `work:${String(workCategoryId).trim()}`;
  }

  return '';
};

const buildAdvisorNotePatchItems = (items) => {
  const rows = Array.isArray(items) ? items : [];
  return rows
    .map((item) => {
      const advisorNote = String(item?.advisorNote ?? item?.advisor_note ?? item?.note ?? '');
      if (!advisorNote.trim()) return null;
      const workCategoryId = item?.workCategoryId ?? item?.work_category_id ?? null;
      const customCategoryId = item?.customCategoryId ?? item?.custom_category_id ?? null;
      if (workCategoryId == null && customCategoryId == null) return null;
      return {
        workCategoryId,
        customCategoryId,
        advisorNote,
      };
    })
    .filter(Boolean);
};

export const ServiceTicket = ({
  ticketCode,
  embedded = false,
  mode = 'technician',
  backPath = '/technician/my-tasks',
  onClose = null,
  onInspectionCompleted = null,
  readOnly = false,
  readOnlyMessage = '',
}) => {
  const { id: idParam } = useParams();
  const resolvedTicketCode = String(ticketCode || idParam || '').trim();
  const navigate = useNavigate();
  const isAdvisorMode = mode === 'advisor';
  const [loading, setLoading] = useState(true);
  const [recommendedTireSize, setRecommendedTireSize] = useState('');
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryNameError, setNewCategoryNameError] = useState('');

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
  const [serviceTicketId, setServiceTicketId] = useState(null);
  const [serviceTicketStatus, setServiceTicketStatus] = useState('');
  const [inspectionId, setInspectionId] = useState(null);

  // Error state cho validate 500 ký tự
  const [recommendedTireSizeError, setRecommendedTireSizeError] = useState('');
  const [notesError, setNotesError] = useState('');
  const [skipReasonError, setSkipReasonError] = useState('');

  // Error state cho advisor note (keyed by itemId)
  const [advisorNoteErrors, setAdvisorNoteErrors] = useState({});

  // Ref chống spam toast khi validate 500 ký tự
  const toast500LastFired = useRef({});
  const hasUnsavedLocalEditsRef = useRef(false);

  const [refreshKey, setRefreshKey] = useState(0);
  const normalizedServiceTicketStatus = useMemo(
    () => normalizeServiceTicketStatus(serviceTicketStatus),
    [serviceTicketStatus],
  );
  const normalizedInspectionStatus = useMemo(
    () => normalizeSafetyInspectionStatus(inspectionStatus),
    [inspectionStatus],
  );
  const shouldRequireSafetyInspection = hasSafetyInspectionEnabled && normalizedInspectionStatus !== 'SKIPPED';
  const isServiceTicketLocked = LOCKED_SERVICE_TICKET_STATUSES.has(normalizedServiceTicketStatus);
  const isInspectionCompleted = normalizedInspectionStatus === 'COMPLETED';
  const isFormLocked = Boolean(readOnly) || isServiceTicketLocked || isInspectionCompleted;
  const serviceTicketLockMessage = readOnlyMessage || 'Phiếu dịch vụ hoặc phiếu kiểm tra an toàn đã hoàn thành, không thể chỉnh sửa.';
  const canEditTechnicalFields = !isFormLocked;
  const canEditAdvisorNotes = !isFormLocked;
  const advisorNoteHasErrors = Object.keys(advisorNoteErrors).length > 0;
  const textFieldValidationError = (shouldRequireSafetyInspection ? recommendedTireSizeError : '')
    || notesError
    || (advisorNoteHasErrors ? 'Vui lòng rút gọn nội dung ghi chú vượt quá giới hạn.' : '');
  const blockingTextFieldValidationError = shouldRequireSafetyInspection ? textFieldValidationError : '';

  useEffect(() => {
    const nextError = getRecommendedTireSizeError(recommendedTireSize);
    setRecommendedTireSizeError((prev) => (prev === nextError ? prev : nextError));
  }, [recommendedTireSize]);

  const guardServiceTicketEditable = () => {
    if (!isFormLocked) return true;
    toast.info(serviceTicketLockMessage);
    return false;
  };

  const markUnsavedLocalEdit = useCallback(() => {
    hasUnsavedLocalEditsRef.current = true;
  }, []);

  const markLocalEditsSaved = useCallback(() => {
    hasUnsavedLocalEditsRef.current = false;
  }, []);

  const resolveServiceTicketId = useCallback(() => {
    const parsedServiceTicketId = Number(resolvedTicketCode);
    return serviceTicketId || (Number.isFinite(parsedServiceTicketId) ? parsedServiceTicketId : null);
  }, [resolvedTicketCode, serviceTicketId]);

  const syncServiceTicketStatus = useCallback(async (nextStatus, token, fallbackMessage) => {
    const finalServiceTicketId = resolveServiceTicketId();
    if (!finalServiceTicketId) return false;
    try {
      await manageServiceTicketStatus(finalServiceTicketId, nextStatus, token);
      setServiceTicketStatus(nextStatus);
      return true;
    } catch (error) {
      if (fallbackMessage) {
        toast.warn(`${fallbackMessage}: ${error?.message || 'Lỗi không xác định'}`);
      }
      return false;
    }
  }, [resolveServiceTicketId]);

  const fetchLatestAdvisorNotePatchItems = useCallback(async (token) => {
    const inspectionResponse = await getSafetyInspectionByTicketCode(resolvedTicketCode, token);
    return buildAdvisorNotePatchItems(inspectionResponse?.data?.items);
  }, [resolvedTicketCode]);

  const applyAdvisorNotesToLocalState = useCallback((advisorItems) => {
    if (!Array.isArray(advisorItems) || advisorItems.length === 0) return;
    const noteByKey = new Map();
    advisorItems.forEach((item) => {
      const key = getSafetyItemKey(item);
      if (key) noteByKey.set(key, String(item.advisorNote ?? ''));
    });
    if (noteByKey.size === 0) return;

    setSafetyChecks((prev) => prev.map((item) => {
      const key = getSafetyItemKey(item);
      if (!key || !noteByKey.has(key)) return item;
      const advisorNote = noteByKey.get(key);
      return { ...item, advisorNote, note: advisorNote };
    }));
  }, []);

  const mergedSafetyChecks = useMemo(() => (
    [...safetyChecks].sort((a, b) => {
      if (Boolean(a.isCustom) !== Boolean(b.isCustom)) {
        return a.isCustom ? 1 : -1;
      }
      return (a.displayOrder || 0) - (b.displayOrder || 0);
    })
  ), [safetyChecks]);

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

        const ticketDetail = ticketResponse?.data || {};
        const rawTicketStatus = ticketDetail.ticketStatus
          ?? ticketDetail.status
          ?? ticketDetail.serviceTicketStatus
          ?? ticketDetail.serviceStatus
          ?? '';
        const normalizedTicketStatus = normalizeServiceTicketStatus(rawTicketStatus);
        const isLockedByTicketStatus = LOCKED_SERVICE_TICKET_STATUSES.has(normalizedTicketStatus);
        setServiceTicketStatus(normalizedTicketStatus);

        if (ticketDetail.serviceTicketId) {
          setServiceTicketId(ticketDetail.serviceTicketId);
        } else if (ticketDetail.id) {
          setServiceTicketId(ticketDetail.id);
        } else if (ticketDetail.ticketId) {
          setServiceTicketId(ticketDetail.ticketId);
        }
        const safetyEnabledFromTicket = ticketResponse?.data?.safetyInspectionEnabled !== false;
        let defaultChecks = [];
        let loadedInspectionStatus = safetyEnabledFromTicket ? 'PENDING' : 'SKIPPED';

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

        setHasSafetyInspectionEnabled(safetyEnabledFromTicket);
        setTireData(defaultTireData);
        setRecommendedTireSize('');
        setRecommendedTireSizeError('');

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
            loadedInspectionStatus = status;
            setInspectionStatus(status);

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
              setRecommendedTireSizeError(getRecommendedTireSizeError(loadedRecommendedTireSize || ''));
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
          setInspectionStatus(loadedInspectionStatus);
        }

        if (!isAdvisorMode && safetyEnabledFromTicket && !isLockedByTicketStatus) {
          const latestInspectionStatus = normalizeSafetyInspectionStatus(loadedInspectionStatus);
          const shouldMoveToInspecting = latestInspectionStatus !== 'COMPLETED'
            && latestInspectionStatus !== 'SKIPPED'
            && normalizedTicketStatus !== 'INSPECTING'
            && normalizedTicketStatus !== 'INSPECTED';

          if (shouldMoveToInspecting) {
            let synced = false;
            try {
              await startInspection(resolvedTicketCode, token);
              synced = true;
            } catch (startError) {
              console.warn('Không start-inspection được khi mở phiếu:', startError);
            }

            if (!synced) {
              await syncServiceTicketStatus('INSPECTING', token, 'Chưa đồng bộ được trạng thái phiếu dịch vụ sang Đang kiểm tra');
            } else {
              setServiceTicketStatus('INSPECTING');
            }

            setInspectionStatus('INSPECTING');
          }
        }
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu phiếu:', error);
        toast.error('Không thể tải dữ liệu phiếu dịch vụ: ' + (error.message || 'Lỗi không xác định'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [resolvedTicketCode, defaultTireData, embedded, refreshKey, isAdvisorMode, syncServiceTicketStatus]);

  const handleTireDataChange = (position, field, value) => {
    if (!canEditTechnicalFields || isFormLocked) return;
    markUnsavedLocalEdit();
    const raw = String(value);

    // Validate 500 ký tự cho các trường khác
    if (raw.length > TEXT_FIELD_CHAR_LIMIT) {
      setTireData(prev => ({
        ...prev,
        [position]: { ...prev[position], [field]: raw.slice(0, TEXT_FIELD_CHAR_LIMIT) }
      }));
      return;
    }

    setTireData(prev => ({
      ...prev,
      [position]: { ...prev[position], [field]: raw }
    }));
  };

  const handleRecommendedTireSizeChange = (value) => {
    if (!canEditTechnicalFields || isFormLocked) return;
    markUnsavedLocalEdit();
    const raw = String(value);
    const nextValue = raw.length > TEXT_FIELD_CHAR_LIMIT
      ? raw.slice(0, TEXT_FIELD_CHAR_LIMIT)
      : raw;
    setRecommendedTireSize(nextValue);
    setRecommendedTireSizeError(getRecommendedTireSizeError(nextValue));

    if (raw.length > TEXT_FIELD_CHAR_LIMIT) {
      const now = Date.now();
      if (!toast500LastFired.current['recommendedTireSize'] || now - toast500LastFired.current['recommendedTireSize'] > 2000) {
        toast(`Size lốp khuyến cáo tối đa ${TEXT_FIELD_CHAR_LIMIT} ký tự.`, { containerId: 'app-toast', autoClose: 2000 });
        toast500LastFired.current['recommendedTireSize'] = now;
      }
    }
  };

  const handleSafetyCheck = (itemId, type) => {
    if (!canEditTechnicalFields || isFormLocked) return;
    markUnsavedLocalEdit();
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
    if (!canEditAdvisorNotes || isFormLocked) return;
    markUnsavedLocalEdit();
    const raw = String(value);
    if (raw.length > TEXT_FIELD_CHAR_LIMIT) {
      const now = Date.now();
      if (!toast500LastFired.current[`note_${itemId}`] || now - toast500LastFired.current[`note_${itemId}`] > 2000) {
        toast('Tối đa 500 ký tự cho mỗi ô nhập.', { containerId: 'app-toast', autoClose: 2000 });
        toast500LastFired.current[`note_${itemId}`] = now;
      }
      setAdvisorNoteErrors(prev => ({ ...prev, [itemId]: `Tối đa ${TEXT_FIELD_CHAR_LIMIT} ký tự.` }));
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

  async function _syncServiceTicketStatusLegacy(nextStatus, token, fallbackMessage) {
    const parsedServiceTicketId = Number(resolvedTicketCode);
    const finalServiceTicketId = serviceTicketId || (Number.isFinite(parsedServiceTicketId) ? parsedServiceTicketId : null);
    if (!finalServiceTicketId) return false;
    try {
      await manageServiceTicketStatus(finalServiceTicketId, nextStatus, token);
      setServiceTicketStatus(nextStatus);
      return true;
    } catch (error) {
      if (fallbackMessage) {
        toast.warn(`${fallbackMessage}: ${error?.message || 'Lỗi không xác định'}`);
      }
      return false;
    }
  }


  const handleAddCategory = async () => {
    if (!guardServiceTicketEditable()) return;
    const categoryName = newCategoryName.trim();
    const categoryNameError = getNewCategoryNameError(categoryName, safetyChecks);
    setNewCategoryNameError(categoryNameError);
    if (categoryNameError) {
      toast.error(categoryNameError);
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

      const maxOrder = safetyChecks.length > 0
        ? Math.max(...safetyChecks.map(c => c.displayOrder || 0))
        : 0;

      const payload = {
        categoryName,
        displayOrder: maxOrder + 1
      };

      let response;
      try {
        response = await createWorkCategory(currentInspectionId, payload, token);
      } catch (createErr) {
        response = await createWorkCategory(
          currentInspectionId,
          { categoryName },
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
        setNewCategoryNameError('');
      }
    } catch (error) {
      console.error('Lỗi khi tạo hạng mục:', error);
      toast.error(error.message || 'Lỗi khi tạo hạng mục mới');
    }
  };

  const handleDeleteCustomCategory = async (item) => {
    if (!item?.isCustom) return;
    if (!guardServiceTicketEditable()) return;

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
    if (!guardServiceTicketEditable()) return;
    if (skipReasonError) {
      toast.error(skipReasonError);
      return;
    }
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
    // Phiếu không bật kiểm tra an toàn hoặc đã SKIPPED thì không bắt buộc tick hạng mục.
    if (!shouldRequireSafetyInspection) return null;

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

  const handleSaveDraft = async () => {
    if (!guardServiceTicketEditable()) return;
    const currentTireErrors = getTireInputErrorMap(tireData);
    const firstTireError = Object.values(currentTireErrors).find(Boolean);
    const currentRecommendedTireSizeError = getRecommendedTireSizeError(recommendedTireSize);
    const optionalTirePayloadError = firstTireError || currentRecommendedTireSizeError;
    const shouldSendTirePayload = shouldRequireSafetyInspection || !optionalTirePayloadError;
    if (currentRecommendedTireSizeError !== recommendedTireSizeError) {
      setRecommendedTireSizeError(currentRecommendedTireSizeError);
    }
    if (shouldRequireSafetyInspection && optionalTirePayloadError) {
      toast.error(optionalTirePayloadError);
      return;
    }
    if (blockingTextFieldValidationError) {
      toast.error(blockingTextFieldValidationError);
      return;
    }

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
      if (!token) {
        toast.error('Vui lòng đăng nhập');
        return;
      }

      if (!shouldRequireSafetyInspection) {
        let currentInspectionId = inspectionId;
        if (!currentInspectionId) {
          try {
            const inspectionResponse = await getSafetyInspectionByTicketCode(resolvedTicketCode, token);
            currentInspectionId = inspectionResponse?.data?.inspectionId || null;
          } catch {
            currentInspectionId = null;
          }
        }
        if (!currentInspectionId) {
          try {
            const skipResponse = await skipSafetyInspection(resolvedTicketCode, 'Bỏ qua kiểm tra an toàn', token);
            currentInspectionId = skipResponse?.data?.inspectionId || null;
          } catch {
            const inspectionResponse = await getSafetyInspectionByTicketCode(resolvedTicketCode, token);
            currentInspectionId = inspectionResponse?.data?.inspectionId || null;
          }
        }
        if (!currentInspectionId) {
          throw new Error('Không lấy được inspectionId để lưu nháp phiếu đã bỏ qua kiểm tra an toàn.');
        }

        const skippedItemsPayload = safetyChecks
          .map((check) => ({
            workCategoryId: check.workCategoryId || null,
            customCategoryId: check.customCategoryId || null,
            itemStatus: check.good ? 'GOOD' : check.warning ? 'WARNING' : check.replace ? 'REPLACE' : null,
          }))
          .filter((check) => check.workCategoryId || check.customCategoryId);
        const skippedAdvisorItems = isAdvisorMode
          ? safetyChecks
            .filter((item) => item.workCategoryId || item.customCategoryId)
            .map((item) => ({
              workCategoryId: item.workCategoryId ?? null,
              customCategoryId: item.customCategoryId ?? null,
              advisorNote: String(item.advisorNote ?? item.note ?? ''),
            }))
          : await fetchLatestAdvisorNotePatchItems(token);

        if (skippedItemsPayload.length > 0) {
          await upsertSafetyInspectionItems(currentInspectionId, skippedItemsPayload, token);
        }
        if (skippedAdvisorItems.length > 0) {
          await updateAdvisorNotes(currentInspectionId, skippedAdvisorItems, token);
          if (!isAdvisorMode) {
            applyAdvisorNotesToLocalState(skippedAdvisorItems);
          }
        }
        setInspectionId(currentInspectionId);
        setInspectionStatus('SKIPPED');
        markLocalEditsSaved();
        toast.success('Đã lưu nháp phiếu kiểm tra an toàn. Bạn vẫn có thể tiếp tục chỉnh sửa.');
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

      if (!currentInspectionId && shouldRequireSafetyInspection) {
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

      const tiresPayload = shouldSendTirePayload ? {
        frontTireSpecification: frontSpec,
        rearTireSpecification: rearSpec,
        recommendedTireSize: recommendedTireSize ? normalizeRecommendedTireSizeValue(recommendedTireSize) : null,
        frontLeft: getActualData(tireData.frontLeft),
        frontRight: getActualData(tireData.frontRight),
        rearLeft: getActualData(tireData.rearLeft),
        rearRight: getActualData(tireData.rearRight),
        spare: getActualData(tireData.spare),
        frontRecommendedPressure,
        rearRecommendedPressure,
        spareRecommendedPressure,
      } : {
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
      let currentRecommendation = localStorage.getItem(getRecommendationStorageKey(finalServiceTicketId)) || '';
      try {
        const recommendationRes = await fetchSafetyInspectionCurrentRecommend(finalServiceTicketId, token);
        currentRecommendation = extractRecommendationValue(recommendationRes) || currentRecommendation;
      } catch {
        // Preserve local recommendation fallback when backend cannot load it.
      }

      // Backend luôn cứng COMPLETED khi save/update, nên gửi payload bình thường
      const advisorItemsToRestore = !isAdvisorMode && currentInspectionId
        ? await fetchLatestAdvisorNotePatchItems(token)
        : [];

      const safetyPayload = {
        serviceTicketId: finalServiceTicketId,
        generalNotes: currentRecommendation || null,
        technicianNotes: notes || null,
        tires: tiresPayload,
        items: itemsPayload,
        inspectionStatus: 'PENDING',
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

      if (isAdvisorMode) {
        const advisorItems = safetyChecks
          .filter((item) => item.workCategoryId || item.customCategoryId)
          .map((item) => ({
            workCategoryId: item.workCategoryId ?? null,
            customCategoryId: item.customCategoryId ?? null,
            advisorNote: String(item.advisorNote ?? item.note ?? ''),
          }));

        await updateAdvisorNotes(currentInspectionId, advisorItems, token);
      } else if (advisorItemsToRestore.length > 0) {
        await updateAdvisorNotes(currentInspectionId, advisorItemsToRestore, token);
        applyAdvisorNotesToLocalState(advisorItemsToRestore);
      }
      setInspectionId(currentInspectionId);

      if (shouldRequireSafetyInspection) {
        // Backend đã tự đặt COMPLETED → gọi /reopen ngay để đưa phiếu về PENDING
        // Đây là workaround frontend-only: không cần sửa backend
        try {
          await reopenSafetyInspection(resolvedTicketCode, token);
        } catch (reopenErr) {
          console.warn('Không reopen được phiếu sau lưu nháp:', reopenErr);
          throw new Error('Đã lưu dữ liệu nhưng chưa mở lại được phiếu kiểm tra. Vui lòng thử lại để tránh phiếu bị khóa.');
        }

        // Sau reopen, backend đặt service ticket về CREATED → sync lại INSPECTING
        try {
          const finalServiceTicketId2 = resolveServiceTicketId();
          if (finalServiceTicketId2 && token) {
            await manageServiceTicketStatus(finalServiceTicketId2, 'INSPECTING', token);
            setServiceTicketStatus('INSPECTING');
          }
        } catch (error) {
          console.log('Lưu nháp: Chưa sync trạng thái service ticket sang INSPECTING', error);
        }

        // Đặt local state về PENDING để form không bị khóa
        setInspectionStatus('PENDING');
      }

      markLocalEditsSaved();

      // Không gọi setRefreshKey để tránh reload từ API ghi đè lại trạng thái
      toast.success('Đã lưu nháp phiếu kiểm tra an toàn. Bạn vẫn có thể tiếp tục chỉnh sửa.');
    } catch (error) {
      console.error('Lỗi khi lưu dữ liệu phiếu:', error);
      toast.error('Không thể lưu phiếu: ' + (error.message || 'Lỗi không xác định'));
    }
  };

  const handleSave = async () => {
    if (!guardServiceTicketEditable()) return;
    const currentTireErrors = getTireInputErrorMap(tireData);
    const firstTireError = Object.values(currentTireErrors).find(Boolean);
    const currentRecommendedTireSizeError = getRecommendedTireSizeError(recommendedTireSize);
    const optionalTirePayloadError = firstTireError || currentRecommendedTireSizeError;
    const shouldSendTirePayload = shouldRequireSafetyInspection || !optionalTirePayloadError;
    if (currentRecommendedTireSizeError !== recommendedTireSizeError) {
      setRecommendedTireSizeError(currentRecommendedTireSizeError);
    }
    if (shouldRequireSafetyInspection && optionalTirePayloadError) {
      toast.error(optionalTirePayloadError);
      return;
    }
    if (blockingTextFieldValidationError) {
      toast.error(blockingTextFieldValidationError);
      return;
    }
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

      if (!inspectionId && shouldRequireSafetyInspection) {
        try {
          const enableResponse = await enableSafetyInspection(resolvedTicketCode, token);
          if (enableResponse?.data?.inspectionId) {
            setInspectionId(enableResponse.data.inspectionId);
          }
        } catch (enableError) {
          console.error('Lỗi khi kích hoạt phiếu:', enableError);
        }
      }

      const tiresPayload = shouldSendTirePayload ? (() => {
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
          recommendedTireSize: recommendedTireSize ? normalizeRecommendedTireSizeValue(recommendedTireSize) : null,
          frontLeft: getActualData(tireData.frontLeft),
          frontRight: getActualData(tireData.frontRight),
          rearLeft: getActualData(tireData.rearLeft),
          rearRight: getActualData(tireData.rearRight),
          spare: getActualData(tireData.spare),
          frontRecommendedPressure: frontRecommendedPressure,
          rearRecommendedPressure: rearRecommendedPressure,
          spareRecommendedPressure: spareRecommendedPressure
        };
      })() : {
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
      };

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
      let currentRecommendation = localStorage.getItem(getRecommendationStorageKey(finalServiceTicketId)) || '';
      try {
        const recommendationRes = await fetchSafetyInspectionCurrentRecommend(finalServiceTicketId, token);
        currentRecommendation = extractRecommendationValue(recommendationRes) || currentRecommendation;
      } catch {
        // Preserve local recommendation fallback when backend cannot load it.
      }

      const safetyPayload = {
        serviceTicketId: finalServiceTicketId,
        generalNotes: currentRecommendation || null,
        technicianNotes: notes || null,
        tires: tiresPayload,
        items: itemsPayload,
        inspectionStatus: completionInspectionStatus,
      };

      let currentInspectionId = inspectionId;
      const advisorItemsToRestore = !isAdvisorMode && currentInspectionId
        ? await fetchLatestAdvisorNotePatchItems(token)
        : [];

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
      } else if (currentInspectionId && advisorItemsToRestore.length > 0) {
        await updateAdvisorNotes(currentInspectionId, advisorItemsToRestore, token);
        applyAdvisorNotesToLocalState(advisorItemsToRestore);
      }

      const syncedServiceTicketStatus = await syncServiceTicketStatus(
        'INSPECTED',
        token,
        'Phiếu đã hoàn thành nhưng chưa đồng bộ được trạng thái phiếu dịch vụ sang Hoàn tất kiểm tra',
      );
      if (!syncedServiceTicketStatus) {
        throw new Error('Chưa đồng bộ được trạng thái phiếu dịch vụ sang Hoàn tất kiểm tra.');
      }

      if (currentInspectionId) {
        setInspectionId(currentInspectionId);
      }

      toast.success('Đã hoàn thành phiếu kiểm tra an toàn.');
      setRefreshKey(prev => prev + 1); // reload để dữ liệu advisor/technician map đồng bộ qua API
      markLocalEditsSaved();
      if (typeof onInspectionCompleted === 'function') {
        await onInspectionCompleted({
          inspectionId: currentInspectionId,
          inspectionStatus: completionInspectionStatus,
          serviceTicketStatus: 'INSPECTED',
        });
      }
    } catch (error) {
      console.error('Lỗi khi lưu dữ liệu:', error);
      toast.error('Lỗi khi lưu dữ liệu: ' + (error.message || 'Lỗi không xác định'));
    }
  };

  const technicianCompletionError = !isAdvisorMode ? validateTechnicianCompletion() : null;
  const advisorCompletionError = isAdvisorMode ? validateAdvisorCompletion() : null;
  const visibleTireMmErrors = useMemo(() => getTireInputErrorMap(tireData), [tireData]);
  const visibleTireInputValidationError = Object.values(visibleTireMmErrors).find(Boolean) || null;
  const tireInputValidationError = shouldRequireSafetyInspection ? visibleTireInputValidationError : null;

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
          {isServiceTicketLocked && (
            <div style={{
              marginTop: '8px',
              padding: '8px 10px',
              borderRadius: '8px',
              background: '#fef3c7',
              color: '#92400e',
              fontSize: '13px',
              fontWeight: 600,
            }}>
              Phiếu dịch vụ đã ở trạng thái PAID/COMPLETED. Phiếu kiểm tra an toàn đang bị khóa chỉnh sửa.
            </div>
          )}
          {isInspectionCompleted && !isServiceTicketLocked && (
            <div style={{
              marginTop: '8px',
              padding: '8px 10px',
              borderRadius: '8px',
              background: '#d1fae5',
              color: '#065f46',
              fontSize: '13px',
              fontWeight: 600,
            }}>
              ✅ Phiếu kiểm tra an toàn đã hoàn thành. Không thể chỉnh sửa.
            </div>
          )}
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
                onChange={(e) => handleRecommendedTireSizeChange(e.target.value)}
                className={styles.tireSizeInput}
                placeholder={RECOMMENDED_TIRE_SIZE_EXAMPLE}
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
                {['frontLeft_size1', 'frontLeft_size2', 'frontLeft_size3'].map((errorKey) => (
                  visibleTireMmErrors[errorKey]
                    ? <span key={errorKey} style={{ color: '#dc2626', fontSize: '10px' }}>{visibleTireMmErrors[errorKey]}</span>
                    : null
                ))}
                <div className={styles.tireBoxRow}>
                  <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>mm</span></div>
                  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <input type="text" value={tireData.frontLeft.mm} onChange={(e) => handleTireDataChange('frontLeft', 'mm', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!canEditTechnicalFields} />
                    {visibleTireMmErrors['frontLeft_mm'] && (
                      <div style={{ 
                        position: 'absolute', 
                        top: '100%', 
                        left: '0', 
                        marginTop: '2px',
                        padding: '4px 8px',
                        background: '#fee2e2',
                        border: '1px solid #fecaca',
                        borderRadius: '4px',
                        color: '#dc2626', 
                        fontSize: '10px',
                        whiteSpace: 'nowrap',
                        zIndex: 10,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        {visibleTireMmErrors['frontLeft_mm']}
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.tireBoxRow}>
                   <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>kg/cm²</span></div>
                  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <input type="text" value={tireData.frontLeft.pressure} onChange={(e) => handleTireDataChange('frontLeft', 'pressure', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!canEditTechnicalFields} />
                    {visibleTireMmErrors['frontLeft_pressure'] && (
                      <div style={{ 
                        position: 'absolute', 
                        top: '100%', 
                        left: '0', 
                        marginTop: '2px',
                        padding: '4px 8px',
                        background: '#fee2e2',
                        border: '1px solid #fecaca',
                        borderRadius: '4px',
                        color: '#dc2626', 
                        fontSize: '10px',
                        whiteSpace: 'nowrap',
                        zIndex: 10,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        {visibleTireMmErrors['frontLeft_pressure']}
                      </div>
                    )}
                  </div>
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
                {['rearLeft_size1', 'rearLeft_size2', 'rearLeft_size3'].map((errorKey) => (
                  visibleTireMmErrors[errorKey]
                    ? <span key={errorKey} style={{ color: '#dc2626', fontSize: '10px' }}>{visibleTireMmErrors[errorKey]}</span>
                    : null
                ))}
                <div className={styles.tireBoxRow}>
                  <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>mm</span></div>
                  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <input type="text" value={tireData.rearLeft.mm} onChange={(e) => handleTireDataChange('rearLeft', 'mm', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!canEditTechnicalFields} />
                    {visibleTireMmErrors['rearLeft_mm'] && (
                      <div style={{ 
                        position: 'absolute', 
                        top: '100%', 
                        left: '0', 
                        marginTop: '2px',
                        padding: '4px 8px',
                        background: '#fee2e2',
                        border: '1px solid #fecaca',
                        borderRadius: '4px',
                        color: '#dc2626', 
                        fontSize: '10px',
                        whiteSpace: 'nowrap',
                        zIndex: 10,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        {visibleTireMmErrors['rearLeft_mm']}
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.tireBoxRow}>
                   <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>kg/cm²</span></div>
                  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <input type="text" value={tireData.rearLeft.pressure} onChange={(e) => handleTireDataChange('rearLeft', 'pressure', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!canEditTechnicalFields} />
                    {visibleTireMmErrors['rearLeft_pressure'] && (
                      <div style={{ 
                        position: 'absolute', 
                        top: '100%', 
                        left: '0', 
                        marginTop: '2px',
                        padding: '4px 8px',
                        background: '#fee2e2',
                        border: '1px solid #fecaca',
                        borderRadius: '4px',
                        color: '#dc2626', 
                        fontSize: '10px',
                        whiteSpace: 'nowrap',
                        zIndex: 10,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        {visibleTireMmErrors['rearLeft_pressure']}
                      </div>
                    )}
                  </div>
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
                  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <input type="text" value={tireData.frontRight.mm} onChange={(e) => handleTireDataChange('frontRight', 'mm', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!canEditTechnicalFields} />
                    {visibleTireMmErrors['frontRight_mm'] && (
                      <div style={{ 
                        position: 'absolute', 
                        top: '100%', 
                        left: '0', 
                        marginTop: '2px',
                        padding: '4px 8px',
                        background: '#fee2e2',
                        border: '1px solid #fecaca',
                        borderRadius: '4px',
                        color: '#dc2626', 
                        fontSize: '10px',
                        whiteSpace: 'nowrap',
                        zIndex: 10,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        {visibleTireMmErrors['frontRight_mm']}
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.tireBoxRow}>
                   <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>kg/cm²</span></div>
                  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <input type="text" value={tireData.frontRight.pressure} onChange={(e) => handleTireDataChange('frontRight', 'pressure', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!canEditTechnicalFields} />
                    {visibleTireMmErrors['frontRight_pressure'] && (
                      <div style={{ 
                        position: 'absolute', 
                        top: '100%', 
                        left: '0', 
                        marginTop: '2px',
                        padding: '4px 8px',
                        background: '#fee2e2',
                        border: '1px solid #fecaca',
                        borderRadius: '4px',
                        color: '#dc2626', 
                        fontSize: '10px',
                        whiteSpace: 'nowrap',
                        zIndex: 10,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        {visibleTireMmErrors['frontRight_pressure']}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* [Áp suất khuyến cáo] */}
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '4px' }}>
                <label style={{ fontSize: '10px', color: '#6b7280', marginBottom: '3px', textAlign: 'center', whiteSpace: 'nowrap' }}>Áp suất<br/>khuyến cáo</label>
                <input type="text" value={tireData.frontRight.recommendedPressure} onChange={(e) => handleTireDataChange('frontRight', 'recommendedPressure', e.target.value)} className={styles.tireInputDashed} placeholder="" disabled={!canEditTechnicalFields} style={{ width: '72px', height: '32px', fontSize: '13px' }} />
                {visibleTireMmErrors['frontRight_recommendedPressure'] && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '100%', 
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginTop: '2px',
                    padding: '4px 8px',
                    background: '#fee2e2',
                    border: '1px solid #fecaca',
                    borderRadius: '4px',
                    color: '#dc2626', 
                    fontSize: '10px',
                    whiteSpace: 'nowrap',
                    zIndex: 10,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    {visibleTireMmErrors['frontRight_recommendedPressure']}
                  </div>
                )}
              </div>
            </div>

            {/* REAR RIGHT - [mm][PSI] | [Áp suất khuyến cáo] */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div className={styles.tireBoxRow}>
                  <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>mm</span></div>
                  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <input type="text" value={tireData.rearRight.mm} onChange={(e) => handleTireDataChange('rearRight', 'mm', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!canEditTechnicalFields} />
                    {visibleTireMmErrors['rearRight_mm'] && (
                      <div style={{ 
                        position: 'absolute', 
                        top: '100%', 
                        left: '0', 
                        marginTop: '2px',
                        padding: '4px 8px',
                        background: '#fee2e2',
                        border: '1px solid #fecaca',
                        borderRadius: '4px',
                        color: '#dc2626', 
                        fontSize: '10px',
                        whiteSpace: 'nowrap',
                        zIndex: 10,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        {visibleTireMmErrors['rearRight_mm']}
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.tireBoxRow}>
                   <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>kg/cm²</span></div>
                  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <input type="text" value={tireData.rearRight.pressure} onChange={(e) => handleTireDataChange('rearRight', 'pressure', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!canEditTechnicalFields} />
                    {visibleTireMmErrors['rearRight_pressure'] && (
                      <div style={{ 
                        position: 'absolute', 
                        top: '100%', 
                        left: '0', 
                        marginTop: '2px',
                        padding: '4px 8px',
                        background: '#fee2e2',
                        border: '1px solid #fecaca',
                        borderRadius: '4px',
                        color: '#dc2626', 
                        fontSize: '10px',
                        whiteSpace: 'nowrap',
                        zIndex: 10,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        {visibleTireMmErrors['rearRight_pressure']}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '4px' }}>
                <label style={{ fontSize: '10px', color: '#6b7280', marginBottom: '3px', textAlign: 'center', whiteSpace: 'nowrap' }}>Áp suất<br/>khuyến cáo</label>
                <input type="text" value={tireData.rearRight.recommendedPressure} onChange={(e) => handleTireDataChange('rearRight', 'recommendedPressure', e.target.value)} className={styles.tireInputDashed} placeholder="" disabled={!canEditTechnicalFields} style={{ width: '72px', height: '32px', fontSize: '13px' }} />
                {visibleTireMmErrors['rearRight_recommendedPressure'] && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '100%', 
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginTop: '2px',
                    padding: '4px 8px',
                    background: '#fee2e2',
                    border: '1px solid #fecaca',
                    borderRadius: '4px',
                    color: '#dc2626', 
                    fontSize: '10px',
                    whiteSpace: 'nowrap',
                    zIndex: 10,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    {visibleTireMmErrors['rearRight_recommendedPressure']}
                  </div>
                )}
              </div>
            </div>

            {/* SPARE - [mm][PSI] | [Áp suất khuyến cáo] */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div className={styles.tireBoxRow}>
                  <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>mm</span></div>
                  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <input type="text" value={tireData.spare.mm} onChange={(e) => handleTireDataChange('spare', 'mm', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!canEditTechnicalFields} />
                    {visibleTireMmErrors['spare_mm'] && (
                      <div style={{ 
                        position: 'absolute', 
                        top: '100%', 
                        left: '0', 
                        marginTop: '2px',
                        padding: '4px 8px',
                        background: '#fee2e2',
                        border: '1px solid #fecaca',
                        borderRadius: '4px',
                        color: '#dc2626', 
                        fontSize: '10px',
                        whiteSpace: 'nowrap',
                        zIndex: 10,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        {visibleTireMmErrors['spare_mm']}
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.tireBoxRow}>
                   <div className={styles.tireBoxBlueSmall}><span className={styles.tireBoxLabelSmall}>kg/cm²</span></div>
                  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <input type="text" value={tireData.spare.pressure} onChange={(e) => handleTireDataChange('spare', 'pressure', e.target.value)} className={styles.tireInputWhite} placeholder="" disabled={!canEditTechnicalFields} />
                    {visibleTireMmErrors['spare_pressure'] && (
                      <div style={{ 
                        position: 'absolute', 
                        top: '100%', 
                        left: '0', 
                        marginTop: '2px',
                        padding: '4px 8px',
                        background: '#fee2e2',
                        border: '1px solid #fecaca',
                        borderRadius: '4px',
                        color: '#dc2626', 
                        fontSize: '10px',
                        whiteSpace: 'nowrap',
                        zIndex: 10,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        {visibleTireMmErrors['spare_pressure']}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '4px' }}>
                <label style={{ fontSize: '10px', color: '#6b7280', marginBottom: '3px', textAlign: 'center', whiteSpace: 'nowrap' }}>Áp suất<br/>khuyến cáo</label>
                <input type="text" value={tireData.spare.recommendedPressure} onChange={(e) => handleTireDataChange('spare', 'recommendedPressure', e.target.value)} className={styles.tireInputDashed} placeholder="" disabled={!canEditTechnicalFields} style={{ width: '72px', height: '32px', fontSize: '13px' }} />
                {visibleTireMmErrors['spare_recommendedPressure'] && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '100%', 
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginTop: '2px',
                    padding: '4px 8px',
                    background: '#fee2e2',
                    border: '1px solid #fecaca',
                    borderRadius: '4px',
                    color: '#dc2626', 
                    fontSize: '10px',
                    whiteSpace: 'nowrap',
                    zIndex: 10,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    {visibleTireMmErrors['spare_recommendedPressure']}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bảng kiểm tra an toàn - 13 hạng mục mặc định */}
      <div className={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 className={styles.sectionTitle}>HẠNG MỤC KIỂM TRA AN TOÀN</h2>
          {canEditTechnicalFields && (
            <button
              className={styles.addCategoryButton}
              onClick={() => {
                setNewCategoryName('');
                setNewCategoryNameError('');
                setShowAddCategoryModal(true);
              }}
            >
              + Thêm hạng mục kiểm tra mới
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
                    {item.isCustom && canEditTechnicalFields && (
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
                        <div className={styles.noteMetaRow}>
                          <span className={styles.charCounter}>{String(item.advisorNote || '').length}/500 ký tự</span>
                        </div>
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
        <div className={styles.notesHeader}>
          <h2 className={styles.sectionTitle}>Lưu ý:</h2>
          <span className={styles.charCounter}>{String(notes).length}/500 ký tự</span>
        </div>
        <textarea
          className={styles.notesTextarea}
          value={notes}
          onChange={(e) => {
            markUnsavedLocalEdit();
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

      {!readOnly && (isAdvisorMode || !embedded) && (
        <div className={styles.actionButtons}>
          <div className={styles.actionLeft}>
            {!(isAdvisorMode && embedded) && (
              <button className={styles.closeButton} onClick={handleCloseTicket}>Đóng</button>
            )}
            <button
                className={styles.completeButton}
                onClick={handleSaveDraft}
                disabled={isFormLocked || Boolean(tireInputValidationError) || Boolean(blockingTextFieldValidationError)}
                title={isFormLocked ? serviceTicketLockMessage : (blockingTextFieldValidationError || tireInputValidationError || '')}
              >
                Lưu nháp
              </button>
          </div>
          <div className={styles.actionRight}>
            {isAdvisorMode ? (
              <button
                className={styles.completeButton}
                onClick={handleSave}
                disabled={isFormLocked || Boolean(advisorCompletionError) || Boolean(tireInputValidationError) || Boolean(blockingTextFieldValidationError)}
                title={isFormLocked ? serviceTicketLockMessage : (advisorCompletionError || blockingTextFieldValidationError || tireInputValidationError || '')}
              >
                Hoàn thành
              </button>
            ) : (
              <button
                className={styles.completeButton}
                onClick={handleSave}
                disabled={isFormLocked || Boolean(technicianCompletionError) || Boolean(tireInputValidationError) || Boolean(blockingTextFieldValidationError)}
                title={isFormLocked ? serviceTicketLockMessage : (technicianCompletionError || blockingTextFieldValidationError || tireInputValidationError || '')}
              >
                Hoàn thành
              </button>
            )}
          </div>
        </div>
      )}
      {/* Modal thêm hạng mục */}
      {showAddCategoryModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => {
            setShowAddCategoryModal(false);
            setNewCategoryName('');
            setNewCategoryNameError('');
          }}
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Thêm hạng mục kiểm tra mới</h3>
              <button
                className={styles.modalClose}
                onClick={() => {
                  setShowAddCategoryModal(false);
                  setNewCategoryName('');
                  setNewCategoryNameError('');
                }}
              >
                ✖
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tên hạng mục:</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewCategoryName(value);
                    setNewCategoryNameError(getNewCategoryNameError(value, safetyChecks));
                  }}
                  onBlur={() => {
                    const trimmed = newCategoryName.trim();
                    setNewCategoryName(trimmed);
                    setNewCategoryNameError(getNewCategoryNameError(trimmed, safetyChecks));
                  }}
                  className={`${styles.formInput} ${newCategoryNameError ? styles.inputError : ''}`}
                  placeholder="Nhập tên hạng mục kiểm tra..."
                  maxLength={CATEGORY_NAME_CHAR_LIMIT + 1}
                  autoFocus
                />
                <div className={styles.fieldMetaRow}>
                  <span className={newCategoryNameError ? styles.fieldError : styles.fieldHint}>
                    {newCategoryNameError || 'Tên hạng mục sẽ được thêm vào bảng kiểm tra an toàn.'}
                  </span>
                  <span className={styles.charCounter}>{newCategoryName.trim().length}/{CATEGORY_NAME_CHAR_LIMIT} ký tự</span>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => {
                  setShowAddCategoryModal(false);
                  setNewCategoryName('');
                  setNewCategoryNameError('');
                }}
              >
                Hủy
              </button>
              <button
                className={styles.modalActionBtn}
                onClick={handleAddCategory}
                disabled={Boolean(newCategoryNameError) || !newCategoryName.trim()}
              >
                Thêm
              </button>
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
              <button className={styles.modalClose} onClick={() => setSkipModalOpen(false)}>✖</button>
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
  onInspectionCompleted: PropTypes.func,
  readOnly: PropTypes.bool,
  readOnlyMessage: PropTypes.string,
};

export default ServiceTicket;
