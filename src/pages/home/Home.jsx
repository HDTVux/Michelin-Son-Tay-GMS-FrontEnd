import { useState, useEffect } from 'react';
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

    const introText = [
        'Michelin sơn tây là địa chỉ lốp uy tín ở sơn tây.',
        'Là đại lý duy nhất. Chuyên cung cấp lốp dầu ắc quy chính hãng.',
        'Sửa chữa ôtô cứu hộ 24/7',
        'Sơn- Gò- Hàn.',
        'Chăm sóc làm đẹp xe từ A–Z.'
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
        <Form/>
        <section className="homePage">
            <div className={`homeTop ${isVisible ? 'fadeIn' : ''}`}>


                {/* Intro bên trái - Video bên phải */}
                <div className={`videoRow ${isVisible ? 'slideIn' : ''}`}>
                    <div className="videoTextCard" aria-label="Giới thiệu Michelin Sơn Tây">
                    <h1 className="homeTitle">
                    Giới thiệu về <span>Michelin Sơn Tây</span>
                </h1>
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
            </div>
        </section>

        <Service/>
        <BussinessInfor/>
        </>
    );
};

export default Home;