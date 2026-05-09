import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { I18nService } from '../../../core/services/i18n.service';
import { AuthService } from '../../../core/services/auth.service';
import { matchValidator } from '../../../core/validators/match.validator';

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule],
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject(I18nService);

  protected readonly loading = signal(false);
  protected readonly hidePassword = signal(true);
  protected readonly hideConfirmPassword = signal(true);

  protected readonly lang = computed(() => this.i18n.currentLang());
  protected readonly isAr = computed(() => this.lang() === 'ar');

  protected readonly registerForm = this.formBuilder.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      agree: [true, [Validators.requiredTrue]],
    },
    { validators: matchValidator('password', 'confirmPassword') },
  );

  protected toggleLang(): void {
    this.i18n.toggle();
  }

  protected goBack(): void {
    void this.router.navigateByUrl('/landing');
  }

  protected goToLogin(): void {
    void this.router.navigateByUrl('/login');
  }

  protected submitRegister(): void {
    if (this.registerForm.invalid || this.loading()) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);

    const { name, email, password } = this.registerForm.getRawValue();

    this.authService
      .register({ name, email, password })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((user) => {
        if (user.role === 'admin') {
          void this.router.navigateByUrl('/admin');
        } else {
          void this.router.navigateByUrl('/home');
        }
      });
  }
}
