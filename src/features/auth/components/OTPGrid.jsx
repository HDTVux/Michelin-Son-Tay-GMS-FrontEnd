import React from 'react';

export default function OTPGrid({ state, ariaPrefix, error, className }) {
  return (
    <div className={className || 'clOtpGrid'}>
      {state.digits.map((digit, index) => (
        <input
          key={`${ariaPrefix}-${index}`}
          ref={(el) => { state.refs.current[index] = el; }}
          className={error ? 'input error' : 'input'}
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
