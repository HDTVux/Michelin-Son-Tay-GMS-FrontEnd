import { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { Building2, Car, MapPin, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import VehiclePickerModal from '../../../components/VehiclePicker/VehiclePickerModal.jsx';
import { emptyVehicleRow } from './partnerForm.js';
import {
  createCustomerGroup,
  fetchCustomerGroups,
  fetchDistricts,
  fetchProvinces,
  fetchWards,
  lookupByTaxCode,
} from '../../../services/partnerService.js';
import styles from './CustomerManager.module.css';

const TABS = [
  { id: 'general', label: 'Thông tin chung', icon: Building2 },
  { id: 'legal', label: 'Pháp nhân', icon: Users },
  { id: 'contact', label: 'Liên hệ khác', icon: MapPin },
  { id: 'vehicles', label: 'Xe của đối tác', icon: Car },
];

/** Bỏ tiền tố loại đơn vị hành chính: "Thành phố Hà Nội" -> "Hà Nội". */
const bareName = (name) =>
  (name || '')
    .replace(/^(Thành phố|Tỉnh|Quận|Huyện|Thị xã|Thị trấn|Phường|Xã)\s+/i, '')
    .trim();

const normalize = (value) => (value || '').toString().trim().toLowerCase();

/** Tìm đơn vị hành chính khớp với một trong các đoạn của địa chỉ. */
const matchLocation = (list, parts) => {
  for (const item of list) {
    const full = normalize(item.name);
    const bare = normalize(bareName(item.name));
    const index = parts.findIndex((part) => {
      const p = normalize(part);
      return p === full || p === bare || (bare.length >= 4 && p.endsWith(bare));
    });
    if (index >= 0) return { item, index };
  }
  return null;
};

const PartnerFormFields = ({
  formData,
  setFormData,
  errors = {},
  idPrefix,
  autoCodeValue = '',
  existingVehicles = [],
  children,
}) => {
  const [activeTab, setActiveTab] = useState('general');

  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  // Khi API địa giới hành chính không khả dụng thì cho nhập tay tên tỉnh/quận/xã.
  const [manualLocation, setManualLocation] = useState(false);

  const [groups, setGroups] = useState([]);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);

  const [taxLoading, setTaxLoading] = useState(false);
  const [editingVehicleKey, setEditingVehicleKey] = useState(null);

  const provincesRef = useRef([]);

  const setField = useCallback(
    (name, value) => setFormData((prev) => ({ ...prev, [name]: value })),
    [setFormData]
  );

  const setFields = useCallback(
    (patch) => setFormData((prev) => ({ ...prev, ...patch })),
    [setFormData]
  );

  const handleChange = (e) => setField(e.target.name, e.target.value);

  const autoCode = Boolean(formData.autoCustomerCode);

  /**
   * Bật tự sinh mã: hồ sơ đã tồn tại thì điền luôn mã theo id, hồ sơ mới để
   * trống cho backend sinh sau khi lưu.
   */
  const handleAutoCodeToggle = (checked) => {
    setFields({
      autoCustomerCode: checked,
      customerCode: checked ? autoCodeValue || '' : formData.customerCode || '',
    });
  };

  // ─── Nạp danh mục ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    fetchProvinces()
      .then((res) => {
        if (cancelled) return;
        const list = res?.data || [];
        provincesRef.current = list;
        setProvinces(list);
      })
      .catch(() => {
        if (cancelled) return;
        setManualLocation(true);
      });

    fetchCustomerGroups(true)
      .then((res) => {
        if (!cancelled) setGroups(res?.data || []);
      })
      .catch(() => {
        if (!cancelled) setGroups([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const provinceId = formData.provinceId;
  const districtId = formData.districtId;

  useEffect(() => {
    if (manualLocation || !provinceId) {
      setDistricts([]);
      return undefined;
    }
    let cancelled = false;
    fetchDistricts(provinceId)
      .then((res) => {
        if (!cancelled) setDistricts(res?.data || []);
      })
      .catch(() => {
        if (!cancelled) setDistricts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [provinceId, manualLocation]);

  useEffect(() => {
    if (manualLocation || !districtId) {
      setWards([]);
      return undefined;
    }
    let cancelled = false;
    fetchWards(districtId)
      .then((res) => {
        if (!cancelled) setWards(res?.data || []);
      })
      .catch(() => {
        if (!cancelled) setWards([]);
      });
    return () => {
      cancelled = true;
    };
  }, [districtId, manualLocation]);

  // ─── Địa chỉ ──────────────────────────────────────────────────────────────
  const handleProvinceChange = (e) => {
    const id = e.target.value;
    const found = provinces.find((p) => String(p.id) === String(id));
    setFields({
      provinceId: id,
      provinceName: found?.name || '',
      districtId: '',
      districtName: '',
      wardId: '',
      wardName: '',
    });
  };

  const handleDistrictChange = (e) => {
    const id = e.target.value;
    const found = districts.find((d) => String(d.id) === String(id));
    setFields({
      districtId: id,
      districtName: found?.name || '',
      wardId: '',
      wardName: '',
    });
  };

  const handleWardChange = (e) => {
    const id = e.target.value;
    const found = wards.find((w) => String(w.id) === String(id));
    setFields({ wardId: id, wardName: found?.name || '' });
  };

  /** Tách địa chỉ trả về từ tra cứu MST thành tỉnh / quận / xã + số nhà. */
  const autoFillAddress = async (rawAddress) => {
    const parts = (rawAddress || '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length === 0) return;
    if (manualLocation || provincesRef.current.length === 0) {
      setField('address', rawAddress);
      return;
    }

    const used = new Set();
    const patch = {
      provinceId: '',
      provinceName: '',
      districtId: '',
      districtName: '',
      wardId: '',
      wardName: '',
    };

    const provinceMatch = matchLocation(provincesRef.current, parts);
    if (provinceMatch) {
      used.add(provinceMatch.index);
      patch.provinceId = provinceMatch.item.id;
      patch.provinceName = provinceMatch.item.name;

      try {
        const districtRes = await fetchDistricts(provinceMatch.item.id);
        const districtList = districtRes?.data || [];
        setDistricts(districtList);

        const districtMatch = matchLocation(districtList, parts);
        if (districtMatch) {
          used.add(districtMatch.index);
          patch.districtId = districtMatch.item.id;
          patch.districtName = districtMatch.item.name;

          const wardRes = await fetchWards(districtMatch.item.id);
          const wardList = wardRes?.data || [];
          setWards(wardList);

          const wardMatch = matchLocation(wardList, parts);
          if (wardMatch) {
            used.add(wardMatch.index);
            patch.wardId = wardMatch.item.id;
            patch.wardName = wardMatch.item.name;
          }
        }
      } catch {
        // Không tách được thì giữ nguyên địa chỉ dạng văn bản.
      }
    }

    const rest = parts.filter((_, index) => !used.has(index)).join(', ');
    patch.address = rest || rawAddress;
    setFields(patch);
  };

  // ─── Tra cứu mã số thuế ───────────────────────────────────────────────────
  const handleTaxLookup = async () => {
    const taxCode = (formData.taxCode || '').trim();
    if (!taxCode) {
      toast.warning('Vui lòng nhập mã số thuế trước khi tra cứu');
      return;
    }

    setTaxLoading(true);
    try {
      const res = await lookupByTaxCode(taxCode);
      const info = res?.data;
      if (!info) {
        toast.error('Không tìm thấy thông tin cho mã số thuế này');
        return;
      }

      const patch = { taxCode: info.taxCode || taxCode };
      const currentName = (formData.fullName || '').trim();
      if (info.name && (!currentName || globalThis.confirm(`Thay tên khách hàng bằng "${info.name}"?`))) {
        patch.fullName = info.name;
      }
      if (!formData.representativeName && info.shortName) {
        patch.note = formData.note || `Tên viết tắt: ${info.shortName}`;
      }
      setFields(patch);

      if (info.address) {
        await autoFillAddress(info.address);
      }
      toast.success('Đã tự động điền thông tin từ mã số thuế');
    } catch (error) {
      toast.error(error.message || 'Tra cứu mã số thuế thất bại');
    } finally {
      setTaxLoading(false);
    }
  };

  // ─── Nhóm khách hàng ──────────────────────────────────────────────────────
  const handleCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!name) {
      toast.warning('Vui lòng nhập tên nhóm khách hàng');
      return;
    }

    setSavingGroup(true);
    try {
      const res = await createCustomerGroup({ name });
      const created = res?.data;
      if (created) {
        setGroups((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        setField('customerGroupId', String(created.groupId));
      }
      setNewGroupName('');
      setShowGroupForm(false);
      toast.success('Đã thêm nhóm khách hàng');
    } catch (error) {
      toast.error(error.message || 'Thêm nhóm khách hàng thất bại');
    } finally {
      setSavingGroup(false);
    }
  };

  // ─── Xe của đối tác ───────────────────────────────────────────────────────
  const vehicles = formData.vehicles || [];

  const setVehicles = (next) => setField('vehicles', next);

  const editingVehicle = vehicles.find((vehicle) => vehicle.key === editingVehicleKey) || null;

  /** Thêm dòng xe rỗng rồi mở luôn modal chọn xe cho dòng đó. */
  const addVehicleRow = () => {
    const row = emptyVehicleRow();
    setVehicles([...vehicles, row]);
    setEditingVehicleKey(row.key);
  };

  const removeVehicleRow = (key) => setVehicles(vehicles.filter((vehicle) => vehicle.key !== key));

  /** Đóng modal; dòng vừa thêm mà chưa nhập gì thì bỏ luôn cho gọn. */
  const handleCancelVehicleEdit = () => {
    if (editingVehicle && !editingVehicle.licensePlate) {
      removeVehicleRow(editingVehicle.key);
    }
    setEditingVehicleKey(null);
  };

  const handleSubmitVehicleEdit = (value) => {
    setVehicles(
      vehicles.map((vehicle) =>
        vehicle.key === editingVehicleKey ? { ...vehicle, ...value } : vehicle
      )
    );
    setEditingVehicleKey(null);
  };

  const handlePickCurrentLocation = () => {
    if (!globalThis.navigator?.geolocation) {
      toast.error('Trình duyệt không hỗ trợ định vị');
      return;
    }
    globalThis.navigator.geolocation.getCurrentPosition(
      (position) => {
        setFields({
          latitude: position.coords.latitude.toFixed(7),
          longitude: position.coords.longitude.toFixed(7),
        });
        toast.success('Đã lấy toạ độ hiện tại');
      },
      () => toast.error('Không lấy được vị trí hiện tại')
    );
  };

  const id = (name) => `${idPrefix}_${name}`;

  return (
    <div className={styles.partnerForm}>
      <div className={styles.tabBar} role="tablist">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabButtonActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab 1: Thông tin chung ─────────────────────────────────────── */}
      {activeTab === 'general' && (
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={id('taxCode')}>
              Mã số thuế
            </label>
            <div className={styles.inputWithButton}>
              <input
                id={id('taxCode')}
                type="text"
                name="taxCode"
                value={formData.taxCode || ''}
                onChange={handleChange}
                className={styles.input}
                placeholder="0123456789"
              />
              <button
                type="button"
                className={styles.lookupButton}
                onClick={handleTaxLookup}
                disabled={taxLoading}
                title="Tra cứu và tự động điền thông tin doanh nghiệp"
              >
                <Search size={14} /> {taxLoading ? 'Đang tra...' : 'Tra cứu'}
              </button>
            </div>
            <span className={styles.fieldHint}>Nhập MST rồi bấm Tra cứu để tự điền tên và địa chỉ.</span>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={id('customerCode')}>
              Mã khách hàng <span className={styles.required}>*</span>
            </label>
            <input
              id={id('customerCode')}
              type="text"
              name="customerCode"
              value={formData.customerCode || ''}
              onChange={handleChange}
              disabled={autoCode}
              className={`${styles.input} ${errors.customerCode ? styles.inputError : ''}`}
              placeholder={autoCode ? 'Hệ thống tự sinh sau khi lưu' : 'VD: KH00012'}
            />
            <label className={styles.inlineCheckbox}>
              <input
                type="checkbox"
                checked={autoCode}
                onChange={(e) => handleAutoCodeToggle(e.target.checked)}
                className={styles.checkbox}
              />
              <span>Tự động sinh mã</span>
            </label>
            {errors.customerCode && <span className={styles.errorText}>{errors.customerCode}</span>}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={id('fullName')}>
              Tên khách hàng <span className={styles.required}>*</span>
            </label>
            <input
              id={id('fullName')}
              type="text"
              name="fullName"
              value={formData.fullName || ''}
              onChange={handleChange}
              className={`${styles.input} ${errors.fullName ? styles.inputError : ''}`}
              placeholder="Nhập tên khách hàng / đối tác"
            />
            {errors.fullName && <span className={styles.errorText}>{errors.fullName}</span>}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={id('phone')}>
              Điện thoại <span className={styles.required}>*</span>
            </label>
            <input
              id={id('phone')}
              type="tel"
              name="phone"
              value={formData.phone || ''}
              onChange={handleChange}
              className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
              placeholder="0912345678"
            />
            {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={id('email')}>
              Email
            </label>
            <input
              id={id('email')}
              type="email"
              name="email"
              value={formData.email || ''}
              onChange={handleChange}
              className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
              placeholder="email@example.com"
            />
            {errors.email && <span className={styles.errorText}>{errors.email}</span>}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={id('gender')}>
              Giới tính
            </label>
            <select
              id={id('gender')}
              name="gender"
              value={formData.gender || ''}
              onChange={handleChange}
              className={styles.select}
            >
              <option value="">Chọn giới tính</option>
              <option value="MALE">Nam</option>
              <option value="FEMALE">Nữ</option>
              <option value="OTHER">Khác</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={id('identityCard')}>
              Số CMND / CCCD
            </label>
            <input
              id={id('identityCard')}
              type="text"
              name="identityCard"
              value={formData.identityCard || ''}
              onChange={handleChange}
              className={styles.input}
              placeholder="Số CMND/CCCD"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={id('dob')}>
              Ngày sinh
            </label>
            <input
              id={id('dob')}
              type="date"
              name="dob"
              value={formData.dob || ''}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={id('idIssueDate')}>
              Ngày cấp
            </label>
            <input
              id={id('idIssueDate')}
              type="date"
              name="idIssueDate"
              value={formData.idIssueDate || ''}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={id('idIssuePlace')}>
              Nơi cấp
            </label>
            <input
              id={id('idIssuePlace')}
              type="text"
              name="idIssuePlace"
              value={formData.idIssuePlace || ''}
              onChange={handleChange}
              className={styles.input}
              placeholder="VD: Cục CS QLHC về TTXH"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={id('customerType')}>
              Loại khách hàng
            </label>
            <select
              id={id('customerType')}
              name="customerType"
              value={formData.customerType || 'INDIVIDUAL'}
              onChange={handleChange}
              className={styles.select}
            >
              <option value="INDIVIDUAL">Khách lẻ</option>
              <option value="DEALER">Đại lý</option>
              <option value="GARAGE">Garage khác</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={id('customerGroupId')}>
              Nhóm khách hàng
            </label>
            <div className={styles.inputWithButton}>
              <select
                id={id('customerGroupId')}
                name="customerGroupId"
                value={formData.customerGroupId || ''}
                onChange={handleChange}
                className={styles.select}
              >
                <option value="">Chưa phân nhóm</option>
                {groups.map((group) => (
                  <option key={group.groupId} value={group.groupId}>
                    {group.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={styles.lookupButton}
                onClick={() => setShowGroupForm((prev) => !prev)}
                title="Thêm nhóm khách hàng mới"
              >
                <Plus size={14} />
              </button>
            </div>
            {showGroupForm && (
              <div className={styles.inputWithButton} style={{ marginTop: '6px' }}>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className={styles.input}
                  placeholder="Tên nhóm mới"
                />
                <button
                  type="button"
                  className={styles.lookupButton}
                  onClick={handleCreateGroup}
                  disabled={savingGroup}
                >
                  {savingGroup ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            )}
          </div>

          {manualLocation ? (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor={id('provinceName')}>
                  Tỉnh thành
                </label>
                <input
                  id={id('provinceName')}
                  type="text"
                  name="provinceName"
                  value={formData.provinceName || ''}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="Nhập tỉnh/thành"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor={id('districtName')}>
                  Quận huyện
                </label>
                <input
                  id={id('districtName')}
                  type="text"
                  name="districtName"
                  value={formData.districtName || ''}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="Nhập quận/huyện"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor={id('wardName')}>
                  Xã phường
                </label>
                <input
                  id={id('wardName')}
                  type="text"
                  name="wardName"
                  value={formData.wardName || ''}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="Nhập xã/phường"
                />
              </div>
            </>
          ) : (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor={id('provinceId')}>
                  Tỉnh thành
                </label>
                <select
                  id={id('provinceId')}
                  name="provinceId"
                  value={formData.provinceId || ''}
                  onChange={handleProvinceChange}
                  className={styles.select}
                >
                  <option value="">Chọn tỉnh/thành</option>
                  {provinces.map((province) => (
                    <option key={province.id} value={province.id}>
                      {province.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor={id('districtId')}>
                  Quận huyện
                </label>
                <select
                  id={id('districtId')}
                  name="districtId"
                  value={formData.districtId || ''}
                  onChange={handleDistrictChange}
                  className={styles.select}
                  disabled={!formData.provinceId}
                >
                  <option value="">{formData.provinceId ? 'Chọn quận/huyện' : 'Chọn tỉnh trước'}</option>
                  {districts.map((district) => (
                    <option key={district.id} value={district.id}>
                      {district.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor={id('wardId')}>
                  Xã phường
                </label>
                <select
                  id={id('wardId')}
                  name="wardId"
                  value={formData.wardId || ''}
                  onChange={handleWardChange}
                  className={styles.select}
                  disabled={!formData.districtId}
                >
                  <option value="">{formData.districtId ? 'Chọn xã/phường' : 'Chọn quận/huyện trước'}</option>
                  {wards.map((ward) => (
                    <option key={ward.id} value={ward.id}>
                      {ward.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label className={styles.label} htmlFor={id('address')}>
              Địa chỉ
            </label>
            <input
              id={id('address')}
              type="text"
              name="address"
              value={formData.address || ''}
              onChange={handleChange}
              className={styles.input}
              placeholder="Số nhà, đường, thôn/xóm..."
            />
          </div>

          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label className={styles.label} htmlFor={id('note')}>
              Ghi chú
            </label>
            <textarea
              id={id('note')}
              name="note"
              value={formData.note || ''}
              onChange={handleChange}
              className={styles.input}
              rows={2}
              placeholder="Ghi chú về khách hàng / đối tác"
            />
          </div>

          {children}
        </div>
      )}

      {/* ── Tab 2: Pháp nhân ───────────────────────────────────────────── */}
      {activeTab === 'legal' && (
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={id('representativeName')}>
              Người đại diện
            </label>
            <input
              id={id('representativeName')}
              type="text"
              name="representativeName"
              value={formData.representativeName || ''}
              onChange={handleChange}
              className={styles.input}
              placeholder="Họ tên người đại diện pháp luật"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={id('repIdentityCard')}>
              Số CMND người đại diện
            </label>
            <input
              id={id('repIdentityCard')}
              type="text"
              name="repIdentityCard"
              value={formData.repIdentityCard || ''}
              onChange={handleChange}
              className={styles.input}
              placeholder="Số CMND/CCCD"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={id('position')}>
              Chức vụ
            </label>
            <input
              id={id('position')}
              type="text"
              name="position"
              value={formData.position || ''}
              onChange={handleChange}
              className={styles.input}
              placeholder="VD: Giám đốc"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={id('contractNumber')}>
              Số hợp đồng
            </label>
            <input
              id={id('contractNumber')}
              type="text"
              name="contractNumber"
              value={formData.contractNumber || ''}
              onChange={handleChange}
              className={styles.input}
              placeholder="VD: HD-2026/012"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={id('contractDate')}>
              Ngày ký hợp đồng
            </label>
            <input
              id={id('contractDate')}
              type="date"
              name="contractDate"
              value={formData.contractDate || ''}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label className={styles.label} htmlFor={id('bankAccountInfo')}>
              Ngân hàng
            </label>
            <input
              id={id('bankAccountInfo')}
              type="text"
              name="bankAccountInfo"
              value={formData.bankAccountInfo || ''}
              onChange={handleChange}
              className={styles.input}
              placeholder="Số tài khoản - Chủ tài khoản - Ngân hàng - Chi nhánh"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={id('latitude')}>
              Vĩ độ
            </label>
            <input
              id={id('latitude')}
              type="text"
              inputMode="decimal"
              name="latitude"
              value={formData.latitude ?? ''}
              onChange={handleChange}
              className={styles.input}
              placeholder="21.1234567"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={id('longitude')}>
              Kinh độ
            </label>
            <div className={styles.inputWithButton}>
              <input
                id={id('longitude')}
                type="text"
                inputMode="decimal"
                name="longitude"
                value={formData.longitude ?? ''}
                onChange={handleChange}
                className={styles.input}
                placeholder="105.1234567"
              />
              <button
                type="button"
                className={styles.lookupButton}
                onClick={handlePickCurrentLocation}
                title="Lấy toạ độ vị trí hiện tại"
              >
                <MapPin size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 3: Liên hệ khác ────────────────────────────────────────── */}
      {activeTab === 'contact' && (
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={id('contactName')}>
              Họ và tên người liên hệ
            </label>
            <input
              id={id('contactName')}
              type="text"
              name="contactName"
              value={formData.contactName || ''}
              onChange={handleChange}
              className={styles.input}
              placeholder="Người liên hệ trực tiếp"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={id('contactPhone')}>
              Điện thoại người liên hệ
            </label>
            <input
              id={id('contactPhone')}
              type="tel"
              name="contactPhone"
              value={formData.contactPhone || ''}
              onChange={handleChange}
              className={styles.input}
              placeholder="0912345678"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={id('contactEmail')}>
              Email người liên hệ
            </label>
            <input
              id={id('contactEmail')}
              type="email"
              name="contactEmail"
              value={formData.contactEmail || ''}
              onChange={handleChange}
              className={styles.input}
              placeholder="email@example.com"
            />
          </div>

          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label className={styles.label} htmlFor={id('contactAddress')}>
              Địa chỉ người liên hệ
            </label>
            <input
              id={id('contactAddress')}
              type="text"
              name="contactAddress"
              value={formData.contactAddress || ''}
              onChange={handleChange}
              className={styles.input}
              placeholder="Địa chỉ liên hệ"
            />
          </div>
        </div>
      )}

      {/* ── Tab 4: Xe của đối tác ──────────────────────────────────────── */}
      {activeTab === 'vehicles' && (
        <div className={styles.vehicleTab}>
          {existingVehicles.length > 0 && (
            <div className={styles.existingVehicles}>
              <span className={styles.label}>Xe đã có trong hệ thống</span>
              <ul className={styles.existingVehicleList}>
                {existingVehicles.map((vehicle) => (
                  <li key={vehicle.vehicleId || vehicle.licensePlate}>
                    <strong>{vehicle.licensePlate}</strong>
                    <span>
                      {[vehicle.brand || vehicle.make, vehicle.model, vehicle.year || vehicle.manufactureYear]
                        .filter(Boolean)
                        .join(' · ') || 'Chưa có thông tin xe'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {vehicles.length === 0 ? (
            <p className={styles.fieldHint}>
              Chưa có xe nào được thêm. Xe sẽ được tạo cho đối tác ngay sau khi lưu hồ sơ.
            </p>
          ) : (
            vehicles.map((vehicle, index) => (
              <div key={vehicle.key} className={styles.vehicleRow}>
                <div className={styles.vehicleRowHeader}>
                  <span className={styles.label}>Xe {index + 1}</span>
                  <div className={styles.vehicleRowActions}>
                    <button
                      type="button"
                      className={styles.lookupButton}
                      onClick={() => setEditingVehicleKey(vehicle.key)}
                    >
                      <Pencil size={13} /> Sửa
                    </button>
                    <button
                      type="button"
                      className={styles.vehicleRemoveButton}
                      onClick={() => removeVehicleRow(vehicle.key)}
                      title="Xoá xe này khỏi danh sách"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className={styles.vehicleSummary}>
                  <strong>{vehicle.licensePlate || 'Chưa có biển số'}</strong>
                  <span>
                    {[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' · ') ||
                      'Chưa có thông tin xe'}
                  </span>
                </div>
              </div>
            ))
          )}

          <button type="button" className={styles.addVehicleButton} onClick={addVehicleRow}>
            <Plus size={14} /> Thêm xe
          </button>
        </div>
      )}

      <VehiclePickerModal
        open={Boolean(editingVehicle)}
        initialVehicle={editingVehicle}
        onCancel={handleCancelVehicleEdit}
        onSubmit={handleSubmitVehicleEdit}
      />
    </div>
  );
};

PartnerFormFields.propTypes = {
  formData: PropTypes.object.isRequired,
  setFormData: PropTypes.func.isRequired,
  errors: PropTypes.object,
  idPrefix: PropTypes.string.isRequired,
  autoCodeValue: PropTypes.string,
  existingVehicles: PropTypes.array,
  children: PropTypes.node,
};

export default PartnerFormFields;
