import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  ChatMessage,
  ConversationDetail,
  ConversationSummary,
} from '../../../core/models/assistant.models';
import { AssistantApiService } from '../../../core/services/assistant-api.service';
import { I18nService } from '../../../core/services/i18n.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

const LAST_CONVERSATION_STORAGE_KEY = 'drivewise.assistant.lastConversationId';

@Component({
  selector: 'app-assistant-page',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './assistant-page.component.html',
  styleUrl: './assistant-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistantPageComponent implements OnInit {
  private readonly assistantApi = inject(AssistantApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly chatContainer = viewChild<ElementRef<HTMLDivElement>>('chatContainer');
  private readonly imageInput = viewChild<ElementRef<HTMLInputElement>>('imageInput');
  private readonly pdfInput = viewChild<ElementRef<HTMLInputElement>>('pdfInput');
  protected readonly i18n = inject(I18nService);

  protected readonly conversations = signal<ConversationSummary[]>([]);
  protected readonly activeConversationId = signal<string | null>(null);
  protected readonly conversationsLoading = signal(false);
  protected readonly conversationLoading = signal(false);
  protected readonly creatingConversation = signal(false);
  protected readonly sidebarOpen = signal(true);

  protected readonly messages = signal<ChatMessage[]>([]);
  protected readonly inputText = signal('');
  protected readonly loading = signal(false);
  protected readonly selectedImage = signal<File | null>(null);
  protected readonly selectedPdf = signal<File | null>(null);
  protected readonly selectedImagePreviewUrl = signal<string | null>(null);
  protected readonly composerError = signal('');
  protected readonly sidebarError = signal('');
  protected readonly pageError = signal('');
  protected readonly attachMenuOpen = signal(false);

  protected readonly composerDisabled = computed(
    () => this.loading() || this.conversationLoading() || this.creatingConversation(),
  );

  protected readonly canSend = computed(
    () =>
      (this.inputText().trim().length > 0 || Boolean(this.selectedImage()) || Boolean(this.selectedPdf())) &&
      !this.composerDisabled(),
  );

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.revokeImagePreviewUrl();
    });
  }

  ngOnInit(): void {
    this.loadConversations();
  }

  protected createNewConversation(): void {
    if (this.creatingConversation() || this.loading()) return;

    this.creatingConversation.set(true);
    this.sidebarError.set('');
    this.pageError.set('');

    this.assistantApi
      .createConversation()
      .pipe(
        finalize(() => this.creatingConversation.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (conversation) => {
          const mappedConversation = this.mapConversationDetail(conversation);
          this.upsertConversationSummary(mappedConversation);
          this.activeConversationId.set(mappedConversation._id);
          this.persistLastConversationId(mappedConversation._id);
          this.messages.set(mappedConversation.messages);
          this.inputText.set('');
          this.clearComposerError();
          this.clearAttachments();
          this.scrollToBottom();
        },
        error: (error: unknown) => {
          this.sidebarError.set(this.toErrorMessage(error, 'Failed to create a new conversation.'));
        },
      });
  }

  protected deleteConversation(conversationId: string, event: Event): void {
    event.stopPropagation();

    this.assistantApi
      .deleteConversation(conversationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.conversations.update((list) => list.filter((c) => c._id !== conversationId));

          if (this.activeConversationId() === conversationId) {
            const remaining = this.conversations();
            if (remaining.length > 0) {
              this.activeConversationId.set(remaining[0]._id);
              this.persistLastConversationId(remaining[0]._id);
              this.loadConversationById(remaining[0]._id);
            } else {
              this.activeConversationId.set(null);
              this.messages.set([]);
              this.clearPersistedConversationId();
            }
          }
        },
        error: (error: unknown) => {
          this.sidebarError.set(this.toErrorMessage(error, 'Failed to delete conversation.'));
        },
      });
  }

  protected selectConversation(conversationId: string): void {
    if (conversationId === this.activeConversationId()) return;

    const previousConversationId = this.activeConversationId();
    const previousMessages = this.messages();

    this.activeConversationId.set(conversationId);
    this.persistLastConversationId(conversationId);

    this.loadConversationById(conversationId, true, () => {
      this.activeConversationId.set(previousConversationId);
      if (previousConversationId) {
        this.persistLastConversationId(previousConversationId);
      } else {
        this.clearPersistedConversationId();
      }
      this.messages.set(previousMessages);
    });
  }

  protected toggleAttachMenu(): void {
    this.attachMenuOpen.update((v) => !v);
  }

  protected triggerImagePicker(): void {
    if (this.composerDisabled()) return;
    this.attachMenuOpen.set(false);
    this.imageInput()?.nativeElement.click();
  }

  protected triggerPdfPicker(): void {
    if (this.composerDisabled()) return;
    this.attachMenuOpen.set(false);
    this.pdfInput()?.nativeElement.click();
  }

  protected onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (!this.isValidImage(file)) {
      this.setComposerError('Invalid image type. Please select a PNG, JPG, WEBP, GIF, or BMP file.');
      input.value = '';
      return;
    }

    this.clearComposerError();
    this.selectedImage.set(file);
    this.updateImagePreview(file);
  }

  protected onPdfSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (!this.isValidPdf(file)) {
      this.setComposerError('Invalid document type. Please select a PDF file.');
      input.value = '';
      return;
    }

    this.clearComposerError();
    this.selectedPdf.set(file);
  }

  protected removeSelectedImage(): void {
    this.selectedImage.set(null);
    this.revokeImagePreviewUrl();

    const input = this.imageInput()?.nativeElement;
    if (input) {
      input.value = '';
    }
  }

  protected removeSelectedPdf(): void {
    this.selectedPdf.set(null);

    const input = this.pdfInput()?.nativeElement;
    if (input) {
      input.value = '';
    }
  }

  protected sendMessage(): void {
    if (!this.canSend()) return;

    const text = this.inputText().trim();
    const image = this.selectedImage();
    const file = this.selectedPdf();

    if (!text && !image && !file) {
      this.setComposerError('Type a message or attach an image/PDF before sending.');
      return;
    }

    this.clearComposerError();

    const previousMessages = this.messages();
    const optimisticMessage = this.buildOptimisticUserMessage(text, image, file);
    this.messages.set([...previousMessages, optimisticMessage]);
    this.inputText.set('');
    this.clearAttachments();
    this.loading.set(true);

    this.scrollToBottom();

    const conversationId = this.activeConversationId();
    if (conversationId) {
      this.dispatchMessage(conversationId, text, image, file, previousMessages);
      return;
    }

    this.creatingConversation.set(true);
    this.assistantApi
      .createConversation()
      .pipe(
        finalize(() => this.creatingConversation.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (conversation) => {
          const mappedConversation = this.mapConversationDetail(conversation);
          this.upsertConversationSummary(mappedConversation);
          this.activeConversationId.set(mappedConversation._id);
          this.persistLastConversationId(mappedConversation._id);
          this.dispatchMessage(mappedConversation._id, text, image, file, previousMessages);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.messages.set(previousMessages);
          this.handleSendError(error);
        },
      });
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  protected formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  protected toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  protected getConversationTitle(conversation: ConversationSummary): string {
    const title = conversation.title?.trim();
    if (title) {
      return title;
    }

    const firstUserMessage = conversation.messages?.find(
      (message) => message.role === 'user' && message.content.trim().length > 0,
    );
    const fallback = firstUserMessage?.content?.trim();
    if (fallback) {
      return fallback.length > 42 ? `${fallback.slice(0, 42)}...` : fallback;
    }

    return 'New chat';
  }

  protected formatConversationDate(dateValue?: string): string {
    if (!dateValue) {
      return '';
    }

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  protected formatMessageTime(dateValue?: string): string {
    if (!dateValue) {
      return '';
    }

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private dispatchMessage(
    conversationId: string,
    text: string,
    image: File | null,
    file: File | null,
    previousMessages: ChatMessage[],
  ): void {
    this.assistantApi
      .sendMessageToConversation(conversationId, { message: text, image, file })
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.scrollToBottom();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.pageError.set('');
          this.loadConversationById(conversationId, false);
          this.reloadConversationsSilently();
        },
        error: (error: unknown) => {
          this.messages.set(previousMessages);
          this.handleSendError(error);
        },
      });
  }

  private loadConversations(): void {
    this.conversationsLoading.set(true);
    this.sidebarError.set('');

    this.assistantApi
      .getConversations()
      .pipe(
        finalize(() => this.conversationsLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (conversations) => {
          const sortedConversations = this.sortConversations(
            conversations.map((conversation) => this.mapConversationSummary(conversation)),
          );
          this.conversations.set(sortedConversations);

          const initialConversationId = this.resolveInitialConversationId(sortedConversations);
          if (!initialConversationId) {
            this.activeConversationId.set(null);
            this.messages.set([]);
            this.clearPersistedConversationId();
            return;
          }

          this.activeConversationId.set(initialConversationId);
          this.persistLastConversationId(initialConversationId);
          this.loadConversationById(initialConversationId);
        },
        error: (error: unknown) => {
          this.sidebarError.set(this.toErrorMessage(error, 'Failed to load conversations.'));
        },
      });
  }

  private reloadConversationsSilently(): void {
    this.assistantApi
      .getConversations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (conversations) => {
          this.conversations.set(
            this.sortConversations(conversations.map((conversation) => this.mapConversationSummary(conversation))),
          );
        },
        error: () => {
          // Keep current sidebar state if refresh fails.
        },
      });
  }

  private loadConversationById(conversationId: string, showLoader = true, onError?: () => void): void {
    if (showLoader) {
      this.conversationLoading.set(true);
    }
    this.pageError.set('');

    this.assistantApi
      .getConversationById(conversationId)
      .pipe(
        finalize(() => {
          if (showLoader) {
            this.conversationLoading.set(false);
          }
          this.scrollToBottom();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (conversation) => {
          const mappedConversation = this.mapConversationDetail(conversation);
          this.messages.set(mappedConversation.messages);
          this.upsertConversationSummary(mappedConversation);
        },
        error: (error: unknown) => {
          this.pageError.set(this.toErrorMessage(error, 'Failed to load this conversation.'));
          onError?.();
        },
      });
  }

  private mapConversationSummary(conversation: ConversationSummary): ConversationSummary {
    return {
      ...conversation,
      title: conversation.title?.trim(),
      messages: conversation.messages?.map((message) => this.mapMessage(message)),
    };
  }

  private mapConversationDetail(conversation: ConversationDetail): ConversationDetail {
    return {
      ...conversation,
      title: conversation.title?.trim(),
      messages: conversation.messages.map((message) => this.mapMessage(message)),
    };
  }

  private mapMessage(message: ChatMessage): ChatMessage {
    return {
      ...message,
      content: message.content ?? '',
      imageUrl: this.resolveMediaUrl(message.imageUrl),
      fileUrl: this.resolveMediaUrl(message.fileUrl),
    };
  }

  private resolveMediaUrl(rawUrl?: string): string | undefined {
    if (!rawUrl) {
      return undefined;
    }

    const normalized = rawUrl.trim();
    if (!normalized) {
      return undefined;
    }

    if (/^https?:\/\//i.test(normalized)) {
      return normalized;
    }

    const backendUrl = (environment.backendUrl || '').replace(/\/+$/, '');
    if (!backendUrl) {
      return normalized.startsWith('/') ? normalized : `/${normalized}`;
    }

    return normalized.startsWith('/') ? `${backendUrl}${normalized}` : `${backendUrl}/${normalized}`;
  }

  private buildOptimisticUserMessage(text: string, image: File | null, file: File | null): ChatMessage {
    const lines: string[] = [];

    if (text) {
      lines.push(text);
    }
    if (image) {
      lines.push(`[Image attached: ${image.name}]`);
    }
    if (file) {
      lines.push(`[PDF attached: ${file.name}]`);
    }

    return {
      role: 'user',
      content: lines.join('\n'),
      createdAt: new Date().toISOString(),
    };
  }

  private sortConversations(conversations: ConversationSummary[]): ConversationSummary[] {
    return [...conversations].sort((a, b) => this.toTimestamp(b.updatedAt ?? b.createdAt) - this.toTimestamp(a.updatedAt ?? a.createdAt));
  }

  private toTimestamp(dateValue?: string): number {
    if (!dateValue) {
      return 0;
    }
    const timestamp = new Date(dateValue).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  private upsertConversationSummary(conversation: ConversationSummary): void {
    this.conversations.update((conversations) => {
      const filtered = conversations.filter((item) => item._id !== conversation._id);
      return this.sortConversations([conversation, ...filtered]);
    });
  }

  private resolveInitialConversationId(conversations: ConversationSummary[]): string | null {
    const storedConversationId = this.getStoredConversationId();
    if (storedConversationId && conversations.some((conversation) => conversation._id === storedConversationId)) {
      return storedConversationId;
    }

    return conversations[0]?._id ?? null;
  }

  private persistLastConversationId(conversationId: string): void {
    try {
      localStorage.setItem(LAST_CONVERSATION_STORAGE_KEY, conversationId);
    } catch {
      // Ignore storage failures (private browsing / quota).
    }
  }

  private getStoredConversationId(): string | null {
    try {
      return localStorage.getItem(LAST_CONVERSATION_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private clearPersistedConversationId(): void {
    try {
      localStorage.removeItem(LAST_CONVERSATION_STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }
  }

  private handleSendError(error: unknown): void {
    const errorMessage: ChatMessage = {
      role: 'assistant',
      content: this.toErrorMessage(error, "I'm sorry, something went wrong. Please try again."),
      createdAt: new Date().toISOString(),
    };
    this.messages.update((messages) => [...messages, errorMessage]);
  }

  private toErrorMessage(error: unknown, fallbackMessage: string): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return fallbackMessage;
  }

  private updateImagePreview(file: File): void {
    this.revokeImagePreviewUrl();
    this.selectedImagePreviewUrl.set(URL.createObjectURL(file));
  }

  private revokeImagePreviewUrl(): void {
    const existingUrl = this.selectedImagePreviewUrl();
    if (existingUrl) {
      URL.revokeObjectURL(existingUrl);
      this.selectedImagePreviewUrl.set(null);
    }
  }

  private clearAttachments(): void {
    this.removeSelectedImage();
    this.removeSelectedPdf();
  }

  private setComposerError(message: string): void {
    this.composerError.set(message);
  }

  private clearComposerError(): void {
    if (this.composerError()) {
      this.composerError.set('');
    }
  }

  private isValidImage(file: File): boolean {
    return file.type.startsWith('image/');
  }

  private isValidPdf(file: File): boolean {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const container = this.chatContainer()?.nativeElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });
  }
}
