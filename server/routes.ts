import express from 'express';
import { db } from './db.js';
import { 
  generateLessonKnowledge, 
  generatePracticeQuiz, 
  generateExamMatrix, 
  generateExamFromApprovedMatrix, 
  gradeStudentEssay,
  analyzeLearningMaterial 
} from './gemini.js';
import { GoogleSheetsService } from './sheets.js';
import type {
  User,
  LessonProgress,
  PracticeAttempt,
  PracticeQuiz,
  ExamAttempt,
  Exam,
  Question,
  Course,
  Chapter
} from '../src/types/index.js';

export const apiRouter = express.Router();
const SUBMISSION_GRACE_MS = 10_000;

function sanitizeQuestionForStudent(question: Question) {
  const { correctAnswer: _correctAnswer, explanation: _explanation, rubric: _rubric, ...safeQuestion } = question;
  return safeQuestion;
}

function isPublishedCourse(courseId: string) {
  return db.getCourseById(courseId)?.status === 'published';
}

function isPublishedLesson(lessonId: string) {
  const lesson = db.getLessonById(lessonId);
  return Boolean(lesson && lesson.status === 'published' && isPublishedCourse(lesson.courseId));
}

function normalizeAnswer(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
}

function mergeSegments(segments: [number, number][]): [number, number][] {
  const sorted = [...segments]
    .filter(([start, end]) => Number.isFinite(start) && Number.isFinite(end) && end > start)
    .sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const segment of sorted) {
    const previous = merged[merged.length - 1];
    if (!previous || segment[0] > previous[1]) {
      merged.push([...segment]);
    } else {
      previous[1] = Math.max(previous[1], segment[1]);
    }
  }
  return merged;
}

/**
 * Middleware: Extract auth context from request headers
 */
function getAuthUser(req: any): User | undefined {
  const userId = req.headers['x-user-id'] as string | undefined;
  if (!userId) return undefined;
  return db.getUserById(userId);
}

function requireAuth(req: any, res: any, next: any) {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Chưa đăng nhập. Vui lòng chọn tài khoản.' });
  }
  (req as any).user = user;
  next();
}

function requireTeacherOrAdmin(req: any, res: any, next: any) {
  const user = getAuthUser(req);
  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return res.status(403).json({ error: 'Quyền truy cập bị từ chối. Chỉ dành cho Giáo viên hoặc Quản trị viên.' });
  }
  (req as any).user = user;
  next();
}

// ----------------------------------------------------
// 1. AUTH & USERS
// ----------------------------------------------------
apiRouter.get('/auth/me', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ.' });
  res.json(user);
});

apiRouter.use(requireAuth);

apiRouter.get('/users', (req, res) => {
  const currentUser = getAuthUser(req);
  if (currentUser?.role === 'student') {
    return res.json([currentUser]); // Students only see themselves
  }
  res.json(db.getUsers());
});

apiRouter.post('/users', requireTeacherOrAdmin, (req, res) => {
  const { email, fullName, role, classId, school, subjectSpecialty } = req.body;
  if (!email || !fullName || !role) {
    return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
  }
  const newUser: User = {
    id: `user-${Date.now()}`,
    email,
    fullName,
    role,
    classId,
    school: school || 'Trường THPT Mẫu',
    subjectSpecialty,
    avatar: role === 'teacher' 
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString()
  };
  db.addUser(newUser);
  res.json(newUser);
});

apiRouter.delete('/users/:id', requireTeacherOrAdmin, (req, res) => {
  const userId = req.params.id as string;
  db.deleteUser(userId);
  res.json({ success: true, message: 'Đã xóa học sinh và toàn bộ dữ liệu liên quan.' });
});

// ----------------------------------------------------
// 2. CLASSES & COURSES
// ----------------------------------------------------
apiRouter.get('/classes', (req, res) => {
  const user = getAuthUser(req);
  const classes = db.getClasses();
  if (user?.role === 'student') {
    return res.json(classes.filter(cls => cls.id === user.classId));
  }
  res.json(classes);
});

apiRouter.post('/classes', requireTeacherOrAdmin, (req, res) => {
  const user = (req as any).user;
  const newClass = db.addClass({
    id: `class-${Date.now()}`,
    name: req.body.name || 'Lớp mới',
    grade: req.body.grade || '10',
    academicYear: req.body.academicYear || '2024-2025',
    teacherId: user.id,
    teacherName: user.fullName,
    studentCount: Number(req.body.studentCount) || 0,
    description: req.body.description || '',
    createdAt: new Date().toISOString()
  });
  res.json(newClass);
});

apiRouter.get('/courses', (req, res) => {
  const user = getAuthUser(req);
  const courses = db.getCourses();
  if (user?.role === 'student') {
    return res.json(courses.filter(course => course.status === 'published'));
  }
  res.json(courses);
});

apiRouter.post('/courses', requireTeacherOrAdmin, (req, res) => {
  const user = (req as any).user;
  const { title, subject, grade, bookSeries, description, coverColor, status } = req.body;
  const newCourse: Course = {
    id: `course-${Date.now()}`,
    title: title || `${subject || 'Toán học'} ${grade || '10'}`,
    subject: subject || 'Toán học',
    grade: String(grade || '10'),
    bookSeries: bookSeries || 'Kết Nối Tri Thức',
    teacherId: user?.id || 'teacher-1',
    description: description || 'Khóa học chuẩn GDPT 2018',
    coverColor: coverColor || 'emerald',
    status: status || 'published',
    createdAt: new Date().toISOString()
  };
  db.addCourse(newCourse);
  res.json(newCourse);
});

apiRouter.get('/chapters', (req, res) => {
  const user = getAuthUser(req);
  const courseId = req.query.courseId as string | undefined;
  let chapters = db.getChapters(courseId);
  if (user?.role === 'student') {
    chapters = chapters.filter(chapter => isPublishedCourse(chapter.courseId));
  }
  res.json(chapters);
});

apiRouter.post('/chapters', requireTeacherOrAdmin, (req, res) => {
  const { courseId, title, order, description } = req.body;
  const newChapter: Chapter = {
    id: `chap-${Date.now()}`,
    courseId: courseId || 'course-toan-10',
    title: title || 'Chương mới',
    order: Number(order) || 1,
    description: description || ''
  };
  db.addChapter(newChapter);
  res.json(newChapter);
});

// ----------------------------------------------------
// 3. LESSONS & CURRICULUM
// ----------------------------------------------------
apiRouter.get('/lessons', (req, res) => {
  const user = getAuthUser(req);
  const courseId = req.query.courseId as string | undefined;
  const chapterId = req.query.chapterId as string | undefined;
  let list = db.getLessons(courseId, chapterId);

  // Security check: Students are strictly forbidden from seeing draft_ai lessons!
  if (user?.role === 'student') {
    list = list.filter(lesson => lesson.status === 'published' && isPublishedCourse(lesson.courseId));
  }

  res.json(list);
});

apiRouter.get('/lessons/:id', (req, res) => {
  const user = getAuthUser(req);
  const lesson = db.getLessonById(req.params.id);
  if (!lesson) {
    return res.status(404).json({ error: 'Không tìm thấy bài học' });
  }
  if (user?.role === 'student' && !isPublishedLesson(lesson.id)) {
    return res.status(403).json({ error: 'Bài học đang trong trạng thái soạn thảo, chưa được công bố.' });
  }
  res.json(lesson);
});

apiRouter.post('/lessons', requireTeacherOrAdmin, (req, res) => {
  const { chapterId, courseId, title, order, status, durationMinutes, learningObjectives, contentAI, teacherNotes } = req.body;
  const newLesson = db.addLesson({
    id: `lesson-${Date.now()}`,
    chapterId: chapterId || 'chap-1',
    courseId: courseId || 'course-toan-10',
    title: title || 'Bài học mới',
    order: Number(order) || 1,
    status: status || 'draft_ai',
    durationMinutes: Number(durationMinutes) || 45,
    learningObjectives: Array.isArray(learningObjectives) ? learningObjectives : ['Nắm vững kiến thức bài học'],
    contentAI: contentAI,
    teacherNotes: teacherNotes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  res.json(newLesson);
});

apiRouter.patch('/lessons/:id', requireTeacherOrAdmin, (req, res) => {
  const updated = db.updateLesson(req.params.id as string, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Không tìm thấy bài học' });
  }
  res.json(updated);
});

// ----------------------------------------------------
// 4. LEARNING MATERIALS & UPLOADS
// ----------------------------------------------------
apiRouter.get('/materials', (req, res) => {
  const lessonId = req.query.lessonId as string | undefined;
  const user = getAuthUser(req);
  if (user?.role === 'student') {
    if (!lessonId) return res.status(400).json({ error: 'Cần chọn bài học trước khi xem học liệu.' });
    const lesson = db.getLessonById(lessonId);
    if (!lesson || !isPublishedLesson(lesson.id)) {
      return res.status(403).json({ error: 'Học liệu này chưa được công bố.' });
    }
  }
  res.json(db.getMaterials(lessonId));
});

apiRouter.post('/materials/upload', requireTeacherOrAdmin, async (req, res) => {
  const { lessonId, filename, type, storageUrl, pageCount, slideCount, duration, sampleContent, required } = req.body;
  const validTypes = ['pdf', 'docx', 'pptx', 'image', 'video'];
  if (!lessonId || !db.getLessonById(lessonId)) {
    return res.status(400).json({ error: 'Vui lòng chọn một bài học hợp lệ.' });
  }
  if (!filename || !storageUrl || !validTypes.includes(type)) {
    return res.status(400).json({ error: 'Cần nhập tên, loại và URL học liệu hợp lệ.' });
  }
  try {
    const parsedUrl = new URL(storageUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('unsupported protocol');
  } catch {
    return res.status(400).json({ error: 'URL học liệu phải bắt đầu bằng http:// hoặc https://.' });
  }

  const newMaterial = db.addMaterial({
    id: `mat-${Date.now()}`,
    lessonId,
    type,
    filename,
    storageUrl,
    pageCount: pageCount ? Number(pageCount) : undefined,
    slideCount: slideCount ? Number(slideCount) : undefined,
    duration: duration ? Number(duration) : undefined,
    required: required !== false,
    fileSize: req.body.fileSize || undefined,
    createdAt: new Date().toISOString()
  });

  // Optional AI multimodal analysis on server
  let aiInsights = null;
  if (sampleContent) {
    try {
      aiInsights = await analyzeLearningMaterial(filename, type, sampleContent);
    } catch (e) {
      console.warn('AI analysis skipped:', e);
    }
  }

  res.json({ material: newMaterial, aiInsights });
});

// ----------------------------------------------------
// 5. TRUE PROGRESS ENGINE (ANTI-SKIP + GRANULAR TRACKING)
// ----------------------------------------------------
// Keep this specific route before /:userId/:lessonId so Express does not
// interpret the literal "user" segment as a user id.
apiRouter.get('/progress/user/:userId', requireAuth, (req, res) => {
  const { userId } = req.params;
  const currentAuth = getAuthUser(req);
  if (currentAuth?.role === 'student' && currentAuth.id !== userId) {
    return res.status(403).json({ error: 'Không có quyền truy cập' });
  }
  res.json(db.getUserProgressList(userId));
});

apiRouter.get('/progress/:userId/:lessonId', requireAuth, (req, res) => {
  const { userId, lessonId } = req.params;
  const currentAuth = getAuthUser(req);
  if (currentAuth?.role === 'student' && currentAuth.id !== userId) {
    return res.status(403).json({ error: 'Không có quyền xem tiến độ của học sinh khác' });
  }

  const progress = db.getLessonProgress(userId, lessonId) || {
    id: `prog-${userId}-${lessonId}`,
    userId,
    lessonId,
    completedUnits: 0,
    totalUnits: 100,
    percentage: 0,
    lastPosition: 1,
    viewedPages: [],
    watchedSegments: [],
    materialProgress: {},
    isCompleted: false,
    lastOpenedAt: new Date().toISOString()
  };
  res.json(progress);
});

apiRouter.post('/progress/track', requireAuth, (req, res) => {
  const { userId, lessonId, materialId, pageViewed, totalPages, videoSegment, totalDuration } = req.body;
  const currentAuth = getAuthUser(req);

  if (!userId || !lessonId) {
    return res.status(400).json({ error: 'Thiếu userId hoặc lessonId' });
  }
  if (currentAuth?.role === 'student' && currentAuth.id !== userId) {
    return res.status(403).json({ error: 'Không hợp lệ' });
  }

  const lesson = db.getLessonById(lessonId);
  if (!lesson) return res.status(404).json({ error: 'Bài học không tồn tại.' });
    if (currentAuth?.role === 'student' && !isPublishedLesson(lesson.id)) {
    return res.status(403).json({ error: 'Bài học chưa được công bố.' });
  }

  const lessonMaterials = db.getMaterials(lessonId);
  const resolvedMaterialId = materialId || (
    typeof pageViewed === 'number'
      ? lessonMaterials.find(material => material.type !== 'video')?.id
      : lessonMaterials.find(material => material.type === 'video')?.id
  );
  const material = lessonMaterials.find(item => item.id === resolvedMaterialId);
  if (!material) return res.status(400).json({ error: 'Học liệu không hợp lệ.' });

  let existing = db.getLessonProgress(userId, lessonId);
  const now = new Date().toISOString();

  if (!existing) {
    existing = {
      id: `prog-${userId}-${lessonId}`,
      userId,
      lessonId,
      completedUnits: 0,
      totalUnits: 100,
      percentage: 0,
      lastPosition: 1,
      viewedPages: [],
      watchedSegments: [],
      materialProgress: {},
      isCompleted: false,
      lastOpenedAt: now
    };
  }

  existing.lastOpenedAt = now;

  const materialProgress = { ...(existing.materialProgress || {}) };

  // Migrate old single-material progress data without losing existing history.
  if (Object.keys(materialProgress).length === 0) {
    for (const item of lessonMaterials) {
      if (item.type === 'video' && (existing.watchedSegments || []).length > 0) {
        const duration = item.duration || totalDuration || 1;
        const segments = mergeSegments(existing.watchedSegments || []);
        const watched = segments.reduce((sum, [start, end]) => sum + (end - start), 0);
        materialProgress[item.id] = {
          materialId: item.id,
          watchedSegments: segments,
          completedUnits: watched,
          totalUnits: duration,
          percentage: Math.min(100, Math.round((watched / duration) * 100)),
          lastPosition: existing.lastPosition || 0,
          isCompleted: watched / duration >= (db.getSettings().videoWatchThreshold || 99) / 100
        };
      } else if (item.type !== 'video' && (existing.viewedPages || []).length > 0) {
        const pages = item.pageCount || item.slideCount || totalPages || 1;
        const viewed = [...new Set(existing.viewedPages || [])].filter(page => page >= 1 && page <= pages);
        materialProgress[item.id] = {
          materialId: item.id,
          viewedPages: viewed,
          completedUnits: viewed.length,
          totalUnits: pages,
          percentage: Math.min(100, Math.round((viewed.length / pages) * 100)),
          lastPosition: existing.lastPosition || 1,
          isCompleted: viewed.length >= pages
        };
      }
    }
  }

  const fallbackTotal = material.type === 'video'
    ? (material.duration || Number(totalDuration) || 1)
    : (material.pageCount || material.slideCount || Number(totalPages) || 1);
  const current = materialProgress[material.id] || {
    materialId: material.id,
    viewedPages: [],
    watchedSegments: [],
    completedUnits: 0,
    totalUnits: fallbackTotal,
    percentage: 0,
    lastPosition: material.type === 'video' ? 0 : 1,
    isCompleted: false
  };

  if (typeof pageViewed === 'number' && material.type !== 'video') {
    const pageTotal = material.pageCount || material.slideCount || Number(totalPages) || 1;
    if (!Number.isInteger(pageViewed) || pageViewed < 1 || pageViewed > pageTotal) {
      return res.status(400).json({ error: 'Số trang không hợp lệ.' });
    }
    const pages = [...new Set([...(current.viewedPages || []), pageViewed])].sort((a, b) => a - b);
    current.viewedPages = pages;
    current.completedUnits = pages.length;
    current.totalUnits = pageTotal;
    current.percentage = Math.min(100, Math.round((pages.length / pageTotal) * 100));
    current.lastPosition = pageViewed;
    current.isCompleted = pages.length >= pageTotal;
  }

  if (Array.isArray(videoSegment) && videoSegment.length === 2 && material.type === 'video') {
    const duration = material.duration || Number(totalDuration) || 1;
    const start = Math.max(0, Math.min(duration, Number(videoSegment[0])));
    const end = Math.max(0, Math.min(duration, Number(videoSegment[1])));
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return res.status(400).json({ error: 'Phân đoạn video không hợp lệ.' });
    }
    const segments = mergeSegments([...(current.watchedSegments || []), [start, end]]);
    const watched = segments.reduce((sum, [segmentStart, segmentEnd]) => sum + (segmentEnd - segmentStart), 0);
    current.watchedSegments = segments;
    current.completedUnits = Math.round(watched);
    current.totalUnits = duration;
    current.percentage = Math.min(100, Math.round((watched / duration) * 100));
    current.lastPosition = end;
    current.isCompleted = current.percentage >= (db.getSettings().videoWatchThreshold || 99);
  }

  materialProgress[material.id] = current;
  const requiredMaterials = lessonMaterials.filter(item => item.required);
  const trackedMaterials = requiredMaterials.length > 0 ? requiredMaterials : lessonMaterials;
  const aggregatePercentage = trackedMaterials.length > 0
    ? Math.round(trackedMaterials.reduce((sum, item) => sum + (materialProgress[item.id]?.percentage || 0), 0) / trackedMaterials.length)
    : current.percentage;
  const completed = trackedMaterials.length > 0
    ? trackedMaterials.every(item => materialProgress[item.id]?.isCompleted)
    : current.isCompleted;

  existing.materialProgress = materialProgress;
  existing.completedUnits = aggregatePercentage;
  existing.totalUnits = 100;
  existing.percentage = aggregatePercentage;
  existing.lastPosition = current.lastPosition;
  existing.viewedPages = current.viewedPages || [];
  existing.watchedSegments = current.watchedSegments || [];
  existing.isCompleted = completed;
  existing.completedAt = completed ? (existing.completedAt || now) : undefined;

  db.saveLessonProgress(existing);
  res.json(existing);
});

// ----------------------------------------------------
// 6. PRACTICE QUIZ (MAX 3 ATTEMPTS + TIMER RESILIENCE + PEDAGOGICAL HINTS)
// ----------------------------------------------------
apiRouter.get('/practice/quizzes', requireAuth, (req, res) => {
  const user = getAuthUser(req);
  const lessonId = req.query.lessonId as string | undefined;
  let quizzes = db.getPracticeQuizzes(lessonId);
  if (user?.role === 'student') {
    quizzes = quizzes
      .filter(quiz => quiz.status === 'published' && isPublishedLesson(quiz.lessonId))
      .map(quiz => ({ ...quiz, questions: quiz.questions.map(sanitizeQuestionForStudent) } as PracticeQuiz));
  }
  res.json(quizzes);
});

apiRouter.get('/practice/quizzes/:id', requireAuth, (req, res) => {
  const user = getAuthUser(req);
  const quiz = db.getPracticeQuizById(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Không tìm thấy bài luyện tập' });
  if (user?.role === 'student') {
    if (quiz.status !== 'published' || !isPublishedLesson(quiz.lessonId)) {
      return res.status(403).json({ error: 'Bài luyện tập chưa được công bố.' });
    }
    return res.json({ ...quiz, questions: quiz.questions.map(sanitizeQuestionForStudent) });
  }
  res.json(quiz);
});

apiRouter.post('/practice/quizzes', requireTeacherOrAdmin, (req, res) => {
  const newQuiz = db.addPracticeQuiz({
    id: `quiz-${Date.now()}`,
    lessonId: req.body.lessonId || 'lesson-1',
    courseId: req.body.courseId || 'course-toan-10',
    title: req.body.title || 'Bài luyện tập mới',
    timeLimitMinutes: Number(req.body.timeLimitMinutes) || 15,
    maxAttempts: 3,
    passPercentage: Number(req.body.passPercentage) || 80,
    questions: req.body.questions || [],
    status: 'published',
    createdAt: new Date().toISOString()
  });
  res.json(newQuiz);
});

apiRouter.get('/practice/attempts', (req, res) => {
  const user = getAuthUser(req);
  const quizId = req.query.quizId as string | undefined;
  const targetUserId = user?.role === 'student' ? user.id : (req.query.userId as string | undefined);
  res.json(db.getPracticeAttempts(targetUserId, quizId));
});

apiRouter.post('/practice/start', requireAuth, (req, res) => {
  const { quizId, lessonId } = req.body;
  const user = (req as any).user;

  const quiz = db.getPracticeQuizById(quizId);
  if (!quiz) return res.status(404).json({ error: 'Bài luyện tập không tồn tại' });
  if (!quiz.questions.length) return res.status(400).json({ error: 'Bài luyện tập chưa có câu hỏi.' });
  if (user.role === 'student' && (quiz.status !== 'published' || !isPublishedLesson(quiz.lessonId))) {
    return res.status(403).json({ error: 'Bài luyện tập chưa được công bố.' });
  }

  const previousAttempts = db.getPracticeAttempts(user.id, quizId);
  const inProgress = previousAttempts.find(a => a.status === 'in_progress');
  if (inProgress) {
    if (new Date(inProgress.deadline).getTime() < Date.now()) {
      db.updatePracticeAttempt(inProgress.id, { status: 'timed_out' });
    } else {
      return res.json(inProgress);
    }
  }

  const completedAttempts = previousAttempts.filter(a => a.status !== 'in_progress');
  if (completedAttempts.length >= (quiz.maxAttempts || 3)) {
    return res.status(400).json({ error: `Bạn đã sử dụng đủ ${quiz.maxAttempts || 3} lượt làm bài.` });
  }

  const activeAfterTimeoutCheck = db.getPracticeAttempts(user.id, quizId).find(a => a.status === 'in_progress');
  if (activeAfterTimeoutCheck) {
    return res.json(activeAfterTimeoutCheck);
  }

  const now = new Date();
  const deadline = new Date(now.getTime() + quiz.timeLimitMinutes * 60 * 1000);

  const newAttempt: PracticeAttempt = {
    id: `patt-${Date.now()}-${user.id}`,
    quizId,
    lessonId: quiz.lessonId,
    userId: user.id,
    studentName: user.fullName,
    attemptNumber: completedAttempts.length + 1,
    startedAt: now.toISOString(),
    deadline: deadline.toISOString(),
    answers: {},
    status: 'in_progress'
  };

  db.addPracticeAttempt(newAttempt);
  res.json(newAttempt);
});

apiRouter.post('/practice/submit', requireAuth, async (req, res) => {
  const { attemptId, answers } = req.body;
  const user = (req as any).user;

  const attempts = db.getPracticeAttempts();
  const attempt = attempts.find(a => a.id === attemptId);
  if (!attempt) return res.status(404).json({ error: 'Không tìm thấy lượt làm bài' });
  if (attempt.userId !== user.id && user.role === 'student') {
    return res.status(403).json({ error: 'Không hợp lệ' });
  }
  if (attempt.status !== 'in_progress') {
    return res.status(409).json({ error: 'Lượt làm bài này đã kết thúc và không thể nộp lại.' });
  }
  if (new Date(attempt.deadline).getTime() + SUBMISSION_GRACE_MS < Date.now()) {
    db.updatePracticeAttempt(attempt.id, { status: 'timed_out' });
    return res.status(409).json({ error: 'Đã hết thời gian làm bài.' });
  }
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return res.status(400).json({ error: 'Dữ liệu câu trả lời không hợp lệ.' });
  }

  const quiz = db.getPracticeQuizById(attempt.quizId);
  if (!quiz) return res.status(404).json({ error: 'Không tìm thấy thông tin đề luyện tập' });

  const now = new Date();
  const startTime = new Date(attempt.startedAt).getTime();
  const durationSeconds = Math.round((now.getTime() - startTime) / 1000);

  // Deterministic Grading + Pedagogical Feedback
  let totalScore = 0;
  let earnedScore = 0;
  const questionFeedback: Record<string, { isCorrect: boolean; correctAnswer: string; explanation: string; hint1?: string; hint2?: string; points: number }> = {};

  quiz.questions.forEach(q => {
    const qPoints = q.points || (10 / quiz.questions.length);
    totalScore += qPoints;
    const studentAns = (answers[q.id] || '').toString().trim();
    const correctAns = (q.correctAnswer || '').toString().trim();

    let isCorrect = false;
    if (q.type === 'short_answer') {
      isCorrect = normalizeAnswer(studentAns) === normalizeAnswer(correctAns);
    } else {
      isCorrect = studentAns === correctAns;
    }

    if (isCorrect) {
      earnedScore += qPoints;
    }

    questionFeedback[q.id] = {
      isCorrect,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || (isCorrect ? 'Câu trả lời chính xác.' : 'Hãy xem lại nội dung bài học và thử lại.'),
      hint1: isCorrect ? undefined : q.hint1,
      hint2: isCorrect ? undefined : q.hint2,
      points: isCorrect ? qPoints : 0
    };
  });

  const percentage = totalScore > 0 ? Math.round((earnedScore / totalScore) * 100) : 0;
  const passed = percentage >= (quiz.passPercentage || db.getSettings().passingScoreThreshold || 80);
  const correctCount = Object.values(questionFeedback).filter(item => item.isCorrect).length;

  const updated = db.updatePracticeAttempt(attemptId, {
    answers,
    score: Math.round(earnedScore * 10) / 10,
    totalScore,
    percentage,
    passed,
    isPassed: passed,
    correctCount,
    totalQuestions: quiz.questions.length,
    status: 'submitted',
    submittedAt: now.toISOString(),
    durationSeconds
  });

  // Background Google Sheets Sync
  if (updated && db.getSettings().autoSync) {
    GoogleSheetsService.syncPracticeAttempt(updated, user.id).catch(console.error);
  }

  res.json({
    attempt: updated,
    feedback: questionFeedback
  });
});

// ----------------------------------------------------
// 7. EXAM ENGINE (SECURE SUBMISSION + AI RUBRIC EVALUATION)
// ----------------------------------------------------
apiRouter.get('/exams', (req, res) => {
  const user = getAuthUser(req);
  let exams = db.getExams();

  if (user?.role === 'student') {
    exams = exams.filter(exam => (
      exam.status === 'published' &&
      (!exam.classIds?.length || (!!user.classId && exam.classIds.includes(user.classId)))
    ));
    // Strip correct answers from questions for security before taking!
    exams = exams.map(e => ({
      ...e,
      questions: e.questions.map(q => ({
        ...q,
        correctAnswer: '',
        explanation: '',
        rubric: ''
      }))
    }));
  }

  res.json(exams);
});

apiRouter.get('/exams/:id', (req, res) => {
  const user = getAuthUser(req);
  const exam = db.getExamById(req.params.id);
  if (!exam) return res.status(404).json({ error: 'Không tìm thấy đề thi' });

  if (user?.role === 'student') {
    if (exam.status !== 'published') {
      return res.status(403).json({ error: 'Đề thi chưa được công bố' });
    }
    if (exam.classIds?.length && (!user.classId || !exam.classIds.includes(user.classId))) {
      return res.status(403).json({ error: 'Đề thi không được giao cho lớp của bạn.' });
    }
    // STRIP CORRECT ANSWERS & RUBRICS BEFORE EXAM SUBMISSION
    const safeExam: Exam = {
      ...exam,
      questions: exam.questions.map(q => ({
        ...q,
        correctAnswer: '', // Crucial security!
        explanation: '',
        rubric: ''
      }))
    };
    return res.json(safeExam);
  }

  res.json(exam);
});

apiRouter.post('/exams', requireTeacherOrAdmin, (req, res) => {
  const user = (req as any).user;
  const newExam: Exam = {
    id: `exam-${Date.now()}`,
    courseId: req.body.courseId || 'course-toan-10',
    classIds: req.body.classIds || ['class-1'],
    title: req.body.title || 'Đề kiểm tra mới',
    type: req.body.type || 'midterm',
    scope: req.body.scope || 'Toàn bộ học phần',
    durationMinutes: Number(req.body.durationMinutes) || 45,
    totalScore: Number(req.body.totalScore) || 10,
    questionCount: Number(req.body.questionCount) || 4,
    status: req.body.status || 'draft_matrix',
    matrix: req.body.matrix,
    specification: req.body.specification || '',
    questions: req.body.questions || [],
    rubric: req.body.rubric || '',
    scoringGuide: req.body.scoringGuide || '',
    teacherId: user.id,
    createdAt: new Date().toISOString()
  };
  db.addExam(newExam);
  res.json(newExam);
});

apiRouter.patch('/exams/:id', requireTeacherOrAdmin, (req, res) => {
  const updated = db.updateExam(req.params.id as string, req.body);
  if (!updated) return res.status(404).json({ error: 'Không tìm thấy đề thi' });
  res.json(updated);
});

apiRouter.get('/exams/:id/attempts', (req, res) => {
  const user = getAuthUser(req);
  const examId = req.params.id;
  const attempts = db.getExamAttempts(examId);

  if (user?.role === 'student') {
    return res.json(attempts.filter(a => a.userId === user.id));
  }
  res.json(attempts);
});

apiRouter.post('/exams/start', requireAuth, (req, res) => {
  const { examId } = req.body;
  const user = (req as any).user;

  const exam = db.getExamById(examId);
  if (!exam) return res.status(404).json({ error: 'Không tìm thấy đề thi' });
  if (exam.status !== 'published') return res.status(400).json({ error: 'Đề thi chưa được công bố.' });
  if (user.role === 'student' && exam.classIds?.length && (!user.classId || !exam.classIds.includes(user.classId))) {
    return res.status(403).json({ error: 'Đề thi không được giao cho lớp của bạn.' });
  }

  // Check if active attempt exists
  const existingAttempts = db.getExamAttempts(examId, user.id);
  const completed = existingAttempts
    .filter(attempt => ['submitted', 'graded', 'needs_review'].includes(attempt.status))
    .sort((a, b) => new Date(b.submittedAt || b.createdAt).getTime() - new Date(a.submittedAt || a.createdAt).getTime())[0];
  if (completed) return res.json(completed);
  const inProgress = existingAttempts.find(a => a.status === 'in_progress');
  if (inProgress) {
    if (new Date(inProgress.deadline).getTime() >= Date.now()) {
      return res.json(inProgress);
    }
    db.updateExamAttempt(inProgress.id, { status: 'timed_out' });
  }

  const now = new Date();
  const deadline = new Date(now.getTime() + exam.durationMinutes * 60 * 1000);

  const newAttempt: ExamAttempt = {
    id: `eatt-${Date.now()}-${user.id}`,
    examId,
    userId: user.id,
    studentName: user.fullName,
    classId: user.classId || 'class-1',
    className: user.className || 'Lớp mẫu',
    startedAt: now.toISOString(),
    deadline: deadline.toISOString(),
    answers: {},
    totalScore: exam.totalScore,
    status: 'in_progress',
    syncStatus: 'pending',
    createdAt: now.toISOString()
  };

  db.addExamAttempt(newAttempt);
  res.json(newAttempt);
});

apiRouter.post('/exams/submit', requireAuth, async (req, res) => {
  const { attemptId, answers } = req.body;
  const user = (req as any).user;

  const attempt = db.getExamAttemptById(attemptId);
  if (!attempt) return res.status(404).json({ error: 'Không tìm thấy bài làm' });
  if (attempt.userId !== user.id && user.role === 'student') {
    return res.status(403).json({ error: 'Không có quyền nộp bài' });
  }
  if (attempt.status !== 'in_progress') {
    return res.status(409).json({ error: 'Bài thi này đã kết thúc và không thể nộp lại.' });
  }
  if (new Date(attempt.deadline).getTime() + SUBMISSION_GRACE_MS < Date.now()) {
    db.updateExamAttempt(attempt.id, { status: 'timed_out' });
    return res.status(409).json({ error: 'Đã hết thời gian làm bài.' });
  }
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return res.status(400).json({ error: 'Dữ liệu câu trả lời không hợp lệ.' });
  }

  const exam = db.getExamById(attempt.examId);
  if (!exam) return res.status(404).json({ error: 'Không tìm thấy đề thi gốc' });

  const now = new Date();
  const startTime = new Date(attempt.startedAt).getTime();
  const durationSeconds = Math.round((now.getTime() - startTime) / 1000);

  let earnedScore = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let hasEssayNeedingReview = false;
  const essayEvaluations: Record<string, any> = {};

  // Server-Side Grading Engine
  for (const q of exam.questions) {
    const qPoints = q.points || (exam.totalScore / exam.questionCount);
    const studentAns = (answers[q.id] || '').toString().trim();
    const correctAns = (q.correctAnswer || '').toString().trim();

    if (q.type === 'multiple_choice' || q.type === 'true_false') {
      if (studentAns === correctAns) {
        earnedScore += qPoints;
        correctCount++;
      } else {
        incorrectCount++;
      }
    } else if (q.type === 'short_answer') {
      const isMatch = normalizeAnswer(studentAns) === normalizeAnswer(correctAns);
      if (isMatch) {
        earnedScore += qPoints;
        correctCount++;
      } else {
        incorrectCount++;
      }
    } else if (q.type === 'essay') {
      const aiGradingEnabled = db.getSettings().enableAiGrading;
      if (!studentAns || !aiGradingEnabled) {
        hasEssayNeedingReview = true;
        essayEvaluations[q.id] = {
          questionId: q.id,
          scoreProposal: 0,
          maxScore: qPoints,
          reasoningSummary: !studentAns
            ? 'Học sinh chưa trả lời câu tự luận.'
            : 'Chấm sơ khảo AI đang tắt; giáo viên cần duyệt trực tiếp theo rubric.',
          confidence: 0,
          needsTeacherReview: true
        };
        continue;
      }

      try {
        const evalResult = await gradeStudentEssay(
          q.question,
          studentAns,
          q.rubric || exam.rubric || 'Thang điểm tự luận chuẩn',
          qPoints,
          q.correctAnswer
        );
        evalResult.questionId = q.id;
        essayEvaluations[q.id] = evalResult;
        earnedScore += evalResult.scoreProposal;
        if (evalResult.needsTeacherReview || evalResult.confidence < 0.85) {
          hasEssayNeedingReview = true;
        }
      } catch (err) {
        console.error('Essay grading failed:', err);
        hasEssayNeedingReview = true;
        essayEvaluations[q.id] = {
          questionId: q.id,
          scoreProposal: 0,
          maxScore: qPoints,
          reasoningSummary: 'Không thể chấm sơ khảo tự động; giáo viên cần đối chiếu rubric.',
          confidence: 0,
          needsTeacherReview: true
        };
      }
    }
  }

  const finalScore = Math.round(earnedScore * 10) / 10;
  const status = hasEssayNeedingReview ? 'needs_review' : 'graded';

  const updated = db.updateExamAttempt(attemptId, {
    answers,
    score: finalScore,
    correctCount,
    incorrectCount,
    durationSeconds,
    status,
    essayEvaluations,
    submittedAt: now.toISOString()
  });

  // Only final scores are exported; essays that need review wait for the teacher.
  if (updated && updated.status === 'graded' && db.getSettings().autoSync) {
    GoogleSheetsService.syncExamAttempt(updated, user.id).catch(console.error);
  }

  res.json(updated);
});

apiRouter.patch('/exams/attempts/:id/review', requireTeacherOrAdmin, (req, res) => {
  const id = req.params.id as string;
  const { score, essayEvaluations, teacherNotes } = req.body;

  const attempt = db.getExamAttemptById(id);
  if (!attempt) return res.status(404).json({ error: 'Không tìm thấy bài làm' });
  const reviewedScore = Number(score);
  if (!Number.isFinite(reviewedScore) || reviewedScore < 0 || reviewedScore > attempt.totalScore) {
    return res.status(400).json({ error: `Điểm phải nằm trong khoảng 0 đến ${attempt.totalScore}.` });
  }

  const updated = db.updateExamAttempt(id, {
    score: reviewedScore,
    essayEvaluations: essayEvaluations || attempt.essayEvaluations,
    teacherNotes: typeof teacherNotes === 'string' ? teacherNotes.trim() : attempt.teacherNotes,
    status: 'graded'
  });

  if (updated && db.getSettings().autoSync) {
    GoogleSheetsService.syncExamAttempt(updated, updated.userId).catch(console.error);
  }
  res.json(updated);
});

// ----------------------------------------------------
// 8. GEMINI AI PROMPT ENDPOINTS (SERVER-SIDE ONLY)
// ----------------------------------------------------
apiRouter.post('/ai/generate-lesson', requireTeacherOrAdmin, async (req, res) => {
  try {
    const result = await generateLessonKnowledge(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(503).json({ error: error.message || 'Không thể kết nối Gemini để tạo bài học.' });
  }
});

apiRouter.post('/ai/generate-practice', requireTeacherOrAdmin, async (req, res) => {
  try {
    const { lessonTitle, subject, grade, lessonContent, questionCount } = req.body;
    const questions = await generatePracticeQuiz(lessonTitle, subject, grade, lessonContent, Number(questionCount) || 4);
    res.json(questions);
  } catch (error: any) {
    res.status(503).json({ error: error.message || 'Không thể kết nối Gemini để tạo câu hỏi.' });
  }
});

apiRouter.post('/ai/generate-matrix', requireTeacherOrAdmin, async (req, res) => {
  try {
    const matrix = await generateExamMatrix(req.body);
    res.json(matrix);
  } catch (error: any) {
    res.status(503).json({ error: error.message || 'Không thể kết nối Gemini để tạo ma trận.' });
  }
});

apiRouter.post('/ai/generate-exam-from-matrix', requireTeacherOrAdmin, async (req, res) => {
  try {
    const { matrix, scope } = req.body;
    const generated = await generateExamFromApprovedMatrix(matrix, scope);
    res.json(generated);
  } catch (error: any) {
    res.status(503).json({ error: error.message || 'Không thể kết nối Gemini để sinh đề thi.' });
  }
});

// ----------------------------------------------------
// 9. GOOGLE SHEETS SYNC
// ----------------------------------------------------
apiRouter.get('/sheets/logs', requireTeacherOrAdmin, (req, res) => {
  res.json(db.getSheetSyncLogs());
});

apiRouter.post('/sheets/retry-sync', requireTeacherOrAdmin, async (req, res) => {
  const { logId } = req.body;
  if (!logId) return res.status(400).json({ error: 'Thiếu logId' });
  const result = await GoogleSheetsService.retrySync(logId);
  if (!result) return res.status(404).json({ error: 'Không tìm thấy dòng log' });
  res.json(result);
});

apiRouter.post('/sheets/connect', requireTeacherOrAdmin, (req, res) => {
  const { spreadsheetId, spreadsheetUrl, spreadsheetName } = req.body;
  if (!spreadsheetId || !/^[a-zA-Z0-9_-]{20,}$/.test(spreadsheetId)) {
    return res.status(400).json({ error: 'Spreadsheet ID không hợp lệ.' });
  }
  const updatedSettings = db.updateSettings({
    googleSheetsConnected: true,
    spreadsheetId,
    spreadsheetUrl: spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    spreadsheetName: spreadsheetName || 'AI_Learning_Hub_BangDiem'
  });
  res.json(updatedSettings);
});

// ----------------------------------------------------
// 10. ANALYTICS & SETTINGS
// ----------------------------------------------------
apiRouter.get('/analytics/dashboard', requireTeacherOrAdmin, (req, res) => {
  res.json(db.getAnalyticsSummary());
});

apiRouter.get('/settings', (req, res) => {
  const user = getAuthUser(req);
  const settings = db.getSettings();
  if (user?.role === 'student') {
    return res.json({
      passingScoreThreshold: settings.passingScoreThreshold,
      videoWatchThreshold: settings.videoWatchThreshold,
      enableAiGrading: settings.enableAiGrading,
      schoolName: settings.schoolName,
      googleSheetsConnected: false,
      autoSync: false
    });
  }
  res.json(settings);
});

apiRouter.patch('/settings', requireTeacherOrAdmin, (req, res) => {
  const updates = { ...req.body };
  for (const key of ['passingScoreThreshold', 'videoWatchThreshold'] as const) {
    if (key in updates) {
      const value = Number(updates[key]);
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        return res.status(400).json({ error: `${key} phải nằm trong khoảng 0 đến 100.` });
      }
      updates[key] = value;
    }
  }
  res.json(db.updateSettings(updates));
});
