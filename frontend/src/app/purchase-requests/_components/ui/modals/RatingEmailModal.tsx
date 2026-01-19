'use client';

import { Search, Check, X } from 'lucide-react';
import type { PurchaseRequest } from '../../types/purchase-request.types';
import type { UserSuggestion } from '../../services/users.api';

interface User {
  id: number;
  username: string;
  email: string | null;
  surname: string | null;
  name: string | null;
}

interface RatingEmailModalProps {
  isOpen: boolean;
  request: PurchaseRequest | null;
  userSearchRef: React.RefObject<HTMLDivElement | null>;
  selectedUser: User | null;
  userSearchQuery: string;
  userSuggestions: UserSuggestion[];
  showUserSuggestions: boolean;
  emailText: string;
  onClose: () => void;
  onUserSearchChange: (value: string) => void;
  onUserPick: (user: User, displayName: string, userEmail: string) => void;
  onEmailTextChange: (value: string) => void;
  onCopy: () => Promise<void>;
  onSend: () => Promise<void>;
  onUserSearchFocus?: () => void;
}

export default function RatingEmailModal({
  isOpen,
  request,
  userSearchRef,
  selectedUser,
  userSearchQuery,
  userSuggestions,
  showUserSuggestions,
  emailText,
  onClose,
  onUserSearchChange,
  onUserPick,
  onEmailTextChange,
  onCopy,
  onSend,
  onUserSearchFocus,
}: RatingEmailModalProps) {
  if (!isOpen || !request) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Отправка письма для оценки</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Получатель
            </label>
            <div ref={userSearchRef} className="relative">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                {selectedUser && (
                  <Check className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-600" />
                )}
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => onUserSearchChange(e.target.value)}
                  onFocus={() => {
                    if (userSuggestions.length > 0 && onUserSearchFocus) {
                      onUserSearchFocus();
                    }
                  }}
                  placeholder={selectedUser ? "Инициатор выбран автоматически" : "Начните вводить имя, фамилию, username или email"}
                  className={`w-full pl-8 ${selectedUser ? 'pr-8' : 'pr-3'} py-2 text-sm text-gray-900 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${selectedUser ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}
                />
              </div>
              
              {showUserSuggestions && userSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {userSuggestions.map((user) => {
                    const displayName = user.surname && user.name 
                      ? `${user.surname} ${user.name}${user.email ? ` (${user.email})` : ''}`
                      : user.email 
                      ? `${user.email}${user.username ? ` (${user.username})` : ''}`
                      : user.username;
                    
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          const userObj: User = {
                            id: user.id,
                            username: user.username,
                            email: user.email,
                            surname: user.surname,
                            name: user.name,
                          };
                          const userEmail = user.email || user.username;
                          onUserPick(userObj, displayName, userEmail);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                      >
                        {displayName}
                      </button>
                    );
                  })}
                </div>
              )}
              
              {selectedUser && (
                <div className="mt-2 px-3 py-2 text-sm bg-blue-50 text-blue-900 rounded-lg">
                  Выбран: {selectedUser.surname && selectedUser.name 
                    ? `${selectedUser.surname} ${selectedUser.name}${selectedUser.email ? ` (${selectedUser.email})` : ''}`
                    : selectedUser.email || selectedUser.username}
                </div>
              )}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Текст письма
            </label>
            <textarea
              value={emailText}
              onChange={(e) => onEmailTextChange(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              onClick={async () => {
                try {
                  await onCopy();
                } catch (error) {
                  console.error('Error copying rating email:', error);
                  alert(error instanceof Error ? error.message : 'Не удалось скопировать письмо');
                }
              }}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Скопировать в буфер
            </button>
            <button
              onClick={onSend}
              disabled={!request}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Отправить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
