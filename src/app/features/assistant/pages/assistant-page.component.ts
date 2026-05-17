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
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  ChatMessage,
  ConversationDetail,
  ConversationSummary,
  QUIZ_CONTEXT_NAV_KEY,
  QuizQuestionContext,
} from '../../../core/models/assistant.models';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { AssistantApiService } from '../../../core/services/assistant-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { I18nService } from '../../../core/services/i18n.service';

const LAST_CONVERSATION_STORAGE_KEY = 'drivewise.assistant.lastConversationId';

@Component({
  selector: 'app-assistant-page',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './assistant-page.component.html',
  styleUrl: './assistant-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.dw-ai-ready]': 'transitionsReady()',
  },
})
export class AssistantPageComponent implements OnInit {
  private readonly assistantApi = inject(AssistantApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly chatContainer = viewChild<ElementRef<HTMLDivElement>>('chatContainer');
  private readonly imageInput = viewChild<ElementRef<HTMLInputElement>>('imageInput');
  private readonly pdfInput = viewChild<ElementRef<HTMLInputElement>>('pdfInput');
  protected readonly i18n = inject(I18nService);
  protected readonly userInitial = computed(() => {
    const name = this.auth.currentUser()?.name ?? '';
    return name.trim().charAt(0).toUpperCase() || 'U';
  });

  protected readonly conversations = signal<ConversationSummary[]>([]);
  protected readonly activeConversationId = signal<string | null>(null);
  protected readonly conversationsLoading = signal(false);
  protected readonly conversationLoading = signal(false);
  protected readonly creatingConversation = signal(false);
  protected readonly sidebarOpen = signal(false);
  protected readonly transitionsReady = signal(false);

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
      (this.inputText().trim().length > 0 ||
        Boolean(this.selectedImage()) ||
        Boolean(this.selectedPdf())) &&
      !this.composerDisabled(),
  );

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.revokeImagePreviewUrl();
    });
  }

  ngOnInit(): void {
    const quizContext = this.readQuizContextFromHistory();
    if (quizContext) {
      this.bootstrapWithQuizContext(quizContext);
    } else {
      this.loadConversations();
    }
    // Defer enabling drawer transitions until after the initial paint, so the
    // closed-state transform doesn't animate from `none` on mount.
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => this.transitionsReady.set(true));
      });
    } else {
      this.transitionsReady.set(true);
    }
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
      this.setComposerError(
        'Invalid image type. Please select a PNG, JPG, WEBP, GIF, or BMP file.',
      );
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
    imageUrl: string | null = null,
  ): void {
    this.assistantApi
      .sendMessageToConversation(conversationId, { message: text, image, file, imageUrl })
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
            this.sortConversations(
              conversations.map((conversation) => this.mapConversationSummary(conversation)),
            ),
          );
        },
        error: () => {
          // Keep current sidebar state if refresh fails.
        },
      });
  }

  private loadConversationById(
    conversationId: string,
    showLoader = true,
    onError?: () => void,
  ): void {
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

    return normalized.startsWith('/')
      ? `${backendUrl}${normalized}`
      : `${backendUrl}/${normalized}`;
  }

  private buildOptimisticUserMessage(
    text: string,
    image: File | null,
    file: File | null,
  ): ChatMessage {
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
    return [...conversations].sort(
      (a, b) =>
        this.toTimestamp(b.updatedAt ?? b.createdAt) - this.toTimestamp(a.updatedAt ?? a.createdAt),
    );
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
    if (
      storedConversationId &&
      conversations.some((conversation) => conversation._id === storedConversationId)
    ) {
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

  private readQuizContextFromHistory(): QuizQuestionContext | null {
    const navState =
      this.router.getCurrentNavigation()?.extras?.state ??
      (typeof history !== 'undefined' ? history.state : null);
    const candidate = navState?.[QUIZ_CONTEXT_NAV_KEY];
    if (!candidate || typeof candidate !== 'object') {
      return null;
    }

    const ctx = candidate as Partial<QuizQuestionContext>;
    if (!ctx.questionText && !ctx.questionTextAR) {
      return null;
    }

    const imageUrl = typeof ctx.image === 'string' ? ctx.image.trim() : '';
    return {
      questionText: String(ctx.questionText ?? ''),
      questionTextAR: String(ctx.questionTextAR ?? ''),
      selectedAnswer: String(ctx.selectedAnswer ?? ''),
      selectedAnswerAR: String(ctx.selectedAnswerAR ?? ''),
      correctAnswer: String(ctx.correctAnswer ?? ''),
      correctAnswerAR: String(ctx.correctAnswerAR ?? ''),
      explanation: String(ctx.explanation ?? ''),
      explanationAR: String(ctx.explanationAR ?? ''),
      chapterTitle: String(ctx.chapterTitle ?? ''),
      chapterTitleAR: String(ctx.chapterTitleAR ?? ''),
      chapterKey: String(ctx.chapterKey ?? ''),
      isCorrect: Boolean(ctx.isCorrect),
      ...(imageUrl ? { image: imageUrl } : {}),
    };
  }

  private bootstrapWithQuizContext(context: QuizQuestionContext): void {
    this.clearQuizContextFromHistory();
    this.creatingConversation.set(true);
    this.sidebarError.set('');
    this.pageError.set('');

    this.assistantApi
      .getConversations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (conversations) => {
          this.conversations.set(
            this.sortConversations(conversations.map((c) => this.mapConversationSummary(c))),
          );
        },
        error: () => {
          // Sidebar list is best-effort; failure shouldn't block the new chat.
        },
      });

    const imageUrl = context.image?.trim() || '';
    const imagePromise: Promise<{ file: File | null; failureReason: string | null }> = imageUrl
      ? this.fetchImageAsFile(imageUrl)
      : Promise.resolve({ file: null, failureReason: null });

    this.assistantApi
      .createConversation()
      .pipe(
        finalize(() => this.creatingConversation.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (conversation) => {
          const mapped = this.mapConversationDetail(conversation);
          this.upsertConversationSummary(mapped);
          this.activeConversationId.set(mapped._id);
          this.persistLastConversationId(mapped._id);
          this.messages.set(mapped.messages);

          imagePromise.then(({ file: imageFile, failureReason }) => {
            if (imageUrl && !imageFile) {
              console.warn(
                '[AssistantQuizContext] Failed to fetch quiz image as a File. Falling back to imageUrl-only flow.',
                { imageUrl, reason: failureReason },
              );
            }

            const prompt = this.buildQuizContextPrompt(context, {
              fileAttached: !!imageFile,
              imageUrl,
            });
            const previousMessages = this.messages();
            const optimistic = this.buildOptimisticUserMessage(prompt, imageFile, null);
            if (imageUrl) {
              optimistic.imageUrl = imageUrl;
            }
            this.messages.set([...previousMessages, optimistic]);
            this.loading.set(true);
            this.scrollToBottom();
            this.dispatchMessage(
              mapped._id,
              prompt,
              imageFile,
              null,
              previousMessages,
              imageUrl || null,
            );
          });
        },
        error: (error: unknown) => {
          this.pageError.set(
            this.toErrorMessage(error, 'Failed to start a chat for the quiz question.'),
          );
          this.loadConversations();
        },
      });
  }

  private async fetchImageAsFile(
    url: string,
  ): Promise<{ file: File | null; failureReason: string | null }> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return { file: null, failureReason: `HTTP ${response.status} ${response.statusText}` };
      }
      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) {
        return { file: null, failureReason: `Unexpected MIME type: ${blob.type || 'unknown'}` };
      }
      const fileName = this.deriveImageFileName(url, blob.type);
      return { file: new File([blob], fileName, { type: blob.type }), failureReason: null };
    } catch (err) {
      const reason = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      return { file: null, failureReason: reason };
    }
  }

  private deriveImageFileName(url: string, mimeType: string): string {
    const fallbackExt = mimeType.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'png';
    try {
      const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
      const parsed = new URL(url, base);
      const last = parsed.pathname.split('/').filter(Boolean).pop();
      if (last && last.includes('.')) return last;
      if (last) return `${last}.${fallbackExt}`;
    } catch {
      // fall through
    }
    return `quiz-image.${fallbackExt}`;
  }

  private buildQuizContextPrompt(
    context: QuizQuestionContext,
    options: { fileAttached: boolean; imageUrl: string } = { fileAttached: false, imageUrl: '' },
  ): string {
    const isArabic = this.i18n.currentLang() === 'ar';

    const questionText =
      (isArabic ? context.questionTextAR : context.questionText) ||
      context.questionText ||
      context.questionTextAR;
    const selectedAnswer =
      (isArabic ? context.selectedAnswerAR : context.selectedAnswer) ||
      context.selectedAnswer ||
      context.selectedAnswerAR;
    const correctAnswer =
      (isArabic ? context.correctAnswerAR : context.correctAnswer) ||
      context.correctAnswer ||
      context.correctAnswerAR;
    const explanation =
      (isArabic ? context.explanationAR : context.explanation) ||
      context.explanation ||
      context.explanationAR;
    const chapterTitle =
      (isArabic ? context.chapterTitleAR : context.chapterTitle) ||
      context.chapterTitle ||
      context.chapterTitleAR ||
      context.chapterKey;

    const hasImage = options.fileAttached || !!options.imageUrl;
    const fileAttached = options.fileAttached;
    const imageUrl = options.imageUrl;

    if (isArabic) {
      const lines = ['هل يمكنك شرح سؤال اختبار القيادة هذا بمزيد من التفصيل؟', ''];
      if (chapterTitle) lines.push(`الفصل: ${chapterTitle}`);
      lines.push(`السؤال: ${questionText}`);
      if (selectedAnswer) lines.push(`إجابتي: ${selectedAnswer}`);
      if (correctAnswer) lines.push(`الإجابة الصحيحة: ${correctAnswer}`);
      lines.push(`النتيجة: ${context.isCorrect ? 'إجابة صحيحة' : 'إجابة خاطئة'}`);
      if (explanation) lines.push(`الشرح المتاح: ${explanation}`);
      if (hasImage) {
        if (fileAttached) {
          lines.push('السؤال مرفق بصورة — يرجى الاستعانة بالصورة أيضاً عند الشرح.');
        } else if (imageUrl) {
          lines.push(`السؤال يحتوي على صورة. الرابط: ${imageUrl}`);
          lines.push('يرجى تحليل الصورة عبر الرابط ودمجها في الشرح.');
        }
      }
      lines.push('');
      lines.push(
        'من فضلك اشرح لي السؤال بطريقة أوضح، ولماذا الإجابة الصحيحة صحيحة، وما الفكرة التي يجب أن أتذكرها لاحقاً.',
      );
      return lines.join('\n');
    }

    const lines = ['Please explain this driving quiz question in more detail.', ''];
    if (chapterTitle) lines.push(`Chapter: ${chapterTitle}`);
    lines.push(`Question: ${questionText}`);
    if (selectedAnswer) lines.push(`My answer: ${selectedAnswer}`);
    if (correctAnswer) lines.push(`Correct answer: ${correctAnswer}`);
    lines.push(`Result: ${context.isCorrect ? 'I answered correctly' : 'I answered incorrectly'}`);
    if (explanation) lines.push(`Existing explanation: ${explanation}`);
    if (hasImage) {
      if (fileAttached) {
        lines.push('An image is attached to this question — please use it when explaining.');
      } else if (imageUrl) {
        lines.push(`This question has an image. URL: ${imageUrl}`);
        lines.push('Please analyse the image at that URL and use it in your explanation.');
      }
    }
    lines.push('');
    lines.push(
      'Can you walk me through this question in a clearer way, explain why the correct answer is right, and give me one tip to remember it next time?',
    );
    return lines.join('\n');
  }

  private clearQuizContextFromHistory(): void {
    if (typeof history === 'undefined' || !history.state) return;
    try {
      const next: Record<string, unknown> = { ...(history.state as Record<string, unknown>) };
      delete next[QUIZ_CONTEXT_NAV_KEY];
      history.replaceState(next, '');
    } catch {
      // Ignore — clearing is best-effort.
    }
  }
}
