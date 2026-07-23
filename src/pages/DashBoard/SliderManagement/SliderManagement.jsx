import React, { useState, useEffect, useRef } from 'react';
import { sliderService } from '../../../services/sliderService';
import { fetchAllPromotions } from '../../../services/promotionService';
import { toast } from 'react-toastify';
import { 
  Plus, 
  Trash2, 
  Link as LinkIcon, 
  LayoutTemplate,
  GripVertical
} from 'lucide-react';
import styles from './SliderManagement.module.css';

export default function SliderManagement() {
  const [sliders, setSliders] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSliderName, setNewSliderName] = useState('');
  const [newSliderLocation, setNewSliderLocation] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // For new/edit item
  const [selectedSliderId, setSelectedSliderId] = useState(null);
  const [newItem, setNewItem] = useState({ imageUrl: '', targetUrl: '', title: '', displayOrder: 0, promotionId: '' });
  const [editingItemId, setEditingItemId] = useState(null);

  // Drag and Drop state
  const [draggedItemInfo, setDraggedItemInfo] = useState(null);
  const [dragOverItemId, setDragOverItemId] = useState(null);

  useEffect(() => {
    fetchSliders();
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('adminToken') || localStorage.getItem('staffToken');
      const response = await fetchAllPromotions(token);
      // Assuming response.data or response is the array
      const data = response.data || response || [];
      if (Array.isArray(data)) {
        setPromotions(data);
      }
    } catch (error) {
      console.error('Failed to fetch promotions', error);
    }
  };

  const fetchSliders = async () => {
    try {
      setLoading(true);
      const data = await sliderService.getAllSliders();
      // Sort items by display order in each slider
      const processedData = data.map(slider => ({
        ...slider,
        items: (slider.items || []).sort((a, b) => a.displayOrder - b.displayOrder)
      }));
      setSliders(processedData);
    } catch (error) {
      console.error('Failed to fetch sliders', error);
      toast.error('Lỗi khi tải danh sách Slider');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSlider = async (e) => {
    e.preventDefault();
    if (!newSliderName.trim() || !newSliderLocation.trim()) {
      toast.warning('Vui lòng nhập đầy đủ thông tin slider');
      return;
    }
    
    try {
      await sliderService.createSlider({ name: newSliderName, locationCode: newSliderLocation });
      toast.success('Tạo Slider thành công');
      setNewSliderName('');
      setNewSliderLocation('');
      fetchSliders();
    } catch (error) {
      console.error('Failed to create slider', error);
      toast.error('Tạo Slider thất bại. Có thể mã vị trí đã tồn tại.');
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!selectedSliderId || !newItem.imageUrl) {
      toast.warning('Vui lòng điền đủ thông tin và chọn file ảnh');
      return;
    }
    
    try {
      if (editingItemId) {
        await sliderService.updateSliderItem(selectedSliderId, editingItemId, {
            ...newItem,
            id: editingItemId
        });
        toast.success('Cập nhật Banner thành công');
      } else {
        await sliderService.addSliderItem(selectedSliderId, newItem);
        toast.success('Thêm Banner thành công');
      }
      setNewItem({ imageUrl: '', targetUrl: '', title: '', displayOrder: 0, promotionId: '' });
      setEditingItemId(null);
      fetchSliders();
    } catch (error) {
      console.error('Failed to add slider item', error);
      toast.error('Thêm Banner thất bại');
    }
  };

  const handleDeleteItem = async (sliderId, itemId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa Banner này?')) return;
    
    try {
      await sliderService.deleteSliderItem(sliderId, itemId);
      toast.success('Đã xóa Banner');
      fetchSliders();
    } catch (error) {
      console.error('Failed to delete slider item', error);
      toast.error('Xóa Banner thất bại');
    }
  };

  const handleToggleActive = async (sliderId, item) => {
    try {
      const updatedStatus = !item.isActive;
      await sliderService.updateSliderItem(sliderId, item.id, {
        ...item,
        isActive: updatedStatus
      });
      toast.success(updatedStatus ? 'Đã bật hiển thị banner' : 'Đã tắt hiển thị banner');
      fetchSliders();
    } catch (error) {
      console.error('Failed to toggle active status', error);
      toast.error('Không thể cập nhật trạng thái');
    }
  };

  // --- DRAG AND DROP LOGIC ---
  const handleDragStart = (e, sliderId, itemIndex) => {
    setDraggedItemInfo({ sliderId, itemIndex });
    e.dataTransfer.effectAllowed = 'move';
    // Small delay to allow the drag ghost to render properly
    setTimeout(() => {
      e.target.classList.add(styles.dragging);
    }, 0);
  };

  const handleDragOver = (e, sliderId, itemIndex) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
    if (draggedItemInfo && draggedItemInfo.sliderId === sliderId && draggedItemInfo.itemIndex !== itemIndex) {
      setDragOverItemId(itemIndex);
    }
  };

  const handleDragLeave = () => {
    setDragOverItemId(null);
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove(styles.dragging);
    setDraggedItemInfo(null);
    setDragOverItemId(null);
  };

  const handleDrop = async (e, targetSliderId, targetItemIndex) => {
    e.preventDefault();
    setDragOverItemId(null);

    if (!draggedItemInfo || draggedItemInfo.sliderId !== targetSliderId) {
      return; // Cannot drag between different sliders
    }

    const { sliderId, itemIndex: sourceIndex } = draggedItemInfo;
    if (sourceIndex === targetItemIndex) return;

    // Optimistically update UI
    const slider = sliders.find(s => s.id === sliderId);
    const newItems = [...slider.items];
    const [movedItem] = newItems.splice(sourceIndex, 1);
    newItems.splice(targetItemIndex, 0, movedItem);

    setSliders(sliders.map(s => s.id === sliderId ? { ...s, items: newItems } : s));

    // Call API to save order
    try {
      const orderedItemIds = newItems.map(item => item.id);
      await sliderService.reorderSliderItems(sliderId, orderedItemIds);
      toast.success('Đã cập nhật thứ tự');
    } catch (error) {
      console.error('Failed to reorder items', error);
      toast.error('Lỗi khi lưu thứ tự');
      fetchSliders(); // Revert back on error
    }
  };

  const handleUpdateSlider = async (sliderId, currentName, currentLocation) => {
    const newName = window.prompt('Nhập tên Slider mới:', currentName);
    if (!newName) return;
    const newCode = window.prompt('Nhập mã Code mới:', currentLocation);
    if (!newCode) return;
    try {
      await sliderService.updateSlider(sliderId, { name: newName, locationCode: newCode.toUpperCase() });
      toast.success('Cập nhật Slider thành công');
      fetchSliders();
    } catch (error) {
      toast.error(error.message || 'Lỗi khi cập nhật Slider');
    }
  };

  const handleDeleteSlider = async (sliderId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa Slider này? (Chỉ có thể xóa nếu bên trong không còn ảnh nào)')) return;
    try {
      await sliderService.deleteSlider(sliderId);
      toast.success('Xóa Slider thành công');
      fetchSliders();
    } catch (error) {
      toast.error(error.message || 'Không thể xóa Slider lúc này');
    }
  };

  const handleImageSelect = async (e, sliderId) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setSelectedSliderId(sliderId);
      setUploadingImage(true);
      const res = await sliderService.uploadImage(file);
      setNewItem({ ...newItem, imageUrl: res.url });
      toast.success('Tải ảnh thành công');
    } catch (error) {
      console.error(error);
      toast.error('Tải ảnh thất bại');
    } finally {
      setUploadingImage(false);
    }
  };
  // ---------------------------

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <div className={styles.spinner}></div>
        <p>Đang tải dữ liệu Slider...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <LayoutTemplate size={28} />
        </div>
        <h2>Quản lý Slider & Banner</h2>
      </div>
      
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Tạo Slider Mới</h3>
        <form onSubmit={handleCreateSlider} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>Tên Slider</label>
            <input 
              type="text" 
              placeholder="VD: Banner Trang chủ" 
              value={newSliderName} 
              onChange={e => setNewSliderName(e.target.value)} 
              required 
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Mã vị trí (Code)</label>
            <input 
              type="text" 
              list="locationCodes"
              placeholder="VD: HOME_MAIN" 
              value={newSliderLocation} 
              onChange={e => setNewSliderLocation(e.target.value.toUpperCase())} 
              required 
            />
            <datalist id="locationCodes">
              <option value="HOME_MAIN">Trang chủ (Banner lớn)</option>
              <option value="HOME_SUB">Trang chủ (Banner phụ)</option>
              <option value="SERVICES_BANNER">Cột trái Dịch vụ / Phụ tùng</option>
            </datalist>
          </div>
          <button type="submit" className={styles.btnPrimary}>
            <Plus size={18} />
            Tạo mới
          </button>
        </form>
      </div>

      <div className={styles.grid}>
        {sliders.length === 0 ? (
          <div style={{gridColumn: '1 / -1'}} className={styles.emptyState}>
            Chưa có Slider nào được cấu hình.
          </div>
        ) : sliders.map(slider => (
          <div key={slider.id} className={styles.sliderCard}>
            <div className={styles.sliderHeader}>
              <div>
                <h3>{slider.name}</h3>
                <span className={styles.locationBadge}>{slider.locationCode}</span>
              </div>
              <div style={{display: 'flex', gap: '8px'}}>
                <button 
                  onClick={() => handleUpdateSlider(slider.id, slider.name, slider.locationCode)}
                  className={styles.btnIcon} 
                  style={{color: '#27509b'}}
                  title="Sửa Slider"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button 
                  onClick={() => handleDeleteSlider(slider.id)}
                  className={styles.btnIcon} 
                  title="Xóa Slider"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <div className={styles.itemsList}>
              {(!slider.items || slider.items.length === 0) ? (
                <div className={styles.emptyState}>Chưa có ảnh Banner nào</div>
              ) : (
                slider.items.map((item, index) => (
                  <div 
                    key={item.id} 
                    className={`${styles.itemRow} ${!item.isActive ? styles.inactive : ''} ${dragOverItemId === index ? styles.dragOver : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, slider.id, index)}
                    onDragOver={(e) => handleDragOver(e, slider.id, index)}
                    onDragLeave={handleDragLeave}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDrop(e, slider.id, index)}
                  >
                    <div className={styles.dragHandle} title="Kéo để di chuyển">
                      <GripVertical size={18} />
                    </div>
                    <div className={styles.thumbnailWrapper}>
                      <img 
                        src={item.imageUrl} 
                        alt={item.title || "banner"} 
                        className={styles.thumbnail}
                        onError={(e) => {
                          e.target.src = 'https://placehold.co/100x56?text=L%E1%BB%97i+%E1%BA%A3nh';
                        }}
                      />
                    </div>
                    <div className={styles.itemDetails}>
                      <p className={styles.itemTitle}>{item.title || 'Không có tiêu đề'}</p>
                      
                      {item.promotionId && (
                        <div className={styles.itemOrder} style={{color: '#d97706'}}>
                          Sự kiện: {promotions.find(p => p.promotionId === item.promotionId)?.name || `ID: ${item.promotionId}`}
                        </div>
                      )}
                      {item.targetUrl && (
                        <a href={item.targetUrl} target="_blank" rel="noreferrer" className={styles.itemLink}>
                          <LinkIcon size={12} /> {item.targetUrl}
                        </a>
                      )}
                    </div>

                    <label className={styles.toggleSwitch} title="Bật/tắt hiển thị">
                      <input 
                        type="checkbox" 
                        checked={item.isActive} 
                        onChange={() => handleToggleActive(slider.id, item)}
                      />
                      <span className={styles.slider}></span>
                    </label>

                    <button 
                      onClick={() => {
                        setSelectedSliderId(slider.id);
                        setEditingItemId(item.id);
                        setNewItem({
                          imageUrl: item.imageUrl || '',
                          targetUrl: item.targetUrl || '',
                          title: item.title || '',
                          displayOrder: item.displayOrder || 0,
                          promotionId: item.promotionId || ''
                        });
                      }} 
                      className={styles.btnIcon}
                      style={{ color: '#27509b' }}
                      title="Sửa Banner này"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>

                    <button 
                      onClick={() => handleDeleteItem(slider.id, item.id)} 
                      className={styles.btnIcon}
                      title="Xóa Banner này"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className={styles.addItemSection}>
              <h4>{selectedSliderId === slider.id && editingItemId ? 'Cập nhật Banner' : 'Thêm Banner Mới'}</h4>
              <form 
                onSubmit={(e) => {
                  setSelectedSliderId(slider.id);
                  handleAddItem(e);
                }}
                className={styles.addItemForm}
                onFocus={() => {
                   if (selectedSliderId !== slider.id) {
                     setSelectedSliderId(slider.id);
                     setEditingItemId(null);
                     setNewItem({ imageUrl: '', targetUrl: '', title: '', displayOrder: 0, promotionId: '' });
                   }
                }}
              >
                {selectedSliderId === slider.id && newItem.imageUrl && (
                  <img 
                    src={newItem.imageUrl} 
                    alt="Preview" 
                    className={styles.imagePreview}
                    onError={(e) => e.target.style.display = 'none'}
                    onLoad={(e) => e.target.style.display = 'block'}
                  />
                )}
                
                <div className={styles.inputGroup} style={{flexDirection: 'row', alignItems: 'center', gap: '8px'}}>
                  <input 
                    type="text" 
                    placeholder="Đường dẫn (URL) hoặc Tải ảnh" 
                    value={selectedSliderId === slider.id ? newItem.imageUrl : ''}
                    onChange={e => setNewItem({...newItem, imageUrl: e.target.value})}
                    required 
                    style={{flex: 1, minWidth: 0}}
                  />
                  <div style={{position: 'relative', flexShrink: 0}}>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => handleImageSelect(e, slider.id)}
                      style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer'
                      }}
                    />
                    <button type="button" className={styles.btnSecondary} style={{whiteSpace: 'nowrap'}} disabled={uploadingImage}>
                      {uploadingImage ? 'Đang tải...' : 'Chọn file...'}
                    </button>
                  </div>
                </div>
                <div className={styles.inputGroup}>
                  <input 
                    type="text" 
                    placeholder="Tiêu đề hiển thị (tuỳ chọn)" 
                    value={selectedSliderId === slider.id ? newItem.title : ''}
                    onChange={e => setNewItem({...newItem, title: e.target.value})}
                  />
                </div>
                
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '12px'}}>
                  <div className={styles.inputGroup} style={{flex: '1 1 200px'}}>
                    <input 
                      type="text" 
                      placeholder="Đường dẫn khi click (Target URL)" 
                      value={selectedSliderId === slider.id ? newItem.targetUrl : ''}
                      onChange={e => setNewItem({...newItem, targetUrl: e.target.value})}
                    />
                  </div>
                  
                  <div className={styles.selectGroup} style={{flex: '1 1 200px'}}>
                    <select 
                      value={selectedSliderId === slider.id ? newItem.promotionId : ''}
                      onChange={e => setNewItem({...newItem, promotionId: parseInt(e.target.value) || ''})}
                      style={{width: '100%'}}
                    >
                      <option value="">-- Liên kết Sự kiện (Tuỳ chọn) --</option>
                      {promotions.map(promo => (
                        <option key={promo.promotionId} value={promo.promotionId}>
                          {promo.name} ({promo.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '8px'}}>
                  <button type="submit" className={styles.btnPrimary} style={{gridColumn: '1 / -1'}}>
                    <Plus size={18} />
                    {selectedSliderId === slider.id && editingItemId ? 'Lưu Cập Nhật' : 'Thêm Banner'}
                  </button>
                  {selectedSliderId === slider.id && editingItemId && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingItemId(null);
                        setNewItem({ imageUrl: '', targetUrl: '', title: '', displayOrder: 0, promotionId: '' });
                      }}
                      style={{gridColumn: '1 / -1', marginTop: '10px', background: 'transparent', color: '#666', border: '1px solid #ccc', padding: '0.75rem 1rem', borderRadius: '6px', cursor: 'pointer'}}
                    >
                      Hủy Sửa
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
