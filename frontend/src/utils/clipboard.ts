/**
 * Универсальная функция для копирования текста в буфер обмена
 * Использует современный Clipboard API с fallback на старый метод
 * 
 * @param text - Текст для копирования
 * @returns Promise, который разрешается при успешном копировании
 * @throws Error, если копирование не удалось
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (!text) {
    throw new Error('Текст для копирования не может быть пустым');
  }

  // Проверяем доступность современного Clipboard API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (error) {
      // Если современный API не работает, пробуем fallback метод
      console.warn('Clipboard API failed, trying fallback method:', error);
    }
  }

  // Fallback метод для старых браузеров или небезопасных контекстов
  try {
    // Создаем временный textarea элемент
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-999999px';
    textarea.style.top = '-999999px';
    document.body.appendChild(textarea);
    
    // Выделяем текст
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    
    // Копируем через execCommand
    const successful = document.execCommand('copy');
    
    // Удаляем временный элемент
    document.body.removeChild(textarea);
    
    if (!successful) {
      throw new Error('execCommand("copy") failed');
    }
  } catch (error) {
    console.error('Fallback copy method failed:', error);
    throw new Error('Не удалось скопировать текст в буфер обмена. Убедитесь, что у браузера есть разрешение на доступ к буферу обмена.');
  }
}
