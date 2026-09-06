import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Play, CheckCircle2, ChevronLeft, ChevronRight, 
  RotateCcw, ShieldAlert, Sparkles, BookOpen, Clock, Eye
} from 'lucide-react';
import { Material, LessonProgress } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

interface SmartMaterialViewerProps {
  material: Material;
  lessonId: string;
  userId: string;
  initialProgress?: LessonProgress;
  onProgressUpdate?: (prog: LessonProgress) => void;
}

export const SmartMaterialViewer: React.FC<SmartMaterialViewerProps> = ({
  material,
  lessonId,
  userId,
  initialProgress,
  onProgressUpdate
}) => {
  const { addToast } = useToast();
  const initialMaterialProgress = initialProgress?.materialProgress?.[material.id];

  // Progress state
  const [currentPage, setCurrentPage] = useState(initialMaterialProgress?.lastPosition || 1);
  const totalPages = Math.max(1, material.pageCount || material.slideCount || 1);
  const [viewedPages, setViewedPages] = useState<number[]>(initialMaterialProgress?.viewedPages || []);
  
  // Video tracking state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [lastSegmentStart, setLastSegmentStart] = useState(0);
  const [watchedSegments, setWatchedSegments] = useState<[number, number][]>(initialMaterialProgress?.watchedSegments || []);
  const [completionPercentage, setCompletionPercentage] = useState(initialMaterialProgress?.percentage || 0);
  const [isCompleted, setIsCompleted] = useState(initialMaterialProgress?.isCompleted || false);
  const [syncing, setSyncing] = useState(false);
  const completionNotifiedRef = useRef(false);

  // Sync progress for PDF / PPT page navigation
  const recordPageView = async (pageNum: number) => {
    setCurrentPage(pageNum);
    const updatedPages = Array.from(new Set([...viewedPages, pageNum])).sort((a, b) => a - b);
    setViewedPages(updatedPages);

    try {
      setSyncing(true);
      const res = await api.trackProgress({
        userId,
        lessonId,
        materialId: material.id,
        pageViewed: pageNum,
        totalPages
      });
      const materialResult = res.materialProgress?.[material.id];
      setCompletionPercentage(materialResult?.percentage ?? res.percentage);
      if (materialResult?.isCompleted && !completionNotifiedRef.current) {
        completionNotifiedRef.current = true;
        setIsCompleted(true);
        addToast('Chúc mừng!', 'Bạn đã hoàn thành yêu cầu đọc tài liệu bài học này!', 'success');
      }
      onProgressUpdate?.(res);
    } catch (err) {
      console.warn('Progress sync error:', err);
    } finally {
      setSyncing(false);
    }
  };

  const syncVideoSegment = async (current: number) => {
    if (current > lastSegmentStart) {
      const segStart = Math.min(lastSegmentStart, current);
      const segEnd = Math.max(lastSegmentStart, current);
      setLastSegmentStart(current);

      try {
        const res = await api.trackProgress({
          userId,
          lessonId,
          materialId: material.id,
          videoSegment: [Math.floor(segStart), Math.floor(segEnd)],
          totalDuration: material.duration || 360
        });
        const materialResult = res.materialProgress?.[material.id];
        setCompletionPercentage(materialResult?.percentage ?? res.percentage);
        setWatchedSegments(materialResult?.watchedSegments || []);
        if (materialResult?.isCompleted && !completionNotifiedRef.current) {
          completionNotifiedRef.current = true;
          setIsCompleted(true);
          addToast('Tuyệt vời!', 'Bạn đã hoàn thành theo dõi toàn bộ video bài giảng!', 'success');
        }
        onProgressUpdate?.(res);
      } catch (err) {
        console.warn('Video progress track failed:', err);
      }
    }
  };

  // Record continuous playback in small chunks; seeking starts a new chunk.
  const handleVideoTimeUpdate = async () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    setVideoCurrentTime(current);
    if (Math.abs(current - lastSegmentStart) >= 4) {
      await syncVideoSegment(current);
    }
  };

  const flushVideoSegment = () => {
    if (!videoRef.current) return;
    void syncVideoSegment(videoRef.current.currentTime);
  };

  const handleVideoSeeking = () => {
    if (videoRef.current) {
      setLastSegmentStart(videoRef.current.currentTime);
    }
  };

  useEffect(() => {
    completionNotifiedRef.current = Boolean(initialMaterialProgress?.isCompleted);
    if (material.type !== 'video') {
      void recordPageView(initialMaterialProgress?.lastPosition || 1);
    }
    // The parent remounts this viewer whenever the selected material changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [material.id]);

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
      {/* Viewer Header */}
      <div className="bg-slate-800/80 px-4 py-3 border-b border-slate-700/60 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            {material.type === 'video' ? <Play className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          </div>
          <div>
            <p className="text-xs font-bold text-white line-clamp-1">{material.filename}</p>
            <p className="text-[11px] text-slate-400">
              {material.type.toUpperCase()} {material.fileSize ? `• ${material.fileSize}` : ''} • {material.type === 'video' ? `${Math.floor((material.duration || 0)/60)} phút` : `${totalPages} trang/slide khai báo`}
            </p>
          </div>
        </div>

        {/* Progress Badge */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="flex items-center gap-1.5 justify-end">
              {isCompleted ? (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  Đã hoàn thành
                </span>
              ) : (
                <span className="text-xs font-semibold text-slate-300">
                  Tiến độ: <span className="text-emerald-400 font-bold">{completionPercentage}%</span>
                </span>
              )}
            </div>
            <div className="w-32 bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className={`h-full transition-all duration-300 ${isCompleted ? 'bg-emerald-400' : 'bg-emerald-500'}`}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Viewer Content Body */}
      <div className="p-4 sm:p-6 bg-slate-950 flex flex-col items-center justify-center min-h-[380px]">
        {material.type === 'video' ? (
          <div className="w-full max-w-2xl flex flex-col items-center">
            <video
              ref={videoRef}
              controls
              onTimeUpdate={handleVideoTimeUpdate}
              onSeeking={handleVideoSeeking}
              onPause={flushVideoSegment}
              onEnded={flushVideoSegment}
              className="w-full rounded-xl bg-black aspect-video border border-slate-800 shadow-2xl"
              src={material.storageUrl}
            >
              Trình duyệt không hỗ trợ phát video HTML5.
            </video>

            {/* Anti-skip note */}
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800">
              <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Hệ thống ghi nhận thời gian học thực tế theo từng phân đoạn đã xem (yêu cầu ≥ 99% để tính hoàn thành).
              </span>
            </div>
          </div>
        ) : (
          /* Original learning material with declared-page progress controls */
          <div className="w-full max-w-3xl flex flex-col items-center">
            <div className="w-full bg-slate-900 rounded-xl border border-slate-800 p-6 sm:p-8 shadow-2xl relative min-h-[320px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Học liệu gốc do giáo viên cung cấp
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                    Trang {currentPage} / {totalPages}
                  </span>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                  {material.type === 'image' ? (
                    <img src={material.storageUrl} alt={material.filename} className="max-h-[560px] w-full object-contain" />
                  ) : material.type === 'pdf' ? (
                    <iframe title={material.filename} src={`${material.storageUrl}#page=${currentPage}`} className="h-[520px] w-full bg-white" />
                  ) : (
                    <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 p-8 text-center">
                      <FileText className="h-10 w-10 text-emerald-400" />
                      <p className="text-sm font-bold text-white">Trình duyệt không xem trực tiếp định dạng {material.type.toUpperCase()}.</p>
                      <a href={material.storageUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white">Mở học liệu gốc</a>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400">Chọn số trang sau khi đã đọc trang tương ứng.</span>
                  <a href={material.storageUrl} target="_blank" rel="noreferrer" className="font-semibold text-emerald-400 hover:underline">Mở trong thẻ mới</a>
                </div>
              </div>

              {/* Bottom Document Controls */}
              <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-6">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => recordPageView(currentPage - 1)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white flex items-center gap-1 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Trang trước
                </button>

                {/* Page indicator pills */}
                <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] sm:max-w-none">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
                    const isViewed = viewedPages.includes(p);
                    const isCurrent = currentPage === p;
                    return (
                      <button
                        key={p}
                        onClick={() => recordPageView(p)}
                        className={`w-6 h-6 rounded-md text-[10px] font-bold transition-all ${
                          isCurrent
                            ? 'bg-emerald-600 text-white'
                            : isViewed
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => recordPageView(currentPage + 1)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white flex items-center gap-1 transition-all"
                >
                  Trang sau
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
