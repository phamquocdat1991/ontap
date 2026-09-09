# Bình minh pastel — 2026-09-09

## Changes
- Peach/mint light theme, responsive action cards, local optimized teacher illustration.
- Preserve teacher/student navigation and existing API/data contracts.
- Student search across lessons/exams, per-account device-local lesson favorites, resume unfinished/recent lesson.
- Count completion against available published lessons; replace hard-coded subject and question-count copy.
- Dashboard error/retry states; explicit missing Gemini key error.

## Validation
- TypeScript: passed.
- Existing regression suites (4 + 2 + 4): passed.
- API integration suite: passed (role access, course visibility, materials/progress, practice/exam submission, grading, settings and missing AI key).
- Production build: passed.
- Browser desktop: teacher dashboard, student switching, favorite filtering, empty search, favorite persistence after reload, resume lesson verified.
- External Gemini generation, Firebase durability and Google Sheets delivery require configured services and were not end-to-end exercised. No production student data changed for testing.
- Mobile layouts implemented using responsive breakpoints; no physical-device test performed.
