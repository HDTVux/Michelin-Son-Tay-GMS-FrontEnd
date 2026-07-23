import React, { useState, useEffect } from 'react';
import { sliderService } from '../../services/sliderService';
import './DynamicBanner.css';

export default function DynamicBanner({ locationCode, variant = 'inline' }) {
    const [slides, setSlides] = useState([]);
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (!locationCode) return;

        const fetchDynamicSlides = async () => {
            try {
                const data = await sliderService.getSliderByLocation(locationCode);
                if (data && data.items && data.items.length > 0) {
                    const activeAndSortedItems = data.items
                        .filter(item => item.isActive !== false)
                        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

                    if (activeAndSortedItems.length > 0) {
                        const mappedSlides = activeAndSortedItems.map(item => ({
                            id: item.id,
                            img: item.imageUrl,
                            title: item.title || item.subtitle || '',
                            link: item.targetUrl
                        }));
                        setSlides(mappedSlides);
                        return;
                    }
                }
                setSlides([]); // No active slides
            } catch (error) {
                console.error(`Failed to fetch dynamic slider for ${locationCode}`, error);
                setSlides([]);
            }
        };
        fetchDynamicSlides();
    }, [locationCode]);

    useEffect(() => {
        if (slides.length <= 1) return;
        
        const id = setInterval(() => {
            setIndex(i => (i + 1) % slides.length);
        }, 5000);
        return () => clearInterval(id);
    }, [slides.length]);

    if (!slides || slides.length === 0) {
        return null;
    }

    return (
        <div className={`dynamic-banner-container variant-${variant}`}>
            <div 
                className="dynamic-banner-track"
                style={{ transform: `translateX(-${index * 100}%)` }}
            >
                {slides.map((s, idx) => (
                    <div key={s.id || idx} className="dynamic-banner-slide">
                        {s.link ? (
                            <a href={s.link} target="_blank" rel="noopener noreferrer" className="dynamic-banner-link">
                                <img src={s.img} alt={s.title || 'Banner'} className="dynamic-banner-image" draggable={false} />
                            </a>
                        ) : (
                            <img src={s.img} alt={s.title || 'Banner'} className="dynamic-banner-image" draggable={false} />
                        )}
                    </div>
                ))}
            </div>

            {slides.length > 1 && (
                <div className="dynamic-banner-dots">
                    {slides.map((_, idx) => (
                        <button
                            key={idx}
                            className={`dynamic-banner-dot ${idx === index ? 'active' : ''}`}
                            onClick={() => setIndex(idx)}
                            aria-label={`Go to slide ${idx + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
