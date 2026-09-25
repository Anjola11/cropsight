export interface ClassColor {
  stroke: string;
  fill: string;
  badgeBg: string;
  badgeText: string;
  dotBg: string;
}

const CLASS_COLOR_MAP: Record<string, ClassColor> = {
  maize: {
    stroke: '#10b981', // emerald-500
    fill: 'rgba(16, 185, 129, 0.25)',
    badgeBg: 'bg-emerald-500/15 dark:bg-emerald-500/20',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    dotBg: 'bg-emerald-500',
  },
  broweed: {
    stroke: '#f59e0b', // amber-500
    fill: 'rgba(245, 158, 11, 0.25)',
    badgeBg: 'bg-amber-500/15 dark:bg-amber-500/20',
    badgeText: 'text-amber-700 dark:text-amber-300',
    dotBg: 'bg-amber-500',
  },
  narweed: {
    stroke: '#8b5cf6', // purple-500
    fill: 'rgba(139, 92, 246, 0.25)',
    badgeBg: 'bg-purple-500/15 dark:bg-purple-500/20',
    badgeText: 'text-purple-700 dark:text-purple-300',
    dotBg: 'bg-purple-500',
  },
  weed: {
    stroke: '#ef4444', // red-500
    fill: 'rgba(239, 68, 68, 0.25)',
    badgeBg: 'bg-red-500/15 dark:bg-red-500/20',
    badgeText: 'text-red-700 dark:text-red-300',
    dotBg: 'bg-red-500',
  },
  sugarbeet: {
    stroke: '#d946ef', // fuchsia-500
    fill: 'rgba(217, 70, 239, 0.25)',
    badgeBg: 'bg-fuchsia-500/15 dark:bg-fuchsia-500/20',
    badgeText: 'text-fuchsia-700 dark:text-fuchsia-300',
    dotBg: 'bg-fuchsia-500',
  },
  soy: {
    stroke: '#84cc16', // lime-500
    fill: 'rgba(132, 204, 22, 0.25)',
    badgeBg: 'bg-lime-500/15 dark:bg-lime-500/20',
    badgeText: 'text-lime-700 dark:text-lime-300',
    dotBg: 'bg-lime-500',
  },
  sunflower: {
    stroke: '#eab308', // yellow-500
    fill: 'rgba(234, 179, 8, 0.25)',
    badgeBg: 'bg-yellow-500/15 dark:bg-yellow-500/20',
    badgeText: 'text-yellow-700 dark:text-yellow-300',
    dotBg: 'bg-yellow-500',
  },
  potato: {
    stroke: '#14b8a6', // teal-500
    fill: 'rgba(20, 184, 166, 0.25)',
    badgeBg: 'bg-teal-500/15 dark:bg-teal-500/20',
    badgeText: 'text-teal-700 dark:text-teal-300',
    dotBg: 'bg-teal-500',
  },
  pea: {
    stroke: '#22c55e', // green-500
    fill: 'rgba(34, 197, 94, 0.25)',
    badgeBg: 'bg-green-500/15 dark:bg-green-500/20',
    badgeText: 'text-green-700 dark:text-green-300',
    dotBg: 'bg-green-500',
  },
  bean: {
    stroke: '#0ea5e9', // sky-500
    fill: 'rgba(14, 165, 233, 0.25)',
    badgeBg: 'bg-sky-500/15 dark:bg-sky-500/20',
    badgeText: 'text-sky-700 dark:text-sky-300',
    dotBg: 'bg-sky-500',
  },
  pumpkin: {
    stroke: '#f97316', // orange-500
    fill: 'rgba(249, 115, 22, 0.25)',
    badgeBg: 'bg-orange-500/15 dark:bg-orange-500/20',
    badgeText: 'text-orange-700 dark:text-orange-300',
    dotBg: 'bg-orange-500',
  },
};

const DEFAULT_PALETTE: ClassColor[] = [
  {
    stroke: '#06b6d4', // cyan
    fill: 'rgba(6, 182, 212, 0.25)',
    badgeBg: 'bg-cyan-500/15 dark:bg-cyan-500/20',
    badgeText: 'text-cyan-700 dark:text-cyan-300',
    dotBg: 'bg-cyan-500',
  },
  {
    stroke: '#f43f5e', // rose
    fill: 'rgba(244, 63, 94, 0.25)',
    badgeBg: 'bg-rose-500/15 dark:bg-rose-500/20',
    badgeText: 'text-rose-700 dark:text-rose-300',
    dotBg: 'bg-rose-500',
  },
  {
    stroke: '#3b82f6', // blue
    fill: 'rgba(59, 130, 246, 0.25)',
    badgeBg: 'bg-blue-500/15 dark:bg-blue-500/20',
    badgeText: 'text-blue-700 dark:text-blue-300',
    dotBg: 'bg-blue-500',
  },
];

export function getClassColor(className: string, classId: number = 0): ClassColor {
  const normalized = (className || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (CLASS_COLOR_MAP[normalized]) {
    return CLASS_COLOR_MAP[normalized];
  }
  const idx = Math.abs(classId) % DEFAULT_PALETTE.length;
  return DEFAULT_PALETTE[idx];
}
