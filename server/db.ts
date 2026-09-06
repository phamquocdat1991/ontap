import fs from 'fs';
import path from 'path';
import { 
  User, SchoolClass, Course, Chapter, Lesson, Material, LessonProgress,
  PracticeQuiz, PracticeAttempt, Exam, ExamAttempt, SheetSyncLog, SystemSettings, AnalyticsSummary 
} from '../src/types/index.js';

interface DatabaseSchema {
  users: User[];
  classes: SchoolClass[];
  courses: Course[];
  chapters: Chapter[];
  lessons: Lesson[];
  materials: Material[];
  lessonProgress: LessonProgress[];
  practiceQuizzes: PracticeQuiz[];
  practiceAttempts: PracticeAttempt[];
  exams: Exam[];
  examAttempts: ExamAttempt[];
  sheetSyncLogs: SheetSyncLog[];
  settings: SystemSettings;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

// Synthetic seed data for Vietnamese K-12 EdTech demos.
// Never place real student, teacher, school, or assessment records in this file.
const initialData: DatabaseSchema = {
  users: [
    {
      id: 'teacher-1',
      email: 'teacher01@example.invalid',
      fullName: 'Giáo viên Mẫu 01',
      role: 'teacher',
      avatar: 'https://api.dicebear.com/9.x/shapes/svg?seed=teacher-01',
      school: 'Trường THPT Mẫu',
      subjectSpecialty: 'Toán học & Tin học',
      createdAt: '2024-09-01T00:00:00Z'
    },
    {
      id: 'teacher-2',
      email: 'teacher02@example.invalid',
      fullName: 'Giáo viên Mẫu 02',
      role: 'teacher',
      avatar: 'https://api.dicebear.com/9.x/shapes/svg?seed=teacher-02',
      school: 'Trường THPT Mẫu',
      subjectSpecialty: 'Vật lí & STEM',
      createdAt: '2024-09-01T00:00:00Z'
    },
    {
      id: 'student-1',
      email: 'student01@example.invalid',
      fullName: 'Học sinh Mẫu 01',
      role: 'student',
      avatar: 'https://api.dicebear.com/9.x/shapes/svg?seed=student-01',
      classId: 'class-1',
      className: 'Lớp mẫu A',
      school: 'Trường THPT Mẫu',
      createdAt: '2024-09-05T00:00:00Z'
    },
    {
      id: 'student-2',
      email: 'student02@example.invalid',
      fullName: 'Học sinh Mẫu 02',
      role: 'student',
      avatar: 'https://api.dicebear.com/9.x/shapes/svg?seed=student-02',
      classId: 'class-1',
      className: 'Lớp mẫu A',
      school: 'Trường THPT Mẫu',
      createdAt: '2024-09-05T00:00:00Z'
    },
    {
      id: 'student-3',
      email: 'student03@example.invalid',
      fullName: 'Học sinh Mẫu 03',
      role: 'student',
      avatar: 'https://api.dicebear.com/9.x/shapes/svg?seed=student-03',
      classId: 'class-2',
      className: 'Lớp mẫu B',
      school: 'Trường THPT Mẫu',
      createdAt: '2024-09-05T00:00:00Z'
    },
    {
      id: 'admin-1',
      email: 'admin@example.invalid',
      fullName: 'Quản trị viên Mẫu',
      role: 'admin',
      avatar: 'https://api.dicebear.com/9.x/shapes/svg?seed=admin-01',
      school: 'Đơn vị Giáo dục Mẫu',
      createdAt: '2024-08-01T00:00:00Z'
    }
  ],
  classes: [
    {
      id: 'class-1',
      name: 'Lớp mẫu A',
      grade: '10',
      academicYear: '2024 - 2025',
      teacherId: 'teacher-1',
      teacherName: 'Giáo viên Mẫu 01',
      studentCount: 38,
      description: 'Lớp dữ liệu minh họa định hướng Toán - Tin',
      createdAt: '2024-09-01T00:00:00Z'
    },
    {
      id: 'class-2',
      name: 'Lớp mẫu B',
      grade: '10',
      academicYear: '2024 - 2025',
      teacherId: 'teacher-1',
      teacherName: 'Giáo viên Mẫu 01',
      studentCount: 40,
      description: 'Lớp khối tự nhiên định hướng STEM',
      createdAt: '2024-09-01T00:00:00Z'
    }
  ],
  courses: [
    {
      id: 'course-toan-10',
      title: 'Toán học 10 - Chương trình GDPT 2018',
      subject: 'Toán học',
      grade: '10',
      bookSeries: 'Kết Nối Tri Thức',
      teacherId: 'teacher-1',
      description: 'Khóa học bám sát chương trình mới, tập trung vào tư duy giải quyết vấn đề, vectơ và hàm số.',
      coverColor: 'emerald',
      status: 'published',
      createdAt: '2024-09-01T00:00:00Z'
    },
    {
      id: 'course-ly-10',
      title: 'Vật lí 10 - Động học và Động lực học',
      subject: 'Vật lí',
      grade: '10',
      bookSeries: 'Cánh Diều',
      teacherId: 'teacher-1',
      description: 'Khám phá thế giới vật lí thông qua thực nghiệm, mô phỏng và bài tập vận dụng thực tế.',
      coverColor: 'blue',
      status: 'published',
      createdAt: '2024-09-02T00:00:00Z'
    }
  ],
  chapters: [
    {
      id: 'chap-1',
      courseId: 'course-toan-10',
      title: 'Chương IV: Vectơ trong mặt phẳng tọa độ',
      order: 1,
      description: 'Khái niệm vectơ, các phép toán vectơ, tích vô hướng và ứng dụng hình học.'
    },
    {
      id: 'chap-2',
      courseId: 'course-toan-10',
      title: 'Chương III: Hàm số và Đồ thị bậc hai',
      order: 2,
      description: 'Khảo sát và vẽ đồ thị hàm số bậc hai, dấu của tam thức bậc hai.'
    }
  ],
  lessons: [
    {
      id: 'lesson-1',
      chapterId: 'chap-1',
      courseId: 'course-toan-10',
      title: 'Bài 1: Khái niệm vectơ và các phép toán cơ bản',
      order: 1,
      status: 'published',
      durationMinutes: 45,
      learningObjectives: [
        'Nhận biết định nghĩa vectơ, vectơ-không, độ dài vectơ.',
        'Hiểu và vận dụng quy tắc 3 điểm, quy tắc hình bình hành để cộng, trừ vectơ.',
        'Vận dụng tính chất vectơ vào giải các bài toán thực tế.'
      ],
      contentAI: {
        title: 'Khái niệm Vectơ và các phép toán vectơ cơ bản',
        objectives: [
          'Nắm vững khái niệm đoạn thẳng có hướng, hướng và độ dài của vectơ.',
          'Thực hiện thành thạo phép cộng, trừ hai vectơ bằng quy tắc ba điểm và quy tắc hình bình hành.'
        ],
        keyKnowledge: [
          'Vectơ là một đoạn thẳng có hướng (chỉ rõ điểm đầu và điểm cuối).',
          'Hai vectơ cùng phương nếu giá của chúng song song hoặc trùng nhau.',
          'Hai vectơ bằng nhau nếu chúng cùng hướng và cùng độ dài: a = b <=> |a| = |b| và a cùng hướng b.'
        ],
        concepts: [
          { term: 'Vectơ-không (0)', definition: 'Là vectơ có điểm đầu và điểm cuối trùng nhau, độ dài bằng 0, cùng phương cùng hướng với mọi vectơ.' },
          { term: 'Quy tắc ba điểm', definition: 'Với 3 điểm bất kì A, B, C ta luôn có: AB + BC = AC.' },
          { term: 'Quy tắc hình bình hành', definition: 'Nếu ABCD là hình bình hành thì: AB + AD = AC (đường chéo xuất phát từ đỉnh A).' }
        ],
        formulas: [
          { name: 'Quy tắc hiệu 3 điểm', formula: 'AB - AC = CB', note: 'Chung gốc A, đảo thứ tự ngọn B, C thành CB' },
          { name: 'Tọa độ vectơ trong Oxy', formula: 'u = (x; y) <=> u = x*i + y*j', note: 'i, j là 2 vectơ đơn vị trên Ox, Oy' },
          { name: 'Độ dài vectơ', formula: '|u| = sqrt(x^2 + y^2)' }
        ],
        examples: [
          {
            question: 'Cho hình vuông ABCD tâm O cạnh a. Tính độ dài của vectơ u = AB + AD.',
            solution: 'Áp dụng quy tắc hình bình hành: Vì ABCD là hình vuông (cũng là hình bình hành) nên AB + AD = AC.\nĐộ dài vectơ u là |u| = |AC| = a*sqrt(2).',
            explanation: 'Tổng hai vectơ cạnh xuất phát từ đỉnh hình bình hành bằng vectơ đường chéo.'
          },
          {
            question: 'Cho 4 điểm phân biệt A, B, C, D. Rút gọn biểu thức: T = AB + CD + BC + DA.',
            solution: 'Sắp xếp lại các vectơ theo quy tắc nối đuôi: T = (AB + BC) + (CD + DA) = AC + CA = AA = 0.',
            explanation: 'Vận dụng tính chất giao hoán và quy tắc 3 điểm để đưa về vectơ-không.'
          }
        ],
        commonMistakes: [
          {
            mistake: 'Coi độ dài tổng vectơ bằng tổng độ dài: |a + b| = |a| + |b| trong mọi trường hợp.',
            correction: 'Chỉ xảy ra dấu "=" khi hai vectơ a và b cùng hướng. Nói chung: |a + b| <= |a| + |b| (bất đẳng thức tam giác).',
            advice: 'Luôn dựng hình tổng vectơ trước khi tính toán độ dài.'
          },
          {
            mistake: 'Nhầm lẫn quy tắc trừ: AB - AC = BC.',
            correction: 'Quy tắc đúng: AB - AC = CB (ngọn sau trừ ngọn trước).',
            advice: 'Ghi nhớ câu thần chú: "Chung gốc trừ nhau bằng ngọn sau về ngọn trước".'
          }
        ],
        quickCheck: [
          {
            question: 'Khẳng định nào sau đây là ĐÚNG với ba điểm phân biệt M, N, P bất kì?',
            options: ['MN + NP = MP', 'MN + MP = NP', 'MN - NP = MP', 'MN + NP = PM'],
            answer: 'MN + NP = MP',
            hint: 'Nhớ lại quy tắc 3 điểm nối tiếp điểm N.'
          },
          {
            question: 'Vectơ có điểm đầu là A và điểm cuối là B được kí hiệu là gì?',
            options: ['AB', 'BA', '|AB|', '(A, B)'],
            answer: 'AB',
            hint: 'Điểm đầu viết trước, điểm cuối viết sau kèm dấu mũi tên.'
          }
        ],
        summary: 'Vectơ là công cụ toán học nền tảng mô tả đại lượng có cả độ lớn và hướng. Nắm chắc quy tắc 3 điểm và hình bình hành giúp giải quyết nhẹ nhàng các bài toán hình học và cơ học.'
      },
      teacherNotes: 'Bài mở đầu rất quan trọng. Cần nhấn mạnh sự khác biệt giữa đoạn thẳng và vectơ.',
      createdAt: '2024-09-05T08:00:00Z',
      updatedAt: '2024-09-05T08:00:00Z'
    },
    {
      id: 'lesson-2',
      chapterId: 'chap-1',
      courseId: 'course-toan-10',
      title: 'Bài 2: Tích vô hướng của hai vectơ và ứng dụng',
      order: 2,
      status: 'published',
      durationMinutes: 45,
      learningObjectives: [
        'Hiểu định nghĩa góc giữa hai vectơ và tích vô hướng.',
        'Vận dụng công thức tính công của lực và chứng minh vuông góc.'
      ],
      contentAI: {
        title: 'Tích vô hướng của hai vectơ',
        objectives: ['Tính góc giữa hai vectơ', 'Áp dụng biểu thức tọa độ của tích vô hướng'],
        keyKnowledge: ['Tích vô hướng: a.b = |a|.|b|.cos(a, b)', 'Hai vectơ vuông góc <=> a.b = 0'],
        concepts: [
          { term: 'Góc giữa hai vectơ', definition: 'Góc tạo bởi hai tia xuất phát từ một điểm cùng hướng với hai vectơ.' }
        ],
        formulas: [
          { name: 'Tích vô hướng tọa độ', formula: 'a.b = x1*x2 + y1*y2' },
          { name: 'Cos góc giữa 2 vectơ', formula: 'cos(a, b) = (x1*x2 + y1*y2) / (sqrt(x1^2+y1^2) * sqrt(x2^2+y2^2))' }
        ],
        examples: [
          { question: 'Cho a = (1; 2) và b = (-2; 1). Tính a.b.', solution: 'a.b = 1*(-2) + 2*1 = 0 => a vuông góc b.', explanation: 'Tích vô hướng bằng 0 nên hai vectơ vuông góc.' }
        ],
        commonMistakes: [
          { mistake: 'Nghĩ rằng tích vô hướng là một vectơ.', correction: 'Tích vô hướng của 2 vectơ là MỘT SỐ THỰC (vô hướng).', advice: 'Phân biệt phép nhân vectơ với số và tích vô hướng.' }
        ],
        quickCheck: [
          { question: 'Nếu hai vectơ vuông góc với nhau thì tích vô hướng bằng bao nhiêu?', answer: '0' }
        ],
        summary: 'Tích vô hướng liên kết độ dài, góc và hình chiếu, là công cụ mạnh mẽ trong hình học giải tích.'
      },
      createdAt: '2024-09-06T08:00:00Z',
      updatedAt: '2024-09-06T08:00:00Z'
    }
  ],
  materials: [
    {
      id: 'mat-1',
      lessonId: 'lesson-1',
      type: 'pdf',
      filename: 'Tai_lieu_chuyen_de_Vecto_Lop10.pdf',
      storageUrl: 'https://storage.googleapis.com/eduhub-assets/samples/vecto-chuyende.pdf',
      pageCount: 8,
      required: true,
      fileSize: '2.4 MB',
      createdAt: '2024-09-05T08:30:00Z'
    },
    {
      id: 'mat-2',
      lessonId: 'lesson-1',
      type: 'video',
      filename: 'BaiGiang_TrucQuan_QuyTacHinhBinhHanh.mp4',
      storageUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      duration: 360, // 6 minutes (360 seconds)
      required: true,
      fileSize: '18.5 MB',
      createdAt: '2024-09-05T08:35:00Z'
    }
  ],
  lessonProgress: [
    {
      id: 'prog-student-1-lesson-1',
      userId: 'student-1',
      lessonId: 'lesson-1',
      completedUnits: 8,
      totalUnits: 8,
      percentage: 100,
      lastPosition: 8,
      viewedPages: [1, 2, 3, 4, 5, 6, 7, 8],
      watchedSegments: [[0, 360]],
      isCompleted: true,
      lastOpenedAt: '2024-09-08T14:30:00Z',
      completedAt: '2024-09-08T14:45:00Z'
    },
    {
      id: 'prog-student-2-lesson-1',
      userId: 'student-2',
      lessonId: 'lesson-1',
      completedUnits: 5,
      totalUnits: 8,
      percentage: 62.5,
      lastPosition: 5,
      viewedPages: [1, 2, 3, 4, 5],
      watchedSegments: [[0, 180]],
      isCompleted: false,
      lastOpenedAt: '2024-09-09T09:15:00Z'
    }
  ],
  practiceQuizzes: [
    {
      id: 'quiz-lesson-1',
      lessonId: 'lesson-1',
      courseId: 'course-toan-10',
      title: 'Luyện tập nhanh: Khái niệm & Phép toán Vectơ',
      timeLimitMinutes: 15,
      maxAttempts: 3,
      passPercentage: 80,
      status: 'published',
      createdAt: '2024-09-05T09:00:00Z',
      questions: [
        {
          id: 'q1',
          question: 'Cho 3 điểm A, B, C phân biệt. Khẳng định nào sau đây luôn ĐÚNG theo quy tắc ba điểm?',
          type: 'multiple_choice',
          options: [
            'A. AB + BC = AC',
            'B. AB + AC = BC',
            'C. BA + AC = CB',
            'D. CA + BA = CB'
          ],
          correctAnswer: 'A. AB + BC = AC',
          explanation: 'Theo quy tắc 3 điểm, khi điểm cuối của vectơ thứ nhất trùng với điểm đầu của vectơ thứ hai, tổng là vectơ nối từ điểm đầu của vectơ 1 đến điểm cuối của vectơ 2 (AB + BC = AC).',
          hint1: 'Hãy chú ý điểm chung B đứng ở vị trí ngọn của vectơ đầu và gốc của vectơ sau.',
          hint2: 'Quy tắc nối đuôi: A đi đến B, rồi từ B đi tiếp đến C tương đương với đi thẳng từ A đến C.',
          difficulty: 'nhan_biet',
          learningObjective: 'Nhận biết quy tắc 3 điểm',
          points: 2.5
        },
        {
          id: 'q2',
          question: 'Cho hình bình hành ABCD. Vectơ tổng AB + AD bằng vectơ nào dưới đây?',
          type: 'multiple_choice',
          options: [
            'A. AC',
            'B. BD',
            'C. CA',
            'D. DB'
          ],
          correctAnswer: 'A. AC',
          explanation: 'Theo quy tắc hình bình hành, tổng của hai vectơ cùng xuất phát từ một đỉnh bằng vectơ đường chéo xuất phát từ đỉnh đó: AB + AD = AC.',
          hint1: 'Vẽ hình bình hành ABCD và quan sát đường chéo AC xuất phát từ đỉnh A.',
          hint2: 'Nhớ lại quy tắc hình bình hành: hai cạnh kề cộng lại ra đường chéo chung gốc.',
          difficulty: 'thong_hieu',
          learningObjective: 'Vận dụng quy tắc hình bình hành',
          points: 2.5
        },
        {
          id: 'q3',
          question: 'Độ dài của vectơ-không luôn bằng 0.',
          type: 'true_false',
          options: ['Đúng', 'Sai'],
          correctAnswer: 'Đúng',
          explanation: 'Vectơ-không có điểm đầu và điểm cuối trùng nhau nên khoảng cách bằng 0, độ dài |0| = 0.',
          hint1: 'Điểm đầu và điểm cuối của vectơ-không có khoảng cách là bao nhiêu?',
          hint2: 'Định nghĩa: vectơ-không có độ dài triệt tiêu.',
          difficulty: 'nhan_biet',
          learningObjective: 'Hiểu tính chất vectơ không',
          points: 2.5
        },
        {
          id: 'q4',
          question: 'Cho tam giác ABC đều cạnh bằng a. Độ dài của vectơ AB - AC là bao nhiêu? (Nhập đáp án dạng số hoặc a, ví dụ: a)',
          type: 'short_answer',
          correctAnswer: 'a',
          explanation: 'Ta có: AB - AC = CB (theo quy tắc hiệu chung gốc A). Độ dài |CB| chính là độ dài cạnh BC của tam giác đều, bằng a.',
          hint1: 'Rút gọn hiệu AB - AC trước bằng quy tắc trừ chung gốc.',
          hint2: 'AB - AC = CB. Tam giác ABC đều cạnh a thì độ dài đoạn thẳng CB bằng bao nhiêu?',
          difficulty: 'van_dung',
          learningObjective: 'Tính độ dài vectơ hiệu',
          points: 2.5
        }
      ]
    }
  ],
  practiceAttempts: [
    {
      id: 'patt-1',
      quizId: 'quiz-lesson-1',
      lessonId: 'lesson-1',
      userId: 'student-1',
      studentName: 'Học sinh Mẫu 01',
      attemptNumber: 1,
      startedAt: '2024-09-08T15:00:00Z',
      deadline: '2024-09-08T15:15:00Z',
      submittedAt: '2024-09-08T15:08:20Z',
      answers: {
        q1: 'A. AB + BC = AC',
        q2: 'A. AC',
        q3: 'Đúng',
        q4: 'a'
      },
      score: 10,
      totalScore: 10,
      percentage: 100,
      passed: true,
      status: 'submitted',
      durationSeconds: 500
    }
  ],
  exams: [
    {
      id: 'exam-1',
      courseId: 'course-toan-10',
      classIds: ['class-1', 'class-2'],
      title: 'Kiểm tra Đánh giá Định kỳ: Vectơ và Hệ tọa độ Oxy (45 phút)',
      type: 'midterm',
      scope: 'Toàn bộ Chương IV: Vectơ trong mặt phẳng',
      durationMinutes: 45,
      totalScore: 10,
      questionCount: 4,
      status: 'published',
      teacherId: 'teacher-1',
      createdAt: '2024-09-10T08:00:00Z',
      publishedAt: '2024-09-10T08:30:00Z',
      matrix: {
        subject: 'Toán học',
        grade: '10',
        examType: 'midterm',
        durationMinutes: 45,
        totalScore: 10,
        questionCount: 4,
        cells: [
          {
            chapter: 'Chương IV: Vectơ trong mặt phẳng',
            nhanBiet: { countMC: 1, countEssay: 0, points: 2.5 },
            thongHieu: { countMC: 1, countEssay: 0, points: 2.5 },
            vanDung: { countMC: 1, countEssay: 0, points: 2.5 },
            vanDungCao: { countMC: 0, countEssay: 1, points: 2.5 },
            totalPoints: 10
          }
        ],
        summaryNote: 'Ma trận bám sát thông tư 22/2021/TT-BGDĐT: 70% Trắc nghiệm khách quan + 30% Tự luận tư duy cao.'
      },
      specification: 'Bản đặc tả: 1 câu nhận biết quy tắc 3 điểm, 1 câu thông hiểu tọa độ vectơ, 1 câu vận dụng tích vô hướng, 1 câu tự luận chứng minh đẳng thức và tìm quỹ tích điểm.',
      rubric: 'Câu 4 (Tự luận): \n- Bước 1: Biến đổi vế trái sử dụng quy tắc xen điểm O (1.0 điểm)\n- Bước 2: Rút gọn biểu thức vectơ và nhóm trọng tâm G (1.0 điểm)\n- Bước 3: Kết luận quỹ tích điểm M là đường tròn tâm G bán kính R = a/3 (0.5 điểm)',
      scoringGuide: 'Điểm tổng = Điểm trắc nghiệm (7.5đ) + Điểm tự luận (2.5đ). AI hỗ trợ chấm tự luận theo từng bước biến đổi.',
      questions: [
        {
          id: 'eq1',
          question: 'Trong mặt phẳng Oxy, cho hai điểm A(1; 3) và B(4; 2). Tọa độ của vectơ AB là:',
          type: 'multiple_choice',
          options: [
            'A. (3; -1)',
            'B. (-3; 1)',
            'C. (5; 5)',
            'D. (3; 1)'
          ],
          correctAnswer: 'A. (3; -1)',
          explanation: 'Tọa độ AB = (xB - xA; yB - yA) = (4 - 1; 2 - 3) = (3; -1).',
          difficulty: 'nhan_biet',
          learningObjective: 'Tính tọa độ vectơ từ 2 điểm',
          points: 2.5
        },
        {
          id: 'eq2',
          question: 'Cho tam giác ABC có trọng tâm G. Khẳng định nào sau đây là ĐÚNG?',
          type: 'multiple_choice',
          options: [
            'A. GA + GB + GC = 0',
            'B. GA + GB + GC = 3GG',
            'C. AB + BC + CA = 3OG',
            'D. MA + MB + MC = OG'
          ],
          correctAnswer: 'A. GA + GB + GC = 0',
          explanation: 'Tính chất trọng tâm: Tổng 3 vectơ từ trọng tâm G đến 3 đỉnh của tam giác luôn bằng vectơ-không: GA + GB + GC = 0.',
          difficulty: 'thong_hieu',
          learningObjective: 'Hiểu tính chất trọng tâm tam giác',
          points: 2.5
        },
        {
          id: 'eq3',
          question: 'Cho hai vectơ u = (2; -1) và v = (3; m). Giá trị của m để u vuông góc với v là: (Nhập số nguyên, ví dụ: 6)',
          type: 'short_answer',
          correctAnswer: '6',
          explanation: 'u vuông góc v <=> u.v = 0 <=> 2*3 + (-1)*m = 0 <=> 6 - m = 0 <=> m = 6.',
          difficulty: 'van_dung',
          learningObjective: 'Vận dụng điều kiện vuông góc 2 vectơ',
          points: 2.5
        },
        {
          id: 'eq4',
          question: 'Cho tam giác ABC có trọng tâm G. Hãy trình bày lời giải chi tiết để chứng minh rằng với mọi điểm M trong mặt phẳng, ta luôn có: MA + MB + MC = 3MG.',
          type: 'essay',
          correctAnswer: 'Lời giải chuẩn:\n- Chèn điểm G vào từng vectơ vế trái theo quy tắc 3 điểm:\n  MA = MG + GA\n  MB = MG + GB\n  MC = MG + GC\n- Cộng vế theo vế ta được:\n  MA + MB + MC = (MG + MG + MG) + (GA + GB + GC)\n               = 3MG + (GA + GB + GC)\n- Vì G là trọng tâm tam giác ABC nên GA + GB + GC = 0.\n- Do đó: MA + MB + MC = 3MG (Điều phải chứng minh).',
          explanation: 'Bài toán kinh điển vận dụng tính chất xen điểm và tính chất trọng tâm tam giác.',
          rubric: 'Tiêu chí chấm:\n1. Đúng quy tắc xen điểm G vào MA, MB, MC (1.0 điểm)\n2. Nhóm các vectơ MG và GA+GB+GC (0.75 điểm)\n3. Áp dụng GA+GB+GC=0 và kết luận chính xác (0.75 điểm)',
          difficulty: 'van_dung_cao',
          learningObjective: 'Chứng minh đẳng thức vectơ qua trọng tâm',
          points: 2.5
        }
      ]
    }
  ],
  examAttempts: [
    {
      id: 'eatt-1',
      examId: 'exam-1',
      userId: 'student-1',
      studentName: 'Học sinh Mẫu 01',
      classId: 'class-1',
      className: 'Lớp mẫu A',
      startedAt: '2024-09-11T09:00:00Z',
      deadline: '2024-09-11T09:45:00Z',
      submittedAt: '2024-09-11T09:38:15Z',
      answers: {
        eq1: 'A. (3; -1)',
        eq2: 'A. GA + GB + GC = 0',
        eq3: '6',
        eq4: 'Ta có:\nMA = MG + GA\nMB = MG + GB\nMC = MG + GC\nCộng vế theo vế:\nMA + MB + MC = 3MG + (GA + GB + GC)\nDo G là trọng tâm tam giác ABC nên GA + GB + GC = 0.\nVậy MA + MB + MC = 3MG (đpcm).'
      },
      score: 10,
      totalScore: 10,
      correctCount: 4,
      incorrectCount: 0,
      status: 'graded',
      syncStatus: 'success',
      durationSeconds: 2295,
      essayEvaluations: {
        eq4: {
          questionId: 'eq4',
          scoreProposal: 2.5,
          maxScore: 2.5,
          reasoningSummary: 'Học sinh trình bày hoàn hảo đầy đủ 3 bước: xen điểm G, nhóm số hạng, áp dụng tính chất trọng tâm GA+GB+GC=0.',
          confidence: 0.98,
          needsTeacherReview: false,
          teacherApprovedScore: 2.5,
          teacherNote: 'Bài làm xuất sắc, lập luận chặt chẽ.'
        }
      },
      createdAt: '2024-09-11T09:00:00Z'
    }
  ],
  sheetSyncLogs: [
    {
      id: 'sync-log-1',
      attemptId: 'eatt-1',
      submissionId: 'SUB-EXAM-20240911-001',
      studentId: 'student-1',
      studentName: 'Học sinh Mẫu 01',
      className: 'Lớp mẫu A',
      subject: 'Toán học',
      chapter: 'Chương IV: Vectơ',
      lessonTitle: 'Kiểm tra Đánh giá Định kỳ (45 phút)',
      assessmentType: 'Exam',
      attemptNumber: 1,
      correct: 4,
      incorrect: 0,
      score: 10,
      duration: '38 phút 15 giây',
      lessonProgress: '100%',
      status: 'success',
      syncedAt: '2024-09-11T09:38:20Z'
    }
  ],
  settings: {
    googleSheetsConnected: false,
    spreadsheetId: '',
    spreadsheetUrl: '',
    spreadsheetName: 'AI_Learning_Hub_DuLieuMau',
    autoSync: true,
    passingScoreThreshold: 80,
    videoWatchThreshold: 99,
    enableAiGrading: true,
    schoolName: 'Trường THPT Mẫu'
  }
};

function isReadOnlyFileSystem(): boolean {
  return Boolean(
    process.env.VERCEL || 
    process.env.AI_HUB_PREVIEW === 'true' ||
    process.env.AWS_LAMBDA_FUNCTION_NAME || 
    process.env.LAMBDA_TASK_ROOT ||
    (process.env.NODE_ENV === 'production' && !process.env.PORT)
  );
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    if (isReadOnlyFileSystem()) {
      return JSON.parse(JSON.stringify(initialData));
    }
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(STORE_FILE)) {
        const fileContent = fs.readFileSync(STORE_FILE, 'utf-8');
        return JSON.parse(fileContent);
      }
    } catch (err) {
      console.warn('Could not read store.json, using initial seed data', err);
    }
    this.saveDataDirect(initialData);
    return JSON.parse(JSON.stringify(initialData));
  }

  private saveDataDirect(data: DatabaseSchema) {
    if (isReadOnlyFileSystem()) return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      // Gracefully continue in-memory if disk is not writable
      console.warn('Cannot persist to store.json on disk (running in-memory mode):', (err as Error).message);
    }
  }

  public save() {
    this.saveDataDirect(this.data);
  }

  // Generic Getters
  public getUsers(): User[] { return this.data.users; }
  public getUserById(id: string): User | undefined { return this.data.users.find(u => u.id === id); }
  public getUserByEmail(email: string): User | undefined { return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase()); }
  public addUser(user: User): User {
    this.data.users.push(user);
    this.save();
    return user;
  }
  public deleteUser(userId: string) {
    this.data.users = this.data.users.filter(u => u.id !== userId);
    this.data.lessonProgress = this.data.lessonProgress.filter(p => p.userId !== userId);
    this.data.practiceAttempts = this.data.practiceAttempts.filter(a => a.userId !== userId);
    this.data.examAttempts = this.data.examAttempts.filter(a => a.userId !== userId);
    this.save();
  }

  public getClasses(): SchoolClass[] { return this.data.classes; }
  public addClass(c: SchoolClass): SchoolClass {
    this.data.classes.push(c);
    this.save();
    return c;
  }

  public getCourses(): Course[] { return this.data.courses; }
  public getCourseById(id: string): Course | undefined { return this.data.courses.find(c => c.id === id); }
  public addCourse(course: Course): Course {
    this.data.courses.push(course);
    this.save();
    return course;
  }

  public getChapters(courseId?: string): Chapter[] {
    if (courseId) return this.data.chapters.filter(c => c.courseId === courseId);
    return this.data.chapters;
  }
  public addChapter(chap: Chapter): Chapter {
    this.data.chapters.push(chap);
    this.save();
    return chap;
  }

  public getLessons(courseId?: string, chapterId?: string): Lesson[] {
    let result = this.data.lessons;
    if (courseId) result = result.filter(l => l.courseId === courseId);
    if (chapterId) result = result.filter(l => l.chapterId === chapterId);
    return result;
  }
  public getLessonById(id: string): Lesson | undefined {
    return this.data.lessons.find(l => l.id === id);
  }
  public addLesson(lesson: Lesson): Lesson {
    this.data.lessons.push(lesson);
    this.save();
    return lesson;
  }
  public updateLesson(id: string, updates: Partial<Lesson>): Lesson | undefined {
    const idx = this.data.lessons.findIndex(l => l.id === id);
    if (idx !== -1) {
      this.data.lessons[idx] = { ...this.data.lessons[idx], ...updates, updatedAt: new Date().toISOString() };
      this.save();
      return this.data.lessons[idx];
    }
    return undefined;
  }

  public getMaterials(lessonId?: string): Material[] {
    if (lessonId) return this.data.materials.filter(m => m.lessonId === lessonId);
    return this.data.materials;
  }
  public addMaterial(material: Material): Material {
    this.data.materials.push(material);
    this.save();
    return material;
  }

  public getLessonProgress(userId: string, lessonId: string): LessonProgress | undefined {
    return this.data.lessonProgress.find(p => p.userId === userId && p.lessonId === lessonId);
  }
  public getUserProgressList(userId: string): LessonProgress[] {
    return this.data.lessonProgress.filter(p => p.userId === userId);
  }
  public saveLessonProgress(progress: LessonProgress): LessonProgress {
    const idx = this.data.lessonProgress.findIndex(p => p.userId === progress.userId && p.lessonId === progress.lessonId);
    if (idx !== -1) {
      this.data.lessonProgress[idx] = progress;
    } else {
      this.data.lessonProgress.push(progress);
    }
    this.save();
    return progress;
  }

  public getPracticeQuizzes(lessonId?: string): PracticeQuiz[] {
    if (lessonId) return this.data.practiceQuizzes.filter(q => q.lessonId === lessonId);
    return this.data.practiceQuizzes;
  }
  public getPracticeQuizById(id: string): PracticeQuiz | undefined {
    return this.data.practiceQuizzes.find(q => q.id === id);
  }
  public addPracticeQuiz(quiz: PracticeQuiz): PracticeQuiz {
    this.data.practiceQuizzes.push(quiz);
    this.save();
    return quiz;
  }

  public getPracticeAttempts(userId?: string, quizId?: string): PracticeAttempt[] {
    let list = this.data.practiceAttempts;
    if (userId) list = list.filter(a => a.userId === userId);
    if (quizId) list = list.filter(a => a.quizId === quizId);
    return list;
  }
  public addPracticeAttempt(attempt: PracticeAttempt): PracticeAttempt {
    this.data.practiceAttempts.push(attempt);
    this.save();
    return attempt;
  }
  public updatePracticeAttempt(id: string, updates: Partial<PracticeAttempt>): PracticeAttempt | undefined {
    const idx = this.data.practiceAttempts.findIndex(a => a.id === id);
    if (idx !== -1) {
      this.data.practiceAttempts[idx] = { ...this.data.practiceAttempts[idx], ...updates };
      this.save();
      return this.data.practiceAttempts[idx];
    }
    return undefined;
  }

  public getExams(): Exam[] { return this.data.exams; }
  public getExamById(id: string): Exam | undefined { return this.data.exams.find(e => e.id === id); }
  public addExam(exam: Exam): Exam {
    this.data.exams.push(exam);
    this.save();
    return exam;
  }
  public updateExam(id: string, updates: Partial<Exam>): Exam | undefined {
    const idx = this.data.exams.findIndex(e => e.id === id);
    if (idx !== -1) {
      this.data.exams[idx] = { ...this.data.exams[idx], ...updates };
      this.save();
      return this.data.exams[idx];
    }
    return undefined;
  }

  public getExamAttempts(examId?: string, userId?: string): ExamAttempt[] {
    let list = this.data.examAttempts;
    if (examId) list = list.filter(a => a.examId === examId);
    if (userId) list = list.filter(a => a.userId === userId);
    return list;
  }
  public getExamAttemptById(id: string): ExamAttempt | undefined {
    return this.data.examAttempts.find(a => a.id === id);
  }
  public addExamAttempt(attempt: ExamAttempt): ExamAttempt {
    this.data.examAttempts.push(attempt);
    this.save();
    return attempt;
  }
  public updateExamAttempt(id: string, updates: Partial<ExamAttempt>): ExamAttempt | undefined {
    const idx = this.data.examAttempts.findIndex(a => a.id === id);
    if (idx !== -1) {
      this.data.examAttempts[idx] = { ...this.data.examAttempts[idx], ...updates };
      this.save();
      return this.data.examAttempts[idx];
    }
    return undefined;
  }

  public getSheetSyncLogs(): SheetSyncLog[] { return this.data.sheetSyncLogs; }
  public addSheetSyncLog(log: SheetSyncLog): SheetSyncLog {
    this.data.sheetSyncLogs.unshift(log);
    this.save();
    return log;
  }
  public updateSheetSyncLog(id: string, updates: Partial<SheetSyncLog>): SheetSyncLog | undefined {
    const idx = this.data.sheetSyncLogs.findIndex(l => l.id === id);
    if (idx !== -1) {
      this.data.sheetSyncLogs[idx] = { ...this.data.sheetSyncLogs[idx], ...updates };
      this.save();
      return this.data.sheetSyncLogs[idx];
    }
    return undefined;
  }

  public getSettings(): SystemSettings { return this.data.settings; }
  public updateSettings(updates: Partial<SystemSettings>): SystemSettings {
    this.data.settings = { ...this.data.settings, ...updates };
    this.save();
    return this.data.settings;
  }

  public getAnalyticsSummary(): AnalyticsSummary {
    const students = this.data.users.filter(u => u.role === 'student');
    const totalStudents = students.length;
    const totalClasses = this.data.classes.length;
    const publishedLessons = this.data.lessons.filter(l => l.status === 'published');
    const totalLessons = publishedLessons.length;
    const totalExams = this.data.exams.filter(exam => exam.status === 'published').length;

    const allProgress = this.data.lessonProgress;
    const progressSlots = students.flatMap(student => publishedLessons.map(lesson => (
      allProgress.find(progress => progress.userId === student.id && progress.lessonId === lesson.id)?.percentage || 0
    )));
    const avgProgress = progressSlots.length
      ? Math.round((progressSlots.reduce((sum, value) => sum + value, 0) / progressSlots.length) * 10) / 10
      : 0;

    // Average exam score
    const gradedAttempts = this.data.examAttempts.filter(a => a.status === 'graded' && typeof a.score === 'number');
    let avgScore = 0;
    if (gradedAttempts.length > 0) {
      const sumScores = gradedAttempts.reduce((acc, curr) => acc + (curr.score || 0), 0);
      avgScore = Math.round((sumScores / gradedAttempts.length) * 10) / 10;
    }

    // Unengaged students
    const unengaged = students.map(st => {
      const userProg = allProgress.filter(p => p.userId === st.id && p.isCompleted);
      const incompleteCount = totalLessons - userProg.length;
      return {
        id: st.id,
        name: st.fullName,
        className: st.className || 'Lớp mẫu',
        incompleteLessonsCount: Math.max(0, incompleteCount)
      };
    }).filter(s => s.incompleteLessonsCount > 0);

    const questionStats = new Map<string, { question: string; attempts: number; failed: number }>();
    const normalize = (value: unknown) => String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
    for (const attempt of this.data.practiceAttempts.filter(item => item.status === 'submitted')) {
      const quiz = this.getPracticeQuizById(attempt.quizId);
      for (const question of quiz?.questions || []) {
        const stats = questionStats.get(question.id) || { question: question.question, attempts: 0, failed: 0 };
        stats.attempts += 1;
        if (normalize(attempt.answers[question.id]) !== normalize(question.correctAnswer)) stats.failed += 1;
        questionStats.set(question.id, stats);
      }
    }
    for (const attempt of this.data.examAttempts.filter(item => ['graded', 'needs_review'].includes(item.status))) {
      const exam = this.getExamById(attempt.examId);
      for (const question of exam?.questions.filter(item => item.type !== 'essay') || []) {
        const stats = questionStats.get(question.id) || { question: question.question, attempts: 0, failed: 0 };
        stats.attempts += 1;
        if (normalize(attempt.answers[question.id]) !== normalize(question.correctAnswer)) stats.failed += 1;
        questionStats.set(question.id, stats);
      }
    }
    const failedQuestions = [...questionStats.entries()]
      .map(([questionId, stats]) => ({
        questionId,
        question: stats.question,
        failRate: stats.attempts ? Math.round((stats.failed / stats.attempts) * 1000) / 10 : 0,
        totalAttempts: stats.attempts
      }))
      .filter(item => item.totalAttempts > 0)
      .sort((a, b) => b.failRate - a.failRate)
      .slice(0, 5);

    // Hardest lessons
    const hardestLessons = publishedLessons.map(l => {
      const studentPercentages = students.map(student => (
        allProgress.find(progress => progress.userId === student.id && progress.lessonId === l.id)?.percentage || 0
      ));
      const avg = studentPercentages.length
        ? Math.round(studentPercentages.reduce((sum, value) => sum + value, 0) / studentPercentages.length)
        : 0;
      return {
        lessonId: l.id,
        title: l.title,
        averageProgress: avg,
        failRate: Math.max(0, 100 - avg)
      };
    });

    return {
      totalStudents,
      totalClasses,
      totalLessons,
      totalExams,
      averageCompletionRate: avgProgress,
      averageExamScore: avgScore,
      unengagedStudents: unengaged,
      mostFailedQuestions: failedQuestions,
      hardestLessons: hardestLessons
    };
  }
}

export const db = new Database();
