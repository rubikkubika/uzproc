import { useState, useEffect } from 'react';
import { PurchasePlanItem, ModalTab } from '../types/purchase-plan-items.types';

export const usePurchasePlanItemsModals = () => {
  const [detailsModalOpen, setDetailsModalOpen] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Record<number, ModalTab>>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });
  const [userRole, setUserRole] = useState<string | null>(null);
  const [pendingDateChange, setPendingDateChange] = useState<{ 
    itemId: number;
    field: 'requestDate' | 'newContractDate';
    newDate: string;
    oldRequestDate?: string | null;
    oldNewContractDate?: string | null;
    newRequestDate?: string | null;
    newNewContractDate?: string | null;
  } | null>(null);

  // Загружаем роль пользователя при монтировании
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const response = await fetch('/api/auth/check');
        const data = await response.json();
        if (data.authenticated && data.role) {
          setUserRole(data.role);
        }
      } catch (error) {
        console.error('Error checking user role:', error);
      }
    };
    checkUserRole();
  }, []);

  // Проверка, может ли пользователь редактировать (только admin)
  const canEdit = userRole === 'admin';

  return {
    detailsModalOpen,
    setDetailsModalOpen,
    activeTab,
    setActiveTab,
    isCreateModalOpen,
    setIsCreateModalOpen,
    isAuthModalOpen,
    setIsAuthModalOpen,
    authUsername,
    setAuthUsername,
    authPassword,
    setAuthPassword,
    authError,
    setAuthError,
    authLoading,
    setAuthLoading,
    errorModal,
    setErrorModal,
    userRole,
    canEdit,
    pendingDateChange,
    setPendingDateChange,
  };
};
