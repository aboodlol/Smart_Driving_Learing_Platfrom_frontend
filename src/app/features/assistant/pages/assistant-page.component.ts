import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs/operators';
import { ChatMessage } from '../../../core/models/assistant.models';
import { AssistantApiService } from '../../../core/services/assistant-api.service';

@Component({
  selector: 'app-assistant-page',
  imports: [FormsModule, MatProgressSpinnerModule],
  templateUrl: './assistant-page.component.html',
  styleUrl: './assistant-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistantPageComponent {
  private readonly assistantApi = inject(AssistantApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly chatContainer = viewChild<ElementRef<HTMLDivElement>>('chatContainer');

  protected readonly messages = signal<ChatMessage[]>([]);
  protected readonly inputText = signal('');
  protected readonly loading = signal(false);

  protected sendMessage(): void {
    const text = this.inputText().trim();
    if (!text || this.loading()) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    this.messages.update((msgs) => [...msgs, userMessage]);
    this.inputText.set('');
    this.loading.set(true);

    this.scrollToBottom();

    const conversationHistory = this.messages()
      .filter((m) => m !== userMessage)
      .map(({ role, content }) => ({ role, content }));

    this.assistantApi
      .sendMessage({ message: text, conversationHistory })
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.scrollToBottom();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          const assistantMessage: ChatMessage = { role: 'assistant', content: response.reply };
          this.messages.update((msgs) => [...msgs, assistantMessage]);
        },
        error: () => {
          const errorMessage: ChatMessage = {
            role: 'assistant',
            content: "I'm sorry, something went wrong. Please try again.",
          };
          this.messages.update((msgs) => [...msgs, errorMessage]);
        },
      });
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
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
