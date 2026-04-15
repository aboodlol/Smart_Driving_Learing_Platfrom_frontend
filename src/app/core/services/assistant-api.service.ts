import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ConversationDetail,
  ConversationMessageRequest,
  ConversationSummary,
} from '../models/assistant.models';

@Injectable({
  providedIn: 'root',
})
export class AssistantApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.backendUrl || ''}/api/conversations`;

  getConversations(): Observable<ConversationSummary[]> {
    return this.http
      .get<ConversationSummary[]>(this.baseUrl)
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  getConversationById(id: string): Observable<ConversationDetail> {
    return this.http
      .get<ConversationDetail>(`${this.baseUrl}/${id}`)
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  createConversation(): Observable<ConversationDetail> {
    return this.http
      .post<ConversationDetail>(this.baseUrl, {})
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  sendMessageToConversation(conversationId: string, payload: ConversationMessageRequest): Observable<unknown> {
    const formData = new FormData();
    formData.append('message', payload.message?.trim() ?? '');

    if (payload.image) {
      formData.append('image', payload.image, payload.image.name);
    }
    if (payload.file) {
      formData.append('file', payload.file, payload.file.name);
    }

    return this.http
      .post(`${this.baseUrl}/${conversationId}/messages`, formData)
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  private mapApiError(error: HttpErrorResponse): Observable<never> {
    if (error.error && typeof error.error === 'object' && 'message' in error.error) {
      return throwError(() => new Error(String((error.error as { message: unknown }).message)));
    }
    if (error.status === 413) {
      return throwError(() => new Error('Upload is too large. Please choose a smaller file.'));
    }
    if (error.status === 415) {
      return throwError(() => new Error('Unsupported file type. Please upload an image or PDF file.'));
    }
    if (error.status === 404) {
      return throwError(() => new Error('Conversation not found. Please start a new chat.'));
    }
    if (error.status === 0) {
      return throwError(() => new Error('Cannot connect to backend.'));
    }
    return throwError(() => new Error('Request failed. Please try again.'));
  }
}
