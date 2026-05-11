import { Injectable, signal } from '@angular/core';

/**
 * Tracks whether the user is currently inside an active exam attempt. While locked
 * the sidebar links are hidden in the shell and a global router guard redirects
 * any non-exam navigation back to /exam/session. Lock state is in-memory only so
 * an unexpected browser close does not permanently trap the user; the lock is
 * re-applied when the user explicitly resumes the previous attempt.
 */
@Injectable({ providedIn: 'root' })
export class ExamLockService {
  private readonly _locked = signal(false);
  readonly locked = this._locked.asReadonly();

  lock(): void {
    if (!this._locked()) this._locked.set(true);
  }

  unlock(): void {
    if (this._locked()) this._locked.set(false);
  }
}
