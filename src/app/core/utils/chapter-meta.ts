import { Type } from '@angular/core';
import {
  LucideAmbulance,
  LucideBookCheck,
  LucideBookmark,
  LucideBookOpen,
  LucideCheckSquare,
  LucideClipboardList,
  LucideFileText,
  LucideGavel,
  LucideGraduationCap,
  LucideHelpCircle,
  LucideIdCard,
  LucideLightbulb,
  LucidePlayCircle,
  LucideRoute,
  LucideTrafficCone,
  LucideTriangleAlert,
  LucideUser,
  LucideWrench,
} from '@lucide/angular';

export type AccentKey = 'teal' | 'amber' | 'info' | 'success' | 'error';

export interface ChapterMeta {
  icon: Type<unknown>;
  accent: AccentKey;
}

// Canonical chapter order used on the quizzes page (cards + displayed numbering).
// Match against the English chapter title, lowercased and whitespace-collapsed.
export const CHAPTER_ORDER: readonly string[] = [
  'traffic rules and priorities',
  'traffic signs',
  'road lines and ground markings',
  'driver behavior',
  'jordanian traffic law',
  'traffic violations',
  'first aid',
  'car mechanics',
  'fifth and sixth license categories',
  'animated questions',
];

export function getChapterOrder(title: string): number {
  if (!title) return CHAPTER_ORDER.length;
  const normalized = title.trim().toLowerCase().replace(/\s+/g, ' ');
  const idx = CHAPTER_ORDER.indexOf(normalized);
  return idx === -1 ? CHAPTER_ORDER.length : idx;
}

export const FALLBACK_META: ChapterMeta[] = [
  { icon: LucideBookOpen, accent: 'teal' },
  { icon: LucideGraduationCap, accent: 'amber' },
  { icon: LucideFileText, accent: 'info' },
  { icon: LucideClipboardList, accent: 'success' },
  { icon: LucideBookCheck, accent: 'teal' },
  { icon: LucideBookmark, accent: 'amber' },
  { icon: LucideHelpCircle, accent: 'error' },
  { icon: LucideLightbulb, accent: 'info' },
  { icon: LucideCheckSquare, accent: 'success' },
];

export function getChapterMeta(title: string, index: number): ChapterMeta {
  if (!title) {
    return FALLBACK_META[index % FALLBACK_META.length];
  }

  const normalizedTitle = title.trim().toLowerCase().replace(/\s+/g, ' ');

  if (normalizedTitle.includes('traffic signs')) {
    return { icon: LucideTrafficCone, accent: 'amber' };
  }
  if (
    normalizedTitle.includes('right of way') ||
    normalizedTitle.includes('road priorities') ||
    normalizedTitle.includes('traffic rules and priorities')
  ) {
    return { icon: LucideRoute, accent: 'info' };
  }
  if (normalizedTitle.includes('jordanian traffic law')) {
    return { icon: LucideGavel, accent: 'error' };
  }
  if (normalizedTitle.includes('road lines') || normalizedTitle.includes('ground markings')) {
    return { icon: LucideRoute, accent: 'success' };
  }
  if (normalizedTitle.includes('driver behavior')) {
    return { icon: LucideUser, accent: 'teal' };
  }
  if (normalizedTitle.includes('first aid') || normalizedTitle.includes('emergency')) {
    return { icon: LucideAmbulance, accent: 'info' };
  }
  if (
    normalizedTitle.includes('car mechanics') ||
    normalizedTitle.includes('maintenance') ||
    normalizedTitle.includes('mechanic')
  ) {
    return { icon: LucideWrench, accent: 'success' };
  }
  if (normalizedTitle.includes('traffic violations')) {
    return { icon: LucideTriangleAlert, accent: 'error' };
  }
  if (
    normalizedTitle.includes('license categor') ||
    normalizedTitle.includes('fifth and sixth') ||
    normalizedTitle.includes('license category')
  ) {
    return { icon: LucideIdCard, accent: 'amber' };
  }
  if (normalizedTitle.includes('animated questions')) {
    return { icon: LucidePlayCircle, accent: 'teal' };
  }

  return FALLBACK_META[index % FALLBACK_META.length];
}
