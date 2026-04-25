import { Pipe, PipeTransform, inject, ChangeDetectorRef, OnDestroy, effect } from '@angular/core';
import { I18nService } from '../services/i18n.service';

/**
 * Usage in templates:  {{ 'landing.heroTitle' | translate }}
 *
 * The pipe is impure so it re-evaluates whenever the language signal changes.
 * An effect() subscription ensures Angular re-renders dependent views automatically.
 */
@Pipe({
  name: 'translate',
  pure: false,
  standalone: true,
})
export class TranslatePipe implements PipeTransform, OnDestroy {
  private readonly i18n = inject(I18nService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly cleanupEffect: ReturnType<typeof effect>;

  constructor() {
    // Re-mark view dirty when language changes OR when translations finish loading
    this.cleanupEffect = effect(() => {
      this.i18n.currentLang();     // track language switch
      this.i18n.translations();    // track async load completion
      this.cdr.markForCheck();
    });
  }

  transform(key: string): string {
    return this.i18n.t(key);
  }

  ngOnDestroy(): void {
    this.cleanupEffect.destroy();
  }
}
