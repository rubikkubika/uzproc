import { Slide } from '../types/training.types';

export const COURSE_SLIDES: Slide[] = [
  // ─────────────────────────────────────────────
  // БЛОК 1 — ВВЕДЕНИЕ (2 слайда)
  // ─────────────────────────────────────────────
  {
    id: 1,
    block: 'intro',
    title: 'Добро пожаловать',
    voiceoverText:
      'Добро пожаловать на курс по корпоративным закупкам. Этот курс создан для всех сотрудников, участвующих в процессе закупок: инициаторов, руководителей и сотрудников смежных подразделений. Всего 30 минут, и вы будете уверенно ориентироваться в процессе. Мы разберём, как устроена закупка, кто в ней участвует и как правильно составлять заявки в 1С. Поехали!',
    htmlContent: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; height: 100%; min-height: 440px; display: flex; flex-direction: column; padding: 36px 44px; box-sizing: border-box;">

        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 28px;">
          <div style="width: 6px; height: 6px; border-radius: 50%; background: #7C3AED;"></div>
          <span style="font-size: 11px; font-weight: 700; color: #7C3AED; letter-spacing: 1.5px; text-transform: uppercase;">Блок 1 · Введение</span>
        </div>

        <h1 style="margin: 0 0 32px; font-size: 34px; font-weight: 800; color: #111827; line-height: 1.15;">
          Курс по процессу<br>закупок
        </h1>

        <div style="display: flex; gap: 24px; flex: 1;">

          <div style="flex: 1; background: #F5F3FF; border-radius: 16px; padding: 24px 28px;">
            <div style="font-size: 12px; font-weight: 700; color: #7C3AED; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 18px;">Что вы узнаете</div>
            <div style="display: flex; flex-direction: column; gap: 14px;">
              ${[
                'Кто участвует в закупке и за что отвечает',
                'Полный road map — от заявки до договора',
                'Ключевые сроки и от чего они зависят',
                'Как правильно составить заявку и ТЗ в 1С',
              ].map((text, i) => `
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                  <div style="flex-shrink: 0; width: 28px; height: 28px; border-radius: 8px; background: #7C3AED; color: white; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">${i + 1}</div>
                  <span style="font-size: 14px; color: #374151; line-height: 1.5; padding-top: 4px;">${text}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div style="width: 180px; flex-shrink: 0; display: flex; flex-direction: column; gap: 12px;">
            <div style="flex: 1; background: #111827; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
              <div style="font-size: 48px; font-weight: 900; color: #A78BFA;">3</div>
              <div style="font-size: 13px; color: #9CA3AF; margin-top: 4px;">блока</div>
            </div>
            <div style="flex: 1; background: #1E1B4B; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
              <div style="font-size: 48px; font-weight: 900; color: #A78BFA;">18</div>
              <div style="font-size: 13px; color: #9CA3AF; margin-top: 4px;">слайдов</div>
            </div>
            <div style="flex: 1; background: #4C1D95; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
              <div style="font-size: 48px; font-weight: 900; color: white;">30</div>
              <div style="font-size: 13px; color: #C4B5FD; margin-top: 4px;">минут</div>
            </div>
          </div>
        </div>

      </div>
    `,
  },

  {
    id: 2,
    block: 'intro',
    title: 'Зачем это знать?',
    voiceoverText:
      'Прежде чем переходить к деталям, давайте разберёмся — зачем знать процесс закупки? Во-первых, закупка — это не просто «отправить заявку». Это совместная работа нескольких сторон. Чем лучше каждый участник понимает процесс, тем быстрее результат. Во-вторых, ошибки на старте — неполное ТЗ, неверные сроки, нечёткие требования — это задержки и проблемы с поставщиком. В-третьих, зная этапы, можно реально планировать потребности и не оказываться в ситуации «нужно срочно».',
    htmlContent: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; height: 100%; min-height: 440px; display: flex; flex-direction: column; padding: 36px 44px; box-sizing: border-box;">

        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
          <div style="width: 6px; height: 6px; border-radius: 50%; background: #7C3AED;"></div>
          <span style="font-size: 11px; font-weight: 700; color: #7C3AED; letter-spacing: 1.5px; text-transform: uppercase;">Блок 1 · Введение</span>
        </div>

        <h2 style="margin: 0 0 28px; font-size: 32px; font-weight: 800; color: #111827; line-height: 1.2;">Зачем это знать?</h2>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; flex: 1; margin-bottom: 20px;">

          <div style="background: #F5F3FF; border: 1.5px solid #DDD6FE; border-radius: 16px; padding: 24px 20px; display: flex; flex-direction: column;">
            <div style="font-size: 15px; font-weight: 700; color: #5B21B6; margin-bottom: 8px; line-height: 1.3;">Закупка — это командная работа</div>
            <div style="font-size: 13px; color: #4C1D95; line-height: 1.65; flex: 1;">Чем лучше вы понимаете процесс — тем быстрее и качественнее результат.</div>
          </div>

          <div style="background: #F5F3FF; border: 1.5px solid #DDD6FE; border-radius: 16px; padding: 24px 20px; display: flex; flex-direction: column;">
            <div style="font-size: 15px; font-weight: 700; color: #5B21B6; margin-bottom: 8px; line-height: 1.3;">Ошибки на старте = задержки в конце</div>
            <div style="font-size: 13px; color: #4C1D95; line-height: 1.65; flex: 1;">Неполное ТЗ, нечёткие требования — всё это затягивает закупку на недели.</div>
          </div>

          <div style="background: #F5F3FF; border: 1.5px solid #DDD6FE; border-radius: 16px; padding: 24px 20px; display: flex; flex-direction: column;">
            <div style="font-size: 15px; font-weight: 700; color: #5B21B6; margin-bottom: 8px; line-height: 1.3;">Планирование — главный инструмент</div>
            <div style="font-size: 13px; color: #4C1D95; line-height: 1.65; flex: 1;">Зная сроки, вы не попадёте в ситуацию «нужно срочно, а займёт 2 недели».</div>
          </div>

        </div>

        <div style="background: #4C1D95; border-radius: 14px; padding: 20px 28px;">
          <div style="font-size: 13px; font-weight: 700; color: #DDD6FE; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Цель курса</div>
          <div style="font-size: 14px; color: white; line-height: 1.6;">После курса вы будете понимать процесс закупки от начала до конца и знать, что происходит на каждом этапе.</div>
        </div>

      </div>
    `,
  },

  // ─────────────────────────────────────────────
  // БЛОК 2 — ROAD MAP ЭТАПОВ (11 слайдов)
  // ─────────────────────────────────────────────
  {
    id: 3,
    block: 'roadmap',
    title: 'Кто участвует в закупке',
    voiceoverText:
      'В каждой закупке участвуют три стороны. Первая — инициатор. Он формирует потребность, готовит заявку и техническое задание, согласовывает итоги. Вторая — отдел закупок. Закупщик проводит процедуру: ищет поставщиков, анализирует рынок, организует отбор. Третья — закупочный комитет. Это коллегиальный орган, который принимает финальное решение о выборе поставщика для крупных закупок. Все три стороны — полноценные участники процесса, и от качества работы каждого зависит результат.',
    htmlContent: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; height: 100%; min-height: 440px; display: flex; flex-direction: column; padding: 36px 44px; box-sizing: border-box;">

        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
          <div style="width: 6px; height: 6px; border-radius: 50%; background: #059669;"></div>
          <span style="font-size: 11px; font-weight: 700; color: #059669; letter-spacing: 1.5px; text-transform: uppercase;">Блок 2 · Road Map</span>
        </div>

        <h2 style="margin: 0 0 28px; font-size: 32px; font-weight: 800; color: #111827; line-height: 1.2;">Кто участвует<br>в закупке</h2>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; flex: 1;">

          <div style="background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: 16px; padding: 24px 20px; display: flex; flex-direction: column;">
            <div style="font-size: 15px; font-weight: 700; color: #14532D; margin-bottom: 10px;">Инициатор</div>
            <div style="font-size: 12px; font-weight: 600; color: #059669; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">Подразделение</div>
            <div style="display: flex; flex-direction: column; gap: 7px; flex: 1;">
              <div style="font-size: 13px; color: #166534; display: flex; gap: 7px;"><span style="color: #059669; font-weight: 700; flex-shrink: 0;">→</span>Формирует потребность</div>
              <div style="font-size: 13px; color: #166534; display: flex; gap: 7px;"><span style="color: #059669; font-weight: 700; flex-shrink: 0;">→</span>Готовит заявку и ТЗ</div>
              <div style="font-size: 13px; color: #166534; display: flex; gap: 7px;"><span style="color: #059669; font-weight: 700; flex-shrink: 0;">→</span>Подписывает акты</div>
            </div>
          </div>

          <div style="background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: 16px; padding: 24px 20px; display: flex; flex-direction: column;">
            <div style="font-size: 15px; font-weight: 700; color: #14532D; margin-bottom: 10px;">Отдел закупок</div>
            <div style="font-size: 12px; font-weight: 600; color: #059669; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">Закупщик</div>
            <div style="display: flex; flex-direction: column; gap: 7px; flex: 1;">
              <div style="font-size: 13px; color: #166534; display: flex; gap: 7px;"><span style="color: #059669; font-weight: 700; flex-shrink: 0;">→</span>Обрабатывает заявку</div>
              <div style="font-size: 13px; color: #166534; display: flex; gap: 7px;"><span style="color: #059669; font-weight: 700; flex-shrink: 0;">→</span>Анализирует рынок</div>
              <div style="font-size: 13px; color: #166534; display: flex; gap: 7px;"><span style="color: #059669; font-weight: 700; flex-shrink: 0;">→</span>Проводит процедуру</div>
            </div>
          </div>

          <div style="background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: 16px; padding: 24px 20px; display: flex; flex-direction: column;">
            <div style="font-size: 15px; font-weight: 700; color: #14532D; margin-bottom: 10px;">Комитет</div>
            <div style="font-size: 12px; font-weight: 600; color: #059669; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">От 20 млн UZS</div>
            <div style="display: flex; flex-direction: column; gap: 7px; flex: 1;">
              <div style="font-size: 13px; color: #166534; display: flex; gap: 7px;"><span style="color: #059669; font-weight: 700; flex-shrink: 0;">→</span>Коллегиальный орган</div>
              <div style="font-size: 13px; color: #166534; display: flex; gap: 7px;"><span style="color: #059669; font-weight: 700; flex-shrink: 0;">→</span>Финальное решение</div>
              <div style="font-size: 13px; color: #166534; display: flex; gap: 7px;"><span style="color: #059669; font-weight: 700; flex-shrink: 0;">→</span>Крупные закупки</div>
            </div>
          </div>

        </div>

        <div style="margin-top: 16px; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 10px; padding: 12px 18px; font-size: 13px; color: #6B7280;">
          Все участники несут ответственность за результат — качество работы каждого влияет на итог закупки.
        </div>

      </div>
    `,
  },

  {
    id: 4,
    block: 'roadmap',
    title: '8 этапов закупки',
    voiceoverText:
      'Процесс закупки состоит из восьми последовательных этапов. Первый — планирование. Второй — подача заявки и разработка технического задания. Третий — проведение закупочной процедуры. Четвёртый — выбор поставщика. Пятый — заключение договора. Шестой — оценка удовлетворённости. Седьмой — исполнение заказа. Восьмой — закрытие и приёмка. Каждый этап обязателен, и пропустить ни один нельзя. На следующих слайдах мы разберём ключевые этапы подробнее.',
    htmlContent: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; height: 100%; min-height: 440px; display: flex; flex-direction: column; padding: 36px 44px; box-sizing: border-box;">

        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
          <div style="width: 6px; height: 6px; border-radius: 50%; background: #059669;"></div>
          <span style="font-size: 11px; font-weight: 700; color: #059669; letter-spacing: 1.5px; text-transform: uppercase;">Блок 2 · Road Map</span>
        </div>

        <h2 style="margin: 0 0 24px; font-size: 32px; font-weight: 800; color: #111827;">8 этапов закупки</h2>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; flex: 1;">
          ${[
            { n: 1, label: 'Планирование' },
            { n: 2, label: 'Заявка и ТЗ' },
            { n: 3, label: 'Процедура' },
            { n: 4, label: 'Выбор поставщика' },
            { n: 5, label: 'Договор' },
            { n: 6, label: 'Оценка (CSI)' },
            { n: 7, label: 'Исполнение' },
            { n: 8, label: 'Приёмка' },
          ].map(({ n, label }) => `
            <div style="background: #F9FAFB; border: 1.5px solid #E5E7EB; border-radius: 14px; padding: 16px 14px; display: flex; flex-direction: column; align-items: flex-start; position: relative; overflow: hidden;">
              <div style="position: absolute; top: -8px; right: -4px; font-size: 48px; font-weight: 900; color: #E5E7EB; line-height: 1;">${n}</div>
              <div style="font-size: 11px; font-weight: 700; color: #059669; margin-bottom: 4px;">Этап ${n}</div>
              <div style="font-size: 13px; font-weight: 600; color: #374151; line-height: 1.3;">${label}</div>
            </div>
          `).join('')}
        </div>

      </div>
    `,
  },

  {
    id: 5,
    block: 'roadmap',
    title: '4 принципа закупок',
    voiceoverText:
      'Вся система закупок строится на четырёх базовых принципах. Первый — прозрачность. Все действия документируются, решения обоснованы и открыты для проверки. Второй — конкурентность. Мы всегда стремимся получить лучшие условия через сравнение нескольких поставщиков. Третий — коллегиальность. Решения о крупных закупках принимаются не одним человеком, а комитетом. Четвёртый — конфиденциальность. Информация об участниках и предложениях не разглашается до подведения итогов. Эти принципы защищают интересы компании и обеспечивают справедливость процесса.',
    htmlContent: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; height: 100%; min-height: 440px; display: flex; flex-direction: column; padding: 36px 44px; box-sizing: border-box;">

        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
          <div style="width: 6px; height: 6px; border-radius: 50%; background: #059669;"></div>
          <span style="font-size: 11px; font-weight: 700; color: #059669; letter-spacing: 1.5px; text-transform: uppercase;">Блок 2 · Road Map</span>
        </div>

        <h2 style="margin: 0 0 28px; font-size: 32px; font-weight: 800; color: #111827; line-height: 1.2;">4 принципа<br>закупок</h2>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; flex: 1;">

          <div style="background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: 16px; padding: 28px 24px; display: flex; flex-direction: column;">
            <div style="font-size: 18px; font-weight: 700; color: #14532D; margin-bottom: 8px;">Прозрачность</div>
            <div style="font-size: 13px; color: #166534; line-height: 1.65; flex: 1;">Все действия документируются. Решения обоснованы и открыты для внутренней проверки.</div>
          </div>

          <div style="background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: 16px; padding: 28px 24px; display: flex; flex-direction: column;">
            <div style="font-size: 18px; font-weight: 700; color: #14532D; margin-bottom: 8px;">Конкурентность</div>
            <div style="font-size: 13px; color: #166534; line-height: 1.65; flex: 1;">Всегда сравниваем нескольких поставщиков. Лучшие условия — через реальную конкуренцию.</div>
          </div>

          <div style="background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: 16px; padding: 28px 24px; display: flex; flex-direction: column;">
            <div style="font-size: 18px; font-weight: 700; color: #14532D; margin-bottom: 8px;">Коллегиальность</div>
            <div style="font-size: 13px; color: #166534; line-height: 1.65; flex: 1;">Решения по крупным закупкам принимает комитет, а не один человек.</div>
          </div>

          <div style="background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: 16px; padding: 28px 24px; display: flex; flex-direction: column;">
            <div style="font-size: 18px; font-weight: 700; color: #14532D; margin-bottom: 8px;">Конфиденциальность</div>
            <div style="font-size: 13px; color: #166534; line-height: 1.65; flex: 1;">Информация об участниках не разглашается до подведения итогов.</div>
          </div>

        </div>

      </div>
    `,
  },

  {
    id: 6,
    block: 'roadmap',
    title: 'Этап 1: Планирование закупок',
    voiceoverText:
      'Первый и самый важный этап — планирование. Каждый год компания составляет план закупок. Инициатор должен заблаговременно — обычно в конце года — включить свои потребности в этот план. Зачем это нужно? Во-первых, закупки из плана проводятся в приоритетном порядке. Во-вторых, только плановые закупки могут гарантировать соблюдение сроков по Регламенту. Внеплановые закупки тоже возможны, но они требуют дополнительного обоснования и обрабатываются дольше. Важно помнить: закупки на сумму до 20 миллионов сумов в план не включаются — они оформляются напрямую.',
    htmlContent: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; height: 100%; min-height: 440px; display: flex; flex-direction: column; padding: 36px 44px; box-sizing: border-box;">

        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
          <div style="width: 6px; height: 6px; border-radius: 50%; background: #059669;"></div>
          <span style="font-size: 11px; font-weight: 700; color: #059669; letter-spacing: 1.5px; text-transform: uppercase;">Блок 2 · Этап 1</span>
        </div>

        <h2 style="margin: 0 0 24px; font-size: 32px; font-weight: 800; color: #111827; line-height: 1.2;">Планирование<br>закупок</h2>

        <div style="display: flex; gap: 16px; flex: 1;">

          <div style="flex: 1; display: flex; flex-direction: column; gap: 10px;">
            <div style="font-size: 12px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px;">Что делает инициатор</div>
            ${[
              'Анализирует потребности подразделения на год',
              'Формирует перечень нужных товаров и услуг',
              'Подаёт заявку на включение в годовой план',
              'Согласовывает позиции с руководством',
            ].map(text => `
              <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 14px 16px; display: flex; gap: 12px; align-items: center;">
                <span style="font-size: 13px; color: #166534; line-height: 1.5;">${text}</span>
              </div>
            `).join('')}
          </div>

          <div style="width: 220px; flex-shrink: 0; display: flex; flex-direction: column; gap: 12px;">
            <div style="background: #111827; border-radius: 16px; padding: 20px 18px; flex: 1;">
              <div style="font-size: 13px; font-weight: 700; color: #6EE7B7; margin-bottom: 10px;">Плановая закупка</div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <div style="font-size: 12px; color: #D1FAE5;">· Приоритет обработки</div>
                <div style="font-size: 12px; color: #D1FAE5;">· Гарантированные сроки</div>
                <div style="font-size: 12px; color: #D1FAE5;">· Меньше бюрократии</div>
              </div>
            </div>
            <div style="background: #F9FAFB; border: 1.5px solid #E5E7EB; border-radius: 16px; padding: 20px 18px; flex: 1;">
              <div style="font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 10px;">Внеплановая закупка</div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <div style="font-size: 12px; color: #6B7280;">· Нужно обоснование</div>
                <div style="font-size: 12px; color: #6B7280;">· Сроки не гарантированы</div>
                <div style="font-size: 12px; color: #6B7280;">· Доп. согласование</div>
              </div>
            </div>
            <div style="background: #FFFBEB; border: 1.5px solid #FDE68A; border-radius: 12px; padding: 12px 14px;">
              <div style="font-size: 12px; color: #78350F; line-height: 1.5;"><strong>До 20 млн UZS</strong> — в план не включаются, оформляются напрямую.</div>
            </div>
          </div>

        </div>

      </div>
    `,
  },

  {
    id: 7,
    block: 'roadmap',
    title: 'Как заполнять план закупок',
    voiceoverText:
      'Давайте разберём, как правильно заполнять план закупок. В плане нужно указать: предмет закупки — что именно вы хотите купить, единицу измерения, количество, ориентировочную стоимость, ЦФО — ваш центр финансовой ответственности, и квартал, в котором планируется закупка. Несколько практических советов. Старайтесь планировать с запасом — лучше включить в план и не провести, чем не включить и опоздать. Формулируйте предмет закупки чётко — не «оборудование», а «серверное оборудование Dell PowerEdge». И ещё раз: суммы до 20 миллионов в план не вносятся.',
    htmlContent: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; height: 100%; min-height: 440px; display: flex; flex-direction: column; padding: 36px 44px; box-sizing: border-box;">

        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
          <div style="width: 6px; height: 6px; border-radius: 50%; background: #059669;"></div>
          <span style="font-size: 11px; font-weight: 700; color: #059669; letter-spacing: 1.5px; text-transform: uppercase;">Блок 2 · Этап 1</span>
        </div>

        <h2 style="margin: 0 0 24px; font-size: 32px; font-weight: 800; color: #111827;">Как заполнять<br>план закупок</h2>

        <div style="display: flex; gap: 16px; flex: 1;">

          <div style="flex: 1; background: #F9FAFB; border: 1.5px solid #E5E7EB; border-radius: 16px; overflow: hidden;">
            <div style="background: #111827; padding: 14px 20px;">
              <div style="font-size: 12px; font-weight: 700; color: white; letter-spacing: 0.5px;">Обязательные поля</div>
            </div>
            ${[
              ['Предмет закупки', 'Конкретно: не «ПО», а «лицензия Microsoft Office 365»'],
              ['Ед. измерения', 'шт., кг, м², услуга и т.д.'],
              ['Количество', 'Реалистичная оценка потребности'],
              ['Ориент. стоимость', 'Приблизительная цена на основе рынка'],
              ['ЦФО', 'Ваш центр финансовой ответственности'],
              ['Квартал', 'Планируемый период проведения'],
            ].map(([f, h], i) => `
              <div style="display: flex; border-top: ${i === 0 ? 'none' : '1px solid #E5E7EB'};">
                <div style="width: 160px; flex-shrink: 0; padding: 11px 16px; font-size: 13px; font-weight: 600; color: #374151;">${f}</div>
                <div style="flex: 1; padding: 11px 16px; font-size: 12px; color: #6B7280; border-left: 1px solid #E5E7EB; line-height: 1.5;">${h}</div>
              </div>
            `).join('')}
          </div>

          <div style="width: 200px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px;">
            <div style="font-size: 12px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px;">Советы</div>
            <div style="background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: 12px; padding: 14px 14px; flex: 1; display: flex; gap: 10px;">
              <span style="font-size: 13px; font-weight: 700; color: #059669; flex-shrink: 0;">+</span>
              <span style="font-size: 13px; color: #166534; line-height: 1.5;">Планируйте с запасом — лучше включить и не провести</span>
            </div>
            <div style="background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: 12px; padding: 14px 14px; flex: 1; display: flex; gap: 10px;">
              <span style="font-size: 13px; font-weight: 700; color: #059669; flex-shrink: 0;">+</span>
              <span style="font-size: 13px; color: #166534; line-height: 1.5;">Конкретизируйте предмет как можно точнее</span>
            </div>
            <div style="background: #FEF2F2; border: 1.5px solid #FECACA; border-radius: 12px; padding: 14px 14px; flex: 1; display: flex; gap: 10px;">
              <span style="font-size: 13px; font-weight: 700; color: #DC2626; flex-shrink: 0;">—</span>
              <span style="font-size: 13px; color: #991B1B; line-height: 1.5;">До 20 млн UZS — в план не вносятся</span>
            </div>
          </div>

        </div>

      </div>
    `,
  },

  {
    id: 8,
    block: 'roadmap',
    title: 'Этап 2: Заявка и ТЗ',
    voiceoverText:
      'Второй этап — подача заявки и разработка технического задания. Именно здесь инициатор несёт наибольшую ответственность. Хорошее техническое задание — это половина успешной закупки. В ТЗ должно быть пять ключевых элементов. Первое — чёткое описание предмета. Второе — технические требования. Третье — требования к поставке. Четвёртое — критерии приёмки. И пятое — гарантийные обязательства. Чем точнее ТЗ, тем меньше вопросов у поставщиков и тем лучше результат.',
    htmlContent: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; height: 100%; min-height: 440px; display: flex; flex-direction: column; padding: 36px 44px; box-sizing: border-box;">

        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
          <div style="width: 6px; height: 6px; border-radius: 50%; background: #059669;"></div>
          <span style="font-size: 11px; font-weight: 700; color: #059669; letter-spacing: 1.5px; text-transform: uppercase;">Блок 2 · Этап 2</span>
        </div>

        <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px;">
          <h2 style="margin: 0; font-size: 32px; font-weight: 800; color: #111827; line-height: 1.2;">Заявка<br>и техническое задание</h2>
          <div style="background: #FEF2F2; border: 1.5px solid #FECACA; border-radius: 12px; padding: 10px 16px; text-align: center; flex-shrink: 0; margin-left: 20px;">
            <div style="font-size: 11px; font-weight: 700; color: #991B1B; text-transform: uppercase; letter-spacing: 0.5px;">Ответственность</div>
            <div style="font-size: 11px; font-weight: 700; color: #991B1B; text-transform: uppercase; letter-spacing: 0.5px;">инициатора</div>
          </div>
        </div>

        <div style="display: flex; gap: 16px; flex: 1;">

          <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
            <div style="font-size: 12px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px;">Чек-лист хорошего ТЗ</div>
            ${[
              ['Описание предмета', 'Что именно закупается. Без двусмысленностей.'],
              ['Технические требования', 'Характеристики, стандарты, параметры.'],
              ['Требования к поставке', 'Сроки, место, доставка или монтаж.'],
              ['Критерии приёмки', 'Как проверите соответствие при получении.'],
              ['Гарантия', 'Срок и условия гарантийного обслуживания.'],
            ].map(([t, d], i) => `
              <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px; padding: 11px 14px; display: flex; gap: 10px; align-items: flex-start;">
                <div style="flex-shrink: 0; width: 22px; height: 22px; border-radius: 6px; background: #059669; color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;">${i + 1}</div>
                <div>
                  <div style="font-size: 13px; font-weight: 700; color: #14532D;">${t}</div>
                  <div style="font-size: 12px; color: #166534; margin-top: 2px;">${d}</div>
                </div>
              </div>
            `).join('')}
          </div>

          <div style="width: 200px; flex-shrink: 0; background: #FEF2F2; border: 1.5px solid #FECACA; border-radius: 16px; padding: 20px 18px; display: flex; flex-direction: column;">
            <div style="font-size: 13px; font-weight: 700; color: #991B1B; margin-bottom: 12px;">Типичные ошибки</div>
            <div style="display: flex; flex-direction: column; gap: 10px; flex: 1;">
              <div style="font-size: 12px; color: #7F1D1D; line-height: 1.5;">«Хорошее качество» вместо параметров</div>
              <div style="border-top: 1px solid #FECACA;"></div>
              <div style="font-size: 12px; color: #7F1D1D; line-height: 1.5;">Нет конкретных технических характеристик</div>
              <div style="border-top: 1px solid #FECACA;"></div>
              <div style="font-size: 12px; color: #7F1D1D; line-height: 1.5;">Срок поставки не указан</div>
              <div style="border-top: 1px solid #FECACA;"></div>
              <div style="font-size: 12px; color: #7F1D1D; line-height: 1.5;">Нет критериев приёмки</div>
            </div>
          </div>

        </div>

      </div>
    `,
  },

  {
    id: 9,
    block: 'roadmap',
    title: 'Этап 3: Закупочная процедура',
    voiceoverText:
      'Третий этап — закупочная процедура. На этом этапе работает отдел закупок. Закупщик анализирует рынок, запрашивает коммерческие предложения, сравнивает их и готовит материалы для принятия решения. Сроки по Регламенту: сложность 2 — 7 рабочих дней, сложность 3 — 15 рабочих дней, сложность 4 — договорная. Срок гарантирован только для плановых закупок с качественным ТЗ.',
    htmlContent: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; height: 100%; min-height: 440px; display: flex; flex-direction: column; padding: 36px 44px; box-sizing: border-box;">

        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
          <div style="width: 6px; height: 6px; border-radius: 50%; background: #059669;"></div>
          <span style="font-size: 11px; font-weight: 700; color: #059669; letter-spacing: 1.5px; text-transform: uppercase;">Блок 2 · Этап 3</span>
        </div>

        <h2 style="margin: 0 0 24px; font-size: 32px; font-weight: 800; color: #111827; line-height: 1.2;">Закупочная<br>процедура</h2>

        <div style="display: flex; gap: 16px; flex: 1;">

          <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
            <div style="font-size: 12px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px;">Что делает закупщик</div>
            ${[
              'Принимает заявку и проверяет полноту',
              'Анализирует рынок — изучает поставщиков и цены',
              'Запрашивает коммерческие предложения (минимум 3)',
              'Сравнивает по цене, срокам и условиям',
              'Готовит протокол для принятия решения',
            ].map((text, i) => `
              <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 10px; padding: 12px 16px; display: flex; gap: 12px; align-items: center;">
                <div style="flex-shrink: 0; width: 22px; height: 22px; border-radius: 6px; background: #059669; color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;">${i + 1}</div>
                <span style="font-size: 13px; color: #374151; line-height: 1.5;">${text}</span>
              </div>
            `).join('')}
          </div>

          <div style="width: 200px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px;">
            <div style="font-size: 12px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px;">Сроки (Регламент)</div>
            <div style="background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: 14px; padding: 20px 18px; flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 14px;">
              <div style="text-align: center;">
                <div style="font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; margin-bottom: 4px;">Сложность 2</div>
                <div style="font-size: 36px; font-weight: 900; color: #14532D; line-height: 1;">7</div>
                <div style="font-size: 12px; color: #6B7280;">рабочих дней</div>
              </div>
              <div style="border-top: 1px solid #BBF7D0;"></div>
              <div style="text-align: center;">
                <div style="font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; margin-bottom: 4px;">Сложность 3</div>
                <div style="font-size: 36px; font-weight: 900; color: #B45309; line-height: 1;">15</div>
                <div style="font-size: 12px; color: #6B7280;">рабочих дней</div>
              </div>
              <div style="border-top: 1px solid #BBF7D0;"></div>
              <div style="text-align: center;">
                <div style="font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; margin-bottom: 4px;">Сложность 4</div>
                <div style="font-size: 22px; font-weight: 900; color: #991B1B; line-height: 1;">договорная</div>
              </div>
            </div>
            <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px; padding: 11px 14px; font-size: 12px; color: #78350F; line-height: 1.5;">
              Сроки гарантированы только для <strong>плановых закупок</strong> с качественным ТЗ
            </div>
          </div>

        </div>

      </div>
    `,
  },

  {
    id: 10,
    block: 'roadmap',
    title: 'Этап 4: Выбор поставщика',
    voiceoverText:
      'Четвёртый этап — выбор поставщика. Для закупок до 20 миллионов — упрощённый порядок. От 20 до 360 миллионов — решение комитета. Свыше 360 миллионов — обязательный тендер. Выбор происходит не только по цене: оцениваются качество, репутация, сроки и гарантия.',
    htmlContent: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; height: 100%; min-height: 440px; display: flex; flex-direction: column; padding: 36px 44px; box-sizing: border-box;">

        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
          <div style="width: 6px; height: 6px; border-radius: 50%; background: #059669;"></div>
          <span style="font-size: 11px; font-weight: 700; color: #059669; letter-spacing: 1.5px; text-transform: uppercase;">Блок 2 · Этап 4</span>
        </div>

        <h2 style="margin: 0 0 24px; font-size: 32px; font-weight: 800; color: #111827; line-height: 1.2;">Выбор<br>поставщика</h2>

        <div style="display: flex; gap: 16px; flex: 1;">

          <div style="flex: 1; display: flex; flex-direction: column; gap: 10px;">
            <div style="font-size: 12px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px;">Порядок зависит от суммы</div>

            <div style="background: #F9FAFB; border: 1.5px solid #E5E7EB; border-radius: 14px; padding: 18px 20px; flex: 1; display: flex; gap: 14px; align-items: center;">
              <div style="font-size: 36px; font-weight: 900; color: #059669; flex-shrink: 0; width: 50px; text-align: center; line-height: 1;">1</div>
              <div>
                <div style="font-size: 13px; color: #6B7280; margin-bottom: 4px;">До 20 млн UZS</div>
                <div style="font-size: 15px; font-weight: 700; color: #14532D;">Упрощённый порядок</div>
                <div style="font-size: 12px; color: #166534; margin-top: 4px;">Закупщик решает самостоятельно</div>
              </div>
            </div>

            <div style="background: #F9FAFB; border: 1.5px solid #E5E7EB; border-radius: 14px; padding: 18px 20px; flex: 1; display: flex; gap: 14px; align-items: center;">
              <div style="font-size: 36px; font-weight: 900; color: #374151; flex-shrink: 0; width: 50px; text-align: center; line-height: 1;">2</div>
              <div>
                <div style="font-size: 13px; color: #6B7280; margin-bottom: 4px;">20–360 млн UZS</div>
                <div style="font-size: 15px; font-weight: 700; color: #374151;">Закупочный комитет</div>
                <div style="font-size: 12px; color: #6B7280; margin-top: 4px;">Коллегиальное решение</div>
              </div>
            </div>

            <div style="background: #F9FAFB; border: 1.5px solid #E5E7EB; border-radius: 14px; padding: 18px 20px; flex: 1; display: flex; gap: 14px; align-items: center;">
              <div style="font-size: 36px; font-weight: 900; color: #374151; flex-shrink: 0; width: 50px; text-align: center; line-height: 1;">3</div>
              <div>
                <div style="font-size: 13px; color: #6B7280; margin-bottom: 4px;">Свыше 360 млн UZS</div>
                <div style="font-size: 15px; font-weight: 700; color: #374151;">Тендер + комитет</div>
                <div style="font-size: 12px; color: #6B7280; margin-top: 4px;">Публичный конкурсный отбор</div>
              </div>
            </div>
          </div>

          <div style="width: 200px; flex-shrink: 0; background: #111827; border-radius: 16px; padding: 22px 18px; display: flex; flex-direction: column;">
            <div style="font-size: 12px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">Критерии выбора</div>
            <div style="display: flex; flex-direction: column; gap: 12px; flex: 1;">
              ${['Цена', 'Качество', 'Сроки', 'Репутация', 'Гарантия', 'Условия доставки'].map(label => `
                <div style="display: flex; gap: 10px; align-items: center;">
                  <div style="width: 6px; height: 6px; border-radius: 50%; background: #6EE7B7; flex-shrink: 0;"></div>
                  <span style="font-size: 13px; color: #E5E7EB;">${label}</span>
                </div>
              `).join('')}
            </div>
          </div>

        </div>

      </div>
    `,
  },

  {
    id: 11,
    block: 'roadmap',
    title: 'Этапы 5–8: Финальная часть',
    voiceoverText:
      'После выбора поставщика — финальная часть. Этап 5 — заключение договора. Этап 6 — инициатор оценивает качество закупки через CSI-опрос. Этап 7 — поставщик исполняет заказ. Этап 8 — инициатор принимает результат и подписывает акт.',
    htmlContent: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; height: 100%; min-height: 440px; display: flex; flex-direction: column; padding: 36px 44px; box-sizing: border-box;">

        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
          <div style="width: 6px; height: 6px; border-radius: 50%; background: #059669;"></div>
          <span style="font-size: 11px; font-weight: 700; color: #059669; letter-spacing: 1.5px; text-transform: uppercase;">Блок 2 · Этапы 5–8</span>
        </div>

        <h2 style="margin: 0 0 24px; font-size: 32px; font-weight: 800; color: #111827; line-height: 1.2;">Финальная часть<br>закупки</h2>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; flex: 1;">

          <div style="background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: 16px; padding: 22px 20px; display: flex; flex-direction: column;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
              <div style="width: 32px; height: 32px; border-radius: 8px; background: #059669; color: white; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700; flex-shrink: 0;">5</div>
              <div style="font-size: 16px; font-weight: 700; color: #14532D;">Договор</div>
            </div>
            <div style="font-size: 13px; color: #166534; line-height: 1.65; flex: 1;">Отдел закупок готовит договор на основе ТЗ. Юридическая служба согласовывает. Подписание обеими сторонами.</div>
          </div>

          <div style="background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: 16px; padding: 22px 20px; display: flex; flex-direction: column;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
              <div style="width: 32px; height: 32px; border-radius: 8px; background: #059669; color: white; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700; flex-shrink: 0;">6</div>
              <div style="font-size: 16px; font-weight: 700; color: #14532D;">Оценка (CSI)</div>
            </div>
            <div style="font-size: 13px; color: #166534; line-height: 1.65; flex: 1;">Вам придёт письмо — оцените скорость, качество и работу закупщика. Ваш отзыв помогает улучшить сервис.</div>
          </div>

          <div style="background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: 16px; padding: 22px 20px; display: flex; flex-direction: column;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
              <div style="width: 32px; height: 32px; border-radius: 8px; background: #059669; color: white; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700; flex-shrink: 0;">7</div>
              <div style="font-size: 16px; font-weight: 700; color: #14532D;">Исполнение</div>
            </div>
            <div style="font-size: 13px; color: #166534; line-height: 1.65; flex: 1;">Поставщик выполняет работы или осуществляет поставку согласно договору.</div>
          </div>

          <div style="background: #111827; border-radius: 16px; padding: 22px 20px; display: flex; flex-direction: column;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
              <div style="width: 32px; height: 32px; border-radius: 8px; background: #6EE7B7; color: #111827; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700; flex-shrink: 0;">8</div>
              <div style="font-size: 16px; font-weight: 700; color: #6EE7B7;">Приёмка</div>
            </div>
            <div style="font-size: 13px; color: #D1D5DB; line-height: 1.65; flex: 1;">Вы принимаете товар, проверяете соответствие ТЗ и подписываете акт. <strong style="color: white;">Закупка завершена!</strong></div>
          </div>

        </div>

      </div>
    `,
  },

  {
    id: 12,
    block: 'roadmap',
    title: 'Ключевые сроки',
    voiceoverText:
      'Зафиксируем ключевые сроки. На разработку ТЗ — 2 рабочих дня. Анализ рынка — 3 рабочих дня. Выбор поставщика — 3 рабочих дня. Согласование договора — 5 рабочих дней плюс 2 на подписание. Итого по сложности 2 — минимум 7 рабочих дней, по сложности 3 — 15 рабочих дней. Сроки работают только для плановых заявок с качественным ТЗ.',
    htmlContent: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; height: 100%; min-height: 440px; display: flex; flex-direction: column; padding: 36px 44px; box-sizing: border-box;">

        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
          <div style="width: 6px; height: 6px; border-radius: 50%; background: #059669;"></div>
          <span style="font-size: 11px; font-weight: 700; color: #059669; letter-spacing: 1.5px; text-transform: uppercase;">Блок 2 · Road Map</span>
        </div>

        <h2 style="margin: 0 0 24px; font-size: 32px; font-weight: 800; color: #111827;">Ключевые сроки</h2>

        <div style="display: flex; gap: 16px; flex: 1;">

          <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
            ${[
              { label: 'Подготовка ТЗ (инициатор)', time: '2', unit: 'р.д.' },
              { label: 'Анализ рынка (закупщик)', time: '3', unit: 'р.д.' },
              { label: 'Процедура / выбор поставщика', time: '3', unit: 'р.д.' },
              { label: 'Согласование договора', time: '5', unit: 'р.д.' },
              { label: 'Подписание договора', time: '+2', unit: 'р.д.' },
            ].map(({ label, time, unit }) => `
              <div style="background: #F9FAFB; border: 1.5px solid #E5E7EB; border-radius: 12px; padding: 12px 18px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 13px; color: #374151;">${label}</span>
                <span style="font-size: 20px; font-weight: 800; color: #059669; flex-shrink: 0; margin-left: 12px;">${time} <span style="font-size: 12px; font-weight: 600;">${unit}</span></span>
              </div>
            `).join('')}
          </div>

          <div style="width: 170px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px;">
            <div style="background: #111827; border-radius: 16px; padding: 20px 16px; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;">
              <div style="font-size: 12px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Сложность 2</div>
              <div style="font-size: 52px; font-weight: 900; color: #6EE7B7; line-height: 1;">7</div>
              <div style="font-size: 13px; color: #9CA3AF; margin-top: 4px;">рабочих дней</div>
            </div>
            <div style="background: #064E3B; border-radius: 16px; padding: 20px 16px; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;">
              <div style="font-size: 12px; font-weight: 700; color: #6EE7B7; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Сложность 3</div>
              <div style="font-size: 52px; font-weight: 900; color: white; line-height: 1;">15</div>
              <div style="font-size: 13px; color: #A7F3D0; margin-top: 4px;">рабочих дней</div>
            </div>
          </div>

        </div>

      </div>
    `,
  },

  {
    id: 13,
    block: 'roadmap',
    title: 'Проверь себя',
    voiceoverText:
      'Отличная работа! Давайте проверим, как вы усвоили материал второго блока. Ответьте на три вопроса. Это займёт не больше двух минут.',
    htmlContent: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; height: 100%; min-height: 440px; display: flex; flex-direction: column; padding: 36px 44px; box-sizing: border-box;">

        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
          <div style="width: 6px; height: 6px; border-radius: 50%; background: #059669;"></div>
          <span style="font-size: 11px; font-weight: 700; color: #059669; letter-spacing: 1.5px; text-transform: uppercase;">Блок 2 · Итог</span>
        </div>

        <h2 style="margin: 0 0 6px; font-size: 32px; font-weight: 800; color: #111827;">Проверь себя</h2>
        <p style="font-size: 14px; color: #6B7280; margin: 0 0 22px;">Три вопроса по Road Map — выберите правильный ответ</p>

        <div style="display: flex; flex-direction: column; gap: 14px; flex: 1;">

          <div style="background: #F9FAFB; border: 1.5px solid #E5E7EB; border-radius: 14px; padding: 18px 20px;">
            <div style="font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 12px;">1. Сколько рабочих дней занимает закупка сложности 3?</div>
            <div style="display: flex; gap: 10px;" id="q1">
              <button onclick="checkAnswer(this,'q1',false)" style="flex:1; padding: 10px; border-radius: 10px; border: 1.5px solid #E5E7EB; background: white; cursor: pointer; font-size: 13px; color: #374151; font-weight: 500;">7 р.д.</button>
              <button onclick="checkAnswer(this,'q1',true)" style="flex:1; padding: 10px; border-radius: 10px; border: 1.5px solid #E5E7EB; background: white; cursor: pointer; font-size: 13px; color: #374151; font-weight: 500;">15 р.д.</button>
              <button onclick="checkAnswer(this,'q1',false)" style="flex:1; padding: 10px; border-radius: 10px; border: 1.5px solid #E5E7EB; background: white; cursor: pointer; font-size: 13px; color: #374151; font-weight: 500;">30 р.д.</button>
            </div>
            <div id="q1-result" style="display:none; margin-top:8px; font-size:13px; font-weight:600;"></div>
          </div>

          <div style="background: #F9FAFB; border: 1.5px solid #E5E7EB; border-radius: 14px; padding: 18px 20px;">
            <div style="font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 12px;">2. С какой суммы требуется решение комитета?</div>
            <div style="display: flex; gap: 10px;" id="q2">
              <button onclick="checkAnswer(this,'q2',false)" style="flex:1; padding: 10px; border-radius: 10px; border: 1.5px solid #E5E7EB; background: white; cursor: pointer; font-size: 13px; color: #374151; font-weight: 500;">5 млн</button>
              <button onclick="checkAnswer(this,'q2',true)" style="flex:1; padding: 10px; border-radius: 10px; border: 1.5px solid #E5E7EB; background: white; cursor: pointer; font-size: 13px; color: #374151; font-weight: 500;">20 млн</button>
              <button onclick="checkAnswer(this,'q2',false)" style="flex:1; padding: 10px; border-radius: 10px; border: 1.5px solid #E5E7EB; background: white; cursor: pointer; font-size: 13px; color: #374151; font-weight: 500;">100 млн</button>
            </div>
            <div id="q2-result" style="display:none; margin-top:8px; font-size:13px; font-weight:600;"></div>
          </div>

          <div style="background: #F9FAFB; border: 1.5px solid #E5E7EB; border-radius: 14px; padding: 18px 20px;">
            <div style="font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 12px;">3. Когда гарантированы сроки по Регламенту?</div>
            <div style="display: flex; gap: 10px;" id="q3">
              <button onclick="checkAnswer(this,'q3',false)" style="flex:1; padding: 10px; border-radius: 10px; border: 1.5px solid #E5E7EB; background: white; cursor: pointer; font-size: 13px; color: #374151; font-weight: 500; text-align:center;">Всегда</button>
              <button onclick="checkAnswer(this,'q3',true)" style="flex:2; padding: 10px; border-radius: 10px; border: 1.5px solid #E5E7EB; background: white; cursor: pointer; font-size: 13px; color: #374151; font-weight: 500; text-align:center;">Только для плановых с качественным ТЗ</button>
              <button onclick="checkAnswer(this,'q3',false)" style="flex:1.5; padding: 10px; border-radius: 10px; border: 1.5px solid #E5E7EB; background: white; cursor: pointer; font-size: 13px; color: #374151; font-weight: 500; text-align:center;">Только свыше 360 млн</button>
            </div>
            <div id="q3-result" style="display:none; margin-top:8px; font-size:13px; font-weight:600;"></div>
          </div>

        </div>

        <script>
          function checkAnswer(btn, qId, isCorrect) {
            var container = document.getElementById(qId);
            var buttons = container.querySelectorAll('button');
            buttons.forEach(function(b) { b.disabled = true; b.style.cursor = 'default'; });
            if (isCorrect) {
              btn.style.background = '#F0FDF4'; btn.style.borderColor = '#22C55E'; btn.style.color = '#166534';
            } else {
              btn.style.background = '#FEF2F2'; btn.style.borderColor = '#EF4444'; btn.style.color = '#991B1B';
              buttons.forEach(function(b) {
                if (b.getAttribute('onclick') && b.getAttribute('onclick').indexOf('true') !== -1) {
                  b.style.background = '#F0FDF4'; b.style.borderColor = '#22C55E'; b.style.color = '#166534';
                }
              });
            }
            var result = document.getElementById(qId + '-result');
            result.style.display = 'block';
            result.style.color = isCorrect ? '#166534' : '#991B1B';
            result.innerText = isCorrect ? 'Верно!' : 'Неверно. Правильный ответ выделен зелёным.';
          }
        </script>
      </div>
    `,
  },

  // ─────────────────────────────────────────────
  // БЛОК 3 — ГРАМОТНЫЙ ЗАПРОС В 1С (5 слайдов)
  // ─────────────────────────────────────────────
  {
    id: 14,
    block: '1c',
    title: 'Доступ к 1С и начало заявки',
    voiceoverText:
      'Переходим к третьему блоку — как правильно подать заявку в 1С. Убедитесь, что у вас есть доступ. Если нет — обратитесь в IT-службу. Найдите раздел «Заявки на закупку» и создайте новую заявку. Не торопитесь — качественное заполнение сразу лучше, чем переделывать потом.',
    htmlContent: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; height: 100%; min-height: 440px; display: flex; flex-direction: column; padding: 36px 44px; box-sizing: border-box;">

        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
          <div style="width: 6px; height: 6px; border-radius: 50%; background: #7C3AED;"></div>
          <span style="font-size: 11px; font-weight: 700; color: #7C3AED; letter-spacing: 1.5px; text-transform: uppercase;">Блок 3 · 1С</span>
        </div>

        <h2 style="margin: 0 0 24px; font-size: 32px; font-weight: 800; color: #111827; line-height: 1.2;">Доступ к 1С<br>и создание заявки</h2>

        <div style="display: flex; gap: 16px; flex: 1;">

          <div style="flex: 1; display: flex; flex-direction: column; gap: 12px;">
            <div style="background: #F5F3FF; border: 1.5px solid #DDD6FE; border-radius: 14px; padding: 20px; flex: 1; display: flex; gap: 16px; align-items: flex-start;">
              <div style="flex-shrink: 0; width: 36px; height: 36px; border-radius: 10px; background: #7C3AED; color: white; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700;">1</div>
              <div>
                <div style="font-size: 15px; font-weight: 700; color: #5B21B6; margin-bottom: 6px;">Получите доступ</div>
                <div style="font-size: 13px; color: #6D28D9; line-height: 1.6;">Обратитесь в IT-службу или к руководителю. Потребуется согласование руководителя.</div>
              </div>
            </div>
            <div style="background: #F5F3FF; border: 1.5px solid #DDD6FE; border-radius: 14px; padding: 20px; flex: 1; display: flex; gap: 16px; align-items: flex-start;">
              <div style="flex-shrink: 0; width: 36px; height: 36px; border-radius: 10px; background: #7C3AED; color: white; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700;">2</div>
              <div>
                <div style="font-size: 15px; font-weight: 700; color: #5B21B6; margin-bottom: 6px;">Откройте раздел заявок</div>
                <div style="font-size: 13px; color: #6D28D9; line-height: 1.6;">В меню системы: <strong>«Заявки на закупку»</strong> → <strong>«Создать новую»</strong>.</div>
              </div>
            </div>
            <div style="background: #F5F3FF; border: 1.5px solid #DDD6FE; border-radius: 14px; padding: 20px; flex: 1; display: flex; gap: 16px; align-items: flex-start;">
              <div style="flex-shrink: 0; width: 36px; height: 36px; border-radius: 10px; background: #7C3AED; color: white; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700;">3</div>
              <div>
                <div style="font-size: 15px; font-weight: 700; color: #5B21B6; margin-bottom: 6px;">Заполните форму полностью</div>
                <div style="font-size: 13px; color: #6D28D9; line-height: 1.6;">Не оставляйте пустых полей — каждое важно для обработки.</div>
              </div>
            </div>
          </div>

          <div style="width: 200px; flex-shrink: 0; display: flex; flex-direction: column; gap: 12px;">
            <div style="background: #111827; border-radius: 16px; padding: 22px 18px; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
              <div style="font-size: 13px; font-weight: 700; color: #A78BFA; margin-bottom: 8px;">1С → Система закупок</div>
              <div style="font-size: 12px; color: #9CA3AF; line-height: 1.6;">Ваша заявка из 1С автоматически передаётся в систему управления закупками</div>
            </div>
            <div style="background: #FFFBEB; border: 1.5px solid #FDE68A; border-radius: 12px; padding: 14px;">
              <div style="font-size: 12px; color: #78350F; line-height: 1.6;">Качественное заполнение с первого раза = экономия недели вашего времени</div>
            </div>
          </div>

        </div>

      </div>
    `,
  },

  {
    id: 15,
    block: '1c',
    title: 'Базовая информация в заявке',
    voiceoverText:
      'При создании заявки заполняется блок базовой информации: наименование товара или услуги, количество и единица измерения, ЦФО, бюджетная статья, желаемый срок и ссылка на план закупок. Эти данные помогают закупщику сразу понять контекст вашей потребности.',
    htmlContent: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; height: 100%; min-height: 440px; display: flex; flex-direction: column; padding: 36px 44px; box-sizing: border-box;">

        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
          <div style="width: 6px; height: 6px; border-radius: 50%; background: #7C3AED;"></div>
          <span style="font-size: 11px; font-weight: 700; color: #7C3AED; letter-spacing: 1.5px; text-transform: uppercase;">Блок 3 · 1С</span>
        </div>

        <h2 style="margin: 0 0 24px; font-size: 32px; font-weight: 800; color: #111827; line-height: 1.2;">Базовая информация<br>в заявке</h2>

        <div style="display: flex; gap: 16px; flex: 1;">

          <div style="flex: 1; background: #F9FAFB; border: 1.5px solid #E5E7EB; border-radius: 16px; overflow: hidden;">
            <div style="background: #111827; padding: 14px 20px;">
              <div style="font-size: 12px; font-weight: 700; color: white; letter-spacing: 0.5px;">Обязательные поля заявки</div>
            </div>
            ${[
              ['Наименование', 'Конкретно: не «оборудование», а «ноутбук Dell Latitude 5540»'],
              ['Количество + ед. изм.', '5 шт., 100 кг, 1 услуга — чётко и измеримо'],
              ['ЦФО', 'Ваш центр финансовой ответственности — из справочника'],
              ['Бюджетная статья', 'Уточните у финансовой службы, если не знаете'],
              ['Желаемый срок', 'Конкретная дата, не раньше чем через 2 недели'],
              ['Позиция в плане', 'Номер строки в плане закупок (если плановая)'],
            ].map(([field, hint], i) => `
              <div style="display: flex; border-top: ${i === 0 ? 'none' : '1px solid #E5E7EB'};">
                <div style="width: 160px; flex-shrink: 0; padding: 11px 16px; font-size: 13px; font-weight: 600; color: #374151; border-right: 1px solid #E5E7EB;">${field}</div>
                <div style="flex: 1; padding: 11px 16px; font-size: 12px; color: #6B7280; line-height: 1.5;">${hint}</div>
              </div>
            `).join('')}
          </div>

          <div style="width: 190px; flex-shrink: 0; background: #FEF2F2; border: 1.5px solid #FECACA; border-radius: 16px; padding: 22px 18px; display: flex; flex-direction: column;">
            <div style="font-size: 14px; font-weight: 700; color: #991B1B; margin-bottom: 12px;">Частая ошибка</div>
            <div style="font-size: 13px; color: #FECACA; line-height: 1.65; flex: 1; color: #7F1D1D;">Указывать срок «как можно скорее» или «срочно». Всегда пишите <strong style="color: #991B1B;">конкретную дату</strong> — это помогает расставлять приоритеты.</div>
          </div>

        </div>

      </div>
    `,
  },

  {
    id: 16,
    block: '1c',
    title: 'Техническая часть (ТЗ)',
    voiceoverText:
      'Технический блок — сердце закупки. Описывайте функцию, а не бренд: вместо «хочу MacBook» — конкретные параметры. Указывайте измеримые характеристики, условия поставки, срок гарантии.',
    htmlContent: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; height: 100%; min-height: 440px; display: flex; flex-direction: column; padding: 36px 44px; box-sizing: border-box;">

        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
          <div style="width: 6px; height: 6px; border-radius: 50%; background: #7C3AED;"></div>
          <span style="font-size: 11px; font-weight: 700; color: #7C3AED; letter-spacing: 1.5px; text-transform: uppercase;">Блок 3 · 1С</span>
        </div>

        <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px;">
          <h2 style="margin: 0; font-size: 32px; font-weight: 800; color: #111827; line-height: 1.2;">Техническая<br>часть (ТЗ)</h2>
          <div style="background: #7C3AED; border-radius: 12px; padding: 10px 16px; text-align: center; flex-shrink: 0; margin-left: 20px;">
            <div style="font-size: 11px; font-weight: 700; color: #EDE9FE; text-transform: uppercase; letter-spacing: 0.5px;">Главный</div>
            <div style="font-size: 11px; font-weight: 700; color: #EDE9FE; text-transform: uppercase; letter-spacing: 0.5px;">раздел</div>
          </div>
        </div>

        <div style="display: flex; gap: 14px; flex: 1;">

          <div style="flex: 1; display: flex; flex-direction: column; gap: 10px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; flex: 1;">
              <div style="background: #FEF2F2; border: 1.5px solid #FECACA; border-radius: 14px; padding: 18px 16px; display: flex; flex-direction: column;">
                <div style="font-size: 12px; font-weight: 700; color: #991B1B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">Плохо</div>
                <div style="display: flex; flex-direction: column; gap: 8px; flex: 1;">
                  ${['Ноутбук хорошего качества', 'Мощный компьютер', 'Современное ПО', 'Быстрая доставка', 'Хорошая гарантия'].map(t => `<div style="font-size: 13px; color: #7F1D1D;">${t}</div>`).join('<div style="border-top: 1px solid #FECACA;"></div>')}
                </div>
              </div>
              <div style="background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: 14px; padding: 18px 16px; display: flex; flex-direction: column;">
                <div style="font-size: 12px; font-weight: 700; color: #14532D; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">Хорошо</div>
                <div style="display: flex; flex-direction: column; gap: 8px; flex: 1;">
                  ${['CPU Intel i7 / AMD Ryzen 7', 'RAM 16 ГБ DDR5, SSD 512 ГБ', 'Windows 11 Pro, лицензия OEM', 'Доставка на склад, ул. Амира Темура', 'Гарантия 24 мес., выезд специалиста'].map(t => `<div style="font-size: 13px; color: #166534;">${t}</div>`).join('<div style="border-top: 1px solid #BBF7D0;"></div>')}
                </div>
              </div>
            </div>
          </div>

          <div style="width: 190px; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px;">
            <div style="font-size: 12px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px;">Разделы ТЗ</div>
            ${[
              'Технические характеристики',
              'Условия поставки',
              'Критерии приёмки',
              'Гарантия',
            ].map(label => `
              <div style="background: #F5F3FF; border: 1px solid #DDD6FE; border-radius: 10px; padding: 12px 14px; display: flex; gap: 10px; align-items: center; flex: 1;">
                <span style="font-size: 13px; color: #5B21B6; font-weight: 600; line-height: 1.3;">${label}</span>
              </div>
            `).join('')}
          </div>

        </div>

      </div>
    `,
  },

  {
    id: 17,
    block: '1c',
    title: '4 принципа хорошей заявки',
    voiceoverText:
      'Хорошая заявка строится на четырёх принципах. Конкретность — измеримые параметры вместо оценочных суждений. Полнота — все разделы заполнены. Реалистичность — сроки реальные, бюджет обоснованный. Функциональность — описывайте функцию, а не бренд. Соблюдайте эти принципы и заявка пройдёт без возвратов.',
    htmlContent: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; height: 100%; min-height: 440px; display: flex; flex-direction: column; padding: 36px 44px; box-sizing: border-box;">

        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
          <div style="width: 6px; height: 6px; border-radius: 50%; background: #7C3AED;"></div>
          <span style="font-size: 11px; font-weight: 700; color: #7C3AED; letter-spacing: 1.5px; text-transform: uppercase;">Блок 3 · 1С</span>
        </div>

        <h2 style="margin: 0 0 28px; font-size: 32px; font-weight: 800; color: #111827; line-height: 1.2;">4 принципа<br>хорошей заявки</h2>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; flex: 1;">

          <div style="background: #F5F3FF; border: 1.5px solid #DDD6FE; border-radius: 16px; padding: 24px 22px; display: flex; flex-direction: column;">
            <div style="font-size: 17px; font-weight: 700; color: #5B21B6; margin-bottom: 8px;">Конкретность</div>
            <div style="font-size: 13px; color: #4C1D95; line-height: 1.65; flex: 1;">Измеримые параметры вместо оценочных суждений. «Не менее 16 ГБ» вместо «много памяти».</div>
          </div>

          <div style="background: #F5F3FF; border: 1.5px solid #DDD6FE; border-radius: 16px; padding: 24px 22px; display: flex; flex-direction: column;">
            <div style="font-size: 17px; font-weight: 700; color: #5B21B6; margin-bottom: 8px;">Полнота</div>
            <div style="font-size: 13px; color: #4C1D95; line-height: 1.65; flex: 1;">Все обязательные поля заполнены. Нет пустых разделов, нет «уточните у закупщика».</div>
          </div>

          <div style="background: #F5F3FF; border: 1.5px solid #DDD6FE; border-radius: 16px; padding: 24px 22px; display: flex; flex-direction: column;">
            <div style="font-size: 17px; font-weight: 700; color: #5B21B6; margin-bottom: 8px;">Реалистичность</div>
            <div style="font-size: 13px; color: #4C1D95; line-height: 1.65; flex: 1;">Срок с учётом времени на закупку. Бюджет на основе реального рыночного анализа.</div>
          </div>

          <div style="background: #F5F3FF; border: 1.5px solid #DDD6FE; border-radius: 16px; padding: 24px 22px; display: flex; flex-direction: column;">
            <div style="font-size: 17px; font-weight: 700; color: #5B21B6; margin-bottom: 8px;">Функциональность</div>
            <div style="font-size: 13px; color: #4C1D95; line-height: 1.65; flex: 1;">Описывайте функцию, а не бренд. Это обеспечивает конкуренцию и лучшую цену.</div>
          </div>

        </div>

      </div>
    `,
  },

  {
    id: 18,
    block: '1c',
    title: 'Итог курса',
    voiceoverText:
      'Поздравляем! Вы прошли курс по корпоративным закупкам. Теперь вы знаете, как устроен процесс, кто в нём участвует и что нужно делать на каждом этапе. Включайте потребности в план заблаговременно, составляйте конкретное ТЗ, соблюдайте сроки и оценивайте качество закупок через CSI-опрос. Если возникнут вопросы — обращайтесь в отдел закупок. Спасибо за внимание!',
    htmlContent: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; height: 100%; min-height: 440px; display: flex; flex-direction: column; padding: 36px 44px; box-sizing: border-box;">

        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
          <div style="width: 6px; height: 6px; border-radius: 50%; background: #7C3AED;"></div>
          <span style="font-size: 11px; font-weight: 700; color: #7C3AED; letter-spacing: 1.5px; text-transform: uppercase;">Курс завершён</span>
        </div>

        <div style="display: flex; align-items: flex-start; gap: 20px; margin-bottom: 24px;">
          <div>
            <h2 style="margin: 0 0 6px; font-size: 34px; font-weight: 800; color: #111827; line-height: 1.15;">Курс завершён!</h2>
            <p style="font-size: 15px; color: #6B7280; margin: 0;">Теперь вы знаете, как работает процесс закупки</p>
          </div>
        </div>

        <div style="display: flex; gap: 16px; flex: 1;">

          <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
            <div style="font-size: 12px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px;">Что нужно знать и делать</div>
            ${[
              'Включать потребности в план закупок заблаговременно',
              'Составлять конкретное и полное ТЗ',
              'Указывать реалистичные сроки в заявке',
              'Знать: сложность 2 = 7 р.д., сложность 3 = 15 р.д.',
              'Оценивать качество закупки через CSI-опрос',
            ].map(text => `
              <div style="background: #F5F3FF; border: 1px solid #DDD6FE; border-radius: 10px; padding: 12px 16px; display: flex; gap: 10px; align-items: center; flex: 1;">
                <span style="font-size: 14px; font-weight: 700; color: #7C3AED; flex-shrink: 0;">·</span>
                <span style="font-size: 13px; color: #4C1D95; line-height: 1.4;">${text}</span>
              </div>
            `).join('')}
          </div>

          <div style="width: 200px; flex-shrink: 0; display: flex; flex-direction: column; gap: 12px;">
            <div style="background: #4C1D95; border-radius: 16px; padding: 24px 20px; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
              <div style="font-size: 14px; font-weight: 700; color: #DDD6FE; margin-bottom: 8px;">Остались вопросы?</div>
              <div style="font-size: 13px; color: #C4B5FD; line-height: 1.6;">Обращайтесь в отдел закупок — мы всегда готовы помочь.</div>
            </div>
            <div style="background: #111827; border-radius: 14px; padding: 18px; text-align: center;">
              <div style="font-size: 13px; font-weight: 700; color: #A78BFA; margin-bottom: 4px;">Курс пройден</div>
              <div style="font-size: 12px; color: #6B7280;">Отдел закупок</div>
            </div>
          </div>

        </div>

      </div>
    `,
  },
];
