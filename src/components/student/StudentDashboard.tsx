import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Award, CheckCircle2, Clock, Play, FileText, 
  ArrowRight, Flame, Sparkles, TrendingUp, HelpCircle, 
  ChevronRight, Calendar, Star, Target, CheckCircle 
} from 'lucide-react';
import { Course, Lesson, Exam, LessonProgress, User } from '../../types';
import { api } from '../../services/api';
import { SunriseWelcome } from '../common/SunriseWelcome';
import { LoadingState, ErrorState } from '../common/StateViews';

interface StudentDashboardProps {
  user: User;
  viewMode?: 'overview' | 'courses' | 'practice' | 'exams';
  onOpenLesson: (lessonId: string) => void;
  onStartPractice: (lessonId: string) => void;
  onTakeExam: (examId: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, viewMode = 'overview', onOpenLesson, onStartPractice, onTakeExam }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [progressList, setProgressList] = useState<LessonProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');

  const [query, setQuery] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { const value = JSON.parse(localStorage.getItem(`ontap-favorites:${user.id}`) || '[]'); return Array.isArray(value) ? value.filter(id => typeof id === 'string') : []; } catch { return []; }
  });
  const toggleFavorite = (id: string) => {
    const next = favorites.includes(id) ? favorites.filter(item => item !== id) : [...favorites, id];
    setFavorites(next);
    try { localStorage.setItem(`ontap-favorites:${user.id}`, JSON.stringify(next)); } catch { /* Still usable for this session. */ }
  };
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(false);
        const [cList, lList, eList, pList] = await Promise.all([
          api.getCourses(),
          api.getLessons(),
          api.getExams(),
          api.getStudentProgress(user.id)
        ]);
        if (cancelled) return;
        setCourses(cList);
        setLessons(lList.filter(l => l.status === 'published'));
        setExams(eList.filter(e => e.status === 'published'));
        setProgressList(pList);
      } catch (err) {
        if (!cancelled) setError(true);
        console.error('Failed to load student data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [user.id, reload]);

  if (loading) {
    return <LoadingState message="Đang nạp dữ liệu học tập của bạn..." />;
  }

  if (error) return <ErrorState message="Không tải được dữ liệu học tập. Hãy thử lại." onRetry={() => setReload(n => n + 1)} />;

  const matchesSearch = (title: string) => title.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi'));
  // Filter lessons & exams by selected course
  const filteredLessons = lessons.filter(l => (selectedCourseId === 'all' || l.courseId === selectedCourseId) && matchesSearch(l.title) && (!onlyFavorites || favorites.includes(l.id)));

  const filteredExams = exams.filter(e => (selectedCourseId === 'all' || e.courseId === selectedCourseId) && matchesSearch(e.title));

  // Active course details
  const activeCourse = courses.find(c => c.id === selectedCourseId);

  // Calculations
  const completedLessons = lessons.filter(lesson => progressList.some(progress => progress.lessonId === lesson.id && (progress.isCompleted || progress.percentage >= 99))).length;
  const totalLessons = lessons.length || 1;
  const overallPercentage = Math.min(100, Math.round((completedLessons / totalLessons) * 100));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 md:pb-6">
      <SunriseWelcome onStart={lessons.length ? () => {
        const recent = [...progressList].filter(p => lessons.some(l => l.id === p.lessonId) && !p.isCompleted && p.percentage < 99).sort((a, b) => Date.parse(b.lastOpenedAt) - Date.parse(a.lastOpenedAt))[0];
        onOpenLesson(recent?.lessonId || lessons.find(l => !progressList.some(p => p.lessonId === l.id && (p.isCompleted || p.percentage >= 99)))?.id || lessons[0].id);
      } : undefined} />
      <section className="study-tools">
        <div className="flex flex-wrap justify-between gap-3 mb-3"><h2>Chào {user.fullName}!</h2><span className="text-sm">{completedLessons}/{lessons.length} bài hoàn thành · {overallPercentage}%</span></div>
        <div className="study-tools-row">
          <input aria-label="Tìm bài học hoặc đề kiểm tra" placeholder="Tìm bài học, chủ đề, đề kiểm tra…" value={query} onChange={e => setQuery(e.target.value)} />
          {viewMode !== 'exams' && <button aria-pressed={onlyFavorites} onClick={() => setOnlyFavorites(!onlyFavorites)}><Star size={16} className="inline mr-2" />Bài yêu thích</button>}
          {(query || onlyFavorites) && <button onClick={() => { setQuery(''); setOnlyFavorites(false); }}>Xóa bộ lọc</button>}
        </div>
        <p className="text-xs text-slate-400 mt-3">Bài yêu thích được lưu riêng cho tài khoản trên thiết bị này.</p>
      </section>
      {/* Course Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <span className="text-xs font-bold text-slate-400 shrink-0">Môn học:</span>
        <button
          onClick={() => setSelectedCourseId('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            selectedCourseId === 'all'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          Tất cả các môn ({lessons.length} bài)
        </button>
        {courses.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedCourseId(c.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCourseId === c.id
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {c.subject} {c.grade}
          </button>
        ))}
      </div>

      {/* 2. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Col: Course Syllabus & Lessons (8 cols) */}
        {(viewMode === 'overview' || viewMode === 'courses' || viewMode === 'practice') && <div className={`${viewMode === 'overview' ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-6`}>
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 sm:p-7 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-400" />
                  {activeCourse ? `Bài Học: ${activeCourse.title}` : 'Lộ Trình Bài Học GDPT 2018'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activeCourse?.description || 'Chuẩn chương trình Giáo dục Phổ thông 2018'}
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                {filteredLessons.length} bài học
              </span>
            </div>

            {/* Lessons List with clear cards and large buttons */}
            <div className="space-y-3.5">
              {filteredLessons.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800/80">
                  <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Không có bài học phù hợp. Hãy thay đổi từ khóa, môn học hoặc bộ lọc yêu thích.</p>
                </div>
              ) : (
                filteredLessons.map((les) => {
                  const prog = progressList.find(p => p.lessonId === les.id);
                  const isCompleted = prog?.isCompleted || (prog?.percentage || 0) >= 99;
                  const percent = Math.round(prog?.percentage || 0);

                  return (
                    <div
                      key={les.id}
                      className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            Bài {les.order}
                          </span>
                          <h3 className="text-sm sm:text-base font-bold text-white leading-snug truncate">
                            {les.title}
                          </h3>
                          {isCompleted && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Đã hoàn thành
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-1">
                          {les.learningObjectives?.join(' • ') || 'Nắm vững khái niệm và công thức cốt lõi'}
                        </p>

                        {/* Progress bar */}
                        <div className="space-y-1 pt-1 max-w-sm">
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>Tiến độ học</span>
                            <span className="font-mono font-bold text-emerald-400">{percent}%</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <button onClick={() => toggleFavorite(les.id)} aria-pressed={favorites.includes(les.id)} aria-label={`${favorites.includes(les.id) ? 'Bỏ yêu thích' : 'Yêu thích'}: ${les.title}`} className="p-3 rounded-xl border border-slate-700 text-rose-400"><Star size={18} fill={favorites.includes(les.id) ? 'currentColor' : 'none'} /></button>
                        <button
                          onClick={() => viewMode === 'practice' ? onStartPractice(les.id) : onOpenLesson(les.id)}
                          className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all min-h-[44px] ${
                            isCompleted
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50'
                          }`}
                        >
                          {viewMode === 'practice' ? 'Luyện tập ngay' : isCompleted ? 'Ôn tập lại' : percent > 0 ? 'Học tiếp' : 'Bắt đầu học'}
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>}

        {/* Right Col: Exams & Target Challenges (4 cols) */}
        {(viewMode === 'overview' || viewMode === 'exams') && <div className={`${viewMode === 'overview' ? 'lg:col-span-4' : 'lg:col-span-12'} space-y-6`}>
          {/* Active Assigned Exams */}
          {(viewMode === 'overview' || viewMode === 'exams') && <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                Đề Kiểm Tra Được Giao
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                {filteredExams.length} đề thi
              </span>
            </div>

            <div className="space-y-3">
              {filteredExams.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  Không có đề thi phù hợp với bộ lọc.
                </div>
              ) : (
                filteredExams.map((ex) => (
                  <div key={ex.id} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 hover:border-amber-500/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {ex.type === 'midterm' ? 'Giữa kỳ' : ex.type === 'chapter_review' ? 'Ôn tập chương' : 'Cuối kỳ'}
                      </span>
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" /> {ex.durationMinutes} phút
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white leading-snug">{ex.title}</h3>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Gồm {ex.questionCount ?? 0} câu hỏi (Trắc nghiệm & Tự luận có giải thích)
                      </p>
                    </div>

                    <button
                      onClick={() => onTakeExam(ex.id)}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-amber-950/50 transition-all min-h-[44px]"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      Vào Phòng Kiểm Tra
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>}

          {/* Quick Learning Tip Card */}
          {viewMode === 'overview' && <div className="light-panel-gradient bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl border border-slate-800 p-5 space-y-3 shadow-lg">
            <div className="flex items-center gap-2 text-emerald-400">
              <Star className="w-4 h-4 fill-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Mẹo học tập hiệu quả</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Hãy chú ý phần <strong className="text-rose-400">Lỗi thường gặp</strong> trong mỗi bài học để tránh mất điểm đáng tiếc khi luyện tập nhé!
            </p>
          </div>}
        </div>}
      </div>
    </div>
  );
};
