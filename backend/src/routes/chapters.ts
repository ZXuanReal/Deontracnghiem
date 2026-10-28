import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

// GET /api/chapters - Lấy danh sách chương đang hoạt động kèm thống kê số câu theo từng mức độ
router.get('/', async (_req, res) => {
  try {
    const chapters = await prisma.chapter.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' },
      include: {
        questions: {
          where: { is_active: true },
          select: { id: true, question_type: true },
        },
      },
    });

    const formatted = chapters.map((ch) => {
      const countsByType: Record<string, number> = {
        recognition: 0,
        understanding: 0,
        application: 0,
        advanced_application: 0,
      };
      for (const q of ch.questions) {
        countsByType[q.question_type] = (countsByType[q.question_type] || 0) + 1;
      }

      return {
        id: ch.id,
        name: ch.name,
        description: ch.description,
        sort_order: ch.sort_order,
        is_active: ch.is_active,
        total_questions: ch.questions.length,
        counts_by_type: countsByType,
      };
    });

    res.json({ chapters: formatted });
  } catch (error) {
    console.error('Error fetching chapters:', error);
    res.status(500).json({ error: 'Không thể tải danh sách chương bài học từ cơ sở dữ liệu.' });
  }
});

export default router;
