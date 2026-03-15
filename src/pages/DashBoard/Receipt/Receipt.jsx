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