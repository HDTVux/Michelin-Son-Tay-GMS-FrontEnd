import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Form.css';
import bookingImage from '../../../assets/anh_dat_lich_ngay.jpg';

export default function Form() {
    const [phone, setPhone] = useState('');
    const navigate = useNavigate();

    const handleSubmit = (event) => {
        event.preventDefault();
        const trimmedPhone = phone.trim();
        if (!trimmedPhone) return;

        navigate('/booking', { state: { phone: trimmedPhone } });
    };

    return (
        <div className="bookingWrapper">
            <div className="bookingCard">
                <div className="bookingImageContainer">
                    <img 
                        src={bookingImage} 
                        alt="Đặt lịch dịch vụ" 
                        className="bookingImage"
                    />
                    <div className="bookingImageOverlay"></div>
                </div>
                <div className="bookingContent">
                    <h2>Đặt lịch nhanh</h2>
                    <p>Nhập số điện thoại để chúng tôi liên hệ tư vấn</p>
                    <form className="bookingForm" onSubmit={handleSubmit}>
                        <input
                            type="tel"
                            name="phone"
                            value={phone}
                            onChange={(event) => setPhone(event.target.value)}
                            placeholder="Nhập số điện thoại của bạn"
                            required
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