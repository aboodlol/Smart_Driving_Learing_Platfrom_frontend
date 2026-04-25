import {
  ChangeDetectionStrategy,
  Component,
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
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import {
  ChapterReport,
  DashboardStats,
  RecentQuizAttempt,
} from '../../../core/models/admin.models';

export interface MergedActivity {
  id: string;
  type: string;
  description: string;
  name: string;
  createdAt: string;
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

  protected readonly stats = signal<DashboardStats | null>(null);
  protected readonly chapters = signal<ChapterReport[]>([]);
  protected readonly activities = signal<MergedActivity[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  ngOnInit(): void {
    forkJoin({
      stats: this.api.getDashboardStats(),
      chapters: this.api.getChapterReports(),
      activitiesData: this.api.getRecentActivity(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.stats.set(data.stats);
          this.chapters.set(data.chapters);

          const merged: MergedActivity[] = [];
          if (data.activitiesData?.recentUsers) {
            data.activitiesData.recentUsers.forEach((u) => {
              merged.push({
                id: u.id,
                type: 'registration',
                description: `New user registered: ${u.role}`,
                name: u.name,
                createdAt: u.createdAt,
              });
            });
          }
          if (data.activitiesData?.recentQuizAttempts) {
            data.activitiesData.recentQuizAttempts.forEach((q: RecentQuizAttempt) => {
              const createdAt = q.createdAt ?? new Date().toISOString();
              merged.push({
                id: q.id ?? `${q.user?.id ?? q.user?.name ?? 'quiz'}-${createdAt}`,
                type: 'quiz_attempt',
                description: `Completed quiz with score ${q.score ?? 0}`,
                name: q.user?.name || 'Unknown',
                createdAt,
              });
            });
          }
          merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          this.activities.set(merged);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message);
          this.loading.set(false);
        },
      });
  }

  protected activityIcon(type: string): string {
    switch (type) {
      case 'lesson_completion':
        return '📖';
      case 'quiz_attempt':
        return '📝';
      case 'registration':
        return '👤';
      default:
        return '📌';
    }
  }

  protected formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
