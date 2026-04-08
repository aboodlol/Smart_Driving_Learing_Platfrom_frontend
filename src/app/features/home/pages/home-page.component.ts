import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs/operators';
import { HomeOverview } from '../../../core/models/home.models';
import { AuthService } from '../../../core/services/auth.service';
import { HomeService } from '../../../core/services/home.service';
import { LookupService } from '../../../core/services/lookup.service';

@Component({
  selector: 'app-home-page',
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDividerModule,
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  private readonly homeService = inject(HomeService);
  private readonly lookupService = inject(LookupService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly overview = signal<HomeOverview | null>(null);
  protected readonly lessonTypes = this.lookupService.lessonTypes;
  protected readonly supportChannels = this.lookupService.supportChannels;
  protected readonly currentUser = this.authService.currentUser;

  constructor() {
    this.loadOverview();
  }

  protected reload(): void {
    this.loadOverview();
  }

  private loadOverview(): void {
    this.loading.set(true);

    this.homeService
      .getOverview()
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((overview) => this.overview.set(overview));
  }
}
