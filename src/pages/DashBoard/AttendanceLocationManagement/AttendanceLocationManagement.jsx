import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import QRCode from 'qrcode';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Circle, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import markerIconPng from 'leaflet/dist/images/marker-icon.png';
import markerIcon2xPng from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadowPng from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import {
  createAttendanceLocation,
  deactivateAttendanceLocation,
  fetchAttendanceLocations,
  reactivateAttendanceLocation,
  regenerateAttendanceLocationQr,
  updateAttendanceLocation,
} from '../../../services/attendanceLocationService.js';
import styles from './AttendanceLocationManagement.module.css';

// Leaflet mặc định load icon marker từ URL tương đối, không hoạt động với bundler -> khai báo lại bằng import.
const markerIcon = L.icon({
  iconUrl: markerIconPng,
  iconRetinaUrl: markerIcon2xPng,
  shadowUrl: markerShadowPng,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const DEFAULT_MAP_CENTER = [21.0285, 105.8542]; // Trung tâm TP. Hà Nội
const DEFAULT_MAP_ZOOM = 12;

const TILE_LAYERS = {
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
  },
};

function MapLayerToggle({ mapView, onToggle }) {
  return (
    <button
      type="button"
      className={styles.mapLayerToggle}
      onClick={onToggle}
    >
      {mapView === 'street' ? '🛰️ Vệ tinh' : '🗺️ Bản đồ'}
    </button>
  );
}

function LocateMeButton({ onLocated }) {
  const [locating, setLocating] = useState(false);

  const handleClick = () => {
    if (!navigator.geolocation) {
      toast.error('Trình duyệt không hỗ trợ định vị GPS.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        onLocated(position.coords.latitude, position.coords.longitude);
      },
      (err) => {
        setLocating(false);
        if (err?.code === 1) {
          toast.error('Bạn đã từ chối quyền truy cập vị trí.');
        } else {
          toast.error('Không lấy được vị trí hiện tại.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <button
      type="button"
      className={styles.mapLocateBtn}
      onClick={handleClick}
      disabled={locating}
      title="Quay về vị trí của tôi"
    >
      {locating ? '…' : '🎯'}
    </button>
  );
}

function MapClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapRecenter({ position }) {
  const map = useMap();
  const lat = position ? position[0] : null;
  const lng = position ? position[1] : null;
  useEffect(() => {
    if (lat == null || lng == null) return;
    map.setView([lat, lng], Math.max(map.getZoom(), 16));
    // Deps là lat/lng nguyên thủy (không phải mảng position) để tránh recenter
    // mỗi khi component re-render vì state khác đổi (VD bán kính).
  }, [lat, lng, map]);
  return null;
}

function InvalidateMapSize() {
  const map = useMap();
  useEffect(() => {
    // Bản đồ nằm trong layout grid/modal — kích thước thật chỉ ổn định sau khi
    // trình duyệt layout xong, gọi lại invalidateSize để tránh Leaflet vẽ tràn
    // ra ngoài container do đo kích thước sai lúc khởi tạo.
    const raf = requestAnimationFrame(() => map.invalidateSize());
    const timer = setTimeout(() => map.invalidateSize(), 300);

    const container = map.getContainer();
    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, [map]);
  return null;
}

function FitAllBounds({ points }) {
  const map = useMap();
  const key = points.map((p) => p.join(',')).join('|');
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [48, 48] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

function MapFlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.setView(target, 16);
  }, [target, map]);
  return null;
}

function LocationsOverviewMap({ locations }) {
  const points = locations.map((loc) => loc.position);
  const activePoints = locations.filter((loc) => loc.isActive !== false).map((loc) => loc.position);
  const boundsPoints = activePoints.length > 0 ? activePoints : points;
  const [mapView, setMapView] = useState('street');
  const [addressQuery, setAddressQuery] = useState('');
  const [addressResults, setAddressResults] = useState([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [flyToTarget, setFlyToTarget] = useState(null);

  const handleSearchAddress = async () => {
    const query = addressQuery.trim();
    if (!query) return;
    setSearchingAddress(true);
    setAddressResults([]);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=vn&q=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Tìm kiếm thất bại');
      const data = await res.json();
      const results = Array.isArray(data) ? data : [];
      setAddressResults(results);
      if (results.length === 0) {
        toast.error('Không tìm thấy địa chỉ phù hợp.');
      }
    } catch {
      toast.error('Không tìm kiếm được địa chỉ. Vui lòng thử lại.');
    } finally {
      setSearchingAddress(false);
    }
  };

  const handleSelectAddressResult = (result) => {
    setFlyToTarget([Number(result.lat), Number(result.lon)]);
    setAddressQuery(result.display_name);
    setAddressResults([]);
  };

  return (
    <div className={styles.overviewMapCard}>
      <div className={styles.overviewMapHeader}>
        <h3 className={styles.overviewMapTitle}>Bản đồ tất cả vị trí chấm công</h3>

        <div className={styles.overviewSearchWrapper}>
          <div className={styles.searchAddressBox}>
            <svg className={styles.searchAddressIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className={styles.searchAddressInput}
              placeholder="Tìm địa chỉ trên bản đồ..."
              value={addressQuery}
              onChange={(e) => setAddressQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearchAddress();
                }
              }}
            />
            {addressQuery.trim() && (
              <button
                type="button"
                className={styles.searchAddressClearBtn}
                onClick={() => { setAddressQuery(''); setAddressResults([]); }}
                aria-label="Xóa tìm kiếm"
              >
                ✕
              </button>
            )}
            <button
              type="button"
              className={styles.searchAddressBtn}
              onClick={handleSearchAddress}
              disabled={searchingAddress}
              aria-label="Tìm địa chỉ"
            >
              {searchingAddress ? (
                <span className={styles.searchAddressSpinner} />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              )}
            </button>
            {addressResults.length > 0 && (
              <div className={styles.searchResultsList}>
                {addressResults.map((result) => (
                  <button
                    key={result.place_id}
                    type="button"
                    className={styles.searchResultItem}
                    onClick={() => handleSelectAddressResult(result)}
                  >
                    📍 {result.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <span className={styles.overviewMapCount}>{locations.length} vị trí có tọa độ</span>
      </div>

      <div className={styles.mapShell}>
        <MapContainer center={points[0]} zoom={13} className={styles.overviewMapContainer}>
          <TileLayer attribution={TILE_LAYERS[mapView].attribution} url={TILE_LAYERS[mapView].url} />
          {locations.map((loc) => (
            <Marker key={loc.locationId} position={loc.position} icon={markerIcon} opacity={loc.isActive !== false ? 1 : 0.55}>
              <Tooltip permanent direction="top" offset={[0, -38]} className={styles.markerTooltip}>
                {loc.locationName || 'Không tên'}
              </Tooltip>
              <Popup>
                <strong>{loc.locationName || 'Không tên'}</strong><br />
                {loc.address && <>{loc.address}<br /></>}
                Bán kính: {loc.radiusMeters}m<br />
                {loc.isActive !== false ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}
              </Popup>
            </Marker>
          ))}
          <FitAllBounds points={boundsPoints} />
          <MapFlyTo target={flyToTarget} />
          <InvalidateMapSize />
        </MapContainer>
        <MapLayerToggle mapView={mapView} onToggle={() => setMapView((v) => (v === 'street' ? 'satellite' : 'street'))} />
      </div>
    </div>
  );
}

function LocationPickerMap({ latitude, longitude, radiusMeters, onPick }) {
  const hasPosition = Number.isFinite(latitude) && Number.isFinite(longitude);
  const position = hasPosition ? [latitude, longitude] : null;
  const [mapView, setMapView] = useState('street');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleSearchAddress = async () => {
    const query = searchQuery.trim();
    if (!query) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=vn&q=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Tìm kiếm thất bại');
      const data = await res.json();
      const results = Array.isArray(data) ? data : [];
      setSearchResults(results);
      if (results.length === 0) {
        toast.error('Không tìm thấy địa chỉ phù hợp.');
      }
    } catch {
      toast.error('Không tìm kiếm được địa chỉ. Vui lòng thử lại.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectResult = (result) => {
    onPick(Number(result.lat), Number(result.lon));
    setSearchQuery(result.display_name);
    setSearchResults([]);
  };

  return (
    <div className={styles.mapWrapper}>
      <div className={styles.searchAddressBox}>
        <svg className={styles.searchAddressIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          className={styles.searchAddressInput}
          placeholder="Tìm địa chỉ (VD: 674 QL21, Sơn Tây, Hà Nội)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSearchAddress();
            }
          }}
        />
        {searchQuery.trim() && (
          <button
            type="button"
            className={styles.searchAddressClearBtn}
            onClick={() => { setSearchQuery(''); setSearchResults([]); }}
            aria-label="Xóa tìm kiếm"
          >
            ✕
          </button>
        )}
        <button
          type="button"
          className={styles.searchAddressBtn}
          onClick={handleSearchAddress}
          disabled={searching}
          aria-label="Tìm địa chỉ"
        >
          {searching ? (
            <span className={styles.searchAddressSpinner} />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          )}
        </button>
        {searchResults.length > 0 && (
          <div className={styles.searchResultsList}>
            {searchResults.map((result) => (
              <button
                key={result.place_id}
                type="button"
                className={styles.searchResultItem}
                onClick={() => handleSelectResult(result)}
              >
                📍 {result.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.mapShell}>
        <MapContainer
          center={position || DEFAULT_MAP_CENTER}
          zoom={hasPosition ? 16 : DEFAULT_MAP_ZOOM}
          className={styles.mapContainer}
        >
          <TileLayer attribution={TILE_LAYERS[mapView].attribution} url={TILE_LAYERS[mapView].url} />
          <MapClickHandler onPick={onPick} />
          {hasPosition && (
            <>
              <Marker
                position={position}
                icon={markerIcon}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const { lat, lng } = e.target.getLatLng();
                    onPick(lat, lng);
                  },
                }}
              />
              <Circle
                center={position}
                radius={Number(radiusMeters) || 100}
                pathOptions={{ color: '#1e90ff', fillColor: '#1e90ff', fillOpacity: 0.15 }}
              />
            </>
          )}
          <MapRecenter position={position} />
          <InvalidateMapSize />
        </MapContainer>
        <MapLayerToggle mapView={mapView} onToggle={() => setMapView((v) => (v === 'street' ? 'satellite' : 'street'))} />
        <LocateMeButton onLocated={onPick} />
      </div>
      <p className={styles.mapHint}>
        {hasPosition
          ? 'Kéo ghim hoặc bấm vào bản đồ để chỉnh vị trí. Vòng tròn xanh là bán kính cho phép chấm công.'
          : 'Tìm địa chỉ, bấm vào bản đồ, hoặc dùng nút 🎯 để ghim vị trí chấm công.'}
      </p>
    </div>
  );
}

const getAuthToken = () =>
  localStorage.getItem('authToken')
  || localStorage.getItem('adminToken')
  || localStorage.getItem('staffToken')
  || '';

const extractArrayPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.records)) return payload.data.records;
  return [];
};

const normalizeLocationRecord = (record) => ({
  locationId: record?.locationId ?? record?.location_id ?? null,
  locationName: record?.locationName ?? record?.location_name ?? '',
  address: record?.address ?? '',
  latitude: record?.latitude ?? null,
  longitude: record?.longitude ?? null,
  radiusMeters: record?.radiusMeters ?? record?.radius_meters ?? 100,
  qrToken: record?.qrToken ?? record?.qr_token ?? '',
  isActive: record?.isActive ?? record?.is_active ?? true,
});

const buildCheckInUrl = (qrToken) => `${window.location.origin}/attendance-checkin?token=${encodeURIComponent(qrToken)}`;

const defaultForm = {
  locationName: '',
  address: '',
  latitude: '',
  longitude: '',
  radiusMeters: 100,
};

export default function AttendanceLocationManagement() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [openModal, setOpenModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [locatingGps, setLocatingGps] = useState(false);

  const [qrTarget, setQrTarget] = useState(null);
  const qrCanvasRef = useRef(null);

  const loadLocations = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setError('Vui lòng đăng nhập để quản lý vị trí chấm công.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetchAttendanceLocations(token);
      const list = extractArrayPayload(response).map(normalizeLocationRecord);
      setLocations(list);
    } catch (err) {
      setLocations([]);
      setError(err?.message || 'Không tải được danh sách vị trí chấm công.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLocations(); }, [loadLocations]);

  useEffect(() => {
    if (!qrTarget || !qrCanvasRef.current) return;
    QRCode.toCanvas(qrCanvasRef.current, buildCheckInUrl(qrTarget.qrToken), {
      width: 240,
      margin: 2,
    }).catch(() => {
      toast.error('Không tạo được mã QR.');
    });
  }, [qrTarget]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return locations;
    return locations.filter((loc) => `${loc.locationName} ${loc.address}`.toLowerCase().includes(query));
  }, [locations, search]);

  const mapLocations = useMemo(() => locations
    .filter((loc) => Number.isFinite(Number(loc.latitude)) && Number.isFinite(Number(loc.longitude)))
    .map((loc) => ({ ...loc, position: [Number(loc.latitude), Number(loc.longitude)] })), [locations]);

  const resetModal = () => {
    setOpenModal(false);
    setEditingLocation(null);
    setForm(defaultForm);
  };

  const openCreate = () => {
    setEditingLocation(null);
    setForm(defaultForm);
    setOpenModal(true);
    handleUseCurrentLocation({ silent: true });
  };

  const openEdit = (location) => {
    setEditingLocation(location);
    setForm({
      locationName: location.locationName || '',
      address: location.address || '',
      latitude: location.latitude != null ? String(location.latitude) : '',
      longitude: location.longitude != null ? String(location.longitude) : '',
      radiusMeters: location.radiusMeters || 100,
    });
    setOpenModal(true);
  };

  const handleUseCurrentLocation = ({ silent = false } = {}) => {
    if (!navigator.geolocation) {
      if (!silent) toast.error('Trình duyệt không hỗ trợ định vị GPS.');
      return;
    }
    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          latitude: String(position.coords.latitude.toFixed(7)),
          longitude: String(position.coords.longitude.toFixed(7)),
        }));
        setLocatingGps(false);
        if (!silent) toast.success('Đã lấy tọa độ hiện tại.');
      },
      (err) => {
        setLocatingGps(false);
        if (silent) return;
        if (err?.code === 1) {
          toast.error('Bạn đã từ chối quyền truy cập vị trí.');
        } else {
          toast.error('Không lấy được vị trí hiện tại. Vui lòng thử lại.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const adjustRadius = (delta) => {
    setForm((p) => {
      const current = Number(p.radiusMeters) || 0;
      return { ...p, radiusMeters: Math.max(10, current + delta) };
    });
  };

  const handleSave = async () => {
    const token = getAuthToken();
    if (!token) return;

    if (!form.locationName.trim() || !form.latitude || !form.longitude) {
      toast.error('Vui lòng nhập tên vị trí và tọa độ (vĩ độ/kinh độ).');
      return;
    }
    const lat = Number(form.latitude);
    const lng = Number(form.longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      toast.error('Tọa độ không hợp lệ.');
      return;
    }

    try {
      if (editingLocation?.locationId) {
        await updateAttendanceLocation(editingLocation.locationId, form, token);
        toast.success('Cập nhật vị trí chấm công thành công.');
      } else {
        await createAttendanceLocation(form, token);
        toast.success('Tạo vị trí chấm công thành công.');
      }
      resetModal();
      await loadLocations();
    } catch (err) {
      toast.error(err?.message || 'Lưu vị trí chấm công thất bại.');
    }
  };

  const handleDeactivate = async (locationId) => {
    if (!window.confirm('Vô hiệu hóa vị trí này? Nhân viên sẽ không thể quét mã QR tại đây nữa.')) return;
    const token = getAuthToken();
    if (!token) return;
    try {
      await deactivateAttendanceLocation(locationId, token);
      toast.success('Đã vô hiệu hóa vị trí.');
      await loadLocations();
    } catch (err) {
      toast.error(err?.message || 'Thao tác thất bại.');
    }
  };

  const handleReactivate = async (locationId) => {
    const token = getAuthToken();
    if (!token) return;
    try {
      await reactivateAttendanceLocation(locationId, token);
      toast.success('Đã khôi phục vị trí.');
      await loadLocations();
    } catch (err) {
      toast.error(err?.message || 'Khôi phục thất bại.');
    }
  };

  const handleRegenerateQr = async (location) => {
    if (!window.confirm('Tạo lại mã QR sẽ làm mã QR cũ mất hiệu lực (cần in lại). Tiếp tục?')) return;
    const token = getAuthToken();
    if (!token) return;
    try {
      const response = await regenerateAttendanceLocationQr(location.locationId, token);
      const updated = normalizeLocationRecord(response?.data || {});
      toast.success('Đã tạo mã QR mới.');
      await loadLocations();
      setQrTarget((prev) => (prev && prev.locationId === location.locationId
        ? { ...prev, qrToken: updated.qrToken || prev.qrToken }
        : prev));
    } catch (err) {
      toast.error(err?.message || 'Tạo lại mã QR thất bại.');
    }
  };

  const handleDownloadQr = () => {
    if (!qrCanvasRef.current) return;
    const url = qrCanvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `qr-cham-cong-${(qrTarget?.locationName || 'vi-tri').replace(/\s+/g, '-').toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintQr = (location) => {
    navigate(`/attendance-locations/${location.locationId}/qr-print`, { state: { location } });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Vị trí chấm công (QR)</h1>
          <p className={styles.subtitle}>Cấu hình vị trí GPS cho phép chấm công và sinh mã QR để dán tại chỗ.</p>
        </div>
        <button type="button" className={styles.primaryBtn} onClick={openCreate}>+ Thêm vị trí</button>
      </div>

      {loading && (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p>Đang tải danh sách vị trí...</p>
        </div>
      )}

      {!loading && error && (
        <div className={styles.emptyState}>
          <p className={styles.emptyMessage}>{error}</p>
        </div>
      )}

      {!loading && !error && mapLocations.length > 0 && (
        <LocationsOverviewMap locations={mapLocations} />
      )}

      {!loading && !error && (
        <div className={styles.tableCard}>
          <div className={styles.tableSearchBar}>
            <div className={styles.searchBox}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className={styles.searchInput}
                placeholder="Tìm theo tên hoặc địa chỉ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search.trim() && (
                <button type="button" className={styles.searchClearBtn} onClick={() => setSearch('')}>x</button>
              )}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className={styles.tableEmptyState}>
              <p className={styles.emptyTitle}>
                {locations.length === 0 ? 'Chưa có vị trí chấm công nào' : 'Không tìm thấy vị trí phù hợp'}
              </p>
              <p className={styles.emptyMessage}>
                {locations.length === 0 ? 'Bấm "+ Thêm vị trí" để tạo vị trí đầu tiên.' : 'Thử từ khóa khác.'}
              </p>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Tên vị trí</th>
                  <th>Địa chỉ</th>
                  <th>Tọa độ</th>
                  <th>Bán kính</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((loc) => (
                  <tr key={loc.locationId}>
                    <td className={styles.nameCell}>{loc.locationName || '-'}</td>
                    <td>{loc.address || '-'}</td>
                    <td className={styles.coordCell}>{loc.latitude}, {loc.longitude}</td>
                    <td>{loc.radiusMeters}m</td>
                    <td>
                      <span className={`${styles.statusBadge} ${loc.isActive !== false ? styles.statusActive : styles.statusInactive}`}>
                        {loc.isActive !== false ? 'Hoạt động' : 'Vô hiệu'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actionGroup}>
                        <button type="button" className={styles.qrBtn} onClick={() => setQrTarget(loc)}>Mã QR</button>
                        {loc.isActive !== false ? (
                          <>
                            <button type="button" className={styles.editBtn} onClick={() => openEdit(loc)}>Sửa</button>
                            <button type="button" className={styles.deactivateBtn} onClick={() => handleDeactivate(loc.locationId)}>Vô hiệu hóa</button>
                          </>
                        ) : (
                          <button type="button" className={styles.editBtn} onClick={() => handleReactivate(loc.locationId)}>Khôi phục</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {openModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '900px' }}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>{editingLocation ? 'Cập nhật vị trí' : 'Thêm vị trí chấm công'}</h3>
                <p className={styles.modalSubtitle}>Nhân viên chỉ chấm công được khi GPS nằm trong bán kính cho phép.</p>
              </div>
              <button type="button" className={styles.modalClose} onClick={resetModal}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalGrid}>
                <div className={styles.modalFormCol}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Tên vị trí <span className={styles.required}>*</span></label>
                    <input
                      className={styles.input}
                      placeholder="Ví dụ: Xưởng chính, Showroom..."
                      value={form.locationName}
                      onChange={(e) => setForm((p) => ({ ...p, locationName: e.target.value }))}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Địa chỉ</label>
                    <input
                      className={styles.input}
                      placeholder="Địa chỉ tham khảo (tùy chọn)"
                      value={form.address}
                      onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                    />
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Vĩ độ (lat) <span className={styles.required}>*</span></label>
                      <input
                        className={styles.input}
                        type="number"
                        step="any"
                        placeholder="21.123456"
                        value={form.latitude}
                        onChange={(e) => setForm((p) => ({ ...p, latitude: e.target.value }))}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Kinh độ (lng) <span className={styles.required}>*</span></label>
                      <input
                        className={styles.input}
                        type="number"
                        step="any"
                        placeholder="105.123456"
                        value={form.longitude}
                        onChange={(e) => setForm((p) => ({ ...p, longitude: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Bán kính cho phép (mét)</label>
                    <div className={styles.radiusStepper}>
                      <button type="button" className={styles.radiusStepBtn} onClick={() => adjustRadius(-50)}>−50</button>
                      <input
                        className={styles.input}
                        type="number"
                        min="10"
                        step="10"
                        value={form.radiusMeters}
                        onChange={(e) => setForm((p) => ({ ...p, radiusMeters: e.target.value }))}
                      />
                      <button type="button" className={styles.radiusStepBtn} onClick={() => adjustRadius(50)}>+50</button>
                    </div>
                  </div>
                  <button type="button" className={styles.gpsBtn} onClick={handleUseCurrentLocation} disabled={locatingGps}>
                    {locatingGps ? 'Đang lấy vị trí...' : '📍 Lấy vị trí hiện tại'}
                  </button>
                </div>

                <div className={styles.modalMapCol}>
                  <LocationPickerMap
                    latitude={Number(form.latitude)}
                    longitude={Number(form.longitude)}
                    radiusMeters={form.radiusMeters}
                    onPick={(lat, lng) => setForm((p) => ({
                      ...p,
                      latitude: String(lat.toFixed(7)),
                      longitude: String(lng.toFixed(7)),
                    }))}
                  />
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={resetModal}>Hủy</button>
              <button type="button" className={styles.saveBtn} onClick={handleSave}>
                {editingLocation ? 'Lưu thay đổi' : 'Tạo vị trí'}
              </button>
            </div>
          </div>
        </div>
      )}

      {qrTarget && (
        <div className={styles.modalOverlay} onClick={() => setQrTarget(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Mã QR — {qrTarget.locationName}</h3>
                <p className={styles.modalSubtitle}>In và dán mã này tại vị trí để nhân viên quét chấm công.</p>
              </div>
              <button type="button" className={styles.modalClose} onClick={() => setQrTarget(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.qrCanvasWrapper}>
                <canvas ref={qrCanvasRef} />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={() => handleRegenerateQr(qrTarget)}>Tạo lại mã QR</button>
              <button type="button" className={styles.cancelBtn} onClick={handleDownloadQr}>Tải PNG</button>
              <button type="button" className={styles.saveBtn} onClick={() => handlePrintQr(qrTarget)}>In</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
