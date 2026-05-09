import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { LowerCasePipe } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { ChapterProgress, ProgressSummary } from '../../../core/models/progress.models';
import { I18nService } from '../../../core/services/i18n.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { ProgressApiService } from '../../../core/services/progress-api.service';

type Accent = 'teal' | 'amber' | 'info' | 'success' | 'error';

interface ContinueChapter {
  chapterId: string;
  title: string;
  totalSubLessons: number;
  completedSubLessons: number;
  percent: number;
  status: ChapterProgress['status'];
  accent: Accent;
  icon: string;
}

const CONTINUE_ROTATION: { accent: Accent; icon: string }[] = [
  { accent: 'teal',    icon: 'directions_car' },
  { accent: 'amber',   icon: 'flag' },
  { accent: 'info',    icon: 'shield' },
  { accent: 'success', icon: 'schedule' },
];

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, TranslatePipe, LowerCasePipe],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  private readonly progressApi = inject(ProgressApiService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly i18n = inject(I18nService);

  protected readonly loading = signal(true);
  protected readonly summary = signal<ProgressSummary | null>(null);
  protected readonly currentUser = this.authService.currentUser;

  protected readonly isArabicMode = computed(() => this.i18n.currentLang() === 'ar');

  protected readonly chaptersRemaining = computed(() => {
    const lessons = this.summary()?.lessons ?? [];
    return lessons.filter(l => l.status !== 'Completed').length;
  });

  protected readonly heroSub = computed(() => {
    const n = this.chaptersRemaining();
    const tmpl = this.i18n.t('home.heroSub');
    return tmpl.replace('{n}', this.localeNumber(n));
  });

  protected readonly nextChapter = computed<ChapterProgress | null>(() => {
    const lessons = this.summary()?.lessons ?? [];
    return lessons.find(l => l.status === 'In Progress')
      ?? lessons.find(l => l.status === 'Not Started')
      ?? null;
  });

  protected readonly nextLessonNumber = computed(() => {
    const ch = this.nextChapter();
    if (!ch) return 1;
    return Math.min(ch.totalSubLessons, ch.completedSubLessons + 1);
  });

  protected readonly nextChapterPercent = computed(() => {
    const ch = this.nextChapter();
    if (!ch || ch.totalSubLessons === 0) return 0;
    return Math.round((ch.completedSubLessons / ch.totalSubLessons) * 100);
  });

  protected readonly continueChapters = computed<ContinueChapter[]>(() => {
    const lessons = this.summary()?.lessons ?? [];
    return lessons
      .slice(0, 4)
      .map((l, i) => {
        const rot = CONTINUE_ROTATION[i % CONTINUE_ROTATION.length];
        const percent = l.totalSubLessons > 0
          ? Math.round((l.completedSubLessons / l.totalSubLessons) * 100)
          : 0;
        return {
          chapterId: l.chapterId,
          title: this.localizedTitle(l),
          totalSubLessons: l.totalSubLessons,
          completedSubLessons: l.completedSubLessons,
          percent,
          status: l.status,
          accent: rot.accent,
          icon: rot.icon,
        };
      });
  });

  protected readonly totalCompletedLessons = computed(() => {
    const lessons = this.summary()?.lessons ?? [];
    return lessons.reduce((sum, l) => sum + l.completedSubLessons, 0);
  });

  protected readonly recentActivity = computed(() => {
    const lessons = this.summary()?.lessons ?? [];
    const stats = this.summary()?.quizStats;

    const items: { icon: string; tone: 'success' | 'amber' | 'teal'; text: string; ago: string }[] = [];

    const inProgress = lessons.find(l => l.status === 'In Progress');
    if (inProgress) {
      items.push({
        icon: 'check',
        tone: 'success',
        text: this.isArabicMode()
          ? `تابعت فصل «${this.localizedTitle(inProgress)}»`
          : `Resumed '${this.localizedTitle(inProgress)}'`,
        ago: this.i18n.t('home.minutesAgo'),
      });
    }

    if (stats?.lastScore !== null && stats?.lastScore !== undefined) {
      items.push({
        icon: 'emoji_events',
        tone: 'amber',
        text: this.isArabicMode()
          ? `آخر نتيجة: ${this.localeNumber(stats.lastScore)}%`
          : `Last quiz score: ${stats.lastScore}%`,
        ago: this.i18n.t('home.hoursAgo'),
      });
    }

    if (stats?.totalAttempts) {
      items.push({
        icon: 'auto_awesome',
        tone: 'teal',
        text: this.isArabicMode()
          ? `أكملت ${this.localeNumber(stats.totalAttempts)} محاولة اختبار`
          : `Completed ${stats.totalAttempts} quiz attempts`,
        ago: this.i18n.t('home.daysAgo'),
      });
    }

    return items;
  });

  protected readonly bestScoreLabel = computed(() => {
    const stats = this.summary()?.quizStats;
    if (!stats || stats.lastScore === null || stats.lastScore === undefined) return '—';
    return `${this.localeNumber(stats.lastScore)}%`;
  });

  constructor() {
    this.loadDashboard();
  }

  private loadDashboard(): void {
    this.loading.set(true);

    this.progressApi
      .getProgressSummary()
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((summary) => this.summary.set(summary));
  }

  protected getStatusLabelKey(status: ChapterProgress['status']): string {
    if (status === 'Completed') return 'progress.statusCompleted';
    if (status === 'In Progress') return 'progress.statusInProgress';
    return 'progress.statusNotStarted';
  }

  protected getStatusTone(status: ChapterProgress['status']): 'success' | 'amber' | 'neutral' {
    if (status === 'Completed') return 'success';
    if (status === 'In Progress') return 'amber';
    return 'neutral';
  }

  protected continueRoute(): string {
    const ch = this.nextChapter();
    return ch ? `/lessons/${ch.chapterId}` : '/lessons';
  }

  protected localeNumber(n: number): string {
    if (!this.isArabicMode()) return String(n);
    return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
  }

  private localizedTitle(l: ChapterProgress): string {
    return this.isArabicMode() && l.titleAR ? l.titleAR : l.title;
  }
}
