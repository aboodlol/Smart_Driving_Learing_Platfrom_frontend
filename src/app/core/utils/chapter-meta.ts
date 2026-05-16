import { Type } from '@angular/core';
import {
  LucideAmbulance,
  LucideBookCheck,
  LucideBookmark,
  LucideBookOpen,
  LucideCarFront,
  LucideCheckSquare,
  LucideClipboardList,
  LucideFileText,
  LucideGauge,
  LucideGraduationCap,
  LucideHelpCircle,
  LucideIdCard,
  LucideLightbulb,
  LucideRoute,
  LucideShieldCheck,
  LucideTrafficCone,
  LucideTriangleAlert,
  LucideWrench,
} from '@lucide/angular';

export type AccentKey = 'teal' | 'amber' | 'info' | 'success' | 'error';

export interface ChapterMeta {
  icon: Type<unknown>;
  accent: AccentKey;
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

  if (normalizedTitle.includes('basic driving')) {
    return { icon: LucideCarFront, accent: 'teal' };
  }
  if (normalizedTitle.includes('traffic signs')) {
    return { icon: LucideTrafficCone, accent: 'amber' };
  }
  if (normalizedTitle.includes('right of way') || normalizedTitle.includes('road priorities')) {
    return { icon: LucideRoute, accent: 'info' };
  }
  if (
    normalizedTitle.includes('speed limit') ||
    normalizedTitle.includes('safe distance') ||
    normalizedTitle.includes('safe following')
  ) {
    return { icon: LucideGauge, accent: 'success' };
  }
  if (normalizedTitle.includes('seat belt') || normalizedTitle.includes('passenger')) {
    return { icon: LucideShieldCheck, accent: 'teal' };
  }
  if (normalizedTitle.includes('license') || normalizedTitle.includes('vehicle type')) {
    return { icon: LucideIdCard, accent: 'amber' };
  }
  if (normalizedTitle.includes('alcohol') || normalizedTitle.includes('law')) {
    return { icon: LucideTriangleAlert, accent: 'error' };
  }
  if (normalizedTitle.includes('first aid') || normalizedTitle.includes('emergency')) {
    return { icon: LucideAmbulance, accent: 'info' };
  }
  if (normalizedTitle.includes('maintenance') || normalizedTitle.includes('mechanic')) {
    return { icon: LucideWrench, accent: 'success' };
  }

  return FALLBACK_META[index % FALLBACK_META.length];
}
