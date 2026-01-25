import './BusinessInfo.css';

export default function BussinessInfor() {
	const mapLink =
		'https://www.google.com/maps/search/?api=1&query=Michelin+S%C6%A1n+T%C3%A2y';
	const mapEmbed =
		'https://www.google.com/maps/embed/v1/place?key=YOUR_GOOGLE_MAPS_API_KEY&q=Michelin+S%C6%A1n+T%C3%A2y';

	const handleMapClick = () => {
		window.open(mapLink, '_blank', 'noopener');
	};

	return (
		<section className="businessSection">
			<div className="infoCard">
				<div>
					<h2>Michelin Sơn Tây</h2>
					<p className="textRow">
						<span className="label">Địa chỉ:</span>
						<span className="value">674 QL21, Tân Phúc, Sơn Tây, Hà Nội</span>
					</p>

					<div className="hotlineRow">
						<span className="label">Hotline:</span>
						<span className="value strong">0987 545 680</span>
						<span className="badge">24/7</span>
					</div>

					<p className="textRow">
						<span className="label">Email:</span>
						<span className="value">info@michelin.com</span>
					</p>
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
					<div className="contactTitle">Liên hệ với chúng tôi</div>
					<div className="contactActions">
						<a className="contactCircle" href="https://zalo.me" target="_blank" rel="noreferrer">
							Zalo
						</a>
						<a className="contactCircle" href="tel:0987654321">
							Gọi
						</a>
						<a className="contactCircle" href="mailto:info@michelin.com">
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
