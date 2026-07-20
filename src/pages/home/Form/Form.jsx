import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, ArrowRight } from 'lucide-react';
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
        <div className="compactBookingSection">
            <div className="compactBookingCard">
                <h2 className="compactBookingTitle">Đặt lịch ngay</h2>
                <p className="compactBookingSub">Nhập số điện thoại để nhận tư vấn lịch hẹn phù hợp nhất từ Michelin Sơn Tây:</p>
                <form className="compactBookingForm" onSubmit={handleSubmit}>
                    <div className="compactInputGroup">
                        <span className="compactInputIcon">
                            <Phone size={16} />
                        </span>
                        <input
                            type="tel"
                            name="phone"
                            value={phone}
                            onChange={handlePhoneChange}
                            placeholder="Nhập số điện thoại của bạn..."
                            className="compactPhoneInput"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            required
                        />
                        <button type="submit" className="compactSubmitBtn" aria-label="Gửi số điện thoại">
                            <ArrowRight size={18} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
