import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchTechnicianTicketDetail } from '../../../services/technicianService';
import { 
  getSafetyInspectionByTicketCode, 
  saveSafetyInspectionData, 
  getSafetyInspectionCategories, 
  enableSafetyInspection,
  createWorkCategory,
  getDefaultSafetyInspectionCategories
} from '../../../services/safetyInspectionService';
import styles from './ServiceTicket.module.css';

const ServiceTicket = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [recommendedTireSize, setRecommendedTireSize] = useState('');
  
  // Tire pressure data (mm, kg/cm³)
  const [tireData, setTireData] = useState({
    frontLeft: { mm: '', pressure: '' },
    frontRight: { mm: '', pressure: '' },
    rearLeft: { mm: '', pressure: '' },
    rearRight: { mm: '', pressure: '' }
  });

  // Safety checklist
  const [safetyChecks, setSafetyChecks] = useState([
    { id: 1, name: 'Lốp', good: false, warning: false, replace: false, note: '' },
    { id: 2, name: 'Gạt mưa', good: false, warning: false, replace: false, note: '' },
    { id: 3, name: 'Nước rửa kính', good: false, warning: false, replace: false, note: '' },
    { id: 4, name: 'Má phanh', good: false, warning: false, replace: false, note: '' },
    { id: 5, name: 'Đĩa phanh', good: false, warning: false, replace: false, note: '' },
    { id: 6, name: 'Dầu phanh', good: false, warning: false, replace: false, note: '' },
    { id: 7, name: 'Dầu động cơ', good: false, warning: false, replace: false, note: '' },
    { id: 8, name: 'Lọc dầu động cơ', good: false, warning: false, replace: false, note: '' },
    { id: 9, name: 'Nước làm mát', good: false, warning: false, replace: false, note: '' },
    { id: 10, name: 'Ắc quy', good: false, warning: false, replace: false, note: '' },
    { id: 11, name: 'Lọc gió động cơ', good: false, warning: false, replace: false, note: '' },
    { id: 12, name: 'Lọc gió điều hòa', good: false, warning: false, replace: false, note: '' },
    { id: 13, name: 'Thước lái', good: false, warning: false, replace: false, note: '' }
  ]);

  // Service items
  const [serviceItems, setServiceItems] = useState([
    { id: 1, name: 'Lốp', description: '', quantity: '', unitPrice: '', total: '', stock: false, confirmed: false },
    { id: 2, name: 'Van', description: '', quantity: '', unitPrice: '', total: '', stock: false, confirmed: false },
    { id: 3, name: 'Cân bằng động', description: '', quantity: '', unitPrice: '', total: '', stock: false, confirmed: false },
    { id: 4, name: 'Cân chỉnh thước lái', description: '', quantity: '', unitPrice: '', total: '', stock: false, confirmed: false },
    { id: 5, name: 'Phanh', description: '', quantity: '', unitPrice: '', total: '', stock: false, confirmed: false },
    { id: 6, name: 'Gạt mưa', description: '', quantity: '', unitPrice: '', total: '', stock: false, confirmed: false },
    { id: 7, name: 'Nước rửa kính', description: '', quantity: '', unitPrice: '', total: '', stock: false, confirmed: false },
    { id: 8, name: 'Dầu động cơ', description: '', quantity: '', unitPrice: '', total: '', stock: false, confirmed: false },
    { id: 9, name: 'Lọc dầu động cơ', description: '', quantity: '', unitPrice: '', total: '', stock: false, confirmed: false },
    { id: 10, name: 'Lọc gió động cơ', description: '', quantity: '', unitPrice: '', total: '', stock: false, confirmed: false },
    { id: 11, name: 'Lọc gió điều hòa', description: '', quantity: '', unitPrice: '', total: '', stock: false, confirmed: false }
  ]);

  const [notes, setNotes] = useState('');
  const [inspectionStatus, setInspectionStatus] = useState('PENDING'); // Track inspection status
  const [isEditable, setIsEditable] = useState(true); // Control if form is editable

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('staffToken') || localStorage.getItem('authToken');
        if (!token) {
          toast.error('Vui lòng đăng nhập');
          setLoading(false);
          return;
        }

        // Fetch ticket detail
        await fetchTechnicianTicketDetail(id, token);

        // Fetch safety inspection if exists
        try {
          const inspectionResponse = await getSafetyInspectionByTicketCode(id, token);
          if (inspectionResponse?.data) {
            const inspection = inspectionResponse.data;
            
            // Set inspection status and determine if editable
            const status = inspection.inspectionStatus || 'PENDING';
            setInspectionStatus(status);
            // Only allow editing if status is PENDING or not set
            setIsEditable(status === 'PENDING' || !status);
            
            // Transform inspection data to form
            if (inspection.tireData) {
              setTireData(inspection.tireData);
            }
            if (inspection.recommendedTireSize) {
              setRecommendedTireSize(inspection.recommendedTireSize);
            }
            if (inspection.items && inspection.items.length > 0) {
              // Transform safety check items
              const transformedChecks = inspection.items.map((item, index) => ({
                id: index + 1,
                name: item.categoryName || item.workCategoryName || '',
                good: item.condition === 'GOOD',
                warning: item.condition === 'WARNING',
                replace: item.condition === 'REPLACE',
                note: item.note || ''
              }));
              setSafetyChecks(transformedChecks);
            }
            if (inspection.notes) {
              setNotes(inspection.notes);
            }
          }
        } catch (inspectionError) {
          console.log('No existing inspection found, using default template');
          // If no inspection exists, enable it first and allow editing
          setIsEditable(true);
          setInspectionStatus('PENDING');
          // If no inspection exists, enable it first
          try {
            await enableSafetyInspection(id, token);
            toast.info('Đã kích hoạt kiểm tra an toàn');
          } catch (enableError) {
            console.log('Could not enable inspection:', enableError.message);
          }
        }

        // Load categories for service items
        try {
          const categoriesResponse = await getSafetyInspectionCategories(token);
          if (categoriesResponse?.data && categoriesResponse.data.length > 0) {
            const transformedItems = categoriesResponse.data.map((cat, index) => ({
              id: index + 1,
              name: cat.categoryName || cat.workCategoryName || '',
              description: '',
              quantity: '',
              unitPrice: '',
              total: '',
              stock: false,
              confirmed: false
            }));
            setServiceItems(transformedItems);
          }
        } catch (catError) {
          console.log('Could not load categories:', catError.message);
        }
      } catch (error) {
        console.error('Error fetching ticket data:', error);
        toast.error('Không thể tải dữ liệu phiếu dịch vụ: ' + (error.message || 'Lỗi không xác định'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

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

  const handleSafetyNoteChange = (itemId, note) => {
    setSafetyChecks(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, note } : item
      )
    );
  };

  const handleServiceItemChange = (itemId, field, value) => {
    setServiceItems(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          const updated = { ...item, [field]: value };
          // Auto calculate total
          if (field === 'quantity' || field === 'unitPrice') {
            const qty = parseFloat(field === 'quantity' ? value : item.quantity) || 0;
            const price = parseFloat(field === 'unitPrice' ? value : item.unitPrice) || 0;
            updated.total = (qty * price).toLocaleString('vi-VN');
          }
          return updated;
        }
        return item;
      })
    );
  };

  const addServiceItem = () => {
    const newId = Math.max(...serviceItems.map(item => item.id), 0) + 1;
    setServiceItems(prev => [...prev, {
      id: newId,
      name: '',
      description: '',
      quantity: '',
      unitPrice: '',
      total: '',
      stock: false,
      confirmed: false
    }]);
  };

  const removeServiceItem = (itemId) => {
    if (serviceItems.length > 1) {
      setServiceItems(prev => prev.filter(item => item.id !== itemId));
    }
  };

  const handleStartWork = async () => {
    try {
      const token = localStorage.getItem('staffToken') || localStorage.getItem('authToken');

      // Save safety inspection data to backend
      const safetyPayload = {
        ticketCode: id,
        recommendedTireSize,
        tireData,
        items: safetyChecks.map(check => ({
          categoryName: check.name,
          condition: check.good ? 'GOOD' : check.warning ? 'WARNING' : check.replace ? 'REPLACE' : null,
          note: check.note
        })),
        notes
      };

      await saveSafetyInspectionData(safetyPayload, token);

      // Also save to localStorage as backup
      const ticketData = {
        id,
        recommendedTireSize,
        tireData,
        safetyChecks,
        serviceItems,
        notes,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(`ticket_${id}`, JSON.stringify(ticketData));

      toast.success('Đã lưu dữ liệu kiểm tra!');
      navigate(`/technician/update-progress/${id}`);
    } catch (error) {
      console.error('Error saving inspection data:', error);
      toast.error('Lỗi khi lưu dữ liệu: ' + (error.message || 'Lỗi không xác định'));
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('staffToken') || localStorage.getItem('authToken');

      // Save safety inspection data to backend
      const safetyPayload = {
        ticketCode: id,
        recommendedTireSize,
        tireData,
        items: safetyChecks.map(check => ({
          categoryName: check.name,
          condition: check.good ? 'GOOD' : check.warning ? 'WARNING' : check.replace ? 'REPLACE' : null,
          note: check.note
        })),
        notes
      };

      await saveSafetyInspectionData(safetyPayload, token);

      // Also save to localStorage as backup
      const ticketData = {
        id,
        recommendedTireSize,
        tireData,
        safetyChecks,
        serviceItems,
        notes,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(`ticket_${id}`, JSON.stringify(ticketData));

      toast.success('Đã lưu dữ liệu thành công!');
    } catch (error) {
      console.error('Error saving inspection data:', error);
      toast.error('Lỗi khi lưu dữ liệu: ' + (error.message || 'Lỗi không xác định'));
    }
  };

  const calculateGrandTotal = () => {
    return serviceItems.reduce((sum, item) => {
      const total = parseFloat(item.total?.replace(/,/g, '') || 0);
      return sum + total;
    }, 0).toLocaleString('vi-VN');
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
        <button onClick={() => navigate('/technician/my-tasks')} className={styles.backButton}>
          ← Quay lại
        </button>
        <h1 className={styles.title}>Phiếu kiểm tra kỹ thuật và dịch vụ</h1>
      </div>

      {/* Tire Inspection Section */}
      <div className={styles.card}>
        {!isEditable && (
          <div className={styles.statusBanner}>
            ⚠️ Phiếu kiểm tra đã hoàn thành (trạng thái: {inspectionStatus}). Không thể chỉnh sửa.
          </div>
        )}
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
            <p className={styles.subtitle}>Lưu ý:</p>
          </div>
          <div className={styles.pressureLabel}>
            Áp suất<br/>khuyến cáo
          </div>
        </div>
        
        <div className={styles.tireInspection}>
          {/* Front Left Tire */}
          <div className={styles.tirePosition} style={{ position: 'absolute', top: '60px', left: '50px' }}>
            <div className={styles.tireLabel}>l / R</div>
            <div className={styles.tireInputBox}>
              <div className={styles.inputRow}>
                <span className={styles.inputLabel}>mm</span>
                <input
                  type="text"
                  value={tireData.frontLeft.mm}
                  onChange={(e) => handleTireDataChange('frontLeft', 'mm', e.target.value)}
                  className={styles.tireField}
                  disabled={!isEditable}
                />
              </div>
              <div className={styles.inputRow}>
                <span className={styles.inputLabel}>kg/cm³</span>
                <input
                  type="text"
                  value={tireData.frontLeft.pressure}
                  onChange={(e) => handleTireDataChange('frontLeft', 'pressure', e.target.value)}
                  className={styles.tireField}
                  disabled={!isEditable}
                />
              </div>
            </div>
          </div>
          <div className={styles.tireWheel} style={{ position: 'absolute', top: '100px', left: '310px' }}></div>

          {/* Front Right Tire */}
          <div className={styles.tirePosition} style={{ position: 'absolute', top: '60px', right: '50px' }}>
            <div className={styles.tireLabel}>l / R</div>
            <div className={styles.tireInputBox}>
              <div className={styles.inputRow}>
                <input
                  type="text"
                  value={tireData.frontRight.mm}
                  onChange={(e) => handleTireDataChange('frontRight', 'mm', e.target.value)}
                  className={styles.tireField}
                  disabled={!isEditable}
                />
                <span className={styles.inputLabel}>mm</span>
              </div>
              <div className={styles.inputRow}>
                <input
                  type="text"
                  value={tireData.frontRight.pressure}
                  onChange={(e) => handleTireDataChange('frontRight', 'pressure', e.target.value)}
                  className={styles.tireField}
                  disabled={!isEditable}
                />
                <span className={styles.inputLabel}>kg/cm³</span>
              </div>
            </div>
          </div>
          <div className={styles.tireWheel} style={{ position: 'absolute', top: '100px', right: '310px' }}></div>

          {/* Car Body */}
          <div className={styles.carBody}>
            <div className={styles.carWindshield}></div>
            <div className={styles.carLogo}></div>
            <div className={styles.carDoor}>
              <div className={styles.doorHandle}>0</div>
            </div>
            <div className={styles.carDoor}>
              <div className={styles.doorHandle}>0</div>
            </div>
          </div>

          {/* Rear Left Tire */}
          <div className={styles.tireWheel} style={{ position: 'absolute', bottom: '100px', left: '310px' }}></div>
          <div className={styles.tirePosition} style={{ position: 'absolute', bottom: '60px', left: '50px' }}>
            <div className={styles.tireInputBox}>
              <div className={styles.inputRow}>
                <span className={styles.inputLabel}>mm</span>
                <input
                  type="text"
                  value={tireData.rearLeft.mm}
                  onChange={(e) => handleTireDataChange('rearLeft', 'mm', e.target.value)}
                  className={styles.tireField}
                  disabled={!isEditable}
                />
              </div>
              <div className={styles.inputRow}>
                <span className={styles.inputLabel}>kg/cm³</span>
                <input
                  type="text"
                  value={tireData.rearLeft.pressure}
                  onChange={(e) => handleTireDataChange('rearLeft', 'pressure', e.target.value)}
                  className={styles.tireField}
                  disabled={!isEditable}
                />
              </div>
            </div>
            <div className={styles.tireLabel}>l / R</div>
          </div>

          {/* Rear Right Tire */}
          <div className={styles.tireWheel} style={{ position: 'absolute', bottom: '100px', right: '310px' }}></div>
          <div className={styles.tirePosition} style={{ position: 'absolute', bottom: '60px', right: '50px' }}>
            <div className={styles.tireInputBox}>
              <div className={styles.inputRow}>
                <input
                  type="text"
                  value={tireData.rearRight.mm}
                  onChange={(e) => handleTireDataChange('rearRight', 'mm', e.target.value)}
                  className={styles.tireField}
                />
                <span className={styles.inputLabel}>mm</span>
              </div>
              <div className={styles.inputRow}>
                <input
                  type="text"
                  value={tireData.rearRight.pressure}
                  onChange={(e) => handleTireDataChange('rearRight', 'pressure', e.target.value)}
                  className={styles.tireField}
                />
                <span className={styles.inputLabel}>kg/cm³</span>
              </div>
            </div>
            <div className={styles.tireLabel}>l / R</div>
          </div>
        </div>
      </div>

      {/* Safety Checklist */}
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>HẠNG MỤC KIỂM TRA AN TOÀN</h2>
        <div className={styles.safetyTable}>
          <table>
            <thead>
              <tr>
                <th>HẠNG MỤC KIỂM TRA AN TOÀN</th>
                <th>TỐT</th>
                <th>LƯU Ý</th>
                <th>THAY</th>
                <th>GHI CHÚ</th>
              </tr>
            </thead>
            <tbody>
              {safetyChecks.map((item) => (
                <tr key={item.id}>
                  <td className={styles.itemName}>{item.name}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={item.good}
                      onChange={() => handleSafetyCheck(item.id, 'good')}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={item.warning}
                      onChange={() => handleSafetyCheck(item.id, 'warning')}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={item.replace}
                      onChange={() => handleSafetyCheck(item.id, 'replace')}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={item.note}
                      onChange={(e) => handleSafetyNoteChange(item.id, e.target.value)}
                      className={styles.noteInput}
                      placeholder="Ghi chú..."
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Service Items Table */}
      <div className={styles.card}>
        <div className={styles.tableHeader}>
          <h2 className={styles.sectionTitle}>CHI TIẾT DỊCH VỤ</h2>
          <button className={styles.addButton} onClick={addServiceItem}>
            + Thêm dòng
          </button>
        </div>
        <div className={styles.serviceTable}>
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>HẠNG MỤC</th>
                <th>DIỄN GIẢI</th>
                <th>SL</th>
                <th>ĐƠN GIÁ</th>
                <th>THÀNH TIỀN</th>
                <th>KHO</th>
                <th>XÁC NHẬN</th>
                <th>HÀNH ĐỘNG</th>
              </tr>
            </thead>
            <tbody>
              {serviceItems.map((item, index) => (
                <tr key={item.id}>
                  <td className={styles.sttCell}>{String(index + 1).padStart(2, '0')}</td>
                  <td>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleServiceItemChange(item.id, 'name', e.target.value)}
                      className={styles.tableInput}
                      placeholder="Tên hạng mục..."
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleServiceItemChange(item.id, 'description', e.target.value)}
                      className={styles.tableInput}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleServiceItemChange(item.id, 'quantity', e.target.value)}
                      className={styles.tableInputSmall}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => handleServiceItemChange(item.id, 'unitPrice', e.target.value)}
                      className={styles.tableInput}
                    />
                  </td>
                  <td className={styles.totalCell}>{item.total}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={item.stock}
                      onChange={(e) => handleServiceItemChange(item.id, 'stock', e.target.checked)}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={item.confirmed}
                      onChange={(e) => handleServiceItemChange(item.id, 'confirmed', e.target.checked)}
                    />
                  </td>
                  <td>
                    <button
                      className={styles.deleteRowButton}
                      onClick={() => removeServiceItem(item.id)}
                      disabled={serviceItems.length === 1}
                      title="Xóa dòng"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
              <tr className={styles.totalRow}>
                <td colSpan="5" className={styles.totalLabel}>TỔNG CỘNG</td>
                <td className={styles.grandTotal}>{calculateGrandTotal()}</td>
                <td colSpan="3"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes Section */}
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Khuyến nghị:</h2>
        <textarea
          className={styles.notesTextarea}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Nhập ghi chú..."
        />
      </div>

      {/* Action Buttons */}
      <div className={styles.actionButtons}>
        <button className={styles.cancelButton} onClick={() => navigate('/technician/my-tasks')}>
          Hủy
        </button>
        <button className={styles.saveButton} onClick={handleSave}>
          Lưu
        </button>
        <button className={styles.submitButton} onClick={handleStartWork}>
          Bắt đầu làm việc
        </button>
      </div>
    </div>
  );
};

export default ServiceTicket;
