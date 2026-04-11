import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { QuizQuestion, QuizResult, QuizSubmission } from '../models/quiz.models';

@Injectable({
  providedIn: 'root',
})
export class QuizApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.backendUrl || ''}/api/quizzes`;

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
}
