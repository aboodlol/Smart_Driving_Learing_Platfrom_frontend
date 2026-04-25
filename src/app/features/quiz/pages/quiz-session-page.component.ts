import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { QuizQuestion, QuizMode, QuizResult } from '../../../core/models/quiz.models';
import { QuizApiService } from '../../../core/services/quiz-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { I18nService } from '../../../core/services/i18n.service';

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
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly questions = signal<QuizQuestion[]>([]);
  protected readonly currentIndex = signal(0);
  protected readonly answers = signal<Map<string, string>>(new Map());
  protected readonly result = signal<QuizResult | null>(null);
  protected readonly mode = signal<QuizMode>('chapter');
  protected readonly chapterTitle = signal('');

  protected readonly currentQuestion = computed(() => this.questions()[this.currentIndex()]);
  protected readonly progressPercent = computed(() => {
    const total = this.questions().length;
    return total > 0 ? Math.round(((this.currentIndex() + 1) / total) * 100) : 0;
  });
  protected readonly allAnswered = computed(() => this.answers().size === this.questions().length);

  constructor() {
    const snapshot = this.route.snapshot;
    const chapterTitle = snapshot.paramMap.get('chapterTitle');

    if (chapterTitle) {
      this.mode.set('chapter');
      this.chapterTitle.set(chapterTitle);
      this.quizApi
        .getQuizzesByChapter(chapterTitle)
        .pipe(
          finalize(() => this.loading.set(false)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: (questions) => this.questions.set(questions),
          error: (err: Error) => {
            this.toast.error(err.message);
            void this.router.navigateByUrl('/quiz');
          },
        });
    } else {
      this.mode.set('exam');
      this.chapterTitle.set(this.i18n.t('quiz.examSimulationTitle'));
      this.quizApi
        .getExamQuestions()
        .pipe(
          finalize(() => this.loading.set(false)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: (questions) => this.questions.set(questions),
          error: (err: Error) => {
            this.toast.error(err.message);
            void this.router.navigateByUrl('/quiz');
          },
        });
    }
  }

  protected selectAnswer(questionId: string, answer: string): void {
    this.answers.update((map) => {
      const newMap = new Map(map);
      newMap.set(questionId, answer);
      return newMap;
    });
  }

  protected getSelectedAnswer(questionId: string): string | undefined {
    return this.answers().get(questionId);
  }

  protected nextQuestion(): void {
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

    this.submitting.set(true);

    const answersArray = Array.from(this.answers().entries()).map(([questionId, selectedAnswer]) => ({
      questionId,
      selectedAnswer,
    }));

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

  protected getScoreClass(): string {
    const score = this.result()?.score ?? 0;
    if (score >= 70) return 'score-good';
    if (score >= 50) return 'score-okay';
    return 'score-poor';
  }

  protected retakeQuiz(): void {
    this.result.set(null);
    this.answers.set(new Map());
    this.currentIndex.set(0);
    this.loading.set(true);

    const chapterTitle = this.route.snapshot.paramMap.get('chapterTitle');
    const source$ = chapterTitle
      ? this.quizApi.getQuizzesByChapter(chapterTitle)
      : this.quizApi.getExamQuestions();

    source$
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((questions) => this.questions.set(questions));
  }
}
