'use client';

import { useRouter } from 'next/navigation';
import { FileText, Calendar, Mail, ExternalLink } from 'lucide-react';

export default function PortalPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Заголовок */}
        <h1 className="text-4xl font-bold text-purple-900 mb-4">
          Портал закупок uzProc
        </h1>

        {/* Описание */}
        <div className="bg-purple-100 rounded-lg p-6 mb-6">
          <p className="text-gray-800 text-lg leading-relaxed">
            Портал закупок uzProc — это единая точка доступа к информации о закупках, 
            планировании и документации. Здесь вы найдете все необходимое для работы с закупками.
          </p>
        </div>

        {/* Контактный менеджер */}
        <div>
          <h2 className="text-2xl font-bold text-purple-900 mb-4">
            Контактный менеджер
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-6 shadow-md relative">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Отдел закупок</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-purple-600" />
                  <a href="mailto:uzproc@uzumteam.uz" className="text-purple-600 hover:text-purple-800 hover:underline">
                    uzproc@uzumteam.uz
                  </a>
                </li>
              </ul>
              <div className="absolute bottom-4 right-4 w-16 h-16 bg-purple-600 rounded-lg flex items-center justify-center">
                <Mail className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Документы */}
        <div>
          <h2 className="text-2xl font-bold text-purple-900 mb-4">
            Документы
          </h2>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <p className="text-gray-600 mb-4">
              Документы будут добавлены в ближайшее время.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-400">
                <FileText className="w-4 h-4" />
                <span className="text-sm">Документы появятся здесь</span>
              </div>
            </div>
          </div>
        </div>

        {/* Планирование */}
        <div>
          <h2 className="text-2xl font-bold text-purple-900 mb-4">
            Планирование
          </h2>
          <div className="bg-white rounded-lg p-6 shadow-md relative">
            <p className="text-gray-700 mb-4">
              Просмотрите актуальный план закупок и ознакомьтесь с запланированными мероприятиями.
            </p>
            <button
              onClick={() => router.push('/public-plan')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors shadow-sm hover:shadow-md"
            >
              <Calendar className="w-5 h-5" />
              <span>Перейти к плану закупок</span>
              <ExternalLink className="w-4 h-4" />
            </button>
            <div className="absolute bottom-4 right-4 w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
              <Calendar className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        {/* Дополнительная информация */}
        <div className="mt-6">
          <p className="text-gray-700 mb-2">
            Если у вас есть вопросы по процессу закупок, обращайтесь к контактному менеджеру.
          </p>
          <ul className="space-y-1">
            <li>
              <a 
                href="mailto:uzproc@uzumteam.uz" 
                className="text-purple-600 hover:text-purple-800 hover:underline"
              >
                Связаться с отделом закупок
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
