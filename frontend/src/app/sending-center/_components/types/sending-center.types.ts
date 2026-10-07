export type SendingCenterTabId = 'purchases' | 'management-report' | 'specifications' | 'deliveries';

export interface SendingCenterTab {
  id: SendingCenterTabId;
  label: string;
}
