import { useState, useEffect } from 'react';
import './Home.css';
import TVC from '../../assets/video 1.mp4';
import processImg from '../../assets/{CCEDBCC3-2144-40E6-B397-8E9D2FA15587}.png';
import Service from './Services/Services.jsx';
import Banner from './Banner/Banner.jsx';
import Form from './Form/Form.jsx';
import BussinessInfor from './BusinessInfo/BussinessInfor.jsx';
import Partners from './Partners/Partners.jsx';

const Home = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [introVisible, setIntroVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
        checkAuthStatus();
        
        const handleStorageChange = (e) => {
            if (e.key === 'customerToken' || !e.key) {
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
                        setIntroVisible(true);
                    }
                });
            },
            { threshold: 0.2 }
        );

        const introSection = document.querySelector('.introVideoSection');
        if (introSection) {
            observer.observe(introSection);
        }

        return () => {
            if (introSection) {
                observer.unobserve(introSection);
            }
        };
    }, []);

    const checkAuthStatus = () => {
        const token = localStorage.getItem('customerToken');
        setIsAuthenticated(!!token);
    };

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
        
        {/* Phần giới thiệu về Michelin và Video */}
        <section className="introVideoSection">
            <div className="introVideoContainer">
                <div className="introVideoRow">
                    <div className={`introTextCol ${introVisible ? 'visible' : ''}`}>
                        <h2 className="introWelcome">Chào mừng đến với</h2>
                        <h1 className="introTitle">
                            <span className="titlePart1">Michellin</span>
                            <span className="titlePart2">Sơn Tây</span>
                        </h1>
                        <div className="introTextList">
                            {introText.map((text, idx) => (
                                <div key={idx} className="introTextItemWrapper">
                                    <div className="introTextIcon">✓</div>
                                    <p className="introTextItem">{text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="introVideoMedia">
                        <video autoPlay loop muted playsInline>
                            <source src={TVC} type="video/mp4" />
                        </video>
                        <div className="introVideoOverlay" />
                    </div>
                </div>
            </div>
        </section>

        {!isAuthenticated && <Form/>}
        
        <Service/>
        <Partners/>
        <BussinessInfor/>
        </>
    );
};

export default Home;