'use client';

import { useParams } from 'next/navigation';
import TokenSpecificationFeedback from '../_components/TokenSpecificationFeedback';

export default function SpecificationFeedbackTokenPage() {
  const params = useParams();
  const token = params?.token as string;

  if (!token) {
    return null;
  }
  return <TokenSpecificationFeedback token={token} />;
}
