import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  recognition: 'Nhận biết',
  understanding: 'Thông hiểu',
  application: 'Vận dụng',
  advanced_application: 'Vận dụng cao',
};

function fisherYatesShuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Phân bổ câu hỏi cân bằng giữa các chương (tránh tập trung vào 1 chương)
function selectBalancedAcrossChapters<T extends { chapter_id: number }>(
  questions: T[],
  targetCount: number,
  shuffle: boolean
): T[] {
  if (targetCount >= questions.length) {
    return shuffle ? fisherYatesShuffle(questions) : questions;
  }

  const byChapter = new Map<number, T[]>();
  for (const q of questions) {
    if (!byChapter.has(q.chapter_id)) {
      byChapter.set(q.chapter_id, []);
    }
    byChapter.get(q.chapter_id)!.push(q);
  }

  // Shuffle within each chapter pool first so random picking from each chapter is unbiased
  const chapterPools: T[][] = [];
  for (const [, pool] of byChapter.entries()) {
    chapterPools.push(shuffle ? fisherYatesShuffle(pool) : [...pool]);
  }

  // Shuffle chapter order for round-robin fairness
  const orderedPools = shuffle ? fisherYatesShuffle(chapterPools) : chapterPools;
  const selected: T[] = [];
  let poolIdx = 0;

  while (selected.length < targetCount) {
    let addedInCycle = false;
    for (let i = 0; i < orderedPools.length && selected.length < targetCount; i++) {
      const pool = orderedPools[(poolIdx + i) % orderedPools.length];
      if (pool.length > 0) {
        selected.push(pool.shift()!);
        addedInCycle = true;
      }
    }
    poolIdx++;
    if (!addedInCycle) break;
  }

  return selected;
}

// POST /api/exams/generate - Tạo đề luyện tập theo chương hoặc đề tổng hợp
router.post('/generate', async (req, res) => {
  try {
    const {
      anonymous_session_id,
      exam_mode = 'chapter', // 'chapter' | 'comprehensive'
      chapter_id,
      chapter_ids,
      filter_enabled = false,
      selected_types = [],
      question_count = 40, // number | 'all'
      shuffle = true,
      use_custom_quota = false,
      custom_quota = null,
      allow_partial = false,
    } = req.body;

    if (!anonymous_session_id) {
      return res.status(400).json({ error: 'Thiếu mã phiên làm bài (anonymous_session_id).' });
    }

    // Check if database has any active questions at all
    const totalInDb = await prisma.question.count({ where: { is_active: true } });
    if (totalInDb === 0) {
      return res.status(400).json({
        code: 'EMPTY_BANK',
        error:
          'Ngân hàng câu hỏi hiện đang trống. Vui lòng chạy lệnh nạp dữ liệu (npm run seed) hoặc nhập câu hỏi trước khi bắt đầu.',
      });
    }

    // Validate level filter if enabled
    if (filter_enabled && (!Array.isArray(selected_types) || selected_types.length === 0)) {
      return res.status(400).json({
        code: 'EMPTY_FILTER',
        error:
          'Chế độ lọc mức độ đang BẬT nhưng bạn chưa chọn mức độ nào. Vui lòng chọn ít nhất một mức độ (ví dụ: Nhận biết, Thông hiểu) hoặc TẮT chế độ lọc mức độ để lấy tất cả câu hỏi.',
      });
    }

    // Build query conditions
    const whereClause: any = {
      is_active: true,
      chapter: { is_active: true },
    };

    let examTitle = 'Đề kiểm tra tổng hợp';

    if (exam_mode === 'chapter') {
      if (!chapter_id) {
        return res.status(400).json({ error: 'Vui lòng chọn một chương bài học để luyện tập.' });
      }
      const chapter = await prisma.chapter.findFirst({
        where: { id: Number(chapter_id), is_active: true },
      });
      if (!chapter) {
        return res.status(404).json({ error: 'Không tìm thấy chương bài học đã chọn.' });
      }
      whereClause.chapter_id = chapter.id;
      examTitle = chapter.name;
    } else {
      // Comprehensive mode
      if (Array.isArray(chapter_ids) && chapter_ids.length > 0) {
        whereClause.chapter_id = { in: chapter_ids.map(Number) };
      }
    }

    // Apply level filter ONLY when filter_enabled is true and not overridden by custom_quota
    if (filter_enabled && !(exam_mode === 'comprehensive' && use_custom_quota)) {
      whereClause.question_type = { in: selected_types };
    }

    const matchingQuestions = await prisma.question.findMany({
      where: whereClause,
      orderBy: [{ chapter_id: 'asc' }, { sort_order: 'asc' }, { id: 'asc' }],
      include: {
        chapter: { select: { id: true, name: true, sort_order: true } },
        options: { orderBy: { label: 'asc' } },
      },
    });

    if (matchingQuestions.length === 0) {
      const modeMsg =
        exam_mode === 'chapter'
          ? 'Chương đang chọn hiện không có câu hỏi nào thuộc mức độ bạn đã lọc. Hệ thống không tự lấy câu hỏi từ chương khác.'
          : 'Không tìm thấy câu hỏi nào trong ngân hàng phù hợp với bộ lọc hiện tại.';
      return res.status(400).json({
        code: 'NO_MATCHING_QUESTIONS',
        error: modeMsg,
      });
    }

    let finalQuestions: typeof matchingQuestions = [];
    const requestedTotal =
      question_count === 'all' ? matchingQuestions.length : Math.max(1, Number(question_count) || 40);

    // Case A: Comprehensive exam with custom level quota (e.g., 15 Nhận biết, 10 Thông hiểu, 10 Vận dụng, 5 Vận dụng cao)
    if (exam_mode === 'comprehensive' && use_custom_quota && custom_quota) {
      const typesOrder = ['recognition', 'understanding', 'application', 'advanced_application'];
      const shortages: {
        type: string;
        label: string;
        requested: number;
        available: number;
      }[] = [];
      const actualQuota: Record<string, number> = {};
      let sumRequested = 0;

      for (const t of typesOrder) {
        const reqCount = Math.max(0, Number(custom_quota[t] || 0));
        if (reqCount === 0) {
          actualQuota[t] = 0;
          continue;
        }
        sumRequested += reqCount;
        // If filter_enabled is true and this type is not in selected_types, available is 0
        const poolForType = matchingQuestions.filter(
          (q) => q.question_type === t && (!filter_enabled || selected_types.includes(t))
        );
        if (poolForType.length < reqCount) {
          shortages.push({
            type: t,
            label: QUESTION_TYPE_LABELS[t] || t,
            requested: reqCount,
            available: poolForType.length,
          });
          actualQuota[t] = poolForType.length;
        } else {
          actualQuota[t] = reqCount;
        }
      }

      if (sumRequested === 0) {
        return res.status(400).json({
          error: 'Tổng số câu trong cơ cấu phân bổ phải lớn hơn 0.',
        });
      }

      const totalActual = Object.values(actualQuota).reduce((a, b) => a + b, 0);
      if (totalActual === 0) {
        return res.status(400).json({
          code: 'NO_MATCHING_QUESTIONS',
          error: 'Không có câu hỏi nào đáp ứng cơ cấu mức độ đã chọn.',
        });
      }

      if (shortages.length > 0 && !allow_partial) {
        return res.status(200).json({
          status: 'shortage',
          shortage_type: 'quota',
          message:
            'Ngân hàng câu hỏi hiện không đủ số câu ở một số mức độ theo cơ cấu yêu cầu.',
          shortages,
          requested_total: sumRequested,
          available_total: totalActual,
          actual_quota: actualQuota,
        });
      }

      // Pick balanced across chapters for each level quota
      for (const t of typesOrder) {
        const countToPick = actualQuota[t] || 0;
        if (countToPick > 0) {
          const poolForType = matchingQuestions.filter(
            (q) => q.question_type === t && (!filter_enabled || selected_types.includes(t))
          );
          const picked = selectBalancedAcrossChapters(poolForType, countToPick, true);
          finalQuestions.push(...picked);
        }
      }
    } else {
      // Case B: Standard Chapter or Comprehensive exam
      if (question_count !== 'all' && matchingQuestions.length < requestedTotal && !allow_partial) {
        return res.status(200).json({
          status: 'shortage',
          shortage_type: 'count',
          message: `Số câu hỏi yêu cầu (${requestedTotal} câu) lớn hơn số câu thực tế phù hợp sau khi lọc (${matchingQuestions.length} câu). Hệ thống không tạo câu giả hoặc lấy câu từ chương khác để bù.`,
          requested_total: requestedTotal,
          available_total: matchingQuestions.length,
        });
      }

      const countToTake = Math.min(requestedTotal, matchingQuestions.length);

      if (exam_mode === 'comprehensive') {
        finalQuestions = selectBalancedAcrossChapters(matchingQuestions, countToTake, shuffle);
      } else {
        // Chapter mode
        if (shuffle) {
          finalQuestions = fisherYatesShuffle(matchingQuestions).slice(0, countToTake);
        } else {
          finalQuestions = matchingQuestions.slice(0, countToTake);
        }
      }
    }

    // Ensure strict deduplication by question.id
    const seenIds = new Set<number>();
    const uniqueQuestions = finalQuestions.filter((q) => {
      if (seenIds.has(q.id)) return false;
      seenIds.add(q.id);
      return true;
    });

    // Final order: if shuffle is enabled, shuffle the whole selected list; if disabled, sort by chapter & sort_order
    const orderedQuestions = shuffle
      ? fisherYatesShuffle(uniqueQuestions)
      : [...uniqueQuestions].sort((a, b) => {
          if (a.chapter.sort_order !== b.chapter.sort_order) {
            return a.chapter.sort_order - b.chapter.sort_order;
          }
          return a.sort_order - b.sort_order;
        });

    const settingsSnapshot = JSON.stringify({
      exam_mode,
      chapter_id: exam_mode === 'chapter' ? Number(chapter_id) : null,
      chapter_ids: exam_mode === 'comprehensive' ? chapter_ids : null,
      filter_enabled,
      selected_types: filter_enabled ? selected_types : [],
      requested_question_count: question_count,
      actual_question_count: orderedQuestions.length,
      shuffle,
      use_custom_quota,
      custom_quota,
    });

    // Save ExamAttempt and AttemptAnswer snapshots in DB so exam state and history are 100% consistent
    const attempt = await prisma.examAttempt.create({
      data: {
        anonymous_session_id,
        exam_mode,
        chapter_id: exam_mode === 'chapter' ? Number(chapter_id) : null,
        title: examTitle,
        total_questions: orderedQuestions.length,
        unanswered_count: orderedQuestions.length,
        settings_snapshot: settingsSnapshot,
        status: 'in_progress',
        attempt_answers: {
          create: orderedQuestions.map((q, idx) => {
            const correctOpt = q.options.find((o) => o.is_correct);
            return {
              question_id: q.id,
              sort_order: idx + 1,
              question_snapshot: JSON.stringify({
                id: q.id,
                content: q.content,
                question_type: q.question_type,
                chapter_id: q.chapter.id,
                chapter_name: q.chapter.name,
                source_ref: q.source_ref || '',
              }),
              options_snapshot: JSON.stringify(
                q.options.map((o) => ({
                  id: o.id,
                  label: o.label,
                  content: o.content,
                  is_correct: o.is_correct,
                }))
              ),
              correct_answer_snapshot: correctOpt ? correctOpt.label : 'A',
              explanation_snapshot: q.explanation || '',
            };
          }),
        },
      },
      include: {
        attempt_answers: {
          orderBy: { sort_order: 'asc' },
        },
      },
    });

    // Return safe payload WITHOUT correct answers or explanations
    const safeQuestions = attempt.attempt_answers.map((ans) => {
      const qSnap = JSON.parse(ans.question_snapshot);
      const optsSnap = JSON.parse(ans.options_snapshot) as Array<{
        id: number;
        label: string;
        content: string;
      }>;
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
        options: optsSnap.map((o) => ({
          id: o.id,
          label: o.label,
          content: o.content,
        })),
      };
    });

    return res.status(201).json({
      status: 'created',
      attempt: {
        id: attempt.id,
        exam_mode: attempt.exam_mode,
        chapter_id: attempt.chapter_id,
        title: attempt.title,
        total_questions: attempt.total_questions,
        started_at: attempt.started_at,
        duration_seconds: attempt.duration_seconds,
        settings: JSON.parse(attempt.settings_snapshot),
        questions: safeQuestions,
      },
    });
  } catch (error) {
    console.error('Error generating exam:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi khởi tạo đề kiểm tra.' });
  }
});

// GET /api/exams/:id - Lấy thông tin lượt thi (đang làm hoặc đã nộp)
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

    if (!attempt) {
      return res.status(404).json({ error: 'Không tìm thấy lượt làm bài này.' });
    }

    if (attempt.status === 'in_progress') {
      const safeQuestions = attempt.attempt_answers.map((ans) => {
        const qSnap = JSON.parse(ans.question_snapshot);
        const optsSnap = JSON.parse(ans.options_snapshot) as Array<{
          id: number;
          label: string;
          content: string;
        }>;
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
          options: optsSnap.map((o) => ({
            id: o.id,
            label: o.label,
            content: o.content,
          })),
        };
      });

      return res.json({
        attempt: {
          id: attempt.id,
          status: attempt.status,
          exam_mode: attempt.exam_mode,
          chapter_id: attempt.chapter_id,
          title: attempt.title,
          total_questions: attempt.total_questions,
          started_at: attempt.started_at,
          duration_seconds: attempt.duration_seconds,
          settings: JSON.parse(attempt.settings_snapshot),
          questions: safeQuestions,
        },
      });
    }

    // Completed attempt -> return full details including correct answers and explanations
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

    return res.json({
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
        settings: JSON.parse(attempt.settings_snapshot),
        questions: detailedQuestions,
      },
    });
  } catch (error) {
    console.error('Error fetching exam attempt:', error);
    res.status(500).json({ error: 'Không thể tải thông tin bài kiểm tra.' });
  }
});

// PATCH /api/exams/:id/progress - Lưu tạm tiến độ làm bài
router.patch('/:id/progress', async (req, res) => {
  try {
    const { id } = req.params;
    const { answers = [], duration_seconds = 0 } = req.body;

    const attempt = await prisma.examAttempt.findUnique({ where: { id } });
    if (!attempt || attempt.status === 'completed') {
      return res.json({ ok: true });
    }

    await prisma.$transaction(async (tx) => {
      await tx.examAttempt.update({
        where: { id },
        data: { duration_seconds: Math.max(0, Number(duration_seconds) || 0) },
      });

      if (Array.isArray(answers)) {
        for (const item of answers) {
          if (item.attempt_answer_id) {
            await tx.attemptAnswer.updateMany({
              where: { id: Number(item.attempt_answer_id), attempt_id: id },
              data: {
                selected_option_id: item.selected_option_id ?? null,
                selected_label: item.selected_label ?? null,
              },
            });
          }
        }
      }
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('Error saving progress:', error);
    res.status(500).json({ error: 'Không thể lưu tiến độ.' });
  }
});

// POST /api/exams/:id/submit - Nộp bài và chấm điểm (chống nộp trùng lặp)
router.post('/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    const { answers = [], duration_seconds = 0 } = req.body;

    const existingAttempt = await prisma.examAttempt.findUnique({
      where: { id },
      include: {
        attempt_answers: {
          orderBy: { sort_order: 'asc' },
        },
      },
    });

    if (!existingAttempt) {
      return res.status(404).json({ error: 'Không tìm thấy lượt làm bài này.' });
    }

    // Chống nộp bài trùng lặp: Nếu đã completed, trả về ngay kết quả đã lưu
    if (existingAttempt.status === 'completed') {
      const detailedQuestions = existingAttempt.attempt_answers.map((ans) => {
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

      return res.json({
        already_submitted: true,
        attempt: {
          id: existingAttempt.id,
          status: existingAttempt.status,
          exam_mode: existingAttempt.exam_mode,
          chapter_id: existingAttempt.chapter_id,
          title: existingAttempt.title,
          total_questions: existingAttempt.total_questions,
          correct_count: existingAttempt.correct_count,
          incorrect_count: existingAttempt.incorrect_count,
          unanswered_count: existingAttempt.unanswered_count,
          score: existingAttempt.score,
          accuracy_percent: existingAttempt.accuracy_percent,
          started_at: existingAttempt.started_at,
          completed_at: existingAttempt.completed_at,
          duration_seconds: existingAttempt.duration_seconds,
          settings: JSON.parse(existingAttempt.settings_snapshot),
          questions: detailedQuestions,
        },
      });
    }

    // Map submitted answers by attempt_answer_id or question_id
    const submittedByAnswerId = new Map<
      number,
      { selected_option_id: number | null; selected_label: string | null }
    >();
    const submittedByQuestionId = new Map<
      number,
      { selected_option_id: number | null; selected_label: string | null }
    >();

    if (Array.isArray(answers)) {
      for (const a of answers) {
        if (a.attempt_answer_id != null) {
          submittedByAnswerId.set(Number(a.attempt_answer_id), {
            selected_option_id: a.selected_option_id != null ? Number(a.selected_option_id) : null,
            selected_label: a.selected_label ? String(a.selected_label).toUpperCase() : null,
          });
        }
        if (a.question_id != null) {
          submittedByQuestionId.set(Number(a.question_id), {
            selected_option_id: a.selected_option_id != null ? Number(a.selected_option_id) : null,
            selected_label: a.selected_label ? String(a.selected_label).toUpperCase() : null,
          });
        }
      }
    }

    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    const answerUpdates = existingAttempt.attempt_answers.map((ansRecord) => {
      const sub =
        submittedByAnswerId.get(ansRecord.id) ||
        (ansRecord.question_id != null ? submittedByQuestionId.get(ansRecord.question_id) : undefined);

      let selectedOptionId = sub !== undefined ? sub.selected_option_id : ansRecord.selected_option_id;
      let selectedLabel = sub !== undefined ? sub.selected_label : ansRecord.selected_label;

      // Resolve label from options_snapshot if only selected_option_id was passed
      const optsSnap = JSON.parse(ansRecord.options_snapshot) as Array<{
        id: number;
        label: string;
        content: string;
        is_correct: boolean;
      }>;

      if (selectedOptionId != null && !selectedLabel) {
        const foundOpt = optsSnap.find((o) => o.id === selectedOptionId);
        if (foundOpt) selectedLabel = foundOpt.label;
      } else if (selectedLabel && selectedOptionId == null) {
        const foundOpt = optsSnap.find((o) => o.label === selectedLabel);
        if (foundOpt) selectedOptionId = foundOpt.id;
      }

      const isUnanswered = !selectedLabel;
      const isCorrect = !isUnanswered && selectedLabel === ansRecord.correct_answer_snapshot;

      if (isUnanswered) {
        unansweredCount++;
      } else if (isCorrect) {
        correctCount++;
      } else {
        incorrectCount++;
      }

      return {
        id: ansRecord.id,
        selected_option_id: selectedOptionId ?? null,
        selected_label: selectedLabel ?? null,
        is_correct: isCorrect,
      };
    });

    const totalQuestions = existingAttempt.total_questions || existingAttempt.attempt_answers.length;
    const accuracyPercent =
      totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 10000) / 100 : 0;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 1000) / 100 : 0;

    const now = new Date();
    const elapsedFromStart = Math.max(
      1,
      Math.round((now.getTime() - new Date(existingAttempt.started_at).getTime()) / 1000)
    );
    const finalDuration =
      Number(duration_seconds) > 0 ? Number(duration_seconds) : elapsedFromStart;

    const updatedAttempt = await prisma.$transaction(async (tx) => {
      for (const upd of answerUpdates) {
        await tx.attemptAnswer.update({
          where: { id: upd.id },
          data: {
            selected_option_id: upd.selected_option_id,
            selected_label: upd.selected_label,
            is_correct: upd.is_correct,
          },
        });
      }

      return tx.examAttempt.update({
        where: { id },
        data: {
          correct_count: correctCount,
          incorrect_count: incorrectCount,
          unanswered_count: unansweredCount,
          score,
          accuracy_percent: accuracyPercent,
          completed_at: now,
          duration_seconds: finalDuration,
          status: 'completed',
        },
        include: {
          attempt_answers: {
            orderBy: { sort_order: 'asc' },
          },
        },
      });
    });

    const detailedQuestions = updatedAttempt.attempt_answers.map((ans) => {
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

    return res.json({
      attempt: {
        id: updatedAttempt.id,
        status: updatedAttempt.status,
        exam_mode: updatedAttempt.exam_mode,
        chapter_id: updatedAttempt.chapter_id,
        title: updatedAttempt.title,
        total_questions: updatedAttempt.total_questions,
        correct_count: updatedAttempt.correct_count,
        incorrect_count: updatedAttempt.incorrect_count,
        unanswered_count: updatedAttempt.unanswered_count,
        score: updatedAttempt.score,
        accuracy_percent: updatedAttempt.accuracy_percent,
        started_at: updatedAttempt.started_at,
        completed_at: updatedAttempt.completed_at,
        duration_seconds: updatedAttempt.duration_seconds,
        settings: JSON.parse(updatedAttempt.settings_snapshot),
        questions: detailedQuestions,
      },
    });
  } catch (error) {
    console.error('Error submitting exam:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi nộp bài và chấm điểm.' });
  }
});

export default router;
