import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { I18nService } from '../../../core/services/i18n.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import {
  ChapterReport,
  DashboardStats,
  RecentActivityDto,
} from '../../../core/models/admin.models';

interface ActivityItem {
  id: string;
  type: 'registration' | 'quiz_attempt' | 'document_upload';
  icon: string;
  /** Locale-correct primary text — does not contain any data values. */
  title: string;
  /** User-generated data (person name, email, document name, chapter title). */
  subject: string;
  /** Optional secondary line, fully localized (e.g. "Scored 4 out of 5"). */
  detail: string;
  createdAt: string;
}

interface LocalizedChapter extends ChapterReport {
  displayTitle: string;
}

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [DecimalPipe, RouterLink, TranslatePipe],
  templateUrl: './admin-dashboard-page.component.html',
  styleUrl: './admin-dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardPageComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly i18n = inject(I18nService);

  protected readonly stats = signal<DashboardStats | null>(null);
  private readonly rawChapters = signal<ChapterReport[]>([]);
  private readonly rawActivity = signal<RecentActivityDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  /** Chapter list with locale-correct display title. */
  protected readonly chapters = computed<LocalizedChapter[]>(() => {
    const isAr = this.i18n.isRtl();
    return this.rawChapters().map((c) => ({
      ...c,
      displayTitle: (isAr && c.chapterTitleAr) ? c.chapterTitleAr : c.chapterTitle,
    }));
  });

  /** Recent activity merged + locale-correct. Recomputes when language changes. */
  protected readonly activities = computed<ActivityItem[]>(() => {
    const data = this.rawActivity();
    if (!data) return [];

    const isAr = this.i18n.isRtl();
    const t = (k: string) => this.i18n.t(k);
    const merged: ActivityItem[] = [];

    for (const u of data.recentUsers ?? []) {
      merged.push({
        id: `u-${u.id}`,
        type: 'registration',
        icon: 'person_add',
        title: t('admin.dashboard.newUserRegistered'),
        subject: u.name,
        detail: '',
        createdAt: u.createdAt,
      });
    }

    for (const q of data.recentQuizAttempts ?? []) {
      const chapter = (isAr && q.chapterTitleAr) ? q.chapterTitleAr : (q.chapterTitle ?? '');
      const score = q.score ?? 0;
      const total = q.totalQuestions ?? 0;
      const scoreText = total > 0
        ? `${t('admin.dashboard.scored')} ${score} ${t('admin.dashboard.outOf')} ${total}`
        : `${t('admin.dashboard.scored')} ${score}`;
      merged.push({
        id: `q-${q.id}`,
        type: 'quiz_attempt',
        icon: 'quiz',
        title: t('admin.dashboard.completedQuiz'),
        subject: chapter || (q.user?.name ?? '—'),
        detail: scoreText,
        createdAt: q.createdAt ?? new Date().toISOString(),
      });
    }

    for (const d of data.recentDocuments ?? []) {
      merged.push({
        id: `d-${d.id}`,
        type: 'document_upload',
        icon: 'cloud_upload',
        title: t('admin.dashboard.uploadedDocument'),
        subject: d.name,
        detail: d.uploadedBy?.name
          ? `${t('admin.dashboard.byUser')} ${d.uploadedBy.name}`
          : '',
        createdAt: d.createdAt,
      });
    }

    merged.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return merged.slice(0, 12);
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');

    forkJoin({
      stats: this.api.getDashboardStats(),
      chapters: this.api.getChapterReports(),
      activitiesData: this.api.getRecentActivity(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.stats.set(data.stats);
          this.rawChapters.set(data.chapters ?? []);
          this.rawActivity.set(data.activitiesData ?? null);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message || this.i18n.t('admin.dashboard.errorLoading'));
          this.loading.set(false);
        },
      });
  }

  protected formatDate(dateStr: string): string {
    const locale = this.i18n.isRtl() ? 'ar' : 'en-US';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected completionTooltip(ch: LocalizedChapter): string {
    const completed = ch.completedEntries ?? 0;
    const possible = (ch.totalSubLessons ?? 0) * (ch.activeUsers ?? 0);
    if (possible === 0) return this.i18n.t('admin.dashboard.completionFormulaTooltip');
    return `${completed} / ${possible} (${this.i18n.t('admin.dashboard.completionFormulaTooltip')})`;
  }
}
