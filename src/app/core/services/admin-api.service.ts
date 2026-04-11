import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  AdminDocument,
  AdminUser,
  ChapterReport,
  DashboardStats,
  RecentActivity,
  UpdateUserPayload,
} from '../models/admin.models';

@Injectable({
  providedIn: 'root',
})
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.backendUrl || ''}/api/admin`;

  // ── Users ──────────────────────────────────────────
  getUsers(): Observable<AdminUser[]> {
    return this.http
      .get<AdminUser[]>(`${this.baseUrl}/users`)
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  updateUser(id: string, payload: UpdateUserPayload): Observable<AdminUser> {
    return this.http
      .put<AdminUser>(`${this.baseUrl}/users/${id}`, payload)
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  deleteUser(id: string): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(`${this.baseUrl}/users/${id}`)
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  // ── Documents ──────────────────────────────────────
  getDocuments(): Observable<AdminDocument[]> {
    return this.http
      .get<AdminDocument[]>(`${this.baseUrl}/documents`)
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  uploadDocument(file: File): Observable<AdminDocument> {
    const formData = new FormData();
    formData.append('document', file);
    return this.http
      .post<AdminDocument>(`${this.baseUrl}/documents`, formData)
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  deleteDocument(id: string): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(`${this.baseUrl}/documents/${id}`)
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  // ── Dashboard ──────────────────────────────────────
  getDashboardStats(): Observable<DashboardStats> {
    return this.http
      .get<DashboardStats>(`${this.baseUrl}/dashboard/stats`)
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  getChapterReports(): Observable<ChapterReport[]> {
    return this.http
      .get<ChapterReport[]>(`${this.baseUrl}/dashboard/chapters`)
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  getRecentActivity(): Observable<RecentActivity[]> {
    return this.http
      .get<RecentActivity[]>(`${this.baseUrl}/dashboard/activity`)
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  private mapApiError(error: HttpErrorResponse): Observable<never> {
    if (error.error && typeof error.error === 'object' && 'message' in error.error) {
      return throwError(() => new Error(String((error.error as { message: unknown }).message)));
    }
    if (error.status === 0) {
      return throwError(() => new Error('Cannot connect to backend.'));
    }
    return throwError(() => new Error('Request failed. Please try again.'));
  }
}
