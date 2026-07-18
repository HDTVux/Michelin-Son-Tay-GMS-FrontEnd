import { useState } from 'react';
import { Phone } from 'lucide-react';
import zaloLogo from '../../../assets/logo-zalo-vector.png';
import messengerLogo from '../../../assets/messenger-logo.webp';
import './BusinessInfo.css';

export default function BussinessInfor() {
	const [isVisible, setIsVisible] = useState(true);
	const mapLink1 =
		'https://maps.app.goo.gl/5p1HHhrirKYLRCCe9';
	const mapEmbed1 =
		'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3723.108082288589!2d105.4970050747155!3d21.06834498641888!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x313459fb2de59b03%3A0x61f544260e8428eb!2sMichelin%20Car%20Service%20-%20ABM%20S%C6%A1n%20T%C3%A2y!5e0!3m2!1svi!2s!4v1769338851955!5m2!1svi!2s';

	const mapLink2 =
		'https://maps.app.goo.gl/Y5rKFqkFBD2JUoyi6';
	const mapEmbed2 =
		'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3721.980115908702!2d105.4935894!3d21.1133589!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31345f004038154f%3A0x2dadeaf7c736f0a1!2sMichelin%20S%C6%A1n%20T%C3%A2y!5e0!3m2!1svi!2s!4v1769338851955!5m2!1svi!2s';

	const handleMapClick1 = () => {
		window.open(mapLink1, '_blank', 'noopener');
	};

	const handleMapClick2 = () => {
		window.open(mapLink2, '_blank', 'noopener');
	};

	return (
		<section className="businessSection" id="contact">
			{/* Map Cơ sở 1 */}
			<div className="mapCard">
				<div className="contactMapTitle" style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
					<span>📍</span> Cơ sở 1: 674 QL21, Tân Phúc, Sơn Đông, Sơn Tây, Hà Nội
				</div>
				<div className="mapFrame" role="presentation" onClick={handleMapClick1}>
					<iframe
						title="Michelin Sơn Tây CS1 map"
						src={mapEmbed1}
						loading="lazy"
						allowFullScreen
						referrerPolicy="no-referrer-when-downgrade"
					/>
					<div className="mapOverlay">Xem bản đồ Cơ sở 1</div>
				</div>
				<button className="mapButton" type="button" onClick={handleMapClick1}>
					Chỉ đường Cơ sở 1
				</button>
			</div>

			{/* Map Cơ sở 2 */}
			<div className="mapCard">
				<div className="contactMapTitle" style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
					<span>📍</span> Cơ sở 2: Lô 14.15.16 Biên phòng, Sơn Tây, Hà Nội
				</div>
				<div className="mapFrame" role="presentation" onClick={handleMapClick2}>
					<iframe
						title="Michelin Sơn Tây CS2 map"
						src={mapEmbed2}
						loading="lazy"
						allowFullScreen
						referrerPolicy="no-referrer-when-downgrade"
					/>
					<div className="mapOverlay">Xem bản đồ Cơ sở 2</div>
				</div>
				<button className="mapButton" type="button" onClick={handleMapClick2}>
					Chỉ đường Cơ sở 2
				</button>
			</div>

			{/* Floating Kênh liên hệ */}
			{isVisible ? (
				<div className="floatingContact">
					<div className="floatingContact__label">
						<span>📞</span> Kênh liên hệ
						<button
							className="floatingContact__close"
							onClick={() => setIsVisible(false)}
							title="Ẩn"
							aria-label="Ẩn kênh liên hệ"
						>
							&times;
						</button>
					</div>
					<a className="floatingCircle floatingCircle--zalo" href="https://zalo.me/thietbilop" target="_blank" rel="noreferrer" aria-label="Liên hệ Zalo">
						<span className="floatingCircle__tooltip">Chat Zalo</span>
						<span className="floatingCircle__icon floatingCircle__icon--logo">
							<img src={zaloLogo} alt="Zalo" />
						</span>
					</a>
					<a className="floatingCircle floatingCircle--call" href="tel:0987545680" aria-label="Gọi điện">
						<span className="floatingCircle__tooltip">Gọi ngay</span>
						<span className="floatingCircle__icon"><Phone size={26} strokeWidth={2.2} /></span>
					</a>
					<a className="floatingCircle floatingCircle--messenger" href="https://m.me/michelinsontay" target="_blank" rel="noreferrer" aria-label="Nhắn tin Messenger">
						<span className="floatingCircle__tooltip">Nhắn tin Messenger</span>
						<span className="floatingCircle__icon floatingCircle__icon--logo floatingCircle__icon--messengerLogo">
							<img src={messengerLogo} alt="Messenger" />
						</span>
					</a>
				</div>
			) : (
				<button
					className="floatingContact__trigger"
					onClick={() => setIsVisible(true)}
					title="Mở kênh liên hệ"
					aria-label="Mở kênh liên hệ"
				>
					📞
				</button>
			)}
		</section>
	);
}
