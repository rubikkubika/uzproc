import { useState, useRef } from 'react';
import type { PurchaseRequest } from '../types/purchase-request.types';
import type { UserSuggestion } from '../services/users.api';

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
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [emailText, setEmailText] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailTo, setEmailTo] = useState('');
  const [emailCc, setEmailCc] = useState('');
  const userSearchRef = useRef<HTMLDivElement>(null);

  // Состояние для модального окна просмотра отправленного приглашения
  const [isSentInvitationModalOpen, setIsSentInvitationModalOpen] = useState(false);
  const [selectedRequestForSentInvitation, setSelectedRequestForSentInvitation] = useState<PurchaseRequest | null>(null);
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

  // Модальное окно комментариев
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [selectedRequestForComments, setSelectedRequestForComments] = useState<PurchaseRequest | null>(null);

  // Модальное окно планового СЛА (только для сложности 4)
  const [isPlannedSlaModalOpen, setIsPlannedSlaModalOpen] = useState(false);
  const [selectedRequestForPlannedSla, setSelectedRequestForPlannedSla] = useState<PurchaseRequest | null>(null);

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
    emailSubject,
    setEmailSubject,
    emailTo,
    setEmailTo,
    emailCc,
    setEmailCc,
    userSearchRef,

    // Sent Invitation Modal
    isSentInvitationModalOpen,
    setIsSentInvitationModalOpen,
    selectedRequestForSentInvitation,
    setSelectedRequestForSentInvitation,
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

    // Comments Modal
    isCommentsModalOpen,
    setIsCommentsModalOpen,
    selectedRequestForComments,
    setSelectedRequestForComments,

    // Planned SLA Modal
    isPlannedSlaModalOpen,
    setIsPlannedSlaModalOpen,
    selectedRequestForPlannedSla,
    setSelectedRequestForPlannedSla,
  };
}
