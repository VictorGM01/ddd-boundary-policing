export interface VisitBadge {
  visitId: string;
  billingStatus: 'UNKNOWN' | 'SETTLED';
}

export function badgeLabel(badge: VisitBadge): string {
  return badge.billingStatus === 'SETTLED' ? 'ok' : '-';
}
