import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, interval, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { QuizQuestion, QuizMode, QuizQuestionResult, QuizResult } from '../../../core/models/quiz.models';
import { ExamAttempt, ExamAttemptAnswer } from '../../../core/models/exam-attempt.models';
import { ChapterQuizAnswer, ChapterQuizProgress } from '../../../core/models/chapter-quiz-progress.models';
import { ExamAttemptApiService } from '../../../core/services/exam-attempt-api.service';
import { QuizApiService } from '../../../core/services/quiz-api.service';
import { ChapterQuizProgressApiService } from '../../../core/services/chapter-quiz-progress-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { I18nService } from '../../../core/services/i18n.service';

interface ChapterAnswerFeedback {
  isCorrect: boolean;
  question: QuizQuestion;
  selectedOptionIndex: number;
  isLastQuestion: boolean;
}

@Component({
  selector: 'app-quiz-session-page',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './quiz-session-page.component.html',
  styleUrl: './quiz-session-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizSessionPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly quizApi = inject(QuizApiService);
  private readonly examAttemptApi = inject(ExamAttemptApiService);
  private readonly chapterProgressApi = inject(ChapterQuizProgressApiService);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18nService);
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
  protected readonly savedChapterAnswerIds = signal<Set<string>>(new Set());
  protected readonly chapterAnswerFeedback = signal<ChapterAnswerFeedback | null>(null);
  protected readonly savingChapterAnswer = signal(false);

  protected readonly currentQuestion = computed(() => this.questions()[this.currentIndex()]);
  protected readonly progressPercent = computed(() => {
    const total = this.questions().length;
    return total > 0 ? Math.round(((this.currentIndex() + 1) / total) * 100) : 0;
  });
  protected readonly allAnswered = computed(() => this.answers().size === this.questions().length);
  protected readonly isExamMode = computed(() => this.mode() === 'exam');
  protected readonly isChapterMode = computed(() => this.mode() === 'chapter');
  protected readonly isArabicMode = computed(() => this.i18n.currentLang() === 'ar');
  protected readonly feedbackIsCorrect = computed(() => this.chapterAnswerFeedback()?.isCorrect ?? false);
  protected readonly feedbackIsLastQuestion = computed(() => this.chapterAnswerFeedback()?.isLastQuestion ?? false);
  protected readonly feedbackCorrectAnswer = computed(() => {
    const fb = this.chapterAnswerFeedback();
    if (!fb) return '';
    const q = fb.question;
    return this.isArabicMode()
      ? (this.normalizeText(q.correctAnswerAR) ?? this.normalizeText(q.correctAnswer) ?? '')
      : (this.normalizeText(q.correctAnswer) ?? this.normalizeText(q.correctAnswerAR) ?? '');
  });
  protected readonly feedbackExplanation = computed(() => {
    const fb = this.chapterAnswerFeedback();
    if (!fb) return '';
    const q = fb.question;
    return this.isArabicMode()
      ? (this.normalizeText(q.explanationAR) ?? this.normalizeText(q.explanation) ?? '')
      : (this.normalizeText(q.explanation) ?? this.normalizeText(q.explanationAR) ?? '');
  });
  protected readonly feedbackSelectedAnswer = computed(() => {
    const fb = this.chapterAnswerFeedback();
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
    this.answers.update((map) => {
      const newMap = new Map(map);
      newMap.set(questionId, optionIndex);
      return newMap;
    });

    if (this.isExamMode()) {
      this.saveExamAnswer(questionId, optionIndex);
    }
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
    if (this.currentIndex() < this.questions().length - 1) {
      this.currentIndex.update((i) => i + 1);
    }
  }

  protected previousQuestion(): void {
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

  protected getCorrectOptionIndex(question: QuizQuestion): number {
    const correct = this.normalizeText(question.correctAnswer)?.toLowerCase() ?? '';
    if (!correct) return -1;
    return (question.options ?? []).findIndex(
      (opt) => (this.normalizeText(opt)?.toLowerCase() ?? '') === correct,
    );
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
          next: ({ questions }) => this.questions.set(questions),
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

    const mappedAnswers = this.mapAttemptAnswers(attempt, questions);
    this.answers.set(mappedAnswers);
    this.expiresAt.set(expiresAt);
    this.currentIndex.set(this.findResumeIndex(questions, mappedAnswers));
    this.startExamTimer(expiresAt);
  }

  private findResumeIndex(questions: QuizQuestion[], answers: Map<string, number>): number {
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

      const resolvedIndex = this.resolveAnswerIndex(question, answer.selectedAnswer);
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

  private resolveAnswerIndex(question: QuizQuestion, selectedAnswer: string): number | undefined {
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

    const question = this.questions().find((item) => item._id === questionId);
    if (!question) {
      return;
    }

    const options = this.getQuestionOptions(question);
    const selectedAnswer = options[optionIndex];
    if (!selectedAnswer) {
      return;
    }

    const payload: ExamAttemptAnswer = { questionId, selectedAnswer };

    this.examAttemptApi
      .saveAnswer(attemptId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (err: Error) => {
          this.toast.error(err.message);
        },
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
          this.result.set(result);
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

  private normalizeText(value?: string | null): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
}
