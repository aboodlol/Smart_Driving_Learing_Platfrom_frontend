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
  percent: number;
  accent: 'teal' | 'amber' | 'info' | 'success' | 'neutral';
}

const EXAM_TARGET_COUNT = 60;
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
  protected readonly totalAllocated = signal(0);

  protected readonly examInstructions = [
    { icon: 'quiz', key: 'quiz.examInstr1' },
    { icon: 'schedule', key: 'quiz.examInstr2' },
    { icon: 'arrow_forward', key: 'quiz.examInstr3' },
    { icon: 'shield', key: 'quiz.examInstr4' },
    { icon: 'emoji_events', key: 'quiz.examInstr5' },
    { icon: 'skip_next', key: 'quiz.examInstr6' },
    { icon: 'rule', key: 'quiz.examInstr7' },
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

  // Mirrors the backend's proportional allocation in services/quizService.getExamQuestions:
  // each chapter's allocated count = round(chapterCount / totalAvailable * TARGET_COUNT),
  // distributed by largest remainder, with at-least-1 for non-empty chapters, and the
  // total constrained to exactly TARGET_COUNT (60). Every chapter is shown so the user
  // can see the full 100% mix even when a chapter contributes 0 after rounding.
  private buildChapterMix(questions: QuizQuestion[]): ChapterMix[] {
    const groups = new Map<string, { en: string; ar: string; count: number }>();

    for (const q of questions) {
      const key = (q.chapterKey || q.chapterTitle || '').trim().toLowerCase();
      if (!key) continue;
      const existing = groups.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        groups.set(key, {
          en: q.chapterTitle?.trim() || key,
          ar: q.chapterTitleAR?.trim() || q.chapterTitle?.trim() || key,
          count: 1,
        });
      }
    }

    const totalAvailable = Array.from(groups.values()).reduce((sum, g) => sum + g.count, 0);
    if (totalAvailable === 0) {
      this.totalAllocated.set(0);
      return [];
    }

    interface Allocation {
      en: string;
      ar: string;
      count: number;
      allocated: number;
      remainder: number;
    }

    const allocations: Allocation[] = Array.from(groups.values()).map((g) => {
      const ideal = totalAvailable <= EXAM_TARGET_COUNT ? g.count : (g.count / totalAvailable) * EXAM_TARGET_COUNT;
      const floored = Math.min(g.count, Math.floor(ideal));
      const allocated = g.count > 0 && floored === 0 && totalAvailable > EXAM_TARGET_COUNT ? 1 : floored;
      return {
        en: g.en,
        ar: g.ar,
        count: g.count,
        allocated,
        remainder: ideal - Math.floor(ideal),
      };
    });

    let allocated = allocations.reduce((sum, a) => sum + a.allocated, 0);
    const target = Math.min(EXAM_TARGET_COUNT, totalAvailable);

    if (allocated < target) {
      const byRemainder = allocations.slice().sort((a, b) => b.remainder - a.remainder);
      let i = 0;
      const safety = byRemainder.length * 10;
      while (allocated < target && i < safety) {
        const a = byRemainder[i % byRemainder.length];
        if (a.allocated < a.count) {
          a.allocated += 1;
          allocated += 1;
        }
        i += 1;
      }
    } else if (allocated > target) {
      const donors = allocations.filter((a) => a.allocated > 1).sort((a, b) => a.remainder - b.remainder);
      let i = 0;
      while (allocated > target && donors.length > 0 && i < donors.length * 10) {
        const donor = donors[i % donors.length];
        if (donor.allocated > 1) {
          donor.allocated -= 1;
          allocated -= 1;
        }
        i += 1;
      }
    }

    this.totalAllocated.set(allocated);

    return allocations
      .sort((a, b) => b.allocated - a.allocated || b.count - a.count)
      .map((a, i) => ({
        title: this.isArabicMode() ? a.ar : a.en,
        count: a.allocated,
        percent: allocated > 0 ? Math.round((a.allocated / allocated) * 100) : 0,
        accent: ACCENT_ROTATION[i % ACCENT_ROTATION.length],
      }));
  }
}
