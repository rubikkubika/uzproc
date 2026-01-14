'use client';

import { useRouter } from 'next/navigation';

export default function PortalPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Заголовок страницы */}
        <h1 className="text-4xl font-bold text-purple-900 mb-3">
          Функция закупок
        </h1>

        {/* Блок: Руководитель и описание функции на одном уровне */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Блок: Руководитель */}
          <div className="bg-white rounded-lg px-6 py-4">
            <h3 className="text-xl font-bold text-purple-900 mb-3">
              Руководитель
            </h3>
            <ul className="space-y-1 text-gray-700">
              <li>
                <a href="mailto:uzproc@uzumteam.uz" className="text-purple-600 hover:text-purple-800 hover:underline">
                  uzproc@uzumteam.uz
                </a>
              </li>
              <li className="text-sm text-gray-600">
                По вопросам утверждения заявок и стратегических решений
              </li>
            </ul>
          </div>

          {/* Блок описания функции */}
          <div className="bg-purple-100 rounded-lg px-6 py-4">
            <h3 className="text-gray-900 text-base font-semibold mb-2">
              Направления деятельности:
            </h3>
            <ul className="space-y-1 text-gray-800 text-base leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-purple-700 font-bold">-</span>
                <span>Закупка товаров работ услуг для нужд Компании</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-700 font-bold">-</span>
                <span>Заключение договоров, дополнительных соглашений, спецификации</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-700 font-bold">-</span>
                <span>Контроль поставок</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Раздел: План закупок */}
        <div>
          <h2 className="text-2xl font-bold text-purple-900 mb-3">
            План закупок
          </h2>
          <div className="bg-white rounded-lg px-6 py-4">
            <p className="text-gray-700 text-base leading-relaxed mb-3">
              Просмотрите актуальный план закупок и ознакомьтесь с запланированными закупками. 
              План закупок формируется на год и может быть скорректирован в процессе работы. 
              Для изменения Плана закупок обращайтесь к менеджерам или в{' '}
              <a 
                href="https://uzum-team.slack.com/archives/C09E7UH4ALE" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-purple-600 hover:text-purple-800 hover:underline"
              >
                канал Slack
              </a>.
            </p>
            <button
              onClick={() => router.push('/public-plan')}
              className="px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors shadow-sm hover:shadow-md"
            >
              Перейти к плану закупок
            </button>
          </div>
        </div>

        {/* Раздел: Документы */}
        <div>
          <h2 className="text-2xl font-bold text-purple-900 mb-3">
            Документы
          </h2>
          <div className="bg-white rounded-lg px-6 py-4">
            <ul className="space-y-1 text-gray-700">
              <li>
                <a href="#" className="text-purple-600 hover:text-purple-800 hover:underline">
                  Регламент по закупкам
                </a>
              </li>
              <li>
                <a href="#" className="text-purple-600 hover:text-purple-800 hover:underline">
                  Положение о закупочной деятельности
                </a>
              </li>
              <li>
                <a href="#" className="text-purple-600 hover:text-purple-800 hover:underline">
                  One page: Процесс закупок
                </a>
              </li>
              <li>
                <a href="#" className="text-purple-600 hover:text-purple-800 hover:underline">
                  Инструкция по работе с заявками
                </a>
              </li>
              <li>
                <a href="#" className="text-purple-600 hover:text-purple-800 hover:underline">
                  Политика управления договорами
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Раздел: Контакты */}
        <div>
          <h2 className="text-2xl font-bold text-purple-900 mb-3">
            Контакты
          </h2>
          
          {/* Канал в Slack - текстовая ссылка */}
          <div className="mb-4">
            <a 
              href="https://uzum-team.slack.com/archives/C09E7UH4ALE" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-600 hover:text-purple-800 hover:underline"
            >
              Канал в Slack
            </a>
          </div>

          {/* Блоки с людьми */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Блок: Менеджеры */}
            <div className="bg-white rounded-lg px-6 py-4">
              <h3 className="text-xl font-bold text-purple-900 mb-3">
                Менеджеры
              </h3>
              <ul className="space-y-1 text-gray-700">
                <li>
                  <a href="mailto:uzproc@uzumteam.uz" className="text-purple-600 hover:text-purple-800 hover:underline">
                    uzproc@uzumteam.uz
                  </a>
                </li>
                <li className="text-sm text-gray-600">
                  По вопросам согласования заявок и оперативного управления закупками
                </li>
              </ul>
            </div>

            {/* Блок: Договорной отдел */}
            <div className="bg-white rounded-lg px-6 py-4">
              <h3 className="text-xl font-bold text-purple-900 mb-3">
                Договорной отдел
              </h3>
              <ul className="space-y-1 text-gray-700">
                <li>
                  <a href="mailto:uzproc@uzumteam.uz" className="text-purple-600 hover:text-purple-800 hover:underline">
                    uzproc@uzumteam.uz
                  </a>
                </li>
                <li className="text-sm text-gray-600">
                  По вопросам договоров, спецификаций и юридических аспектов закупок
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
