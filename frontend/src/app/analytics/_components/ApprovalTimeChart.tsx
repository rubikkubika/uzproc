'use client';

import { useState, useEffect } from 'react';

interface PurchaseData {
  [key: string]: string;
}

interface RoleStats {
  roleName: string;
  averageDays: number;
  completedCount: number;
  pendingCount: number;
}

interface StageStats {
  stageName: string;
  roles: RoleStats[];
}

export default function ApprovalTimeChart() {
  const [data, setData] = useState<PurchaseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageStats, setStageStats] = useState<StageStats[]>([]);
  const [averageApprovalDays, setAverageApprovalDays] = useState<number>(0);

  useEffect(() => {
    // ВРЕМЕННО ОТКЛЮЧЕНО
    return;
    fetch('/api/purchases-data?all=true&minimal=true')
      .then(res => res.json())
      .then(data => {
        setData(data);
        calculateAverageApprovalTime(data);
        setLoading(false);
        calculateRoleStats(data);
      })
      .catch(err => {
        console.error('Error:', err);
        setLoading(false);
      });
  }, []);

  const calculateAverageApprovalTime = (purchases: PurchaseData[]) => {
    let totalApprovalDays = 0;
    let validPurchases = 0;
    
    purchases.forEach(item => {
      let minAssignmentDate: Date | null = null;
      let maxCompletionDate: Date | null = null;
      
      const parseDate = (dateStr: string): Date | null => {
        if (!dateStr || dateStr.includes('Пропущено') || dateStr.trim() === '') return null;
        try {
          const parts = dateStr.split(/[\/\.]/);
          if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            const year = parseInt(parts[2]);
            return new Date(year, month, day);
          }
        } catch {}
        return null;
      };
      
      // Ищем все даты назначения и выполнения
      for (const key in item) {
        if (key.includes('Дата назначения')) {
          const date = parseDate(item[key]);
          if (date && (!minAssignmentDate || date < minAssignmentDate)) {
            minAssignmentDate = date;
          }
        } else if (key.includes('Дата выполнения')) {
          const date = parseDate(item[key]);
          if (date && (!maxCompletionDate || date > maxCompletionDate)) {
            maxCompletionDate = date;
          }
        }
      }
      
      // Вычисляем разницу в днях
      if (minAssignmentDate && maxCompletionDate && maxCompletionDate >= minAssignmentDate) {
        const diffMs = maxCompletionDate.getTime() - minAssignmentDate.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays >= 0) {
          totalApprovalDays += diffDays;
          validPurchases++;
        }
      }
    });
    
    const average = validPurchases > 0 ? Math.round(totalApprovalDays / validPurchases) : 0;
    setAverageApprovalDays(average);
  };

  const calculateRoleStats = (purchases: PurchaseData[]) => {
    const stages = [
      {
        stageName: 'Согласование заявки',
        roles: [
          { name: 'Руководитель закупщика', prefix: 'Согласование Заявки на ЗПРуководитель закупщика' },
          { name: 'Руководитель ЦФО', prefix: 'Согласование Заявки на ЗПРуководитель ЦФО' },
          { name: 'Председатель ЦФО', prefix: 'Согласование Заявки на ЗППредседатель ЦФО M - PVZ' },
          { name: 'Финансист ЦФО', prefix: 'Согласование Заявки на ЗПФинансист ЦФО' },
          { name: 'Генеральный директор', prefix: 'Согласование Заявки на ЗПГенеральный директор' },
          { name: 'Финансовый директор', prefix: 'Согласование Заявки на ЗПФинансовый директор' },
          { name: 'Финансовый директор (Маркет)', prefix: 'Согласование Заявки на ЗПФинансовый директор (Маркет)' },
          { name: 'Служба безопасности', prefix: 'Согласование Заявки на ЗПСлужба безопасности' }
        ]
      },
      {
        stageName: 'Утверждение',
        roles: [
          { name: 'Ответственный закупщик', prefix: 'Утверждение заявки на ЗПОтветственный закупщик' },
          { name: 'Подготовил документ', prefix: 'Утверждение заявки на ЗППодготовил документ' }
        ]
      },
      {
        stageName: 'Закупочная комиссия',
        roles: [
          { name: 'Финансовый директор', prefix: 'Закупочная комиссияФинансовый директор' },
          { name: 'Финансовый директор (Маркет)', prefix: 'Закупочная комиссияФинансовый директор (Маркет)' },
          { name: 'Генеральный директор', prefix: 'Закупочная комиссияГенеральный директор' },
          { name: 'Проверка комиссии', prefix: 'Проверка результата закупочной комиссииОтветственный закупщик' }
        ]
      },
      {
        stageName: 'Согласование результатов',
        roles: [
          { name: 'Служба безопасности', prefix: 'Согласование результатов ЗПСлужба безопасности' },
          { name: 'Руководитель закупщика', prefix: 'Согласование результатов ЗПРуководитель закупщика' },
          { name: 'Руководитель ЦФО', prefix: 'Согласование результатов ЗПРуководитель ЦФО' },
          { name: 'Финансист ЦФО', prefix: 'Согласование результатов ЗПФинансист ЦФО' }
        ]
      }
    ];

    const stats = stages.map(stage => {
      const roles = stage.roles.map(role => {
        const prefix = role.prefix;
        
        let totalDays = 0;
        let completedCount = 0;
        let pendingCount = 0;

        purchases.forEach(item => {
          const daysInWork = item[`${prefix}Дней в работе`] || '';
          const dateAppointed = item[`${prefix}Дата назначения`] || '';
          const dateCompleted = item[`${prefix}Дата выполнения`] || '';
          
          if (daysInWork && !daysInWork.includes('Пропущено') && daysInWork.trim() !== '') {
            const days = parseInt(daysInWork) || 0;
            if (days > 0) {
              totalDays += days;
              completedCount++;
            }
          }
          
          if (dateAppointed && !dateAppointed.includes('Пропущено') && dateCompleted && !dateCompleted.includes('Пропущено') && dateCompleted.trim() === '') {
            pendingCount++;
          }
        });

        const averageDays = completedCount > 0 ? Math.round(totalDays / completedCount) : 0;

        return {
          roleName: role.name,
          averageDays,
          completedCount,
          pendingCount
        };
      }).filter(stat => stat.completedCount > 0 || stat.pendingCount > 0)
        .sort((a, b) => b.averageDays - a.averageDays);

      return {
        stageName: stage.stageName,
        roles
      };
    }).filter(stage => stage.roles.length > 0);

    setStageStats(stats);
  };

  const maxDays = Math.max(
    ...stageStats.flatMap(stage => stage.roles.map(role => role.averageDays)),
    1
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 h-64 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Загрузка данных...</div>
      </div>
    );
  }

  if (stageStats.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 h-64 flex items-center justify-center">
        <div className="text-gray-500">Нет данных для анализа</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Среднее время согласования: {averageApprovalDays} дн.
        </h3>
      </div>
      
      <div className="space-y-4">
        {stageStats.map((stage, stageIndex) => (
          <div key={stageIndex} className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-800 pb-2 border-b border-gray-200">
              {stage.stageName}
            </h4>
            {stage.roles.map((role, roleIndex) => (
              <div key={roleIndex}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs sm:text-sm font-medium text-gray-700 truncate mr-2">
                    {role.roleName}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-gray-900">
                    {role.averageDays} дн.
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(role.averageDays / maxDays) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
          <div>
            <span className="font-medium text-gray-900">
              {stageStats.reduce((sum, stage) => sum + stage.roles.reduce((s, r) => s + r.completedCount, 0), 0)}
            </span>
            <span className="ml-1">выполнено</span>
          </div>
          <div>
            <span className="font-medium text-gray-900">
              {stageStats.reduce((sum, stage) => sum + stage.roles.reduce((s, r) => s + r.pendingCount, 0), 0)}
            </span>
            <span className="ml-1">в работе</span>
          </div>
        </div>
      </div>
    </div>
  );
}

