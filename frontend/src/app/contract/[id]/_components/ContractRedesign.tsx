'use client';

import { ReactNode } from 'react';
import { REDESIGN_COLORS, REDESIGN_FONT, REDESIGN_MONO } from '@/app/purchase-request/[id]/_components/redesign/utils';
import { useDesignFonts, useStickyHeaderHeight } from '@/app/purchase-request/[id]/_components/redesign/hooks';
import { ContractBlock } from '@/app/purchase-request/[id]/_components/redesign/ContractBlock';
import type { ApprovalStatusColor } from '@/app/purchase-request/[id]/_components/redesign/types';
import { ChildContract, ContractApprovalItem, ContractDetail, PaymentItem } from './types/contract-detail.types';

const C = REDESIGN_COLORS;

type PillTone = 'green' | 'yellow' | 'red' | 'blue' | 'gray';

/** Светлая пилюля статуса (для карточек на белом фоне). */
function Pill({ text, tone }: { text: string; tone: PillTone }) {
  const map: Record<PillTone, { bg: string; color: string }> = {
    green: { bg: C.successBg, color: C.successText },
    yellow: { bg: '#FCF3E3', color: '#9A6A14' },
    red: { bg: '#FBEAEA', color: '#B3261E' },
    blue: { bg: C.accentBg, color: C.accent },
    gray: { bg: '#EEF1F6', color: C.textSecondary },
  };
  const { bg, color } = map[tone];
  return (
    <span style={{ background: bg, color, fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 100, whiteSpace: 'nowrap' }}>{text}</span>
  );
}

function contractStatusTone(status: string | null): PillTone {
  if (status === 'Подписан') return 'green';
  if (status === 'На согласовании') return 'yellow';
  if (status === 'На регистрации') return 'blue';
  if (status === 'Не согласован') return 'red';
  return 'gray';
}

function paymentStatusTone(status: string): PillTone {
  if (status === 'Оплачена') return 'green';
  if (status === 'К оплате') return 'yellow';
  if (status === 'Оплата возвращена') return 'red';
  return 'gray';
}

function requestStatusTone(status: string): PillTone {
  if (status === 'Утвержден') return 'green';
  if (status === 'На согласовании') return 'blue';
  if (status === 'Отклонен') return 'red';
  return 'gray';
}

/** Пилюля статуса в тёмной шапке (как на странице заявки). */
function HeaderStatusPill({ status }: { status: string | null }) {
  if (!status) return null;
  let bg = 'rgba(37,99,235,.16)';
  let border = 'rgba(37,99,235,.35)';
  let color = '#8FB4FF';
  let dot: string = C.accent;
  let isYellow = false;
  if (status === 'Подписан') {
    bg = 'rgba(61,190,127,.16)'; border = 'rgba(61,190,127,.35)'; color = '#7FE0AE'; dot = C.success;
  } else if (status === 'Не согласован') {
    bg = 'rgba(229,72,77,.16)'; border = 'rgba(229,72,77,.35)'; color = '#F5A3A5'; dot = C.danger;
  } else if (status === 'На согласовании') {
    bg = 'rgba(240,162,46,.16)'; border = 'rgba(240,162,46,.35)'; color = '#F5C97E'; dot = C.warn; isYellow = true;
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: bg, border: `1px solid ${border}`, color, fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 100 }}>
      <span className={isYellow ? 'animate-yellow-circle-pulse-fast' : undefined} style={{ width: 7, height: 7, borderRadius: '50%', background: dot }} />
      {status}
    </span>
  );
}

const cardStyle: React.CSSProperties = {
  background: C.cardBg,
  borderRadius: 16,
  boxShadow: '0 1px 2px rgba(15,28,46,.06),0 8px 28px rgba(15,28,46,.05)',
  overflow: 'hidden',
};
const sectionHeadStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 28px 0', gap: 16, flexWrap: 'wrap',
};
const badgeStyle: React.CSSProperties = {
  fontFamily: REDESIGN_MONO, fontSize: 12, fontWeight: 600, color: C.accent, background: C.accentBg, padding: '4px 10px', borderRadius: 6,
};
const titleStyle: React.CSSProperties = { margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-.02em' };
const defRow: React.CSSProperties = { display: 'grid', gridTemplateColumns: '180px 1fr', gap: 16, padding: '13px 4px', borderBottom: `1px solid ${C.divider}`, fontSize: 14 };
const defLabel: React.CSSProperties = { color: C.textSecondary };

function InfoRow({ label, children, last }: { label: string; children: ReactNode; last?: boolean }) {
  return (
    <div style={last ? { ...defRow, borderBottom: 'none' } : defRow}>
      <span style={defLabel}>{label}</span>
      <span style={{ fontWeight: 500, minWidth: 0, overflowWrap: 'break-word' }}>{children}</span>
    </div>
  );
}

export interface ContractRedesignProps {
  contract: ContractDetail;
  childContracts: ChildContract[];
  payments: PaymentItem[];
  approvals: ContractApprovalItem[];
  goBack: () => void;
  onOpenContract: (id: number) => void;
  formatDate: (d: string | null) => string;
  formatAmount: (amount: number | null, currency: string | null) => string;
  calculateApprovalWorkingDays: (assigned: string | null, completed: string | null) => string;
  getApprovalStatusColor: (a: { completionResult: string | null; completionDate: string | null; assignmentDate: string | null }) => ApprovalStatusColor;
  /** Слот для блока счёт-фактур (переиспользуем существующий компонент). */
  invoiceSlot?: ReactNode;
}

export default function ContractRedesign({
  contract,
  childContracts,
  payments,
  approvals,
  goBack,
  onOpenContract,
  formatDate,
  formatAmount,
  calculateApprovalWorkingDays,
  getApprovalStatusColor,
  invoiceSlot,
}: ContractRedesignProps) {
  useDesignFonts();
  const { headerRef, headerHeight } = useStickyHeaderHeight();

  const stageOrder = [...new Set(approvals.map((a) => a.stage || 'Без этапа'))];

  const getCurrencyIcon = (currency: string | null): ReactNode => {
    if (!currency) return null;
    const c = currency.toUpperCase();
    const label = c === 'USD' || c === 'ДОЛЛАР' || c === '$' ? '$'
      : c === 'EUR' || c === 'ЕВРО' || c === '€' ? '€'
      : c === 'UZS' || c === 'СУМ' || c === 'СУММ' ? 'UZS'
      : currency;
    return <span style={{ marginLeft: 4, fontSize: 12 }}>{label}</span>;
  };

  const deliveryEndExpired = contract.plannedDeliveryEndDate
    ? new Date(contract.plannedDeliveryEndDate) < new Date()
    : null;

  return (
    <div style={{ minHeight: '100%', background: C.bgPage, fontFamily: REDESIGN_FONT, color: C.textMain, paddingBottom: 40 }}>
      {/* ===== Тёмная шапка (закреплена при прокрутке) ===== */}
      <div ref={headerRef} style={{ position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(15,28,46,.35)' }}>
        <div style={{ background: C.headerDark, color: C.headerText, padding: '0 40px 20px' }}>
          <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 64, gap: 24, flexWrap: 'wrap', paddingTop: 8, paddingBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <button onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.headerTextMuted, fontFamily: REDESIGN_FONT, fontSize: 14, fontWeight: 500, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Назад к списку
              </button>
              <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,.15)' }} />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: REDESIGN_MONO, fontSize: 13, color: C.headerTextMuted }}>№ {contract.innerId || contract.id}</span>
                <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-.01em' }}>{contract.name || contract.title || 'Договор'}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <HeaderStatusPill status={contract.status} />
            </div>
          </div>
        </div>
      </div>

      {/* Тёмная полоска под шапкой — карточки «заезжают» на неё и при прокрутке */}
      <div style={{ position: 'sticky', top: headerHeight, zIndex: 1, background: C.headerDark, height: 16 }} />

      {/* ===== Секции: слева договор, справа оплаты и счёт-фактуры ===== */}
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 1440, margin: '-16px auto 0', padding: '0 40px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(360px,420px)', alignItems: 'start', gap: 24 }}>

        {/* --- Левая колонка --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>

        {/* --- Договор (в стиле карточки заявки) --- */}
        <section style={cardStyle}>
          <div style={sectionHeadStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={badgeStyle}>ДОГОВОР</span>
              <h2 style={titleStyle}>Договор {contract.innerId || `#${contract.id}`}</h2>
            </div>
          </div>
          <div style={{ padding: '20px 28px 26px' }}>
            <ContractBlock
              contract={contract}
              approvals={approvals}
              stageOrder={stageOrder}
              formatDate={formatDate}
              getCurrencyIcon={getCurrencyIcon}
              calculateContractApprovalWorkingDays={calculateApprovalWorkingDays}
              getApprovalStatusColor={getApprovalStatusColor}
            />
          </div>
        </section>

        {/* --- Исключение из расчёта статуса --- */}
        {contract.excludedFromStatusCalculation && (
          <section style={{ ...cardStyle, background: '#FCF7E8', border: '1px solid #F0DFA8' }}>
            <div style={{ padding: '18px 28px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#8A6A12', marginBottom: contract.exclusionComment ? 6 : 0 }}>Исключён из расчёта статуса заявки</div>
              {contract.exclusionComment && <div style={{ fontSize: 13.5, color: '#9A7A22' }}>{contract.exclusionComment}</div>}
            </div>
          </section>
        )}

        {/* --- Информация --- */}
        <section style={cardStyle}>
          <div style={sectionHeadStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={badgeStyle}>ИНФО</span>
              <h2 style={titleStyle}>Информация</h2>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(380px,1fr))', gap: '0 0', padding: '20px 28px 26px' }}>
            <div style={{ paddingRight: 32, display: 'flex', flexDirection: 'column', borderTop: `1px solid ${C.divider}` }}>
              <InfoRow label="Номер заявки">{contract.purchaseRequestInnerId != null ? <span style={{ fontFamily: REDESIGN_MONO, fontSize: 13 }}>{contract.purchaseRequestInnerId}</span> : '—'}</InfoRow>
              <InfoRow label="Способ закупки">{contract.purchaseMethod || '—'}</InfoRow>
              <InfoRow label="Форма документа">{contract.documentForm || '—'}</InfoRow>
              <InfoRow label="Тип затрат">{contract.costType || '—'}</InfoRow>
              <InfoRow label="Тип договора">{contract.contractType || '—'}</InfoRow>
              <InfoRow label="Срок действия (мес.)">{contract.contractDurationMonths != null ? contract.contractDurationMonths : '—'}</InfoRow>
              <InfoRow label="Состояние">{contract.state || '—'}</InfoRow>
              <InfoRow label="Организация заказчика" last>{contract.customerOrganization || '—'}</InfoRow>
            </div>
            <div style={{ borderLeft: `1px solid ${C.divider}`, paddingLeft: 28, display: 'flex', flexDirection: 'column', borderTop: `1px solid ${C.divider}` }}>
              <InfoRow label="Дата создания"><span style={{ fontFamily: REDESIGN_MONO, fontSize: 13 }}>{formatDate(contract.contractCreationDate)}</span></InfoRow>
              <InfoRow label="Дата синхронизации"><span style={{ fontFamily: REDESIGN_MONO, fontSize: 13 }}>{formatDate(contract.synchronizationDate)}</span></InfoRow>
              <InfoRow label="Начало поставки (план)"><span style={{ fontFamily: REDESIGN_MONO, fontSize: 13 }}>{formatDate(contract.plannedDeliveryStartDate)}</span></InfoRow>
              <InfoRow label="Срок поставки (план)">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: REDESIGN_MONO, fontSize: 13 }}>{formatDate(contract.plannedDeliveryEndDate)}</span>
                  {deliveryEndExpired != null && <Pill text={deliveryEndExpired ? 'Истёк' : 'Действует'} tone={deliveryEndExpired ? 'red' : 'green'} />}
                </span>
              </InfoRow>
              {contract.suppliers && contract.suppliers.length > 0 && (
                <InfoRow label="Поставщики">
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {contract.suppliers.map((s) => (
                      <span key={s.id}>
                        {s.name || '—'}
                        {s.inn && <span style={{ color: C.textMuted }}> · ИНН {s.inn}</span>}
                        {s.code && <span style={{ color: C.textMuted }}> [{s.code}]</span>}
                      </span>
                    ))}
                  </span>
                </InfoRow>
              )}
              {contract.parentContract && (
                <InfoRow label="Основной договор">
                  <button
                    onClick={() => onOpenContract(contract.parentContract!.id)}
                    style={{ color: C.accent, fontFamily: REDESIGN_FONT, fontSize: 14, fontWeight: 500, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
                  >
                    {contract.parentContract.innerId || `#${contract.parentContract.id}`} — {contract.parentContract.name || contract.parentContract.title || '—'}
                  </button>
                </InfoRow>
              )}
              <InfoRow label="GUID" last><span style={{ fontFamily: REDESIGN_MONO, fontSize: 12, color: C.textSecondary, wordBreak: 'break-all' }}>{contract.guid}</span></InfoRow>
            </div>
          </div>
        </section>

        {/* --- Условия оплаты / поставки --- */}
        {(contract.paymentTerms || contract.paymentScheme || contract.deliveryTerm) && (
          <section style={cardStyle}>
            <div style={sectionHeadStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={badgeStyle}>УСЛОВИЯ</span>
                <h2 style={titleStyle}>Условия</h2>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 28px 26px', borderTop: 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', borderTop: `1px solid ${C.divider}` }}>
                {contract.paymentTerms && <InfoRow label="Условия оплаты"><span style={{ whiteSpace: 'pre-wrap' }}>{contract.paymentTerms}</span></InfoRow>}
                {contract.paymentScheme && <InfoRow label="Схема оплаты"><span style={{ whiteSpace: 'pre-wrap' }}>{contract.paymentScheme}</span></InfoRow>}
                {contract.deliveryTerm && <InfoRow label="Срок поставки" last><span style={{ whiteSpace: 'pre-wrap' }}>{contract.deliveryTerm}</span></InfoRow>}
              </div>
            </div>
          </section>
        )}

        {/* --- Спецификации --- */}
        {childContracts.length > 0 && (
          <section style={cardStyle}>
            <div style={sectionHeadStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={badgeStyle}>СПЕЦИФИКАЦИИ</span>
                <h2 style={titleStyle}>Спецификации <span style={{ color: C.textMuted, fontWeight: 500 }}>({childContracts.length})</span></h2>
              </div>
            </div>
            <div style={{ padding: '20px 28px 26px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', borderTop: `1px solid ${C.divider}` }}>
                {childContracts.map((child, idx) => (
                  <div key={child.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '12px 4px', borderBottom: idx === childContracts.length - 1 ? 'none' : `1px solid ${C.divider}`, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => onOpenContract(child.id)}
                      style={{ color: C.accent, fontFamily: REDESIGN_FONT, fontSize: 14, fontWeight: 500, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', minWidth: 0 }}
                    >
                      <span style={{ fontFamily: REDESIGN_MONO, fontSize: 13 }}>{child.innerId || `#${child.id}`}</span> — {child.name || child.title || '—'}
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {child.budgetAmount != null && (
                        <span style={{ fontFamily: REDESIGN_MONO, fontSize: 13, fontWeight: 600 }}>{formatAmount(child.budgetAmount, child.currency)}</span>
                      )}
                      {child.status && <Pill text={child.status} tone={contractStatusTone(child.status)} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        </div>

        {/* --- Правая колонка: оплаты и счёт-фактуры (закреплена при прокрутке, «заезжает» на тёмную полосу как основной блок) --- */}
        <div style={{ position: 'sticky', top: headerHeight, maxHeight: `calc(100vh - ${headerHeight + 24}px)`, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>

        {/* --- Оплаты --- */}
        <section style={cardStyle}>
          <div style={sectionHeadStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={badgeStyle}>ОПЛАТЫ</span>
              <h2 style={titleStyle}>Оплаты {payments.length > 0 && <span style={{ color: C.textMuted, fontWeight: 500 }}>({payments.length})</span>}</h2>
            </div>
          </div>
          <div style={{ padding: '20px 28px 26px' }}>
            {payments.length === 0 ? (
              <div style={{ fontSize: 14, color: C.textMuted }}>Нет оплат</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', borderTop: `1px solid ${C.divider}`, maxHeight: 480, overflowY: 'auto' }}>
                {payments.map((p, idx) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '12px 4px', borderBottom: idx === payments.length - 1 ? 'none' : `1px solid ${C.divider}`, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                      <span style={{ fontFamily: REDESIGN_MONO, fontSize: 13, fontWeight: 500 }}>{p.mainId || `#${p.id}`}</span>
                      <div style={{ display: 'flex', gap: 14, fontSize: 12, color: C.textMuted, flexWrap: 'wrap' }}>
                        {p.paymentDate && <span>Оплата: {formatDate(p.paymentDate)}</span>}
                        {p.plannedExpenseDate && <span>План: {formatDate(p.plannedExpenseDate)}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      {p.requestStatus && <Pill text={p.requestStatus} tone={requestStatusTone(p.requestStatus)} />}
                      {p.paymentStatus && <Pill text={p.paymentStatus} tone={paymentStatusTone(p.paymentStatus)} />}
                      {p.amount != null && (
                        <span style={{ fontFamily: REDESIGN_MONO, fontSize: 15, fontWeight: 600 }}>
                          {new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(p.amount)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* --- Счёт-фактуры --- */}
        {invoiceSlot}
        </div>
      </div>
    </div>
  );
}
