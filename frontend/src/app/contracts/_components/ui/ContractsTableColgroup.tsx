'use client';

import { CONTRACTS_COLUMN_WIDTHS } from '../constants/contracts.constants';

interface ContractsTableColgroupProps {
  /** На вкладках с исполнителем колонок на одну больше. */
  withPreparedBy: boolean;
}

const W = CONTRACTS_COLUMN_WIDTHS;

/**
 * Ширины колонок таблицы договоров. «Наименование» намеренно без width —
 * при table-fixed оно забирает остаток ширины, поэтому таблица тянется на широких экранах,
 * а все остальные колонки (в том числе трэк) сохраняют заданный размер.
 */
export default function ContractsTableColgroup({ withPreparedBy }: ContractsTableColgroupProps) {
  return (
    <colgroup>
      <col style={{ width: W.eye }} />
      <col style={{ width: W.remarks }} />
      <col style={{ width: W.innerId }} />
      <col style={{ width: W.organization }} />
      <col style={{ width: W.purchaseRequestInnerId }} />
      {withPreparedBy && <col style={{ width: W.preparedBy }} />}
      <col style={{ width: W.cfo }} />
      {/* Наименование — растягивается */}
      <col />
      <col style={{ width: W.supplier }} />
      <col style={{ width: W.documentForm }} />
      <col style={{ width: W.contractCreationDate }} />
      <col style={{ width: W.plannedDeliveryEndDate }} />
      <col style={{ width: W.status }} />
      <col style={{ width: W.registrationDate }} />
      <col style={{ width: W.isTypicalForm }} />
      <col style={{ width: W.track }} />
    </colgroup>
  );
}
