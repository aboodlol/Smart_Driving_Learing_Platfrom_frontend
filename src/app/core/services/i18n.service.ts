import { HttpClient } from '@angular/common/http';
import {
  Injectable,
  DOCUMENT,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

export type Language = 'en' | 'ar';

const STORAGE_KEY = 'drivewise.language';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);

  /** Currently active language */
  readonly currentLang = signal<Language>(this.resolveInitialLang());

  /** True when Arabic is active */
  readonly isRtl = computed(() => this.currentLang() === 'ar');

  /**
   * Raw translation map — exposed as readonly so pipes can subscribe to it
   * and re-render automatically when translations finish loading.
   */
  private readonly _translations = signal<Record<string, unknown>>({});
  readonly translations = this._translations.asReadonly();

  constructor() {
    // Whenever language changes, load translations and update DOM direction
    effect(() => {
      const lang = this.currentLang();
      this.applyDirection(lang);
      void this.loadTranslations(lang);
    });
  }

  /**
   * Preload translations for the initial language before the app renders.
   * Called via APP_INITIALIZER so the first paint never shows raw keys.
   */
  async preload(): Promise<void> {
    const lang = this.currentLang();
    this.applyDirection(lang);
    await this.loadTranslations(lang);
  }

  /** Switch between languages */
  setLanguage(lang: Language): void {
    this.currentLang.set(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }

  toggle(): void {
    this.setLanguage(this.currentLang() === 'en' ? 'ar' : 'en');
  }

  /**
   * Translate a dot-notation key, e.g. "landing.heroTitle"
   * Returns the key itself as a fallback.
   */
  t(key: string): string {
    const parts = key.split('.');
    let node: unknown = this._translations();
    for (const part of parts) {
      if (node && typeof node === 'object' && part in (node as object)) {
        node = (node as Record<string, unknown>)[part];
      } else {
        return key; // fallback to the key
      }
    }
    return typeof node === 'string' ? node : key;
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private resolveInitialLang(): Language {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'ar' || stored === 'en') return stored;

    const browserLang = navigator.language?.split('-')[0];
    return browserLang === 'ar' ? 'ar' : 'en';
  }

  private async loadTranslations(lang: Language): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.http.get<Record<string, unknown>>(`/i18n/${lang}.json`),
      );
      this._translations.set(data);
    } catch {
      // If translation file fails to load, translations stay at last value
      console.warn(`[I18n] Failed to load translations for "${lang}"`);
    }
  }

  private applyDirection(lang: Language): void {
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    this.document.documentElement.setAttribute('dir', dir);
    this.document.documentElement.setAttribute('lang', lang);
  }
}
