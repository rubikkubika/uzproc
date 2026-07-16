'use client';

import { PurchaseRequestRedesignProps } from './types';
import { REDESIGN_COLORS, REDESIGN_FONT, REDESIGN_MONO } from './utils';
import { CheckDot, EmptyDot, MetaChip, PendingDot, StarRating, Tile } from './RedesignPrimitives';
import { ApprovalGroup } from './ApprovalGroup';
import { ContractBlock } from './ContractBlock';
import { useDesignFonts, useStickyHeaderHeight } from './hooks';

const C = REDESIGN_COLORS;

type StepState = 'done' | 'pending' | 'empty';

function StepColumn({ label, state, title }: { label: string; state: StepState; title?: string }) {
  const barColor = state === 'done' ? C.success : state === 'pending' ? C.warn : 'rgba(255,255,255,.14)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} title={title}>
      <div style={{ height: 4, borderRadius: 2, background: barColor }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {state === 'done' ? <CheckDot /> : state === 'pending' ? <PendingDot /> : <EmptyDot />}
        <span style={{ fontSize: 13, fontWeight: 600, color: state === 'empty' ? C.headerTextMuted : C.headerText }}>{label}</span>
      </div>
    </div>
  );
}

function StatusPill({ statusGroup }: { statusGroup: string | null }) {
  if (!statusGroup) return null;
  const green = ['Договор подписан', 'Спецификация подписана'];
  const red = ['Заявка не согласована', 'Заявка не утверждена', 'Закупка не согласована', 'Спецификация не согласована'];
  const yellow = ['Заявка на согласовании'];
  let bg = 'rgba(37,99,235,.16)';
  let border = 'rgba(37,99,235,.35)';
  let color = '#8FB4FF';
  let dot: string = C.accent;
  let isYellow = false;
  if (green.includes(statusGroup)) {
    bg = 'rgba(61,190,127,.16)'; border = 'rgba(61,190,127,.35)'; color = '#7FE0AE'; dot = C.success;
  } else if (red.includes(statusGroup)) {
    bg = 'rgba(229,72,77,.16)'; border = 'rgba(229,72,77,.35)'; color = '#F5A3A5'; dot = C.danger;
  } else if (yellow.includes(statusGroup)) {
    bg = 'rgba(240,162,46,.16)'; border = 'rgba(240,162,46,.35)'; color = '#F5C97E'; dot = C.warn; isYellow = true;
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: bg, border: `1px solid ${border}`, color, fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 100 }}>
      <span className={isYellow ? 'animate-yellow-circle-pulse-fast' : undefined} style={{ width: 7, height: 7, borderRadius: '50%', background: dot }} />
      {statusGroup}
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

export default function PurchaseRequestRedesign(props: PurchaseRequestRedesignProps) {
  useDesignFonts();
  const { headerRef, headerHeight } = useStickyHeaderHeight();
  const {
    purchaseRequest: pr, purchase, csiFeedback, csiFeedbackLoading, contracts, contractApprovalsByContractId,
    approvalStageApprovals, managerStageApprovals, finalApprovalStageApprovals, finalApprovalNoZpStageApprovals,
    purchaseResultsApprovalApprovals, purchaseCommissionApprovals, purchaseCommissionResultCheckApprovals,
    isRequestStepGreen, isPurchaseStepGreen, isPurchaseStepYellow, isPurchaseStepRed,
    formatDate, formatDateTime, formatCurrency, getCurrencyIcon, calculateDays, calculateContractApprovalWorkingDays,
    getApprovalStatusColor, getContractSpecStageOrder, getAverageRating, purchaserDisplayName, initiatorDisplayName,
    goBack, onSavingsTypeChange, onCopyCsi, onToggleDesign, competitiveSheetSlot,
  } = props;

  const isOrder = pr.requiresPurchase === false;

  // Состояния шагов трекера
  const requestState: StepState = isRequestStepGreen ? 'done' : 'pending';
  const purchaseState: StepState = isPurchaseStepGreen ? 'done' : isPurchaseStepRed ? 'pending' : isPurchaseStepYellow ? 'pending' : 'empty';
  const contractDone = pr.status === 'Договор подписан' || pr.statusGroup === 'Договор подписан';
  const contractState: StepState = contractDone ? 'done' : (purchase && purchase.status === 'Завершена') ? 'pending' : 'empty';
  const orderDone = pr.status === 'Спецификация подписана';
  const orderState: StepState = orderDone ? 'done' : (isRequestStepGreen ? 'pending' : 'empty');

  const finalApprovals = [...finalApprovalStageApprovals, ...finalApprovalNoZpStageApprovals];

  const headerBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 7, background: 'transparent', border: '1px solid rgba(255,255,255,.2)',
    color: C.headerText, fontFamily: REDESIGN_FONT, fontSize: 13, fontWeight: 500, padding: '7px 14px', borderRadius: 100, cursor: 'pointer',
  };

  return (
    <div style={{ minHeight: '100%', background: C.bgPage, fontFamily: REDESIGN_FONT, color: C.textMain, paddingBottom: 40 }}>
      {/* ===== Тёмный блок: шапка + степпер (закреплены при прокрутке) ===== */}
      <div ref={headerRef} style={{ position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(15,28,46,.35)' }}>
      <div style={{ background: C.headerDark, color: C.headerText, padding: '0 40px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 64, gap: 24, flexWrap: 'wrap', paddingTop: 8, paddingBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <button onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.headerTextMuted, fontFamily: REDESIGN_FONT, fontSize: 14, fontWeight: 500, background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Назад к списку
            </button>
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,.15)' }} />
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: REDESIGN_MONO, fontSize: 13, color: C.headerTextMuted }}>№ {pr.idPurchaseRequest ?? '—'}</span>
              <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-.01em' }}>{pr.name || 'Заявка на закупку'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <StatusPill statusGroup={pr.statusGroup} />
            <button onClick={onToggleDesign} title="Вернуться к старому дизайну" style={headerBtn}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 8h12M2 8l4-4M2 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Старый дизайн
            </button>
            {pr.csiLink && (
              <button onClick={onCopyCsi} title="Скопировать ссылку на форму CSI" style={{ ...headerBtn, width: 34, height: 34, padding: 0, justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" /><path d="M10.5 5.5V4A1.5 1.5 0 0 0 9 2.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5" stroke="currentColor" strokeWidth="1.4" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ===== Степпер ===== */}
      <div style={{ background: C.headerDark, padding: '0 40px 20px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
          <StepColumn label="Потребность" state="done" />
          <StepColumn label="Заявка" state={requestState} />
          {isOrder ? (
            <>
              <StepColumn label="Заказ" state={orderState} />
              <StepColumn label="—" state="empty" />
            </>
          ) : (
            <>
              <StepColumn label="Закупка" state={purchaseState} />
              <StepColumn label="Договор" state={contractState} />
            </>
          )}
        </div>
      </div>
      </div>

      {/* Тёмная полоска под шапкой — карточки «заезжают» на неё и при прокрутке */}
      <div style={{ position: 'sticky', top: headerHeight, zIndex: 1, background: C.headerDark, height: 16 }} />

      {/* ===== Секции ===== */}
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 1440, margin: '-16px auto 0', padding: '0 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* --- Заявка --- */}
        <section style={cardStyle}>
          <div style={sectionHeadStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={badgeStyle}>ЭТАП 1–2</span>
              <h2 style={titleStyle}>Заявка на закупку</h2>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(380px,1fr))', gap: '20px 0', padding: '20px 28px 26px' }}>
            <div style={{ paddingRight: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                <Tile label="Номер"><span style={{ fontFamily: REDESIGN_MONO }}>{pr.idPurchaseRequest ?? '—'}</span></Tile>
                <Tile label="План">{pr.isPlanned === true ? 'В плане' : pr.isPlanned === false ? 'Не в плане' : '—'}</Tile>
                <Tile label="Требуется закупка">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: pr.requiresPurchase === true ? C.successText : C.textMuted }}>
                    {pr.requiresPurchase === true ? 'Да' : pr.requiresPurchase === false ? 'Нет' : '—'}
                  </span>
                </Tile>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', borderTop: `1px solid ${C.divider}` }}>
                <div style={defRow}><span style={defLabel}>Наименование</span><span style={{ fontWeight: 500 }}>{pr.name || '—'}</span></div>
                <div style={defRow}><span style={defLabel}>ЦФО</span><span style={{ fontWeight: 500 }}>{pr.cfo || '—'}</span></div>
                <div style={defRow}><span style={defLabel}>Бюджет</span><span style={{ fontFamily: REDESIGN_MONO, fontWeight: 600, display: 'flex', alignItems: 'center' }}>{formatCurrency(pr.budgetAmount != null ? Number(pr.budgetAmount) : null, pr.currency)}</span></div>
                <div style={{ ...defRow, borderBottom: 'none' }}><span style={defLabel}>Статья расходов</span><span style={{ fontWeight: 500 }}>{pr.expenseItem || '—'}</span></div>
              </div>
            </div>
            <div style={{ borderLeft: `1px solid ${C.divider}`, paddingLeft: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, paddingBottom: 4 }}>
                <MetaChip label="Инициатор" value={initiatorDisplayName(pr.purchaseRequestInitiator)} />
                <MetaChip label="Создана" value={formatDate(pr.purchaseRequestCreationDate)} />
              </div>
              <ApprovalGroup title="Согласование" hint="назначено · дней" approvals={approvalStageApprovals} formatDate={formatDate} calculateDays={calculateDays} getApprovalStatusColor={getApprovalStatusColor} />
              <ApprovalGroup title="Руководитель закупок" approvals={managerStageApprovals} formatDate={formatDate} calculateDays={calculateDays} getApprovalStatusColor={getApprovalStatusColor} />
              <ApprovalGroup title="Утверждение" approvals={finalApprovals} formatDate={formatDate} calculateDays={calculateDays} getApprovalStatusColor={getApprovalStatusColor} />
              {approvalStageApprovals.length === 0 && managerStageApprovals.length === 0 && finalApprovals.length === 0 && (
                <div style={{ fontSize: 13, color: C.textMuted }}>Нет согласований</div>
              )}
            </div>
          </div>
        </section>

        {/* --- Закупка --- */}
        {!isOrder && (
          <section style={cardStyle}>
            <div style={sectionHeadStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={badgeStyle}>ЭТАП 3</span>
                <h2 style={titleStyle}>Закупка</h2>
                {purchase?.status && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: purchase.status === 'Завершена' ? C.successBg : '#EEF1F6', color: purchase.status === 'Завершена' ? C.successText : C.textSecondary, fontSize: 12.5, fontWeight: 600, padding: '4px 12px', borderRadius: 100 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: purchase.status === 'Завершена' ? C.successText : C.textMuted }} />
                    {purchase.status}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(380px,1fr))', gap: '20px 0', padding: '20px 28px 26px' }}>
              <div style={{ paddingRight: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {purchase ? (
                  <div style={{ display: 'flex', flexDirection: 'column', borderTop: `1px solid ${C.divider}` }}>
                    <div style={defRow}><span style={defLabel}>Внутренний ID</span><span style={{ fontFamily: REDESIGN_MONO, fontSize: 13, fontWeight: 500 }}>{purchase.innerId || '—'}</span></div>
                    <div style={defRow}><span style={defLabel}>ЦФО</span><span style={{ fontWeight: 500 }}>{purchase.cfo || '—'}</span></div>
                    <div style={defRow}><span style={defLabel}>Способ закупки</span><span style={{ fontWeight: 500 }}>{purchase.purchaseMethod || '—'}</span></div>
                    <div style={defRow}><span style={defLabel}>Экономия</span><span style={{ fontWeight: 500 }}>{purchase.savings != null ? purchase.savings.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</span></div>
                    <div style={{ ...defRow, borderBottom: 'none', alignItems: 'center' }}>
                      <span style={defLabel}>Тип экономии</span>
                      <select
                        value={purchase.savingsType || ''}
                        onChange={(e) => onSavingsTypeChange(e.target.value)}
                        style={{ appearance: 'auto', fontFamily: REDESIGN_FONT, fontSize: 13.5, color: C.textMain, background: C.tileBg, border: '1px solid #DFE2E9', borderRadius: 8, padding: '7px 10px', maxWidth: 280, cursor: 'pointer' }}
                      >
                        <option value="">—</option>
                        <option value="От медианы">От медианы</option>
                        <option value="От существующего договора">От существующего договора</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 14, color: C.textMuted, padding: '12px 0' }}>Связанная закупка не найдена</div>
                )}

                {/* Карточка оценки CSI */}
                {csiFeedbackLoading ? (
                  <div style={{ background: C.cardGradient, borderRadius: 14, padding: '18px 22px', color: C.headerText, fontSize: 13 }}>Загрузка оценки…</div>
                ) : csiFeedback ? (
                  <div style={{ background: C.cardGradient, borderRadius: 14, padding: '18px 22px', color: C.headerText, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                          <span style={{ fontFamily: REDESIGN_MONO, fontSize: 13, color: C.headerTextMuted }}>№ {csiFeedback.idPurchaseRequest ?? '—'}</span>
                          <span style={{ fontSize: 12.5, color: C.headerTextMuted }}>{formatDateTime(csiFeedback.createdAt)}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 16, fontSize: 13, color: C.headerText, flexWrap: 'wrap' }}>
                          <span>Скорость <strong style={{ color: '#fff' }}>{csiFeedback.speedRating.toFixed(1)}</strong></span>
                          <span>Качество <strong style={{ color: '#fff' }}>{csiFeedback.qualityRating.toFixed(1)}</strong></span>
                          <span>Закупщик <strong style={{ color: '#fff' }}>{csiFeedback.satisfactionRating.toFixed(1)}</strong></span>
                          {csiFeedback.uzprocRating != null && <span>Узпрок <strong style={{ color: '#fff' }}>{csiFeedback.uzprocRating.toFixed(1)}</strong></span>}
                        </div>
                      </div>
                      <StarRating rating={getAverageRating(csiFeedback)} />
                    </div>
                    {csiFeedback.comment && (
                      <div style={{ fontSize: 12.5, color: C.headerText, background: 'rgba(255,255,255,.08)', borderRadius: 8, padding: '8px 12px' }}>{csiFeedback.comment}</div>
                    )}
                  </div>
                ) : (
                  <div style={{ background: C.tileBg, borderRadius: 12, padding: '14px 16px', fontSize: 13, color: C.textMuted }}>Оценки пока нет — появится после отзыва</div>
                )}
              </div>

              <div style={{ borderLeft: `1px solid ${C.divider}`, paddingLeft: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, paddingBottom: 4 }}>
                  <MetaChip label="Закупщик" value={pr.purchaser ? purchaserDisplayName(pr.purchaser) : '—'} />
                  <MetaChip label="Создана" value={purchase?.purchaseCreationDate ? formatDate(purchase.purchaseCreationDate) : '—'} />
                </div>
                <ApprovalGroup title="Согласование результатов ЗП" hint="назначено · дней" approvals={purchaseResultsApprovalApprovals} formatDate={formatDate} calculateDays={calculateDays} getApprovalStatusColor={getApprovalStatusColor} />
                <ApprovalGroup title="Закупочная комиссия" approvals={purchaseCommissionApprovals} formatDate={formatDate} calculateDays={calculateDays} getApprovalStatusColor={getApprovalStatusColor} />
                <ApprovalGroup title="Проверка результата закупочной комиссии" approvals={purchaseCommissionResultCheckApprovals} formatDate={formatDate} calculateDays={calculateDays} getApprovalStatusColor={getApprovalStatusColor} />
                {purchaseResultsApprovalApprovals.length === 0 && purchaseCommissionApprovals.length === 0 && purchaseCommissionResultCheckApprovals.length === 0 && (
                  <div style={{ fontSize: 13, color: C.textMuted }}>Нет согласований</div>
                )}
              </div>
            </div>
            {/* Конкурентный лист — на всю ширину карточки, чтобы таблица не обрезалась */}
            {purchase && competitiveSheetSlot && (
              <div style={{ padding: '0 28px 26px', minWidth: 0 }}>
                {competitiveSheetSlot}
              </div>
            )}
          </section>
        )}

        {/* --- Договор --- */}
        <section style={cardStyle}>
          <div style={sectionHeadStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={badgeStyle}>ЭТАП 4</span>
              <h2 style={titleStyle}>{isOrder ? 'Спецификация' : 'Договор'}</h2>
            </div>
          </div>
          <div style={{ padding: '20px 28px 26px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {contracts && contracts.length > 0 ? (
              contracts.map((contract, idx) => {
                const list = contractApprovalsByContractId[contract.id] ?? [];
                const stages = [...new Set(list.map((a) => a.stage || 'Без этапа'))];
                const stageOrder = getContractSpecStageOrder(stages);
                return (
                  <div key={contract.id} style={idx > 0 ? { borderTop: `1px solid ${C.divider}`, paddingTop: 24 } : undefined}>
                    <ContractBlock
                      contract={contract}
                      approvals={list}
                      stageOrder={stageOrder}
                      formatDate={formatDate}
                      getCurrencyIcon={getCurrencyIcon}
                      calculateContractApprovalWorkingDays={calculateContractApprovalWorkingDays}
                      getApprovalStatusColor={getApprovalStatusColor}
                    />
                  </div>
                );
              })
            ) : (
              <div style={{ fontSize: 14, color: C.textMuted }}>Нет данных о договоре</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
