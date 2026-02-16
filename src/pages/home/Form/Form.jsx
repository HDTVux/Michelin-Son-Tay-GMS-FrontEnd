import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Form.css';

export default function Form() {
    const [phone, setPhone] = useState('');
    const navigate = useNavigate();

    const handlePhoneChange = (event) => {
        const value = event.target.value;
        const numericValue = value.replace(/[^0-9]/g, '');
        setPhone(numericValue);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        const trimmedPhone = phone.trim();
        
        if (!trimmedPhone) {
            return;
        }
        
        const phoneRegex = /^[0-9]{10,11}$/;
        if (!phoneRegex.test(trimmedPhone)) {
            return;
        }
        
        const bookingState = { phone: trimmedPhone };
        navigate('/booking', { state: bookingState });
    };

    return (
        <div className="bookingWrapper">
            <div className="logoOverlay"></div>
            <div className="bookingCard">
                <div className="bookingContent">
                    <div className="formLabel">/ĐẶT LỊCH NHANH/</div>
                    <h2 className="formTitle">
                        <span className="titlePart1">Đặt lịch ngay</span>
                        <span className="titlePart2">!</span>
                    </h2>
                    <p className="formSubtitle">Nhập số điện thoại để chúng tôi liên hệ tư vấn</p>
                    <form className="bookingForm" onSubmit={handleSubmit}>
                        <input
                            type="tel"
                            name="phone"
                            value={phone}
                            onChange={handlePhoneChange}
                            placeholder="Nhập số điện thoại của bạn"
                            className="phoneInput"
                            inputMode="numeric"
                            pattern="[0-9]*"
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