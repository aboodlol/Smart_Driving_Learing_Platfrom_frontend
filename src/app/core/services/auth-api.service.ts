import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
} from '../models/auth.models';

@Injectable({
  providedIn: 'root',
})
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.backendUrl || '';
  private readonly authBaseUrl = `${this.baseUrl}/api/auth`;

  login(payload: LoginRequest): Observable<AuthResponse> {
    const normalizedPayload: LoginRequest = {
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
    };

    return this.http
      .post<AuthResponse>(`${this.authBaseUrl}/login`, normalizedPayload)
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  register(payload: RegisterRequest): Observable<AuthResponse> {
    const normalizedPayload: RegisterRequest = {
      name: payload.name.trim(),
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
    };

    return this.http
      .post<AuthResponse>(`${this.authBaseUrl}/register`, normalizedPayload)
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  private mapApiError(error: HttpErrorResponse): Observable<never> {
    if (error.error && typeof error.error === 'object' && 'message' in error.error) {
      const serverMessage = String((error.error as { message: unknown }).message);
      return throwError(() => new Error(serverMessage));
    }

    if (error.status === 0) {
      return throwError(
        () => new Error('Cannot connect to backend.'),
      );
    }

    return throwError(() => new Error('Request failed. Please try again.'));
  }
}
