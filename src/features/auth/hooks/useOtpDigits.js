import { useRef, useState } from 'react';

export function useOtpDigits(length = 6) {
  const [digits, setDigits] = useState(Array(length).fill(''));
  const refs = useRef([]);

  // Helper để lấy OTP đầy đủ từ mảng
  const joinDigits = () => digits.join('');
  // Reset toàn bộ ô về rỗng
  const resetDigits = () => setDigits(Array(length).fill(''));

  // Nhập từng ô: giữ 1 ký tự số và tự động focus ô tiếp theo
  const handleChange = (event, index) => {
    const value = event.target.value.replace(/\D/g, '').slice(-1);
    const updated = [...digits];
    updated[index] = value;
    setDigits(updated);
    if (value && index < updated.length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  // Backspace trên ô trống sẽ focus về ô trước
  const handleKeyDown = (event, index) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  // Dán nhiều số cùng lúc: chỉ nhận số, cắt theo length và focus ô cuối cùng đã dán
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
