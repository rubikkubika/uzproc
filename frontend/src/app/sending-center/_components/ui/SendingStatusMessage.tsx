/** Сообщение о результате отправки письма (успех или ошибка). */
interface SendingStatusMessageProps {
  type: 'success' | 'error';
  text: string;
}

export default function SendingStatusMessage({ type, text }: SendingStatusMessageProps) {
  return (
    <div
      className={`p-3 rounded-lg text-sm ${
        type === 'success'
          ? 'bg-green-50 border border-green-200 text-green-800'
          : 'bg-red-50 border border-red-200 text-red-800'
      }`}
    >
      {text}
    </div>
  );
}
