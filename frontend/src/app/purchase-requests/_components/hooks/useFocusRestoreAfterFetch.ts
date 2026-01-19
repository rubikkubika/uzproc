import { useEffect, useRef } from 'react';

interface UseFocusRestoreAfterFetchProps {
  focusedField: string | null;
  loading: boolean;
  data: unknown;
}

/**
 * Хук для восстановления фокуса в поле фильтра после загрузки данных
 *
 * Восстанавливает фокус ТОЛЬКО:
 * - После завершения загрузки данных (loading становится false)
 * - Если есть focusedField (пользователь вводил в фильтр)
 * - Если пользователь не переключился на другой элемент во время загрузки
 */
export function useFocusRestoreAfterFetch({
  focusedField,
  loading,
  data,
}: UseFocusRestoreAfterFetchProps) {
  // Ref для отслеживания, был ли фокус во время загрузки
  const hadFocusDuringLoading = useRef<string | null>(null);
  // Флаг для предотвращения повторной установки каретки
  const restoredOnce = useRef<boolean>(false);

  // Запоминаем поле, в котором был фокус, когда началась загрузка
  useEffect(() => {
    if (loading && focusedField) {
      hadFocusDuringLoading.current = focusedField;
      // Сбрасываем флаг при начале новой загрузки
      restoredOnce.current = false;
    }
  }, [loading, focusedField]);

  // Восстанавливаем фокус после загрузки данных
  useEffect(() => {
    if (!loading && hadFocusDuringLoading.current && !restoredOnce.current) {
      const fieldToRestore = hadFocusDuringLoading.current;

      // Небольшая задержка, чтобы дать таблице отрендериться
      setTimeout(() => {
        const input = document.querySelector(`input[data-filter-field="${fieldToRestore}"]`) as HTMLInputElement;

        // Восстанавливаем фокус только если:
        // 1. Инпут существует
        // 2. Активный элемент не является другим интерактивным контролом
        //    (т.е. пользователь не переключился во время загрузки)
        const activeElement = document.activeElement;
        const isInteractiveElement = activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'SELECT' ||
          activeElement.tagName === 'BUTTON' ||
          (activeElement as HTMLElement).contentEditable === 'true'
        );

        if (input && !isInteractiveElement) {
          // КРИТИЧЕСКИ ВАЖНО: устанавливаем позицию курсора ДО установки фокуса
          // Это предотвращает "мигание" каретки в начале текста
          // ВСЕГДА ставим каретку в КОНЕЦ текущего значения input
          const endPosition = input.value.length;
          input.setSelectionRange(endPosition, endPosition);

          // Теперь устанавливаем фокус - каретка уже будет в конце текста
          input.focus();

          // Устанавливаем флаг, что восстановление произошло
          restoredOnce.current = true;
        }

        // Сбрасываем флаг после восстановления
        hadFocusDuringLoading.current = null;
      }, 100); // 100мс задержка для рендера таблицы
    }
  }, [loading, data]); // Зависимость от data гарантирует, что эффект сработает после обновления данных
}
