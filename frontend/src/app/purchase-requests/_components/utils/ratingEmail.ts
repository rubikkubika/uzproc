import { copyToClipboard } from '@/utils/clipboard';

/**
 * Загружает SVG логотип и конвертирует в PNG base64 для лучшей совместимости с Outlook
 * Outlook не поддерживает SVG, поэтому конвертируем в PNG
 */
async function loadLogoAsBase64(): Promise<string> {
  try {
    const logoUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/images/logo-small.svg`
      : '/images/logo-small.svg';
    
    // Создаем временный img элемент для загрузки SVG
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        try {
          // Создаем canvas для конвертации SVG в PNG
          const canvas = document.createElement('canvas');
          canvas.width = 34;
          canvas.height = 34;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            // Рисуем изображение на canvas
            ctx.drawImage(img, 0, 0, 34, 34);
            resolve();
          } else {
            reject(new Error('Не удалось получить контекст canvas'));
          }
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Не удалось загрузить изображение'));
      img.src = logoUrl;
    });
    
    // Возвращаем base64 после успешной загрузки
    const canvas = document.createElement('canvas');
    canvas.width = 34;
    canvas.height = 34;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          ctx.drawImage(img, 0, 0, 34, 34);
          resolve();
        };
        img.onerror = () => reject(new Error('Не удалось загрузить изображение'));
        img.src = logoUrl;
      });
      return canvas.toDataURL('image/png');
    }
    return '';
  } catch (logoError) {
    console.warn('Не удалось загрузить и конвертировать логотип, используем без него:', logoError);
    return '';
  }
}

/**
 * Создает HTML с логотипом и названием для вставки в начало письма
 * Использует явные стили с !important для единообразия на всех окружениях
 * Добавляет mso- стили для совместимости с Outlook
 */
function createLogoHtml(logoBase64: string): string {
  if (logoBase64) {
    return `<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, sans-serif !important; margin: 0 !important; margin-bottom: 16px !important; padding: 0 !important; border-collapse: collapse !important; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
  <tr>
    <td style="padding: 0 !important; padding-right: 8px !important; vertical-align: middle !important; font-family: Arial, sans-serif !important; color: #000000 !important; mso-line-height-rule: exactly;">
      <img src="${logoBase64}" alt="uzProc" style="width: 34px !important; height: 34px !important; display: block !important; margin: 0 !important; padding: 0 !important; border: none !important;" />
    </td>
    <td style="padding: 0 !important; vertical-align: middle !important; font-family: Arial, sans-serif !important; color: #000000 !important; mso-line-height-rule: exactly;">
      <span style="font-weight: bold !important; font-size: 19pt !important; color: #000000 !important; margin: 0 !important; padding: 0 !important; mso-line-height-rule: exactly;">uzProc</span>
    </td>
  </tr>
</table>`;
  }
  
  return `<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, sans-serif !important; margin: 0 !important; margin-bottom: 16px !important; padding: 0 !important; border-collapse: collapse !important; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
  <tr>
    <td style="padding: 0 !important; vertical-align: middle !important; font-family: Arial, sans-serif !important; color: #000000 !important; mso-line-height-rule: exactly;">
      <span style="font-weight: bold !important; font-size: 19pt !important; color: #000000 !important; margin: 0 !important; padding: 0 !important; mso-line-height-rule: exactly;">uzProc</span>
    </td>
  </tr>
</table>`;
}

/**
 * Преобразует текст письма в HTML с явными стилями для единообразия
 * Использует единые стили для всех окружений (локальное и деплой)
 * Использует <p> вместо <div> для лучшей совместимости с Outlook
 */
function convertTextToHtml(emailText: string): string {
  const textLines = emailText.split('\n');
  return textLines
    .map(line => {
      if (line.trim() === '') {
        return '<p style="margin: 0 !important; padding: 0 !important; font-family: Arial, sans-serif !important; font-size: 11pt !important; line-height: 1.5 !important; color: #000000 !important; mso-line-height-rule: exactly; mso-margin-top-alt: 0; mso-margin-bottom-alt: 0;">&nbsp;</p>';
      }
      // Экранируем HTML символы
      const escaped = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      // Каждая строка в отдельном <p> с явными стилями и !important для единообразия
      // Используем <p> вместо <div> для лучшей совместимости с Outlook
      return `<p style="margin: 0 !important; padding: 0 !important; font-family: Arial, sans-serif !important; font-size: 11pt !important; line-height: 1.5 !important; color: #000000 !important; mso-line-height-rule: exactly; mso-margin-top-alt: 0; mso-margin-bottom-alt: 0;">${escaped}</p>`;
    })
    .join('');
}

/**
 * Создает полный HTML с явными стилями для единообразия на всех окружениях
 * Все стили должны быть inline для максимальной совместимости с Outlook
 * Добавляет mso- стили для совместимости с Outlook
 */
function createFullHtml(logoHtml: string, htmlText: string): string {
  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!--[if mso]>
  <style type="text/css">
    body, table, td, div, p, span {
      font-family: Arial, sans-serif !important;
      font-size: 11pt !important;
      line-height: 1.5 !important;
      color: #000000 !important;
    }
  </style>
  <![endif]-->
  <style type="text/css">
    body, table, td, div, p, span {
      font-family: Arial, sans-serif !important;
      font-size: 11pt !important;
      line-height: 1.5 !important;
      color: #000000 !important;
    }
  </style>
</head>
<body style="margin: 0 !important; padding: 0 !important; font-family: Arial, sans-serif !important; font-size: 11pt !important; line-height: 1.5 !important; color: #000000 !important; background-color: #ffffff !important; mso-line-height-rule: exactly;">
  ${logoHtml}
  <div style="font-family: Arial, sans-serif !important; font-size: 11pt !important; line-height: 1.5 !important; color: #000000 !important; margin: 0 !important; padding: 0 !important; mso-line-height-rule: exactly;">
    ${htmlText}
  </div>
</body>
</html>`;
}

/**
 * Копирует письмо с форматированием в буфер обмена
 * Использует ClipboardItem API с fallback на execCommand и текстовый fallback
 */
export async function copyRatingEmail(emailText: string): Promise<void> {
  try {
    // Загружаем SVG логотип и конвертируем в PNG base64 для лучшей совместимости с Outlook
    const logoBase64 = await loadLogoAsBase64();
    
    // Создаем HTML с логотипом и названием для вставки в начало письма
    const logoHtml = createLogoHtml(logoBase64);
    
    // Преобразуем текст письма в HTML с явными стилями для единообразия
    const htmlText = convertTextToHtml(emailText);
    
    // Создаем полный HTML с явными стилями для единообразия на всех окружениях
    const fullHtml = createFullHtml(logoHtml, htmlText);
    
    // Пытаемся скопировать HTML через ClipboardItem API
    if (navigator.clipboard && window.ClipboardItem) {
      try {
        const htmlBlob = new Blob([fullHtml], { type: 'text/html' });
        const textBlob = new Blob([emailText], { type: 'text/plain' });
        const clipboardItem = new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob
        });
        await navigator.clipboard.write([clipboardItem]);
        alert('Письмо с логотипом скопировано в буфер обмена');
        return;
      } catch (clipboardErr) {
        console.warn('ClipboardItem API failed, trying fallback:', clipboardErr);
      }
    }
    
    // Fallback: используем старый метод через временный элемент
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = fullHtml;
    tempDiv.style.position = 'fixed';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);
    
    const range = document.createRange();
    range.selectNodeContents(tempDiv);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
      
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          alert('Письмо с логотипом скопировано в буфер обмена');
        } else {
          throw new Error('execCommand failed');
        }
      } catch (execErr) {
        console.error('execCommand failed:', execErr);
        // Последний fallback: копируем только текст
        await copyToClipboard(emailText);
        alert('Письмо скопировано в буфер обмена (без форматирования)');
      }
      
      selection.removeAllRanges();
    }
    
    document.body.removeChild(tempDiv);
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    // Fallback: копируем только текст
    try {
      await copyToClipboard(emailText);
      alert('Письмо скопировано в буфер обмена (без форматирования)');
    } catch (textErr) {
      throw new Error(error instanceof Error ? error.message : 'Не удалось скопировать письмо');
    }
  }
}
