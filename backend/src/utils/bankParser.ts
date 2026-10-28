import fs from 'fs';
import path from 'path';

export interface ParsedOption {
  label: 'A' | 'B' | 'C' | 'D';
  content: string;
  is_correct: boolean;
}

export interface ParsedQuestion {
  questionNumber: number;
  content: string;
  question_type: 'recognition' | 'understanding' | 'application' | 'advanced_application' | string;
  options: ParsedOption[];
  correctLabel: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  source_ref: string;
  sort_order: number;
}

export interface ParsedChapter {
  name: string;
  description: string;
  sort_order: number;
  questions: ParsedQuestion[];
}

export interface ParseReport {
  chapters: ParsedChapter[];
  totalQuestions: number;
  errors: string[];
}

function cleanChapterTitle(rawSource: string, index: number): { name: string; description: string } {
  // e.g. "[BUỔI 1] bài. Dược lý học đại cương .pdf"
  const cleaned = rawSource
    .replace(/\.pdf$/i, '')
    .replace(/^\[BUỔI\s*(\d+)\]\s*(bài\.?)?\s*/i, (_, num) => `Chương ${num}: `)
    .replace(/\s+/g, ' ')
    .trim();

  const name = cleaned.startsWith('Chương') ? cleaned : `Chương ${index + 1}: ${cleaned}`;
  const description = `Tài liệu gốc: ${rawSource.trim()} • Ngân hàng câu hỏi chuẩn hóa theo 4 mức độ nhận thức.`;
  return { name, description };
}

export function parseNganHangCauHoiTxt(rawText: string): ParseReport {
  const errors: string[] = [];
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split by "Nguồn tài liệu:"
  const blocks = normalized
    .split(/(?=Nguồn tài liệu:)/g)
    .map((b) => b.trim())
    .filter((b) => b.startsWith('Nguồn tài liệu:'));

  const chapters: ParsedChapter[] = [];
  let totalQuestions = 0;

  blocks.forEach((block, chapterIdx) => {
    const lines = block.split('\n').map((l) => l.trim());
    const sourceHeaderLine = lines[0] || '';
    const rawSource = sourceHeaderLine.replace(/^Nguồn tài liệu:\s*/i, '').trim();
    const { name, description } = cleanChapterTitle(rawSource, chapterIdx);

    // Split block into Questions Part and Answer Key Part ("ĐÁP ÁN VÀ GIẢI THÍCH CHI TIẾT")
    const answerSplitIndex = lines.findIndex((l) =>
      /^ĐÁP ÁN VÀ GIẢI THÍCH CHI TIẾT/i.test(l)
    );

    const questionLines = answerSplitIndex !== -1 ? lines.slice(1, answerSplitIndex) : lines.slice(1);
    const answerLines = answerSplitIndex !== -1 ? lines.slice(answerSplitIndex + 1) : [];

    // 1. Parse Answer Key & Explanations first
    const answerMap = new Map<number, { correctLabel: 'A' | 'B' | 'C' | 'D'; explanation: string; source_ref?: string }>();
    let currentAnsNum: number | null = null;

    for (const line of answerLines) {
      if (!line) continue;
      if (/^BẢNG ĐÁP ÁN TỔNG HỢP/i.test(line)) {
        currentAnsNum = null;
        continue;
      }

      const ansMatch = line.match(/^Câu\s*(\d+)\s*:\s*([A-D])/i);
      if (ansMatch) {
        const qNum = parseInt(ansMatch[1], 10);
        const label = ansMatch[2].toUpperCase() as 'A' | 'B' | 'C' | 'D';
        currentAnsNum = qNum;
        if (!answerMap.has(qNum)) {
          answerMap.set(qNum, { correctLabel: label, explanation: '' });
        } else {
          const existing = answerMap.get(qNum)!;
          existing.correctLabel = label;
        }
        continue;
      }

      if (currentAnsNum !== null && answerMap.has(currentAnsNum)) {
        const entry = answerMap.get(currentAnsNum)!;
        if (/^Giải thích\s*:/i.test(line)) {
          const expText = line.replace(/^Giải thích\s*:\s*/i, '').trim();
          entry.explanation = entry.explanation ? `${entry.explanation} ${expText}` : expText;
        } else if (/^Nguồn\s*:/i.test(line)) {
          entry.source_ref = line.replace(/^Nguồn\s*:\s*/i, '').trim();
        }
      }
    }

    // 2. Parse Questions
    let currentType: ParsedQuestion['question_type'] = 'recognition';
    const questions: ParsedQuestion[] = [];

    interface TempQuestion {
      qNum: number;
      contentLines: string[];
      type: string;
      options: { label: 'A' | 'B' | 'C' | 'D'; content: string }[];
      source_ref: string;
    }

    let currentQ: TempQuestion | null = null;
    let currentOptLabel: 'A' | 'B' | 'C' | 'D' | null = null;

    const flushQuestion = () => {
      if (!currentQ) return;
      const ansInfo = answerMap.get(currentQ.qNum);
      if (!ansInfo) {
        errors.push(`[${name}] Câu ${currentQ.qNum}: Thiếu đáp án đúng trong bảng đáp án.`);
        currentQ = null;
        return;
      }
      if (currentQ.options.length !== 4) {
        errors.push(`[${name}] Câu ${currentQ.qNum}: Số lượng đáp án không đủ 4 lựa chọn (hiện có ${currentQ.options.length}).`);
        currentQ = null;
        return;
      }

      const fullOptions: ParsedOption[] = currentQ.options.map((opt) => ({
        label: opt.label,
        content: opt.content.trim(),
        is_correct: opt.label === ansInfo.correctLabel,
      }));

      questions.push({
        questionNumber: currentQ.qNum,
        content: currentQ.contentLines.join(' ').trim(),
        question_type: currentQ.type,
        options: fullOptions,
        correctLabel: ansInfo.correctLabel,
        explanation: ansInfo.explanation || '',
        source_ref: currentQ.source_ref || ansInfo.source_ref || '',
        sort_order: currentQ.qNum,
      });

      currentQ = null;
      currentOptLabel = null;
    };

    for (const line of questionLines) {
      if (!line) continue;
      if (/^Tổng số câu:/i.test(line) || /^Hình thức:/i.test(line)) continue;

      if (/^PHẦN\s+I\b/i.test(line) || /NHẬN BIẾT/i.test(line)) {
        flushQuestion();
        currentType = 'recognition';
        continue;
      }
      if (/^PHẦN\s+II\b/i.test(line) || /THÔNG HIỂU/i.test(line)) {
        flushQuestion();
        currentType = 'understanding';
        continue;
      }
      if (/^PHẦN\s+IV\b/i.test(line) || /VẬN DỤNG CAO/i.test(line)) {
        flushQuestion();
        currentType = 'advanced_application';
        continue;
      }
      if (/^PHẦN\s+III\b/i.test(line) || /VẬN DỤNG/i.test(line)) {
        flushQuestion();
        currentType = 'application';
        continue;
      }

      const qMatch = line.match(/^Câu\s*(\d+)\s*[.:]\s*(.+)$/i);
      if (qMatch) {
        flushQuestion();
        currentQ = {
          qNum: parseInt(qMatch[1], 10),
          contentLines: [qMatch[2].trim()],
          type: currentType,
          options: [],
          source_ref: '',
        };
        currentOptLabel = null;
        continue;
      }

      if (currentQ) {
        const optMatch = line.match(/^([A-D])\s*\.\s*(.+)$/);
        if (optMatch) {
          const label = optMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
          currentOptLabel = label;
          currentQ.options.push({
            label,
            content: optMatch[2].trim(),
          });
          continue;
        }

        if (/^Nguồn\s*:/i.test(line)) {
          currentQ.source_ref = line.replace(/^Nguồn\s*:\s*/i, '').trim();
          currentOptLabel = null;
          continue;
        }

        // Continuation line
        if (currentOptLabel && currentQ.options.length > 0) {
          const lastOpt = currentQ.options[currentQ.options.length - 1];
          lastOpt.content += ' ' + line;
        } else {
          currentQ.contentLines.push(line);
        }
      }
    }

    flushQuestion();

    chapters.push({
      name,
      description,
      sort_order: chapterIdx + 1,
      questions,
    });
    totalQuestions += questions.length;
  });

  return {
    chapters,
    totalQuestions,
    errors,
  };
}

export function findQuestionBankFilePath(): string | null {
  const candidates = [
    path.resolve(process.cwd(), '../nganhangcauhoi.txt'),
    path.resolve(process.cwd(), 'nganhangcauhoi.txt'),
    'D:\\embe\\ÔN THI CÙNG PNGAN\\nganhangcauhoi.txt',
    'D:\\embe\\nganhangcauhoi.txt',
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}
