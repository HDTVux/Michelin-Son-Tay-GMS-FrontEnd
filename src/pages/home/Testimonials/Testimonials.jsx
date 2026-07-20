import './Testimonials.css';

const TESTIMONIALS = [
  {
    name: 'Anh Minh Tuấn',
    vehicle: 'Toyota Vios',
    rating: 5,
    content: 'Thay lốp và cân bằng động ở đây rất nhanh, kỹ thuật viên tư vấn tận tình. Xe chạy êm hẳn so với trước.',
  },
  {
    name: 'Chị Thu Hà',
    vehicle: 'Hyundai Accent',
    rating: 5,
    content: 'Đưa xe vào bảo dưỡng định kỳ, giá cả minh bạch, không phát sinh thêm chi phí như một số gara khác từng gặp.',
  },
  {
    name: 'Anh Đức Anh',
    vehicle: 'Ford Ranger',
    rating: 5,
    content: 'Gọi cứu hộ lúc nửa đêm mà đội hỗ trợ có mặt rất nhanh. Rất yên tâm khi đi đường dài.',
  },
];

const Star = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffd100" stroke="#ffd100" strokeWidth="1">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
  </svg>
);

const Testimonials = () => (
  <section className="testimonialsSection">
    <div className="testimonialsContainer">
      <div className="testimonialsHeader">
        <div className="servicesLabel">KHÁCH HÀNG NÓI GÌ</div>
        <h2 className="testimonialsTitle">
          <span className="titlePart1">Đánh giá</span>
          <span className="titlePart2">từ khách hàng</span>
        </h2>
      </div>

      <div className="testimonialsGrid">
        {TESTIMONIALS.map((item) => (
          <div key={item.name} className="testimonialCard">
            <div className="testimonialStars">
              {Array.from({ length: item.rating }).map((_, i) => <Star key={i} />)}
            </div>
            <p className="testimonialContent">“{item.content}”</p>
            <div className="testimonialAuthor">
              <span className="testimonialName">{item.name}</span>
              <span className="testimonialVehicle">{item.vehicle}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Testimonials;
