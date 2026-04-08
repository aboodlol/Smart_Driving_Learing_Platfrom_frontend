export interface HomeAction {
  title: string;
  description: string;
  buttonLabel: string;
  route: string;
}

export interface ProgressItem {
  label: string;
  value: number;
  ctaLabel: string;
}

export interface HomeOverview {
  title: string;
  subtitle: string;
  actions: HomeAction[];
  progress: ProgressItem[];
}
