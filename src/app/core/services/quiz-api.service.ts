import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { QuizQuestion, QuizResult, QuizSubmission } from '../models/quiz.models';

@Injectable({
  providedIn: 'root',
})
export class QuizApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.backendUrl || ''}/api/quizzes`;

  getAllQuizzes(): Observable<QuizQuestion[]> {
    return this.http
      .get<unknown>(this.baseUrl)
      .pipe(map((response) => this.normalizeQuizListResponse(response)))
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  getQuizzesByChapter(chapterTitle: string): Observable<QuizQuestion[]> {
    return this.http
      .get<QuizQuestion[]>(`${this.baseUrl}/chapter/${encodeURIComponent(chapterTitle)}`)
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  getExamQuestions(): Observable<QuizQuestion[]> {
    return this.http
      .get<QuizQuestion[]>(`${this.baseUrl}/exam`)
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  submitQuiz(submission: QuizSubmission): Observable<QuizResult> {
    return this.http
      .post<QuizResult>(`${this.baseUrl}/submit`, submission)
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

  private normalizeQuizListResponse(response: unknown): QuizQuestion[] {
    if (Array.isArray(response)) {
      return response as QuizQuestion[];
    }

    if (!response || typeof response !== 'object') {
      return [];
    }

    const payload = response as {
      data?: unknown;
      quizzes?: unknown;
    };

    if (Array.isArray(payload.quizzes)) {
      return payload.quizzes as QuizQuestion[];
    }

    if (Array.isArray(payload.data)) {
      return payload.data as QuizQuestion[];
    }

    if (payload.data && typeof payload.data === 'object') {
      const dataPayload = payload.data as { quizzes?: unknown };
      if (Array.isArray(dataPayload.quizzes)) {
        return dataPayload.quizzes as QuizQuestion[];
      }

      const groupedDataQuizzes = this.flattenChapterKeyedPayload(dataPayload);
      if (groupedDataQuizzes.length > 0) {
        return groupedDataQuizzes;
      }
    }

    const groupedQuizzes = this.flattenChapterKeyedPayload(payload as Record<string, unknown>);
    if (groupedQuizzes.length > 0) {
      return groupedQuizzes;
    }

    return [];
  }

  private flattenChapterKeyedPayload(payload: Record<string, unknown>): QuizQuestion[] {
    const quizzes: QuizQuestion[] = [];

    for (const [chapterTitle, value] of Object.entries(payload)) {
      if (!Array.isArray(value)) {
        continue;
      }

      for (const item of value) {
        if (!item || typeof item !== 'object') {
          continue;
        }

        const quiz = item as QuizQuestion;
        quizzes.push({
          ...quiz,
          chapterKey: quiz.chapterKey ?? chapterTitle,
          chapterTitle: quiz.chapterTitle ?? chapterTitle,
        });
      }
    }

    return quizzes;
  }
}
