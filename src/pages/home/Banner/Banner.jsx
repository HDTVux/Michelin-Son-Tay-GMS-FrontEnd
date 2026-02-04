import { useState, useEffect, useRef } from 'react';
import './Banner.css';
import banner1 from '../../../assets/logo4.jpg'
import banner2 from '../../../assets/logo5.jpg'
import banner3 from '../../../assets/logo6.jpg'

export default function Banner(){
    const slides = [
        { id: 1, img: banner1 },
        { id: 2, img: banner2 },
        { id: 3, img: banner3 }
    ];

    const [index, setIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const slidesRef = useRef(null);
    const pointer = useRef({ startX: 0, deltaX: 0, dragging: false });

    useEffect(() => {
        const id = setInterval(() => {
            if (!isPaused) setIndex(i => (i + 1) % slides.length);
        }, 4000);
        return () => clearInterval(id);
    }, [isPaused, slides.length]);

    function goTo(i){ setIndex(i); }

    function onPointerDown(e){
        pointer.current.dragging = true;
        pointer.current.startX = e.clientX ?? e.touches?.[0]?.clientX;
    }
    function onPointerMove(e){
        if(!pointer.current.dragging) return;
        const x = e.clientX ?? e.touches?.[0]?.clientX;
        pointer.current.deltaX = x - pointer.current.startX;
    }
    function onPointerUp(){
        pointer.current.dragging = false;
        const dx = pointer.current.deltaX;
        if (Math.abs(dx) > 50){
            if (dx < 0) setIndex(i => (i + 1) % slides.length);
            else setIndex(i => (i - 1 + slides.length) % slides.length);
        }
        pointer.current.deltaX = 0;
    }

    return (
        <section className="banner">
            <div className="banner-inner">
                <h1 className="banner-title">Chào mừng đến với Michelin Sơn Tây</h1>
                <p className="banner-sub">Trung tâm dịch vụ lốp xe hàng đầu, cam kết mang đến chất lượng và sự an toàn.</p>

                <div className="banner-carousel"
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                >
                    <div
                        className="slides"
                        ref={slidesRef}
                        style={{ transform: `translateX(-${index * 100}%)` }}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerCancel={onPointerUp}
                    >
                        {slides.map((s) => (
                        <div className="slide" key={s.id}>
                            <img src={s.img} alt={`Banner slide ${s.id}`} className="slide-image" />
                        </div>
                        ))} 
                    </div>

                    <div className="banner-dots" role="tablist" aria-label="carousel dots">
                        {slides.map((s, i) => (
                            <button
                                key={s.id}
                                className={"dot-btn " + (i === index ? 'active' : '')}
                                onClick={() => goTo(i)}
                                aria-label={`Go to slide ${i+1}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}