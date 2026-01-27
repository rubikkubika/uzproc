import { useState } from 'react';
import { PurchasePlanItem, ModalTab } from '../types/purchase-plan-items.types';
import { useAuth } from './useAuth';

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
  const [pendingDateChange, setPendingDateChange] = useState<{ 
    itemId: number;
    field: 'requestDate' | 'newContractDate';
    newDate: string;
    oldRequestDate?: string | null;
    oldNewContractDate?: string | null;
    newRequestDate?: string | null;
    newNewContractDate?: string | null;
  } | null>(null);

  // Используем общий хук для получения данных аутентификации
  const { userRole, canEdit } = useAuth();

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
