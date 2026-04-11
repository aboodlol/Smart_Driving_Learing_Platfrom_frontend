import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatSnackBarModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  host: {
    '(window:scroll)': 'onWindowScroll()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly authService = inject(AuthService);
  private lastScrollY = 0;

  protected readonly title = 'DriveReady';
  protected readonly currentUser = this.authService.currentUser;
  protected readonly isAuthenticated = this.authService.isAuthenticated;
  protected readonly mobileMenuOpen = signal(false);
  protected readonly headerHidden = signal(false);

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen.update((value) => !value);
  }

  protected closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  protected onWindowScroll(): void {
    const currentScrollY = Math.max(window.scrollY || 0, 0);

    if (currentScrollY <= 12) {
      this.headerHidden.set(false);
      this.lastScrollY = currentScrollY;
      return;
    }

    if (this.mobileMenuOpen()) {
      this.headerHidden.set(false);
      this.lastScrollY = currentScrollY;
      return;
    }

    const delta = currentScrollY - this.lastScrollY;

    if (delta > 6) {
      this.headerHidden.set(true);
    } else if (delta < -6) {
      this.headerHidden.set(false);
    }

    this.lastScrollY = currentScrollY;
  }

  protected logout(): void {
    this.closeMobileMenu();
    this.authService.logout();
  }
}
