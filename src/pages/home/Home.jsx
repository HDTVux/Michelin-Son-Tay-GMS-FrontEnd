import { useState, useEffect, useMemo, useRef } from 'react';
import { Helmet } from 'react-helmet';
import './Home.css';
import TVC from '../../assets/Garage Car Service.mp4';
import welcomePoster from '../../assets/munganh_nen_chao_mung.jpg';
import Service from './Services/Services.jsx';
import Banner from './Banner/Banner.jsx';
import Form from './Form/Form.jsx';
import BussinessInfor from './BusinessInfo/BussinessInfor.jsx';
import Partners from './Partners/Partners.jsx';
import VehicleBrands from './VehicleBrands/VehicleBrands.jsx';
import Testimonials from './Testimonials/Testimonials.jsx';

const SITE_TITLE = 'Đại lý garage Sơn Tây - michelinsontay - Trung tâm dịch vụ lốp xe uy tín';
const SITE_DESCRIPTION =
    'Michelin Sơn Tây cung cấp lốp xe, dầu, ắc quy chính hãng, sửa chữa ô tô, cứu hộ 24/7 và chăm sóc xe chuyên nghiệp tại Sơn Tây.';

const Home = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [introVisible, setIntroVisible] = useState(false);
    const [shouldLoadIntroVideo, setShouldLoadIntroVideo] = useState(false);
    const introSectionRef = useRef(null);

    const seoUrl = useMemo(() => {
        const siteOrigin = import.meta.env.VITE_SITE_URL || window.location.origin;
        return `${siteOrigin.replace(/\/$/, '')}/`;
    }, []);

    const seoImageUrl = useMemo(() => new URL(welcomePoster, seoUrl).href, [seoUrl]);



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
        const introSection = introSectionRef.current;
        const revealIntro = () => {
            setIntroVisible(true);
            setShouldLoadIntroVideo(true);
        };

        if (!introSection || !('IntersectionObserver' in window)) {
            const fallbackTimer = window.setTimeout(revealIntro, 0);
            return () => window.clearTimeout(fallbackTimer);
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        revealIntro();
                        observer.unobserve(entry.target);
                    }
                });
            },
            { rootMargin: '240px 0px', threshold: 0.15 }
        );

        observer.observe(introSection);

        return () => observer.disconnect();
    }, []);


    const introText = [
        'Michelin Sơn Tây là địa chỉ lốp uy tín ở Sơn Tây.',
        'Là đại lý duy nhất. Chuyên cung cấp lốp dầu ắc quy chính hãng.',
        'Sửa chữa ôtô cứu hộ 24/7',
        'Sơn- Gò- Hàn.',
        'Chăm sóc làm đẹp xe từ A–Z.'
    ];



    return (
        <>
        <Helmet>
            <title>{SITE_TITLE}</title>
            <meta name="description" content={SITE_DESCRIPTION} />
            <meta
                name="keywords"
                content="Michelin Sơn Tây, garage Sơn Tây, lốp xe Sơn Tây, chăm sóc xe Sơn Tây, sửa chữa ô tô Sơn Tây, cứu hộ ô tô 24/7"
            />
            <meta name="robots" content="index, follow" />
            <link rel="canonical" href={seoUrl} />
            <link rel="preload" as="image" href={welcomePoster} />

            <meta property="og:type" content="website" />
            <meta property="og:locale" content="vi_VN" />
            <meta property="og:title" content={SITE_TITLE} />
            <meta property="og:description" content={SITE_DESCRIPTION} />
            <meta property="og:url" content={seoUrl} />
            <meta property="og:image" content={seoImageUrl} />

            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={SITE_TITLE} />
            <meta name="twitter:description" content={SITE_DESCRIPTION} />
            <meta name="twitter:image" content={seoImageUrl} />

            <script type="application/ld+json">
                {JSON.stringify({
                    '@context': 'https://schema.org',
                    '@type': 'AutoRepair',
                    name: 'Michelin Sơn Tây',
                    url: seoUrl,
                    image: seoImageUrl,
                    description: SITE_DESCRIPTION,
                    address: {
                        '@type': 'PostalAddress',
                        addressLocality: 'Sơn Tây',
                        addressRegion: 'Hà Nội',
                        addressCountry: 'VN',
                    },
                    areaServed: 'Sơn Tây, Hà Nội',
                    email: 'minhanhauto.sontay@gmail.com',
                    sameAs: ['https://web.facebook.com/profile.php?id=100067950339687'],
                    serviceType: [
                        'Lốp xe ô tô',
                        'Sửa chữa ô tô',
                        'Cứu hộ ô tô 24/7',
                        'Chăm sóc xe',
                    ],
                })}
            </script>
        </Helmet>

        <Banner/>
        
        <Service homeRows />

        {/* Phần giới thiệu về Michelin và Video */}
        <section className="introVideoSection" ref={introSectionRef}>
            <div className="introVideoContainer">
                <div className="introVideoRow">
                    <div className={`introTextCol ${introVisible ? 'visible' : ''}`}>
                        <h2 className="introWelcome">Chào mừng đến với</h2>
                        <h1 className="introTitle">
                            <span className="titlePart1">Michelin </span>
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
                        <video autoPlay loop muted playsInline poster={welcomePoster} preload="none">
                            {shouldLoadIntroVideo && <source src={TVC} type="video/mp4" />}
                        </video>
                        <div className="introVideoOverlay" />
                    </div>
                </div>
            </div>
        </section>

        <VehicleBrands/>
        <Partners/>
        {!isAuthenticated && <Form/>}
        <Testimonials/>
        <BussinessInfor/>
        </>
    );
};

export default Home;
