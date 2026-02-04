import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';
import TVC from '../../assets/tvc.mp4';
import processImg from '../../assets/{CCEDBCC3-2144-40E6-B397-8E9D2FA15587}.png';
import Service from './Services/Services.jsx';
import Banner from './Banner/Banner.jsx';
import Form from './Form/Form.jsx';
import BussinessInfor from './BusinessInfo/BussinessInfor.jsx';

const Home = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    // Hiển thị dạng 2 dòng: dòng 1 nổi bật + dòng 2 mô tả ngắn, rút gọn cho mobile
    const services = [
        { title: 'Michelin Sơn Tây', sub: 'Địa chỉ lốp uy tín tại Sơn Tây.', icon: '📍' },
        { title: 'Đại lý duy nhất', sub: 'Lốp, dầu, ắc quy chính hãng.', icon: '🏬' },
        { title: 'Cứu hộ 24/7', sub: 'Hỗ trợ cứu hộ mọi lúc.', icon: '🚑' },
        { title: 'Sơn – Gò – Hàn', sub: 'Sửa va quệt nhanh, thẩm mỹ.', icon: '🛠️' },
        { title: 'Chăm sóc xe A–Z', sub: 'Vệ sinh, làm đẹp, bảo dưỡng.', icon: '✨' }
    ];

    // Đoạn giới thiệu ngắn gọn, dễ đọc trên mobile
    const introText = [
        'Michelin Sơn Tây là trung tâm dịch vụ lốp và chăm sóc xe tại Sơn Tây, tập trung vào an toàn và độ bền cho từng hành trình.',
        'Chúng tôi cung cấp lốp chính hãng, dịch vụ lắp đặt – cân chỉnh – bảo dưỡng chuyên nghiệp với đội ngũ kỹ thuật viên được đào tạo bài bản.'
    ];

    const processSteps = [
        {
            no: 1,
            title: 'Tiếp nhận yêu cầu khách hàng',
            desc: 'Ghi nhận thông tin, nhu cầu và mong muốn của khách trước khi thao tác trên xe.'
        },
        {
            no: 2,
            title: 'Đưa xe vào khoang dịch vụ',
            desc: 'Hướng dẫn đưa xe vào đúng vị trí, đảm bảo an toàn cho người và phương tiện.'
        },
        {
            no: 3,
            title: 'Kiểm tra an toàn xe',
            desc: 'Kiểm tra sơ bộ các hạng mục an toàn chính trước khi tiến hành công việc.'
        },
        {
            no: 4,
            title: 'Thực hiện dịch vụ',
            desc: 'Thực hiện bảo dưỡng, sửa chữa theo quy trình và tiêu chuẩn kỹ thuật.'
        },
        {
            no: 5,
            title: 'Kiểm tra chất lượng',
            desc: 'Rà soát lại kết quả công việc, đảm bảo xe hoạt động ổn định sau dịch vụ.'
        },
        {
            no: 6,
            title: 'Chuẩn bị bàn giao xe',
            desc: 'Vệ sinh, sắp xếp và hoàn thiện các thủ tục cần thiết trước khi giao xe.'
        },
        {
            no: 7,
            title: 'Bàn giao xe',
            desc: 'Giải thích hạng mục đã thực hiện, bàn giao xe và hướng dẫn sử dụng an toàn.'
        }
    ];

    return (
        <>
        <Banner/>
        <section className="homeBookingIntro">
            <h2 className="homeBookingTitle">Đặt lịch dịch vụ</h2>
            <p className="homeBookingSub">
                Nhập số điện thoại để chúng tôi hỗ trợ sắp xếp lịch hẹn phù hợp cho bạn.
            </p>
        </section>
        <Form/>
        <section className="homePage">
            <div className={`homeTop ${isVisible ? 'fadeIn' : ''}`}>
                <h1 className="homeTitle">
                    Giới thiệu về
                    <span>Michellin Sơn Tây</span>
                </h1>

                {/* Intro bên trái - Video bên phải */}
                <div className={`videoRow ${isVisible ? 'slideIn' : ''}`}>
                    <div className="videoTextCard" aria-label="Giới thiệu Michelin Sơn Tây">
                        {introText.map((t, i) => (
                            <p key={i} className="videoText">{t}</p>
                        ))}
                    </div>

                    <div className="videoMedia">
                        <div className="videoOverlay"></div>
                        <video autoPlay muted loop playsInline>
                            <source src={TVC} type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    </div>
                </div>

                {/* 5 ô nằm ngang bên dưới video */}
                <div className="homeContent belowVideo">
                    {services.map((service, index) => (
                        <div 
                            key={index}
                            className="serviceItem fadeInUp" 
                            style={{ animationDelay: `${(index + 1) * 0.08}s` }}
                        >
                            <div className="serviceText">
                                <span className="serviceIconCircle" aria-hidden="true">{service.icon}</span>
                                <div className="serviceTextTitle">{service.title}</div>
                                <div className="serviceTextSub">{service.sub}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* Quy trình dịch vụ (đặt giữa phần giới thiệu và phần Dịch vụ của chúng tôi) */}
        <section className="processSection">
            <div className="processInner">
                <div className="processHeader">
                    <h2 className="processTitle">Quy trình dịch vụ</h2>
                    <p className="processSub">7 bước rõ ràng, minh bạch – giúp bạn yên tâm trong suốt quá trình</p>
                </div>

                <div className="processDiagram">
                    <div className="processImageWrapper">
                        <img className="processImageCenter" src={processImg} alt="Quy trình dịch vụ Michelin Sơn Tây" />
                    </div>

                    {processSteps.map((s) => (
                        <div
                            key={s.no}
                            className={`processStepBubble step-${s.no}`}
                        >
                            <div className="processNo">{s.no}</div>
                            <div className="processText">
                                <div className="processStepTitle">{s.title}</div>
                                <div className="processStepDesc">{s.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        <Service/>
        <BussinessInfor/>
        </>
    );
};

export default Home;