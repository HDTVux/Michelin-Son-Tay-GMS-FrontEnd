import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// Giỏ hàng khách hàng: lưu localStorage để giữ giỏ khi tải lại trang / mở tab mới.
const STORAGE_KEY = 'gms_cart_v1';

const CartContext = createContext(null);

// item trong giỏ: { id, serviceId, itemType, name, price, priceText, thumbnail, quantity }
const sanitizeItems = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const id = String(item?.id ?? '').trim();
      if (!id) return null;
      const quantity = Number(item?.quantity);
      return {
        id,
        serviceId: Number.isFinite(Number(item?.serviceId)) ? Number(item.serviceId) : null,
        itemType: String(item?.itemType || 'SERVICE').toUpperCase() === 'PART' ? 'PART' : 'SERVICE',
        name: String(item?.name || '').trim() || 'Sản phẩm',
        price: Number.isFinite(Number(item?.price)) && Number(item?.price) > 0 ? Number(item.price) : null,
        priceText: String(item?.priceText || '').trim(),
        thumbnail: String(item?.thumbnail || '').trim(),
        quantity: Number.isFinite(quantity) && quantity > 0 ? Math.min(Math.floor(quantity), 99) : 1,
      };
    })
    .filter(Boolean);
};

const readStoredItems = () => {
  try {
    return sanitizeItems(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
  } catch {
    return [];
  }
};

export function CartProvider({ children }) {
  const [items, setItems] = useState(readStoredItems);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // localStorage đầy hoặc bị chặn: giỏ vẫn hoạt động trong phiên hiện tại
    }
  }, [items]);

  // Đồng bộ giỏ giữa các tab
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key && e.key !== STORAGE_KEY) return;
      setItems(readStoredItems());
    };
    globalThis.addEventListener('storage', handleStorage);
    return () => globalThis.removeEventListener('storage', handleStorage);
  }, []);

  const addItem = useCallback((item, quantity = 1) => {
    const [clean] = sanitizeItems([{ ...item, quantity }]);
    if (!clean) return false;
    setItems((prev) => {
      const existing = prev.find((x) => x.id === clean.id);
      if (existing) {
        return prev.map((x) => (
          x.id === clean.id ? { ...x, quantity: Math.min(x.quantity + clean.quantity, 99) } : x
        ));
      }
      return [...prev, clean];
    });
    return true;
  }, []);

  const updateQuantity = useCallback((id, quantity) => {
    const qty = Math.floor(Number(quantity));
    setItems((prev) => {
      if (!Number.isFinite(qty) || qty <= 0) return prev.filter((x) => x.id !== String(id));
      return prev.map((x) => (x.id === String(id) ? { ...x, quantity: Math.min(qty, 99) } : x));
    });
  }, []);

  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((x) => x.id !== String(id)));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo(() => {
    const totalQuantity = items.reduce((sum, x) => sum + x.quantity, 0);
    // Tổng tiền chỉ tính trên các mục có giá số; mục "Liên hệ" sẽ được báo giá sau
    const totalAmount = items.reduce((sum, x) => sum + (x.price != null ? x.price * x.quantity : 0), 0);
    const hasContactPriceItem = items.some((x) => x.price == null);
    const hasServiceItem = items.some((x) => x.itemType === 'SERVICE');
    return {
      items,
      totalQuantity,
      totalAmount,
      hasContactPriceItem,
      hasServiceItem,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    };
  }, [items, addItem, updateQuantity, removeItem, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook và provider dùng chung 1 context, tách file là thừa cho một cặp nhỏ như thế này
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart phải được dùng bên trong <CartProvider>.');
  }
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components -- helper hiển thị giá đi kèm giỏ hàng
export const formatVnd = (value) => (
  Number.isFinite(Number(value)) ? `${Number(value).toLocaleString('vi-VN')} VND` : 'Liên hệ'
);
