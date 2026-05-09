import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { CreateBookmarkPayload, LessonBookmark } from '../models/bookmark.models';

@Injectable({
  providedIn: 'root',
})
export class LessonBookmarkApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.backendUrl || ''}/api/lessons/bookmarks`;

  list(): Observable<LessonBookmark[]> {
    return this.http
      .get<LessonBookmark[]>(this.baseUrl)
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  create(payload: CreateBookmarkPayload): Observable<LessonBookmark> {
    return this.http
      .post<LessonBookmark>(this.baseUrl, payload)
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  removeById(id: string): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(`${this.baseUrl}/${id}`)
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  removeByLocation(chapterId: string, subLessonIndex: number): Observable<{ message: string }> {
    const params = new HttpParams()
      .set('chapterId', chapterId)
      .set('subLessonIndex', subLessonIndex);
    return this.http
      .delete<{ message: string }>(this.baseUrl, { params })
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
