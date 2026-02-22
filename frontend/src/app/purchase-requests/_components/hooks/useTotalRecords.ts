import { useEffect } from 'react';
import { fetchTotalRecords } from '../services/purchaseRequests.api';

interface UseTotalRecordsProps {
  setTotalRecords: (count: number) => void;
}

export function useTotalRecords({
  setTotalRecords,
}: UseTotalRecordsProps) {
  useEffect(() => {
    let cancelled = false;
    fetchTotalRecords()
      .then((count) => {
        if (!cancelled) setTotalRecords(count);
      })
      .catch((err) => {
        if (!cancelled) console.error('Error fetching total records:', err);
      });
    return () => { cancelled = true; };
  }, [setTotalRecords]);
}
