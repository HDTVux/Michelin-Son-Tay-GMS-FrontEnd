import { useState, useEffect, useRef } from 'react';
import './Banner.css';
import bannerTet1 from '../../../assets/Banner Tet 2.png'
import bannerTet2 from '../../../assets/Banner Tet 1.png'
import banner1 from '../../../assets/1.jpg'

export default function Banner(){
    const slides = [
        { 
            id: 1, 
            img: bannerTet1, 
            title: 'Hiệu suất bền bỉ, an toàn tối đa', 
            subtitle: 'MICHELIN' 
        },
        { 
            id: 2, 
            img: bannerTet2, 
            title: 'CHINH PHỤC MỌI ĐỊA HÌNH', 
            subtitle: 'MICHELIN' 
        },
        { 
            id: 3, 
            img: banner1, 
            title: 'ÊM ÁI VÀ AN TOÀN TRÊN MỌI CUNG ĐƯỜNG ƯỚT', 
            subtitle: 'MICHELIN' 
        }
    ];//
    

    const [index, setIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [textVisible, setTextVisible] = useState(true);
    const slidesRef = useRef(null);
    const bannerRef = useRef(null);
    const pointer = useRef({ startX: 0, deltaX: 0, dragging: false });

    useEffect(() => {
        const id = setInterval(() => {
            if (!isPaused) {
                setTextVisible(false);
                setTimeout(() => {
                    setIndex(i => (i + 1) % slides.length);
                    setTextVisible(true);
                }, 300);
            }
        }, 4000);
        return () => clearInterval(id);
    }, [isPaused, slides.length]);

    // Reset text animation when index changes
    useEffect(() => {
        setTextVisible(false);
        const timer = setTimeout(() => setTextVisible(true), 100);
        return () => clearTimeout(timer);
    }, [index]);

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
        <section className="banner" ref={bannerRef}>
            <div className="banner-inner">
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
                        onTouchStart={onPointerDown}
                        onTouchMove={onPointerMove}
                        onTouchEnd={onPointerUp}
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