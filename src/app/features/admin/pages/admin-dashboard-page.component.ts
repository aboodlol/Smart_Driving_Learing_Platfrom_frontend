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
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AdminApiService } from '../../../core/services/admin-api.service';
import {
  ChapterReport,
  DashboardStats,
  RecentActivity,
} from '../../../core/models/admin.models';

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [DecimalPipe, RouterLink, MatProgressBarModule],
  templateUrl: './admin-dashboard-page.component.html',
  styleUrl: './admin-dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardPageComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly stats = signal<DashboardStats | null>(null);
  protected readonly chapters = signal<ChapterReport[]>([]);
  protected readonly activities = signal<RecentActivity[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  ngOnInit(): void {
    forkJoin({
      stats: this.api.getDashboardStats(),
      chapters: this.api.getChapterReports(),
      activities: this.api.getRecentActivity(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.stats.set(data.stats);
          this.chapters.set(data.chapters);
          this.activities.set(data.activities);
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
