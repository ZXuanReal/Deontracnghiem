import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { findQuestionBankFilePath, parseNganHangCauHoiTxt } from '../utils/bankParser';

const prisma = new PrismaClient();

interface JsonQuestionInput {
  chapter_name: string;
  chapter_description?: string;
  content: string;
  question_type: string;
  explanation?: string;
  source_ref?: string;
  options: {
    label: string;
    content: string;
    is_correct: boolean;
  }[];
}

async function importFromJson(filePath: string) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const items: JsonQuestionInput[] = JSON.parse(raw);
  const errors: string[] = [];
  let importedCount = 0;

  const validTypes = ['recognition', 'understanding', 'application', 'advanced_application'];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rowLabel = `Bản ghi #${i + 1}`;
    if (!item.chapter_name || !item.content) {
      errors.push(`${rowLabel}: Thiếu chapter_name hoặc content.`);
      continue;
    }
    if (!validTypes.includes(item.question_type)) {
      errors.push(`${rowLabel}: question_type "${item.question_type}" không hợp lệ.`);
      continue;
    }
    if (!Array.isArray(item.options) || item.options.length !== 4) {
      errors.push(`${rowLabel}: Phải có đúng 4 lựa chọn A, B, C, D.`);
      continue;
    }
    const correctCount = item.options.filter((o) => o.is_correct).length;
    if (correctCount !== 1) {
      errors.push(`${rowLabel}: Phải có đúng 1 đáp án đúng (hiện có ${correctCount}).`);
      continue;
    }

    let chapter = await prisma.chapter.findFirst({
      where: { name: item.chapter_name, is_sample: false },
    });
    if (!chapter) {
      const count = await prisma.chapter.count();
      chapter = await prisma.chapter.create({
        data: {
          name: item.chapter_name,
          description: item.chapter_description || '',
          sort_order: count + 1,
          is_active: true,
          is_sample: false,
        },
      });
    }

    const qCount = await prisma.question.count({ where: { chapter_id: chapter.id } });
    await prisma.question.create({
      data: {
        chapter_id: chapter.id,
        content: item.content.trim(),
        question_type: item.question_type,
        explanation: item.explanation || '',
        source_ref: item.source_ref || '',
        is_active: true,
        is_sample: false,
        sort_order: qCount + 1,
        options: {
          create: item.options.map((o) => ({
            label: o.label.toUpperCase(),
            content: o.content.trim(),
            is_correct: Boolean(o.is_correct),
          })),
        },
      },
    });
    importedCount++;
  }

  console.log(`📊 Kết quả nhập JSON: Thành công ${importedCount}/${items.length} câu hỏi.`);
  if (errors.length > 0) {
    console.log('⚠️ Chi tiết các bản ghi lỗi:');
    errors.forEach((e) => console.log('  - ' + e));
  }
}

async function run() {
  const customFile = process.argv[2];
  if (customFile) {
    const resolved = path.resolve(process.cwd(), customFile);
    if (!fs.existsSync(resolved)) {
      console.error(`❌ Không tìm thấy file: ${resolved}`);
      process.exit(1);
    }
    if (resolved.endsWith('.json')) {
      await importFromJson(resolved);
      return;
    }
    const raw = fs.readFileSync(resolved, 'utf-8');
    const report = parseNganHangCauHoiTxt(raw);
    console.log(`📊 Phân tích file TXT: ${report.chapters.length} chương, ${report.totalQuestions} câu hỏi.`);
    if (report.errors.length > 0) {
      console.log('⚠️ Phát hiện lỗi:', report.errors);
    }
    return;
  }

  const defaultBank = findQuestionBankFilePath();
  if (!defaultBank) {
    console.error('❌ Không tìm thấy nganhangcauhoi.txt');
    process.exit(1);
  }
  const raw = fs.readFileSync(defaultBank, 'utf-8');
  const report = parseNganHangCauHoiTxt(raw);
  console.log(`✅ Kiểm tra nganhangcauhoi.txt: ${report.chapters.length} chương, ${report.totalQuestions} câu hỏi hợp lệ, ${report.errors.length} lỗi.`);
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
