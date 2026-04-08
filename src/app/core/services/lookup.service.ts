import { Injectable, computed, signal } from '@angular/core';

export interface LookupItem {
  key: string;
  label: string;
}

@Injectable({
  providedIn: 'root',
})
export class LookupService {
  private readonly lessonTypesState = signal<LookupItem[]>([
    { key: 'rules', label: 'Road Rules' },
    { key: 'signs', label: 'Traffic Signs' },
    { key: 'safety', label: 'Safe Driving' },
  ]);

  private readonly supportChannelsState = signal<LookupItem[]>([
    { key: 'assistant', label: 'AI Assistant' },
    { key: 'email', label: 'Email Support' },
    { key: 'live', label: 'Live Workshop' },
  ]);

  readonly lessonTypes = computed(() => this.lessonTypesState());
  readonly supportChannels = computed(() => this.supportChannelsState());
}
