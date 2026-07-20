import React from 'react';
import './BottomContactBar.css';

const BottomContactBar = () => {
  return (
    <div className="bottomContactBar">
      <a href="tel:0987545680" className="contactBarBtn rescueBtn" aria-label="Gọi cứu hộ 24/7">
        <svg className="contactBarIcon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
        <span className="contactBarText">Gọi Cứu Hộ 24/7</span>
      </a>
      <a href="https://zalo.me/thietbilop" target="_blank" rel="noopener noreferrer" className="contactBarBtn zaloBtn" aria-label="Chat Zalo">
        <svg className="contactBarIcon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span className="contactBarText">Chat Zalo</span>
      </a>
    </div>
  );
};

export default BottomContactBar;
