import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  buildRevenueDashboard,
  defaultRevenueFilters,
  getRevenueRangeFromPreset,
  revenueStatusLabels,
  revenueTypeLabels,
} from '../../../services/revenueService.js';
import styles from './RevenueManagement.module.css';

const moneyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('vi-VN');

const typeLabel = {
  SERVICE: 'Dịch vụ',
  PART: 'Phụ tùng',
  COMBO: 'Combo',
};

const statusToneClass = {
  PAID: styles.statussuccess,
  UNPAID: styles.statuswarning,
  OVERDUE: styles.statusdanger,
};

const statusColors = {
  PAID: '#16a34a',
  UNPAID: '#f59e0b',
  OVERDUE: '#dc2626',
};

const typeColors = {
  SERVICE: '#005aa9',
  PART: '#0891b2',
  COMBO: '#7c3aed',
};

const chartPalette = ['#005aa9', '#0891b2', '#16a34a', '#f59e0b', '#7c3aed', '#dc2626'];

const formatMoney = (value) => moneyFormatter.format(Number(value || 0));

const formatShortMoney = (value) => {
  const amount = Number(value || 0);
  if (amount >= 1000000000) return `${numberFormatter.format(Math.round(amount / 100000000) / 10)} tỷ`;
  if (amount >= 1000000) return `${numberFormatter.format(Math.round(amount / 100000) / 10)} tr`;
  return numberFormatter.format(amount);
};

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const toCsvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

const exportTransactionsToCsv = (transactions) => {
  const rows = [
    ['Mã phiếu', 'Khách hàng', 'Biển số', 'Ngày', 'Loại', 'Hạng mục', 'Nhân viên', 'Tạm tính', 'Giảm giá', 'Thành tiền', 'Phương thức', 'Trạng thái'],
    ...transactions.map((item) => [
      item.ticketCode,
      item.customerName,
      item.licensePlate,
      formatDate(item.paidAt),
      typeLabel[item.type] || item.type,
      item.category,
      item.staffName,
      item.subtotal,
      item.discountAmount,
      item.totalAmount,
      item.paymentMethod,
      revenueStatusLabels[item.status] || item.status,
    ]),
  ];
  const csv = rows.map((row) => row.map(toCsvCell).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `bao-cao-doanh-thu-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

function ExportIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function StatIcon({ type }) {
  const icons = {
    revenue: (
      <>
        <path d="M3 19h18" />
        <path d="M7 16V9" />
        <path d="M12 16V5" />
        <path d="M17 16v-4" />
        <path d="m6 9 6-4 6 7" />
      </>
    ),
    paid: (
      <>
        <path d="M20 6 9 17l-5-5" />
        <path d="M21 12a9 9 0 1 1-5.3-8.2" />
      </>
    ),
    unpaid: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    discount: (
      <>
        <path d="M19 5 5 19" />
        <circle cx="7.5" cy="7.5" r="2.5" />
        <circle cx="16.5" cy="16.5" r="2.5" />
      </>
    ),
    invoice: (
      <>
        <path d="M7 3h10a2 2 0 0 1 2 2v16l-3-2-2 2-2-2-2 2-2-2-3 2V5a2 2 0 0 1 2-2z" />
        <path d="M9 8h6" />
        <path d="M9 12h6" />
      </>
    ),
    average: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 15l3-4 3 2 4-7" />
      </>
    ),
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      {icons[type]}
    </svg>
  );
}

function StatCard({ icon, tone, value, label, hint }) {
  return (
    <article className={`${styles.statCard} ${styles[`tone${tone}`]}`}>
      <span className={styles.statIcon}><StatIcon type={icon} /></span>
      <div>
        <div className={styles.statValue}>{value}</div>
        <div className={styles.statLabel}>{label}</div>
        <div className={styles.statHint}>{hint}</div>
      </div>
    </article>
  );
}

function ChartPanel({ title, meta, children, wide = false }) {
  return (
    <article className={`${styles.panel} ${wide ? styles.widePanel : ''}`}>
      <div className={styles.panelHeader}>
        <h2>{title}</h2>
        {meta ? <span>{meta}</span> : null}
      </div>
      <div className={styles.chartBox}>{children}</div>
    </article>
  );
}

export default function RevenueManagement() {
  const [filters, setFilters] = useState(defaultRevenueFilters);
  const dashboard = useMemo(() => buildRevenueDashboard(filters), [filters]);

  const setFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const handlePresetChange = (event) => {
    const preset = event.target.value;
    const range = getRevenueRangeFromPreset(preset);
    setFilters((current) => ({ ...current, preset, ...range }));
  };

  const kpis = dashboard.kpis;

  return (
    <main className={styles.container}>
      <header className={styles.hero}>
        <div className={styles.heroMain}>
          <div className={styles.avatar}>DT</div>
          <div>
            <p className={styles.eyebrow}>Tài chính</p>
            <h1>Quản lí doanh thu</h1>
            <p className={styles.heroText}>
              Theo dõi doanh thu, công nợ, giảm giá, phương thức thanh toán và hiệu quả theo từng phiếu.
            </p>
            <div className={styles.roleChips}>
              <span>{formatDate(filters.from)} - {formatDate(filters.to)}</span>
              <span>{numberFormatter.format(kpis.invoiceCount)} phiếu</span>
              <span>{formatMoney(kpis.averageTicketValue)} / phiếu</span>
            </div>
          </div>
        </div>
        <button
          className={styles.refreshButton}
          type="button"
          onClick={() => exportTransactionsToCsv(dashboard.transactions)}
        >
          <span className={styles.buttonIcon}><ExportIcon /></span>
          Xuất CSV
        </button>
      </header>

      <section className={styles.filterPanel} aria-label="Bộ lọc doanh thu">
        <div className={styles.filterField}>
          <label htmlFor="revenue-preset">Khoảng thời gian</label>
          <select id="revenue-preset" value={filters.preset} onChange={handlePresetChange}>
            <option value="today">Hôm nay</option>
            <option value="week">7 ngày gần đây</option>
            <option value="month">Tháng này</option>
            <option value="quarter">Quý này</option>
            <option value="year">Năm nay</option>
          </select>
        </div>
        <div className={styles.filterField}>
          <label htmlFor="revenue-from">Từ ngày</label>
          <input id="revenue-from" type="date" value={filters.from} onChange={(event) => setFilter('from', event.target.value)} />
        </div>
        <div className={styles.filterField}>
          <label htmlFor="revenue-to">Đến ngày</label>
          <input id="revenue-to" type="date" value={filters.to} onChange={(event) => setFilter('to', event.target.value)} />
        </div>
        <div className={styles.filterField}>
          <label htmlFor="revenue-status">Trạng thái</label>
          <select id="revenue-status" value={filters.status} onChange={(event) => setFilter('status', event.target.value)}>
            {Object.entries(revenueStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className={styles.filterField}>
          <label htmlFor="revenue-type">Loại doanh thu</label>
          <select id="revenue-type" value={filters.type} onChange={(event) => setFilter('type', event.target.value)}>
            {Object.entries(revenueTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className={`${styles.filterField} ${styles.searchField}`}>
          <label htmlFor="revenue-search">Tìm kiếm</label>
          <input
            id="revenue-search"
            type="search"
            value={filters.search}
            onChange={(event) => setFilter('search', event.target.value)}
            placeholder="Mã phiếu, khách hàng, biển số..."
          />
        </div>
      </section>

      <section className={styles.statGrid} aria-label="Chỉ số doanh thu">
        <StatCard icon="revenue" tone="Blue" value={formatMoney(kpis.totalRevenue)} label="Tổng doanh thu" hint="Tổng tiền theo bộ lọc" />
        <StatCard icon="paid" tone="Green" value={formatMoney(kpis.paidRevenue)} label="Đã thanh toán" hint="Tiền đã ghi nhận" />
        <StatCard icon="unpaid" tone="Yellow" value={formatMoney(kpis.unpaidRevenue + kpis.overdueRevenue)} label="Chưa thu" hint={`${formatMoney(kpis.overdueRevenue)} quá hạn`} />
        <StatCard icon="discount" tone="Red" value={formatMoney(kpis.discountAmount)} label="Tổng giảm giá" hint="Chiết khấu trong kỳ" />
        <StatCard icon="invoice" tone="Cyan" value={numberFormatter.format(kpis.invoiceCount)} label="Số phiếu" hint="Giao dịch phù hợp" />
        <StatCard icon="average" tone="Violet" value={formatMoney(kpis.averageTicketValue)} label="Trung bình/phiếu" hint="Giá trị bình quân" />
      </section>

      <section className={styles.chartGrid} aria-label="Biểu đồ doanh thu">
        <ChartPanel title="Xu hướng doanh thu" meta={`${formatDate(filters.from)} - ${formatDate(filters.to)}`} wide>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dashboard.trend}>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(value) => value.slice(5)} />
              <YAxis tickFormatter={formatShortMoney} width={70} />
              <Tooltip formatter={(value) => formatMoney(value)} labelFormatter={formatDate} />
              <Legend />
              <Area type="monotone" dataKey="revenue" name="Tổng doanh thu" stroke="#005aa9" fill="#dbeafe" strokeWidth={3} />
              <Line type="monotone" dataKey="paid" name="Đã thu" stroke="#16a34a" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="unpaid" name="Chưa thu" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Thanh toán theo trạng thái" meta="Đã thu, chưa thu, quá hạn">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={dashboard.statusBreakdown} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={3}>
                {dashboard.statusBreakdown.map((entry) => (
                  <Cell key={entry.status} fill={statusColors[entry.status]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatMoney(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Doanh thu theo hạng mục" meta="Top dịch vụ và phụ tùng">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dashboard.byCategory.slice(0, 8)} layout="vertical" margin={{ left: 18 }}>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={formatShortMoney} />
              <YAxis type="category" dataKey="category" width={136} />
              <Tooltip formatter={(value) => formatMoney(value)} />
              <Bar dataKey="revenue" name="Doanh thu" fill="#0891b2" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Loại doanh thu" meta="Dịch vụ, phụ tùng, combo">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={dashboard.byType} dataKey="revenue" nameKey="type" outerRadius={88} label={(entry) => typeLabel[entry.type] || entry.type}>
                {dashboard.byType.map((entry) => (
                  <Cell key={entry.type} fill={typeColors[entry.type] || '#64748b'} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatMoney(value)} />
              <Legend formatter={(value) => typeLabel[value] || value} />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Phương thức thanh toán" meta="Theo số tiền ghi nhận">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dashboard.byPaymentMethod}>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
              <XAxis dataKey="method" />
              <YAxis tickFormatter={formatShortMoney} width={70} />
              <Tooltip formatter={(value) => formatMoney(value)} />
              <Bar dataKey="revenue" name="Doanh thu" radius={[4, 4, 0, 0]}>
                {dashboard.byPaymentMethod.map((entry, index) => (
                  <Cell key={entry.method} fill={chartPalette[index % chartPalette.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Doanh thu theo nhân viên" meta="Hiệu quả xử lý phiếu">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dashboard.byStaff.slice(0, 6)} layout="vertical" margin={{ left: 18 }}>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={formatShortMoney} />
              <YAxis type="category" dataKey="staffName" width={126} />
              <Tooltip formatter={(value) => formatMoney(value)} />
              <Bar dataKey="revenue" name="Doanh thu" fill="#005aa9" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Giảm giá so với tạm tính" meta="Kiểm soát chiết khấu" wide>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dashboard.discountTrend}>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(value) => value.slice(5)} />
              <YAxis tickFormatter={formatShortMoney} width={70} />
              <Tooltip formatter={(value) => formatMoney(value)} labelFormatter={formatDate} />
              <Legend />
              <Bar dataKey="gross" name="Tạm tính" fill="#bfdbfe" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="discount" name="Giảm giá" stroke="#dc2626" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartPanel>
      </section>

      <section className={styles.rankGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Top nhân viên</h2>
            <span>Theo doanh thu</span>
          </div>
          <div className={styles.rankList}>
            {dashboard.byStaff.slice(0, 5).map((item, index) => (
              <div key={item.staffName}>
                <span>{index + 1}</span>
                <p>{item.staffName}</p>
                <strong>{formatMoney(item.revenue)}</strong>
              </div>
            ))}
          </div>
        </article>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Top hạng mục</h2>
            <span>Theo số phiếu</span>
          </div>
          <div className={styles.rankList}>
            {dashboard.byCategory.slice(0, 5).map((item, index) => (
              <div key={item.category}>
                <span>{index + 1}</span>
                <p>{item.category}</p>
                <strong>{numberFormatter.format(item.count)} phiếu</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section>
        <div className={styles.tableHeader}>
          <div>
            <h2>Giao dịch doanh thu</h2>
            <p>{numberFormatter.format(dashboard.transactions.length)} kết quả theo bộ lọc hiện tại</p>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Mã phiếu</th>
                <th>Khách hàng</th>
                <th>Biển số</th>
                <th>Ngày</th>
                <th>Loại</th>
                <th>Nhân viên</th>
                <th>Tạm tính</th>
                <th>Giảm giá</th>
                <th>Thành tiền</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.transactions.length > 0 ? dashboard.transactions.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.ticketCode}</strong></td>
                  <td>{item.customerName}</td>
                  <td>{item.licensePlate}</td>
                  <td>{formatDate(item.paidAt)}</td>
                  <td>{typeLabel[item.type] || item.type}</td>
                  <td>{item.staffName}</td>
                  <td className={styles.moneyCell}>{formatMoney(item.subtotal)}</td>
                  <td className={styles.moneyCell}>{formatMoney(item.discountAmount)}</td>
                  <td className={styles.moneyCell}><strong>{formatMoney(item.totalAmount)}</strong></td>
                  <td>
                    <span className={`${styles.statusBadge} ${statusToneClass[item.status] || styles.statusneutral}`}>
                      {revenueStatusLabels[item.status] || item.status}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td className={styles.tableEmpty} colSpan={10}>Không có giao dịch phù hợp với bộ lọc.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
