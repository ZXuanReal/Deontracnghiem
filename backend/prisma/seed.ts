import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import { findQuestionBankFilePath, parseNganHangCauHoiTxt } from '../src/utils/bankParser';

const prisma = new PrismaClient();

async function main() {
  console.log('🎀 [Hello Kitty Quiz] Bắt đầu khởi tạo và nạp ngân hàng câu hỏi...');

  const bankPath = findQuestionBankFilePath();
  if (!bankPath) {
    throw new Error('Không tìm thấy file nganhangcauhoi.txt trong D:\\embe hoặc thư mục dự án!');
  }

  console.log(`📖 Đang đọc dữ liệu từ: ${bankPath}`);
  const rawText = fs.readFileSync(bankPath, 'utf-8');
  const report = parseNganHangCauHoiTxt(rawText);

  if (report.errors.length > 0) {
    console.warn('⚠️ Cảnh báo một số bản ghi lỗi khi phân tích:', report.errors);
  }

  console.log(
    `✅ Phân tích thành công: ${report.chapters.length} chương, tổng cộng ${report.totalQuestions} câu hỏi.`
  );

  // Clear existing questions and chapters (preserving exam_attempts history snapshots!)
  await prisma.option.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.chapter.deleteMany({});

  for (const ch of report.chapters) {
    const createdChapter = await prisma.chapter.create({
      data: {
        name: ch.name,
        description: ch.description,
        sort_order: ch.sort_order,
        is_active: true,
        is_sample: false,
      },
    });

    for (const q of ch.questions) {
      await prisma.question.create({
        data: {
          chapter_id: createdChapter.id,
          content: q.content,
          question_type: q.question_type,
          explanation: q.explanation,
          source_ref: q.source_ref,
          is_active: true,
          is_sample: false,
          sort_order: q.sort_order,
          options: {
            create: q.options.map((opt) => ({
              label: opt.label,
              content: opt.content,
              is_correct: opt.is_correct,
            })),
          },
        },
      });
    }

    console.log(`🌸 Đã nạp [${createdChapter.name}]: ${ch.questions.length} câu hỏi.`);
  }

  console.log('🎉 Hoàn tất nạp ngân hàng câu hỏi vào SQLite Database!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi seed database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
