import { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import './Home.css';
import welcomePoster from '../../assets/munganh_nen_chao_mung.jpg';
import Service from './Services/Services.jsx';
import Banner from './Banner/Banner.jsx';
import Form from './Form/Form.jsx';
import BussinessInfor from './BusinessInfo/BussinessInfor.jsx';
import Partners from './Partners/Partners.jsx';

const SITE_TITLE = 'Đại lý garage Sơn Tây - michelinsontay - Trung tâm dịch vụ lốp xe uy tín';
const SITE_DESCRIPTION =
    'Michelin Sơn Tây cung cấp lốp xe, dầu, ắc quy chính hãng, sửa chữa ô tô, cứu hộ 24/7 và chăm sóc xe chuyên nghiệp tại Sơn Tây.';

const Home = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

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

        <Partners/>
        {!isAuthenticated && <Form/>}
        <BussinessInfor/>
        </>
    );
};

export default Home;
