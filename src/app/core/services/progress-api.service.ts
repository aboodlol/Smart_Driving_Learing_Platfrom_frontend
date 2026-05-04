import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { LessonProgressResponse, ProgressSummary } from '../models/progress.models';
import { CompleteSubLessonResponse } from '../models/lesson.models';

@Injectable({
  providedIn: 'root',
})
export class ProgressApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.backendUrl || ''}/api/progress`;

  getProgressSummary(): Observable<ProgressSummary> {
    return this.http
      .get<ProgressSummary>(`${this.baseUrl}/summary`)
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  getLessonProgress(): Observable<LessonProgressResponse> {
    return this.http
      .get<LessonProgressResponse>(`${this.baseUrl}/lessons`)
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  completeLesson(chapterId: string, subLessonIndex: number): Observable<CompleteSubLessonResponse> {
    return this.http
      .post<CompleteSubLessonResponse>(`${this.baseUrl}/lessons/complete`, {
        chapterId,
        subLessonIndex,
      })
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  resetProgress(): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(`${this.baseUrl}/reset`)
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
