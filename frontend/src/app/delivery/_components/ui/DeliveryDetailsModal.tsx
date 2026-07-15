'use client';

import { useEffect } from 'react';
import type { Delivery } from '../types/delivery.types';
import { useDeliveryDetails } from '../hooks/useDeliveryDetails';
import { DeliveryContractSection } from './details/DeliveryContractSection';
import { DeliveryModalFooter } from './details/DeliveryModalFooter';
import { DeliveryModalHeader } from './details/DeliveryModalHeader';
import { DeliveryPaymentsSection } from './details/DeliveryPaymentsSection';
import { DeliverySupplySection } from './details/DeliverySupplySection';
import { DeliveryTimeline } from './details/DeliveryTimeline';

interface DeliveryDetailsModalProps {
  delivery: Delivery | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Карточка поставки: договор, параметры поставки и распределение оплат. */
export default function DeliveryDetailsModal({ delivery, onClose, onSaved }: DeliveryDetailsModalProps) {
  const details = useDeliveryDetails({ delivery, onClose, onSaved });

  useEffect(() => {
    if (!delivery) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [delivery, onClose]);

  if (!delivery) return null;

  const { form, shipment } = details;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-[radial-gradient(120%_120%_at_50%_0%,rgba(43,49,64,.85)_0%,rgba(23,27,36,.92)_100%)] p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-[1180px] flex-col overflow-hidden rounded-[18px] bg-white shadow-[0_40px_100px_-30px_rgba(0,0,0,.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        <DeliveryModalHeader delivery={delivery} onClose={onClose} />

        <div className="flex-1 overflow-auto">
          <DeliveryTimeline steps={details.timeline} />

          <div className="grid grid-cols-1 items-start lg:grid-cols-[1fr_1fr_1.15fr]">
            <DeliveryContractSection delivery={delivery} />

            <DeliverySupplySection
              delivery={delivery}
              paymentScheme={form.paymentScheme}
              onSelectPaymentScheme={details.selectPaymentScheme}
              schemeOptions={details.schemeOptions}
              selectedSchemeId={form.selectedSchemeId}
              onSelectSchemeId={form.setSelectedSchemeId}
              shipmentStatus={shipment.shipmentStatus}
              shipmentSaving={shipment.saving}
              onChangeShipmentStatus={shipment.changeStatus}
              awaitingDeliveredDate={shipment.awaitingDeliveredDate}
              deliveredDate={shipment.deliveredDate}
              onChangeDeliveredDate={shipment.setDeliveredDate}
              onConfirmDeliveredDate={shipment.confirmDeliveredDate}
              onCancelDeliveredDate={shipment.cancelDeliveredDate}
              deliveryTermDays={form.deliveryTermDays}
              onChangeDeliveryTermDays={form.setDeliveryTermDays}
            />

            <DeliveryPaymentsSection
              delivery={delivery}
              paymentScheme={form.paymentScheme}
              loading={details.paymentsLoading}
              advanceCandidates={form.advanceCandidates}
              factCandidates={form.factCandidates}
              advancePaymentIds={form.advancePaymentIds}
              factPaymentIds={form.factPaymentIds}
              onToggleAdvance={form.toggleAdvance}
              onToggleFact={form.toggleFact}
              distributed={form.distributed}
            />
          </div>

          {details.error && (
            <div className="mx-[30px] mb-5 rounded-[10px] border border-[#f3c6c7] bg-[#fef4f4] px-3 py-2 text-[13px] text-[#d64148]">
              {details.error}
            </div>
          )}
        </div>

        <DeliveryModalFooter
          canReset={details.canReset}
          resetting={details.resetting}
          onReset={details.resetDistribution}
          onClose={onClose}
          canSubmit={details.canSubmit}
          submitting={details.submitting}
          onSave={details.save}
        />
      </div>
    </div>
  );
}
