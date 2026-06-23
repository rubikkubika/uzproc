'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { X, Trash2, Plus, Search, Factory, Contact } from 'lucide-react';
import { PurchasePlanItemSupplier, SupplierOption, SupplierContactDraft } from '../types/purchase-plan-items.types';
import SupplierContactCardFields from './SupplierContactCardFields';

const emptyContactDraft = (): SupplierContactDraft => ({
  fullName: '', position: '', telegram: '', email: '', phone: '', comment: '',
});

const isContactDraftEmpty = (c: SupplierContactDraft): boolean =>
  !c.fullName.trim() && !c.position.trim() && !c.telegram.trim() &&
  !c.email.trim() && !c.phone.trim() && !c.comment.trim();

interface PurchasePlanItemsSuppliersModalProps {
  isOpen: boolean;
  itemId: number;
  suppliers: PurchasePlanItemSupplier[];
  loading: boolean;
  onClose: () => void;
  onAddExisting: (itemId: number, supplierId: number) => Promise<number>;
  onCreate: (itemId: number, payload: { name?: string; inn?: string; kpp?: string; type?: string; contacts?: SupplierContactDraft[] }) => Promise<number>;
  onRemove: (itemId: number, linkId: number) => Promise<number>;
  onSearch: (query: string) => Promise<SupplierOption[]>;
  onAddContact: (itemId: number, supplierId: number, payload: SupplierContactDraft) => Promise<void>;
  onRemoveContact: (itemId: number, supplierId: number, contactId: number) => Promise<void>;
}

/**
 * Модальное окно списка контрагентов (поставщиков), привязанных к позиции плана закупок.
 * Поддерживает: просмотр, удаление, добавление существующего (поиск) и создание нового.
 */
export default function PurchasePlanItemsSuppliersModal({
  isOpen,
  itemId,
  suppliers,
  loading,
  onClose,
  onAddExisting,
  onCreate,
  onRemove,
  onSearch,
  onAddContact,
  onRemoveContact,
}: PurchasePlanItemsSuppliersModalProps) {
  const [mode, setMode] = useState<'search' | 'create'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SupplierOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Поля формы создания нового контрагента
  const [newName, setNewName] = useState('');
  const [newInn, setNewInn] = useState('');
  const [newKpp, setNewKpp] = useState('');
  const [newType, setNewType] = useState('');
  // Карточки контактов нового контрагента: уже сохранённые + текущая редактируемая
  const [savedNewContacts, setSavedNewContacts] = useState<SupplierContactDraft[]>([]);
  const [newContactDraft, setNewContactDraft] = useState<SupplierContactDraft | null>(null);

  // Состояние формы добавления карточки контакта к существующему КА (по supplierId)
  const [contactDraftFor, setContactDraftFor] = useState<number | null>(null);
  const [contactDraft, setContactDraft] = useState<SupplierContactDraft>(emptyContactDraft());

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Сброс состояния при открытии/смене позиции
  useEffect(() => {
    if (isOpen) {
      setMode('search');
      setSearchQuery('');
      setSearchResults([]);
      setError(null);
      setNewName('');
      setNewInn('');
      setNewKpp('');
      setNewType('');
      setSavedNewContacts([]);
      setNewContactDraft(null);
      setContactDraftFor(null);
      setContactDraft(emptyContactDraft());
    }
  }, [isOpen, itemId]);

  // Поиск с debounce
  useEffect(() => {
    if (mode !== 'search') return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await onSearch(searchQuery);
        // Исключаем уже привязанных
        const linkedIds = new Set(suppliers.map(s => s.supplierId));
        setSearchResults(results.filter(r => !linkedIds.has(r.id)));
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery, mode, onSearch, suppliers]);

  const handleAddExisting = useCallback(async (supplierId: number) => {
    setSubmitting(true);
    setError(null);
    try {
      await onAddExisting(itemId, supplierId);
      setSearchResults(prev => prev.filter(r => r.id !== supplierId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка при добавлении');
    } finally {
      setSubmitting(false);
    }
  }, [itemId, onAddExisting]);

  const handleCreate = useCallback(async () => {
    if (!newName.trim() && !newInn.trim()) {
      setError('Укажите наименование или ИНН контрагента');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Учитываем сохранённые карточки и текущую заполненную (если не пустая)
      const contacts = [
        ...savedNewContacts,
        ...(newContactDraft && !isContactDraftEmpty(newContactDraft) ? [newContactDraft] : []),
      ].filter(c => !isContactDraftEmpty(c));
      await onCreate(itemId, {
        name: newName.trim() || undefined,
        inn: newInn.trim() || undefined,
        kpp: newKpp.trim() || undefined,
        type: newType.trim() || undefined,
        contacts: contacts.length > 0 ? contacts : undefined,
      });
      setNewName('');
      setNewInn('');
      setNewKpp('');
      setNewType('');
      setSavedNewContacts([]);
      setNewContactDraft(null);
      setMode('search');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка при создании');
    } finally {
      setSubmitting(false);
    }
  }, [itemId, newName, newInn, newKpp, newType, savedNewContacts, newContactDraft, onCreate]);

  // Карточки контактов нового контрагента (форма создания)
  // Начать заполнение новой карточки (доступно только когда нет открытой)
  const startNewContactCard = useCallback(() => {
    setNewContactDraft(emptyContactDraft());
    setError(null);
  }, []);
  const updateNewContactDraft = useCallback((patch: Partial<SupplierContactDraft>) => {
    setNewContactDraft(prev => (prev ? { ...prev, ...patch } : prev));
  }, []);
  // Сохранить текущую карточку в список
  const saveNewContactDraft = useCallback(() => {
    if (!newContactDraft || isContactDraftEmpty(newContactDraft)) {
      setError('Заполните хотя бы одно поле карточки контакта');
      return;
    }
    setSavedNewContacts(prev => [...prev, newContactDraft]);
    setNewContactDraft(null);
    setError(null);
  }, [newContactDraft]);
  // Отменить добавление текущей карточки
  const cancelNewContactDraft = useCallback(() => {
    setNewContactDraft(null);
    setError(null);
  }, []);
  const removeSavedNewContact = useCallback((index: number) => {
    setSavedNewContacts(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Переход в режим создания: по умолчанию сразу открываем первую карточку контакта
  const switchToCreateMode = useCallback(() => {
    setMode('create');
    setError(null);
    setSavedNewContacts(prev => {
      if (prev.length === 0) {
        setNewContactDraft(curr => curr ?? emptyContactDraft());
      }
      return prev;
    });
  }, []);

  // Добавление карточки контакта к существующему КА
  const handleSaveContactDraft = useCallback(async (supplierId: number) => {
    if (isContactDraftEmpty(contactDraft)) {
      setError('Заполните хотя бы одно поле карточки контакта');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onAddContact(itemId, supplierId, contactDraft);
      setContactDraftFor(null);
      setContactDraft(emptyContactDraft());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка при добавлении карточки');
    } finally {
      setSubmitting(false);
    }
  }, [itemId, contactDraft, onAddContact]);

  const handleRemoveContact = useCallback(async (supplierId: number, contactId: number) => {
    setSubmitting(true);
    setError(null);
    try {
      await onRemoveContact(itemId, supplierId, contactId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка при удалении карточки');
    } finally {
      setSubmitting(false);
    }
  }, [itemId, onRemoveContact]);

  const handleRemove = useCallback(async (linkId: number) => {
    setSubmitting(true);
    setError(null);
    try {
      await onRemove(itemId, linkId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка при удалении');
    } finally {
      setSubmitting(false);
    }
  }, [itemId, onRemove]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Factory className="w-5 h-5 text-gray-600" />
            Контрагенты позиции плана #{itemId}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-3 px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Текущий список контрагентов */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Привязанные контрагенты</h3>
            {loading ? (
              <div className="text-center py-4 text-gray-500">Загрузка...</div>
            ) : suppliers && suppliers.length > 0 ? (
              <div className="space-y-2">
                {suppliers.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {s.name || s.code || `Поставщик #${s.supplierId}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {s.inn ? `ИНН: ${s.inn}` : ''}{s.inn && s.kpp ? ' · ' : ''}{s.kpp ? `КПП: ${s.kpp}` : ''}
                          {s.code ? `${(s.inn || s.kpp) ? ' · ' : ''}Код: ${s.code}` : ''}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemove(s.id)}
                        disabled={submitting}
                        className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 flex-shrink-0"
                        title="Удалить привязку"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Карточки контактов поставщика */}
                    {s.contacts && s.contacts.length > 0 && (
                      <div className="space-y-1.5 pl-2 border-l-2 border-gray-200">
                        {s.contacts.map((c) => (
                          <div key={c.id} className="flex items-start justify-between gap-2 bg-white rounded border border-gray-200 px-2 py-1.5">
                            <div className="min-w-0 text-xs text-gray-700">
                              <div className="font-medium text-gray-900 flex items-center gap-1">
                                <Contact className="w-3.5 h-3.5 text-gray-400" />
                                {c.fullName || 'Без имени'}
                                {c.position ? <span className="text-gray-500 font-normal">— {c.position}</span> : null}
                              </div>
                              <div className="text-gray-500">
                                {[
                                  c.phone ? `тел: ${c.phone}` : '',
                                  c.telegram ? `tg: ${c.telegram}` : '',
                                  c.email ? `email: ${c.email}` : '',
                                ].filter(Boolean).join(' · ')}
                              </div>
                              {c.comment ? <div className="text-gray-500 italic">{c.comment}</div> : null}
                            </div>
                            <button
                              onClick={() => s.supplierId && handleRemoveContact(s.supplierId, c.id)}
                              disabled={submitting}
                              className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 flex-shrink-0"
                              title="Удалить карточку контакта"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Добавление карточки контакта к этому КА */}
                    {contactDraftFor === s.supplierId ? (
                      <div className="space-y-2 pl-2 border-l-2 border-blue-200">
                        <SupplierContactCardFields
                          value={contactDraft}
                          index={0}
                          onChange={(patch) => setContactDraft(prev => ({ ...prev, ...patch }))}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => s.supplierId && handleSaveContactDraft(s.supplierId)}
                            disabled={submitting}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                          >
                            {submitting ? 'Сохранение...' : 'Сохранить карточку'}
                          </button>
                          <button
                            onClick={() => { setContactDraftFor(null); setContactDraft(emptyContactDraft()); }}
                            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setContactDraftFor(s.supplierId ?? null); setContactDraft(emptyContactDraft()); setError(null); }}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Добавить карточку контакта
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 py-2">Контрагенты не добавлены</div>
            )}
          </div>

          {/* Переключатель режима добавления */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => { setMode('search'); setError(null); }}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors flex items-center gap-1 ${
                  mode === 'search'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                Выбрать существующего
              </button>
              <button
                onClick={switchToCreateMode}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors flex items-center gap-1 ${
                  mode === 'create'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Создать нового
              </button>
            </div>

            {mode === 'search' ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по наименованию или ИНН..."
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {searching ? (
                  <div className="text-center py-3 text-gray-500 text-sm">Поиск...</div>
                ) : searchResults.length > 0 ? (
                  <div className="max-h-56 overflow-y-auto space-y-1 border border-gray-200 rounded-lg p-1">
                    {searchResults.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => handleAddExisting(r.id)}
                        disabled={submitting}
                        className="w-full text-left px-3 py-2 rounded hover:bg-blue-50 transition-colors disabled:opacity-50"
                      >
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {r.name || r.code || `Поставщик #${r.id}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {r.inn ? `ИНН: ${r.inn}` : ''}{r.code ? `${r.inn ? ' · ' : ''}Код: ${r.code}` : ''}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 py-2">
                    {searchQuery.trim() ? 'Ничего не найдено' : 'Введите запрос для поиска'}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Наименование контрагента"
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newInn}
                    onChange={(e) => setNewInn(e.target.value)}
                    placeholder="ИНН"
                    className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={newKpp}
                    onChange={(e) => setNewKpp(e.target.value)}
                    placeholder="КПП"
                    className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <input
                  type="text"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  placeholder="Вид (необязательно)"
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />

                {/* Карточки контактов нового контрагента */}
                <div className="pt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Карточки контактов</span>
                    {/* Добавить новую карточку можно только когда нет открытой на редактирование */}
                    {newContactDraft === null && (
                      <button
                        type="button"
                        onClick={startNewContactCard}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Добавить карточку
                      </button>
                    )}
                  </div>

                  {/* Уже сохранённые карточки (свернуто) */}
                  {savedNewContacts.length > 0 && (
                    <div className="space-y-1.5">
                      {savedNewContacts.map((c, i) => (
                        <div key={i} className="flex items-start justify-between gap-2 bg-white rounded border border-gray-200 px-2 py-1.5">
                          <div className="min-w-0 text-xs text-gray-700">
                            <div className="font-medium text-gray-900">
                              {c.fullName || 'Без имени'}
                              {c.position ? <span className="text-gray-500 font-normal"> — {c.position}</span> : null}
                            </div>
                            <div className="text-gray-500">
                              {[
                                c.phone ? `тел: ${c.phone}` : '',
                                c.telegram ? `tg: ${c.telegram}` : '',
                                c.email ? `email: ${c.email}` : '',
                              ].filter(Boolean).join(' · ')}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSavedNewContact(i)}
                            className="text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                            title="Удалить карточку"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Текущая карточка в режиме заполнения */}
                  {newContactDraft !== null && (
                    <div className="space-y-2">
                      <SupplierContactCardFields
                        value={newContactDraft}
                        index={savedNewContacts.length}
                        onChange={updateNewContactDraft}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={saveNewContactDraft}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                        >
                          Сохранить карточку
                        </button>
                        <button
                          type="button"
                          onClick={cancelNewContactDraft}
                          className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Отменить добавление
                        </button>
                      </div>
                    </div>
                  )}

                  {savedNewContacts.length === 0 && newContactDraft === null && (
                    <div className="text-xs text-gray-400">Карточки контактов не добавлены</div>
                  )}
                </div>

                <button
                  onClick={handleCreate}
                  disabled={submitting || (!newName.trim() && !newInn.trim())}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Сохранение...' : 'Создать и добавить'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
