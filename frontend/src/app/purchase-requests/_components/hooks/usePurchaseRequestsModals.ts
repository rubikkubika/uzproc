import { useState, useRef } from 'react';
import type { PurchaseRequest } from '../types/purchase-request.types';

export function usePurchaseRequestsModals() {
  // Состояние для модального окна оценки
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [selectedRequestForRating, setSelectedRequestForRating] = useState<PurchaseRequest | null>(null);
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<{
    id: number;
    username: string;
    email: string | null;
    surname: string | null;
    name: string | null;
  } | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [userSuggestions, setUserSuggestions] = useState<Array<{
    id: number;
    username: string;
    email: string | null;
    surname: string | null;
    name: string | null;
  }>>([]);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [emailText, setEmailText] = useState('');
  const userSearchRef = useRef<HTMLDivElement>(null);

  // Состояние для модального окна просмотра отправленного приглашения
  const [isSentInvitationModalOpen, setIsSentInvitationModalOpen] = useState(false);
  const [sentInvitationDetails, setSentInvitationDetails] = useState<{
    recipient: string;
    emailText: string;
  } | null>(null);

  // Состояние для модального окна просмотра оценки
  const [isFeedbackDetailsModalOpen, setIsFeedbackDetailsModalOpen] = useState(false);
  const [selectedRequestForFeedback, setSelectedRequestForFeedback] = useState<PurchaseRequest | null>(null);
  const [feedbackDetails, setFeedbackDetails] = useState<{
    recipient: string | null;
    speedRating: number | null;
    qualityRating: number | null;
    satisfactionRating: number | null;
    uzprocRating: number | null;
    usedUzproc: boolean | null;
    comment: string | null;
  } | null>(null);
  const [loadingFeedbackDetails, setLoadingFeedbackDetails] = useState(false);

  return {
    // Rating Modal
    isRatingModalOpen,
    setIsRatingModalOpen,
    selectedRequestForRating,
    setSelectedRequestForRating,
    selectedUserEmail,
    setSelectedUserEmail,
    selectedUser,
    setSelectedUser,
    userSearchQuery,
    setUserSearchQuery,
    userSuggestions,
    setUserSuggestions,
    showUserSuggestions,
    setShowUserSuggestions,
    emailText,
    setEmailText,
    userSearchRef,

    // Sent Invitation Modal
    isSentInvitationModalOpen,
    setIsSentInvitationModalOpen,
    sentInvitationDetails,
    setSentInvitationDetails,

    // Feedback Details Modal
    isFeedbackDetailsModalOpen,
    setIsFeedbackDetailsModalOpen,
    selectedRequestForFeedback,
    setSelectedRequestForFeedback,
    feedbackDetails,
    setFeedbackDetails,
    loadingFeedbackDetails,
    setLoadingFeedbackDetails,
  };
}
