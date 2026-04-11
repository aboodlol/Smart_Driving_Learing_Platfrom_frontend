import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs/operators';
import { ProgressSummary } from '../../../core/models/progress.models';
import { ProgressApiService } from '../../../core/services/progress-api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-progress-page',
  imports: [MatProgressBarModule, MatProgressSpinnerModule],
  templateUrl: './progress-page.component.html',
  styleUrl: './progress-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressPageComponent {
  private readonly progressApi = inject(ProgressApiService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly summary = signal<ProgressSummary | null>(null);
  protected readonly resetting = signal(false);

  constructor() {
    this.loadSummary();
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

  protected getStatusClass(status: string): string {
    if (status === 'Completed') return 'badge-completed';
    if (status === 'In Progress') return 'badge-in-progress';
    return 'badge-not-started';
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
}
