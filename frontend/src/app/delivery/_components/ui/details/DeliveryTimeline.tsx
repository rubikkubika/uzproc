import { Calendar, Check } from 'lucide-react';
import type { TimelineStep } from '../../hooks/useDeliveryTimeline';

interface Props {
  steps: TimelineStep[];
}

const CONNECTOR_DONE = 'bg-[#22a15b]';
const CONNECTOR_IDLE = 'bg-[#e3e5e9]';

function StepNode({ step }: { step: TimelineStep }) {
  if (step.state === 'done') {
    return (
      <div className="z-[1] flex h-8 w-8 items-center justify-center rounded-full bg-[#22a15b] shadow-[0_3px_8px_-2px_rgba(34,161,91,.5)]">
        <Check className="h-4 w-4 text-white" strokeWidth={3} />
      </div>
    );
  }
  if (step.state === 'current') {
    return (
      <div className="z-[1] flex h-8 w-8 items-center justify-center rounded-full bg-[#4f46e5] shadow-[0_3px_8px_-2px_rgba(79,70,229,.5)]">
        <Calendar className="h-4 w-4 text-white" strokeWidth={2.5} />
      </div>
    );
  }
  return <div className="z-[1] h-8 w-8 rounded-full border-2 border-dashed border-[#cfd3da] bg-white" />;
}

/** Цепочка поставки: синхронизация → оплата → план → факт/ЭСФ. */
export function DeliveryTimeline({ steps }: Props) {
  return (
    <div className="border-b border-[#eceef1] bg-[#fbfbfc] px-[30px] pb-[26px] pt-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="text-[11px] font-bold uppercase tracking-[.07em] text-[#98a2b3]">Цепочка поставки</div>
        <div className="text-xs text-[#98a2b3]">
          Дедлайн = дата синхронизации + срок · пересчитается при сохранении
        </div>
      </div>
      <div className="flex items-start">
        {steps.map((step, i) => {
          const prevDone = i > 0 && steps[i - 1].state === 'done';
          const isCurrent = step.state === 'current';
          return (
            <div key={step.key} className="relative flex flex-1 flex-col items-center text-center">
              <StepNode step={step} />
              {i > 0 && (
                <div
                  className={`absolute left-[-50%] right-1/2 top-4 h-[3px] ${prevDone ? CONNECTOR_DONE : CONNECTOR_IDLE}`}
                />
              )}
              {i < steps.length - 1 && (
                <div
                  className={`absolute left-1/2 right-[-50%] top-4 h-[3px] ${
                    step.state === 'done' ? CONNECTOR_DONE : CONNECTOR_IDLE
                  }`}
                />
              )}
              <div
                className={`mt-[11px] text-[13px] ${
                  isCurrent
                    ? 'font-bold text-[#4f46e5]'
                    : step.state === 'done'
                      ? 'font-semibold text-[#101828]'
                      : 'font-semibold text-[#98a2b3]'
                }`}
              >
                {step.label}
              </div>
              <div
                className={`mt-px text-xs tabular-nums ${
                  isCurrent ? 'font-semibold text-[#4f46e5]' : step.state === 'done' ? 'text-[#98a2b3]' : 'text-[#b0b6c0]'
                }`}
              >
                {step.date}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
