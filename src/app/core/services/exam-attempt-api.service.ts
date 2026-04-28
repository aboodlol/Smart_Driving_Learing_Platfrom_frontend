import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { QuizResult } from '../models/quiz.models';
import { ExamAttempt, ExamAttemptAnswer, ExamAttemptHistoryItem } from '../models/exam-attempt.models';

@Injectable({
  providedIn: 'root',
})
export class ExamAttemptApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.backendUrl || ''}/api/exam-attempts`;

  getExamHistory(): Observable<ExamAttemptHistoryItem[]> {
    return this.http
      .get<unknown>(`${this.baseUrl}/history`)
      .pipe(map((response) => this.normalizeHistoryResponse(response)))
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  getExamAttempt(attemptId: string): Observable<ExamAttempt> {
    return this.http
      .get<unknown>(`${this.baseUrl}/${attemptId}`)
      .pipe(map((response) => this.normalizeAttemptResponse(response)))
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  startExamAttempt(): Observable<ExamAttempt> {
    return this.http
      .post<unknown>(`${this.baseUrl}/start`, {})
      .pipe(map((response) => this.normalizeAttemptResponse(response)))
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  getActiveExamAttempt(): Observable<ExamAttempt | null> {
    return this.http
      .get<unknown>(`${this.baseUrl}/active`)
      .pipe(map((response) => this.normalizeAttemptResponse(response)))
      .pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 404) {
            return of(null);
          }
          return this.mapApiError(error);
        }),
      );
  }

  saveAnswer(attemptId: string, payload: ExamAttemptAnswer): Observable<void> {
    return this.http
      .patch<void>(`${this.baseUrl}/${attemptId}/answer`, payload)
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  submitAttempt(attemptId: string): Observable<QuizResult> {
    return this.http
      .post<unknown>(`${this.baseUrl}/${attemptId}/submit`, {})
      .pipe(map((response) => this.normalizeResultResponse(response)))
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  private normalizeAttemptResponse(response: unknown): ExamAttempt {
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid exam attempt response.');
    }

    const payload = response as {
      attempt?: ExamAttempt;
      data?: ExamAttempt;
      success?: boolean;
    };

    let attempt: ExamAttempt;

    if (payload.attempt) {
      attempt = payload.attempt;
    } else if (payload.data) {
      attempt = payload.data;
    } else {
      attempt = response as ExamAttempt;
    }

    // Normalize: use id as fallback for _id for backends that return id instead of _id
    if (!attempt._id && attempt.id) {
      attempt = { ...attempt, _id: attempt.id };
    }

    return attempt;
  }

  private normalizeHistoryResponse(response: unknown): ExamAttemptHistoryItem[] {
    if (Array.isArray(response)) {
      return response.map((item) => this.normalizeHistoryItem(item));
    }

    if (!response || typeof response !== 'object') {
      return [];
    }

    const payload = response as {
      history?: unknown;
      attempts?: unknown;
      data?: unknown;
      results?: unknown;
    };

    const items =
      (Array.isArray(payload.history) && payload.history) ||
      (Array.isArray(payload.attempts) && payload.attempts) ||
      (Array.isArray(payload.data) && payload.data) ||
      (Array.isArray(payload.results) && payload.results) ||
      [];

    return items.map((item) => this.normalizeHistoryItem(item));
  }

  private normalizeHistoryItem(item: unknown): ExamAttemptHistoryItem {
    if (!item || typeof item !== 'object') {
      return { _id: '' };
    }

    const historyItem = item as ExamAttemptHistoryItem;
    return {
      ...historyItem,
      _id: historyItem._id || historyItem.id || '',
    };
  }

  private normalizeResultResponse(response: unknown): QuizResult {
    if (!response || typeof response !== 'object') {
      return response as QuizResult;
    }

    const payload = response as { data?: QuizResult; result?: QuizResult };
    if (payload.data) {
      return payload.data;
    }

    if (payload.result) {
      return payload.result;
    }

    return response as QuizResult;
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
