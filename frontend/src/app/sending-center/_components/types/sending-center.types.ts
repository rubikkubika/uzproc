export type SendingCenterTabId = 'purchases' | 'specifications' | 'deliveries';

export interface SendingCenterTab {
  id: SendingCenterTabId;
  label: string;
}
