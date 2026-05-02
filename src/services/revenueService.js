const DAY_MS = 24 * 60 * 60 * 1000;

const sampleTransactions = [
  {
    id: 1,
    ticketCode: 'ST-2026-0502-001',
    customerName: 'Nguyen Van An',
    licensePlate: '30A-123.45',
    paidAt: '2026-05-02',
    type: 'SERVICE',
    category: 'Bao duong',
    staffName: 'Tran Minh Duc',
    subtotal: 1850000,
    discountAmount: 150000,
    totalAmount: 1700000,
    paymentMethod: 'Chuyen khoan',
    status: 'PAID',
  },
  {
    id: 2,
    ticketCode: 'ST-2026-0502-002',
    customerName: 'Le Thu Ha',
    licensePlate: '29B-678.90',
    paidAt: '2026-05-02',
    type: 'PART',
    category: 'Lop xe',
    staffName: 'Pham Quang Huy',
    subtotal: 4200000,
    discountAmount: 200000,
    totalAmount: 4000000,
    paymentMethod: 'Tien mat',
    status: 'PAID',
  },
  {
    id: 3,
    ticketCode: 'ST-2026-0501-014',
    customerName: 'Pham Hoang Nam',
    licensePlate: '30H-246.80',
    paidAt: '2026-05-01',
    type: 'SERVICE',
    category: 'Can chinh thuoc lai',
    staffName: 'Tran Minh Duc',
    subtotal: 950000,
    discountAmount: 0,
    totalAmount: 950000,
    paymentMethod: 'The',
    status: 'PAID',
  },
  {
    id: 4,
    ticketCode: 'ST-2026-0430-021',
    customerName: 'Do Quoc Bao',
    licensePlate: '30E-333.22',
    paidAt: '2026-04-30',
    type: 'COMBO',
    category: 'Bao duong tong hop',
    staffName: 'Nguyen Viet Anh',
    subtotal: 5600000,
    discountAmount: 350000,
    totalAmount: 5250000,
    paymentMethod: 'Chuyen khoan',
    status: 'PAID',
  },
  {
    id: 5,
    ticketCode: 'ST-2026-0430-018',
    customerName: 'Vu Minh Chau',
    licensePlate: '30K-909.12',
    paidAt: '2026-04-30',
    type: 'PART',
    category: 'Ac quy',
    staffName: 'Pham Quang Huy',
    subtotal: 2400000,
    discountAmount: 120000,
    totalAmount: 2280000,
    paymentMethod: 'Chuyen khoan',
    status: 'UNPAID',
  },
  {
    id: 6,
    ticketCode: 'ST-2026-0429-011',
    customerName: 'Hoang Gia Bao',
    licensePlate: '29C-111.88',
    paidAt: '2026-04-29',
    type: 'SERVICE',
    category: 'Thay dau',
    staffName: 'Tran Minh Duc',
    subtotal: 780000,
    discountAmount: 0,
    totalAmount: 780000,
    paymentMethod: 'Tien mat',
    status: 'PAID',
  },
  {
    id: 7,
    ticketCode: 'ST-2026-0428-009',
    customerName: 'Dang Phuong Linh',
    licensePlate: '30F-567.89',
    paidAt: '2026-04-28',
    type: 'SERVICE',
    category: 'Kiem tra an toan',
    staffName: 'Nguyen Viet Anh',
    subtotal: 650000,
    discountAmount: 50000,
    totalAmount: 600000,
    paymentMethod: 'Tien mat',
    status: 'OVERDUE',
  },
  {
    id: 8,
    ticketCode: 'ST-2026-0427-027',
    customerName: 'Bui Thanh Tung',
    licensePlate: '30G-135.79',
    paidAt: '2026-04-27',
    type: 'PART',
    category: 'Mam xe',
    staffName: 'Pham Quang Huy',
    subtotal: 7200000,
    discountAmount: 500000,
    totalAmount: 6700000,
    paymentMethod: 'Chuyen khoan',
    status: 'PAID',
  },
  {
    id: 9,
    ticketCode: 'ST-2026-0426-004',
    customerName: 'Mai Quynh Anh',
    licensePlate: '29D-555.66',
    paidAt: '2026-04-26',
    type: 'COMBO',
    category: 'Lop va can bang dong',
    staffName: 'Tran Minh Duc',
    subtotal: 3800000,
    discountAmount: 300000,
    totalAmount: 3500000,
    paymentMethod: 'The',
    status: 'PAID',
  },
  {
    id: 10,
    ticketCode: 'ST-2026-0425-016',
    customerName: 'Nguyen Thi Mai',
    licensePlate: '30A-808.08',
    paidAt: '2026-04-25',
    type: 'SERVICE',
    category: 'Ve sinh phanh',
    staffName: 'Nguyen Viet Anh',
    subtotal: 1200000,
    discountAmount: 80000,
    totalAmount: 1120000,
    paymentMethod: 'Chuyen khoan',
    status: 'UNPAID',
  },
];

const toDateOnly = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const getRangeFromPreset = (preset) => {
  const today = new Date('2026-05-02T00:00:00');
  const end = toDateOnly(today);
  if (preset === 'today') return { from: end, to: end };
  if (preset === 'week') return { from: toDateOnly(new Date(today.getTime() - 6 * DAY_MS)), to: end };
  if (preset === 'quarter') return { from: '2026-04-01', to: end };
  if (preset === 'year') return { from: '2026-01-01', to: end };
  return { from: '2026-05-01', to: end };
};

const isWithinRange = (dateText, from, to) => {
  if (!dateText) return false;
  if (from && dateText < from) return false;
  if (to && dateText > to) return false;
  return true;
};

const sumBy = (items, selector) => items.reduce((total, item) => total + Number(selector(item) || 0), 0);

const groupRevenueTrend = (items) => {
  const byDate = new Map();
  items.forEach((item) => {
    const key = item.paidAt;
    const current = byDate.get(key) || { date: key, revenue: 0, paid: 0, unpaid: 0 };
    current.revenue += item.totalAmount;
    if (item.status === 'PAID') current.paid += item.totalAmount;
    if (item.status !== 'PAID') current.unpaid += item.totalAmount;
    byDate.set(key, current);
  });
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
};

const groupByCategory = (items) => {
  const byCategory = new Map();
  items.forEach((item) => {
    const current = byCategory.get(item.category) || { category: item.category, revenue: 0, count: 0 };
    current.revenue += item.totalAmount;
    current.count += 1;
    byCategory.set(item.category, current);
  });
  return Array.from(byCategory.values()).sort((a, b) => b.revenue - a.revenue);
};

const groupByStaff = (items) => {
  const byStaff = new Map();
  items.forEach((item) => {
    const current = byStaff.get(item.staffName) || { staffName: item.staffName, revenue: 0, count: 0 };
    current.revenue += item.totalAmount;
    current.count += 1;
    byStaff.set(item.staffName, current);
  });
  return Array.from(byStaff.values()).sort((a, b) => b.revenue - a.revenue);
};

const groupByType = (items) => {
  const byType = new Map();
  items.forEach((item) => {
    const current = byType.get(item.type) || { type: item.type, revenue: 0, count: 0 };
    current.revenue += item.totalAmount;
    current.count += 1;
    byType.set(item.type, current);
  });
  return Array.from(byType.values()).sort((a, b) => b.revenue - a.revenue);
};

const groupByPaymentMethod = (items) => {
  const byMethod = new Map();
  items.forEach((item) => {
    const current = byMethod.get(item.paymentMethod) || { method: item.paymentMethod, revenue: 0, count: 0 };
    current.revenue += item.totalAmount;
    current.count += 1;
    byMethod.set(item.paymentMethod, current);
  });
  return Array.from(byMethod.values()).sort((a, b) => b.revenue - a.revenue);
};

const groupDiscountTrend = (items) => {
  const byDate = new Map();
  items.forEach((item) => {
    const key = item.paidAt;
    const current = byDate.get(key) || { date: key, discount: 0, gross: 0 };
    current.discount += item.discountAmount;
    current.gross += item.subtotal;
    byDate.set(key, current);
  });
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
};

export const revenueTypeLabels = {
  ALL: 'Tất cả',
  SERVICE: 'Dịch vụ',
  PART: 'Phụ tùng',
  COMBO: 'Combo',
};

export const revenueStatusLabels = {
  ALL: 'Tất cả',
  PAID: 'Đã thanh toán',
  UNPAID: 'Chưa thanh toán',
  OVERDUE: 'Quá hạn',
};

export const defaultRevenueFilters = {
  preset: 'month',
  from: getRangeFromPreset('month').from,
  to: getRangeFromPreset('month').to,
  status: 'ALL',
  type: 'ALL',
  search: '',
};

export const getRevenueRangeFromPreset = getRangeFromPreset;

export const buildRevenueDashboard = (filters = defaultRevenueFilters) => {
  const query = String(filters.search || '').trim().toLowerCase();
  const transactions = sampleTransactions.filter((item) => {
    if (!isWithinRange(item.paidAt, filters.from, filters.to)) return false;
    if (filters.status && filters.status !== 'ALL' && item.status !== filters.status) return false;
    if (filters.type && filters.type !== 'ALL' && item.type !== filters.type) return false;
    if (!query) return true;
    return [
      item.ticketCode,
      item.customerName,
      item.licensePlate,
      item.category,
      item.staffName,
    ].some((value) => String(value || '').toLowerCase().includes(query));
  });

  const paidRevenue = sumBy(transactions.filter((item) => item.status === 'PAID'), (item) => item.totalAmount);
  const unpaidRevenue = sumBy(transactions.filter((item) => item.status === 'UNPAID'), (item) => item.totalAmount);
  const overdueRevenue = sumBy(transactions.filter((item) => item.status === 'OVERDUE'), (item) => item.totalAmount);
  const totalRevenue = sumBy(transactions, (item) => item.totalAmount);
  const discountAmount = sumBy(transactions, (item) => item.discountAmount);
  const invoiceCount = transactions.length;

  return {
    kpis: {
      totalRevenue,
      paidRevenue,
      unpaidRevenue,
      overdueRevenue,
      discountAmount,
      invoiceCount,
      averageTicketValue: invoiceCount > 0 ? Math.round(totalRevenue / invoiceCount) : 0,
    },
    trend: groupRevenueTrend(transactions),
    discountTrend: groupDiscountTrend(transactions),
    byCategory: groupByCategory(transactions),
    byStaff: groupByStaff(transactions),
    byType: groupByType(transactions),
    byPaymentMethod: groupByPaymentMethod(transactions),
    statusBreakdown: [
      { name: 'Đã thanh toán', value: paidRevenue, status: 'PAID' },
      { name: 'Chưa thanh toán', value: unpaidRevenue, status: 'UNPAID' },
      { name: 'Quá hạn', value: overdueRevenue, status: 'OVERDUE' },
    ].filter((item) => item.value > 0),
    transactions,
  };
};
