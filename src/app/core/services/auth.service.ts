import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import {
  AuthResponse,
  AuthUser,
  LoginRequest,
  RegisterRequest,
} from '../models/auth.models';
import { AuthApiService } from './auth-api.service';
import { ToastService } from './toast.service';

const SESSION_STORAGE_KEY = 'driveready-auth-user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly api = inject(AuthApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  private readonly authUserState = signal<AuthUser | null>(this.restoreSession());

  readonly currentUser = computed(() => this.authUserState());
  readonly isAuthenticated = computed(() => this.authUserState() !== null);

  login(payload: LoginRequest): Observable<AuthUser> {
    return this.api.login(payload).pipe(
      tap((response) => {
        this.persistSession(response);
        this.toast.success('Login successful. Welcome back!');
      }),
      map((response) => this.mapResponseToUser(response)),
      catchError((error: Error) => {
        this.toast.error(error.message || 'Login failed.');
        return throwError(() => error);
      }),
    );
  }

  register(payload: RegisterRequest): Observable<AuthUser> {
    return this.api.register(payload).pipe(
      tap((response) => {
        this.persistSession(response);
        this.toast.success('Registration successful. Account created.');
      }),
      map((response) => this.mapResponseToUser(response)),
      catchError((error: Error) => {
        this.toast.error(error.message || 'Registration failed.');
        return throwError(() => error);
      }),
    );
  }

  logout(): void {
    this.authUserState.set(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    this.toast.info('Logged out successfully.');
    void this.router.navigateByUrl('/landing');
  }

  private persistSession(response: AuthResponse): void {
    const user = this.mapResponseToUser(response);
    this.authUserState.set(user);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
  }

  private mapResponseToUser(response: AuthResponse): AuthUser {
    return {
      _id: response._id,
      name: response.name,
      email: response.email,
      role: response.role,
      token: response.token,
    };
  }

  private restoreSession(): AuthUser | null {
    const rawUser = localStorage.getItem(SESSION_STORAGE_KEY);

    if (!rawUser) {
      return null;
    }

    try {
      const parsed = JSON.parse(rawUser) as AuthUser;

      if (!parsed._id || !parsed.email || !parsed.token) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }
}
