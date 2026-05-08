import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { filter, map, startWith } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';
import { I18nService } from './core/services/i18n.service';
import { ThemeService } from './core/services/theme.service';
import { TranslatePipe } from './core/pipes/translate.pipe';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSnackBarModule,
    TranslatePipe,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  host: {
    '[class.is-authenticated]': 'isAuthenticated()',
    '[class.sidebar-collapsed]': 'sidebarCollapsed()',
    '[class.sidebar-open]': 'sidebarOpen()',
    '[class.is-landing]': 'showLandingTopbar()',
    '[class.is-bare]': 'isAuthRoute()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly i18n = inject(I18nService);
  protected readonly theme = inject(ThemeService);

  protected readonly title = 'DriveWise';
  protected readonly currentUser = this.authService.currentUser;
  protected readonly isAuthenticated = this.authService.isAuthenticated;

  protected readonly sidebarOpen = signal(false);
  protected readonly sidebarCollapsed = signal(false);

  /** Reactive current URL — updates on NavigationEnd. */
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly isLandingRoute = computed(() => {
    const u = this.currentUrl();
    return u === '/' || u.startsWith('/landing');
  });

  protected readonly isAuthRoute = computed(() => {
    const u = this.currentUrl();
    return u.startsWith('/login') || u.startsWith('/register');
  });

  /** Show the marketing TopBar only on the landing page when not signed in. */
  protected readonly showLandingTopbar = computed(
    () => !this.isAuthenticated() && this.isLandingRoute(),
  );

  protected readonly userInitial = computed(() => {
    const name = this.currentUser()?.name ?? '';
    return name.charAt(0).toUpperCase() || '·';
  });

  protected readonly userFirstName = computed(() => {
    const name = this.currentUser()?.name ?? '';
    return name.split(' ')[0] ?? '';
  });

  protected toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  protected toggleCollapse(): void {
    this.sidebarCollapsed.update((v) => !v);
  }

  protected isAdminPage(): boolean {
    return this.router.url.startsWith('/admin');
  }

  protected logout(): void {
    this.closeSidebar();
    this.authService.logout();
  }

  protected toggleTheme(): void {
    this.theme.toggle();
  }
}
