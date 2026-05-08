import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ExamAttempt } from '../../../core/models/exam-attempt.models';
import { QuizQuestion } from '../../../core/models/quiz.models';
import { ExamAttemptApiService } from '../../../core/services/exam-attempt-api.service';
import { I18nService } from '../../../core/services/i18n.service';
import { QuizApiService } from '../../../core/services/quiz-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

interface ChapterMix {
  title: string;
  count: number;
  accent: 'teal' | 'amber' | 'info' | 'success' | 'neutral';
}

const ACCENT_ROTATION: ChapterMix['accent'][] = ['amber', 'info', 'success', 'teal', 'neutral'];

@Component({
  selector: 'app-exam-intro-page',
  imports: [TranslatePipe],
  templateUrl: './exam-intro-page.component.html',
  styleUrl: './exam-intro-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamIntroPageComponent {
  private readonly examAttemptApi = inject(ExamAttemptApiService);
  private readonly quizApi = inject(QuizApiService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isArabicMode = computed(() => this.i18n.currentLang() === 'ar');

  protected readonly checkingActive = signal(true);
  protected readonly activeAttempt = signal<ExamAttempt | null>(null);
  protected readonly hasActiveAttempt = computed(() => this.activeAttempt() !== null);

  protected readonly startingExam = signal(false);

  protected readonly loadingMix = signal(true);
  protected readonly chapterMix = signal<ChapterMix[]>([]);
  protected readonly totalQuestions = signal(0);

  protected readonly examInstructions = [
    { icon: 'quiz', key: 'quiz.examInstr1' },
    { icon: 'schedule', key: 'quiz.examInstr2' },
    { icon: 'arrow_forward', key: 'quiz.examInstr3' },
    { icon: 'shield', key: 'quiz.examInstr4' },
    { icon: 'emoji_events', key: 'quiz.examInstr5' },
  ];

  constructor() {
    this.examAttemptApi
      .getActiveExamAttempt()
      .pipe(
        finalize(() => this.checkingActive.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (attempt) => this.activeAttempt.set(attempt),
        error: () => this.activeAttempt.set(null),
      });

    this.quizApi
      .getAllQuizzes()
      .pipe(
        finalize(() => this.loadingMix.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (questions) => this.chapterMix.set(this.buildChapterMix(questions)),
        error: () => this.chapterMix.set([]),
      });
  }

  protected resumeExam(): void {
    void this.router.navigateByUrl('/exam/session');
  }

  protected startNewExam(): void {
    if (this.startingExam()) return;
    this.startingExam.set(true);

    this.examAttemptApi
      .startExamAttempt()
      .pipe(
        finalize(() => this.startingExam.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => void this.router.navigateByUrl('/exam/session'),
        error: (err: Error) => this.toast.error(err.message),
      });
  }

  private buildChapterMix(questions: QuizQuestion[]): ChapterMix[] {
    const counts = new Map<string, { en: string; ar: string; count: number }>();

    for (const q of questions) {
      const key = (q.chapterKey || q.chapterTitle || '').trim().toLowerCase();
      if (!key) continue;
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, {
          en: q.chapterTitle?.trim() || key,
          ar: q.chapterTitleAR?.trim() || q.chapterTitle?.trim() || key,
          count: 1,
        });
      }
    }

    this.totalQuestions.set(Array.from(counts.values()).reduce((sum, c) => sum + c.count, 0));

    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((c, i) => ({
        title: this.isArabicMode() ? c.ar : c.en,
        count: c.count,
        accent: ACCENT_ROTATION[i % ACCENT_ROTATION.length],
      }));
  }

  protected mixPercent(count: number): number {
    const total = Math.max(1, this.totalQuestions());
    return Math.min(100, Math.round((count / total) * 100));
  }
}
