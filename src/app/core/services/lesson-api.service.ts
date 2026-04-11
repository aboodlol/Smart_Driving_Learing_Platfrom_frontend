import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Chapter, CompleteSubLessonResponse } from '../models/lesson.models';

@Injectable({
  providedIn: 'root',
})
export class LessonApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.backendUrl || ''}/api/lessons`;

  getLessons(): Observable<Chapter[]> {
    return this.http
      .get<Chapter[]>(this.baseUrl)
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  getLesson(id: string): Observable<Chapter> {
    return this.http
      .get<Chapter>(`${this.baseUrl}/${id}`)
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  completeSubLesson(id: string, subLessonTitle: string): Observable<CompleteSubLessonResponse> {
    return this.http
      .post<CompleteSubLessonResponse>(`${this.baseUrl}/${id}/complete`, { subLessonTitle })
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
