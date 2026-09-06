import { GoogleAuth } from 'google-auth-library';
import { db } from './db.js';
import type { SheetSyncLog, SheetSyncRow, ExamAttempt, PracticeAttempt } from '../src/types/index.js';

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

function getGoogleCredentials() {
  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (rawServiceAccount) {
    try {
      return JSON.parse(rawServiceAccount);
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON không phải JSON hợp lệ.');
    }
  }

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;
  const projectId = process.env.GOOGLE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  if (!clientEmail || !privateKey) return undefined;

  return {
    client_email: clientEmail,
    private_key: privateKey.replace(/\\n/g, '\n'),
    project_id: projectId
  };
}

function rowValues(row: SheetSyncRow) {
  return [
    row.timestamp,
    row.studentId,
    row.studentName,
    row.className,
    row.subject,
    row.chapter,
    row.lesson,
    row.assessmentType,
    row.attempt,
    row.correct,
    row.incorrect,
    row.score,
    row.duration,
    row.lessonProgress,
    row.submissionId
  ];
}

async function appendRow(row: SheetSyncRow) {
  const settings = db.getSettings();
  if (!settings.googleSheetsConnected || !settings.spreadsheetId) {
    throw new Error('Chưa cấu hình Spreadsheet ID trong phần cài đặt.');
  }

  const credentials = getGoogleCredentials();
  if (!credentials) {
    throw new Error('Chưa cấu hình tài khoản dịch vụ Google Sheets trên máy chủ.');
  }

  const range = process.env.GOOGLE_SHEETS_RANGE || 'BangDiem!A:O';
  const auth = new GoogleAuth({ credentials, scopes: [SHEETS_SCOPE] });
  const client = await auth.getClient();
  await client.request({
    url: `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(settings.spreadsheetId)}/values/${encodeURIComponent(range)}:append`,
    method: 'POST',
    params: { valueInputOption: 'USER_ENTERED', insertDataOption: 'INSERT_ROWS' },
    data: { values: [rowValues(row)] }
  });
}

function durationLabel(durationSeconds?: number) {
  const total = Math.max(0, Math.round(durationSeconds || 0));
  return `${Math.floor(total / 60)} phút ${total % 60} giây`;
}

function newSubmissionId(prefix: 'EXAM' | 'PRAC') {
  return `SUB-${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
}

async function syncRow(
  row: SheetSyncRow,
  details: Pick<SheetSyncLog, 'attemptId' | 'studentId' | 'studentName' | 'className' | 'subject' | 'chapter' | 'lessonTitle' | 'assessmentType' | 'attemptNumber' | 'correct' | 'incorrect' | 'score' | 'duration' | 'lessonProgress'>
) {
  const log: SheetSyncLog = {
    id: `sync-log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    submissionId: row.submissionId,
    ...details,
    status: 'pending',
    syncedAt: new Date().toISOString()
  };
  db.addSheetSyncLog(log);

  try {
    await appendRow(row);
    return db.updateSheetSyncLog(log.id, {
      status: 'success', errorMsg: undefined, syncedAt: new Date().toISOString()
    }) || log;
  } catch (error) {
    return db.updateSheetSyncLog(log.id, {
      status: 'failed',
      errorMsg: error instanceof Error ? error.message : 'Không thể ghi dữ liệu vào Google Sheets.',
      syncedAt: new Date().toISOString()
    }) || log;
  }
}

export class GoogleSheetsService {
  public static async syncExamAttempt(attempt: ExamAttempt, studentId: string): Promise<SheetSyncLog> {
    const student = db.getUserById(studentId);
    const exam = db.getExamById(attempt.examId);
    const course = exam ? db.getCourseById(exam.courseId) : undefined;
    const progress = db.getUserProgressList(studentId);
    const avgProgress = progress.length
      ? Math.round(progress.reduce((sum, item) => sum + item.percentage, 0) / progress.length)
      : 0;
    const submissionId = newSubmissionId('EXAM');
    const row: SheetSyncRow = {
      timestamp: new Date().toISOString(),
      studentId,
      studentName: student?.fullName || attempt.studentName || 'Học sinh',
      className: student?.className || attempt.className || '',
      subject: course?.subject || '',
      chapter: exam?.scope || '',
      lesson: exam?.title || 'Đề kiểm tra',
      assessmentType: 'Exam',
      attempt: 1,
      correct: attempt.correctCount || 0,
      incorrect: attempt.incorrectCount || 0,
      score: attempt.score || 0,
      duration: durationLabel(attempt.durationSeconds),
      lessonProgress: `${avgProgress}%`,
      submissionId
    };

    const log = await syncRow(row, {
      attemptId: attempt.id,
      studentId: row.studentId,
      studentName: row.studentName,
      className: row.className,
      subject: row.subject,
      chapter: row.chapter,
      lessonTitle: row.lesson,
      assessmentType: 'Exam',
      attemptNumber: 1,
      correct: row.correct,
      incorrect: row.incorrect,
      score: row.score,
      duration: row.duration,
      lessonProgress: row.lessonProgress
    });

    db.updateExamAttempt(attempt.id, { syncStatus: log.status === 'success' ? 'success' : 'failed' });
    return log;
  }

  public static async syncPracticeAttempt(attempt: PracticeAttempt, studentId: string): Promise<SheetSyncLog> {
    const student = db.getUserById(studentId);
    const quiz = db.getPracticeQuizById(attempt.quizId);
    const lesson = quiz ? db.getLessonById(quiz.lessonId) : undefined;
    const course = lesson ? db.getCourseById(lesson.courseId) : undefined;
    const progress = lesson ? db.getLessonProgress(studentId, lesson.id) : undefined;
    const correct = attempt.correctCount || 0;
    const total = attempt.totalQuestions || quiz?.questions.length || 0;
    const submissionId = newSubmissionId('PRAC');
    const row: SheetSyncRow = {
      timestamp: new Date().toISOString(),
      studentId,
      studentName: student?.fullName || attempt.studentName || 'Học sinh',
      className: student?.className || '',
      subject: course?.subject || '',
      chapter: 'Luyện tập bài học',
      lesson: lesson?.title || quiz?.title || 'Bài luyện tập',
      assessmentType: 'Practice',
      attempt: attempt.attemptNumber,
      correct,
      incorrect: Math.max(0, total - correct),
      score: attempt.score || 0,
      duration: durationLabel(attempt.durationSeconds),
      lessonProgress: `${progress?.percentage || 0}%`,
      submissionId
    };

    return syncRow(row, {
      attemptId: attempt.id,
      studentId: row.studentId,
      studentName: row.studentName,
      className: row.className,
      subject: row.subject,
      chapter: row.chapter,
      lessonTitle: row.lesson,
      assessmentType: 'Practice',
      attemptNumber: attempt.attemptNumber,
      correct: row.correct,
      incorrect: row.incorrect,
      score: row.score,
      duration: row.duration,
      lessonProgress: row.lessonProgress
    });
  }

  public static async retrySync(logId: string): Promise<SheetSyncLog | undefined> {
    const target = db.getSheetSyncLogs().find(log => log.id === logId);
    if (!target) return undefined;
    const row: SheetSyncRow = {
      timestamp: new Date().toISOString(),
      studentId: target.studentId,
      studentName: target.studentName,
      className: target.className,
      subject: target.subject,
      chapter: target.chapter,
      lesson: target.lessonTitle,
      assessmentType: target.assessmentType,
      attempt: target.attemptNumber,
      correct: target.correct,
      incorrect: target.incorrect,
      score: target.score,
      duration: target.duration,
      lessonProgress: target.lessonProgress,
      submissionId: target.submissionId
    };

    try {
      await appendRow(row);
      const updated = db.updateSheetSyncLog(logId, {
        status: 'success', errorMsg: undefined, syncedAt: new Date().toISOString()
      });
      if (updated?.assessmentType === 'Exam') db.updateExamAttempt(updated.attemptId, { syncStatus: 'success' });
      return updated;
    } catch (error) {
      const updated = db.updateSheetSyncLog(logId, {
        status: 'failed',
        errorMsg: error instanceof Error ? error.message : 'Không thể ghi dữ liệu vào Google Sheets.',
        syncedAt: new Date().toISOString()
      });
      if (updated?.assessmentType === 'Exam') db.updateExamAttempt(updated.attemptId, { syncStatus: 'failed' });
      return updated;
    }
  }
}
