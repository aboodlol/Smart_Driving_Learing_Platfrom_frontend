import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ProgressSummary } from '../../../core/models/progress.models';
import { I18nService } from "../../../core/services/i18n.service";
import { TranslatePipe } from "../../../core/pipes/translate.pipe";
import { AuthService } from '../../../core/services/auth.service';
import { ProgressApiService } from '../../../core/services/progress-api.service';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  private readonly progressApi = inject(ProgressApiService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly summary = signal<ProgressSummary | null>(null);
  protected readonly currentUser = this.authService.currentUser;
  protected i18n = inject(I18nService);

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

  protected getChapterPercent(total: number, completed: number): number {
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }
}
