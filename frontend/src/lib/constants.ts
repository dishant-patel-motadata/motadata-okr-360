import type { RatingLabel, CycleStatus, ReviewerType, Role } from './types';

export const RATING_CONFIG: Record<number, { label: RatingLabel; color: string; bgColor: string }> = {
  4: { label: 'Outstanding Impact', color: 'text-rating-outstanding', bgColor: 'bg-rating-outstanding-bg' },
  3: { label: 'Significant Impact', color: 'text-rating-significant', bgColor: 'bg-rating-significant-bg' },
  2: { label: 'Moderate Impact', color: 'text-rating-moderate', bgColor: 'bg-rating-moderate-bg' },
  1: { label: 'Not Enough Impact', color: 'text-rating-low', bgColor: 'bg-rating-low-bg' },
};

export const RATING_LABELS: RatingLabel[] = [
  'Outstanding Impact',
  'Significant Impact',
  'Moderate Impact',
  'Not Enough Impact',
];

export const LABEL_TO_RATING: Record<RatingLabel, { color: string; bgColor: string; borderColor: string }> = {
  'Outstanding Impact': { color: 'text-rating-outstanding', bgColor: 'bg-rating-outstanding-bg', borderColor: 'border-rating-outstanding' },
  'Significant Impact': { color: 'text-rating-significant', bgColor: 'bg-rating-significant-bg', borderColor: 'border-rating-significant' },
  'Moderate Impact': { color: 'text-rating-moderate', bgColor: 'bg-rating-moderate-bg', borderColor: 'border-rating-moderate' },
  'Not Enough Impact': { color: 'text-rating-low', bgColor: 'bg-rating-low-bg', borderColor: 'border-rating-low' },
};

export const CYCLE_STATUS_CONFIG: Record<CycleStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  ACTIVE: { label: 'Active', className: 'bg-rating-outstanding-bg text-rating-outstanding' },
  CLOSING: { label: 'Closing', className: 'bg-rating-moderate-bg text-rating-moderate' },
  COMPLETED: { label: 'Completed', className: 'bg-rating-significant-bg text-rating-significant' },
  PUBLISHED: { label: 'Published', className: 'bg-purple-100 text-purple-700' },
};

export const REVIEWER_TYPE_LABELS: Record<ReviewerType, string> = {
  MANAGER: 'Manager',
  PEER: 'Peer',
  DIRECT_REPORT: 'Direct Report',
  INDIRECT_REPORT: 'Indirect Report',
  CROSS_FUNCTIONAL: 'Cross-Functional',
  CXO: 'CXO',
};

export const ROLE_LABELS: Record<Role, string> = {
  IC: 'Individual Contributor',
  TM: 'Team Manager',
  HOD: 'Head of Department',
  CXO: 'CXO / HR Admin',
};

export const ROLE_HIERARCHY: Role[] = ['IC', 'TM', 'HOD', 'CXO'];

export function hasRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(requiredRole);
}

export function getLabelForScore(score: number): RatingLabel {
  const rounded = Math.round(score);
  if (rounded >= 4) return 'Outstanding Impact';
  if (rounded >= 3) return 'Significant Impact';
  if (rounded >= 2) return 'Moderate Impact';
  return 'Not Enough Impact';
}
