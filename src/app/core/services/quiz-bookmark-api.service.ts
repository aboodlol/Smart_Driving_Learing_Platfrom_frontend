import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  QuizBookmark,
  QuizBookmarkToggleRequest,
  QuizBookmarkToggleResponse,
} from '../models/quiz-bookmark.models';

@Injectable({
  providedIn: 'root',
})
export class QuizBookmarkApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.backendUrl || ''}/api/quiz-bookmarks`;

  listForChapter(chapterRef: string): Observable<QuizBookmark[]> {
    return this.http
      .get<QuizBookmark[]>(`${this.baseUrl}/${encodeURIComponent(chapterRef)}`)
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  toggle(payload: QuizBookmarkToggleRequest): Observable<QuizBookmarkToggleResponse> {
    return this.http
      .post<QuizBookmarkToggleResponse>(`${this.baseUrl}/toggle`, payload)
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  removeById(id: string): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(`${this.baseUrl}/${id}`)
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
