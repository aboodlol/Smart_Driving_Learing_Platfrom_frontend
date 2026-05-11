import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, interval, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { QuizQuestion, QuizMode, QuizQuestionResult, QuizResult, SaveAnswerResponse } from '../../../core/models/quiz.models';
import { ExamAttempt, ExamAttemptAnswer } from '../../../core/models/exam-attempt.models';
import { ChapterQuizAnswer, ChapterQuizProgress } from '../../../core/models/chapter-quiz-progress.models';
import { QUIZ_CONTEXT_NAV_KEY, QuizQuestionContext } from '../../../core/models/assistant.models';
import { QuizBookmark } from '../../../core/models/quiz-bookmark.models';
import { ExamAttemptApiService } from '../../../core/services/exam-attempt-api.service';
import { QuizApiService } from '../../../core/services/quiz-api.service';
import { ChapterQuizProgressApiService } from '../../../core/services/chapter-quiz-progress-api.service';
import { QuizBookmarkApiService } from '../../../core/services/quiz-bookmark-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { I18nService } from '../../../core/services/i18n.service';
import { ExamLockService } from '../../../core/services/exam-lock.service';

interface ChapterAnswerFeedback {
  isCorrect: boolean;
  question: QuizQuestion;
  selectedOptionIndex: number;
  isLastQuestion: boolean;
}

type ChapterQuestionNavState = 'current' | 'correct' | 'wrong' | 'unanswered';
type ExamQuestionNavState = 'current' | 'answered' | 'skipped' | 'unanswered';

const EXAM_MAX_SKIPS = 4;
// Full exam duration. Kept in sync with the backend constant
// EXAM_DURATION_MS in services/examAttemptService.js.
const EXAM_TOTAL_SECONDS = 60 * 60;

@Component({
  selector: 'app-quiz-session-page',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './quiz-session-page.component.html',
  styleUrl: './quiz-session-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizSessionPageComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly quizApi = inject(QuizApiService);
  private readonly examAttemptApi = inject(ExamAttemptApiService);
  private readonly chapterProgressApi = inject(ChapterQuizProgressApiService);
  private readonly quizBookmarkApi = inject(QuizBookmarkApiService);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18nService);
  private readonly examLock = inject(ExamLockService);
  private readonly destroyRef = inject(DestroyRef);
  private timerSub: Subscription | null = null;

  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly questions = signal<QuizQuestion[]>([]);
  protected readonly currentIndex = signal(0);
  protected readonly answers = signal<Map<string, number>>(new Map());
  protected readonly result = signal<QuizResult | null>(null);
  protected readonly mode = signal<QuizMode>('chapter');
  protected readonly chapterTitle = signal('');
  protected readonly attemptId = signal<string | null>(null);
  protected readonly expiresAt = signal<string | null>(null);
  protected readonly remainingSeconds = signal<number | null>(null);
  // Frozen wall-clock duration the user spent on the exam, computed once when
  // the result lands. Independent from `remainingSeconds` so the result page
  // can show a stable "Time Used" label even after the countdown stops.
  protected readonly examStartedAt = signal<string | null>(null);
  protected readonly timeUsedSeconds = signal<number | null>(null);
  protected readonly savedChapterAnswerIds = signal<Set<string>>(new Set());
  protected readonly chapterAnswerFeedback = signal<ChapterAnswerFeedback | null>(null);
  protected readonly savingChapterAnswer = signal(false);
  protected readonly skippedIds = signal<Set<string>>(new Set());
  protected readonly examQuestionStates = signal<Map<string, boolean>>(new Map());
  protected readonly examCorrectCount = signal(0);
  protected readonly examWrongCount = signal(0);
  protected readonly examSavingAnswer = signal(false);
  protected readonly examLocked = signal(false);
  protected readonly examPendingAdvanceQuestionId = signal<string | null>(null);
  // Tracks per-question "answered" state during a running exam so the navigator
  // can show neutral "answered" without leaking correct/wrong before submit.
  protected readonly examAnsweredIds = signal<Set<string>>(new Set());
  protected readonly bookmarks = signal<QuizBookmark[]>([]);
  protected readonly bookmarkPending = signal<Set<string>>(new Set());
  protected readonly bookmarksOpen = signal(false);

  protected readonly currentQuestion = computed(() => this.questions()[this.currentIndex()]);
  protected readonly progressPercent = computed(() => {
    const total = this.questions().length;
    return total > 0 ? Math.round(((this.currentIndex() + 1) / total) * 100) : 0;
  });
  protected readonly allAnswered = computed(() => this.answers().size === this.questions().length);
  protected readonly isExamMode = computed(() => this.mode() === 'exam');
  protected readonly isChapterMode = computed(() => this.mode() === 'chapter');
  protected readonly isArabicMode = computed(() => this.i18n.currentLang() === 'ar');
  protected readonly currentFeedback = computed<ChapterAnswerFeedback | null>(() => {
    const inFlight = this.chapterAnswerFeedback();
    if (inFlight) return inFlight;

    const q = this.currentQuestion();
    if (!q) return null;
    if (!this.savedChapterAnswerIds().has(q._id)) return null;

    const selectedIndex = this.answers().get(q._id);
    if (selectedIndex === undefined) return null;

    return {
      question: q,
      selectedOptionIndex: selectedIndex,
      isCorrect: this.isQuestionAnsweredCorrectly(q, selectedIndex),
      isLastQuestion: this.currentIndex() === this.questions().length - 1,
    };
  });
  protected readonly feedbackIsCorrect = computed(() => this.currentFeedback()?.isCorrect ?? false);
  protected readonly feedbackIsLastQuestion = computed(() => this.currentFeedback()?.isLastQuestion ?? false);
  protected readonly feedbackCorrectAnswer = computed(() => {
    const fb = this.currentFeedback();
    if (!fb) return '';
    const q = fb.question;
    return this.isArabicMode()
      ? (this.normalizeText(q.correctAnswerAR) ?? this.normalizeText(q.correctAnswer) ?? '')
      : (this.normalizeText(q.correctAnswer) ?? this.normalizeText(q.correctAnswerAR) ?? '');
  });
  protected readonly feedbackExplanation = computed(() => {
    const fb = this.currentFeedback();
    if (!fb) return '';
    const q = fb.question;
    return this.isArabicMode()
      ? (this.normalizeText(q.explanationAR) ?? this.normalizeText(q.explanation) ?? '')
      : (this.normalizeText(q.explanation) ?? this.normalizeText(q.explanationAR) ?? '');
  });
  protected readonly feedbackSelectedAnswer = computed(() => {
    const fb = this.currentFeedback();
    if (!fb) return '';
    return this.getQuestionOptions(fb.question)[fb.selectedOptionIndex] ?? '';
  });
  protected readonly remainingTimeLabel = computed(() => {
    const remaining = this.remainingSeconds();
    if (remaining === null) {
      return '';
    }

    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  });
  // mm:ss label of the wall-clock time the user spent on the exam. Shown on the
  // result page in place of the (now-frozen) remaining countdown.
  protected readonly timeUsedLabel = computed(() => {
    const used = this.timeUsedSeconds();
    if (used === null) return '';
    const minutes = Math.floor(used / 60);
    const seconds = used % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  });
  protected readonly displayChapterTitle = computed(() => {
    if (this.mode() === 'exam') {
      return this.i18n.t('quiz.examSimulationTitle');
    }

    const firstQuestion = this.questions()[0];
    if (!firstQuestion) {
      return this.chapterTitle();
    }

    if (this.isArabicMode()) {
      return this.normalizeText(firstQuestion.chapterTitleAR) ?? firstQuestion.chapterTitle;
    }

    return this.normalizeText(firstQuestion.chapterTitle) ?? firstQuestion.chapterTitleAR ?? this.chapterTitle();
  });
  protected readonly currentQuestionText = computed(() => {
    const question = this.currentQuestion();
    return question ? this.getQuestionText(question) : '';
  });
  protected readonly currentQuestionOptions = computed(() => {
    const question = this.currentQuestion();
    return question ? this.getQuestionOptions(question) : [];
  });
  protected readonly currentQuestionImage = computed(() => {
    const question = this.currentQuestion();
    return question ? this.getMediaUrl(question.image) : null;
  });
  protected readonly currentQuestionVideo = computed(() => {
    const question = this.currentQuestion();
    return question ? this.getMediaUrl(question.video) : null;
  });
  protected readonly localizedReviewItems = computed<QuizQuestionResult[]>(() => {
    const submittedResult = this.result();
    if (!submittedResult) {
      return [];
    }

    const questionById = new Map(this.questions().map((question) => [question._id, question]));

    return submittedResult.results.map((item) => {
      const question = questionById.get(item.questionId);

      return {
        ...item,
        question: this.getReviewQuestionText(item, question),
        selectedAnswer: this.getReviewSelectedAnswer(item, question),
        correctAnswer: this.getReviewCorrectAnswer(item, question),
        explanation: this.getReviewExplanation(item, question),
        image: question?.image ?? null,
        video: question?.video ?? null,
      };
    });
  });
  protected readonly localizedTotalQuestions = computed(() => this.localizedReviewItems().length);
  protected readonly localizedCorrectCount = computed(
    () => this.localizedReviewItems().filter((item) => item.isCorrect).length,
  );
  protected readonly localizedScore = computed(() => {
    const total = this.localizedTotalQuestions();
    return total > 0 ? Math.round((this.localizedCorrectCount() / total) * 100) : 0;
  });

  protected readonly skipsRemaining = computed(() => Math.max(0, EXAM_MAX_SKIPS - this.skippedIds().size));
  protected readonly maxSkips = EXAM_MAX_SKIPS;
  // Count of questions answered in the current running exam — shown to the user
  // as neutral progress information (does NOT reveal correct/wrong).
  protected readonly examAnsweredCount = computed(() => this.examAnsweredIds().size);
  protected readonly examSkippedCount = computed(() => this.skippedIds().size);

  // Post-result navigator (review mode): expose correct/wrong from the backend result.
  protected readonly questionNavStates = computed<
    Array<'current' | 'correct' | 'wrong' | 'skipped' | 'unanswered'>
  >(() => {
    const qs = this.questions();
    const result = this.result();
    if (!result) return [];
    const resultMap = new Map<string, boolean>(
      result.results.map((item) => [item.questionId, item.isCorrect]),
    );
    return qs.map((q) => {
      if (resultMap.has(q._id)) return resultMap.get(q._id) ? 'correct' : 'wrong';
      return 'unanswered';
    });
  });

  // Running-exam navigator: never reveals correctness. Only shows current / answered /
  // skipped / unanswered so the user can see their flow without a live result hint.
  protected readonly examNavStates = computed<ExamQuestionNavState[]>(() => {
    const qs = this.questions();
    const current = this.currentIndex();
    const answered = this.examAnsweredIds();
    const skipped = this.skippedIds();
    return qs.map((q, i) => {
      if (i === current) return 'current';
      if (answered.has(q._id)) return 'answered';
      if (skipped.has(q._id)) return 'skipped';
      return 'unanswered';
    });
  });
  protected readonly chapterQuestionNavStates = computed<ChapterQuestionNavState[]>(() => {
    const qs = this.questions();
    const answers = this.answers();
    const savedIds = this.savedChapterAnswerIds();
    const current = this.currentIndex();
    const feedback = this.chapterAnswerFeedback();

    return qs.map((q, i) => {
      const selectedIndex = answers.get(q._id);
      const isSaved = savedIds.has(q._id) || feedback?.question._id === q._id;

      if (isSaved && selectedIndex !== undefined) {
        return this.isQuestionAnsweredCorrectly(q, selectedIndex) ? 'correct' : 'wrong';
      }

      if (i === current) {
        return 'current';
      }

      return 'unanswered';
    });
  });

  protected readonly examRemainingCount = computed(() => {
    if (!this.isExamMode()) return 0;
    return this.questions().length - this.answers().size;
  });

  // Exam-mode result stats sourced from the backend response. The backend now
  // filters review items to only questions the user actually answered, so we
  // keep the absolute total (60) separate from the review item count.
  protected readonly examResultTotal = computed(() => {
    const result = this.result();
    if (!result) return 0;
    const raw = (result as { totalQuestions?: unknown }).totalQuestions;
    return typeof raw === 'number' && raw > 0 ? raw : this.localizedReviewItems().length;
  });
  protected readonly examResultCorrect = computed(() => {
    const result = this.result();
    if (!result) return 0;
    const correctCount = (result as { correctCount?: unknown }).correctCount;
    if (typeof correctCount === 'number') return correctCount;
    if (typeof result.correct === 'number') return result.correct;
    return this.localizedCorrectCount();
  });
  protected readonly examResultWrong = computed(() => {
    const result = this.result();
    if (!result) return 0;
    const wrongCount = (result as { wrongCount?: unknown }).wrongCount;
    return typeof wrongCount === 'number'
      ? wrongCount
      : this.localizedReviewItems().filter((item) => !item.isCorrect && !!item.selectedAnswer?.trim()).length;
  });
  protected readonly examResultAnswered = computed(() => this.localizedReviewItems().length);

  protected readonly examPassed = computed(() => {
    const result = this.result();
    if (!result) return false;
    const passedFlag = (result as { passed?: unknown }).passed;
    if (typeof passedFlag === 'boolean') return passedFlag;
    const correctCount = (result as { correctCount?: unknown }).correctCount;
    if (typeof correctCount === 'number') return correctCount >= 51;
    if (typeof result.correct === 'number') return result.correct >= 51;
    return (result.score ?? 0) >= 85;
  });

  protected readonly resultWrongCount = computed(() =>
    this.localizedReviewItems().filter((i) => !i.isCorrect && !!i.selectedAnswer?.trim()).length,
  );

  protected readonly resultEmptyCount = computed(() =>
    this.localizedReviewItems().filter((i) => !i.selectedAnswer?.trim()).length,
  );

  protected readonly chapterCorrectCount = computed(() => {
    const qs = this.questions();
    const answers = this.answers();
    const saved = this.savedChapterAnswerIds();
    let correct = 0;
    for (const q of qs) {
      if (!saved.has(q._id)) continue;
      const idx = answers.get(q._id);
      if (idx === undefined) continue;
      if (this.isQuestionAnsweredCorrectly(q, idx)) correct += 1;
    }
    return correct;
  });

  protected readonly chapterWrongCount = computed(() => {
    const qs = this.questions();
    const answers = this.answers();
    const saved = this.savedChapterAnswerIds();
    let wrong = 0;
    for (const q of qs) {
      if (!saved.has(q._id)) continue;
      const idx = answers.get(q._id);
      if (idx === undefined) continue;
      if (!this.isQuestionAnsweredCorrectly(q, idx)) wrong += 1;
    }
    return wrong;
  });

  protected readonly chapterAccuracy = computed(() => {
    const total = this.chapterCorrectCount() + this.chapterWrongCount();
    if (total === 0) return 0;
    return Math.round((this.chapterCorrectCount() / total) * 100);
  });

  protected readonly examAccuracy = computed(() => {
    const total = this.examCorrectCount() + this.examWrongCount();
    if (total === 0) return 0;
    return Math.round((this.examCorrectCount() / total) * 100);
  });

  protected readonly backRoute = computed(() =>
    this.isExamMode() ? '/exam' : '/quiz',
  );

  protected optionLetter(i: number): string {
    return String.fromCharCode(65 + i);
  }

  protected optionStatus(question: QuizQuestion, optionIndex: number): 'correct' | 'wrong' | 'selected' | 'idle' {
    const isSaved = this.savedChapterAnswerIds().has(question._id);
    const fb = this.chapterAnswerFeedback();
    const showsResult = isSaved || (fb?.question._id === question._id);

    if (!showsResult) {
      return this.isOptionSelected(question._id, optionIndex) ? 'selected' : 'idle';
    }

    const correctIdx = this.getCorrectOptionIndex(question);
    if (optionIndex === correctIdx) return 'correct';
    if (this.isOptionSelected(question._id, optionIndex)) return 'wrong';
    return 'idle';
  }

  // Exam-mode option styling: ONLY shows selection state during the running exam.
  // No correct/wrong colors are leaked before the exam ends.
  protected examOptionStatus(question: QuizQuestion, optionIndex: number): 'selected' | 'idle' {
    return this.isOptionSelected(question._id, optionIndex) ? 'selected' : 'idle';
  }

  protected formatIndex(i: number): string {
    return String(i + 1).padStart(2, '0');
  }

  constructor() {
    const snapshot = this.route.snapshot;
    const chapterTitle = snapshot.paramMap.get('chapterTitle');

    if (chapterTitle) {
      this.mode.set('chapter');
      this.chapterTitle.set(chapterTitle);
      forkJoin({
        questions: this.quizApi.getQuizzesByChapter(chapterTitle),
        progress: this.chapterProgressApi.startChapterQuiz(chapterTitle),
      })
        .pipe(
          finalize(() => this.loading.set(false)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: ({ questions, progress }) => {
            this.questions.set(questions);
            if (progress) {
              this.applyChapterProgress(progress, questions);
            }
            this.loadChapterBookmarks(this.resolveChapterRef());
          },
          error: (err: Error) => {
            this.toast.error(err.message);
            void this.router.navigateByUrl('/quiz');
          },
        });
    } else {
      this.mode.set('exam');
      this.chapterTitle.set(this.i18n.t('quiz.examSimulationTitle'));
      this.loadExamAttempt();
    }
  }

  protected selectAnswer(questionId: string, optionIndex: number): void {
    if (this.isExamMode() && (this.examLocked() || this.result())) {
      return;
    }

    if (this.isChapterMode()) {
      if (this.savedChapterAnswerIds().has(questionId)) {
        return;
      }
      if (this.chapterAnswerFeedback()) {
        return;
      }
    }

    this.answers.update((map) => {
      const newMap = new Map(map);
      newMap.set(questionId, optionIndex);
      return newMap;
    });

  }

  protected getSelectedAnswer(questionId: string): number | undefined {
    return this.answers().get(questionId);
  }

  protected isOptionSelected(questionId: string, optionIndex: number): boolean {
    return this.getSelectedAnswer(questionId) === optionIndex;
  }

  protected nextQuestion(): void {
    if (this.isChapterMode()) {
      const q = this.currentQuestion();
      if (q && this.answers().has(q._id) && !this.savedChapterAnswerIds().has(q._id)) {
        this.saveChapterAnswerAndShowFeedback(false);
        return;
      }
    }
    if (this.isExamMode()) {
      this.advanceExamAfterSave();
      return;
    }
    if (this.currentIndex() < this.questions().length - 1) {
      this.currentIndex.update((i) => i + 1);
    }
  }


  protected previousQuestion(): void {
    if (this.isExamMode()) {
      return;
    }

    if (this.currentIndex() > 0) {
      this.currentIndex.update((i) => i - 1);
    }
  }

  protected submitQuiz(): void {
    if (this.submitting()) return;

    if (this.isExamMode()) {
      this.submitExamAttempt();
      return;
    }

    // Chapter mode: save the last answer first if not yet saved, then show feedback
    if (this.isChapterMode()) {
      const q = this.currentQuestion();
      if (q && this.answers().has(q._id) && !this.savedChapterAnswerIds().has(q._id)) {
        this.saveChapterAnswerAndShowFeedback(true);
        return;
      }
    }

    this.performChapterSubmit();
  }

  protected continueAfterFeedback(): void {
    const fb = this.chapterAnswerFeedback();
    this.chapterAnswerFeedback.set(null);

    if (fb?.isLastQuestion) {
      this.performChapterSubmit();
      return;
    }

    const nextIndex = this.currentIndex() + 1;
    this.currentIndex.set(nextIndex);

    const chapterTitle = this.chapterTitle();
    if (chapterTitle) {
      this.chapterProgressApi
        .savePosition(chapterTitle, nextIndex)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe();
    }
  }

  protected readonly bookmarkedIds = computed(() => {
    const set = new Set<string>();
    for (const b of this.bookmarks()) set.add(b.questionId);
    return set;
  });

  protected isQuestionBookmarked(questionId: string): boolean {
    return this.bookmarkedIds().has(questionId);
  }

  protected isCurrentQuestionBookmarked(): boolean {
    const q = this.currentQuestion();
    return !!q && this.isQuestionBookmarked(q._id);
  }

  protected isBookmarkPending(questionId: string): boolean {
    return this.bookmarkPending().has(questionId);
  }

  protected readonly bookmarkedQuestions = computed(() => {
    const map = new Map(this.questions().map((q) => [q._id, q]));
    return this.bookmarks()
      .map((b) => ({ bookmark: b, question: map.get(b.questionId) }))
      .filter((entry): entry is { bookmark: QuizBookmark; question: QuizQuestion } => !!entry.question);
  });

  protected toggleCurrentBookmark(): void {
    const q = this.currentQuestion();
    if (!q || !this.isChapterMode()) return;
    this.toggleBookmark(q._id);
  }

  protected toggleBookmark(questionId: string): void {
    if (!this.isChapterMode()) return;
    if (this.bookmarkPending().has(questionId)) return;

    const chapterRef = this.resolveChapterRef();
    if (!chapterRef) return;

    this.bookmarkPending.update((prev) => {
      const next = new Set(prev);
      next.add(questionId);
      return next;
    });

    this.quizBookmarkApi
      .toggle({ chapterKey: chapterRef, questionId })
      .pipe(
        finalize(() => {
          this.bookmarkPending.update((prev) => {
            const next = new Set(prev);
            next.delete(questionId);
            return next;
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          if (response.bookmarked && response.bookmark) {
            this.bookmarks.update((list) => {
              const filtered = list.filter((b) => b.questionId !== questionId);
              return [response.bookmark as QuizBookmark, ...filtered];
            });
          } else {
            this.bookmarks.update((list) => list.filter((b) => b.questionId !== questionId));
          }
        },
        error: (err: Error) => this.toast.error(err.message),
      });
  }

  protected openBookmarks(): void {
    this.bookmarksOpen.set(true);
  }

  protected closeBookmarks(): void {
    this.bookmarksOpen.set(false);
  }

  protected jumpToBookmark(questionId: string): void {
    const idx = this.questions().findIndex((q) => q._id === questionId);
    if (idx < 0) return;
    this.bookmarksOpen.set(false);
    this.navigateToChapterQuestion(idx);
  }

  protected getBookmarkQuestionText(question: QuizQuestion): string {
    return this.getQuestionText(question);
  }

  protected getBookmarkCorrectAnswer(question: QuizQuestion): string {
    return this.getCorrectAnswer(question) ?? '';
  }

  protected getBookmarkExplanation(question: QuizQuestion): string {
    return this.getQuestionExplanation(question) ?? '';
  }

  protected getBookmarkImage(question: QuizQuestion): string | null {
    return this.getMediaUrl(question.image);
  }

  private resolveChapterRef(): string {
    const firstQuestion = this.questions()[0];
    const fromQuestion =
      this.normalizeText(firstQuestion?.chapterKey) ??
      this.normalizeText(firstQuestion?.chapterTitle);
    if (fromQuestion) return fromQuestion;
    return this.normalizeText(this.chapterTitle()) ?? '';
  }

  private loadChapterBookmarks(chapterRef: string): void {
    if (!chapterRef) {
      this.bookmarks.set([]);
      return;
    }

    this.quizBookmarkApi
      .listForChapter(chapterRef)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => this.bookmarks.set(list),
        error: () => {
          // Bookmarks are non-essential — keep quiz usable on failure.
        },
      });
  }

  protected explainWithAI(): void {
    const fb = this.currentFeedback();
    if (!fb) return;

    const q = fb.question;
    const englishOptions = q.options ?? [];
    const arabicOptions = q.optionsAR ?? [];
    const idx = fb.selectedOptionIndex;

    const imageUrl = this.resolveAbsoluteImageUrl(q.image);
    const context: QuizQuestionContext = {
      questionText: this.normalizeText(q.question) ?? '',
      questionTextAR: this.normalizeText(q.questionAR) ?? '',
      selectedAnswer: englishOptions[idx] ?? '',
      selectedAnswerAR: arabicOptions[idx] ?? '',
      correctAnswer: this.normalizeText(q.correctAnswer) ?? '',
      correctAnswerAR: this.normalizeText(q.correctAnswerAR) ?? '',
      explanation: this.normalizeText(q.explanation) ?? '',
      explanationAR: this.normalizeText(q.explanationAR) ?? '',
      chapterTitle: this.normalizeText(q.chapterTitle) ?? '',
      chapterTitleAR: this.normalizeText(q.chapterTitleAR) ?? '',
      chapterKey: q.chapterKey ?? '',
      isCorrect: fb.isCorrect,
      ...(imageUrl ? { image: imageUrl } : {}),
    };

    console.info('[ExplainWithAI] navigating to assistant with quiz context', {
      questionId: q._id,
      rawImage: q.image ?? null,
      resolvedImage: imageUrl,
    });

    void this.router.navigate(['/assistant'], {
      state: { [QUIZ_CONTEXT_NAV_KEY]: context },
    });
  }

  private resolveAbsoluteImageUrl(rawUrl?: string | null): string {
    const trimmed = this.normalizeText(rawUrl);
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;

    const backendUrl = (environment.backendUrl || '').replace(/\/+$/, '');
    if (backendUrl) {
      return trimmed.startsWith('/') ? `${backendUrl}${trimmed}` : `${backendUrl}/${trimmed}`;
    }

    if (typeof window !== 'undefined') {
      try {
        return new URL(trimmed, window.location.origin).toString();
      } catch {
        // fall through
      }
    }
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }

  protected skipQuestion(): void {
    if (!this.isExamMode() || this.examLocked() || this.result() || this.skipsRemaining() <= 0) return;
    const q = this.currentQuestion();
    if (!q) return;
    // Skip clears any in-progress selection so the question is not counted as
    // "answered" until the user returns to it and explicitly answers.
    this.answers.update((map) => {
      if (!map.has(q._id)) return map;
      const next = new Map(map);
      next.delete(q._id);
      return next;
    });
    this.examAnsweredIds.update((prev) => {
      if (!prev.has(q._id)) return prev;
      const next = new Set(prev);
      next.delete(q._id);
      return next;
    });
    this.skippedIds.update((prev) => {
      const next = new Set(prev);
      next.add(q._id);
      return next;
    });
    // Persist the skip so a refresh / reopen restores the skipped state.
    this.persistSkip(q._id);
    this.navigateToNextFlowQuestion();
  }

  // Fire-and-forget persistence of an explicit skip. Backend marks the answer
  // record with skipped:true so skipped questions survive a session restart.
  private persistSkip(questionId: string): void {
    const attemptId = this.attemptId();
    if (!attemptId) return;
    this.examAttemptApi
      .saveAnswer(attemptId, { questionId, skipped: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (err: Error) => this.toast.error(err.message),
      });
  }

  // Confirms then ends the exam now. Backend filters results to only the
  // questions the user actually answered, so unreached/skipped-only questions
  // never expose their correct answer or explanation in the review.
  protected endExamManually(): void {
    if (!this.isExamMode() || this.submitting() || this.result() || this.examLocked()) return;
    const confirmMsg = this.i18n.t('quiz.endExamConfirm');
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      if (!window.confirm(confirmMsg)) return;
    }
    this.submitExamAttempt();
  }

  protected navigateToQuestion(index: number): void {
    if (this.isExamMode()) {
      return;
    }

    if (index >= 0 && index < this.questions().length) {
      this.currentIndex.set(index);
    }
  }

  protected navigateToChapterQuestion(index: number): void {
    if (
      !this.isChapterMode() ||
      this.savingChapterAnswer() ||
      index < 0 ||
      index >= this.questions().length ||
      index === this.currentIndex()
    ) {
      return;
    }

    this.chapterAnswerFeedback.set(null);
    this.currentIndex.set(index);

    const chapterTitle = this.chapterTitle();
    if (chapterTitle) {
      this.chapterProgressApi
        .savePosition(chapterTitle, index)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe();
    }
  }

  protected getNavBtnClass(index: number): string {
    const state = this.questionNavStates()[index] ?? 'unanswered';
    return `nav-q-btn nq-${state}`;
  }

  protected getChapterNavBtnClass(index: number): string {
    const state = this.chapterQuestionNavStates()[index] ?? 'unanswered';
    const currentClass = index === this.currentIndex() ? ' chapter-nav-current' : '';
    return `nav-q-btn nq-${state}${currentClass}`;
  }

  protected getCorrectOptionIndex(question: QuizQuestion): number {
    const correct = this.normalizeText(question.correctAnswer)?.toLowerCase() ?? '';
    if (!correct) return -1;
    return (question.options ?? []).findIndex(
      (opt) => (this.normalizeText(opt)?.toLowerCase() ?? '') === correct,
    );
  }

  private navigateToNextFlowQuestion(): void {
    const from = this.currentIndex();
    const nextIndex = this.findNextFlowIndex(from);
    if (nextIndex === from) {
      // No more questions to flow to (user has answered/skipped everything) →
      // auto-submit so they don't get stuck on the last screen.
      this.submitExamAttempt();
      return;
    }
    this.currentIndex.set(nextIndex);
    this.persistCurrentPosition(nextIndex);
  }

  private advanceExamAfterSave(): void {
    if (!this.isExamMode() || this.examLocked() || this.result()) {
      return;
    }

    const currentQuestion = this.currentQuestion();
    if (!currentQuestion) {
      return;
    }

    const selectedIndex = this.answers().get(currentQuestion._id);
    if (selectedIndex === undefined) {
      // Defensive: Next is disabled in this state, but never trust the UI to
      // enforce business rules — bail out if the user somehow gets here.
      return;
    }

    // Mark as answered immediately so the navigator reflects the new state even
    // while the network request is in flight. We don't reveal correct/wrong.
    this.examAnsweredIds.update((prev) => {
      if (prev.has(currentQuestion._id)) return prev;
      const next = new Set(prev);
      next.add(currentQuestion._id);
      return next;
    });
    // A skipped question that the user has now answered should leave the skipped
    // state — it's no longer pending a return visit.
    if (this.skippedIds().has(currentQuestion._id)) {
      this.skippedIds.update((prev) => {
        const next = new Set(prev);
        next.delete(currentQuestion._id);
        return next;
      });
    }

    if (this.examQuestionStates().has(currentQuestion._id)) {
      // Answer was already saved on a previous pass — just navigate.
      this.navigateToNextFlowQuestion();
      return;
    }

    if (this.examSavingAnswer()) {
      this.examPendingAdvanceQuestionId.set(currentQuestion._id);
      return;
    }

    this.examPendingAdvanceQuestionId.set(currentQuestion._id);
    this.saveExamAnswer(currentQuestion._id, selectedIndex);
  }

  private findNextFlowIndex(from: number): number {
    const qs = this.questions();
    const answers = this.answers();
    const skipped = this.skippedIds();
    // Pass 1: unanswered + non-skipped after current
    for (let i = from + 1; i < qs.length; i++) {
      if (!answers.has(qs[i]._id) && !skipped.has(qs[i]._id)) return i;
    }
    // Pass 2: unanswered + non-skipped before current
    for (let i = 0; i < from; i++) {
      if (!answers.has(qs[i]._id) && !skipped.has(qs[i]._id)) return i;
    }
    // Pass 3: skipped + unanswered in order
    for (let i = 0; i < qs.length; i++) {
      if (!answers.has(qs[i]._id) && skipped.has(qs[i]._id)) return i;
    }
    return from;
  }

  private performChapterSubmit(): void {
    this.submitting.set(true);

    const questionById = new Map(this.questions().map((question) => [question._id, question]));
    const answersArray = Array.from(this.answers().entries()).map(([questionId, selectedOptionIndex]) => {
      const question = questionById.get(questionId);
      const selectedAnswer =
        question && selectedOptionIndex !== undefined
          ? this.getQuestionOptions(question)[selectedOptionIndex] ?? ''
          : '';
      return { questionId, selectedAnswer };
    });

    this.quizApi
      .submitQuiz({ answers: answersArray })
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          this.result.set(result);
          this.toast.success(`Quiz submitted! Score: ${result.score}%`);
        },
        error: (err: Error) => {
          this.toast.error(err.message);
        },
      });
  }

  private saveChapterAnswerAndShowFeedback(isLastQuestion: boolean): void {
    const q = this.currentQuestion();
    if (!q) return;

    const selectedIndex = this.answers().get(q._id);
    if (selectedIndex === undefined) return;

    const chapterTitle = this.chapterTitle();
    if (!chapterTitle) return;

    this.savingChapterAnswer.set(true);

    const payload = this.buildChapterAnswerPayload(q, selectedIndex, this.currentIndex());

    this.chapterProgressApi
      .saveAnswer(chapterTitle, payload)
      .pipe(
        finalize(() => this.savingChapterAnswer.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.savedChapterAnswerIds.update((prev) => {
            const next = new Set(prev);
            next.add(q._id);
            return next;
          });
          this.chapterAnswerFeedback.set({
            isCorrect: this.isQuestionAnsweredCorrectly(q, selectedIndex),
            question: q,
            selectedOptionIndex: selectedIndex,
            isLastQuestion,
          });
        },
        error: (err: Error) => {
          this.toast.error(err.message);
        },
      });
  }

  private applyChapterProgress(progress: ChapterQuizProgress, questions: QuizQuestion[]): void {
    const answers = progress.answers ?? [];

    if (answers.length > 0) {
      const newMap = new Map<string, number>();
      const savedIds = new Set<string>();

      for (const answer of answers) {
        if (answer.questionId && typeof answer.selectedIndex === 'number') {
          newMap.set(answer.questionId, answer.selectedIndex);
          savedIds.add(answer.questionId);
        }
      }

      this.answers.set(newMap);
      this.savedChapterAnswerIds.set(savedIds);
    }

    if (typeof progress.currentQuestionIndex === 'number') {
      const max = Math.max(0, questions.length - 1);
      this.currentIndex.set(Math.min(progress.currentQuestionIndex, max));
    }
  }

  private buildChapterAnswerPayload(
    question: QuizQuestion,
    selectedOptionIndex: number,
    currentQuestionIndex: number,
  ): ChapterQuizAnswer {
    const englishOptions = question.options ?? [];
    const arabicOptions = question.optionsAR ?? [];
    return {
      questionId: question._id,
      selectedAnswer: englishOptions[selectedOptionIndex] ?? '',
      selectedAnswerAR: arabicOptions[selectedOptionIndex] ?? '',
      selectedIndex: selectedOptionIndex,
      currentQuestionIndex,
    };
  }

  private isQuestionAnsweredCorrectly(question: QuizQuestion, selectedOptionIndex: number): boolean {
    const correctAnswer = this.normalizeText(question.correctAnswer);
    if (!correctAnswer) return false;
    const englishOptions = question.options ?? [];
    const selected = this.normalizeText(englishOptions[selectedOptionIndex]);
    if (!selected) return false;
    return selected.toLowerCase() === correctAnswer.toLowerCase();
  }

  protected getScoreClass(): string {
    const score = this.localizedScore();
    if (score >= 70) return 'score-good';
    if (score >= 50) return 'score-okay';
    return 'score-poor';
  }

  protected retakeQuiz(): void {
    this.result.set(null);
    this.answers.set(new Map());
    this.currentIndex.set(0);
    this.savedChapterAnswerIds.set(new Set());
    this.chapterAnswerFeedback.set(null);
    this.skippedIds.set(new Set());
    this.examQuestionStates.set(new Map());
    this.examAnsweredIds.set(new Set());
    this.examCorrectCount.set(0);
    this.examWrongCount.set(0);
    this.examSavingAnswer.set(false);
    this.examLocked.set(false);
    this.examPendingAdvanceQuestionId.set(null);
    this.timeUsedSeconds.set(null);
    this.loading.set(true);

    if (this.isExamMode()) {
      this.startExamAttempt();
      return;
    }

    const chapterTitle = this.route.snapshot.paramMap.get('chapterTitle');

    if (chapterTitle) {
      forkJoin({
        questions: this.quizApi.getQuizzesByChapter(chapterTitle),
        progress: this.chapterProgressApi.startChapterQuiz(chapterTitle),
      })
        .pipe(
          finalize(() => this.loading.set(false)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: ({ questions }) => {
            this.questions.set(questions);
            this.loadChapterBookmarks(this.resolveChapterRef());
          },
          error: () => this.loading.set(false),
        });
      return;
    }

    this.quizApi
      .getExamQuestions()
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((questions) => this.questions.set(questions));
  }

  private loadExamAttempt(): void {
    this.loading.set(true);

    this.examAttemptApi
      .getActiveExamAttempt()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (attempt) => {
          if (attempt) {
            this.applyExamAttempt(attempt);
            this.loading.set(false);
            return;
          }

          this.startExamAttempt();
        },
        error: (err: Error) => {
          this.toast.error(err.message);
          this.loading.set(false);
          void this.router.navigateByUrl('/quiz');
        },
      });
  }

  private startExamAttempt(): void {
    this.examAttemptApi
      .startExamAttempt()
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (attempt) => {
          this.applyExamAttempt(attempt);
        },
        error: (err: Error) => {
          this.toast.error(err.message);
          void this.router.navigateByUrl('/quiz');
        },
      });
  }

  private applyExamAttempt(attempt: ExamAttempt): void {
    const questions = Array.isArray(attempt.questions) ? attempt.questions : [];
    const expiresAt = this.resolveAttemptExpiresAt(attempt);
    const resolvedId = attempt._id || attempt.id || '';

    this.attemptId.set(resolvedId);
    this.questions.set(questions);
    this.examQuestionStates.set(new Map());
    this.examCorrectCount.set(0);
    this.examWrongCount.set(0);
    this.examSavingAnswer.set(false);
    this.examLocked.set(false);
    this.examPendingAdvanceQuestionId.set(null);

    const mappedAnswers = this.mapAttemptAnswers(attempt, questions);
    this.answers.set(mappedAnswers);

    // Restore skipped + answered sets from the attempt's persisted answers so
    // the user resumes exactly where they left off (skip count, navigator state).
    const rawAnswers = this.extractAttemptAnswers(attempt);
    const skipped = new Set<string>();
    const answered = new Set<string>();
    for (const answer of rawAnswers) {
      if (!answer.questionId) continue;
      if (answer.skipped === true) {
        skipped.add(answer.questionId);
      } else if (mappedAnswers.has(answer.questionId)) {
        answered.add(answer.questionId);
      }
    }
    this.skippedIds.set(skipped);
    this.examAnsweredIds.set(answered);

    this.expiresAt.set(expiresAt);
    // Remember when the exam started so we can compute "Time Used" on the
    // result page. Falls back to now() if the backend didn't supply a value.
    const rawStartedAt = (attempt as { startedAt?: unknown }).startedAt;
    this.examStartedAt.set(typeof rawStartedAt === 'string' ? rawStartedAt : new Date().toISOString());
    this.timeUsedSeconds.set(null);
    this.currentIndex.set(this.findResumeIndex(questions, mappedAnswers, attempt.currentQuestionIndex));
    this.startExamTimer(expiresAt);

    // Lock the app shell so the user can't wander away from a live exam.
    this.examLock.lock();
  }

  // Prefer the explicitly-persisted pointer from the backend so a refresh resumes
  // on the exact question the user was on (including unanswered questions later in
  // the flow). Fall back to first-unanswered for older attempts that don't carry
  // a currentQuestionIndex field.
  private findResumeIndex(
    questions: QuizQuestion[],
    answers: Map<string, number>,
    persistedIndex?: number,
  ): number {
    if (typeof persistedIndex === 'number' && persistedIndex >= 0 && persistedIndex < questions.length) {
      return persistedIndex;
    }
    const firstUnanswered = questions.findIndex((q) => !answers.has(q._id));
    return firstUnanswered >= 0 ? firstUnanswered : Math.max(0, questions.length - 1);
  }

  private resolveAttemptExpiresAt(attempt: ExamAttempt): string {
    const normalized = this.normalizeText(attempt.expiresAt);
    if (normalized) {
      return normalized;
    }

    return new Date(Date.now() + 60 * 60 * 1000).toISOString();
  }

  private startExamTimer(expiresAt: string): void {
    this.timerSub?.unsubscribe();
    this.updateRemainingSeconds(expiresAt);

    this.timerSub = interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateRemainingSeconds(expiresAt));
  }

  // Called from every path that ends the exam (manual end, timer end, early-fail).
  // Freezes the countdown and captures wall-clock time used so the result page
  // shows a stable "Time Used" label instead of a live, ticking remaining timer.
  // Preference order:
  //   1. submittedAt - startedAt (from the backend result)
  //   2. now() - examStartedAt (locally recorded)
  //   3. EXAM_TOTAL_SECONDS - lastRemainingSeconds (safe fallback)
  private finishExam(result: QuizResult | null): void {
    this.timerSub?.unsubscribe();
    this.timerSub = null;

    const startedAtIso = (result as { startedAt?: unknown } | null)?.startedAt as string | undefined
      ?? this.examStartedAt() ?? undefined;
    const submittedAtIso = (result as { submittedAt?: unknown } | null)?.submittedAt as string | undefined;

    let usedSeconds: number | null = null;
    if (startedAtIso) {
      const start = new Date(startedAtIso).getTime();
      const end = submittedAtIso ? new Date(submittedAtIso).getTime() : Date.now();
      if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
        usedSeconds = Math.max(0, Math.floor((end - start) / 1000));
      }
    }

    if (usedSeconds === null) {
      const remaining = this.remainingSeconds() ?? 0;
      usedSeconds = Math.max(0, EXAM_TOTAL_SECONDS - remaining);
    }

    this.timeUsedSeconds.set(usedSeconds);
  }

  private updateRemainingSeconds(expiresAt: string): void {
    const expiresAtTime = new Date(expiresAt).getTime();
    if (Number.isNaN(expiresAtTime)) {
      this.remainingSeconds.set(null);
      return;
    }

    const remaining = Math.max(0, Math.ceil((expiresAtTime - Date.now()) / 1000));
    this.remainingSeconds.set(remaining);

    if (remaining === 0) {
      this.timerSub?.unsubscribe();
      this.timerSub = null;
      this.autoSubmitExam();
    }
  }

  private autoSubmitExam(): void {
    if (!this.isExamMode() || this.submitting() || this.result()) {
      return;
    }

    this.submitExamAttempt();
  }

  private mapAttemptAnswers(attempt: ExamAttempt, questions: QuizQuestion[]): Map<string, number> {
    const answers = this.extractAttemptAnswers(attempt);
    const questionById = new Map(questions.map((question) => [question._id, question]));
    const mapped = new Map<string, number>();

    for (const answer of answers) {
      const question = questionById.get(answer.questionId);
      if (!question) {
        continue;
      }

      const resolvedIndex = this.resolveAnswerIndex(question, answer);
      if (resolvedIndex !== undefined) {
        mapped.set(answer.questionId, resolvedIndex);
      }
    }

    return mapped;
  }

  private extractAttemptAnswers(attempt: ExamAttempt): ExamAttemptAnswer[] {
    if (Array.isArray(attempt.answers)) {
      return attempt.answers;
    }

    if (attempt.answers && typeof attempt.answers === 'object') {
      return Object.entries(attempt.answers).map(([questionId, selectedAnswer]) => ({
        questionId,
        selectedAnswer: String(selectedAnswer),
      }));
    }

    return [];
  }

  private resolveAnswerIndex(question: QuizQuestion, answer: ExamAttemptAnswer): number | undefined {
    if (typeof answer.selectedIndex === 'number') {
      return answer.selectedIndex;
    }

    const selectedAnswer = answer.selectedAnswer ?? answer.selectedAnswerAR ?? '';
    const preferredOptions = this.getQuestionOptions(question);
    let index = preferredOptions.indexOf(selectedAnswer);
    if (index >= 0) {
      return index;
    }

    const englishOptions = question.options ?? [];
    index = englishOptions.indexOf(selectedAnswer);
    if (index >= 0) {
      return index;
    }

    const arabicOptions = question.optionsAR ?? [];
    index = arabicOptions.indexOf(selectedAnswer);
    if (index >= 0) {
      return index;
    }

    return undefined;
  }

  private saveExamAnswer(questionId: string, optionIndex: number): void {
    const attemptId = this.attemptId();
    if (!attemptId) {
      return;
    }

    if (this.examLocked() || this.result()) {
      return;
    }

    if (this.examSavingAnswer()) {
      return;
    }

    const question = this.questions().find((item) => item._id === questionId);
    if (!question) {
      return;
    }

    const englishOptions = question.options ?? [];
    const arabicOptions = question.optionsAR ?? [];
    const selectedAnswer = englishOptions[optionIndex] ?? '';
    const selectedAnswerAR = arabicOptions[optionIndex] ?? '';
    if (!selectedAnswer && !selectedAnswerAR) {
      return;
    }

    const payload: ExamAttemptAnswer = {
      questionId,
      selectedIndex: optionIndex,
      selectedAnswer,
      selectedAnswerAR,
    };

    this.examSavingAnswer.set(true);

    this.examAttemptApi
      .saveAnswer(attemptId, payload)
      .pipe(
        finalize(() => this.examSavingAnswer.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response: SaveAnswerResponse) => {
          if (typeof response.isCorrect === 'boolean') {
            // Persisted for the post-exam review only — never read while running.
            this.examQuestionStates.update((prev) => {
              const next = new Map(prev);
              next.set(questionId, response.isCorrect as boolean);
              return next;
            });
          }

          if (typeof response.correctCount === 'number') {
            this.examCorrectCount.set(response.correctCount);
          }

          if (typeof response.wrongCount === 'number') {
            this.examWrongCount.set(response.wrongCount);
          }

          if (response.earlyFailed) {
            this.examLocked.set(true);
            this.examPendingAdvanceQuestionId.set(null);
            if (response.result) {
              this.finishExam(response.result);
              this.result.set(response.result);
              // Exam ended — release the app navigation lock.
              this.examLock.unlock();
            } else {
              // No result body — still stop the timer so the bar doesn't keep ticking.
              this.finishExam(null);
            }
            return;
          }

          if (this.examPendingAdvanceQuestionId() === questionId) {
            this.examPendingAdvanceQuestionId.set(null);
            // No live feedback — go straight to the next question.
            this.navigateToNextFlowQuestion();
          }
        },
        error: (err: Error) => {
          this.examPendingAdvanceQuestionId.set(null);
          this.toast.error(err.message);
        },
      });
  }

  // Best-effort fire-and-forget persistence of the user's current question pointer.
  // Used so an exam refresh / reopen resumes on the exact question the user was on.
  private persistCurrentPosition(index: number): void {
    const attemptId = this.attemptId();
    if (!attemptId || !this.isExamMode() || this.result() || this.examLocked()) return;
    if (index < 0 || index >= this.questions().length) return;
    this.examAttemptApi
      .savePosition(attemptId, index)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        // Position persistence is non-essential — swallow errors so a transient
        // network failure does not interrupt the exam.
        error: () => undefined,
      });
  }

  private submitExamAttempt(): void {
    const attemptId = this.attemptId();
    if (!attemptId) {
      this.toast.error('Exam attempt not found.');
      return;
    }

    this.submitting.set(true);

    this.examAttemptApi
      .submitAttempt(attemptId)
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          this.finishExam(result);
          this.result.set(result);
          // Exam ended — release the app navigation lock.
          this.examLock.unlock();
          this.toast.success(`Quiz submitted! Score: ${result.score}%`);
        },
        error: (err: Error) => {
          this.toast.error(err.message);
        },
      });
  }

  private getQuestionText(question: QuizQuestion): string {
    if (this.isArabicMode()) {
      return this.normalizeText(question.questionAR) ?? question.question;
    }

    return this.normalizeText(question.question) ?? question.questionAR ?? '';
  }

  private getQuestionOptions(question: QuizQuestion): string[] {
    if (this.isArabicMode()) {
      return question.optionsAR?.length ? question.optionsAR : question.options;
    }

    return question.options.length ? question.options : (question.optionsAR ?? []);
  }

  private getCorrectAnswer(question: QuizQuestion): string | undefined {
    if (this.isArabicMode()) {
      return this.normalizeText(question.correctAnswerAR) ?? this.normalizeText(question.correctAnswer);
    }

    return this.normalizeText(question.correctAnswer) ?? this.normalizeText(question.correctAnswerAR);
  }

  private getQuestionExplanation(question: QuizQuestion): string | undefined {
    if (this.isArabicMode()) {
      return this.normalizeText(question.explanationAR) ?? this.normalizeText(question.explanation);
    }

    return this.normalizeText(question.explanation) ?? this.normalizeText(question.explanationAR);
  }

  private getReviewQuestionText(item: QuizQuestionResult, question?: QuizQuestion): string {
    if (this.isArabicMode()) {
      return (
        this.normalizeText(item.questionAR) ??
        this.normalizeText(question?.questionAR) ??
        item.question
      );
    }

    return this.normalizeText(item.question) ?? question?.question ?? '';
  }

  private getReviewCorrectAnswer(item: QuizQuestionResult, question?: QuizQuestion): string {
    if (this.isArabicMode()) {
      return (
        this.normalizeText(item.correctAnswerAR) ??
        this.normalizeText(question?.correctAnswerAR) ??
        item.correctAnswer
      );
    }

    return this.normalizeText(item.correctAnswer) ?? question?.correctAnswer ?? '';
  }

  private getReviewExplanation(item: QuizQuestionResult, question?: QuizQuestion): string {
    if (this.isArabicMode()) {
      return (
        this.normalizeText(item.explanationAR) ??
        this.normalizeText(question?.explanationAR) ??
        this.normalizeText(item.explanation) ??
        ''
      );
    }

    return this.normalizeText(item.explanation) ?? this.normalizeText(question?.explanation) ?? '';
  }

  private getReviewSelectedAnswer(item: QuizQuestionResult, question?: QuizQuestion): string {
    if (!this.isArabicMode()) {
      return item.selectedAnswer;
    }

    const selectedAnswerAR = this.normalizeText(item.selectedAnswerAR);
    if (selectedAnswerAR) {
      return selectedAnswerAR;
    }

    if (!question) {
      return item.selectedAnswer;
    }

    const optionsAR = question.optionsAR ?? [];
    if (optionsAR.length === 0) {
      return item.selectedAnswer;
    }

    const options = question.options ?? [];
    const englishIndex = options.indexOf(item.selectedAnswer);
    if (englishIndex >= 0 && optionsAR[englishIndex]) {
      return optionsAR[englishIndex];
    }

    const arabicIndex = optionsAR.indexOf(item.selectedAnswer);
    if (arabicIndex >= 0) {
      return optionsAR[arabicIndex];
    }

    return item.selectedAnswer;
  }

  private getMediaUrl(value?: string | null): string | null {
    return this.normalizeText(value) ?? null;
  }

  ngOnDestroy(): void {
    // Only release the lock if the user has finished the exam (result is set).
    // If the component is being torn down for any other reason while an exam is
    // still active, keep the lock so the user is bounced back to the session
    // route — this prevents an infinite mount/unmount loop when the shell
    // template re-renders in response to the lock signal flipping.
    if (this.result() !== null) {
      this.examLock.unlock();
    }
    this.timerSub?.unsubscribe();
    this.timerSub = null;
  }

  private normalizeText(value?: string | null): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
}
