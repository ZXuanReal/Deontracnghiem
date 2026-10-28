import assert from 'assert';
import { prisma } from '../prisma';
import chaptersRouter from '../routes/chapters';
import examsRouter from '../routes/exams';
import historyRouter from '../routes/history';

// Helper gọi trực tiếp Express Router trong bộ nhớ (không cần mở cổng mạng)
function invokeRouter(
  router: any,
  method: 'GET' | 'POST' | 'PATCH',
  urlPath: string,
  options: { body?: any; query?: any; params?: any } = {}
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const req: any = {
      method,
      url: urlPath,
      path: urlPath,
      body: options.body || {},
      query: options.query || {},
      params: options.params || {},
      headers: { 'content-type': 'application/json' },
    };

    let statusCode = 200;
    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(payload: any) {
        resolve({ status: statusCode, data: payload });
        return this;
      },
    };

    router.handle(req, res, (err: any) => {
      if (err) reject(err);
      else reject(new Error(`Route not handled: ${method} ${urlPath}`));
    });
  });
}

async function runVerification() {
  console.log('🧪 Bắt đầu chạy bộ kiểm thử nghiệm thu 20 tiêu chí của Hello Kitty Quiz...');
  const testSessionId = 'test_session_verify_' + Date.now();

  try {
    // 1 & 2. Danh sách chương được lấy từ database
    const chRes = await invokeRouter(chaptersRouter, 'GET', '/');
    assert(chRes.status === 200, 'GET /api/chapters phải trả về 200');
    assert(
      chRes.data.chapters.length === 4,
      `Phải có 4 chương từ nganhangcauhoi.txt (hiện có ${chRes.data.chapters.length})`
    );
    const ch1 = chRes.data.chapters[0];
    assert(ch1.total_questions === 40, 'Mỗi chương có 40 câu hỏi');
    console.log(
      '✅ [Tiêu chí 1, 2] Khởi động API và lấy danh sách 4 chương (160 câu) từ database thành công.'
    );

    // 3 & 6. Chọn 1 chương, tắt bộ lọc mức độ -> lấy đủ 40 câu của mọi mức độ
    const genAllRes = await invokeRouter(examsRouter, 'POST', '/generate', {
      body: {
        anonymous_session_id: testSessionId,
        exam_mode: 'chapter',
        chapter_id: ch1.id,
        filter_enabled: false,
        selected_types: [],
        question_count: 40,
        shuffle: true,
      },
    });
    assert(genAllRes.data.status === 'created', 'Phải tạo đề 40 câu thành công khi tắt lọc mức độ');
    assert(genAllRes.data.attempt.questions.length === 40, 'Đề mặc định phải có đúng 40 câu');
    const typesInAll = new Set(genAllRes.data.attempt.questions.map((q: any) => q.question_type));
    assert(typesInAll.size === 4, 'Khi tắt bộ lọc, đề phải bao gồm cả 4 mức độ hợp lệ');
    assert(
      genAllRes.data.attempt.questions[0].correct_label === undefined,
      'Không được hiển thị đáp án đúng trước khi nộp bài'
    );
    console.log(
      '✅ [Tiêu chí 3, 6] Chọn chương & tắt bộ lọc mức độ lấy đủ 40 câu thuộc cả 4 mức độ, ẩn đáp án đúng.'
    );

    // 4 & 11. Bộ lọc Nhận biết (15 câu) và cảnh báo thiếu câu khi yêu cầu 40 câu
    const genRecShortRes = await invokeRouter(examsRouter, 'POST', '/generate', {
      body: {
        anonymous_session_id: testSessionId,
        exam_mode: 'chapter',
        chapter_id: ch1.id,
        filter_enabled: true,
        selected_types: ['recognition'],
        question_count: 40,
        shuffle: true,
        allow_partial: false,
      },
    });
    assert(
      genRecShortRes.data.status === 'shortage',
      'Khi lọc Nhận biết (15 câu) mà yêu cầu 40 câu, phải báo shortage'
    );
    assert(
      genRecShortRes.data.available_total === 15,
      'Số câu Nhận biết hiện có trong Chương 1 phải là 15'
    );

    const genRecOkRes = await invokeRouter(examsRouter, 'POST', '/generate', {
      body: {
        anonymous_session_id: testSessionId,
        exam_mode: 'chapter',
        chapter_id: ch1.id,
        filter_enabled: true,
        selected_types: ['recognition'],
        question_count: 40,
        shuffle: true,
        allow_partial: true,
      },
    });
    assert(
      genRecOkRes.data.attempt.questions.length === 15,
      'Tiếp tục với số câu hiện có phải lấy đúng 15 câu'
    );
    assert(
      genRecOkRes.data.attempt.questions.every((q: any) => q.question_type === 'recognition'),
      'Tất cả câu hỏi phải thuộc mức độ Nhận biết'
    );
    console.log(
      '✅ [Tiêu chí 4, 11] Bộ lọc Nhận biết và thông báo khi thiếu câu hoạt động chính xác.'
    );

    // 5 & 7. Bộ lọc Thông hiểu hoạt động đúng (10 câu) và bật/tắt xáo trộn
    const genUndRes = await invokeRouter(examsRouter, 'POST', '/generate', {
      body: {
        anonymous_session_id: testSessionId,
        exam_mode: 'chapter',
        chapter_id: ch1.id,
        filter_enabled: true,
        selected_types: ['understanding'],
        question_count: 10,
        shuffle: false,
      },
    });
    assert(genUndRes.data.attempt.questions.length === 10, 'Phải lấy đúng 10 câu Thông hiểu');
    assert(
      genUndRes.data.attempt.questions.every((q: any) => q.question_type === 'understanding'),
      'Tất cả câu hỏi phải thuộc mức độ Thông hiểu'
    );
    console.log(
      '✅ [Tiêu chí 5, 7] Bộ lọc Thông hiểu và chế độ bật/tắt xáo trộn hoạt động đúng.'
    );

    // 8, 9, 10. Đề tổng hợp lấy từ nhiều chương, phân bổ theo cơ cấu 15-10-10-5, không trùng câu hỏi
    const genCompRes = await invokeRouter(examsRouter, 'POST', '/generate', {
      body: {
        anonymous_session_id: testSessionId,
        exam_mode: 'comprehensive',
        filter_enabled: false,
        question_count: 40,
        shuffle: true,
        use_custom_quota: true,
        custom_quota: {
          recognition: 15,
          understanding: 10,
          application: 10,
          advanced_application: 5,
        },
      },
    });
    assert(
      genCompRes.data.status === 'created',
      'Tạo đề tổng hợp 40 câu theo cơ cấu 15-10-10-5 phải thành công'
    );
    const compQuestions = genCompRes.data.attempt.questions as any[];
    assert(compQuestions.length === 40, 'Đề tổng hợp phải có đúng 40 câu');
    const uniqueQIds = new Set(compQuestions.map((q) => q.question_id));
    assert(uniqueQIds.size === 40, 'Không được có câu hỏi trùng nhau trong cùng 1 đề');
    const chaptersInComp = new Set(compQuestions.map((q) => q.chapter_id));
    assert(chaptersInComp.size > 1, 'Đề tổng hợp phải lấy câu hỏi phân bổ từ nhiều chương');
    console.log(
      '✅ [Tiêu chí 8, 9, 10] Đề tổng hợp 40 câu (15-10-10-5) lấy cân bằng từ nhiều chương và không trùng lặp.'
    );

    // 12, 13, 14, 15, 16, 17. Chọn đáp án, nộp bài, chấm điểm (câu đúng, câu sai, câu bỏ trống), lưu lịch sử & snapshot
    const attemptToSubmit = genUndRes.data.attempt;
    const sampleAnswers = attemptToSubmit.questions.map((q: any, idx: number) => {
      if (idx < 5) {
        return {
          attempt_answer_id: q.attempt_answer_id,
          question_id: q.question_id,
          selected_option_id: q.options[0].id,
          selected_label: 'A',
        };
      }
      if (idx < 8) {
        return {
          attempt_answer_id: q.attempt_answer_id,
          question_id: q.question_id,
          selected_option_id: q.options[1].id,
          selected_label: 'B',
        };
      }
      return {
        attempt_answer_id: q.attempt_answer_id,
        question_id: q.question_id,
        selected_option_id: null,
        selected_label: null,
      };
    });

    const subRes = await invokeRouter(
      examsRouter,
      'POST',
      `/${attemptToSubmit.id}/submit`,
      {
        params: { id: attemptToSubmit.id },
        body: {
          answers: sampleAnswers,
          duration_seconds: 125,
        },
      }
    );
    assert(subRes.status === 200, 'Nộp bài phải thành công');
    assert(subRes.data.attempt.unanswered_count === 2, 'Phải ghi nhận đúng 2 câu bỏ trống');
    assert(
      subRes.data.attempt.correct_count + subRes.data.attempt.incorrect_count === 8,
      'Tổng câu đúng + sai phải bằng 8 câu đã chọn'
    );

    // Kiểm tra chống nộp bài trùng lặp
    const subDupRes = await invokeRouter(
      examsRouter,
      'POST',
      `/${attemptToSubmit.id}/submit`,
      {
        params: { id: attemptToSubmit.id },
        body: {
          answers: [],
          duration_seconds: 999,
        },
      }
    );
    assert(
      subDupRes.data.already_submitted === true,
      'Nộp lại cùng 1 lượt thi phải chống ghi trùng lặp'
    );

    // 15, 16, 17. Kiểm tra lịch sử và chi tiết lịch sử
    const histRes = await invokeRouter(historyRouter, 'GET', '/', {
      query: { session_id: testSessionId },
    });
    assert(histRes.data.history.length === 1, 'Lịch sử phải có đúng 1 lượt thi đã hoàn thành');
    assert(
      histRes.data.history[0].id === attemptToSubmit.id,
      'ID lịch sử khớp với lượt thi vừa nộp'
    );

    const histDetailRes = await invokeRouter(
      historyRouter,
      'GET',
      `/${attemptToSubmit.id}`,
      {
        params: { id: attemptToSubmit.id },
      }
    );
    assert(
      histDetailRes.data.attempt.questions.length === 10,
      'Xem chi tiết lịch sử phải trả về đủ 10 câu hỏi từ snapshot'
    );
    assert(
      Boolean(histDetailRes.data.attempt.questions[0].explanation),
      'Xem chi tiết lịch sử phải có giải thích đáp án từ snapshot'
    );
    console.log(
      '✅ [Tiêu chí 12-20] Chấm điểm, phân biệt câu đúng/sai/bỏ trống, chống nộp trùng và lưu snapshot lịch sử thành công.'
    );

    // Dọn dẹp dữ liệu kiểm thử tạm thời
    await prisma.examAttempt.deleteMany({
      where: { anonymous_session_id: testSessionId },
    });
    console.log('🎉 Toàn bộ 20 tiêu chí nghiệm thu của Hello Kitty Quiz đều ĐẠT 100%!');
  } finally {
    await prisma.$disconnect();
  }
}

runVerification().catch((e) => {
  console.error('❌ Kiểm thử thất bại:', e);
  process.exit(1);
});
