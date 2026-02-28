import { useState, useEffect } from 'react';
import './Home.css';
import TVC from '../../assets/video 1.mp4';
import Service from './Services/Services.jsx';
import Banner from './Banner/Banner.jsx';
import Form from './Form/Form.jsx';
import BussinessInfor from './BusinessInfo/BussinessInfor.jsx';
import Partners from './Partners/Partners.jsx';

const Home = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [introVisible, setIntroVisible] = useState(false);



    const checkAuthStatus = () => {
        const token = localStorage.getItem('customerToken');
        setIsAuthenticated(!!token);
    };

    useEffect(() => {
        const t = setTimeout(() => checkAuthStatus(), 0);
        
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
            clearTimeout(t);
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


    const introText = [
        'Michelin sơn tây là địa chỉ lốp uy tín ở sơn tây.',
        'Là đại lý duy nhất. Chuyên cung cấp lốp dầu ắc quy chính hãng.',
        'Sửa chữa ôtô cứu hộ 24/7',
        'Sơn- Gò- Hàn.',
        'Chăm sóc làm đẹp xe từ A–Z.'
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