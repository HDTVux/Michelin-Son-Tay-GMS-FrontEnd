import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import './Home.css';
import TVC from '../../assets/tvc.mp4'
import Service from '../Services/Services.jsx';

const Home = () => {
    const [isVisible, setIsVisible] = useState(false);
    const { t } = useLanguage();

    useEffect(() => {
        setIsVisible(true);
    }, []);

    const services = [
        {  text: t('home.services.0') },
        {  text: t('home.services.1') },
        { text: t('home.services.2') },
        {  text: t('home.services.3') },
        {  text: t('home.services.4') }
    ];

    return (
        <>
        <section className="homePage">
            <div className={`homeContainer ${isVisible ? 'fadeIn' : ''}`}>
                <h1 className="homeTitle">
                    {t('home.title')}
                    <span>{t('home.subtitle')}</span>
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
                    <Link to="/register" className="btnPrimary">{t('home.bookNow')}</Link>
                    <Link to="/services" className="btnSecondary">{t('home.viewServices')}</Link>
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
        </>
    );
};

export default Home;