import { EYEBROW, FIELD_VALUE, PLACEHOLDER } from '../../constants/delivery-modal.constants';

interface DeliveryFieldProps {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** Поле «надзаголовок + значение». */
export function DeliveryField({ label, children, className = '' }: DeliveryFieldProps) {
  return (
    <div className={`min-w-0 ${className}`}>
      <div className={`${EYEBROW} mb-[5px]`}>{label}</div>
      {children}
    </div>
  );
}

/** Текстовое значение поля; для пустого — приглушённое тире. */
export function DeliveryValue({
  value,
  empty = '—',
  className = '',
}: {
  value: React.ReactNode;
  empty?: string;
  className?: string;
}) {
  const isEmpty = value == null || value === '' || (typeof value === 'string' && value.trim() === '');
  return (
    <div className={`${FIELD_VALUE} ${isEmpty ? PLACEHOLDER : ''} [overflow-wrap:anywhere] ${className}`}>
      {isEmpty ? empty : value}
    </div>
  );
}
