import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import { ExamAttempt, ExamAttemptAnswer, ExamAttemptHistoryItem } from '../../../core/models/exam-attempt.models';
import { ProgressSummary } from '../../../core/models/progress.models';
import { QuizQuestion, QuizQuestionResult } from '../../../core/models/quiz.models';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ExamAttemptApiService } from '../../../core/services/exam-attempt-api.service';
import { I18nService } from '../../../core/services/i18n.service';
import { ProgressApiService } from '../../../core/services/progress-api.service';
import { ToastService } from '../../../core/services/toast.service';

interface ExamHistoryRow {
  _id: string;
  status: string;
  score: number | null;
  totalQuestions: number | null;
  rawDate: string | null;
  timestampSource: 'submittedAt' | 'createdAt' | 'updatedAt';
}

interface ExamReviewRow extends QuizQuestionResult {
  question: string;
  selectedAnswer: string;
  correctAnswer: string;
  explanation: string;
  image?: string | null;
  video?: string | null;
}

@Component({
  selector: 'app-progress-page',
  imports: [TranslatePipe],
  templateUrl: './progress-page.component.html',
  styleUrl: './progress-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressPageComponent {
  private readonly progressApi = inject(ProgressApiService);
  private readonly examAttemptApi = inject(ExamAttemptApiService);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly summary = signal<ProgressSummary | null>(null);
  protected readonly resetting = signal(false);
  protected readonly historyLoading = signal(true);
  protected readonly historyError = signal(false);
  protected readonly history = signal<ExamHistoryRow[]>([]);
  protected readonly selectedAttemptLoading = signal(false);
  protected readonly selectedAttemptError = signal(false);
  protected readonly selectedAttemptId = signal<string | null>(null);
  protected readonly selectedAttempt = signal<ExamAttempt | null>(null);

  protected readonly isArabicMode = computed(() => this.i18n.currentLang() === 'ar');
  protected readonly hasHistory = computed(() => this.history().length > 0);
  protected readonly reviewItems = computed(() => this.buildReviewItems());
  protected readonly selectedAttemptStatusLabel = computed(() => {
    const attempt = this.selectedAttempt();
    return attempt?.status ? this.getHistoryStatusLabel(attempt.status) : '--';
  });
  protected readonly selectedAttemptStatusClass = computed(() => {
    const attempt = this.selectedAttempt();
    return attempt?.status ? this.getHistoryStatusClass(attempt.status) : 'badge-not-started';
  });
  protected readonly selectedAttemptTimestampLabel = computed(() => {
    const attempt = this.selectedAttempt();
    const source = this.getAttemptTimestampSource(attempt);
    return this.getHistoryTimestampLabel(source);
  });
  protected readonly selectedAttemptTimestamp = computed(() => {
    const attempt = this.selectedAttempt();
    return this.formatHistoryDate(
      attempt?.submittedAt ?? attempt?.createdAt ?? attempt?.updatedAt ?? null,
    );
  });
  protected readonly selectedAttemptScore = computed(() => {
    const attempt = this.selectedAttempt();
    if (!attempt) {
      return '--';
    }

    const score = typeof attempt.score === 'number' ? attempt.score : this.calculateReviewScore(this.reviewItems());
    return score === null ? '--' : `${score}%`;
  });
  protected readonly selectedAttemptTotalQuestions = computed(() => {
    const attempt = this.selectedAttempt();
    if (!attempt) {
      return '--';
    }

    const total = attempt.totalQuestions ?? this.reviewItems().length;
    return total > 0 ? String(total) : '--';
  });

  constructor() {
    this.loadSummary();
    this.loadHistory();
  }

  private loadSummary(): void {
    this.loading.set(true);

    this.progressApi
      .getProgressSummary()
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (summary) => this.summary.set(summary),
        error: (err: Error) => this.toast.error(err.message),
      });
  }

  private loadHistory(): void {
    this.historyLoading.set(true);

    this.examAttemptApi
      .getExamHistory()
      .pipe(
        finalize(() => this.historyLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (items) => {
          this.historyError.set(false);
          this.history.set(this.mapHistoryRows(items));
        },
        error: (err: Error) => {
          this.historyError.set(true);
          this.history.set([]);
          this.toast.error(err.message);
        },
      });
  }

  protected getStatusClass(status: string): string {
    if (status === 'Completed') return 'badge-completed';
    if (status === 'In Progress') return 'badge-in-progress';
    return 'badge-not-started';
  }

  protected getStatusKey(status: string): string {
    if (status === 'Completed') return 'progress.statusCompleted';
    if (status === 'In Progress') return 'progress.statusInProgress';
    return 'progress.statusNotStarted';
  }

  protected getChapterPercent(totalSubLessons: number, completedSubLessons: number): number {
    return totalSubLessons > 0 ? Math.round((completedSubLessons / totalSubLessons) * 100) : 0;
  }

  protected resetProgress(): void {
    if (!confirm('Are you sure you want to reset all your progress? This cannot be undone.')) {
      return;
    }

    this.resetting.set(true);

    this.progressApi
      .resetProgress()
      .pipe(
        finalize(() => this.resetting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.toast.success('Progress has been reset.');
          this.loadSummary();
        },
        error: (err: Error) => this.toast.error(err.message),
      });
  }

  protected viewAttemptDetails(attemptId: string): void {
    if (!attemptId || this.selectedAttemptLoading()) {
      return;
    }

    this.selectedAttemptId.set(attemptId);
    this.selectedAttemptLoading.set(true);
    this.selectedAttemptError.set(false);

    this.examAttemptApi
      .getExamAttempt(attemptId)
      .pipe(
        finalize(() => this.selectedAttemptLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (attempt) => this.selectedAttempt.set(attempt),
        error: (err: Error) => {
          this.selectedAttempt.set(null);
          this.selectedAttemptError.set(true);
          this.toast.error(err.message);
        },
      });
  }

  protected closeAttemptDetails(): void {
    this.selectedAttempt.set(null);
    this.selectedAttemptId.set(null);
    this.selectedAttemptError.set(false);
  }

  protected getHistorySectionTitle(): string {
    return this.isArabicMode() ? 'سجل الامتحانات' : 'Exam History';
  }

  protected getHistorySectionSubtitle(): string {
    return this.isArabicMode()
      ? 'راجع نتائج الامتحانات السابقة وافتح أي محاولة لمشاهدة المراجعة الكاملة.'
      : 'Review previous exam results and open any attempt to see the full review.';
  }

  protected getHistoryEmptyTitle(): string {
    return this.isArabicMode() ? 'لا توجد محاولات امتحان بعد' : 'No exam attempts yet';
  }

  protected getHistoryEmptyDescription(): string {
    return this.isArabicMode()
      ? 'ستظهر هنا محاولاتك السابقة بعد إكمال أي امتحان.'
      : 'Your previous attempts will appear here after you complete an exam.';
  }

  protected getHistoryDetailsEmptyTitle(): string {
    return this.isArabicMode() ? 'لم يتم اختيار محاولة' : 'No attempt selected';
  }

  protected getHistoryDetailsEmptyDescription(): string {
    return this.isArabicMode()
      ? 'اختر محاولة من سجل الامتحانات لعرض المراجعة الكاملة.'
      : 'Select an attempt from exam history to view the full review.';
  }

  protected getHistoryDetailsErrorTitle(): string {
    return this.isArabicMode() ? 'تعذر تحميل تفاصيل المحاولة' : 'Unable to load attempt details';
  }

  protected getHistoryDetailsErrorDescription(): string {
    return this.isArabicMode()
      ? 'يرجى تجربة محاولة أخرى أو التحقق من اتصال الخادم.'
      : 'Please try another attempt or check the backend connection.';
  }

  protected getHistoryButtonLabel(): string {
    return this.isArabicMode() ? 'عرض التفاصيل' : 'View Details';
  }

  protected getCloseLabel(): string {
    return this.isArabicMode() ? 'إغلاق' : 'Close';
  }

  protected getHistoryDateLabel(): string {
    return this.isArabicMode() ? 'التاريخ' : 'Date';
  }

  protected getHistoryScoreLabel(): string {
    return this.isArabicMode() ? 'النتيجة' : 'Score';
  }

  protected getHistoryQuestionsLabel(): string {
    return this.isArabicMode() ? 'عدد الأسئلة' : 'Total Questions';
  }

  protected getHistoryTimestampLabel(source: 'submittedAt' | 'createdAt' | 'updatedAt'): string {
    if (source === 'createdAt') {
      return this.isArabicMode() ? 'وقت الإنشاء' : 'Created At';
    }

    if (source === 'updatedAt') {
      return this.isArabicMode() ? 'آخر تحديث' : 'Updated At';
    }

    return this.isArabicMode() ? 'وقت الإرسال' : 'Submitted At';
  }

  protected getSelectedAttemptTitle(): string {
    return this.isArabicMode() ? 'تفاصيل المحاولة' : 'Attempt Details';
  }

  protected getHistoryStatusLabel(status: string): string {
    const normalized = status.toLowerCase();
    if (normalized === 'submitted') {
      return this.isArabicMode() ? 'مُرسل' : 'Submitted';
    }
    if (normalized === 'expired') {
      return this.isArabicMode() ? 'منتهي' : 'Expired';
    }
    if (normalized === 'active') {
      return this.isArabicMode() ? 'نشط' : 'Active';
    }
    return status;
  }

  protected getHistoryStatusClass(status: string): string {
    const normalized = status.toLowerCase();
    if (normalized === 'submitted') return 'badge-completed';
    if (normalized === 'active') return 'badge-in-progress';
    return 'badge-not-started';
  }

  protected getReviewCount(): number {
    return this.reviewItems().length;
  }

  private mapHistoryRows(items: ExamAttemptHistoryItem[]): ExamHistoryRow[] {
    return items
      .map<ExamHistoryRow>((item) => {
        const timestampSource: 'submittedAt' | 'createdAt' | 'updatedAt' = item.submittedAt
          ? 'submittedAt'
          : item.createdAt
            ? 'createdAt'
            : 'updatedAt';
        const rawDate = item.submittedAt ?? item.createdAt ?? item.updatedAt ?? null;

        return {
          _id: item._id || item.id || '',
          status: item.status || 'submitted',
          score: typeof item.score === 'number' ? item.score : null,
          totalQuestions: typeof item.totalQuestions === 'number' ? item.totalQuestions : null,
          rawDate,
          timestampSource: timestampSource as ExamHistoryRow['timestampSource'],
        };
      })
      .filter((item) => item._id.length > 0);
  }

  private buildReviewItems(): ExamReviewRow[] {
    const attempt = this.selectedAttempt();
    if (!attempt) {
      return [];
    }

    const questions = Array.isArray(attempt.questions) ? attempt.questions : [];
    const questionById = new Map(questions.map((question) => [question._id, question]));
    const results = this.extractAttemptResults(attempt);

    if (results.length > 0) {
      return results.map((item) => {
        const question = questionById.get(item.questionId);
        return {
          ...item,
          question: this.localizeQuestionText(item.question, item.questionAR, question?.question, question?.questionAR),
          selectedAnswer: this.localizeAnswer(question, item.selectedAnswer, item.selectedAnswerAR),
          correctAnswer: this.localizeQuestionText(
            item.correctAnswer,
            item.correctAnswerAR,
            question?.correctAnswer,
            question?.correctAnswerAR,
          ),
          explanation: this.localizeQuestionText(
            item.explanation,
            item.explanationAR,
            question?.explanation,
            question?.explanationAR,
          ),
          image: question?.image ?? item.image ?? null,
          video: question?.video ?? item.video ?? null,
        };
      });
    }

    return questions.flatMap((question) => {
      const selectedAnswer = this.getSelectedAnswerText(question, attempt.answers);
      if (!selectedAnswer) {
        return [];
      }

      const correctAnswer = this.localizeQuestionText(
        question.correctAnswer,
        question.correctAnswerAR,
        question.correctAnswer,
        question.correctAnswerAR,
      );

      return [
        {
          questionId: question._id,
          question: this.localizeQuestionText(
            question.question,
            question.questionAR,
            question.question,
            question.questionAR,
          ),
          questionAR: question.questionAR,
          selectedAnswer,
          selectedAnswerAR: this.getSelectedAnswerText(question, attempt.answers, true),
          correctAnswer,
          correctAnswerAR: question.correctAnswerAR,
          isCorrect: this.isAnswerCorrect(question, selectedAnswer, correctAnswer),
          explanation: this.localizeQuestionText(
            question.explanation,
            question.explanationAR,
            question.explanation,
            question.explanationAR,
          ),
          explanationAR: question.explanationAR,
          image: question.image ?? null,
          video: question.video ?? null,
        },
      ];
    });
  }

  private extractAttemptResults(attempt: ExamAttempt): QuizQuestionResult[] {
    if (Array.isArray(attempt.results)) {
      return attempt.results as QuizQuestionResult[];
    }

    return [];
  }

  private getSelectedAnswerText(
    question: QuizQuestion,
    answers: ExamAttemptAnswer[] | Record<string, string> | undefined,
    forceArabic = false,
  ): string {
    const rawAnswer = this.findAnswerValue(question._id, answers);
    if (!rawAnswer) {
      return '';
    }

    const englishOptions = question.options ?? [];
    const arabicOptions = question.optionsAR ?? [];
    const answerIndex = this.findOptionIndex(englishOptions, rawAnswer);
    const arabicIndex = this.findOptionIndex(arabicOptions, rawAnswer);

    if (forceArabic || this.isArabicMode()) {
      if (answerIndex >= 0 && arabicOptions[answerIndex]) {
        return arabicOptions[answerIndex];
      }
      if (arabicIndex >= 0) {
        return arabicOptions[arabicIndex] ?? rawAnswer;
      }
    } else {
      if (answerIndex >= 0) {
        return englishOptions[answerIndex] ?? rawAnswer;
      }
      if (arabicIndex >= 0 && englishOptions[arabicIndex]) {
        return englishOptions[arabicIndex];
      }
    }

    return rawAnswer;
  }

  private localizeAnswer(
    question: QuizQuestion | undefined,
    englishAnswer?: string,
    arabicAnswer?: string,
  ): string {
    if (this.isArabicMode()) {
      return (
        this.normalizeText(arabicAnswer) ??
        this.normalizeOption(question?.options, question?.optionsAR, englishAnswer) ??
        this.normalizeText(englishAnswer) ??
        ''
      );
    }

    return (
      this.normalizeText(englishAnswer) ??
      this.normalizeOption(question?.optionsAR, question?.options, arabicAnswer) ??
      this.normalizeText(arabicAnswer) ??
      ''
    );
  }

  private localizeQuestionText(
    englishValue?: string | null,
    arabicValue?: string | null,
    fallbackEnglish?: string | null,
    fallbackArabic?: string | null,
  ): string {
    if (this.isArabicMode()) {
      return (
        this.normalizeText(arabicValue) ??
        this.normalizeText(fallbackArabic) ??
        this.normalizeText(englishValue) ??
        fallbackEnglish ??
        ''
      );
    }

    return (
      this.normalizeText(englishValue) ??
      this.normalizeText(fallbackEnglish) ??
      this.normalizeText(arabicValue) ??
      fallbackArabic ??
      ''
    );
  }

  private isAnswerCorrect(question: QuizQuestion, selectedAnswer: string, correctAnswer: string): boolean {
    const normalizedSelected = this.normalizeKey(selectedAnswer);
    const normalizedCorrect = this.normalizeKey(correctAnswer);

    if (!normalizedSelected || !normalizedCorrect) {
      return false;
    }

    if (normalizedSelected === normalizedCorrect) {
      return true;
    }

    const englishOptions = question.options ?? [];
    const arabicOptions = question.optionsAR ?? [];
    const englishIndex = this.findOptionIndex(englishOptions, selectedAnswer);
    const arabicIndex = this.findOptionIndex(arabicOptions, selectedAnswer);

    if (englishIndex >= 0) {
      return this.normalizeKey(question.correctAnswer ?? '') === this.normalizeKey(englishOptions[englishIndex] ?? '')
        || this.normalizeKey(question.correctAnswerAR ?? '') === this.normalizeKey(arabicOptions[englishIndex] ?? '');
    }

    if (arabicIndex >= 0) {
      return this.normalizeKey(question.correctAnswer ?? '') === this.normalizeKey(englishOptions[arabicIndex] ?? '')
        || this.normalizeKey(question.correctAnswerAR ?? '') === this.normalizeKey(arabicOptions[arabicIndex] ?? '');
    }

    return false;
  }

  private calculateReviewScore(items: ExamReviewRow[]): number | null {
    if (items.length === 0) {
      return null;
    }

    const correctCount = items.filter((item) => item.isCorrect).length;
    return Math.round((correctCount / items.length) * 100);
  }

  private findAnswerValue(
    questionId: string,
    answers: ExamAttemptAnswer[] | Record<string, string> | undefined,
  ): string {
    if (!answers) {
      return '';
    }

    if (Array.isArray(answers)) {
      return answers.find((answer) => answer.questionId === questionId)?.selectedAnswer ?? '';
    }

    return answers[questionId] ?? '';
  }

  private normalizeOption(
    firstList: string[] | undefined,
    secondList: string[] | undefined,
    value?: string,
  ): string | undefined {
    const normalizedValue = this.normalizeText(value);
    if (!normalizedValue) {
      return undefined;
    }

    const firstIndex = this.findOptionIndex(firstList ?? [], normalizedValue);
    if (firstIndex >= 0 && secondList?.[firstIndex]) {
      return secondList[firstIndex];
    }

    const secondIndex = this.findOptionIndex(secondList ?? [], normalizedValue);
    if (secondIndex >= 0 && secondList?.[secondIndex]) {
      return secondList[secondIndex];
    }

    return normalizedValue;
  }

  private findOptionIndex(options: string[], value: string): number {
    const normalizedValue = this.normalizeKey(value);
    return options.findIndex((option) => this.normalizeKey(option) === normalizedValue);
  }

  private getAttemptTimestampSource(attempt: ExamAttempt | null): 'submittedAt' | 'createdAt' | 'updatedAt' {
    if (attempt?.submittedAt) {
      return 'submittedAt';
    }

    if (attempt?.createdAt) {
      return 'createdAt';
    }

    return 'updatedAt';
  }

  protected formatHistoryDate(value: string | null): string {
    if (!value) {
      return this.isArabicMode() ? 'غير متاح' : 'Not available';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(this.isArabicMode() ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  private normalizeText(value?: string | null): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private normalizeKey(value?: string | null): string {
    return this.normalizeText(value)?.toLowerCase() ?? '';
  }
}