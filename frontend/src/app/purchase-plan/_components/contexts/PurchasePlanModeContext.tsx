'use client';

import React, { createContext, useContext, useMemo } from 'react';

/**
 * Режим таблицы плана закупок: действующий план или драфт плана закупок.
 * Драфт хранится в тех же данных, но отделяется параметром draft=true в запросах к API.
 */
export interface PurchasePlanModeContextValue {
  /** true — раздел «Драфт плана закупок» */
  isDraft: boolean;
  /** Заголовок раздела */
  title: string;
}

const DEFAULT_MODE: PurchasePlanModeContextValue = {
  isDraft: false,
  title: 'План закупок',
};

const PurchasePlanModeContext = createContext<PurchasePlanModeContextValue>(DEFAULT_MODE);

interface PurchasePlanModeProviderProps {
  isDraft?: boolean;
  children: React.ReactNode;
}

export function PurchasePlanModeProvider({ isDraft = false, children }: PurchasePlanModeProviderProps) {
  const value = useMemo<PurchasePlanModeContextValue>(() => ({
    isDraft,
    title: isDraft ? 'Драфт плана закупок' : 'План закупок',
  }), [isDraft]);

  return (
    <PurchasePlanModeContext.Provider value={value}>
      {children}
    </PurchasePlanModeContext.Provider>
  );
}

export function usePurchasePlanMode(): PurchasePlanModeContextValue {
  return useContext(PurchasePlanModeContext);
}

/**
 * Добавляет признак драфта в query-параметры запроса к API плана закупок.
 */
export function appendDraftParam(params: URLSearchParams, isDraft: boolean): URLSearchParams {
  if (isDraft) {
    params.append('draft', 'true');
  }
  return params;
}
