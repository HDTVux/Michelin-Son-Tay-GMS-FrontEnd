import { useState } from 'react';
import './Form.css';

export default function Form() {
    const [phone, setPhone] = useState('');

    const handleSubmit = (event) => {
        event.preventDefault();
        alert('Sẽ chuyển sang trang đặt lịch.');
    };

    return (
        <div className="bookingWrapper">
            <div className="bookingCard">
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
    );
}