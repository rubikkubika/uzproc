import { Approval, ApprovalStatusColor } from './types';
import { REDESIGN_COLORS, REDESIGN_MONO, dotColor } from './utils';
import { CheckDot, PendingDot } from './RedesignPrimitives';

interface ApprovalGroupProps {
  title: string;
  hint?: string;
  approvals: Approval[];
  formatDate: (d: string | null) => string;
  calculateDays: (assigned: string | null, completed: string | null, daysInWork: number | null) => string;
  getApprovalStatusColor: (a: { completionResult: string | null; completionDate: string | null; assignmentDate: string | null }) => ApprovalStatusColor;
}

/** Группа согласований (заголовок + строки: кружок · роль · дата · дни). */
export function ApprovalGroup({ title, hint, approvals, formatDate, calculateDays, getApprovalStatusColor }: ApprovalGroupProps) {
  if (approvals.length === 0) return null;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: REDESIGN_COLORS.textMuted }}>{title}</span>
        {hint && <span style={{ fontSize: 11, color: REDESIGN_COLORS.textWeak }}>{hint}</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {approvals.map((a) => {
          const status = getApprovalStatusColor(a);
          const done = status === 'green' || status === 'orange' || a.completionDate != null;
          return (
            <div
              key={a.id}
              style={{ display: 'grid', gridTemplateColumns: '20px 1fr auto auto', gap: 10, alignItems: 'center', padding: '7px 0' }}
            >
              {done ? <CheckDot color={dotColor(status)} /> : <PendingDot />}
              <span style={{ fontSize: 13.5, fontWeight: 500, color: REDESIGN_COLORS.textMain }}>{a.role || '—'}</span>
              <span style={{ fontFamily: REDESIGN_MONO, fontSize: 12, color: REDESIGN_COLORS.textSecondary }}>{formatDate(a.assignmentDate)}</span>
              <span style={{ fontFamily: REDESIGN_MONO, fontSize: 12, color: REDESIGN_COLORS.textWeak, minWidth: 14, textAlign: 'right' }}>
                {calculateDays(a.assignmentDate, a.completionDate, a.daysInWork)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
