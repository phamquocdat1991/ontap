import React, { useState, useEffect } from 'react';
import { 
  FolderUp, FileText, Play, Plus, Sparkles, CheckCircle2, 
  Eye, Trash2, Clock, Upload, ShieldCheck 
} from 'lucide-react';
import { Material, Lesson } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export const MaterialManager: React.FC = () => {
  const { addToast } = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [targetLessonId, setTargetLessonId] = useState('lesson-1');
  const [filename, setFilename] = useState('');
  const [storageUrl, setStorageUrl] = useState('');
  const [fileType, setFileType] = useState<'pdf' | 'video' | 'pptx' | 'docx' | 'image'>('pdf');
  const [sampleContent, setSampleContent] = useState('');
  const [pageCount, setPageCount] = useState(8);
  const [durationMins, setDurationMins] = useState(6);
  const [isUploading, setIsUploading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [matList, lesList] = await Promise.all([
        api.getMaterials(),
        api.getLessons()
      ]);
      setMaterials(matList);
      setLessons(lesList);
    } catch (err) {
      console.error('Failed to load materials:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filename.trim() || !storageUrl.trim()) {
      addToast('Thiếu thông tin', 'Vui lòng nhập tên và URL học liệu.', 'warning');
      return;
    }

    try {
      setIsUploading(true);
      const res = await api.uploadMaterial({
        lessonId: targetLessonId,
        filename,
        type: fileType,
        storageUrl,
        pageCount: fileType === 'pdf' || fileType === 'docx' ? pageCount : undefined,
        slideCount: fileType === 'pptx' ? pageCount : undefined,
        duration: fileType === 'video' ? durationMins * 60 : undefined,
        sampleContent
      });

      setMaterials(prev => [...prev, res.material]);
      setShowUploadModal(false);
      setFilename('');
      setStorageUrl('');
      setSampleContent('');

      let message = 'Liên kết học liệu đã được lưu thành công.';
      if (res.aiInsights?.summary) {
        message += ` AI đã phân tích nội dung: ${res.aiInsights.summary}`;
      }
      addToast('Tải tài liệu thành công!', message, 'success');
    } catch (err: any) {
      addToast('Lỗi tải tài liệu', err.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <FolderUp className="w-6 h-6 text-emerald-400" />
            Kho Học Liệu & Video Bài Giảng
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Quản lý liên kết PDF, slide, hình ảnh và video; theo dõi tiến độ đọc/xem theo từng học liệu.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition-all"
        >
          <Upload className="w-4 h-4" />
          Thêm học liệu mới
        </button>
      </div>

      {/* Materials List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {materials.map((mat) => {
          const matchedLesson = lessons.find(l => l.id === mat.lessonId);
          return (
            <div key={mat.id} className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                    mat.type === 'video' ? 'bg-purple-500/20 text-purple-400' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {mat.type === 'video' ? <Play className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {mat.type}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-white mt-3 line-clamp-1">{mat.filename}</h3>
                <p className="text-xs text-emerald-400 font-medium mt-0.5 line-clamp-1">
                  Thuộc bài: {matchedLesson?.title || 'Chương IV: Vectơ'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <a href={mat.storageUrl} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">Mở tệp gốc</a>
                <span>
                  {mat.type === 'video' ? `${Math.floor((mat.duration || 0)/60)} phút` : `${mat.pageCount || mat.slideCount || 0} trang`}
                </span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {mat.required ? 'Bắt buộc' : 'Tham khảo'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-400" />
              Tải Lên Tài Liệu & Video Bài Học Mới
            </h3>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Gán Vào Bài Học *</label>
                <select
                  value={targetLessonId}
                  onChange={(e) => setTargetLessonId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {lessons.map(l => (
                    <option key={l.id} value={l.id}>{l.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Định dạng</label>
                  <select
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="pdf">Tài liệu PDF</option>
                    <option value="video">Video Bài giảng MP4</option>
                    <option value="pptx">Slide PowerPoint (PPTX)</option>
                    <option value="docx">Tài liệu Word (DOCX)</option>
                    <option value="image">Hình ảnh (PNG/JPG/WebP)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {fileType === 'video' ? 'Thời lượng (Phút)' : 'Số trang / Slide'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={fileType === 'video' ? durationMins : pageCount}
                    onChange={(e) => fileType === 'video' ? setDurationMins(Number(e.target.value)) : setPageCount(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tên Tệp Tin *</label>
                <input
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  required
                  placeholder="VD: Chuyen_De_He_Toa_Do_Oxy.pdf"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">URL học liệu *</label>
                <input
                  type="url"
                  value={storageUrl}
                  onChange={(e) => setStorageUrl(e.target.value)}
                  required
                  placeholder="https://.../tai-lieu.pdf"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">Phiên bản này lưu URL tệp có sẵn; chưa tải tệp nhị phân lên máy chủ.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Trích đoạn tóm tắt nội dung (Dành cho Gemini AI phân tích)</label>
                <textarea
                  rows={2}
                  value={sampleContent}
                  onChange={(e) => setSampleContent(e.target.value)}
                  placeholder="Nhập 1-2 đoạn văn bản trích dẫn để AI tự động trích xuất chủ đề và câu hỏi gợi ý..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/60"
                >
                  {isUploading ? 'Đang phân tích & lưu...' : 'Lưu học liệu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
