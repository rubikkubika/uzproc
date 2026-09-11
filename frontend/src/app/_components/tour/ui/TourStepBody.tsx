'use client';

import type { TourBlock } from '../types/tour.types';

interface TourStepBodyProps {
  body: readonly TourBlock[];
}

/** Описание шага: абзацы, списки «термин — пояснение» и выделенное примечание. */
export default function TourStepBody({ body }: TourStepBodyProps) {
  return (
    <div className="flex flex-col gap-2.5">
      {body.map((block, index) => {
        if (block.kind === 'text') {
          return (
            <p key={index} className="text-xs leading-relaxed text-gray-600">
              {block.text}
            </p>
          );
        }

        if (block.kind === 'note') {
          return (
            <p
              key={index}
              className="rounded-lg border-l-2 border-blue-400 bg-blue-50/60 px-2.5 py-1.5 text-xs leading-relaxed text-gray-700"
            >
              {block.text}
            </p>
          );
        }

        return (
          <ul key={index} className="flex flex-col gap-1.5 pl-0.5">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} className="flex gap-2 text-xs leading-relaxed text-gray-600">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-blue-500" />
                <span className="min-w-0">
                  {item.term ? <span className="font-semibold text-gray-900">{item.term}</span> : null}
                  {item.term ? ' — ' : null}
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
        );
      })}
    </div>
  );
}
