import { useRef, useState } from 'react';

export function useOtpDigits(length = 6) {
  const [digits, setDigits] = useState(Array(length).fill(''));
  const refs = useRef([]);

  const joinDigits = () => digits.join('');
  const resetDigits = () => setDigits(Array(length).fill(''));

  const handleChange = (event, index) => {
    const value = event.target.value.replace(/\D/g, '').slice(-1);
    const updated = [...digits];
    updated[index] = value;
    setDigits(updated);
    if (value && index < updated.length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (event, index) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length).split('');
    const filled = Array(length).fill('');
    for (let i = 0; i < pasted.length; i++) {
      filled[i] = pasted[i];
    }
    setDigits(filled);
    const focusIndex = Math.min(pasted.length, length) - 1;
    if (focusIndex >= 0) {
      refs.current[focusIndex]?.focus();
    }
  };

  return {
    digits,
    refs,
    setDigits,
    joinDigits,
    resetDigits,
    handleChange,
    handleKeyDown,
    handlePaste,
  };
}
