'use client';

interface Props {
  shipmentStatuses: string[];
  paymentStatuses: string[];
  year: number;
  gridTemplate: string;
}

/** Две строки заголовка сводки: группы колонок и названия статусов. */
export default function SummaryHeaderRows({ shipmentStatuses, paymentStatuses, year, gridTemplate }: Props) {
  return (
    <>
      <div className="grid border-b border-slate-200 bg-white" style={{ gridTemplateColumns: gridTemplate }}>
        <div />
        <div
          className="text-center text-[11px] font-semibold text-blue-800 border-b-2 border-blue-200 mx-1 pt-1.5 pb-0.5"
          style={{ gridColumn: `span ${shipmentStatuses.length}` }}
        >
          Статус поставки
        </div>
        <div />
        <div
          className="text-center text-[11px] font-semibold text-violet-700 border-b-2 border-violet-200 mx-1 pt-1.5 pb-0.5"
          style={{ gridColumn: `span ${paymentStatuses.length}` }}
        >
          Статус оплаты
        </div>
        <div />
        <div style={{ gridColumn: 'span 3' }} />
      </div>
      <div
        className="grid items-end border-b border-slate-200 text-[10.5px] text-slate-500 text-center leading-tight"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        <div className="text-left px-3 py-1.5">Ответственный</div>
        {shipmentStatuses.map((status) => <div key={`ship-${status}`} className="px-[3px] py-1">{status}</div>)}
        <div />
        {paymentStatuses.map((status) => <div key={`pay-${status}`} className="px-[3px] py-1">{status}</div>)}
        <div />
        <div className="px-[3px] py-1 font-semibold text-slate-700" title="Все поставки ответственного">Всего</div>
        <div className="px-[3px] py-1 font-semibold text-orange-700" title="Ещё не поставлено, а плановая дата поставки уже прошла">
          Просрочено
        </div>
        <div className="px-[3px] py-1 font-semibold text-green-700" title="Статус «Поставлено» и фактическая дата поставки в этом году">
          Поставлено {year}
        </div>
      </div>
    </>
  );
}
