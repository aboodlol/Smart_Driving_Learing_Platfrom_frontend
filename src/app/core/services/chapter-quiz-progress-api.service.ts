import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ChapterQuizAnswer, ChapterQuizProgress } from '../models/chapter-quiz-progress.models';

@Injectable({ providedIn: 'root' })
export class ChapterQuizProgressApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.backendUrl || ''}/api/chapter-quiz-progress`;

  startChapterQuiz(chapterTitle: string): Observable<ChapterQuizProgress | null> {
    return this.http
      .post<unknown>(`${this.baseUrl}/${encodeURIComponent(chapterTitle)}/start`, {})
      .pipe(
        map((response) => this.normalizeProgressResponse(response)),
        catchError(() => of(null)),
      );
  }

  saveAnswer(chapterTitle: string, answer: ChapterQuizAnswer): Observable<void> {
    return this.http
      .patch<void>(`${this.baseUrl}/${encodeURIComponent(chapterTitle)}/answer`, answer)
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  savePosition(chapterTitle: string, currentQuestionIndex: number): Observable<void> {
    return this.http
      .patch<void>(`${this.baseUrl}/${encodeURIComponent(chapterTitle)}/position`, {
        currentQuestionIndex,
      })
      .pipe(catchError(() => of(undefined as unknown as void)));
  }

  private normalizeProgressResponse(response: unknown): ChapterQuizProgress | null {
    if (!response || typeof response !== 'object') {
      return null;
    }

    const payload = response as {
      progress?: ChapterQuizProgress;
      data?: ChapterQuizProgress;
      currentQuestionIndex?: number;
      answers?: ChapterQuizAnswer[];
    };

    if (payload.progress) return payload.progress;
    if (payload.data) return payload.data;
    if ('currentQuestionIndex' in payload || 'answers' in payload) {
      return payload as ChapterQuizProgress;
    }

    return null;
  }

  private mapApiError(error: HttpErrorResponse): Observable<never> {
    if (error.error && typeof error.error === 'object' && 'message' in error.error) {
      throw new Error(String((error.error as { message: unknown }).message));
    }
    if (error.status === 0) {
      throw new Error('Cannot connect to backend.');
    }
    throw new Error('Request failed. Please try again.');
  }
}
