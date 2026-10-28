import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { prisma } from './prisma';
import chaptersRouter from './routes/chapters';
import examsRouter from './routes/exams';
import historyRouter from './routes/history';
import { findQuestionBankFilePath, parseNganHangCauHoiTxt } from './utils/bankParser';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Health check
app.get('/api/health', async (_req, res) => {
  try {
    const chapterCount = await prisma.chapter.count({ where: { is_active: true } });
    const questionCount = await prisma.question.count({ where: { is_active: true } });
    res.json({
      status: 'ok',
      project: 'Hello Kitty Quiz',
      chapters: chapterCount,
      questions: questionCount,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Database connection error' });
  }
});

// Routes
app.use('/api/chapters', chaptersRouter);
app.use('/api/exams', examsRouter);
app.use('/api/history', historyRouter);

// API hỗ trợ nạp lại dữ liệu từ nganhangcauhoi.txt hoặc nhập JSON
app.post('/api/import/sync-txt', async (_req, res) => {
  try {
    const bankPath = findQuestionBankFilePath();
    if (!bankPath) {
      return res.status(404).json({ error: 'Không tìm thấy file nganhangcauhoi.txt' });
    }
    const rawText = fs.readFileSync(bankPath, 'utf-8');
    const report = parseNganHangCauHoiTxt(rawText);

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
    }

    res.json({
      message: 'Đồng bộ ngân hàng câu hỏi thành công!',
      chapters_imported: report.chapters.length,
      questions_imported: report.totalQuestions,
      errors: report.errors,
    });
  } catch (error) {
    console.error('Error syncing question bank:', error);
    res.status(500).json({ error: 'Lỗi khi đồng bộ ngân hàng câu hỏi.' });
  }
});

async function ensureSeededIfEmpty() {
  try {
    const count = await prisma.question.count();
    if (count === 0) {
      const bankPath = findQuestionBankFilePath();
      if (bankPath) {
        console.log('🎀 Ngân hàng câu hỏi đang trống, tự động nạp từ:', bankPath);
        const rawText = fs.readFileSync(bankPath, 'utf-8');
        const report = parseNganHangCauHoiTxt(rawText);
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
        }
        console.log(`✅ Đã nạp tự động ${report.chapters.length} chương (${report.totalQuestions} câu hỏi).`);
      }
    }
  } catch (err) {
    console.warn('⚠️ Không thể tự động kiểm tra seed:', err);
  }
}

app.listen(PORT, '0.0.0.0', async () => {
  await ensureSeededIfEmpty();
  console.log(`🎀 [Hello Kitty Quiz Backend] Server đang chạy tại http://0.0.0.0:${PORT}`);
});
