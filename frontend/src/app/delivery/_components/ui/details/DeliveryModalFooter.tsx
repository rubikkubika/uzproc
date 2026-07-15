import { BTN_DANGER, BTN_PRIMARY, BTN_SECONDARY } from '../../constants/delivery-modal.constants';

interface Props {
  canReset: boolean;
  resetting: boolean;
  onReset: () => void;
  onClose: () => void;
  canSubmit: boolean;
  submitting: boolean;
  onSave: () => void;
}

/** Футер карточки: сброс распределения слева, отмена/сохранение справа. */
export function DeliveryModalFooter({
  canReset,
  resetting,
  onReset,
  onClose,
  canSubmit,
  submitting,
  onSave,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[#eceef1] bg-[#fbfbfc] px-[30px] py-[17px]">
      <div>
        {canReset && (
          <button
            type="button"
            onClick={onReset}
            disabled={resetting}
            title="Снять схему оплаты и типы оплат — оплаты вернутся к «нераспределённым»"
            className={BTN_DANGER}
          >
            {resetting ? 'Сброс…' : 'Отменить тип оплат'}
          </button>
        )}
      </div>
      <div className="flex gap-2.5">
        <button type="button" onClick={onClose} className={BTN_SECONDARY}>
          Отмена
        </button>
        <button type="button" onClick={onSave} disabled={!canSubmit} className={BTN_PRIMARY}>
          {submitting ? 'Сохранение…' : 'Сохранить'}
        </button>
      </div>
    </div>
  );
}
