import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

// GET /api/history - Lấy danh sách lịch sử làm bài (đã hoàn thành)
router.get('/', async (req, res) => {
  try {
    const { session_id, sort = 'desc', mode } = req.query;

    const whereClause: any = {
      status: 'completed',
    };

    if (session_id && typeof session_id === 'string') {
      whereClause.anonymous_session_id = session_id;
    }

    if (mode && (mode === 'chapter' || mode === 'comprehensive')) {
      whereClause.exam_mode = mode;
    }

    const attempts = await prisma.examAttempt.findMany({
      where: whereClause,
      orderBy: {
        completed_at: sort === 'asc' ? 'asc' : 'desc',
      },
    });

    const formatted = attempts.map((a) => ({
      id: a.id,
      anonymous_session_id: a.anonymous_session_id,
      exam_mode: a.exam_mode,
      chapter_id: a.chapter_id,
      title: a.title,
      total_questions: a.total_questions,
      correct_count: a.correct_count,
      incorrect_count: a.incorrect_count,
      unanswered_count: a.unanswered_count,
      score: a.score,
      accuracy_percent: a.accuracy_percent,
      started_at: a.started_at,
      completed_at: a.completed_at,
      duration_seconds: a.duration_seconds,
      settings: JSON.parse(a.settings_snapshot || '{}'),
    }));

    res.json({ history: formatted });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Không thể tải lịch sử làm bài.' });
  }
});

// GET /api/history/:id - Xem chi tiết một lần làm bài trong lịch sử
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const attempt = await prisma.examAttempt.findUnique({
      where: { id },
      include: {
        attempt_answers: {
          orderBy: { sort_order: 'asc' },
        },
      },
    });

    if (!attempt || attempt.status !== 'completed') {
      return res.status(404).json({ error: 'Không tìm thấy kết quả bài làm này trong lịch sử.' });
    }

    const detailedQuestions = attempt.attempt_answers.map((ans) => {
      const qSnap = JSON.parse(ans.question_snapshot);
      const optsSnap = JSON.parse(ans.options_snapshot);
      return {
        attempt_answer_id: ans.id,
        question_id: ans.question_id,
        sort_order: ans.sort_order,
        content: qSnap.content,
        question_type: qSnap.question_type,
        chapter_id: qSnap.chapter_id,
        chapter_name: qSnap.chapter_name,
        source_ref: qSnap.source_ref,
        selected_option_id: ans.selected_option_id,
        selected_label: ans.selected_label,
        correct_label: ans.correct_answer_snapshot,
        is_correct: ans.is_correct,
        explanation: ans.explanation_snapshot,
        options: optsSnap,
      };
    });

    res.json({
      attempt: {
        id: attempt.id,
        status: attempt.status,
        exam_mode: attempt.exam_mode,
        chapter_id: attempt.chapter_id,
        title: attempt.title,
        total_questions: attempt.total_questions,
        correct_count: attempt.correct_count,
        incorrect_count: attempt.incorrect_count,
        unanswered_count: attempt.unanswered_count,
        score: attempt.score,
        accuracy_percent: attempt.accuracy_percent,
        started_at: attempt.started_at,
        completed_at: attempt.completed_at,
        duration_seconds: attempt.duration_seconds,
        settings: JSON.parse(attempt.settings_snapshot || '{}'),
        questions: detailedQuestions,
      },
    });
  } catch (error) {
    console.error('Error fetching history detail:', error);
    res.status(500).json({ error: 'Không thể tải chi tiết lần làm bài.' });
  }
});

export default router;
