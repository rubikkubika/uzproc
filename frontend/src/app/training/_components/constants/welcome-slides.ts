import { Slide } from '../types/training.types';

export const WELCOME_SLIDES: Slide[] = [
  {
    id: 1,
    title: 'Добро пожаловать',
    htmlContent: `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;padding:40px;background:linear-gradient(135deg,#f8fafc 0%,#ede9fe 100%);">
        <div style="font-size:64px;margin-bottom:24px;">&#128075;</div>
        <h1 style="font-size:36px;font-weight:700;color:#1e293b;margin-bottom:16px;">Бизнес-процесс закупок<br/>в Uzum Market</h1>
        <p style="font-size:20px;color:#64748b;max-width:600px;">Обучающий курс для заказчиков, инициаторов и специалистов по закупкам</p>
        <div style="margin-top:32px;padding:16px 32px;background:#7c3aed;color:white;border-radius:12px;font-size:18px;font-weight:600;">Урок 1: Введение в процесс закупок</div>
        <p style="margin-top:20px;font-size:14px;color:#94a3b8;">На основе Регламента проведения закупочных процедур Uzum Market</p>
      </div>
    `,
    voiceoverText: 'Здравствуйте! Добро пожаловать в обучающий курс по бизнес-процессу закупок в компании Uzum Market. Этот курс предназначен для всех участников закупочного процесса — заказчиков, инициаторов закупок и специалистов отдела закупок. Мы подробно разберём весь процесс: от момента возникновения потребности до получения товара или услуги. Курс построен на основе действующего Регламента проведения закупочных процедур компании.',
  },
  {
    id: 2,
    title: 'Принципы закупок',
    htmlContent: `
      <div style="padding:40px;height:100%;display:flex;flex-direction:column;justify-content:center;">
        <h2 style="font-size:32px;font-weight:700;color:#1e293b;margin-bottom:32px;">Принципы закупочной деятельности</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
          <div style="background:#f8fafc;border-radius:12px;padding:22px;border-left:4px solid #7c3aed;">
            <div style="font-size:24px;margin-bottom:8px;">&#128269;</div>
            <h3 style="font-size:17px;font-weight:600;color:#1e293b;margin-bottom:8px;">Прозрачность</h3>
            <p style="font-size:13px;color:#64748b;">Все этапы закупки фиксируются. Каждый участник видит статус и историю решений</p>
          </div>
          <div style="background:#f8fafc;border-radius:12px;padding:22px;border-left:4px solid #2563eb;">
            <div style="font-size:24px;margin-bottom:8px;">&#9878;</div>
            <h3 style="font-size:17px;font-weight:600;color:#1e293b;margin-bottom:8px;">Конкурентность</h3>
            <p style="font-size:13px;color:#64748b;">Обязательное сравнение предложений от нескольких поставщиков для лучших условий</p>
          </div>
          <div style="background:#f8fafc;border-radius:12px;padding:22px;border-left:4px solid #059669;">
            <div style="font-size:24px;margin-bottom:8px;">&#128101;</div>
            <h3 style="font-size:17px;font-weight:600;color:#1e293b;margin-bottom:8px;">Коллегиальность</h3>
            <p style="font-size:13px;color:#64748b;">Ключевые решения принимаются коллегиально — Комитетом по закупкам или рабочей группой</p>
          </div>
          <div style="background:#f8fafc;border-radius:12px;padding:22px;border-left:4px solid #d97706;">
            <div style="font-size:24px;margin-bottom:8px;">&#128274;</div>
            <h3 style="font-size:17px;font-weight:600;color:#1e293b;margin-bottom:8px;">Конфиденциальность</h3>
            <p style="font-size:13px;color:#64748b;">Информация о ценах и условиях поставщиков строго конфиденциальна до подведения итогов</p>
          </div>
        </div>
        <div style="margin-top:24px;background:#fef3c7;border-radius:12px;padding:16px 20px;border-left:4px solid #f59e0b;">
          <p style="font-size:14px;color:#92400e;margin:0;"><strong>Важно:</strong> Заявки подаются <strong>ТОЛЬКО через 1С</strong> — не через мессенджеры, email или устно. Запрещено дробление закупок для обхода пороговых сумм.</p>
        </div>
      </div>
    `,
    voiceoverText: 'Закупочная деятельность в Uzum Market строится на четырёх ключевых принципах. Первый — прозрачность: все этапы закупки фиксируются, и каждый участник видит текущий статус. Второй — конкурентность: мы обязательно сравниваем предложения от нескольких поставщиков. Третий — коллегиальность: важные решения принимаются не одним человеком, а Комитетом по закупкам или рабочей группой. Четвёртый — конфиденциальность: информация о ценах и условиях поставщиков строго конфиденциальна до подведения итогов. И очень важное правило: все заявки подаются только через систему 1С — не через мессенджеры, email или устно. Также строго запрещено дробление закупок для обхода пороговых сумм.',
  },
  {
    id: 3,
    title: 'Участники процесса',
    htmlContent: `
      <div style="padding:32px;height:100%;display:flex;flex-direction:column;justify-content:center;">
        <h2 style="font-size:30px;font-weight:700;color:#1e293b;margin-bottom:24px;">Участники процесса закупок</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;">
          <div style="background:linear-gradient(135deg,#ede9fe,#ddd6fe);border-radius:14px;padding:20px;text-align:center;">
            <div style="width:48px;height:48px;background:#7c3aed;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:20px;color:white;">&#128100;</div>
            <h3 style="font-size:16px;font-weight:700;color:#5b21b6;margin-bottom:6px;">Заказчик</h3>
            <p style="font-size:12px;color:#4c1d95;margin-bottom:8px;">Руководитель подразделения</p>
            <ul style="text-align:left;font-size:11px;color:#4c1d95;list-style:none;padding:0;margin:0;">
              <li style="padding:3px 0;">&#8226; Утверждает потребность</li>
              <li style="padding:3px 0;">&#8226; Согласует бюджет</li>
              <li style="padding:3px 0;">&#8226; Принимает результат</li>
            </ul>
          </div>
          <div style="background:linear-gradient(135deg,#dbeafe,#bfdbfe);border-radius:14px;padding:20px;text-align:center;">
            <div style="width:48px;height:48px;background:#2563eb;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:20px;color:white;">&#128221;</div>
            <h3 style="font-size:16px;font-weight:700;color:#1e40af;margin-bottom:6px;">Инициатор</h3>
            <p style="font-size:12px;color:#1e3a5f;margin-bottom:8px;">Любой сотрудник</p>
            <ul style="text-align:left;font-size:11px;color:#1e3a5f;list-style:none;padding:0;margin:0;">
              <li style="padding:3px 0;">&#8226; Определяет потребность</li>
              <li style="padding:3px 0;">&#8226; Создаёт заявку в 1С</li>
              <li style="padding:3px 0;">&#8226; Отслеживает статус</li>
            </ul>
          </div>
          <div style="background:linear-gradient(135deg,#dcfce7,#bbf7d0);border-radius:14px;padding:20px;text-align:center;">
            <div style="width:48px;height:48px;background:#059669;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:20px;color:white;">&#128188;</div>
            <h3 style="font-size:16px;font-weight:700;color:#065f46;margin-bottom:6px;">Закупщик</h3>
            <p style="font-size:12px;color:#064e3b;margin-bottom:8px;">Отдел закупок</p>
            <ul style="text-align:left;font-size:11px;color:#064e3b;list-style:none;padding:0;margin:0;">
              <li style="padding:3px 0;">&#8226; Проводит процедуру</li>
              <li style="padding:3px 0;">&#8226; Выбирает поставщика</li>
              <li style="padding:3px 0;">&#8226; Оформляет договор</li>
            </ul>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;">
          <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:14px;padding:18px;text-align:center;">
            <div style="width:48px;height:48px;background:#d97706;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:20px;color:white;">&#128101;</div>
            <h3 style="font-size:16px;font-weight:700;color:#92400e;margin-bottom:6px;">Рабочая группа</h3>
            <p style="font-size:11px;color:#78350f;">Эксперты для оценки предложений при упрощённых и полноформатных закупках</p>
          </div>
          <div style="background:linear-gradient(135deg,#fce7f3,#fbcfe8);border-radius:14px;padding:18px;text-align:center;">
            <div style="width:48px;height:48px;background:#db2777;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:20px;color:white;">&#127970;</div>
            <h3 style="font-size:16px;font-weight:700;color:#9d174d;margin-bottom:6px;">Комитет по закупкам</h3>
            <p style="font-size:11px;color:#831843;">Утверждает закупки свыше 360 млн сум. Коллегиальный орган из руководителей</p>
          </div>
        </div>
      </div>
    `,
    voiceoverText: 'В процессе закупок участвуют пять ключевых ролей. Заказчик — это руководитель подразделения, который утверждает потребность и согласует бюджет. Инициатор — любой сотрудник, у которого возникла потребность: он создаёт заявку в системе 1С. Закупщик — специалист отдела закупок, который проводит закупочную процедуру, выбирает поставщика и оформляет договор. Рабочая группа — это эксперты, которые привлекаются для оценки предложений поставщиков при упрощённых и полноформатных закупках. И наконец, Комитет по закупкам — коллегиальный орган из руководителей, который утверждает крупные закупки свыше 360 миллионов сум.',
  },
  {
    id: 4,
    title: 'Виды и этапы закупок',
    htmlContent: `
      <div style="padding:28px 36px;height:100%;display:flex;flex-direction:column;justify-content:center;">
        <h2 style="font-size:28px;font-weight:700;color:#1e293b;margin-bottom:20px;">Виды закупок по стоимости</h2>
        <div style="display:flex;gap:14px;margin-bottom:24px;">
          <div style="flex:1;background:#f0fdf4;border:2px solid #86efac;border-radius:12px;padding:16px;text-align:center;">
            <div style="font-size:14px;font-weight:700;color:#059669;margin-bottom:4px;">Низкостоимостная</div>
            <div style="font-size:22px;font-weight:800;color:#065f46;">0 — 6 млн</div>
            <div style="font-size:11px;color:#064e3b;margin-top:6px;">Инициатор сам выбирает поставщика</div>
            <div style="font-size:10px;color:#6b7280;margin-top:4px;">до 3 дней</div>
          </div>
          <div style="flex:1;background:#eff6ff;border:2px solid #93c5fd;border-radius:12px;padding:16px;text-align:center;">
            <div style="font-size:14px;font-weight:700;color:#2563eb;margin-bottom:4px;">Упрощённая</div>
            <div style="font-size:22px;font-weight:800;color:#1e40af;">6 — 360 млн</div>
            <div style="font-size:11px;color:#1e3a5f;margin-top:6px;">Закупщик проводит процедуру</div>
            <div style="font-size:10px;color:#6b7280;margin-top:4px;">до 7 дней</div>
          </div>
          <div style="flex:1;background:#fdf4ff;border:2px solid #d8b4fe;border-radius:12px;padding:16px;text-align:center;">
            <div style="font-size:14px;font-weight:700;color:#7c3aed;margin-bottom:4px;">Полноформатная</div>
            <div style="font-size:22px;font-weight:800;color:#5b21b6;">360 млн +</div>
            <div style="font-size:11px;color:#4c1d95;margin-top:6px;">Комитет по закупкам утверждает</div>
            <div style="font-size:10px;color:#6b7280;margin-top:4px;">до 15 дней</div>
          </div>
        </div>
        <h2 style="font-size:22px;font-weight:700;color:#1e293b;margin-bottom:14px;">8 этапов закупочного процесса</h2>
        <div style="display:flex;align-items:center;justify-content:center;gap:4px;flex-wrap:wrap;">
          <div style="background:#7c3aed;color:white;padding:10px 8px;border-radius:10px;text-align:center;width:100px;">
            <div style="font-size:16px;font-weight:700;">1</div>
            <div style="font-size:10px;font-weight:600;">Потребность</div>
          </div>
          <div style="font-size:16px;color:#cbd5e1;">&#10132;</div>
          <div style="background:#2563eb;color:white;padding:10px 8px;border-radius:10px;text-align:center;width:100px;">
            <div style="font-size:16px;font-weight:700;">2</div>
            <div style="font-size:10px;font-weight:600;">Заявка в 1С</div>
          </div>
          <div style="font-size:16px;color:#cbd5e1;">&#10132;</div>
          <div style="background:#0891b2;color:white;padding:10px 8px;border-radius:10px;text-align:center;width:100px;">
            <div style="font-size:16px;font-weight:700;">3</div>
            <div style="font-size:10px;font-weight:600;">Процедура</div>
          </div>
          <div style="font-size:16px;color:#cbd5e1;">&#10132;</div>
          <div style="background:#059669;color:white;padding:10px 8px;border-radius:10px;text-align:center;width:100px;">
            <div style="font-size:16px;font-weight:700;">4</div>
            <div style="font-size:10px;font-weight:600;">Выбор поставщика</div>
          </div>
          <div style="font-size:16px;color:#cbd5e1;">&#10132;</div>
          <div style="background:#d97706;color:white;padding:10px 8px;border-radius:10px;text-align:center;width:100px;">
            <div style="font-size:16px;font-weight:700;">5</div>
            <div style="font-size:10px;font-weight:600;">Договор</div>
          </div>
          <div style="font-size:16px;color:#cbd5e1;">&#10132;</div>
          <div style="background:#dc2626;color:white;padding:10px 8px;border-radius:10px;text-align:center;width:100px;">
            <div style="font-size:16px;font-weight:700;">6</div>
            <div style="font-size:10px;font-weight:600;">Заказ</div>
          </div>
          <div style="font-size:16px;color:#cbd5e1;">&#10132;</div>
          <div style="background:#4f46e5;color:white;padding:10px 8px;border-radius:10px;text-align:center;width:100px;">
            <div style="font-size:16px;font-weight:700;">7</div>
            <div style="font-size:10px;font-weight:600;">Поставка</div>
          </div>
          <div style="font-size:16px;color:#cbd5e1;">&#10132;</div>
          <div style="background:#0f766e;color:white;padding:10px 8px;border-radius:10px;text-align:center;width:100px;">
            <div style="font-size:16px;font-weight:700;">8</div>
            <div style="font-size:10px;font-weight:600;">Оплата</div>
          </div>
        </div>
      </div>
    `,
    voiceoverText: 'В Uzum Market существует три вида закупок в зависимости от суммы. Низкостоимостная — до 6 миллионов сум: инициатор сам выбирает поставщика, срок до 3 дней. Упрощённая — от 6 до 360 миллионов сум: закупку проводит специалист отдела закупок, срок до 7 дней. И полноформатная — свыше 360 миллионов сум: решение утверждает Комитет по закупкам, срок до 15 дней. Сам закупочный процесс состоит из восьми этапов: определение потребности, подача заявки через 1С, проведение закупочной процедуры, выбор поставщика, подписание договора, оформление заказа, поставка товара или услуги и, наконец, оплата.',
  },
  {
    id: 5,
    title: 'Форматы и правила',
    htmlContent: `
      <div style="padding:32px 40px;height:100%;display:flex;flex-direction:column;justify-content:center;">
        <h2 style="font-size:28px;font-weight:700;color:#1e293b;margin-bottom:24px;">Форматы закупочных процедур</h2>
        <div style="display:flex;gap:16px;margin-bottom:28px;">
          <div style="flex:1;background:#f8fafc;border-radius:12px;padding:20px;border-top:4px solid #2563eb;">
            <h3 style="font-size:16px;font-weight:700;color:#1e40af;margin-bottom:8px;">&#128196; Запрос цен</h3>
            <p style="font-size:12px;color:#64748b;">Сбор коммерческих предложений от поставщиков. Выбор по лучшей цене и условиям</p>
          </div>
          <div style="flex:1;background:#f8fafc;border-radius:12px;padding:20px;border-top:4px solid #7c3aed;">
            <h3 style="font-size:16px;font-weight:700;color:#5b21b6;margin-bottom:8px;">&#127942; Конкурс</h3>
            <p style="font-size:12px;color:#64748b;">Комплексная оценка по нескольким критериям: цена, качество, сроки, опыт поставщика</p>
          </div>
          <div style="flex:1;background:#f8fafc;border-radius:12px;padding:20px;border-top:4px solid #d97706;">
            <h3 style="font-size:16px;font-weight:700;color:#92400e;margin-bottom:8px;">&#128273; ЗуЕИ</h3>
            <p style="font-size:12px;color:#64748b;">Закупка у единственного источника — когда поставщик уникален или есть срочная необходимость</p>
          </div>
        </div>
        <h2 style="font-size:22px;font-weight:700;color:#1e293b;margin-bottom:16px;">Ключевые правила</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div style="background:#fef2f2;border-radius:10px;padding:14px;display:flex;align-items:start;gap:10px;">
            <span style="font-size:20px;flex-shrink:0;">&#9940;</span>
            <div>
              <div style="font-size:13px;font-weight:600;color:#991b1b;">Запрет дробления</div>
              <div style="font-size:11px;color:#7f1d1d;">Нельзя разбивать закупку на части для обхода пороговых сумм</div>
            </div>
          </div>
          <div style="background:#f0fdf4;border-radius:10px;padding:14px;display:flex;align-items:start;gap:10px;">
            <span style="font-size:20px;flex-shrink:0;">&#128197;</span>
            <div>
              <div style="font-size:13px;font-weight:600;color:#166534;">Планирование</div>
              <div style="font-size:11px;color:#14532d;">Ежегодный план закупок формируется до ноября предыдущего года</div>
            </div>
          </div>
          <div style="background:#eff6ff;border-radius:10px;padding:14px;display:flex;align-items:start;gap:10px;">
            <span style="font-size:20px;flex-shrink:0;">&#128187;</span>
            <div>
              <div style="font-size:13px;font-weight:600;color:#1e40af;">Только через 1С</div>
              <div style="font-size:11px;color:#1e3a5f;">Все заявки оформляются исключительно через систему 1С</div>
            </div>
          </div>
          <div style="background:#fdf4ff;border-radius:10px;padding:14px;display:flex;align-items:start;gap:10px;">
            <span style="font-size:20px;flex-shrink:0;">&#128203;</span>
            <div>
              <div style="font-size:13px;font-weight:600;color:#6b21a8;">Техзадание</div>
              <div style="font-size:11px;color:#581c87;">К заявке обязательно прикладывается ТЗ с чёткими требованиями</div>
            </div>
          </div>
        </div>
      </div>
    `,
    voiceoverText: 'В Uzum Market используются три формата закупочных процедур. Запрос цен — когда мы собираем коммерческие предложения от поставщиков и выбираем лучшее по цене и условиям. Конкурс — комплексная оценка по нескольким критериям: цена, качество, сроки и опыт поставщика. И закупка у единственного источника — когда поставщик уникален или есть срочная необходимость. Теперь о ключевых правилах. Первое — запрет дробления: нельзя разбивать закупку на части, чтобы обойти пороговые суммы. Второе — планирование: ежегодный план закупок формируется до ноября предыдущего года. Третье — все заявки оформляются исключительно через систему 1С, никаких мессенджеров или устных договорённостей. И четвёртое — к каждой заявке обязательно прикладывается техническое задание с чёткими требованиями.',
  },
  {
    id: 6,
    title: 'Что дальше?',
    htmlContent: `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;padding:40px;background:linear-gradient(135deg,#f8fafc 0%,#ede9fe 100%);">
        <div style="font-size:64px;margin-bottom:24px;">&#127891;</div>
        <h2 style="font-size:36px;font-weight:700;color:#1e293b;margin-bottom:16px;">Что дальше?</h2>
        <p style="font-size:18px;color:#64748b;max-width:520px;margin-bottom:32px;">В следующих уроках мы подробно разберём каждый этап с реальными примерами из практики Uzum Market</p>
        <div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center;">
          <div style="padding:14px 24px;background:white;border:2px solid #e2e8f0;border-radius:12px;font-size:14px;color:#475569;min-width:200px;">
            <div style="font-weight:700;color:#7c3aed;margin-bottom:4px;">Урок 2</div>
            Как создать заявку в 1С
          </div>
          <div style="padding:14px 24px;background:white;border:2px solid #e2e8f0;border-radius:12px;font-size:14px;color:#475569;min-width:200px;">
            <div style="font-weight:700;color:#2563eb;margin-bottom:4px;">Урок 3</div>
            Закупочные процедуры и выбор поставщика
          </div>
          <div style="padding:14px 24px;background:white;border:2px solid #e2e8f0;border-radius:12px;font-size:14px;color:#475569;min-width:200px;">
            <div style="font-weight:700;color:#059669;margin-bottom:4px;">Урок 4</div>
            Договоры, поставки и оплаты
          </div>
        </div>
        <div style="margin-top:28px;padding:12px 24px;background:#ede9fe;border-radius:10px;">
          <p style="font-size:13px;color:#5b21b6;margin:0;">&#128161; Запомните: потребность &#8594; заявка в 1С &#8594; процедура &#8594; поставщик &#8594; договор &#8594; заказ &#8594; поставка &#8594; оплата</p>
        </div>
      </div>
    `,
    voiceoverText: 'Отлично! Теперь вы знаете основы закупочного процесса в Uzum Market: четыре принципа закупочной деятельности, пять ключевых ролей участников, три вида закупок по стоимости, три формата процедур и восемь этапов от потребности до оплаты. Запомните главное: все заявки — только через 1С, дробление закупок запрещено, план формируется до ноября. В следующих уроках мы детально разберём каждый этап: как правильно создать заявку, как проходит закупочная процедура, как выбирается поставщик и как оформляются договоры и оплаты. До встречи в следующем уроке!',
  },
];
