import PropTypes from 'prop-types';
import styles from './Receipt.module.css';
import logo from '../../../assets/Logo.png';
import CarIcon from '../../../assets/car.png';

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

function safeText(value) {
	if (value == null) return '';
	return String(value);
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

	const receivedAt = safeText(ticket?.receivedAtDisplay || ticket?.receivedAt || '');
	const handoverAt = safeText(ticket?.handoverAtDisplay || ticket?.handoverAt || '');
	const model = safeText(vehicle?.model || '');
	const licensePlate = safeText(vehicle?.licensePlate || '');
	const odometer = vehicle?.odometerKm == null ? '' : `${Number(vehicle.odometerKm).toLocaleString('vi-VN')}`;

return (
    <section className={styles.sheet}>
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

        {/* 1. KHU VỰC THÔNG TIN CHUNG (Trải dài toàn bộ chiều ngang) */}
        {/* 1. KHU VỰC THÔNG TIN CHUNG (Chia 2 cột Trái/Phải như bản gốc) */}
        <div className={styles.infoSection}>
            
            {/* Cột Trái: Thông tin khách & Nhận xe */}
            <div className={styles.infoColumn}>
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

            {/* Cột Phải: Thông tin xe & Giao xe */}
            <div className={styles.infoColumn}>
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

        {/* 2. KHU VỰC GIỮA: SƠ ĐỒ XE (Trái) - BẢNG AN TOÀN (Phải) */}
        <div className={styles.middleSplit}>
            {/* Cột trái: Sơ đồ xe */}
            <div className={styles.diagramWrap}>
                <div className={styles.diagramLeft}>
                    <div className={styles.tireBlockTop}>
                        <div className={styles.tireHeading}>___ / ___ R ______</div>
                        <div className={styles.tireCell}><div className={styles.tireUnit}>mm</div><div className={styles.tireValue} /></div>
                        <div className={styles.tireCell}><div className={styles.tireUnit}>kg/cm²</div><div className={styles.tireValue} /></div>
                    </div>
                    <div className={styles.tireBlockBottom}>
                        <div className={styles.tireHeading}>___ / ___ R ______</div>
                        <div className={styles.tireCell}><div className={styles.tireUnit}>mm</div><div className={styles.tireValue} /></div>
                        <div className={styles.tireCell}><div className={styles.tireUnit}>kg/cm²</div><div className={styles.tireValue} /></div>
                    </div>
                </div>

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

                <div className={styles.diagramRight}>
                    <div className={styles.pressureLayout}>
                        <div className={styles.pressureLabel}>Áp suất<br/>khuyến cáo</div>
                        <div className={styles.pressureBoxes}>
                            {Array.from({ length: 3 }).map((_, idx) => (
                                <div key={`pressure-${idx}`} className={styles.pressureBox}>
                                    <div className={styles.pressureRow}><div className={styles.pressureUnit}>mm</div><div className={styles.pressureValue} /></div>
                                    <div className={styles.pressureRow}><div className={styles.pressureUnit}>kg/cm²</div><div className={styles.pressureValue} /></div>
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
                                <CheckboxCell /><CheckboxCell /><CheckboxCell />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* 3. BẢNG DỊCH VỤ (Giữ nguyên cấu trúc HTML cũ) */}
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
                    {Array.from({ length: 15 }).map((_, idx) => {
                        const label = SERVICE_ROWS[idx] || '';
                        return (
                            <tr key={`row-${idx}`}>
                                <td className={styles.tdCenter}>{String(idx + 1).padStart(2, '0')}</td>
                                <td>{label}</td>
                                <td /><td className={styles.tdCenter} /><td className={styles.tdRight} /><td className={styles.tdRight} /><td className={styles.tdCenter} /><td className={styles.tdCenter} />
                            </tr>
                        );
                    })}
                    <tr>
                        <td colSpan={5} className={styles.totalLabel}>TỔNG CỘNG</td>
                        <td className={styles.tdRight} /><td colSpan={2} />
                    </tr>
                </tbody>
            </table>
        </div>

        {/* 4. FOOTER (Cập nhật đoạn text dài) */}
        <div className={styles.footer}>
            <div className={styles.recommendation}>
                <div className={styles.footerTitle}>Khuyến nghị:</div>
                <div className={styles.legalText}>
                    <span className={styles.checkBoxSmall} style={{marginRight: '4px'}}/>
                    Tôi đồng ý rằng bất kỳ dữ liệu cá nhân nào được cung cấp theo mẫu này có thể được thu thập và xử lý bởi Michelin Việt Nam... (Chi tiết theo chính sách bảo mật của Michelin).
                </div>
            </div>
            <div className={styles.signRow}>
                <div className={styles.signCol}>
                    <div className={styles.signTitle}>Đại lý</div>
                    <div className={styles.signHint}>(Ký tên)</div>
                </div>
                <div className={styles.signCol}>
                    <div className={styles.signTitle}>Khách hàng</div>
                    <div className={styles.signHint}>(Ký tên)</div>
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
	}),
	carDiagramSrc: PropTypes.string,
};

CarDiagram.propTypes = {
	src: PropTypes.string,
};

