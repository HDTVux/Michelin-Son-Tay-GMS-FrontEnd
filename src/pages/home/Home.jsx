import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';
import TVC from '../../assets/tvc.mp4';
import Service from './Services/Services.jsx';
import Banner from './Banner/Banner.jsx';
import Form from './Form/Form.jsx';
import BussinessInfor from './BusinessInfo/BussinessInfor.jsx';

const Home = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    const services = [
        { text: 'Michelin sơn tây là địa chỉ lốp uy tín ở sơn tây.' },
        { text: 'Là đại lý duy nhất. Chuyên cung cấp lốp dầu ắc quy chính hãng.' },
        { text: 'Sửa chữa ôtô cứu hộ 24/7' },
        { text: 'Sơn- Gò- Hàn.' },
        { text: 'Chăm sóc làm đẹp xe từ A-Z.' }
    ];

    return (
        <>
        <Banner/>
        <Form/>
        <section className="homePage">
            <div className={`homeContainer ${isVisible ? 'fadeIn' : ''}`}>
                <h1 className="homeTitle">
                    Giới thiệu về
                    <span>Michellin Sơn Tây</span>
                </h1>
                <div className='homeContent'>
                    {services.map((service, index) => (
                        <div 
                            key={index}
                            className="serviceItem fadeInUp" 
                            style={{ animationDelay: `${(index + 1) * 0.1}s` }}
                        >

                            <p className="serviceText">{service.text}</p>
                        </div>
                    ))}
                </div>
                <div className="homeActions fadeInUp" style={{ animationDelay: '0.6s' }}>
                    <Link to="/register" className="btnPrimary">Đặt lịch ngay</Link>
                    <Link to="/services" className="btnSecondary">Xem dịch vụ</Link>
                </div>
            </div>
            <div className={`videocontainer ${isVisible ? 'slideIn' : ''}`}>
                <div className="videoOverlay"></div>
                <video autoPlay muted loop playsInline>
                    <source src={TVC} type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
                
            </div>           
        </section>
        <Service/>
        <Service/>
        <BussinessInfor/>
        </>
    );
};

export default Home;