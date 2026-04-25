import { Injectable, signal } from '@angular/core';

type Theme = 'dark' | 'light';
const STORAGE_KEY = 'dw-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _isDark = signal<boolean>(this.loadInitial() === 'dark');

  get isDark(): () => boolean {
    return this._isDark;
  }

  toggle(): void {
    const next: Theme = this._isDark() ? 'light' : 'dark';
    this._isDark.set(next === 'dark');
    this.apply(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  private loadInitial(): Theme {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === 'light' || stored === 'dark') return stored;
    return 'dark';
  }

  private apply(theme: Theme): void {
    document.documentElement.setAttribute('data-theme', theme);
  }

  init(): void {
    this.apply(this._isDark() ? 'dark' : 'light');
  }
}
