import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ExamAttempt, ExamAttemptAnswer, ExamAttemptHistoryItem } from '../../../core/models/exam-attempt.models';
import {
  ActivityResponse,
  ChapterProgress,
  ChapterStrengthResponse,
  ProgressRange,
  ProgressSummary,
} from '../../../core/models/progress.models';
import { QuizQuestion, QuizQuestionResult } from '../../../core/models/quiz.models';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ExamAttemptApiService } from '../../../core/services/exam-attempt-api.service';
import { I18nService } from '../../../core/services/i18n.service';
import { ProgressApiService } from '../../../core/services/progress-api.service';
import { ToastService } from '../../../core/services/toast.service';

type Range = ProgressRange;

interface ExamHistoryRow {
  _id: string;
  status: string;
  score: number | null;
  totalQuestions: number | null;
  rawDate: string | null;
  timestampSource: 'submittedAt' | 'createdAt' | 'updatedAt';
  /** Best-effort time used MM:SS, derived from createdAt → submittedAt */
  duration: string | null;
  passed: boolean;
}

interface ExamReviewRow extends QuizQuestionResult {
  question: string;
  selectedAnswer: string;
  correctAnswer: string;
  explanation: string;
  image?: string | null;
  video?: string | null;
  resolvedImage?: string;
}

interface BarSegment {
  height: number;
  highlight: boolean;
  date: string | null;
  count: number;
}

interface ChapterProgressRow {
  chapterId: string;
  title: string;
  percent: number;
  accent: 'success' | 'amber' | 'info' | 'teal' | 'neutral';
}

interface RadarPoint {
  /** SVG coordinate of the data vertex (strength-scaled). */
  x: number;
  y: number;
  /** SVG coordinate of the chapter label anchor (just outside the outer ring). */
  labelX: number;
  labelY: number;
  /** Horizontal anchor for the label, chosen by quadrant for clean alignment. */
  labelAnchor: 'start' | 'middle' | 'end';
  /** Tooltip text shown on hover/focus (locale-aware). */
  tooltip: string;
  title: string;
  strength: number;
  correct: number;
  answered: number;
  chapterKey: string;
}

interface RadarChartViewModel {
  size: number;
  cx: number;
  cy: number;
  outerRadius: number;
  rings: { r: number; label: string }[];
  axes: { x2: number; y2: number }[];
  polygonPoints: string;
  points: RadarPoint[];
  hasData: boolean;
}

interface WeakestChapterRow {
  chapterId: string;
  chapterKey: string;
  title: string;
  strength: number;
  correct: number;
  answered: number;
  tone: 'error' | 'amber' | 'success' | 'neutral';
}

const PASSING_SCORE = 51;

@Component({
  selector: 'app-progress-page',
  imports: [RouterLink, TranslatePipe],
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
  protected readonly range = signal<Range>('30d');
  protected readonly activity = signal<ActivityResponse | null>(null);
  protected readonly activityLoading = signal(false);
  protected readonly chapterStrength = signal<ChapterStrengthResponse | null>(null);
  protected readonly chapterStrengthLoading = signal(false);

  protected readonly isArabicMode = computed(() => this.i18n.currentLang() === 'ar');
  protected readonly hasHistory = computed(() => this.filteredHistory().length > 0);
  protected readonly reviewItems = computed(() => this.buildReviewItems());

  // Exam history filtered by the selected range. Filtering happens on the
  // client because /exam-attempts/history returns the full list — we only
  // hide rows outside the current window without re-fetching.
  protected readonly filteredHistory = computed<ExamHistoryRow[]>(() => {
    const rows = this.history();
    const r = this.range();
    if (r === 'all') return rows;
    const days = r === '7d' ? 7 : 30;
    const cutoff = this.startOfNDaysAgo(days);
    return rows.filter((row) => {
      if (!row.rawDate) return false;
      const t = new Date(row.rawDate).getTime();
      return !Number.isNaN(t) && t >= cutoff;
    });
  });

  // ─── Derived stats ───
  protected readonly totalCompletedSubLessons = computed(() => {
    const lessons = this.summary()?.lessons ?? [];
    return lessons.reduce((sum, l) => sum + l.completedSubLessons, 0);
  });

  protected readonly totalSubLessons = computed(() => {
    const lessons = this.summary()?.lessons ?? [];
    return lessons.reduce((sum, l) => sum + l.totalSubLessons, 0);
  });

  protected readonly completionPercent = computed(() => {
    const total = this.totalSubLessons();
    return total > 0 ? Math.round((this.totalCompletedSubLessons() / total) * 100) : 0;
  });

  protected readonly bestScore = computed(() => {
    const fromHistory = this.filteredHistory()
      .map(h => h.score)
      .filter((s): s is number => typeof s === 'number');
    if (fromHistory.length > 0) return Math.max(...fromHistory);
    return this.summary()?.quizStats?.lastScore ?? null;
  });

  protected readonly bestScoreLabel = computed(() => {
    const best = this.bestScore();
    if (best === null) return '—';
    return `${this.localeNumber(best)}%`;
  });

  protected readonly bestPassed = computed(() => (this.bestScore() ?? 0) >= 85);

  protected readonly activeDaysLabel = computed(() => {
    const value = this.activity()?.activeDays;
    if (typeof value !== 'number') return '—';
    return this.localeNumber(value);
  });

  protected readonly questionsAnsweredLabel = computed(() => {
    const total = this.summary()?.quizStats?.totalAttempts ?? 0;
    return this.localeNumber(total);
  });

  protected readonly questionsAccuracyLabel = computed(() => {
    const avg = this.summary()?.quizStats?.averageScore ?? 0;
    return `${this.localeNumber(avg)}% ✓`;
  });

  // ─── Bar chart (real activity by day) ───
  // Heights are normalized against the peak count in the current window so a
  // single very active day doesn't flatten the rest of the chart visually.
  protected readonly bars = computed<BarSegment[]>(() => {
    const buckets = this.activity()?.buckets ?? [];
    if (buckets.length === 0) return [];

    const peak = buckets.reduce((max, b) => Math.max(max, b.count), 0);
    return buckets.map((b) => {
      const ratio = peak > 0 ? b.count / peak : 0;
      // Floor of 6% so empty days still render as a faint tick;
      // 100% cap so the peak day touches the top of the chart area.
      const height = b.count === 0 ? 6 : Math.max(12, Math.round(ratio * 100));
      const highlight = peak > 0 && b.count === peak;
      return { height, highlight, date: b.date, count: b.count };
    });
  });

  protected readonly hasActivity = computed(() => {
    const buckets = this.activity()?.buckets ?? [];
    return buckets.some((b) => b.count > 0);
  });

  protected readonly activityAxisStart = computed(() => {
    const r = this.range();
    if (r === '7d') return this.isArabicMode() ? 'قبل ٧ أيام' : '7d ago';
    if (r === 'all') {
      const buckets = this.activity()?.buckets ?? [];
      const first = buckets[0]?.date;
      return first ? this.formatHistoryDate(first) : '—';
    }
    return this.isArabicMode() ? 'قبل ٣٠ يومًا' : '30d ago';
  });

  // ─── Chapter progress rows ───
  protected readonly chapterRows = computed<ChapterProgressRow[]>(() => {
    const lessons = this.summary()?.lessons ?? [];
    return lessons.map(l => {
      const percent = l.totalSubLessons > 0
        ? Math.round((l.completedSubLessons / l.totalSubLessons) * 100)
        : 0;
      const accent: ChapterProgressRow['accent'] =
        percent === 100 ? 'success'
        : percent >= 60 ? 'amber'
        : percent >= 30 ? 'info'
        : percent > 0   ? 'teal'
        : 'neutral';
      return {
        chapterId: l.chapterId,
        title: this.localizedTitle(l),
        percent,
        accent,
      };
    });
  });

  // ─── Chapter strength rows (driven by exam-attempt accuracy) ───
  protected readonly hasChapterStrengthData = computed(() => {
    const data = this.chapterStrength();
    if (!data) return false;
    return (data.chapters ?? []).some((c) => c.answered > 0);
  });

  // Weakest list: lowest-strength chapters first. Only includes chapters that
  // actually have answered exam questions in the selected window — chapters
  // the user hasn't been examined on yet would otherwise dominate the bottom
  // of the list at 0%, which isn't actionable feedback.
  protected readonly weakestStrengthRows = computed<WeakestChapterRow[]>(() => {
    const chapters = this.chapterStrength()?.chapters ?? [];
    return chapters
      .filter((c) => c.answered > 0)
      .map<WeakestChapterRow>((c) => ({
        chapterId: c.chapterId,
        chapterKey: c.chapterKey,
        title: this.isArabicMode() && c.chapterTitleAR ? c.chapterTitleAR : c.chapterTitle,
        strength: c.strength,
        correct: c.correct,
        answered: c.answered,
        tone: this.strengthToneFor(c.strength),
      }))
      .sort((a, b) => a.strength - b.strength)
      .slice(0, 5);
  });

  // ─── Radar chart viewmodel ───
  // Inline SVG so we avoid pulling in a chart library; geometry is computed
  // once per render and recomputed automatically when the range/language/data
  // signals change.
  protected readonly radarViewModel = computed<RadarChartViewModel>(() => {
    const SIZE = 320;
    const CENTER = SIZE / 2;
    const OUTER = SIZE * 0.36; // leaves room for chapter labels around the ring

    const chapters = this.chapterStrength()?.chapters ?? [];
    const arabic = this.isArabicMode();

    const rings = [25, 50, 75, 100].map((pct) => ({
      r: (OUTER * pct) / 100,
      label: `${this.localeNumber(pct)}%`,
    }));

    if (chapters.length < 3) {
      // A polygon below 3 vertices collapses to a line; render rings only and
      // mark the chart as data-less so the template shows an empty state.
      return {
        size: SIZE,
        cx: CENTER,
        cy: CENTER,
        outerRadius: OUTER,
        rings,
        axes: [],
        polygonPoints: '',
        points: [],
        hasData: false,
      };
    }

    const step = (Math.PI * 2) / chapters.length;
    const axes: { x2: number; y2: number }[] = [];
    const points: RadarPoint[] = [];
    const polyVerts: string[] = [];

    chapters.forEach((c, i) => {
      // Start at the top (12 o'clock) and walk clockwise.
      const angle = -Math.PI / 2 + step * i;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      axes.push({ x2: CENTER + cos * OUTER, y2: CENTER + sin * OUTER });

      const scaled = OUTER * (Math.max(0, Math.min(100, c.strength)) / 100);
      const x = CENTER + cos * scaled;
      const y = CENTER + sin * scaled;
      polyVerts.push(`${x},${y}`);

      // Push labels slightly outside the outer ring; quadrant chooses anchor.
      const labelOffset = 14;
      const labelX = CENTER + cos * (OUTER + labelOffset);
      const labelY = CENTER + sin * (OUTER + labelOffset);
      const anchor: RadarPoint['labelAnchor'] =
        cos > 0.25 ? 'start' : cos < -0.25 ? 'end' : 'middle';

      const title = arabic && c.chapterTitleAR ? c.chapterTitleAR : c.chapterTitle;
      const correctText = this.localeNumber(c.correct);
      const answeredText = this.localeNumber(c.answered);
      const pctText = `${this.localeNumber(c.strength)}%`;
      const tooltip = arabic
        ? `${title} · ${pctText} · ${correctText}/${answeredText} صحيحة`
        : `${title} · ${pctText} · ${correctText}/${answeredText} correct`;

      points.push({
        x,
        y,
        labelX,
        labelY,
        labelAnchor: anchor,
        tooltip,
        title,
        strength: c.strength,
        correct: c.correct,
        answered: c.answered,
        chapterKey: c.chapterKey,
      });
    });

    return {
      size: SIZE,
      cx: CENTER,
      cy: CENTER,
      outerRadius: OUTER,
      rings,
      axes,
      polygonPoints: polyVerts.join(' '),
      points,
      hasData: chapters.some((c) => c.answered > 0),
    };
  });

  // ─── Selected attempt computeds (preserved from original) ───
  protected readonly selectedAttemptStatusLabel = computed(() => {
    const attempt = this.selectedAttempt();
    return attempt?.status ? this.getHistoryStatusLabel(attempt.status) : '--';
  });
  protected readonly selectedAttemptTimestamp = computed(() => {
    const attempt = this.selectedAttempt();
    return this.formatHistoryDate(
      attempt?.submittedAt ?? attempt?.createdAt ?? attempt?.updatedAt ?? null,
    );
  });
  protected readonly selectedAttemptScore = computed(() => {
    const attempt = this.selectedAttempt();
    if (!attempt) return '--';
    const score = typeof attempt.score === 'number' ? attempt.score : this.calculateReviewScore(this.reviewItems());
    return score === null ? '--' : `${score}%`;
  });
  protected readonly selectedAttemptTotalQuestions = computed(() => {
    const attempt = this.selectedAttempt();
    if (!attempt) return '--';
    const total = attempt.totalQuestions ?? this.reviewItems().length;
    return total > 0 ? String(total) : '--';
  });

  constructor() {
    this.loadSummary();
    this.loadHistory();

    // Re-fetch activity AND chapter strength whenever the range changes —
    // includes the initial '30d' run thanks to Angular's eager-effect semantics.
    effect(() => {
      const r = this.range();
      this.loadActivity(r);
      this.loadChapterStrength(r);
    });
  }

  // ─── Public actions ───
  protected setRange(r: Range): void {
    if (this.range() === r) return;
    this.range.set(r);
  }

  protected toggleAttemptDetails(attemptId: string): void {
    if (this.selectedAttemptId() === attemptId) {
      this.closeAttemptDetails();
      return;
    }
    this.viewAttemptDetails(attemptId);
  }

  protected viewAttemptDetails(attemptId: string): void {
    if (!attemptId || this.selectedAttemptLoading()) return;

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

  // Quietly hide images that fail to load (deleted/migrated media) so the
  // attempt row falls back to a text-only layout instead of a broken icon.
  protected onAttemptImageError(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLImageElement) {
      const figure = target.closest('.dw-attempt__media');
      if (figure instanceof HTMLElement) figure.style.display = 'none';
    }
  }

  protected resetProgress(): void {
    if (!confirm('Are you sure you want to reset all your progress? This cannot be undone.')) return;

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

  // ─── Format helpers ───
  protected formatHistoryDate(value: string | null): string {
    if (!value) return this.isArabicMode() ? 'غير متاح' : '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(this.isArabicMode() ? 'ar-EG' : 'en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  }

  protected localeNumber(n: number): string {
    if (!this.isArabicMode()) return String(n);
    return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
  }

  protected getHistoryStatusLabel(status: string): string {
    const normalized = status.toLowerCase();
    if (normalized === 'submitted') return this.isArabicMode() ? 'مُرسل' : 'Submitted';
    if (normalized === 'expired')   return this.isArabicMode() ? 'منتهي' : 'Expired';
    if (normalized === 'active')    return this.isArabicMode() ? 'نشط'   : 'Active';
    return status;
  }

  // ─── Private loaders / mappers ───
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

  private loadActivity(range: Range): void {
    this.activityLoading.set(true);
    this.progressApi
      .getActivity(range)
      .pipe(
        finalize(() => this.activityLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => this.activity.set(response),
        error: (err: Error) => {
          this.activity.set(null);
          this.toast.error(err.message);
        },
      });
  }

  private loadChapterStrength(range: Range): void {
    this.chapterStrengthLoading.set(true);
    this.progressApi
      .getChapterStrength(range)
      .pipe(
        finalize(() => this.chapterStrengthLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => this.chapterStrength.set(response),
        error: (err: Error) => {
          this.chapterStrength.set(null);
          this.toast.error(err.message);
        },
      });
  }

  // Same colour scale as the existing chapter-progress accents, but driven by
  // strength bands rather than completion %.
  private strengthToneFor(strength: number): WeakestChapterRow['tone'] {
    if (strength >= 85) return 'success';
    if (strength >= 60) return 'amber';
    if (strength >= 30) return 'error';
    return 'neutral';
  }

  // Mirrors `quizRoute()` in lesson-detail: prefer chapterKey, encode for the
  // URL. Used by the "Train" buttons on the weakest-list rows.
  protected chapterQuizPath(row: { chapterKey?: string; title: string }): string {
    const slug = row.chapterKey?.trim() ? row.chapterKey : row.title;
    return `/quiz/chapter/${encodeURIComponent(slug)}`;
  }

  // Local midnight `days` days ago, used to filter the exam-history list.
  private startOfNDaysAgo(days: number): number {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1)).getTime();
  }

  // Mirrors the helper in quiz-session-page so exam-question images saved as
  // relative paths (e.g. "/uploads/quiz/123.png") resolve against the configured
  // backend URL. Absolute URLs pass through untouched.
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

  private mapHistoryRows(items: ExamAttemptHistoryItem[]): ExamHistoryRow[] {
    return items
      .map<ExamHistoryRow>((item) => {
        const timestampSource: 'submittedAt' | 'createdAt' | 'updatedAt' = item.submittedAt
          ? 'submittedAt'
          : item.createdAt
            ? 'createdAt'
            : 'updatedAt';
        const rawDate = item.submittedAt ?? item.createdAt ?? item.updatedAt ?? null;
        const score = typeof item.score === 'number' ? item.score : null;
        const total = typeof item.totalQuestions === 'number' ? item.totalQuestions : null;
        const passed = score !== null && total
          ? score >= PASSING_SCORE
          : (score ?? 0) >= 85;

        return {
          _id: item._id || item.id || '',
          status: item.status || 'submitted',
          score,
          totalQuestions: total,
          rawDate,
          timestampSource,
          duration: this.deriveDuration(item),
          passed,
        };
      })
      .filter((item) => item._id.length > 0);
  }

  private deriveDuration(item: ExamAttemptHistoryItem): string | null {
    if (!item.submittedAt || !item.createdAt) return null;
    const start = new Date(item.createdAt).getTime();
    const end = new Date(item.submittedAt).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
    const totalSeconds = Math.floor((end - start) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  private calculateReviewScore(items: ExamReviewRow[]): number | null {
    if (items.length === 0) return null;
    const correctCount = items.filter((item) => item.isCorrect).length;
    return Math.round((correctCount / items.length) * 100);
  }

  private buildReviewItems(): ExamReviewRow[] {
    const attempt = this.selectedAttempt();
    if (!attempt) return [];

    const questions = Array.isArray(attempt.questions) ? attempt.questions : [];
    const questionById = new Map(questions.map((question) => [question._id, question]));
    const results = this.extractAttemptResults(attempt);

    if (results.length > 0) {
      return results.map((item) => {
        const question = questionById.get(item.questionId);
        const image = question?.image ?? item.image ?? null;
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
          image,
          video: question?.video ?? item.video ?? null,
          resolvedImage: this.resolveAbsoluteImageUrl(image) || undefined,
        };
      });
    }

    return questions.flatMap((question) => {
      const selectedAnswer = this.getSelectedAnswerText(question, attempt.answers);
      if (!selectedAnswer) return [];
      const correctAnswer = this.localizeQuestionText(
        question.correctAnswer,
        question.correctAnswerAR,
        question.correctAnswer,
        question.correctAnswerAR,
      );

      return [
        {
          questionId: question._id,
          question: this.localizeQuestionText(question.question, question.questionAR, question.question, question.questionAR),
          questionAR: question.questionAR,
          selectedAnswer,
          selectedAnswerAR: this.getSelectedAnswerText(question, attempt.answers, true),
          correctAnswer,
          correctAnswerAR: question.correctAnswerAR,
          isCorrect: this.isAnswerCorrect(question, selectedAnswer, correctAnswer),
          explanation: this.localizeQuestionText(question.explanation, question.explanationAR, question.explanation, question.explanationAR),
          explanationAR: question.explanationAR,
          image: question.image ?? null,
          video: question.video ?? null,
          resolvedImage: this.resolveAbsoluteImageUrl(question.image) || undefined,
        },
      ];
    });
  }

  private extractAttemptResults(attempt: ExamAttempt): QuizQuestionResult[] {
    if (Array.isArray(attempt.results)) return attempt.results as QuizQuestionResult[];
    return [];
  }

  private getSelectedAnswerText(
    question: QuizQuestion,
    answers: ExamAttemptAnswer[] | Record<string, string> | undefined,
    forceArabic = false,
  ): string {
    const rawAnswer = this.findAnswerValue(question._id, answers);
    if (!rawAnswer) return '';

    const englishOptions = question.options ?? [];
    const arabicOptions = question.optionsAR ?? [];
    const answerIndex = this.findOptionIndex(englishOptions, rawAnswer);
    const arabicIndex = this.findOptionIndex(arabicOptions, rawAnswer);

    if (forceArabic || this.isArabicMode()) {
      if (answerIndex >= 0 && arabicOptions[answerIndex]) return arabicOptions[answerIndex];
      if (arabicIndex >= 0) return arabicOptions[arabicIndex] ?? rawAnswer;
    } else {
      if (answerIndex >= 0) return englishOptions[answerIndex] ?? rawAnswer;
      if (arabicIndex >= 0 && englishOptions[arabicIndex]) return englishOptions[arabicIndex];
    }

    return rawAnswer;
  }

  private localizeAnswer(question: QuizQuestion | undefined, englishAnswer?: string, arabicAnswer?: string): string {
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
    if (!normalizedSelected || !normalizedCorrect) return false;
    if (normalizedSelected === normalizedCorrect) return true;

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

  private findAnswerValue(
    questionId: string,
    answers: ExamAttemptAnswer[] | Record<string, string> | undefined,
  ): string {
    if (!answers) return '';
    if (Array.isArray(answers)) return answers.find(a => a.questionId === questionId)?.selectedAnswer ?? '';
    return answers[questionId] ?? '';
  }

  private normalizeOption(firstList: string[] | undefined, secondList: string[] | undefined, value?: string): string | undefined {
    const normalizedValue = this.normalizeText(value);
    if (!normalizedValue) return undefined;
    const firstIndex = this.findOptionIndex(firstList ?? [], normalizedValue);
    if (firstIndex >= 0 && secondList?.[firstIndex]) return secondList[firstIndex];
    const secondIndex = this.findOptionIndex(secondList ?? [], normalizedValue);
    if (secondIndex >= 0 && secondList?.[secondIndex]) return secondList[secondIndex];
    return normalizedValue;
  }

  private findOptionIndex(options: string[], value: string): number {
    const normalizedValue = this.normalizeKey(value);
    return options.findIndex((option) => this.normalizeKey(option) === normalizedValue);
  }

  private normalizeText(value?: string | null): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private normalizeKey(value?: string | null): string {
    return this.normalizeText(value)?.toLowerCase() ?? '';
  }

  private localizedTitle(l: ChapterProgress): string {
    return this.isArabicMode() && l.titleAR ? l.titleAR : l.title;
  }
}
