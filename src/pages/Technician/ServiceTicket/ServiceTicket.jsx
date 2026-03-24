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
  getSafetyInspectionCategories,
  skipSafetyInspection,
  addCustomCategory,
  enableSafetyInspection
} from '../../../services/safetyInspectionService';
import styles from './ServiceTicket.module.css';
import carImage from '../../../assets/oto_4.jpg';

const ServiceTicket = ({ ticketCode, embedded = false }) => {
  const { id: idParam } = useParams();
  const resolvedTicketCode = String(ticketCode || idParam || '').trim();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [recommendedTireSize, setRecommendedTireSize] = useState('');
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryCode, setNewCategoryCode] = useState('');
  
  // Tire pressure data (mm, kg/cm³) - 5 tires including spare
  const defaultTireData = useMemo(() => ({
    frontLeft: { size1: '', size2: '', size3: '', mm: '', pressure: '', recommendedPressure: '' },
    frontRight: { size1: '', size2: '', size3: '', mm: '', pressure: '', recommendedPressure: '' },
    rearLeft: { size1: '', size2: '', size3: '', mm: '', pressure: '', recommendedPressure: '' },
    rearRight: { size1: '', size2: '', size3: '', mm: '', pressure: '', recommendedPressure: '' },
    spare: { size1: '', size2: '', size3: '', mm: '', pressure: '', recommendedPressure: '' }
  }), []);

  const [tireData, setTireData] = useState(defaultTireData);

  // Safety checklist - will be loaded from API
  const [safetyChecks, setSafetyChecks] = useState([]);

  const [notes, setNotes] = useState('');
  const [skipModalOpen, setSkipModalOpen] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [inspectionStatus, setInspectionStatus] = useState('PENDING'); // Track inspection status
  const [isEditable, setIsEditable] = useState(true); // Control if form is editable
  const [serviceTicketId, setServiceTicketId] = useState(null); // Store serviceTicketId for API calls
  const [inspectionId, setInspectionId] = useState(null); // Store inspectionId for updates

  // Refresh data when tab becomes visible again
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

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!resolvedTicketCode) {
          toast.error('Thiếu mã phiếu dịch vụ');
          setLoading(false);
          return;
        }

        // Fetch ticket detail
        const ticketResponse = await fetchTechnicianTicketDetail(resolvedTicketCode);
        if (ticketResponse?.data?.serviceTicketId) {
          setServiceTicketId(ticketResponse.data.serviceTicketId);
        }

        // Load 13 default safety inspection categories first
        let defaultChecks = [];
        try {
          const defaultCategoriesResponse = await getDefaultSafetyInspectionCategories();
          if (defaultCategoriesResponse?.data && defaultCategoriesResponse.data.length > 0) {
            defaultChecks = defaultCategoriesResponse.data.map((cat) => ({
              id: cat.id,
              workCategoryId: cat.id,
              name: cat.categoryName || '',
              good: false,
              warning: false,
              replace: false,
              note: '',
              displayOrder: cat.displayOrder || 0
            }));
          }
        } catch (catError) {
          console.log('Could not load default categories, falling back to DB categories:', catError.message);
          try {
            const categoriesResponse = await getSafetyInspectionCategories();
            if (categoriesResponse?.data && categoriesResponse.data.length > 0) {
              defaultChecks = categoriesResponse.data.map((cat) => ({
                id: cat.id,
                workCategoryId: cat.id,
                name: cat.categoryName || '',
                good: false,
                warning: false,
                replace: false,
                note: '',
                displayOrder: cat.displayOrder || 0
              }));
            }
          } catch (fallbackError) {
            console.log('Could not load DB categories:', fallbackError.message);
          }
        }

        // Fetch safety inspection if exists
        let inspection = null;
        try {
          const inspectionResponse = await getSafetyInspectionByTicketCode(resolvedTicketCode);
          console.log('🔍 Inspection Response:', inspectionResponse);
          if (inspectionResponse?.data) {
            inspection = inspectionResponse.data;
            console.log('📋 Inspection Items:', inspection.items);
          }
        } catch {
          console.log('No existing inspection found, using default template');
        }

        // Build final safety checks in ONE place — avoids React batch setState race condition
        let finalSafetyChecks = [];

        if (inspection) {
          // Có inspection → merge backend items với default categories
          const inspectionItems = inspection.items || [];

          // Store inspection ID and service ticket ID
          if (inspection.inspectionId) setInspectionId(inspection.inspectionId);
          if (inspection.serviceTicketId) setServiceTicketId(inspection.serviceTicketId);

          // Set inspection status and determine if editable
          const status = inspection.inspectionStatus || 'PENDING';
          setInspectionStatus(status);
          const canEdit = status === 'PENDING' || status === 'SKIPPED' || !status;
          setIsEditable(!embedded && canEdit);

          // Transform tire data
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
                  if (match) { size1 = match[1]; size2 = match[2]; size3 = match[3]; }
                }
                newTireData[position] = {
                  size1, size2, size3,
                  mm: tire.treadDepth?.toString() || '',
                  pressure: tire.pressure?.toString() || '',
                  recommendedPressure: tire.recommendedPressure?.toString() || ''
                };
                if (tire.recommendedTireSize && !recommendedTireSize) {
                  setRecommendedTireSize(tire.recommendedTireSize);
                }
              }
            });
            setTireData(newTireData);
          }

          if (inspection.technicianNotes) setNotes(inspection.technicianNotes);

          // Merge default categories với inspection items từ backend
          if (defaultChecks.length > 0) {
            // Map inspection items by workCategoryId để tìm nhanh
            const itemsByWorkCat = {};
            inspectionItems.forEach(item => {
              if (item.workCategoryId != null) {
                itemsByWorkCat[item.workCategoryId] = item;
              }
            });

            finalSafetyChecks = defaultChecks.map(cat => {
              const existingItem = itemsByWorkCat[cat.workCategoryId];
              if (existingItem) {
                return {
                  ...cat,
                  itemId: existingItem.itemId,
                  good: existingItem.itemStatus === 'GOOD',
                  warning: existingItem.itemStatus === 'WARNING',
                  replace: existingItem.itemStatus === 'REPLACE',
                  note: existingItem.advisorNote || ''
                };
              }
              return cat;
            });
          } else {
            // Không có default categories → dùng trực tiếp items từ backend
            finalSafetyChecks = inspectionItems.map(item => ({
              id: item.itemId || item.workCategoryId || item.customCategoryId,
              itemId: item.itemId,
              workCategoryId: item.workCategoryId,
              customCategoryId: item.customCategoryId,
              name: item.categoryName || '',
              good: item.itemStatus === 'GOOD',
              warning: item.itemStatus === 'WARNING',
              replace: item.itemStatus === 'REPLACE',
              note: item.advisorNote || '',
              displayOrder: item.displayOrder || 0,
              isCustom: item.customCategoryId != null,
            }));
          }

          // Thêm custom items (có customCategoryId)
          const customItems = inspectionItems
            .filter(item => item.customCategoryId != null && item.workCategoryId == null)
            .map(item => ({
              id: item.itemId,
              itemId: item.itemId,
              workCategoryId: null,
              customCategoryId: item.customCategoryId,
              name: item.categoryName || '',
              good: item.itemStatus === 'GOOD',
              warning: item.itemStatus === 'WARNING',
              replace: item.itemStatus === 'REPLACE',
              note: item.advisorNote || '',
              displayOrder: 999,
              isCustom: true,
            }));

          finalSafetyChecks = [...finalSafetyChecks, ...customItems];
        } else {
          // Không có inspection → dùng 13 default categories
          finalSafetyChecks = defaultChecks;
          setIsEditable(!embedded);
          setInspectionStatus('PENDING');
        }

        setSafetyChecks(finalSafetyChecks);
      } catch (error) {
        console.error('Error fetching ticket data:', error);
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
      prev.map(item => {
        if (item.id !== itemId) return item;
        if (type === 'good') {
          return {
            ...item,
            good: !item.good,
            warning: false,
            replace: false,
          };
        }
        if (type === 'warning') {
          return {
            ...item,
            good: false,
            warning: !item.warning,
            replace: false,
          };
        }
        if (type === 'replace') {
          return {
            ...item,
            good: false,
            warning: false,
            replace: !item.replace,
          };
        }
        return item;
      })
    );
  };

  const handleDeleteCustomCategory = (itemId) => {
    if (!window.confirm('Bạn có chắc muốn xóa hạng mục này?')) return;
    setSafetyChecks(prev => prev.filter(item => item.id !== itemId));
    toast.success('Đã xóa hạng mục thêm mới');
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Vui lòng nhập tên hạng mục');
      return;
    }

    if (!inspectionId) {
      toast.error('Cần có inspectionId để thêm hạng mục. Vui lòng lưu phiếu kiểm tra trước.');
      return;
    }

    try {
      // Get current max display order
      const maxOrder = safetyChecks.length > 0
        ? Math.max(...safetyChecks.map(c => c.displayOrder || 0))
        : 0;

      const payload = {
        categoryName: newCategoryName.trim(),
        displayOrder: maxOrder + 1
      };

      console.log('➕ Adding custom category with payload:', payload);

      const response = await addCustomCategory(inspectionId, payload);
      console.log('✅ Custom category added response:', response);

      if (response?.data) {
        // Add new category to the checklist — mark as custom so it appears in the custom table
        const newCheck = {
          itemId: response.data.itemId,
          id: response.data.itemId,
          workCategoryId: null,
          customCategoryId: response.data.customCategoryId,
          name: response.data.categoryName,
          good: false,
          warning: false,
          replace: false,
          note: '',
          displayOrder: maxOrder + 1,
          isCustom: true  // ← flag để phân biệt hạng mục tùy chỉnh
        };
        setSafetyChecks(prev => [...prev, newCheck]);
        toast.success('Đã thêm hạng mục mới thành công');
        setShowAddCategoryModal(false);
        setNewCategoryName('');
        setNewCategoryCode('');
      }
    } catch (error) {
      console.error('❌ Error adding custom category:', error);
      console.error('Error status:', error.status);
      console.error('Error message:', error.message);

      let errorMsg = 'Lỗi khi tạo hạng mục mới';
      if (error.status === 400) {
        // Backend validation error - show exact message from server
        errorMsg = error.message;
      } else if (error.status === 401) {
        errorMsg = 'Vui lòng đăng nhập lại';
      } else if (error.status === 500) {
        errorMsg = 'Lỗi server: ' + error.message;
      } else {
        errorMsg = error.message || 'Lỗi không xác định';
      }

      toast.error(errorMsg);
    }
  };


  const confirmSkip = async () => {
    try {
      await skipSafetyInspection(resolvedTicketCode, skipReason || 'Bỏ qua kiểm tra an toàn');
      toast.success('Đã bỏ qua kiểm tra an toàn!');
      setSkipModalOpen(false);
      if (!embedded) {
        navigate('/technician/my-tasks');
      }
    } catch (error) {
      console.error('Error skipping inspection:', error);
      toast.error('Lỗi khi bỏ qua: ' + (error.message || 'Lỗi không xác định'));
    }
  };

  const handleSave = async () => {
    try {
      // Step 1: If no inspection exists, enable it first (creates PENDING record)
      if (!inspectionId) {
        console.log('🔄 Enabling safety inspection first...');
        try {
          const enableResponse = await enableSafetyInspection(resolvedTicketCode);
          console.log('✅ Enable response:', enableResponse);
          if (enableResponse?.data?.inspectionId) {
            setInspectionId(enableResponse.data.inspectionId);
          }
        } catch (enableError) {
          console.error('Error enabling inspection:', enableError);
          // Continue anyway - maybe inspection was created by another request
        }
      }

      // Transform tire data to API format - Backend expects TireInputRequest object
      // Format: { frontTireSpecification, rearTireSpecification, recommendedTireSize,
      //           frontLeft: {treadDepth, pressure, pressureUnit}, ... }
      const tiresPayload = (() => {
        const getActualData = (data) => {
          if (!data || (!data.mm && !data.pressure && !data.size1)) return null;
          return {
            treadDepth: data.mm ? parseFloat(data.mm) : null,
            pressure: data.pressure ? parseFloat(data.pressure) : null,
            pressureUnit: 'PSI'
          };
        };

        // Build front/rear tire specifications
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

        // Get recommended pressures
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

      console.log('🔧 Tires payload (TireInputRequest format):', tiresPayload);

      // Transform safety checks to API format - include ALL items with their status
      // Distinguish between default items (workCategoryId) and custom items (customCategoryId)
      const itemsPayload = safetyChecks
        .filter(check => check.good || check.warning || check.replace)
        .map(check => ({
          workCategoryId: check.workCategoryId || null,
          customCategoryId: check.isCustom ? (check.customCategoryId || check.id) : null,
          itemStatus: check.good ? 'GOOD' : check.warning ? 'WARNING' : check.replace ? 'REPLACE' : null
        }));

      // Save safety inspection data to backend with COMPLETED status
      const parsedServiceTicketId = Number(resolvedTicketCode);
      const finalServiceTicketId =
        serviceTicketId || (Number.isFinite(parsedServiceTicketId) ? parsedServiceTicketId : null);
      if (!finalServiceTicketId) {
        throw new Error('Thiếu serviceTicketId để lưu phiếu kiểm tra.');
      }
      console.log('💾 serviceTicketId being sent:', finalServiceTicketId);
      console.log('💾 serviceTicketId state:', serviceTicketId);
      console.log('💾 ticketCode:', resolvedTicketCode);

      const safetyPayload = {
        serviceTicketId: finalServiceTicketId,
        technicianNotes: notes || null,
        tires: tiresPayload,
        items: itemsPayload,
        // Set status to COMPLETED when saving (submitting)
        inspectionStatus: 'COMPLETED'
      };

      console.log('💾 Saving payload:', safetyPayload);

      // If already COMPLETED and clicking "Hoàn thành" (editable), use update API
      // Otherwise, use save API to create new
      if (inspectionStatus === 'COMPLETED' && inspectionId && isEditable) {
        await updateSafetyInspectionData(inspectionId, safetyPayload);
        toast.success('Đã cập nhật phiếu kiểm tra an toàn!');
        // After update, lock editing again
        setIsEditable(false);
      } else {
        await saveSafetyInspectionData(safetyPayload);
        setInspectionStatus('COMPLETED');
        setIsEditable(false);
        toast.success('Đã lưu và hoàn thành kiểm tra an toàn!');
      }
    } catch (error) {
      console.error('Error saving inspection data:', error);
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

      {/* Tire Inspection Section */}
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

        {/* Original Layout with Car Image */}
        <div style={{ position: 'relative', height: '550px', marginTop: '20px' }}>
          {/* LEFT SIDE - 2 tires: Front Left + Rear Left */}
          <div style={{ position: 'absolute', left: '20px', top: '80px', display: 'flex', flexDirection: 'column', gap: '100px' }}>
            {/* Front Left Tire */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div className={styles.tirePosition}>
                {/* Hàng 1: [...] / [...] R [...] */}
                <div className={styles.tireBoxRow}>
                  <input
                    type="text"
                    value={tireData.frontLeft.size1}
                    onChange={(e) => handleTireDataChange('frontLeft', 'size1', e.target.value)}
                    className={styles.tireInputWide}
                    placeholder=""
                    disabled={!isEditable}
                  />
                  <span className={styles.tireSlash}>/</span>
                  <input
                    type="text"
                    value={tireData.frontLeft.size2}
                    onChange={(e) => handleTireDataChange('frontLeft', 'size2', e.target.value)}
                    className={styles.tireInputWide}
                    placeholder=""
                    disabled={!isEditable}
                  />
                  <span className={styles.tireRLabel}>R</span>
                  <input
                    type="text"
                    value={tireData.frontLeft.size3}
                    onChange={(e) => handleTireDataChange('frontLeft', 'size3', e.target.value)}
                    className={styles.tireInputWide}
                    placeholder=""
                    disabled={!isEditable}
                  />
                </div>
                {/* Hàng 2: mm + ô nhập */}
                <div className={styles.tireBoxRow}>
                  <div className={styles.tireBoxBlueSmall}>
                    <span className={styles.tireBoxLabelSmall}>mm</span>
                  </div>
                  <input
                    type="text"
                    value={tireData.frontLeft.mm}
                    onChange={(e) => handleTireDataChange('frontLeft', 'mm', e.target.value)}
                    className={styles.tireInputWhite}
                    placeholder=""
                    disabled={!isEditable}
                  />
                </div>
                {/* Hàng 3: kg/cm + ô nhập */}
                <div className={styles.tireBoxRow}>
                  <div className={styles.tireBoxBlueSmall}>
                    <span className={styles.tireBoxLabelSmall}>kg/cm</span>
                  </div>
                  <input
                    type="text"
                    value={tireData.frontLeft.pressure}
                    onChange={(e) => handleTireDataChange('frontLeft', 'pressure', e.target.value)}
                    className={styles.tireInputWhite}
                    placeholder=""
                    disabled={!isEditable}
                  />
                </div>
              </div>
            </div>

            {/* Rear Left Tire */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div className={styles.tirePosition}>
                <div className={styles.tireBoxRow}>
                  <input
                    type="text"
                    value={tireData.rearLeft.size1}
                    onChange={(e) => handleTireDataChange('rearLeft', 'size1', e.target.value)}
                    className={styles.tireInputWide}
                    placeholder=""
                    disabled={!isEditable}
                  />
                  <span className={styles.tireSlash}>/</span>
                  <input
                    type="text"
                    value={tireData.rearLeft.size2}
                    onChange={(e) => handleTireDataChange('rearLeft', 'size2', e.target.value)}
                    className={styles.tireInputWide}
                    placeholder=""
                    disabled={!isEditable}
                  />
                  <span className={styles.tireRLabel}>R</span>
                  <input
                    type="text"
                    value={tireData.rearLeft.size3}
                    onChange={(e) => handleTireDataChange('rearLeft', 'size3', e.target.value)}
                    className={styles.tireInputWide}
                    placeholder=""
                    disabled={!isEditable}
                  />
                </div>
                <div className={styles.tireBoxRow}>
                  <div className={styles.tireBoxBlueSmall}>
                    <span className={styles.tireBoxLabelSmall}>mm</span>
                  </div>
                  <input
                    type="text"
                    value={tireData.rearLeft.mm}
                    onChange={(e) => handleTireDataChange('rearLeft', 'mm', e.target.value)}
                    className={styles.tireInputWhite}
                    placeholder=""
                    disabled={!isEditable}
                  />
                </div>
                <div className={styles.tireBoxRow}>
                  <div className={styles.tireBoxBlueSmall}>
                    <span className={styles.tireBoxLabelSmall}>kg/cm</span>
                  </div>
                  <input
                    type="text"
                    value={tireData.rearLeft.pressure}
                    onChange={(e) => handleTireDataChange('rearLeft', 'pressure', e.target.value)}
                    className={styles.tireInputWhite}
                    placeholder=""
                    disabled={!isEditable}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* CAR BODY - Center - with image */}
          <div style={{ position: 'absolute', left: '50%', top: '45%', transform: 'translate(-50%, -50%)' }}>
            <img
              src={carImage}
              alt="Car"
              style={{
                width: '280px',
                height: 'auto',
                objectFit: 'contain'
              }}
            />
          </div>

          {/* WHEELS - 4 positions */}
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

          {/* RIGHT SIDE - 3 tires: Front Right + Rear Right + Spare */}
          <div style={{ position: 'absolute', right: '140px', top: '60px', display: 'flex', flexDirection: 'column', gap: '70px' }}>
            {/* Front Right Tire */}
            <div className={styles.tirePosition}>
              <div className={styles.tireBoxRow}>
                <div className={styles.tireBoxBlueSmall}>
                  <span className={styles.tireBoxLabelSmall}>mm</span>
                </div>
                <input
                  type="text"
                  value={tireData.frontRight.mm}
                  onChange={(e) => handleTireDataChange('frontRight', 'mm', e.target.value)}
                  className={styles.tireInputWhite}
                  placeholder=""
                  disabled={!isEditable}
                />
              </div>
              <div className={styles.tireBoxRow}>
                <div className={styles.tireBoxBlueSmall}>
                  <span className={styles.tireBoxLabelSmall}>kg/cm</span>
                </div>
                <input
                  type="text"
                  value={tireData.frontRight.pressure}
                  onChange={(e) => handleTireDataChange('frontRight', 'pressure', e.target.value)}
                  className={styles.tireInputWhite}
                  placeholder=""
                  disabled={!isEditable}
                />
              </div>
            </div>

            {/* Rear Right Tire */}
            <div className={styles.tirePosition}>
              <div className={styles.tireBoxRow}>
                <div className={styles.tireBoxBlueSmall}>
                  <span className={styles.tireBoxLabelSmall}>mm</span>
                </div>
                <input
                  type="text"
                  value={tireData.rearRight.mm}
                  onChange={(e) => handleTireDataChange('rearRight', 'mm', e.target.value)}
                  className={styles.tireInputWhite}
                  placeholder=""
                  disabled={!isEditable}
                />
              </div>
              <div className={styles.tireBoxRow}>
                <div className={styles.tireBoxBlueSmall}>
                  <span className={styles.tireBoxLabelSmall}>kg/cm</span>
                </div>
                <input
                  type="text"
                  value={tireData.rearRight.pressure}
                  onChange={(e) => handleTireDataChange('rearRight', 'pressure', e.target.value)}
                  className={styles.tireInputWhite}
                  placeholder=""
                  disabled={!isEditable}
                />
              </div>
            </div>

            {/* Spare Tire */}
            <div className={styles.tirePosition}>
              <div className={styles.tireBoxRow}>
                <div className={styles.tireBoxBlueSmall}>
                  <span className={styles.tireBoxLabelSmall}>mm</span>
                </div>
                <input
                  type="text"
                  value={tireData.spare.mm}
                  onChange={(e) => handleTireDataChange('spare', 'mm', e.target.value)}
                  className={styles.tireInputWhite}
                  placeholder=""
                  disabled={!isEditable}
                />
              </div>
              <div className={styles.tireBoxRow}>
                <div className={styles.tireBoxBlueSmall}>
                  <span className={styles.tireBoxLabelSmall}>kg/cm</span>
                </div>
                <input
                  type="text"
                  value={tireData.spare.pressure}
                  onChange={(e) => handleTireDataChange('spare', 'pressure', e.target.value)}
                  className={styles.tireInputWhite}
                  placeholder=""
                  disabled={!isEditable}
                />
              </div>
            </div>
          </div>

          {/* RECOMMENDED PRESSURE COLUMN - Far right */}
          <div style={{ position: 'absolute', right: '40px', top: '60px', display: 'flex', flexDirection: 'column', gap: '70px' }}>
            {/* Front Right Recommended */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '110px', justifyContent: 'center' }}>
              <label style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textAlign: 'center' }}>
                Áp suất<br/>khuyến cáo
              </label>
              <input
                type="text"
                value={tireData.frontRight.recommendedPressure}
                onChange={(e) => handleTireDataChange('frontRight', 'recommendedPressure', e.target.value)}
                className={styles.tireInputWhite}
                placeholder=""
                disabled={!isEditable}
                style={{ width: '80px', height: '36px', fontSize: '14px' }}
              />
            </div>

            {/* Rear Right Recommended */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '110px', justifyContent: 'center' }}>
              <label style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textAlign: 'center' }}>
                Áp suất<br/>khuyến cáo
              </label>
              <input
                type="text"
                value={tireData.rearRight.recommendedPressure}
                onChange={(e) => handleTireDataChange('rearRight', 'recommendedPressure', e.target.value)}
                className={styles.tireInputWhite}
                placeholder=""
                disabled={!isEditable}
                style={{ width: '80px', height: '36px', fontSize: '14px' }}
              />
            </div>

            {/* Spare Recommended */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '110px', justifyContent: 'center' }}>
              <label style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textAlign: 'center' }}>
                Áp suất<br/>khuyến cáo
              </label>
              <input
                type="text"
                value={tireData.spare.recommendedPressure}
                onChange={(e) => handleTireDataChange('spare', 'recommendedPressure', e.target.value)}
                className={styles.tireInputWhite}
                placeholder=""
                disabled={!isEditable}
                style={{ width: '80px', height: '36px', fontSize: '14px' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Safety Checklist — 13 items default + custom items */}
      <div className={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 className={styles.sectionTitle}>HẠNG MỤC KIỂM TRA AN TOÀN</h2>
          {isEditable && (
            <button
              className={styles.addCategoryButton}
              onClick={() => setShowAddCategoryModal(true)}
            >
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
                .sort((a, b) => {
                  // Default items first (isCustom = false), then custom items
                  if (a.isCustom !== b.isCustom) return a.isCustom ? 1 : -1;
                  // Within same type, sort by displayOrder
                  return (a.displayOrder || 0) - (b.displayOrder || 0);
                })
                .map((item) => (
                <tr key={item.id} style={item.isCustom ? { backgroundColor: '#fff7ed' } : {}}>
                  <td className={styles.itemName}>
                    {item.name}
                    {item.isCustom && (
                      <>
                        <span style={{ fontSize: '11px', color: '#92400e', marginLeft: '6px', marginRight: '6px' }}>
                          thêm mới
                        </span>
                        {isEditable && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomCategory(item.id)}
                            style={{
                              background: '#ef4444',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '1px 6px',
                              cursor: 'pointer',
                              fontSize: '11px',
                              verticalAlign: 'middle',
                            }}
                            title="Xóa hạng mục"
                          >
                            ✕
                          </button>
                        )}
                      </>
                    )}
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={inspectionStatus === 'SKIPPED'
                        ? (item.note && item.note.trim() !== '')
                        : item.good}
                      disabled={!isEditable || (inspectionStatus === 'SKIPPED' && !(item.note && item.note.trim() !== ''))}
                      onChange={() => handleSafetyCheck(item.id, 'good')}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={inspectionStatus === 'SKIPPED'
                        ? (item.note && item.note.trim() !== '')
                        : item.warning}
                      disabled={!isEditable || (inspectionStatus === 'SKIPPED' && !(item.note && item.note.trim() !== ''))}
                      onChange={() => handleSafetyCheck(item.id, 'warning')}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={inspectionStatus === 'SKIPPED'
                        ? (item.note && item.note.trim() !== '')
                        : item.replace}
                      disabled={!isEditable || (inspectionStatus === 'SKIPPED' && !(item.note && item.note.trim() !== ''))}
                      onChange={() => handleSafetyCheck(item.id, 'replace')}
                    />
                  </td>
                  <td className={styles.noteCell}>
                    {item.note && item.note.trim() !== '' ? (
                      <span style={{ color: '#92400e', fontStyle: 'italic', fontSize: '13px' }}>
                        {item.note}
                      </span>
                    ) : (
                      <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '13px' }}>
                        —
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes Section - Technician Notes */}
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
        <>
          {/* Action Buttons */}
          <div className={styles.actionButtons}>
            <button className={styles.closeButton} onClick={() => navigate('/technician/my-tasks')}>
              Đóng
            </button>
            {inspectionStatus === 'COMPLETED' && !isEditable ? (
              <button className={styles.completeButton} onClick={() => setIsEditable(true)}>
                Chỉnh sửa
              </button>
            ) : (
              <button className={styles.completeButton} onClick={handleSave}>
                Hoàn thành
              </button>
            )}
          </div>
        </>
      )}

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddCategoryModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Thêm hạng mục kiểm tra mới</h3>
              <button className={styles.modalClose} onClick={() => setShowAddCategoryModal(false)}>
                ✕
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tên hạng mục:</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => {
                    const name = e.target.value;
                    setNewCategoryName(name);
                    // Auto-generate category code
                    const code = name.trim()
                      .toUpperCase()
                      .normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '')
                      .replace(/Đ/g, 'D')
                      .replace(/đ/g, 'd')
                      .replace(/\s+/g, '_');
                    setNewCategoryCode(code);
                  }}
                  className={styles.formInput}
                  placeholder="Nhập tên hạng mục kiểm tra..."
                  autoFocus
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Mã hạng mục (tự động):</label>
                <input
                  type="text"
                  value={newCategoryCode}
                  onChange={(e) => setNewCategoryCode(e.target.value)}
                  className={styles.formInput}
                  placeholder="VD: KIEM_TRA_DEN_PHA"
                />
                <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  Mã sẽ tự động tạo từ tên, bạn có thể chỉnh sửa nếu cần
                </small>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button 
                className={styles.modalCancelBtn} 
                onClick={() => {
                  setShowAddCategoryModal(false);
                  setNewCategoryName('');
                  setNewCategoryCode('');
                }}
              >
                Hủy
              </button>
              <button 
                className={styles.modalActionBtn}
                onClick={handleAddCategory}
              >
                Thêm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skip Confirmation Modal */}
      {skipModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setSkipModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Xác nhận bỏ qua kiểm tra an toàn</h3>
              <button className={styles.modalClose} onClick={() => setSkipModalOpen(false)}>
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ marginBottom: '16px', color: '#374151' }}>
                Bạn có chắc chắn muốn bỏ qua kiểm tra an toàn cho phiếu dịch vụ này không?
              </p>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Lý do bỏ qua:</label>
                <textarea
                  value={skipReason}
                  onChange={(e) => setSkipReason(e.target.value)}
                  className={styles.formInput}
                  rows={3}
                  placeholder="Nhập lý do bỏ qua kiểm tra..."
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => setSkipModalOpen(false)}
              >
                Hủy
              </button>
              <button
                className={styles.modalActionBtn}
                onClick={confirmSkip}
                style={{ background: '#dc2626' }}
              >
                Xác nhận bỏ qua
              </button>
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
