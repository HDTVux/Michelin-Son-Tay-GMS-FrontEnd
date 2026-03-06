import './BusinessInfo.css';

export default function BussinessInfor() {
	const mapLink =
		'https://maps.app.goo.gl/5p1HHhrirKYLRCCe9';
	const mapEmbed =
		'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3723.108082288589!2d105.4970050747155!3d21.06834498641888!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x313459fb2de59b03%3A0x61f544260e8428eb!2sMichelin%20Car%20Service%20-%20ABM%20S%C6%A1n%20T%C3%A2y!5e0!3m2!1svi!2s!4v1769338851955!5m2!1svi!2s';

	const handleMapClick = () => {
		window.open(mapLink, '_blank', 'noopener');
	};

	return (
		<section className="businessSection" id="contact">
			<div className="infoCard">
				<h2 className="contactMainTitle">Liên hệ</h2>
				<div className="contactCardGrid">
					<div className="contactItemCard">
						<div className="contactIconCircle">📍</div>
						<div className="contactItemBody">
							<div className="contactItemTitle">Địa chỉ</div>
							<div className="contactItemText">
								674 QL21, Tân Phúc, Sơn Tây, Hà Nội
							</div>
						</div>
					</div>

					<div className="contactItemCard">
						<div className="contactIconCircle">☎</div>
						<div className="contactItemBody">
							<div className="contactItemTitle">Hotline</div>
							<div className="contactItemText">
								0987 545 680 
							</div>
						</div>
					</div>

					<div className="contactItemCard">
						<div className="contactIconCircle">✉</div>
						<div className="contactItemBody">
							<div className="contactItemTitle">Email</div>
							<div className="contactItemText">minhanhauto.sontay@gmail.com</div>
						</div>
					</div>


				</div>

				<div className="hoursCard">
					<div className="hoursTitle">Giờ làm việc</div>
					<div className="hoursRow">
						<span>Thứ 2 - Thứ 6:</span>
						<span className="hoursTime">6:30 - 20:00</span>
					</div>
					<div className="divider" />
					<div className="hoursRow">
						<span>Thứ 7 - Chủ nhật:</span>
						<span className="hoursTime">6:30 - 20:00</span>
					</div>
				</div>

				<div>
					<div className="contactTitle">Kênh liên hệ</div>
					<div className="contactActions">
						<a className="contactCircle" href="https://zalo.me/3178553865233362097" target="_blank" rel="noreferrer">
							Zalo
						</a>
						<a className="contactCircle" href="tel:0987545680">
							Gọi
						</a>
						<a className="contactCircle" href="mailto:minhanhauto.sontay@gmail.com">
							Email
						</a>
					</div>
				</div>
			</div>

			<div className="mapCard">
				<div className="mapFrame" role="presentation" onClick={handleMapClick}>
					<iframe
						title="Michelin Sơn Tây map"
						src={mapEmbed}
						loading="lazy"
						allowFullScreen
						referrerPolicy="no-referrer-when-downgrade"
					/>
					<div className="mapOverlay">Xem bản đồ</div>
				</div>
				<button className="mapButton" type="button" onClick={handleMapClick}>
					Chỉ đường
				</button>
			</div>
		</section>
	);
}
