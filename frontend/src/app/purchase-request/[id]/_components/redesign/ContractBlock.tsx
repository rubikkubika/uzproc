import { ReactNode } from 'react';
import { Contract, ContractApprovalItem, ApprovalStatusColor } from './types';
import { REDESIGN_COLORS, REDESIGN_MONO, dotColor } from './utils';
import { CheckDot, CrossDot, MetaChip, PendingDot, Tile } from './RedesignPrimitives';

interface ContractBlockProps {
  contract: Contract;
  approvals: ContractApprovalItem[];
  stageOrder: string[];
  formatDate: (d: string | null) => string;
  getCurrencyIcon: (currency: string | null) => ReactNode;
  calculateContractApprovalWorkingDays: (assigned: string | null, completed: string | null) => string;
  getApprovalStatusColor: (a: { completionResult: string | null; completionDate: string | null; assignmentDate: string | null }) => ApprovalStatusColor;
}

function StatusPill({ status }: { status: string | null }) {
  if (!status) return <span style={{ color: REDESIGN_COLORS.textWeak }}>—</span>;
  const isSigned = status === 'Подписан' || status === 'SIGNED';
  const bg = isSigned ? REDESIGN_COLORS.successBg : '#EEF1F6';
  const color = isSigned ? REDESIGN_COLORS.successText : REDESIGN_COLORS.textSecondary;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: bg, color, fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 100 }}>
      {isSigned && <span style={{ width: 6, height: 6, borderRadius: '50%', background: REDESIGN_COLORS.successText }} />}
      {status}
    </span>
  );
}

/** Карточка одного договора: реквизиты слева + таблица согласований справа. */
export function ContractBlock({
  contract,
  approvals,
  stageOrder,
  formatDate,
  getCurrencyIcon,
  calculateContractApprovalWorkingDays,
  getApprovalStatusColor,
}: ContractBlockProps) {
  // Стиль строк — как в карточке заявки (defRow)
  const rowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '180px 1fr',
    gap: 16,
    padding: '13px 4px',
    borderBottom: `1px solid ${REDESIGN_COLORS.divider}`,
    fontSize: 14,
  };
  const labelStyle: React.CSSProperties = { color: REDESIGN_COLORS.textSecondary };

  // Показываем только назначенные согласования
  const assignedApprovals = approvals.filter((a) => a.assignmentDate != null && String(a.assignmentDate).trim() !== '');

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(420px,1fr))',
        gap: '20px 0',
        opacity: contract.excludedFromStatusCalculation ? 0.5 : 1,
      }}
    >
      {/* Левая колонка — реквизиты (в стиле карточки заявки) */}
      <div style={{ paddingRight: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          <Tile label="Внутренний ID"><span style={{ fontFamily: REDESIGN_MONO }}>{contract.innerId || '—'}</span></Tile>
          <Tile label="Сумма договора">
            <span style={{ fontFamily: REDESIGN_MONO, display: 'flex', alignItems: 'center' }}>
              {contract.budgetAmount
                ? new Intl.NumberFormat('ru-RU', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(contract.budgetAmount)
                : '—'}
              {contract.budgetAmount ? getCurrencyIcon(contract.currency) : null}
            </span>
          </Tile>
          <Tile label="Контрагент">
            {contract.suppliers && contract.suppliers.length > 0
              ? contract.suppliers.map((s) => s.name || s.code).filter(Boolean).join(', ') || '—'
              : '—'}
          </Tile>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', borderTop: `1px solid ${REDESIGN_COLORS.divider}` }}>
          <div style={rowStyle}>
            <span style={labelStyle}>Наименование</span>
            <span style={{ fontWeight: 500, lineHeight: 1.45 }}>{contract.name || '—'}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>ЦФО</span>
            <span style={{ fontWeight: 500 }}>{contract.cfo || '—'}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Статус</span>
            <span><StatusPill status={contract.status} /></span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Дата регистрации</span>
            <span style={{ fontFamily: REDESIGN_MONO, fontSize: 13, fontWeight: 500 }}>{contract.registrationDate ? formatDate(contract.registrationDate) : '—'}</span>
          </div>
          <div style={{ ...rowStyle, borderBottom: 'none' }}>
            <span style={labelStyle}>Типовая форма</span>
            <span style={{ fontWeight: 500, color: contract.isTypicalForm ? REDESIGN_COLORS.textMain : REDESIGN_COLORS.textMuted }}>
              {contract.isTypicalForm === true ? 'Да' : contract.isTypicalForm === false ? 'Нет' : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Правая колонка — согласования */}
      <div style={{ borderLeft: `1px solid ${REDESIGN_COLORS.divider}`, paddingLeft: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, paddingBottom: 4 }}>
          <MetaChip label="Исполнитель" value={contract.preparedBy || '—'} />
          <MetaChip label="Создан" value={contract.contractCreationDate ? formatDate(contract.contractCreationDate) : '—'} />
        </div>
        {assignedApprovals.length === 0 ? (
          <div style={{ fontSize: 13, color: REDESIGN_COLORS.textMuted }}>Нет согласований</div>
        ) : (
          stageOrder.map((stage) => {
            const items = assignedApprovals.filter((a) => (a.stage || 'Без этапа') === stage);
            if (items.length === 0) return null;
            return (
              <div key={stage}>
                <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr 150px 72px 72px 44px', gap: 10, alignItems: 'center', paddingBottom: 8, borderBottom: `1px solid ${REDESIGN_COLORS.divider}` }}>
                  <span />
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: REDESIGN_COLORS.textMuted }}>{stage}</span>
                  <span style={colHead}>ФИО</span>
                  <span style={colHead}>Назн.</span>
                  <span style={colHead}>Вып.</span>
                  <span style={{ ...colHead, textAlign: 'right' }}>Дней</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {items.map((a) => {
                    const status = getApprovalStatusColor(a);
                    const done = status === 'green' || status === 'orange' || a.completionDate != null;
                    return (
                      <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '20px 1fr 150px 72px 72px 44px', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${REDESIGN_COLORS.dividerRow}` }}>
                        {!done ? <PendingDot /> : status === 'red' ? <CrossDot /> : <CheckDot color={dotColor(status)} />}
                        <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.35 }} title={a.role}>{a.role || '—'}</span>
                        <span style={{ fontSize: 12.5, color: '#3D4452' }} title={a.executorName ?? ''}>{a.executorName || '—'}</span>
                        <span style={{ fontFamily: REDESIGN_MONO, fontSize: 11.5, color: REDESIGN_COLORS.textSecondary }}>{formatDate(a.assignmentDate)}</span>
                        <span style={{ fontFamily: REDESIGN_MONO, fontSize: 11.5, color: REDESIGN_COLORS.textSecondary }}>{formatDate(a.completionDate)}</span>
                        <span style={{ fontFamily: REDESIGN_MONO, fontSize: 11.5, color: REDESIGN_COLORS.textWeak, textAlign: 'right' }}>{calculateContractApprovalWorkingDays(a.assignmentDate, a.completionDate)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const colHead: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '.05em',
  color: REDESIGN_COLORS.textWeak,
};
