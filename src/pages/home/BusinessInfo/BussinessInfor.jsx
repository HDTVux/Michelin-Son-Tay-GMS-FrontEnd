import { Phone, MapPin, Mail, MessageSquare } from 'lucide-react';
import './BusinessInfo.css';

export default function BussinessInfor() {
	const mapLink1 = 'https://maps.app.goo.gl/5p1HHhrirKYLRCCe9';
	const mapEmbed1 = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3723.108082288589!2d105.4970050747155!3d21.06834498641888!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x313459fb2de59b03%3A0x61f544260e8428eb!2sMichelin%20Car%20Service%20-%20ABM%20S%C6%A1n%20T%C3%A2y!5e0!3m2!1svi!2s!4v1769338851955!5m2!1svi!2s';

	const mapLink2 = 'https://maps.app.goo.gl/Y5rKFqkFBD2JUoyi6';
	const mapEmbed2 = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3721.980115908702!2d105.4935894!3d21.1133589!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31345f004038154f%3A0x2dadeaf7c736f0a1!2sMichelin%20S%C6%A1n%20T%C3%A2y!5e0!3m2!1svi!2s!4v1769338851955!5m2!1svi!2s';

	const handleMapClick1 = () => {
		window.open(mapLink1, '_blank', 'noopener');
	};

	const handleMapClick2 = () => {
		window.open(mapLink2, '_blank', 'noopener');
	};

	return (
		<section className="businessSection" id="contact">
			<div className="businessInfoContainer">
				{/* Cột Trái: Thông tin liên hệ showroom */}
				<div className="contactDetailsCard">
					<h2 className="showroomMainTitle">HỆ THỐNG CÁC SHOWROOM</h2>
					
					<div className="contactInfoList">
						<div className="contactInfoItem">
							<span className="contactInfoIcon"><Phone size={18} /></span>
							<div className="contactInfoContent">
								<span className="contactInfoLabel">Điện thoại:</span>
								<a href="tel:0987545680" className="contactInfoValue">0987 545 680</a>
							</div>
						</div>

						<div className="contactInfoItem">
							<span className="contactInfoIcon"><Mail size={18} /></span>
							<div className="contactInfoContent">
								<span className="contactInfoLabel">Email:</span>
								<a href="mailto:minhanhauto.sontay@gmail.com" className="contactInfoValue">minhanhauto.sontay@gmail.com</a>
							</div>
						</div>

						<div className="contactInfoItem">
							<span className="contactInfoIcon"><MessageSquare size={18} /></span>
							<div className="contactInfoContent">
								<span className="contactInfoLabel">Hotline (Zalo):</span>
								<a href="https://zalo.me/thietbilop" target="_blank" rel="noopener noreferrer" className="contactInfoValue">0987 545 680</a>
							</div>
						</div>
					</div>

					<div className="showroomAddresses">
						<div className="showroomAddressBlock">
							<div className="showroomAddressTitle">
								<MapPin size={16} className="pinIcon" />
								<span>Cơ sở 1:</span>
							</div>
							<p className="showroomAddressText">674 QL21, Tân Phúc, Sơn Đông, Sơn Tây, Hà Nội</p>
						</div>

						<div className="showroomAddressBlock">
							<div className="showroomAddressTitle">
								<MapPin size={16} className="pinIcon" />
								<span>Cơ sở 2:</span>
							</div>
							<p className="showroomAddressText">Lô 14.15.16 Biên phòng, Sơn Tây, Hà Nội</p>
						</div>
					</div>
				</div>

				{/* Cột Phải: Bản đồ thu nhỏ của 2 cơ sở */}
				<div className="contactMapsGrid">
					{/* Map Cơ sở 1 */}
					<div className="mapCard miniMapCard">
						<div className="miniMapHeader">
							<span className="mapCardDot" />
							<span className="miniMapTitle">Cơ sở 1</span>
						</div>
						<div className="mapFrame miniMapFrame" role="presentation" onClick={handleMapClick1}>
							<iframe
								title="Michelin Sơn Tây CS1 map"
								src={mapEmbed1}
								loading="lazy"
								allowFullScreen
								referrerPolicy="no-referrer-when-downgrade"
							/>
							<div className="mapOverlay">Xem bản đồ CS1</div>
						</div>
						<button className="mapButton miniMapButton" type="button" onClick={handleMapClick1}>
							Chỉ đường CS1
						</button>
					</div>

					{/* Map Cơ sở 2 */}
					<div className="mapCard miniMapCard">
						<div className="miniMapHeader">
							<span className="mapCardDot" />
							<span className="miniMapTitle">Cơ sở 2</span>
						</div>
						<div className="mapFrame miniMapFrame" role="presentation" onClick={handleMapClick2}>
							<iframe
								title="Michelin Sơn Tây CS2 map"
								src={mapEmbed2}
								loading="lazy"
								allowFullScreen
								referrerPolicy="no-referrer-when-downgrade"
							/>
							<div className="mapOverlay">Xem bản đồ CS2</div>
						</div>
						<button className="mapButton miniMapButton" type="button" onClick={handleMapClick2}>
							Chỉ đường CS2
						</button>
					</div>
				</div>
			</div>
		</section>
	);
}
