import type { MemberName, ProjectCategory, TeamMember } from './types';

export const TEAM_MEMBERS: TeamMember[] = [
  {
    name: 'Hasan',
    initials: 'HS',
    defaultEmailHint: 'hasan@...',
    accentHex: '#2E74B5',
  },
  {
    name: 'Aathavan',
    initials: 'AA',
    defaultEmailHint: 'aathavan@...',
    accentHex: '#3B828E',
  },
  {
    name: 'Allen',
    initials: 'AL',
    defaultEmailHint: 'allen@...',
    accentHex: '#4D8B6F',
  },
  {
    name: 'Harsath',
    initials: 'HR',
    defaultEmailHint: 'harsath@...',
    accentHex: '#C86D44',
  },
];

export function getMemberColor(name: MemberName): string {
  return TEAM_MEMBERS.find((m) => m.name === name)?.accentHex ?? '#2E74B5';
}

export const MEMBER_NAMES: MemberName[] = ['Hasan', 'Aathavan', 'Allen', 'Harsath'];

export const PROJECT_CATEGORIES: ProjectCategory[] = [
  'ERP',
  'POS',
  'SaaS',
  'Hardware',
  'Other',
];

export const JOURNAL_TAGS = [
  'ERP',
  'POS',
  'SaaS',
  'Hardware',
  'Sales',
  'Architecture',
  'Client Ops',
  'Finance',
];

export function formatInr(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(safe);
}

export function formatDateShort(isoOrDate: string): string {
  if (!isoOrDate) return 'No date';
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return isoOrDate;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function getDeadlineUrgency(dateStr: string): {
  label: string;
  tone: 'overdue' | 'today' | 'soon' | 'upcoming' | 'none';
  daysLeft: number | null;
} {
  if (!dateStr) return { label: 'No deadline', tone: 'none', daysLeft: null };
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) {
    return { label: dateStr, tone: 'none', daysLeft: null };
  }
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const diffDays = Math.round((targetStart - todayStart) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: `${Math.abs(diffDays)}d overdue`, tone: 'overdue', daysLeft: diffDays };
  }
  if (diffDays === 0) {
    return { label: 'Due today', tone: 'today', daysLeft: 0 };
  }
  if (diffDays <= 7) {
    return { label: `${diffDays}d left`, tone: 'soon', daysLeft: diffDays };
  }
  return { label: `${diffDays}d left`, tone: 'upcoming', daysLeft: diffDays };
}

export function getMemberInitials(name: MemberName): string {
  return TEAM_MEMBERS.find((m) => m.name === name)?.initials ?? name.slice(0, 2).toUpperCase();
}
