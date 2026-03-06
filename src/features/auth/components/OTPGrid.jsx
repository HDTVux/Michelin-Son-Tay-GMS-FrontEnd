import React from 'react';
import defaultStyles from './CustomerLoginModal.module.css';

export default function OTPGrid({ state, ariaPrefix, error, styles: propStyles }) {
  const s = propStyles || defaultStyles;
  return (
    <div className={s.clOtpGrid}>
      {state.digits.map((digit, index) => (
        <input
          key={`${ariaPrefix}-${index}`}
          ref={(el) => { state.refs.current[index] = el; }}
          className={error ? `${s.otpInput} ${s.otpInputError}` : s.otpInput}
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => state.handleChange(e, index)}
          onKeyDown={(e) => state.handleKeyDown(e, index)}
          onPaste={(e) => state.handlePaste(e)}
          aria-label={`${ariaPrefix} digit ${index + 1}`}
        />
      ))}
    </div>
  );
}
