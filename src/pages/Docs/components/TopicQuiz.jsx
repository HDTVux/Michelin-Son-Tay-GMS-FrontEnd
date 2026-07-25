import React, { useState } from 'react';
import { HelpCircle, CheckCircle2, XCircle, Award } from 'lucide-react';

export default function TopicQuiz({ quiz, onPass }) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  if (!quiz) return null;

  const handleSubmit = () => {
    if (selectedIndex === null) return;
    const correct = selectedIndex === quiz.correctIndex;
    setIsCorrect(correct);
    setSubmitted(true);
    if (correct && onPass) {
      onPass(100);
    }
  };

  const handleRetry = () => {
    setSelectedIndex(null);
    setSubmitted(false);
    setIsCorrect(false);
  };

  return (
    <div style={{
      background: 'rgba(30, 41, 59, 0.6)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      padding: '20px',
      marginTop: '24px',
      marginBottom: '24px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#facc15', fontWeight: 700, marginBottom: '12px' }}>
        <HelpCircle size={18} />
        <span>Bài kiểm tra thực hành tiếp thu</span>
      </div>

      <p style={{ color: '#f8fafc', fontSize: '0.95rem', fontWeight: 600, marginBottom: '16px' }}>
        {quiz.question}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        {quiz.options.map((opt, idx) => {
          let btnStyle = {
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            background: selectedIndex === idx ? 'rgba(59, 130, 246, 0.2)' : 'rgba(15, 23, 42, 0.6)',
            color: selectedIndex === idx ? '#60a5fa' : '#cbd5e1',
            textAlign: 'left',
            cursor: submitted ? 'default' : 'pointer',
            fontSize: '0.875rem',
            transition: 'all 0.15s ease'
          };

          if (submitted) {
            if (idx === quiz.correctIndex) {
              btnStyle.background = 'rgba(34, 197, 94, 0.2)';
              btnStyle.borderColor = '#22c55e';
              btnStyle.color = '#4ade80';
            } else if (selectedIndex === idx) {
              btnStyle.background = 'rgba(239, 68, 68, 0.2)';
              btnStyle.borderColor = '#ef4444';
              btnStyle.color = '#f87171';
            }
          }

          return (
            <button
              key={idx}
              type="button"
              style={btnStyle}
              onClick={() => !submitted && setSelectedIndex(idx)}
            >
              {String.fromCharCode(65 + idx)}. {opt}
            </button>
          );
        })}
      </div>

      {!submitted ? (
        <button
          type="button"
          disabled={selectedIndex === null}
          onClick={handleSubmit}
          style={{
            padding: '8px 20px',
            background: selectedIndex !== null ? '#2563eb' : '#475569',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: selectedIndex !== null ? 'pointer' : 'not-allowed'
          }}
        >
          Nộp bài trả lời
        </button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isCorrect ? (
              <>
                <Award size={20} color="#4ade80" />
                <span style={{ color: '#4ade80', fontWeight: 700 }}>Chính xác! Bạn đạt 100 điểm & đã hoàn thành bài học này.</span>
              </>
            ) : (
              <>
                <XCircle size={20} color="#f87171" />
                <span style={{ color: '#f87171', fontWeight: 700 }}>Chưa đúng. Hãy thử lại để ghi nhận điểm!</span>
              </>
            )}
          </div>
          {!isCorrect && (
            <button
              type="button"
              onClick={handleRetry}
              style={{ padding: '6px 12px', background: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Thử lại
            </button>
          )}
        </div>
      )}
    </div>
  );
}
