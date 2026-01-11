import { useState, useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';
import { Version } from '../types/purchase-plan-items.types';

export const usePurchasePlanItemsVersions = () => {
  const [isCreateVersionModalOpen, setIsCreateVersionModalOpen] = useState(false);
  const [isVersionsListModalOpen, setIsVersionsListModalOpen] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [versionDescription, setVersionDescription] = useState('');
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [selectedVersionInfo, setSelectedVersionInfo] = useState<Version | null>(null);
  
  const isViewingArchiveVersion = selectedVersionId !== null && selectedVersionInfo !== null && !selectedVersionInfo.isCurrent;

  const loadVersions = useCallback(async (selectedYear: number | null) => {
    if (!selectedYear) {
      setVersions([]);
      return;
    }
    setLoadingVersions(true);
    try {
      const response = await fetch(`${getBackendUrl()}/api/purchase-plan-versions/year/${selectedYear}`);
      if (response.ok) {
        const data = await response.json();
        setVersions(data);
        // Автоматически выбираем текущую версию, если она есть
        const currentVersion = data.find((v: Version) => v.isCurrent);
        if (currentVersion) {
          // Используем функциональное обновление для проверки текущего значения
          setSelectedVersionId(prev => {
            if (prev === null) {
              return currentVersion.id;
            }
            return prev;
          });
          // Устанавливаем информацию о версии отдельно
          setSelectedVersionInfo(prev => {
            if (prev === null && currentVersion) {
              return currentVersion;
            }
            return prev;
          });
        }
      } else {
        console.error('Error loading versions');
        setVersions([]);
      }
    } catch (error) {
      console.error('Error loading versions:', error);
      setVersions([]);
    } finally {
      setLoadingVersions(false);
    }
  }, []);

  return {
    isCreateVersionModalOpen,
    setIsCreateVersionModalOpen,
    isVersionsListModalOpen,
    setIsVersionsListModalOpen,
    versions,
    setVersions,
    versionDescription,
    setVersionDescription,
    loadingVersions,
    selectedVersionId,
    setSelectedVersionId,
    selectedVersionInfo,
    setSelectedVersionInfo,
    isViewingArchiveVersion,
    loadVersions,
  };
};
