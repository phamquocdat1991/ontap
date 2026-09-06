import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

process.env.VERCEL = '1';
delete process.env.GEMINI_API_KEY;
delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
delete process.env.GOOGLE_PRIVATE_KEY;

const { createApiApp } = await import('../server/app.js');
const app = createApiApp();
const server = app.listen(0, '127.0.0.1');
await new Promise<void>((resolve, reject) => {
  server.once('listening', resolve);
  server.once('error', reject);
});

const { port } = server.address() as AddressInfo;
const baseUrl = `http://127.0.0.1:${port}`;

async function api(path: string, userId?: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(userId ? { 'x-user-id': userId } : {}),
      ...(init.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

const post = (path: string, userId: string, body: unknown) => api(path, userId, { method: 'POST', body: JSON.stringify(body) });
const patchRequest = (path: string, userId: string, body: unknown) => api(path, userId, { method: 'PATCH', body: JSON.stringify(body) });

try {
  console.log('[TEST] Running api-integration.ts...');

  assert.equal((await api('/health')).status, 200);
  assert.equal((await api('/api/health')).status, 200);
  assert.equal((await api('/api/auth/me')).status, 401);
  assert.equal((await api('/api/auth/me', 'teacher-1')).body.role, 'teacher');

  const studentUsers = await api('/api/users', 'student-3');
  assert.equal(studentUsers.status, 200);
  assert.deepEqual(studentUsers.body.map((user: { id: string }) => user.id), ['student-3']);
  const studentClasses = await api('/api/classes', 'student-3');
  assert.deepEqual(studentClasses.body.map((item: { id: string }) => item.id), ['class-2']);
  assert.equal((await post('/api/classes', 'student-3', { name: 'Không hợp lệ' })).status, 403);

  const suffix = Date.now();
  const draftCourse = await post('/api/courses', 'teacher-1', {
    title: `Khóa nháp ${suffix}`,
    subject: 'Toán học',
    grade: '10',
    bookSeries: 'Kết Nối Tri Thức',
    description: 'Kiểm thử quyền xem',
    status: 'draft'
  });
  assert.equal(draftCourse.status, 200);
  const draftChapter = await post('/api/chapters', 'teacher-1', {
    courseId: draftCourse.body.id,
    title: 'Chương nháp',
    order: 1
  });
  const hiddenLesson = await post('/api/lessons', 'teacher-1', {
    courseId: draftCourse.body.id,
    chapterId: draftChapter.body.id,
    title: 'Bài công bố trong khóa nháp',
    status: 'published'
  });
  await post('/api/practice/quizzes', 'teacher-1', {
    courseId: draftCourse.body.id,
    lessonId: hiddenLesson.body.id,
    title: 'Quiz ẩn',
    questions: [{ id: 'hidden-q', question: 'Ẩn?', type: 'true_false', options: ['Đúng', 'Sai'], correctAnswer: 'Đúng', explanation: 'Ẩn', difficulty: 'nhan_biet', points: 10 }]
  });
  const studentCourses = await api('/api/courses', 'student-3');
  assert.equal(studentCourses.body.some((course: { id: string }) => course.id === draftCourse.body.id), false);
  const studentLessons = await api('/api/lessons', 'student-3');
  assert.equal(studentLessons.body.some((lesson: { id: string }) => lesson.id === hiddenLesson.body.id), false);
  const hiddenQuizzes = await api(`/api/practice/quizzes?lessonId=${hiddenLesson.body.id}`, 'student-3');
  assert.equal(hiddenQuizzes.body.length, 0);
  assert.equal((await api(`/api/materials?lessonId=${hiddenLesson.body.id}`, 'student-3')).status, 403);

  assert.equal((await post('/api/materials/upload', 'teacher-1', {
    lessonId: 'lesson-1', filename: 'Không URL.pdf', type: 'pdf'
  })).status, 400);
  const material = await post('/api/materials/upload', 'teacher-1', {
    lessonId: 'lesson-1', filename: 'Tai-lieu-test.pdf', type: 'pdf', storageUrl: 'https://example.com/tai-lieu.pdf', pageCount: 2, required: false
  });
  assert.equal(material.status, 200);
  assert.equal(material.body.material.storageUrl, 'https://example.com/tai-lieu.pdf');

  const practiceList = await api('/api/practice/quizzes?lessonId=lesson-1', 'student-3');
  assert.equal(practiceList.status, 200);
  assert.equal(practiceList.body[0].questions[0].correctAnswer, undefined);
  assert.equal(practiceList.body[0].questions[0].explanation, undefined);
  const practiceStart = await post('/api/practice/start', 'student-3', { quizId: 'quiz-lesson-1' });
  const practiceResume = await post('/api/practice/start', 'student-3', { quizId: 'quiz-lesson-1' });
  assert.equal(practiceStart.body.id, practiceResume.body.id);
  const practiceSubmit = await post('/api/practice/submit', 'student-3', {
    attemptId: practiceStart.body.id,
    answers: { q1: 'A. AB + BC = AC', q2: 'A. AC', q3: 'Đúng', q4: '  A  ' }
  });
  assert.equal(practiceSubmit.status, 200);
  assert.equal(practiceSubmit.body.attempt.score, 10);
  assert.equal(practiceSubmit.body.attempt.correctCount, 4);
  assert.equal(practiceSubmit.body.attempt.totalQuestions, 4);
  assert.equal(practiceSubmit.body.feedback.q1.correctAnswer, 'A. AB + BC = AC');
  assert.equal((await post('/api/practice/submit', 'student-3', { attemptId: practiceStart.body.id, answers: {} })).status, 409);

  const trackedPage = await post('/api/progress/track', 'student-3', {
    userId: 'student-3', lessonId: 'lesson-1', materialId: 'mat-1', pageViewed: 1, totalPages: 99
  });
  assert.equal(trackedPage.status, 200);
  assert.equal((await post('/api/progress/track', 'student-3', {
    userId: 'student-3', lessonId: 'lesson-1', materialId: 'mat-1', pageViewed: 2, totalPages: 99
  })).status, 400);
  assert.equal((await post('/api/progress/track', 'student-3', {
    userId: 'student-3', lessonId: 'lesson-1', materialId: 'mat-2', videoSegment: [0, 24], totalDuration: 999
  })).status, 400);
  await post('/api/progress/track', 'student-3', {
    userId: 'student-3', lessonId: 'lesson-1', materialId: 'mat-2', videoSegment: [0, 12], totalDuration: 999
  });
  const completedProgress = await post('/api/progress/track', 'student-3', {
    userId: 'student-3', lessonId: 'lesson-1', materialId: 'mat-2', videoSegment: [12, 24], totalDuration: 999
  });
  assert.equal(completedProgress.body.percentage, 100);
  assert.equal(completedProgress.body.isCompleted, true);
  assert.equal(completedProgress.body.materialProgress['mat-1'].viewedPages.length, 1);

  const studentExam = await api('/api/exams/exam-1', 'student-3');
  assert.equal(studentExam.status, 200);
  assert.equal(studentExam.body.questions[0].correctAnswer, '');
  assert.equal(studentExam.body.questions[3].rubric, '');
  const examStart = await post('/api/exams/start', 'student-3', { examId: 'exam-1' });
  const examResume = await post('/api/exams/start', 'student-3', { examId: 'exam-1' });
  assert.equal(examStart.body.id, examResume.body.id);
  const examSubmit = await post('/api/exams/submit', 'student-3', {
    attemptId: examStart.body.id,
    answers: {
      eq1: 'A. (3; -1)',
      eq2: 'A. GA + GB + GC = 0',
      eq3: ' 6 ',
      eq4: 'Trình bày lời giải có lập luận nhưng cần giáo viên duyệt.'
    }
  });
  assert.equal(examSubmit.status, 200);
  assert.equal(examSubmit.body.score, 7.5);
  assert.equal(examSubmit.body.status, 'needs_review');
  assert.equal(examSubmit.body.essayEvaluations.eq4.confidence, 0);
  assert.equal((await post('/api/exams/submit', 'student-3', { attemptId: examStart.body.id, answers: {} })).status, 409);
  const completedStart = await post('/api/exams/start', 'student-3', { examId: 'exam-1' });
  assert.equal(completedStart.body.id, examStart.body.id);
  assert.equal(completedStart.body.status, 'needs_review');

  assert.equal((await patchRequest(`/api/exams/attempts/${examStart.body.id}/review`, 'teacher-1', { score: 11 })).status, 400);
  const reviewed = await patchRequest(`/api/exams/attempts/${examStart.body.id}/review`, 'teacher-1', {
    score: 9, teacherNotes: 'Đã đối chiếu rubric.'
  });
  assert.equal(reviewed.status, 200);
  assert.equal(reviewed.body.status, 'graded');
  assert.equal(reviewed.body.teacherNotes, 'Đã đối chiếu rubric.');

  const studentSettings = await api('/api/settings', 'student-3');
  assert.equal(studentSettings.status, 200);
  assert.equal(studentSettings.body.spreadsheetId, undefined);
  assert.equal((await patchRequest('/api/settings', 'student-3', { passingScoreThreshold: 0 })).status, 403);
  assert.equal((await patchRequest('/api/settings', 'teacher-1', { passingScoreThreshold: 101 })).status, 400);

  const aiWithoutKey = await post('/api/ai/generate-practice', 'teacher-1', {
    lessonTitle: 'Vectơ', subject: 'Toán', grade: '10', lessonContent: 'Nội dung', questionCount: 2
  });
  assert.equal(aiWithoutKey.status, 503);
  assert.match(aiWithoutKey.body.error, /GEMINI_API_KEY/);

  const analytics = await api('/api/analytics/dashboard', 'teacher-1');
  assert.equal(analytics.status, 200);
  assert.equal(typeof analytics.body.averageCompletionRate, 'number');
  assert.ok(Array.isArray(analytics.body.mostFailedQuestions));

  console.log('[PASS] api-integration.ts completed successfully.');
} finally {
  await new Promise<void>(resolve => server.close(() => resolve()));
}
