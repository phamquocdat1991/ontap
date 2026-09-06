import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, ArrowLeft, CheckCircle2, XCircle, Lightbulb, 
  Sparkles, Award, RefreshCw, Clock
} from 'lucide-react';
import { PracticeQuiz, PracticeAttempt } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { LoadingState, EmptyState } from '../common/StateViews';

interface PracticeQuizRunnerProps {
  lessonId: string;
  studentId: string;
  onBack: () => void;
}

export const PracticeQuizRunner: React.FC<PracticeQuizRunnerProps> = ({ 
  lessonId, 
  studentId, 
  onBack 
}) => {
  const { addToast } = useToast();
  const [quiz, setQuiz] = useState<PracticeQuiz | null>(null);
  const [attempt, setAttempt] = useState<PracticeAttempt | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [hintsRevealed, setHintsRevealed] = useState<Record<string, { hint1?: boolean; hint2?: boolean }>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [resultScore, setResultScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Record<string, { isCorrect: boolean; correctAnswer: string; explanation: string; hint1?: string; hint2?: string; points: number }>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setLoading(true);
        const qList = await api.getPracticeQuizzes(lessonId);
        if (qList.length > 0) {
          const selectedQuiz = qList[0];
          setQuiz(selectedQuiz);
          const activeAttempt = await api.startPracticeAttempt(selectedQuiz.id, lessonId);
          setAttempt(activeAttempt);
          setUserAnswers(activeAttempt.answers || {});
          setTimeLeft(Math.max(0, Math.floor((new Date(activeAttempt.deadline).getTime() - Date.now()) / 1000)));
        }
      } catch (err: any) {
        console.error('Failed to load quiz:', err);
        setLoadError(err.message || 'Không thể mở bài luyện tập.');
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [lessonId, studentId]);

  useEffect(() => {
    if (!attempt || isSubmitted || timeLeft <= 0) return;
    const timer = window.setInterval(() => setTimeLeft(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [attempt?.id, isSubmitted, timeLeft <= 0]);

  const handleSelectAnswer = (qId: string, ans: string) => {
    if (isSubmitted) return;
    setUserAnswers(prev => ({ ...prev, [qId]: ans }));
  };

  const toggleHint = (qId: string, level: 'hint1' | 'hint2') => {
    setHintsRevealed(prev => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        [level]: !prev[qId]?.[level]
      }
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!quiz || !attempt || isSubmitting || timeLeft <= 0) return;
    try {
      setIsSubmitting(true);
      const res = await api.submitPracticeAttempt({
        attemptId: attempt.id,
        answers: userAnswers
      });
      setResultScore(res.score);
      setAttempt(res.attempt);
      setFeedback(res.feedback);
      setIsSubmitted(true);
      if (res.isPassed) {
        addToast('Luyện tập xuất sắc!', `Bạn đã đạt ${res.score}/10 điểm (${res.correctCount}/${res.totalQuestions} câu đúng).`, 'success');
      } else {
        addToast('Cố gắng hơn nhé!', `Bạn đạt ${res.score}/10 điểm. Hãy xem lại lời giải chi tiết bên dưới.`, 'warning');
      }
    } catch (err: any) {
      addToast('Lỗi nộp bài', err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const restartQuiz = async () => {
    if (!quiz) return;
    try {
      setLoading(true);
      const nextAttempt = await api.startPracticeAttempt(quiz.id, lessonId);
      setAttempt(nextAttempt);
      setUserAnswers(nextAttempt.answers || {});
      setFeedback({});
      setResultScore(null);
      setIsSubmitted(false);
      setTimeLeft(Math.max(0, Math.floor((new Date(nextAttempt.deadline).getTime() - Date.now()) / 1000)));
    } catch (err: any) {
      addToast('Không thể bắt đầu lượt mới', err.message, 'warning');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  if (loading) {
    return <LoadingState message="Đang nạp bài luyện tập cho bạn..." />;
  }

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <EmptyState
        icon={HelpCircle}
        title={loadError ? 'Chưa thể mở bài luyện tập' : 'Chưa có câu hỏi luyện tập cho bài học này'}
        description={loadError || 'Giáo viên đang hoàn thiện ngân hàng câu hỏi. Bạn có thể quay lại học bài hoặc thử sức với bài khác.'}
        actionText="Quay lại bài học"
        onAction={onBack}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-16 md:pb-6">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Quay lại bài học"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Luyện Tập Nhanh Có Gợi Ý
            </span>
            <h1 className="text-lg sm:text-xl font-black text-white mt-1">{quiz.title}</h1>
          </div>
        </div>

        {isSubmitted && resultScore !== null && (
          <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-2xl border border-slate-800">
            <Award className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Điểm Đạt Được</p>
              <p className="text-base font-black text-amber-400">{resultScore} / 10</p>
            </div>
          </div>
        )}
        {!isSubmitted && attempt && (
          <div className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-mono font-bold ${timeLeft < 60 ? 'border-amber-500/40 bg-amber-500/10 text-amber-400' : 'border-slate-800 bg-slate-900 text-slate-300'}`}>
            <Clock className="h-4 w-4" /> {formatTime(timeLeft)}
          </div>
        )}
      </div>

      {/* Questions list */}
      <div className="space-y-6">
        {quiz.questions.map((q, idx) => {
          const selected = userAnswers[q.id];
          const questionFeedback = feedback[q.id];
          const isCorrect = isSubmitted && questionFeedback?.isCorrect;
          const isWrong = isSubmitted && Boolean(selected) && !questionFeedback?.isCorrect;
          const qHints = hintsRevealed[q.id] || {};

          return (
            <div
              key={q.id || idx}
              className={`bg-slate-900 rounded-3xl border p-6 sm:p-7 space-y-4 shadow-xl transition-all ${
                isSubmitted
                  ? isCorrect
                    ? 'border-emerald-500/50 bg-emerald-950/10'
                    : 'border-rose-500/50 bg-rose-950/10'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400 text-xs">
                  Câu {idx + 1} • {q.points || 2.5} điểm
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-cyan-300 uppercase">
                  {q.difficulty === 'recognition' ? 'Nhận biết' : q.difficulty === 'understanding' ? 'Thông hiểu' : q.difficulty === 'application' ? 'Vận dụng' : 'Vận dụng cao'}
                </span>
              </div>

              <p className="text-sm sm:text-base font-bold text-white leading-relaxed">{q.question}</p>

              {/* Options with touch target >= 44px */}
              {q.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {q.options.map((opt, oi) => {
                    const isOptSelected = selected === opt;
                    const isOptCorrect = isSubmitted && opt === questionFeedback?.correctAnswer;

                    return (
                      <button
                        key={oi}
                        disabled={isSubmitted}
                        onClick={() => handleSelectAnswer(q.id, opt)}
                        className={`p-4 rounded-2xl border text-xs sm:text-sm font-semibold text-left transition-all min-h-[48px] ${
                          isOptCorrect
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                            : isOptSelected && isWrong
                            ? 'bg-rose-600 text-white border-rose-500'
                            : isOptSelected
                            ? 'bg-slate-800 text-emerald-300 border-emerald-500 ring-1 ring-emerald-500'
                            : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {!q.options && q.type === 'short_answer' && (
                <label className="block space-y-2 pt-2">
                  <span className="text-xs font-semibold text-slate-300">Câu trả lời ngắn</span>
                  <input
                    aria-label={`Câu trả lời câu ${idx + 1}`}
                    value={selected || ''}
                    disabled={isSubmitted}
                    onChange={(event) => handleSelectAnswer(q.id, event.target.value)}
                    placeholder="Nhập đáp án..."
                    className="min-h-[48px] w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </label>
              )}

              {/* Progressive Hints (Pedagogy) */}
              {!isSubmitted && (q.hint1 || q.hint2) && (
                <div className="pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {q.hint1 && (
                      <button
                        onClick={() => toggleHint(q.id, 'hint1')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all min-h-[38px] ${
                          qHints.hint1 ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
                        }`}
                      >
                        <Lightbulb className="w-3.5 h-3.5" />
                        {qHints.hint1 ? 'Ẩn Gợi ý 1' : 'Xem Gợi ý 1 (Định hướng)'}
                      </button>
                    )}
                    {q.hint2 && (
                      <button
                        onClick={() => toggleHint(q.id, 'hint2')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all min-h-[38px] ${
                          qHints.hint2 ? 'bg-teal-500 text-slate-950 font-bold' : 'bg-slate-800 text-teal-300 hover:bg-slate-700'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {qHints.hint2 ? 'Ẩn Gợi ý 2' : 'Xem Gợi ý 2 (Công thức)'}
                      </button>
                    )}
                  </div>

                  {qHints.hint1 && (
                    <div className="bg-amber-950/20 border border-amber-800/40 p-3.5 rounded-2xl text-xs text-amber-200 animate-in fade-in">
                      💡 <strong>Gợi ý định hướng:</strong> {q.hint1}
                    </div>
                  )}
                  {qHints.hint2 && (
                    <div className="bg-teal-950/20 border border-teal-800/40 p-3.5 rounded-2xl text-xs text-teal-200 animate-in fade-in">
                      ✨ <strong>Gợi ý công thức:</strong> {q.hint2}
                    </div>
                  )}
                </div>
              )}

              {/* Explanations when submitted */}
              {isSubmitted && (
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    {isCorrect ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Bạn đã trả lời chính xác!
                      </span>
                    ) : (
                      <span className="text-rose-400 font-bold flex items-center gap-1">
                        <XCircle className="w-4 h-4" /> Bạn chọn chưa chính xác.
                      </span>
                    )}
                  </div>
                  <p className="text-emerald-300 font-semibold">Đáp án đúng: {questionFeedback?.correctAnswer}</p>
                  <p className="text-slate-300 leading-relaxed font-mono pt-1">
                    📖 Lời giải chi tiết: {questionFeedback?.explanation}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Submit Action */}
      {!isSubmitted ? (
        <div className="sticky bottom-6 bg-slate-900/95 backdrop-blur-md p-4 rounded-3xl border border-slate-800 shadow-2xl flex items-center justify-between">
          <span className="text-xs text-slate-300">
            Đã làm <strong className="text-emerald-400 font-bold">{Object.values(userAnswers).filter(value => String(value).trim()).length}/{quiz.questions.length}</strong> câu
          </span>

          <button
            onClick={handleSubmitQuiz}
            disabled={isSubmitting || timeLeft <= 0}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-lg shadow-emerald-950/60 transition-all min-h-[44px]"
          >
            {isSubmitting ? 'Đang nộp...' : timeLeft <= 0 ? 'Đã hết thời gian' : 'Nộp Bài Luyện Tập'}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between pt-4 gap-3 flex-wrap">
          <button
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold min-h-[44px]"
          >
            Quay lại bài học
          </button>
          <button
            onClick={restartQuiz}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 min-h-[44px]"
          >
            <RefreshCw className="w-4 h-4" />
            Luyện tập lại
          </button>
        </div>
      )}
    </div>
  );
};
