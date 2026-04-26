import { useState } from 'react';
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
                    <div className="bookingAccent" aria-hidden="true"></div>
                    <div className="formLabel">Đặt lịch nhanh</div>
                    <h2 className="formTitle">
                        <span className="titlePart1">Đặt lịch ngay</span>
                        <span className="titlePart2">!</span>
                    </h2>
                    <p className="formSubtitle">Nhập số điện thoại để đội ngũ Michelin Sơn Tây liên hệ tư vấn lịch phù hợp.</p>
                    <div className="bookingHighlights" aria-label="Lợi ích đặt lịch nhanh">
                        <span>Phản hồi nhanh</span>
                        <span>Ưu tiên lịch trống</span>
                    </div>
                    <form className="bookingForm" onSubmit={handleSubmit}>
                        <label className="phoneField">
                            <span className="phoneFieldIcon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" focusable="false">
                                    <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.8-.4 1.2-.3 1.3.4 2.7.6 4.1.6.7 0 1.3.6 1.3 1.3v3.5c0 .7-.6 1.3-1.3 1.3C10.4 21.6 2.4 13.6 2.4 3.3 2.4 2.6 3 2 3.7 2h3.5c.7 0 1.3.6 1.3 1.3 0 1.4.2 2.8.6 4.1.1.4 0 .9-.3 1.2l-2.2 2.2Z" />
                                </svg>
                            </span>
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
                        </label>
                        <div className="actionRow">
                            <button type="submit" className="primaryButton">
                                <span>Đặt ngay</span>
                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                    <path d="M5 12h13m-5-5 5 5-5 5" />
                                </svg>
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
