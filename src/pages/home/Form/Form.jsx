import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Form.css';

export default function Form() {
    const [phone, setPhone] = useState('');
    const [animatedText, setAnimatedText] = useState('Đặt lịch');
    const navigate = useNavigate();

    useEffect(() => {
        const texts = ['Đặt lịch', 'Đặt lịch ngay'];
        let currentIndex = 0;
        const interval = setInterval(() => {
            currentIndex = (currentIndex + 1) % texts.length;
            setAnimatedText(texts[currentIndex]);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const handleSubmit = (event) => {
        event.preventDefault();
        const trimmedPhone = phone.trim();
        const bookingState = trimmedPhone ? { phone: trimmedPhone } : {};
        navigate('/booking', { state: bookingState });
    };

    return (
        <div className="bookingWrapper">
            <div className="logoOverlay"></div>
            <div className="bookingCard">
                <div className="bookingContent">
                    <div className="formLabel">/ĐẶT LỊCH NHANH/</div>
                    <h2 className="formTitle">
                        <span className="titlePart1 animated-text">{animatedText}</span>
                        <span className="titlePart2">!</span>
                    </h2>
                    <p className="formSubtitle">Nhập số điện thoại để chúng tôi liên hệ tư vấn</p>
                    <form className="bookingForm" onSubmit={handleSubmit}>
                        <input
                            type="tel"
                            name="phone"
                            value={phone}
                            onChange={(event) => setPhone(event.target.value)}
                            placeholder="Nhập số điện thoại của bạn"
                            className="phoneInput"
                        />
                        <div className="actionRow">
                            <button type="submit" className="primaryButton">
                                Đặt ngay
                            </button>
                            <button
                                type="button"
                                className="secondaryButton"
                                onClick={() => window.open('tel:0935464515')}
                            >
                                Gọi ngay
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}