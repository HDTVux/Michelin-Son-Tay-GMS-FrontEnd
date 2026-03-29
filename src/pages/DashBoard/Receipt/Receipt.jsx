import PropTypes from 'prop-types';
import styles from './Receipt.module.css';
import logo from '../../../assets/Logo.png';
import CarIcon from '../../../assets/car.jpg';

const SAFETY_ITEMS = [
	'Lốp',
	'Gạt mưa',
	'Nước rửa kính',
	'Má phanh',
	'Đĩa phanh',
	'Dầu phanh',
	'Dầu động cơ',
	'Lọc dầu động cơ',
	'Nước mát',
	'Ắc quy',
	'Lọc gió động cơ',
	'Lọc gió điều hòa',
	'Thước lái',
];

const SERVICE_ROWS = [
	'Lốp',
	'Van',
	'Cân bằng động',
	'Cân chỉnh thước lái',
	'Phanh',
	'Gạt mưa',
	'Nước rửa kính',
	'Dầu động cơ',
	'Lọc dầu động cơ',
	'Lọc gió động cơ',
	'Lọc gió điều hòa',
];

const PRESSURE_BOX_KEYS = ['pressure-a', 'pressure-b', 'pressure-c'];
const SERVICE_LINE_KEYS = Array.from({ length: 15 }).map((_, i) => `service-line-${String(i + 1).padStart(2, '0')}`);

function safeText(value) {
	if (value == null) return '';
	return String(value);
}

function toMoneyNumber(value) {
    const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
    return Number.isFinite(n) ? n : 0;
}

function formatCurrencyVnd(value) {
    const n = toMoneyNumber(value);
    return n ? new Intl.NumberFormat('vi-VN').format(Math.round(n)) : '';
}

function CarDiagram({ src }) {
	const resolvedSrc = typeof src === 'string' && src.trim() ? src.trim() : CarIcon;
	return <img className={styles.carImg} src={resolvedSrc} alt="" />;
}

function CheckboxCell() {
	return <span className={styles.checkbox} aria-hidden="true" />;
}

export default function Receipt({ ticket, carDiagramSrc }) {
	const customer = ticket?.customer || {};
	const vehicle = ticket?.vehicle || {};
    const invoice = ticket?.invoice || {};

	const receivedAt = safeText(ticket?.receivedAtDisplay || ticket?.receivedAt || '');
	const handoverAt = safeText(ticket?.handoverAtDisplay || ticket?.handoverAt || '');
	const model = safeText(vehicle?.model || '');
	const licensePlate = safeText(vehicle?.licensePlate || '');
    const odometer = vehicle?.odometerKm == null ? '' : `${Number(vehicle.odometerKm).toLocaleString('vi-VN')}`;

    const invoiceItemsRaw = Array.isArray(invoice?.items) ? invoice.items : [];
    const invoiceItems = invoiceItemsRaw.map((it, idx) => {
        const quantity = toMoneyNumber(it?.quantity);
        const unitPrice = toMoneyNumber(it?.unitPrice);
        const subTotal = toMoneyNumber(it?.subTotal) || quantity * unitPrice;
        return {
            key: String(it?.key ?? it?.estimateItemId ?? it?.itemId ?? idx),
            categoryName: safeText(it?.categoryName || it?.workCategory?.categoryName || it?.workCategory?.categoryCode || ''),
            itemName: safeText(it?.itemName || it?.description || ''),
            quantity,
            unitPrice,
            subTotal,
            confirmed: Boolean(it?.confirmed),
        };
    });

    const subtotal = Number.isFinite(Number(invoice?.subtotal)) ? Number(invoice.subtotal) : invoiceItems.reduce((acc, it) => acc + toMoneyNumber(it.subTotal), 0);
    const discountAmount = toMoneyNumber(invoice?.discountAmount);
    const vatAmount = toMoneyNumber(invoice?.vatAmount);
    const total = Number.isFinite(Number(invoice?.total)) ? Number(invoice.total) : Math.max(0, subtotal - discountAmount) + vatAmount;

    return (
    <section className={styles.sheet}>

        {/* ===== HEADER ===== */}
        <header className={styles.topHeader}>
            <div className={styles.topHeaderLeft} />
            <div className={styles.topHeaderCenter}>
                <div className={styles.sheetTitle}>PHIẾU KIỂM TRA XE</div>
            </div>
            <div className={styles.topHeaderRight}>
                <img className={styles.logo} src={logo} alt="Michelin" />
                <div className={styles.brandText}>{"MICHELIN\nCAR SERVICE"}</div>
            </div>
        </header>

        {/* ===== 1. THÔNG TIN CHUNG ===== */}
        <div className={styles.infoSection}>

            {/* Cột Trái: Thông tin khách */}
            <div className={`${styles.infoColumn} ${styles.infoColumnLeft}`}>
                <div className={styles.infoRow}>
                    <div className={styles.infoLabel}>Họ tên:</div>
                    <div className={styles.infoDotted}>{safeText(customer?.name)}</div>
                </div>

                <div className={styles.infoRowSub}>
                    <div className={styles.infoLabel}>Điện thoại:</div>
                    <div className={styles.infoDotted}>{safeText(customer?.phone)}</div>
                    <div className={styles.infoLabel} style={{marginLeft: '6px'}}>E-mail:</div>
                    <div className={styles.infoDotted}>{safeText(customer?.email)}</div>
                </div>

                <div className={styles.infoRow}>
                    <div className={styles.infoLabel}>Ngày giờ nhận xe:</div>
                    <div className={styles.infoDotted}>{receivedAt}</div>
                </div>

                <div className={styles.safetyCheckRow}>
                    <div className={styles.infoLabel}>Kiểm tra an toàn:</div>
                    <div className={styles.inlineChecks}>
                        <span className={styles.checkItem}>
                            <span className={styles.checkBoxSmall} /> Có
                        </span>
                        <span className={styles.checkItem}>
                            <span className={styles.checkBoxSmall} /> Không
                        </span>
                    </div>
                </div>
            </div>

            {/* Cột Phải: Thông tin xe */}
            <div className={`${styles.infoColumn} ${styles.infoColumnRight}`}>
                <div className={styles.infoRow}>
                    <div className={styles.infoLabel}>Loại &amp; kiểu xe:</div>
                    <div className={styles.infoDotted}>{model}</div>
                </div>

                <div className={styles.infoRowSub}>
                    <div className={styles.infoLabel}>Biển số:</div>
                    <div className={styles.infoDotted}>{licensePlate}</div>
                    <div className={styles.infoLabel} style={{marginLeft: '6px'}}>Ki-lô-mét:</div>
                    <div className={styles.infoDotted}>{odometer}</div>
                </div>

                <div className={styles.infoRow}>
                    <div className={styles.infoLabel}>Ngày giờ giao xe:</div>
                    <div className={styles.infoDotted}>{handoverAt}</div>
                </div>
            </div>
        </div>

        {/* ===== 2. SƠ ĐỒ XE & BẢNG AN TOÀN ===== */}
        <div className={styles.middleSplit}>

            {/* Cột trái: Sơ đồ xe + Áp suất khuyến cáo */}
            <div className={styles.diagramWrap}>

                {/* Cột trái: Thông số lốp trước */}
                <div className={styles.diagramLeft}>
                    <div className={styles.tireBlockTop}>
                        <div className={styles.tireHeading}>___ / ___ R ______</div>
                        <div className={styles.tireCell}>
                            <div className={styles.tireUnit}>mm</div>
                            <div className={styles.tireValue} />
                        </div>
                        <div className={styles.tireCell}>
                            <div className={styles.tireUnit}>kg/cm²</div>
                            <div className={styles.tireValue} />
                        </div>
                    </div>
                    <div className={styles.tireBlockBottom}>
                        <div className={styles.tireHeading}>___ / ___ R ______</div>
                        <div className={styles.tireCell}>
                            <div className={styles.tireUnit}>mm</div>
                            <div className={styles.tireValue} />
                        </div>
                        <div className={styles.tireCell}>
                            <div className={styles.tireUnit}>kg/cm²</div>
                            <div className={styles.tireValue} />
                        </div>
                    </div>
                </div>

                {/* Cột giữa: Hình xe */}
                <div className={styles.diagramCenter}>
                    <div className={styles.carBox}>
                        <CarDiagram src={carDiagramSrc} />
                    </div>
                    <div className={styles.sizeNoteRow}>
                        <span className={styles.infoLabel}>Size lốp khuyến cáo:</span>
                        <div className={styles.infoDotted} />
                    </div>
                    <div className={styles.sizeNoteRow}>
                        <span className={styles.infoLabel}>Lưu ý:</span>
                        <div className={styles.infoDotted} />
                    </div>
                </div>

                {/* Cột phải: Áp suất khuyến cáo */}
                <div className={styles.diagramRight}>
                    <div className={styles.pressureLayout}>
                        <div className={styles.pressureLabel}>Áp suất<br/>khuyến cáo</div>
                        <div className={styles.pressureBoxes}>
							{PRESSURE_BOX_KEYS.map((key) => (
								<div key={key} className={styles.pressureBox}>
                                    <div className={styles.pressureRow}>
                                        <div className={styles.pressureUnit}>mm</div>
                                        <div className={styles.pressureValue} />
                                    </div>
                                    <div className={styles.pressureRow}>
                                        <div className={styles.pressureUnit}>kg/cm²</div>
                                        <div className={styles.pressureValue} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Cột phải: Bảng hạng mục kiểm tra an toàn */}
            <div className={styles.safetyBox}>
                <div className={styles.safetyHeader}>
                    <div className={styles.safetyTitle}>HẠNG MỤC KIỂM TRA AN TOÀN</div>
                    <div className={styles.safetyCols}>
                        <div className={styles.safetyCol}>TỐT</div>
                        <div className={styles.safetyCol}>LƯU Ý</div>
                        <div className={styles.safetyCol}>THAY</div>
                    </div>
                </div>
                <div className={styles.safetyBody}>
                    {SAFETY_ITEMS.map((label) => (
                        <div key={label} className={styles.safetyRow}>
                            <div className={styles.safetyItem}>{label}</div>
                            <div className={styles.safetyChecks}>
                                <CheckboxCell />
                                <CheckboxCell />
                                <CheckboxCell />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* ===== 3. BẢNG DỊCH VỤ ===== */}
        <div className={styles.serviceTableWrap}>
            <table className={styles.serviceTable}>
                <thead>
                    <tr>
                        <th className={styles.thStt}>STT</th>
                        <th className={styles.thItem}>HẠNG MỤC</th>
                        <th className={styles.thDesc}>DIỄN GIẢI</th>
                        <th className={styles.thQty}>SL</th>
                        <th className={styles.thPrice}>ĐƠN GIÁ</th>
                        <th className={styles.thAmount}>THÀNH TIỀN</th>
                        <th className={styles.thKho}>KHO</th>
                        <th className={styles.thConfirm}>XÁC NHẬN</th>
                    </tr>
                </thead>
                <tbody>
                    {SERVICE_LINE_KEYS.map((rowKey, idx) => {
                        const it = invoiceItems[idx] ?? null;
                        const label = it?.categoryName ? it.categoryName : (SERVICE_ROWS[idx] || '');
                        const desc = it?.itemName || '';
                        const qty = it?.quantity ? String(it.quantity) : '';
                        const price = it?.unitPrice ? formatCurrencyVnd(it.unitPrice) : '';
                        const amount = it?.subTotal ? formatCurrencyVnd(it.subTotal) : '';
                        const confirmMark = it?.confirmed ? '✓' : '';
                        return (
                            <tr key={rowKey}>
                                <td className={styles.tdCenter}>{String(idx + 1).padStart(2, '0')}</td>
                                <td>{label}</td>
                                <td>{desc}</td>
                                <td className={styles.tdCenter}>{qty}</td>
                                <td className={styles.tdRight}>{price}</td>
                                <td className={styles.tdRight}>{amount}</td>
                                <td className={styles.tdCenter} />
                                <td className={styles.tdCenter}>{confirmMark}</td>
                            </tr>
                        );
                    })}
                    {/* Dòng TỔNG CỘNG */}
                    <tr>
                        <td colSpan={5} className={styles.totalLabel}>TỔNG CỘNG</td>
                        <td className={`${styles.tdRight} ${styles.tdTotalValue}`}>{formatCurrencyVnd(total)}</td>
                        <td colSpan={2} />
                    </tr>
                </tbody>
            </table>
        </div>

        {/* ===== 4. FOOTER ===== */}
        <div className={styles.footer}>
            <div className={styles.recommendation}>
                <div className={styles.footerTitle}>Khuyến nghị:</div>
                <div className={styles.legalText}>
                    <span className={styles.checkBoxSmall} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                    {' '}
                    Tôi đồng ý rằng bất kỳ dữ liệu cá nhân nào được cung cấp theo mẫu này có thể được thu thập và xử lý bởi Michelin Việt Nam (Công Ty) và bất kỳ công ty nào thuộc tập đoàn Michelin (có thể nằm ngoài Việt Nam), nhằm mục đích cải thiện chất lượng dịch vụ và tiếp thị. Tôi đồng ý thêm rằng Công Ty có thể liên hệ với tôi (i) để nhận phản hồi về chất lượng dịch vụ cũng như (ii) cung cấp cho tôi về các sản phẩm, dịch vụ và khuyến mại của Michelin. Tôi cũng đồng ý rằng Công Ty chỉ chuyển dữ liệu cá nhân cho các nhà cung cấp dịch vụ và / hoặc chi nhánh của Michelin tại Việt Nam hoặc bên ngoài Việt Nam.
                    Công Ty sẽ xử lý dữ liệu cá nhân của bạn theo Chính sách bảo mật của Michelin (https://www.michelin.vn/privacy-policy). Vui lòng liên hệ với công ty theo số hotline + 84 28 3942 1111 nếu bạn muốn giới hạn việc chúng tôi xử lý, truy cập hoặc chỉnh sửa dữ liệu của bạn"
                </div>
            </div>

            {/* Chữ ký */}
            <div className={styles.signRow}>
                <div className={styles.signCol}>
                    <div className={styles.signTitle}>Đại lý</div>
                    <div className={styles.signHint}>(Ký tên &amp; đóng dấu)</div>
                    <div className={styles.signLine} />
                </div>
                <div className={styles.signCol}>
                    <div className={styles.signTitle}>Khách hàng</div>
                    <div className={styles.signHint}>(Ký tên)</div>
                    <div className={styles.signLine} />
                </div>
            </div>
        </div>

    </section>
    );
}

Receipt.propTypes = {
	ticket: PropTypes.shape({
		customer: PropTypes.shape({
			name: PropTypes.string,
			phone: PropTypes.string,
			email: PropTypes.string,
		}),
		vehicle: PropTypes.shape({
			model: PropTypes.string,
			licensePlate: PropTypes.string,
			odometerKm: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		}),
		receivedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
		handoverAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
		receivedAtDisplay: PropTypes.string,
		handoverAtDisplay: PropTypes.string,
        invoice: PropTypes.shape({
            items: PropTypes.arrayOf(
                PropTypes.shape({
                    key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
                    categoryName: PropTypes.string,
                    itemName: PropTypes.string,
                    quantity: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
                    unitPrice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
                    subTotal: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
                    confirmed: PropTypes.bool,
                }),
            ),
            subtotal: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            discountAmount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            vatRate: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            vatAmount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            total: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            promotionLabel: PropTypes.string,
        }),
	}),
	carDiagramSrc: PropTypes.string,
};

CarDiagram.propTypes = {
	src: PropTypes.string,
};
