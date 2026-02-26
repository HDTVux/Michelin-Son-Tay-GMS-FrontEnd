import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './About.css';
import visionImage from '../../assets/anh_tam_nhin.jpg';
import facilityImg1 from '../../assets/z7501188211493_472143d80204db754b377a67838c33f5.jpg';
import facilityImg2 from '../../assets/z7501188266461_80cd9d87424adaf8b0a78bd40b3545a1.jpg';
import facilityImg3 from '../../assets/z7501188266555_1d32eab995cb25311ddb7d0ce6a4172c.jpg';
import facilityImg4 from '../../assets/z7501188266556_2e19562ee0b89224a3f3ec42d4b9232f.jpg';

const About = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  const [whyChooseVisible, setWhyChooseVisible] = useState(false);
  const [visionVisible, setVisionVisible] = useState(false);
  const [commitmentVisible, setCommitmentVisible] = useState(false);
  const [facilitiesVisible, setFacilitiesVisible] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const [blogVisible, setBlogVisible] = useState(false);
  const [testimonialsVisible, setTestimonialsVisible] = useState(false);
  const whyChooseRef = useRef(null);
  const visionRef = useRef(null);
  const commitmentRef = useRef(null);
  const facilitiesRef = useRef(null);
  const statsRef = useRef(null);
  const blogRef = useRef(null);
  const testimonialsRef = useRef(null);
  const [blogData, setBlogData] = useState({
    title: '',
    content: '',
    mainImage: null,
    additionalImages: []
  });
  const [blogs] = useState([
    {
      id: 1,
      title: 'Cách bảo dưỡng lốp xe đúng cách',
      content: 'Lốp xe là bộ phận quan trọng nhất của xe, tiếp xúc trực tiếp với mặt đường. Việc bảo dưỡng lốp đúng cách sẽ giúp tăng tuổi thọ và đảm bảo an toàn khi lái xe...',
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      date: '15/10/2023',
      author: 'Michelin Sơn Tây'
    },
    {
      id: 2,
      title: 'Dấu hiệu cần thay lốp xe ngay lập tức',
      content: 'Khi nào cần thay lốp xe? Đây là câu hỏi mà nhiều tài xế thắc mắc. Dưới đây là những dấu hiệu rõ ràng cho thấy bạn cần thay lốp ngay...',
      image: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800',
      date: '10/10/2023',
      author: 'Michelin Sơn Tây'
    },
    {
      id: 3,
      title: 'Hướng dẫn chọn lốp xe phù hợp',
      content: 'Việc chọn lốp xe phù hợp không chỉ ảnh hưởng đến hiệu suất vận hành mà còn ảnh hưởng đến độ an toàn và tiết kiệm nhiên liệu...',
      image: 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=800',
      date: '05/10/2023',
      author: 'Michelin Sơn Tây'
    }
  ]);
  const [testimonials] = useState([
    {
      id: 1,
      name: 'Nguyễn Văn A',
      rating: 5,
      comment: 'Dịch vụ rất chuyên nghiệp, nhân viên nhiệt tình. Xe của tôi được chăm sóc kỹ lưỡng và giá cả hợp lý.',
      date: '15/10/2023'
    },
    {
      id: 2,
      name: 'Trần Thị B',
      rating: 5,
      comment: 'Lần đầu đến đây và rất hài lòng. Quy trình rõ ràng, minh bạch. Sẽ quay lại lần sau.',
      date: '20/10/2023'
    },
    {
      id: 3,
      name: 'Lê Văn C',
      rating: 4,
      comment: 'Thay lốp nhanh chóng, chất lượng tốt. Không gian chờ đợi sạch sẽ, thoải mái.',
      date: '25/10/2023'
    }
  ]);



  const checkAuthStatus = () => {
    const customerToken = localStorage.getItem('customerToken');
    const staffToken = localStorage.getItem('staffToken');
    const adminToken = localStorage.getItem('adminToken');
    setIsAuthenticated(!!customerToken);
    setIsStaff(!!(staffToken || adminToken));
  };

  useEffect(() => {
    checkAuthStatus();
    setHeroVisible(true);
    
    const handleStorageChange = (e) => {
      if (e.key === 'customerToken' || e.key === 'staffToken' || e.key === 'adminToken' || !e.key) {
        checkAuthStatus();
      }
    };
    
    const handleFocus = () => {
      checkAuthStatus();
    };
    
    const handleAuthChange = () => {
      checkAuthStatus();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('authChange', handleAuthChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('authChange', handleAuthChange);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const targetId = entry.target.getAttribute('data-section');
            switch(targetId) {
              case 'whyChoose':
                setWhyChooseVisible(true);
                break;
              case 'vision':
                setVisionVisible(true);
                break;
              case 'commitment':
                setCommitmentVisible(true);
                break;
              case 'facilities':
                setFacilitiesVisible(true);
                break;
              case 'stats':
                setStatsVisible(true);
                break;
              case 'blog':
                setBlogVisible(true);
                break;
              case 'testimonials':
                setTestimonialsVisible(true);
                break;
            }
          }
        });
      },
      { threshold: 0.2 }
    );

    const sections = [
      whyChooseRef.current,
      visionRef.current,
      commitmentRef.current,
      facilitiesRef.current,
      statsRef.current,
      blogRef.current,
      testimonialsRef.current
    ];

    sections.forEach(section => {
      if (section) observer.observe(section);
    });

    return () => {
      sections.forEach(section => {
        if (section) observer.unobserve(section);
      });
    };
  }, []);


  const handleMainImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBlogData(prev => ({ ...prev, mainImage: file }));
    }
  };

  const handleAdditionalImagesChange = (e) => {
    const files = Array.from(e.target.files);
    setBlogData(prev => ({ ...prev, additionalImages: [...prev.additionalImages, ...files] }));
  };

  const removeAdditionalImage = (index) => {
    setBlogData(prev => ({
      ...prev,
      additionalImages: prev.additionalImages.filter((_, i) => i !== index)
    }));
  };

  const handleBlogSubmit = (e) => {
    e.preventDefault();
    // TODO: Xử lý submit blog
    console.log('Blog data:', blogData);
    alert('Blog đã được lưu thành công!');
  };
  return (
    <section className="aboutPage">
      <div className="aboutHero">
        <div className="heroContent">
          <div className="heroBadge">Về chúng tôi</div>
          <h1 className="aboutTitle">
            <span className="titleGradient">Michelin Sơn Tây</span>
            <br />
            <span className="titleSub">Địa chỉ tin cậy cho mọi dịch vụ chăm sóc xe</span>
          </h1>
          <p className="aboutSubtitle">
            Với hơn 10 năm kinh nghiệm, chúng tôi cam kết mang đến dịch vụ chất lượng cao, 
            quy trình chuyên nghiệp và trải nghiệm khách hàng tuyệt vời nhất.
          </p>
        </div>
        <div className="heroStats">
          <div className="heroStatItem">
            <div className="heroStatNumber">10+</div>
            <div className="heroStatLabel">Năm kinh nghiệm</div>
          </div>
          <div className="heroStatItem">
            <div className="heroStatNumber">5000+</div>
            <div className="heroStatLabel">Khách hàng hài lòng</div>
          </div>
          <div className="heroStatItem">
            <div className="heroStatNumber">24/7</div>
            <div className="heroStatLabel">Dịch vụ cứu hộ</div>
          </div>
        </div>
      </div>

      <div className="aboutContent">
        <div className="whyChooseSection" ref={whyChooseRef} data-section="whyChoose">
          <div className={`sectionHeader ${whyChooseVisible ? 'visible' : ''}`}>
            <span className="sectionLabel">Tại sao chọn chúng tôi</span>
            <h2 className="sectionTitle">Những lý do khách hàng tin tưởng</h2>
          </div>
          <div className="whyChooseGrid">
            <div className="whyChooseCard">
              <div className="whyChooseIcon">✓</div>
              <h3>Chất lượng hàng đầu</h3>
              <p>Sản phẩm chính hãng 100%, đảm bảo chất lượng và độ bền cao cho xe của bạn.</p>
            </div>
            <div className="whyChooseCard">
              <div className="whyChooseIcon">⚡</div>
              <h3>Dịch vụ nhanh chóng</h3>
              <p>Quy trình tối ưu, thời gian phục vụ nhanh chóng, không làm lãng phí thời gian của bạn.</p>
            </div>
            <div className="whyChooseCard">
              <div className="whyChooseIcon">🛡️</div>
              <h3>Bảo hành uy tín</h3>
              <p>Chế độ bảo hành rõ ràng, minh bạch, hỗ trợ khách hàng tận tâm sau bán hàng.</p>
            </div>
            <div className="whyChooseCard">
              <div className="whyChooseIcon">👨‍🔧</div>
              <h3>Đội ngũ chuyên nghiệp</h3>
              <p>Kỹ thuật viên giàu kinh nghiệm, được đào tạo bài bản, luôn sẵn sàng phục vụ.</p>
            </div>
          </div>
        </div>

        <div className="aboutSection" ref={visionRef} data-section="vision">
          <div className={`aboutText ${visionVisible ? 'visible' : ''}`}>
            <span className="sectionLabel">Tầm nhìn & Sứ mệnh</span>
            <h2>Tầm nhìn & Ảnh hưởng</h2>
            <p>
              Michelin Sơn Tây hướng tới trở thành trung tâm dịch vụ lốp và chăm sóc xe chuẩn mực tại khu vực,
              nơi mọi khách hàng đều cảm thấy an tâm mỗi khi giao xe cho chúng tôi.
            </p>
            <p>
              Bằng việc áp dụng quy trình minh bạch, kỹ thuật hiện đại và trải nghiệm dịch vụ nhất quán,
              chúng tôi mong muốn góp phần nâng cao tiêu chuẩn an toàn giao thông và thói quen bảo dưỡng xe
              chuyên nghiệp cho cộng đồng địa phương.
            </p>
            <div className="aboutFeatures">
              <div className="aboutFeature">
                <span className="featureIcon">🎯</span>
                <span>Minh bạch trong quy trình</span>
              </div>
              <div className="aboutFeature">
                <span className="featureIcon">🔧</span>
                <span>Kỹ thuật hiện đại</span>
              </div>
              <div className="aboutFeature">
                <span className="featureIcon">💎</span>
                <span>Dịch vụ nhất quán</span>
              </div>
            </div>
          </div>
          <div className="aboutImage">
            <div className="imageWrapper">
              <img src={visionImage} alt="Tầm nhìn Michelin Sơn Tây" className="aboutVisionImage" />
              <div className="imageOverlay"></div>
            </div>
          </div>
        </div>

        <div className="commitmentSection" ref={commitmentRef} data-section="commitment">
          <div className={`sectionHeader ${commitmentVisible ? 'visible' : ''}`}>
            <span className="sectionLabel">Cam kết của chúng tôi</span>
            <h2 className="sectionTitle">Những giá trị chúng tôi theo đuổi</h2>
          </div>
          <div className="commitmentGrid">
            <div className="commitmentCard">
              <div className="commitmentNumber">01</div>
              <h3>Chất lượng</h3>
              <p>Chỉ sử dụng sản phẩm chính hãng, đảm bảo chất lượng tốt nhất cho khách hàng.</p>
            </div>
            <div className="commitmentCard">
              <div className="commitmentNumber">02</div>
              <h3>Uy tín</h3>
              <p>Minh bạch trong giá cả, rõ ràng trong quy trình, đáng tin cậy trong dịch vụ.</p>
            </div>
            <div className="commitmentCard">
              <div className="commitmentNumber">03</div>
              <h3>Chuyên nghiệp</h3>
              <p>Đội ngũ được đào tạo bài bản, quy trình chuẩn hóa, phục vụ tận tâm.</p>
            </div>
            <div className="commitmentCard">
              <div className="commitmentNumber">04</div>
              <h3>Hỗ trợ</h3>
              <p>Luôn sẵn sàng hỗ trợ khách hàng 24/7, đảm bảo an tâm mọi lúc mọi nơi.</p>
            </div>
          </div>
        </div>

        <div className="aboutValues" ref={facilitiesRef} data-section="facilities">
          <div className={`sectionHeader ${facilitiesVisible ? 'visible' : ''}`}>
            <span className="sectionLabel">Cơ sở vật chất</span>
            <h2 className="valuesTitle">Không gian làm việc hiện đại</h2>
          </div>
          <div className="valuesGrid facilityGrid">
            <div className="facilityCard">
              <div className="facilityImageWrapper">
                <img src={facilityImg1} alt="Khu sửa chữa" />
                <div className="facilityOverlay"></div>
              </div>
              <div className="facilityContent">
                <h3>Khu sửa chữa tiêu chuẩn</h3>
                <p>Trang bị thiết bị nâng hạ, dụng cụ đo kiểm hiện đại, đáp ứng các hạng mục sửa chữa quan trọng.</p>
              </div>
            </div>
            <div className="facilityCard">
              <div className="facilityImageWrapper">
                <img src={facilityImg2} alt="Khu tiếp nhận khách hàng" />
                <div className="facilityOverlay"></div>
              </div>
              <div className="facilityContent">
                <h3>Khu tiếp nhận & chờ</h3>
                <p>Không gian tiếp khách thoáng, sạch và tiện nghi để bạn nghỉ ngơi trong lúc xe được chăm sóc.</p>
              </div>
            </div>
            <div className="facilityCard">
              <div className="facilityImageWrapper">
                <img src={facilityImg3} alt="Khu lốp & cân chỉnh" />
                <div className="facilityOverlay"></div>
              </div>
              <div className="facilityContent">
                <h3>Khu lốp & cân chỉnh</h3>
                <p>Máy ra vào lốp, cân bằng động và căn chỉnh góc đặt bánh giúp xe vận hành êm ái, an toàn.</p>
              </div>
            </div>
            <div className="facilityCard">
              <div className="facilityImageWrapper">
                <img src={facilityImg4} alt="Kho vật tư" />
                <div className="facilityOverlay"></div>
              </div>
              <div className="facilityContent">
                <h3>Khu kho & vật tư</h3>
                <p>Khu vực kho lốp và phụ tùng được sắp xếp gọn gàng, đảm bảo nguồn linh kiện luôn sẵn sàng.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="aboutStats" ref={statsRef} data-section="stats">
          <div className="statItem">
            <div className="statIcon">📊</div>
            <div className="statNumber">10+</div>
            <div className="statLabel">Năm kinh nghiệm</div>
          </div>
          <div className="statItem">
            <div className="statIcon">😊</div>
            <div className="statNumber">5000+</div>
            <div className="statLabel">Khách hàng hài lòng</div>
          </div>
          <div className="statItem">
            <div className="statIcon">🚑</div>
            <div className="statNumber">24/7</div>
            <div className="statLabel">Dịch vụ cứu hộ</div>
          </div>
          <div className="statItem">
            <div className="statIcon">✅</div>
            <div className="statNumber">100%</div>
            <div className="statLabel">Sản phẩm chính hãng</div>
          </div>
        </div>

        <div className="blogSection" ref={blogRef} data-section="blog">
          <div className={`sectionHeader ${blogVisible ? 'visible' : ''}`}>
            <span className="sectionLabel">Cẩm nang kiến thức</span>
            <h2 className="blogSectionTitle">Kiến thức hữu ích về lốp xe</h2>
          </div>
          
          <div className="blogList">
            {blogs.map((blog) => (
              <div key={blog.id} className="blogCard">
                <div className="blogImage">
                  <img src={blog.image} alt={blog.title} />
                </div>
                <div className="blogContent">
                  <h3 className="blogTitle">{blog.title}</h3>
                  <p className="blogExcerpt">{blog.content}</p>
                  <div className="blogMeta">
                    <span className="blogAuthor">{blog.author}</span>
                    <span className="blogDate">{blog.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {isStaff && (
            <div className="blogFormSection">
              <h3 className="blogFormTitle">Tạo bài viết mới</h3>
              <form className="blogForm" onSubmit={handleBlogSubmit}>
                <div className="blogFormGroup">
                  <label htmlFor="blogTitle">Tiêu đề blog</label>
                  <input
                    type="text"
                    id="blogTitle"
                    value={blogData.title}
                    onChange={(e) => setBlogData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Nhập tiêu đề blog..."
                    required
                  />
                </div>

                <div className="blogFormGroup">
                  <label htmlFor="blogContent">Nội dung</label>
                  <textarea
                    id="blogContent"
                    value={blogData.content}
                    onChange={(e) => setBlogData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Nhập nội dung blog..."
                    rows="6"
                    required
                  />
                </div>

                <div className="blogFormGroup">
                  <label htmlFor="mainImage">Ảnh chính *</label>
                  <div className="imageUploadWrapper">
                    <input
                      type="file"
                      id="mainImage"
                      accept="image/*"
                      onChange={handleMainImageChange}
                      required
                    />
                    {blogData.mainImage && (
                      <div className="imagePreview">
                        <img src={URL.createObjectURL(blogData.mainImage)} alt="Preview" />
                        <span>{blogData.mainImage.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="blogFormGroup">
                  <label htmlFor="additionalImages">Ảnh phụ (có thể thêm nhiều)</label>
                  <div className="imageUploadWrapper">
                    <input
                      type="file"
                      id="additionalImages"
                      accept="image/*"
                      multiple
                      onChange={handleAdditionalImagesChange}
                    />
                    {blogData.additionalImages.length > 0 && (
                      <div className="additionalImagesPreview">
                        {blogData.additionalImages.map((file, index) => (
                          <div key={index} className="additionalImageItem">
                            <img src={URL.createObjectURL(file)} alt={`Preview ${index + 1}`} />
                            <button
                              type="button"
                              onClick={() => removeAdditionalImage(index)}
                              className="removeImageBtn"
                            >
                              ×
                            </button>
                            <span>{file.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <button type="submit" className="blogSubmitBtn">Đăng blog</button>
              </form>
            </div>
          )}
        </div>

        <div className="testimonialsSection" ref={testimonialsRef} data-section="testimonials">
          <div className={`sectionHeader ${testimonialsVisible ? 'visible' : ''}`}>
            <span className="sectionLabel">Đánh giá khách hàng</span>
            <h2 className="testimonialsTitle">Khách hàng nói gì về chúng tôi</h2>
          </div>
          <div className="testimonialsGrid">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="testimonialCard">
                <div className="testimonialHeader">
                  <div className="testimonialName">{testimonial.name}</div>
                  <div className="testimonialRating">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className={i < testimonial.rating ? 'star filled' : 'star'}>
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                <p className="testimonialComment">{testimonial.comment}</p>
                <div className="testimonialDate">{testimonial.date}</div>
              </div>
            ))}
          </div>
        </div>

        {!isAuthenticated && (
          <div className="aboutCTA">
            <h2>Bạn muốn trải nghiệm dịch vụ của chúng tôi?</h2>
            <p>Hãy đặt lịch nhanh hôm nay để được phục vụ tốt nhất</p>
            <Link to="/booking" className="ctaButton">Đặt lịch nhanh</Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default About;
