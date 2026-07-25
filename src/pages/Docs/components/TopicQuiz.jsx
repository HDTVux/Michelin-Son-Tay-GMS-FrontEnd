import React, { useState, useEffect } from 'react';
import { HelpCircle, CheckCircle2, XCircle, Award, ArrowRight, RotateCcw } from 'lucide-react';

export default function TopicQuiz({ quiz, onPass }) {
  // Normalize quiz to always have an array of 3 questions
  const questions = React.useMemo(() => {
    if (!quiz) return [];

    if (Array.isArray(quiz.questions) && quiz.questions.length > 0) {
      return quiz.questions;
    }

    if (quiz.question && quiz.options) {
      // Return single quiz expanded with 2 additional reinforcing questions
      return [
        {
          question: `[Câu 1/3] ${quiz.question}`,
          options: quiz.options,
          correctIndex: quiz.correctIndex
        },
        {
          question: `[Câu 2/3] Trong quy trình làm việc chuẩn Michelin GMS, hành động nào đảm bảo tính minh bạch nhất?`,
          options: [
            "Lập báo giá và xin phê duyệt từ khách trước khi thợ sửa chữa",
            "Tự ý thay thế phụ tùng không báo trước",
            "Sửa xong mới thông báo giá cho khách",
            "Không lưu phiếu dịch vụ vào hệ thống"
          ],
          correctIndex: 0
        },
        {
          question: `[Câu 3/3] Mục đích chính của việc ghi nhận tiến độ học tập trên hệ thống Docs là gì?`,
          options: [
            "Giúp Quản lý đánh giá năng lực nghiệp vụ & hỗ trợ nhân viên nâng cao tay nghề",
            "Xóa tài khoản nhân viên",
            "Chỉ để trang trí giao diện",
            "Không có tác dụng gì"
          ],
          correctIndex: 0
        }
      ];
    }

    return [];
  }, [quiz]);

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  // Reset quiz state when quiz object changes
  useEffect(() => {
    setCurrentStep(0);
    setAnswers({});
    setSubmitted(false);
    setScore(0);
  }, [quiz]);

  if (!questions || questions.length === 0) return null;

  const currentQ = questions[currentStep];
  const totalQuestions = questions.length;
  const isLastQuestion = currentStep === totalQuestions - 1;

  const handleSelectOption = (optIdx) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [currentStep]: optIdx }));
  };

  const handleSubmitAll = () => {
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (answers[idx] === q.correctIndex) {
        correctCount++;
      }
    });

    const calculatedScore = Math.round((correctCount / totalQuestions) * 100);
    setScore(calculatedScore);
    setSubmitted(true);

    if (calculatedScore >= 60 && onPass) {
      onPass(calculatedScore);
    }
  };

  const handleRetry = () => {
    setCurrentStep(0);
    setAnswers({});
    setSubmitted(false);
    setScore(0);
  };

  return (
    <div style={{
      background: 'rgba(30, 41, 59, 0.65)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '12px',
      padding: '24px',
      marginTop: '24px',
      marginBottom: '24px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#facc15', fontWeight: 700, fontSize: '1rem' }}>
          <HelpCircle size={18} />
          <span>Bộ 3 Bài Kiểm Tra Thực Hành Tiếp Thu</span>
        </div>
        <span style={{ fontSize: '0.8rem', padding: '3px 10px', borderRadius: '12px', background: 'rgba(250, 204, 21, 0.15)', color: '#facc15', fontWeight: 700 }}>
          {submitted ? `Điểm đạt: ${score}%` : `Câu ${currentStep + 1} / ${totalQuestions}`}
        </span>
      </div>

      {/* Progress Bar */}
      <div style={{ width: '100%', height: '6px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '3px', marginBottom: '20px', overflow: 'hidden' }}>
        <div 
          style={{ 
            height: '100%', 
            width: `${((currentStep + 1) / totalQuestions) * 100}%`, 
            background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
            transition: 'width 0.3s ease'
          }} 
        />
      </div>

      {/* Active Question Title */}
      {!submitted ? (
        <div>
          <p style={{ color: '#f8fafc', fontSize: '0.975rem', fontWeight: 700, marginBottom: '16px', lineHeight: 1.5 }}>
            {currentQ.question}
          </p>

          {/* Options Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {currentQ.options.map((opt, idx) => {
              const isSelected = answers[currentStep] === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectOption(idx)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: isSelected ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.12)',
                    background: isSelected ? 'rgba(37, 99, 235, 0.25)' : 'rgba(15, 23, 42, 0.6)',
                    color: isSelected ? '#60a5fa' : '#cbd5e1',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: isSelected ? 700 : 400,
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>{String.fromCharCode(65 + idx)}. {opt}</span>
                  {isSelected && <CheckCircle2 size={16} color="#60a5fa" />}
                </button>
              );
            })}
          </div>

          {/* Stepper Navigation Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              disabled={currentStep === 0}
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              style={{ padding: '8px 16px', background: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: currentStep > 0 ? 'pointer' : 'not-allowed', fontSize: '0.85rem' }}
            >
              ◄ Câu trước
            </button>

            {!isLastQuestion ? (
              <button
                type="button"
                disabled={answers[currentStep] === undefined}
                onClick={() => setCurrentStep(prev => Math.min(totalQuestions - 1, prev + 1))}
                style={{
                  padding: '8px 20px',
                  background: answers[currentStep] !== undefined ? '#2563eb' : '#475569',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: answers[currentStep] !== undefined ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>Câu tiếp theo</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                disabled={Object.keys(answers).length < totalQuestions}
                onClick={handleSubmitAll}
                style={{
                  padding: '10px 24px',
                  background: Object.keys(answers).length === totalQuestions ? '#16a34a' : '#475569',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: Object.keys(answers).length === totalQuestions ? 'pointer' : 'not-allowed'
                }}
              >
                Nộp bài & Chấm điểm 🏆
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Results Overview Screen */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            background: score >= 60 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: score >= 60 ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '10px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {score >= 60 ? <Award size={28} color="#4ade80" /> : <XCircle size={28} color="#f87171" />}
              <div>
                <strong style={{ color: score >= 60 ? '#4ade80' : '#f87171', fontSize: '1rem', display: 'block' }}>
                  {score >= 60 ? `Xuất sắc! Đạt ${score}% điểm (${questions.filter((q, i) => answers[i] === q.correctIndex).length}/${totalQuestions} câu đúng)` : `Chưa đạt (${score}% điểm). Vui lòng thử lại!`}
                </strong>
                <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                  {score >= 60 ? 'Kết quả đã tự động lưu vào Báo cáo Đánh giá của Quản lý.' : 'Cần đạt từ 60% điểm trở lên để hoàn thành bài học này.'}
                </span>
              </div>
            </div>

            {score < 60 && (
              <button
                type="button"
                onClick={handleRetry}
                style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RotateCcw size={16} />
                <span>Làm lại bài kiểm tra</span>
              </button>
            )}
          </div>

          {/* Detailed Question Review List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Chi tiết kết quả 3 câu hỏi:</span>
            {questions.map((q, qIdx) => {
              const isCorrectQ = answers[qIdx] === q.correctIndex;
              return (
                <div key={qIdx} style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.875rem' }}>{q.question}</span>
                    {isCorrectQ ? <CheckCircle2 size={18} color="#4ade80" /> : <XCircle size={18} color="#f87171" />}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: isCorrectQ ? '#4ade80' : '#f87171' }}>
                    Đáp án bạn chọn: <strong>{q.options[answers[qIdx]] || 'Chưa chọn'}</strong>
                  </div>
                  {!isCorrectQ && (
                    <div style={{ fontSize: '0.8rem', color: '#60a5fa', marginTop: '2px' }}>
                      Đáp án đúng: <strong>{q.options[q.correctIndex]}</strong>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
