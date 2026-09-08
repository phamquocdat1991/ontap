import { GoogleGenAI, Type } from '@google/genai';
import type { LessonContentAI, Question, ExamMatrix, EssayGradingResult } from '../src/types/index.js';

// Lazy client initialization for Gemini API with user agent
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Chưa cấu hình GEMINI_API_KEY trên máy chủ; hệ thống không sinh nội dung mẫu để tránh sai kiến thức.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

const RESILIENT_MODELS = [
  { model: process.env.GEMINI_MODEL || 'gemini-3.8-flash', timeoutMs: 12000 },
  { model: 'gemini-3.7-flash', timeoutMs: 10000 },
  { model: 'gemini-3.6-flash', timeoutMs: 10000 },
  { model: 'gemini-3.5-flash-lite', timeoutMs: 8000 },
];

async function generateContentResilient(contents: string | any[], config: any = {}) {
  const ai = getAiClient();
  let lastError: any = null;

  for (const candidate of RESILIENT_MODELS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error(`Timeout sau ${candidate.timeoutMs}ms`)), candidate.timeoutMs);
    try {
      const response = await ai.models.generateContent({
        model: candidate.model,
        contents,
        config: {
          ...config,
          abortSignal: controller.signal,
        },
      });
      clearTimeout(timer);
      if (response?.text) return response;
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err;
      console.warn(`[Ontap Resilience] Model ${candidate.model} gặp sự cố (${err?.message}), chuyển sang model dự phòng tiếp theo...`);
    }
  }

  throw lastError || new Error('Tất cả các model Gemini dự phòng đều không phản hồi.');
}

export interface GenerateLessonInput {
  subject: string;
  grade: string;
  bookSeries: string;
  chapter: string;
  lesson: string;
  learningObjectives?: string;
  duration?: number;
  teacherNotes?: string;
}

/**
 * 1. AI Lesson Knowledge Generator (Vietnamese Curriculum standard)
 */
export async function generateLessonKnowledge(input: GenerateLessonInput): Promise<LessonContentAI> {
  const gradeNum = parseInt(input.grade, 10);
  const isPrimary = !isNaN(gradeNum) && gradeNum >= 1 && gradeNum <= 5;
  const isSecondary = !isNaN(gradeNum) && gradeNum >= 6 && gradeNum <= 9;
  const levelName = isPrimary ? 'Cấp Tiểu học (Lớp 1-5)' : isSecondary ? 'Cấp THCS (Lớp 6-9)' : 'Cấp THPT (Lớp 10-12)';

  const prompt = `
Bạn là chuyên gia sư phạm hàng đầu của Bộ GD&ĐT Việt Nam, am hiểu sâu sắc chương trình Giáo dục phổ thông 2018 (GDPT 2018) cho TOÀN BỘ CÁC CẤP HỌC (Tiểu học, THCS, THPT) và TẤT CẢ CÁC MÔN HỌC.
Hãy tạo nội dung kiến thức trọng tâm cho bài học sau:
- Cấp học: ${levelName}
- Môn học: ${input.subject}
- Khối lớp: ${input.grade}
- Bộ sách giáo khoa: ${input.bookSeries}
- Tên chương / chủ đề: ${input.chapter}
- Tên bài học: ${input.lesson}
- Mục tiêu cần đạt (YCCĐ): ${input.learningObjectives || 'Theo chuẩn chương trình GDPT 2018'}
- Thời lượng: ${input.duration || 45} phút
- Ghi chú từ giáo viên: ${input.teacherNotes || 'Không có'}

Đặc thù sư phạm theo cấp học:
${isPrimary ? '- TIỂU HỌC: Ngôn ngữ trong sáng, gần gũi, ấm áp; ví dụ gắn liền với đồ vật, con vật, câu chuyện, tranh ảnh quen thuộc; giải thích từng bước đơn giản; công thức nếu có thì viết dưới dạng quy tắc trực quan; câu hỏi kiểm tra nhẹ nhàng, kích thích hứng thú khám phá.' : isSecondary ? '- THCS: Ngôn ngữ chuẩn xác, phát triển tư duy logic, bước đầu suy luận trừu tượng; các môn tích hợp (KHTN, Lịch sử & Địa lí) cần gắn kết thực tế; phương pháp giải có căn cứ rõ ràng.' : '- THPT: Ngôn ngữ học thuật chuẩn mực, tư duy phản biện và mô hình hóa; gắn liền định hướng thi Tốt nghiệp THPT và ĐGNL; đào sâu bản chất toán học/khoa học/xã hội.'}

Yêu cầu đầu ra:
Nội dung giáo dục sư phạm được tổng hợp súc tích, chuẩn mực, giàu tính trực quan, không giả vờ trích nguyên văn sách giáo khoa mà tổng hợp cô đọng theo phương pháp dạy học phát triển phẩm chất, năng lực.
Hãy trả về JSON theo đúng định dạng sau:
{
  "title": "Tên bài học chuẩn",
  "objectives": ["Mục tiêu 1", "Mục tiêu 2", "Mục tiêu 3"],
  "keyKnowledge": ["Kiến thức trọng tâm 1", "Kiến thức trọng tâm 2", "Kiến thức trọng tâm 3"],
  "concepts": [
    { "term": "Tên khái niệm / thuật ngữ", "definition": "Định nghĩa chuẩn xác, dễ hiểu" }
  ],
  "formulas": [
    { "name": "Tên công thức / quy tắc ghi nhớ", "formula": "Biểu thức hoặc quy tắc thực hiện", "note": "Điều kiện áp dụng hoặc lời khuyên ghi nhớ" }
  ],
  "examples": [
    { "question": "Đề bài ví dụ minh họa điển hình", "solution": "Lời giải từng bước chi tiết", "explanation": "Nhận xét phương pháp giải và lưu ý sư phạm" }
  ],
  "commonMistakes": [
    { "mistake": "Lỗi sai học sinh hay mắc phải", "correction": "Cách làm / sửa đúng", "advice": "Lời khuyên ghi nhớ tránh bẫy" }
  ],
  "quickCheck": [
    { "question": "Câu hỏi kiểm tra nhanh kiến thức vừa học", "options": ["A. Lựa chọn 1", "B. Lựa chọn 2", "C. Lựa chọn 3", "D. Lựa chọn 4"], "answer": "A. Lựa chọn 1", "hint": "Gợi ý tư duy sư phạm" }
  ],
  "summary": "Đoạn văn tóm tắt cô đọng 2-3 câu về giá trị cốt lõi của bài học."
}
`;

  try {
    if (process.env.GEMINI_API_KEY) {
      const response = await generateContentResilient(prompt, {
        responseMimeType: 'application/json',
        systemInstruction: 'Bạn là chuyên gia EdTech và sư phạm phổ thông Việt Nam. Hãy luôn trả về định dạng JSON hợp lệ.',
      });

      if (response.text) {
        const parsed = JSON.parse(response.text.trim());
        if (!parsed?.title || !Array.isArray(parsed.objectives) || !Array.isArray(parsed.keyKnowledge)) {
          throw new Error('Gemini trả về bài học thiếu các trường bắt buộc.');
        }
        return parsed as LessonContentAI;
      }
    }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Gemini không trả về bài học hợp lệ.');
  }

  throw new Error('Gemini không trả về bài học hợp lệ.');
  /* istanbul ignore next -- legacy sample retained only as documentation, never returned */
  return {
    title: `${input.lesson} - ${input.subject} ${input.grade} (${input.bookSeries})`,
    objectives: [
      `Nhận biết và nắm vững các định nghĩa, tính chất cốt lõi của ${input.lesson}.`,
      `Hiểu bản chất và vận dụng thành thạo các quy tắc tính toán/phân tích vào giải bài tập.`,
      `Hình thành năng lực giải quyết vấn đề và tư duy logic môn ${input.subject}.`
    ],
    keyKnowledge: [
      `Khái niệm và nền tảng cốt lõi của ${input.lesson} trong chương trình ${input.subject} ${input.grade}.`,
      `Mối liên hệ giữa lý thuyết và các dạng bài tập thực tiễn.`,
      `Các quy tắc biến đổi và định lý then chốt cần ghi nhớ.`
    ],
    concepts: [
      { term: `Khái niệm then chốt 1`, definition: `Nội dung định nghĩa cơ bản giúp học sinh hiểu đúng bản chất môn ${input.subject}.` },
      { term: `Khái niệm then chốt 2`, definition: `Quy tắc nhận biết và phân biệt với các khái niệm liên quan trong bài.` }
    ],
    formulas: [
      { name: `Công thức định lý cơ bản`, formula: `A + B = C (hoặc biểu thức tương đương)`, note: `Áp dụng trong điều kiện tiêu chuẩn môn ${input.subject}` }
    ],
    examples: [
      {
        question: `Ví dụ áp dụng trọng tâm cho ${input.lesson}: Cho dữ kiện cơ bản, yêu cầu tính toán và chứng minh.`,
        solution: `Bước 1: Tóm tắt giả thiết và vẽ hình/lập luận.\nBước 2: Áp dụng công thức và quy tắc chuẩn.\nBước 3: Kết luận nghiệm và đối chiếu điều kiện.`,
        explanation: `Phương pháp này giúp tránh nhầm lẫn dấu và sai sót tính toán.`
      }
    ],
    commonMistakes: [
      {
        mistake: `Quên xét điều kiện xác định hoặc điều kiện dấu.`,
        correction: `Luôn đặt điều kiện ngay ở dòng đầu tiên trước khi giải.`,
        advice: `Ghi nhớ câu 'Điều kiện là bước số 1'.`
      }
    ],
    quickCheck: [
      {
        question: `Khẳng định nào sau đây là ĐÚNG nhất về nội dung vừa học?`,
        options: ['A. Khẳng định đúng theo định lý chuẩn', 'B. Khẳng định sai vì thiếu điều kiện', 'C. Khẳng định ngược lại với lý thuyết', 'D. Tất cả đều sai'],
        answer: 'A. Khẳng định đúng theo định lý chuẩn',
        hint: 'Xem lại phần định nghĩa then chốt ở trên.'
      }
    ],
    summary: `Bài học ${input.lesson} cung cấp công cụ tư duy quan trọng, là nền tảng để tiếp cận các chuyên đề nâng cao tiếp theo của môn ${input.subject} ${input.grade}.`
  };
}

/**
 * 2. AI Practice Quiz Generator with Hints & Explanations
 */
export async function generatePracticeQuiz(
  lessonTitle: string,
  subject: string,
  grade: string,
  lessonContent: string,
  questionCount: number = 4
): Promise<Question[]> {
  const gradeNum = parseInt(grade, 10);
  const isPrimary = !isNaN(gradeNum) && gradeNum >= 1 && gradeNum <= 5;
  const isSecondary = !isNaN(gradeNum) && gradeNum >= 6 && gradeNum <= 9;
  const levelPedagogy = isPrimary 
    ? 'Học sinh Tiểu học (Lớp 1-5): Đề bài ngắn gọn, trực quan, dễ hiểu, gắn liền hình ảnh/đời thường. Gợi ý 1 và 2 dễ thương, định hướng dịu dàng.'
    : isSecondary
    ? 'Học sinh THCS (Lớp 6-9): Câu hỏi phát triển năng lực tư duy, gắn thực tiễn, phân biệt rõ các mức độ nhận thức.'
    : 'Học sinh THPT (Lớp 10-12): Câu hỏi phân hóa rõ ràng theo chuẩn 4 mức độ của Bộ GD&ĐT, rèn luyện kỹ năng làm bài thi định kỳ và tốt nghiệp.';

  const prompt = `
Bạn là giáo viên giàu kinh nghiệm môn ${subject} lớp ${grade}.
Dựa trên kiến thức bài học: "${lessonTitle}" và nội dung:
${lessonContent}

Đặc thù đối tượng học sinh:
${levelPedagogy}

Hãy tạo ${questionCount} câu hỏi luyện tập chất lượng cao cho học sinh.
Bao gồm các dạng: trắc nghiệm 4 lựa chọn (multiple_choice), đúng/sai (true_false), và trả lời ngắn (short_answer).
Mỗi câu hỏi PHẢI có:
1. question (Đề bài rõ ràng, sư phạm)
2. type (multiple_choice, true_false, hoặc short_answer)
3. options (Mảng 4 phương án dạng ['A. ...', 'B. ...', 'C. ...', 'D. ...'] đối với multiple_choice, ['Đúng', 'Sai'] đối với true_false, không cần đối với short_answer)
4. correctAnswer (Đáp án chuẩn xác)
5. explanation (Giải thích cặn kẽ vì sao đúng, vì sao các phương án khác sai)
6. hint1 (Gợi ý cấp độ 1: Định hướng tư duy, không tiết lộ đáp án)
7. hint2 (Gợi ý cấp độ 2: Chỉ ra công thức/quy tắc cụ thể để học sinh tự làm lại)
8. difficulty ('nhan_biet' | 'thong_hieu' | 'van_dung' | 'van_dung_cao')
9. learningObjective (Yêu cầu cần đạt)
10. points (Điểm số, ví dụ: 2.5)

Trả về mảng JSON câu hỏi.
`;

  try {
    if (process.env.GEMINI_API_KEY) {
      const response = await generateContentResilient(prompt, {
        responseMimeType: 'application/json',
        systemInstruction: 'Bạn là chuyên gia khảo thí và sư phạm Việt Nam. Trả về đúng mảng JSON các câu hỏi.',
      });

      if (response.text) {
        const list = JSON.parse(response.text.trim());
        const questions = Array.isArray(list) ? list : list.questions;
        if (!Array.isArray(questions) || questions.length === 0) {
          throw new Error('Gemini không trả về danh sách câu hỏi.');
        }
        return questions.map((q: any, idx: number) => {
          if (!q?.question || !['multiple_choice', 'true_false', 'short_answer'].includes(q?.type) || !q?.correctAnswer || !q?.explanation) {
            throw new Error(`Câu hỏi ${idx + 1} thiếu đề bài, loại, đáp án hoặc lời giải.`);
          }
          if (['multiple_choice', 'true_false'].includes(q.type) && (!Array.isArray(q.options) || q.options.length < 2)) {
            throw new Error(`Câu hỏi ${idx + 1} thiếu các phương án lựa chọn.`);
          }
          return {
          id: `q_ai_${Date.now()}_${idx + 1}`,
          question: q.question,
          type: q.type,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          hint1: q.hint1,
          hint2: q.hint2,
          difficulty: q.difficulty || 'thong_hieu',
          learningObjective: q.learningObjective || '',
          points: q.points || (10 / questionCount)
          } as Question;
        });
      }
    }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Gemini không trả về bộ câu hỏi hợp lệ.');
  }

  throw new Error('Gemini không trả về bộ câu hỏi hợp lệ.');
  /* istanbul ignore next -- legacy sample retained only as documentation, never returned */
  return [
    {
      id: `q_fb_1`,
      question: `Theo nội dung bài học "${lessonTitle}", khẳng định nào sau đây là ĐÚNG?`,
      type: 'multiple_choice',
      options: [
        'A. Định nghĩa và tính chất cơ bản được thỏa mãn.',
        'B. Định nghĩa chỉ đúng trong một trường hợp đặc biệt.',
        'C. Không áp dụng được cho bài toán tổng quát.',
        'D. Cả A, B, C đều sai.'
      ],
      correctAnswer: 'A. Định nghĩa và tính chất cơ bản được thỏa mãn.',
      explanation: 'Khẳng định A đúng trực tiếp theo định lý nền tảng trong bài giảng.',
      hint1: 'Quan sát các điều kiện cần và đủ trong phần lý thuyết trọng tâm.',
      hint2: 'So sánh với quy tắc tổng quát môn ' + subject,
      difficulty: 'nhan_biet',
      learningObjective: 'Nhận biết khái niệm trọng tâm',
      points: 2.5
    },
    {
      id: `q_fb_2`,
      question: `Cho mệnh đề: "Các tính chất của ${lessonTitle} luôn bảo toàn khi chuyển sang hệ quy chiếu mới". Mệnh đề này Đúng hay Sai?`,
      type: 'true_false',
      options: ['Đúng', 'Sai'],
      correctAnswer: 'Đúng',
      explanation: 'Tính chất bất biến được đảm bảo theo tiên đề nền tảng.',
      hint1: 'Hãy xem lại tính chất bất biến trong tài liệu học tập.',
      hint2: 'Tính chất này đúng cho mọi hệ quy chiếu quán tính.',
      difficulty: 'thong_hieu',
      learningObjective: 'Hiểu tính chất cơ bản',
      points: 2.5
    },
    {
      id: `q_fb_3`,
      question: `Khi áp dụng quy tắc vào tính toán bài toán ${lessonTitle}, bước đầu tiên quan trọng nhất là gì?`,
      type: 'multiple_choice',
      options: [
        'A. Xác định rõ điều kiện và giả thiết bài toán',
        'B. Tính toán ngay kết quả cuối cùng',
        'C. Bỏ qua các bước vẽ hình',
        'D. Chọn đại một công thức bất kì'
      ],
      correctAnswer: 'A. Xác định rõ điều kiện và giả thiết bài toán',
      explanation: 'Xác định rõ điều kiện và giả thiết là bước then chốt giúp định hướng đúng phương pháp.',
      hint1: 'Một bài toán muốn giải đúng thì bước đầu tiên luôn là gì?',
      hint2: 'Không thể tính toán nếu chưa phân tích giả thiết và điều kiện xác định.',
      difficulty: 'thong_hieu',
      learningObjective: 'Vận dụng phương pháp giải bài',
      points: 2.5
    },
    {
      id: `q_fb_4`,
      question: `Hãy nêu tên đại lượng hoặc kết quả thu được khi thực hiện phép biến đổi cơ bản trong ${lessonTitle} (Nhập ngắn gọn 1-3 từ):`,
      type: 'short_answer',
      correctAnswer: 'Đại lượng chuẩn',
      explanation: 'Đại lượng chuẩn là kết quả bất biến cần tìm.',
      hint1: 'Nhớ lại tên gọi của đại lượng đặc trưng trong bài học.',
      hint2: 'Tham khảo mục công thức trọng tâm.',
      difficulty: 'van_dung',
      learningObjective: 'Ghi nhớ thuật ngữ chuyên môn',
      points: 2.5
    }
  ];
}

/**
 * 3. AI Exam Matrix & Specification Generator (Thông tư BGDĐT)
 */
export async function generateExamMatrix(params: {
  subject: string;
  grade: string;
  scope: string;
  durationMinutes: number;
  totalScore: number;
  questionCount: number;
  examType: string;
}): Promise<ExamMatrix> {
  const prompt = `
Bạn là chuyên gia xây dựng ma trận đề kiểm tra đánh giá theo Thông tư của Bộ GD&ĐT Việt Nam (GDPT 2018).
Hãy tạo Ma trận Đề kiểm tra chuẩn:
- Môn học: ${params.subject}
- Khối lớp: ${params.grade}
- Phạm vi kiến thức: ${params.scope}
- Thời gian làm bài: ${params.durationMinutes} phút
- Tổng điểm: ${params.totalScore}
- Tổng số câu: ${params.questionCount}
- Loại đề: ${params.examType} (chapter_review / midterm / final)

Yêu cầu phân bổ tỉ lệ 4 mức độ nhận thức:
- Nhận biết (khoảng 30-40% tổng điểm)
- Thông hiểu (khoảng 30% tổng điểm)
- Vận dụng (khoảng 20% tổng điểm)
- Vận dụng cao (khoảng 10% tổng điểm)

Trả về JSON cấu trúc sau:
{
  "subject": "${params.subject}",
  "grade": "${params.grade}",
  "examType": "${params.examType}",
  "durationMinutes": ${params.durationMinutes},
  "totalScore": ${params.totalScore},
  "questionCount": ${params.questionCount},
  "summaryNote": "Ghi chú tóm tắt cấu trúc ma trận và định hướng đánh giá năng lực.",
  "cells": [
    {
      "chapter": "Tên chủ đề / chương 1",
      "nhanBiet": { "countMC": 2, "countEssay": 0, "points": 2.0 },
      "thongHieu": { "countMC": 1, "countEssay": 0, "points": 1.5 },
      "vanDung": { "countMC": 1, "countEssay": 0, "points": 1.5 },
      "vanDungCao": { "countMC": 0, "countEssay": 1, "points": 2.0 },
      "totalPoints": 7.0
    }
  ]
}
`;

  try {
    if (process.env.GEMINI_API_KEY) {
      const response = await generateContentResilient(prompt, {
        responseMimeType: 'application/json',
      });

      if (response.text) {
        const parsed = JSON.parse(response.text.trim());
        if (!Array.isArray(parsed?.cells) || parsed.cells.length === 0) {
          throw new Error('Gemini trả về ma trận thiếu các ô phân bổ nội dung.');
        }
        return parsed as ExamMatrix;
      }
    }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Gemini không trả về ma trận hợp lệ.');
  }

  throw new Error('Gemini không trả về ma trận hợp lệ.');
  /* istanbul ignore next -- legacy sample retained only as documentation, never returned */
  return {
    subject: params.subject,
    grade: params.grade,
    examType: params.examType as any,
    durationMinutes: params.durationMinutes,
    totalScore: params.totalScore,
    questionCount: params.questionCount,
    summaryNote: `Ma trận đề kiểm tra môn ${params.subject} ${params.grade} (${params.durationMinutes} phút) theo định hướng đánh giá năng lực học sinh. Tỉ lệ 40% Nhận biết, 30% Thông hiểu, 20% Vận dụng, 10% Vận dụng cao.`,
    cells: [
      {
        chapter: params.scope || 'Nội dung kiến thức trọng tâm',
        nhanBiet: { countMC: Math.ceil(params.questionCount * 0.4), countEssay: 0, points: 3.5 },
        thongHieu: { countMC: Math.floor(params.questionCount * 0.3), countEssay: 0, points: 3.0 },
        vanDung: { countMC: Math.floor(params.questionCount * 0.2), countEssay: 0, points: 2.0 },
        vanDungCao: { countMC: 0, countEssay: 1, points: 1.5 },
        totalPoints: params.totalScore
      }
    ]
  };
}

/**
 * 4. AI Exam Generator from Approved Matrix
 */
export async function generateExamFromApprovedMatrix(matrix: ExamMatrix, scope: string): Promise<{
  questions: Question[];
  rubric: string;
  scoringGuide: string;
  specification: string;
}> {
  const prompt = `
Bạn là Hội đồng khảo thí ra đề thi môn ${matrix.subject} lớp ${matrix.grade}.
Dựa trên Ma trận Đề kiểm tra đã được phê duyệt:
- Phạm vi: ${scope}
- Thời gian: ${matrix.durationMinutes} phút
- Tổng điểm: ${matrix.totalScore} điểm
- Số lượng câu hỏi: ${matrix.questionCount} câu
- Chi tiết ma trận: ${JSON.stringify(matrix.cells)}

Hãy tạo Đề thi chính thức với:
1. Danh sách câu hỏi (questions) bám sát đúng từng mức độ nhận thức trong ma trận. Bao gồm Trắc nghiệm khách quan và Tự luận (nếu có câu vận dụng cao).
2. Đáp án chính thức và giải thích chi tiết (explanation).
3. Hướng dẫn chấm tự luận / Rubric chi tiết từng bước (rubric).
4. Hướng dẫn phân bổ điểm tổng (scoringGuide).
5. Bản đặc tả ma trận đề thi (specification).

Trả về JSON định dạng:
{
  "specification": "Bản đặc tả chi tiết câu hỏi theo chuẩn GDPT 2018...",
  "rubric": "Tiêu chí chấm tự luận và thang điểm chi tiết từng bước...",
  "scoringGuide": "Hướng dẫn chấm thi cho giáo viên...",
  "questions": [
    {
      "id": "eq_1",
      "question": "Nội dung câu hỏi",
      "type": "multiple_choice",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correctAnswer": "A. ...",
      "explanation": "Lời giải chi tiết",
      "difficulty": "nhan_biet",
      "learningObjective": "Nhận biết kiến thức...",
      "points": 2.5
    }
  ]
}
`;

  try {
    if (process.env.GEMINI_API_KEY) {
      const response = await generateContentResilient(prompt, {
        responseMimeType: 'application/json',
      });

      if (response.text) {
        const parsed = JSON.parse(response.text.trim());
        if (!Array.isArray(parsed?.questions) || parsed.questions.length === 0) {
          throw new Error('Gemini không trả về danh sách câu hỏi cho đề thi.');
        }
        return {
          questions: parsed.questions.map((q: any, idx: number) => {
            if (!q?.question || !['multiple_choice', 'true_false', 'short_answer', 'essay'].includes(q?.type) || !q?.correctAnswer || !q?.explanation) {
              throw new Error(`Câu thi ${idx + 1} thiếu dữ liệu bắt buộc.`);
            }
            if (['multiple_choice', 'true_false'].includes(q.type) && (!Array.isArray(q.options) || q.options.length < 2)) {
              throw new Error(`Câu thi ${idx + 1} thiếu các phương án lựa chọn.`);
            }
            return {
            id: `eq_gen_${Date.now()}_${idx + 1}`,
            question: q.question,
            type: q.type,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            difficulty: q.difficulty || 'thong_hieu',
            learningObjective: q.learningObjective || '',
            points: q.points || (matrix.totalScore / matrix.questionCount)
            } as Question;
          }),
          rubric: parsed.rubric || '',
          scoringGuide: parsed.scoringGuide || '',
          specification: parsed.specification || ''
        };
      }
    }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Gemini không trả về đề thi hợp lệ.');
  }

  throw new Error('Gemini không trả về đề thi hợp lệ.');
  /* istanbul ignore next -- legacy sample retained only as documentation, never returned */
  const pointsPerQ = Math.round((matrix.totalScore / matrix.questionCount) * 10) / 10;
  return {
    specification: `Bản đặc tả đề thi môn ${matrix.subject} ${matrix.grade} (${scope}). Kiểm tra khả năng nhận diện định nghĩa, vận dụng công thức và tư duy giải quyết vấn đề thực tế.`,
    rubric: `Câu tự luận: \n- Nêu đúng giả thiết và hướng biến đổi: 30% số điểm\n- Lập luận logic và thực hiện phép toán chính xác: 50% số điểm\n- Kết luận và biện luận: 20% số điểm`,
    scoringGuide: `Điểm số = Điểm trắc nghiệm (chấm deterministic) + Điểm tự luận (chấm theo Rubric từng bước).`,
    questions: [
      {
        id: `eq_fb_1`,
        question: `Câu 1 [Nhận biết]: Trong chương trình ${matrix.subject} ${matrix.grade}, phát biểu nào sau đây là ĐÚNG nhất về ${scope}?`,
        type: 'multiple_choice',
        options: [
          'A. Đại lượng cơ bản bảo toàn trong hệ cô lập',
          'B. Đại lượng thay đổi tùy ý không phụ thuộc điều kiện',
          'C. Không xác định được dấu trong hệ trục chuẩn',
          'D. Chỉ đúng khi giá trị bằng 0'
        ],
        correctAnswer: 'A. Đại lượng cơ bản bảo toàn trong hệ cô lập',
        explanation: 'Khẳng định A đúng trực tiếp theo định luật bảo toàn môn ' + matrix.subject,
        difficulty: 'nhan_biet',
        learningObjective: 'Nhận biết khái niệm nền tảng',
        points: pointsPerQ
      },
      {
        id: `eq_fb_2`,
        question: `Câu 2 [Thông hiểu]: Cho bài toán liên quan đến ${scope}. Khi tăng gấp đôi thông số đầu vào thì kết quả biến thiên như thế nào?`,
        type: 'multiple_choice',
        options: [
          'A. Tăng gấp 2 lần tương ứng tỉ lệ thuận',
          'B. Giảm 2 lần',
          'C. Không thay đổi',
          'D. Tăng gấp 4 lần'
        ],
        correctAnswer: 'A. Tăng gấp 2 lần tương ứng tỉ lệ thuận',
        explanation: 'Quan hệ tỉ lệ bậc nhất dẫn tới kết quả tăng gấp đôi.',
        difficulty: 'thong_hieu',
        learningObjective: 'Hiểu mối tương quan giữa các đại lượng',
        points: pointsPerQ
      },
      {
        id: `eq_fb_3`,
        question: `Câu 3 [Vận dụng]: Tính giá trị nghiệm cụ thể của biểu thức đặc trưng trong ${scope} khi biết các tham số chuẩn (Nhập kết quả số, ví dụ: 10):`,
        type: 'short_answer',
        correctAnswer: '10',
        explanation: 'Thay các thông số chuẩn vào công thức ta thu được kết quả bằng 10.',
        difficulty: 'van_dung',
        learningObjective: 'Vận dụng tính toán chính xác',
        points: pointsPerQ
      },
      {
        id: `eq_fb_4`,
        question: `Câu 4 [Vận dụng cao - Tự luận]: Hãy trình bày lời giải chi tiết và biện luận bài toán thực tế áp dụng ${scope}. Nêu rõ từng bước biến đổi, công thức sử dụng và ý nghĩa thực tiễn.`,
        type: 'essay',
        correctAnswer: 'Lời giải chi tiết gồm 3 bước: \n1. Xác định mô hình toán học / vật lí và vẽ sơ đồ phân tích.\n2. Thiết lập hệ phương trình và giải tường minh.\n3. Đánh giá tính hợp lí của nghiệm trong thực tế.',
        explanation: 'Bài toán yêu cầu năng lực tổng hợp và lập luận chặt chẽ.',
        difficulty: 'van_dung_cao',
        learningObjective: 'Giải quyết vấn đề thực tiễn phức hợp',
        points: pointsPerQ
      }
    ]
  };
}

/**
 * 5. AI Grading for Essay Submissions (Rubric-based with Confidence & Review Trigger)
 */
export async function gradeStudentEssay(
  question: string,
  studentAnswer: string,
  rubric: string,
  maxScore: number,
  officialAnswer?: string
): Promise<EssayGradingResult> {
  if (!process.env.GEMINI_API_KEY) {
    return {
      questionId: '',
      scoreProposal: 0,
      maxScore,
      reasoningSummary: studentAnswer.trim()
        ? 'Chưa cấu hình Gemini; giáo viên cần duyệt trực tiếp theo rubric.'
        : 'Học sinh chưa trả lời câu tự luận.',
      confidence: 0,
      needsTeacherReview: true
    };
  }
  const prompt = `
Bạn là Giám khảo chấm thi sư phạm khách quan, công tâm.
Hãy đánh giá bài làm tự luận của học sinh:
- Đề bài: "${question}"
- Lời giải chính thức của giáo viên: "${officialAnswer || 'Không có, dựa vào Rubric'}"
- Thang điểm / Rubric chấm: "${rubric}"
- Điểm tối đa: ${maxScore}
- Bài làm của học sinh:
"""
${studentAnswer}
"""

Yêu cầu chấm:
1. Đánh giá từng luận điểm theo Rubric, chỉ cho điểm các phần học sinh làm đúng.
2. Trả về điểm đề xuất (scoreProposal, từ 0 đến ${maxScore}).
3. Tóm tắt lý do nhận xét sư phạm (reasoningSummary, ngắn gọn, chỉ ra điểm đúng, điểm thiếu sót).
4. Độ tin cậy (confidence, từ 0.0 đến 1.0).
5. Có cần giáo viên duyệt lại không (needsTeacherReview): Đặt là true nếu bài làm có cách giải khác lạ, chữ viết tắt khó đọc, hoặc confidence < 0.85.

Trả về JSON:
{
  "scoreProposal": 2.25,
  "maxScore": ${maxScore},
  "reasoningSummary": "Học sinh nêu đúng công thức và biến đổi chính xác, chỉ thiếu kết luận đơn vị ở dòng cuối.",
  "confidence": 0.95,
  "needsTeacherReview": false
}
`;

  try {
    if (process.env.GEMINI_API_KEY) {
      const response = await generateContentResilient(prompt, {
        responseMimeType: 'application/json',
        systemInstruction: 'Bạn là chuyên gia chấm thi tự luận. Luôn trả về đúng định dạng JSON.',
      });

      if (response.text) {
        const parsed = JSON.parse(response.text.trim());
        const confidence = Number(parsed.confidence);
        const normalizedConfidence = Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0;
        return {
          questionId: '',
          scoreProposal: Math.min(maxScore, Math.max(0, Number(parsed.scoreProposal) || 0)),
          maxScore: maxScore,
          reasoningSummary: parsed.reasoningSummary || 'AI đã phân tích bài làm dựa trên tiêu chí rubric.',
          confidence: normalizedConfidence,
          needsTeacherReview: Boolean(parsed.needsTeacherReview) || normalizedConfidence < 0.85,
        };
      }
    }
  } catch (error) {
    console.error('Gemini gradeStudentEssay error:', error);
  }

  return {
    questionId: '',
    scoreProposal: 0,
    maxScore,
    reasoningSummary: studentAnswer.trim()
      ? 'Chưa có kết quả chấm AI đáng tin cậy; giáo viên cần duyệt trực tiếp theo rubric.'
      : 'Học sinh chưa trả lời câu tự luận.',
    confidence: 0,
    needsTeacherReview: true,
  };
}

/**
 * 6. Multimodal Material Analyzer / Extractor
 */
export async function analyzeLearningMaterial(filename: string, fileType: string, sampleContent?: string) {
  if (!process.env.GEMINI_API_KEY) return null;
  const prompt = `
Phân tích tài liệu học tập: "${filename}" (Định dạng: ${fileType}).
Nội dung tài liệu trích xuất mẫu:
"""
${sampleContent || 'Tài liệu bài giảng môn học phổ thông Việt Nam.'}
"""

Hãy tóm tắt 3 nội dung kiến thức cốt lõi và đề xuất 2 dạng câu hỏi kiểm tra phù hợp cho giáo viên.
Trả về JSON:
{
  "summary": "Tóm tắt 2 câu về nội dung tài liệu...",
  "keyTopics": ["Chủ đề 1", "Chủ đề 2", "Chủ đề 3"],
  "recommendedQuestionTypes": ["Trắc nghiệm nhận biết", "Vận dụng tính toán"]
}
`;

  try {
    if (process.env.GEMINI_API_KEY) {
      const response = await generateContentResilient(prompt, {
        responseMimeType: 'application/json',
      });

      if (response.text) {
        const parsed = JSON.parse(response.text.trim());
        if (!parsed?.summary || !Array.isArray(parsed.keyTopics) || !Array.isArray(parsed.recommendedQuestionTypes)) {
          throw new Error('Gemini trả về kết quả phân tích tài liệu không hợp lệ.');
        }
        return parsed;
      }
    }
  } catch (error) {
    console.error('Gemini analyzeLearningMaterial error:', error);
  }

  return null;
}
