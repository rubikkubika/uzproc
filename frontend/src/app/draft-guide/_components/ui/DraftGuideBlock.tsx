'use client';

import React from 'react';
import type { GuideBlock, GuideData } from '../types/draft-guide.types';
import { fillGuideText } from '../utils/draft-guide.utils';
import DraftGuideSelectionFigure from './DraftGuideSelectionFigure';
import DraftGuideDatesFigure from './DraftGuideDatesFigure';
import {
  GuideCheckedExample,
  GuideExcludeExample,
  GuidePurchasersExample,
  GuideSubjectsExample,
} from './DraftGuideExamples';

interface DraftGuideBlockProps {
  block: GuideBlock;
  data: GuideData;
}

const CELL_CLASS = 'px-2 py-2 text-xs text-gray-900 border-r border-gray-300 align-top';
const HEADER_CLASS = 'px-2 py-2 text-left text-xs font-medium text-gray-500 border-r border-gray-300';

/** Один блок описания шага инструкции: текст, список, таблица, схема или пример из драфта. */
export default function DraftGuideBlock({ block, data }: DraftGuideBlockProps) {
  const fill = (text: string) => fillGuideText(text, data);

  switch (block.kind) {
    case 'text':
      return <p className="text-xs text-gray-700 leading-relaxed">{fill(block.text)}</p>;

    case 'list':
      return (
        <ul className="list-disc pl-5 space-y-1 text-xs text-gray-700 leading-relaxed">
          {block.items.map((item, index) => (
            <li key={index}>
              {item.term ? <span className="font-medium text-gray-900">{item.term}: </span> : null}
              {fill(item.text)}
            </li>
          ))}
        </ul>
      );

    case 'ordered':
      return (
        <ol className="list-decimal pl-5 space-y-1 text-xs text-gray-700 leading-relaxed">
          {block.items.map((item, index) => (
            <li key={index}>{fill(item)}</li>
          ))}
        </ol>
      );

    case 'cards':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {block.cards.map(card => (
            <div
              key={card.title}
              className={`rounded border px-3 py-2 ${
                card.tone === 'accent' ? 'border-blue-200 bg-blue-50' : 'border-gray-300 bg-gray-50'
              }`}
            >
              <div className={`text-xs font-semibold mb-1 ${card.tone === 'accent' ? 'text-blue-800' : 'text-gray-700'}`}>
                {card.title}
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-xs text-gray-700">
                {card.items.map((item, index) => (
                  <li key={index}>{fill(item)}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );

    case 'badges':
      return (
        <div className="flex flex-col gap-2">
          {block.items.map(item => (
            <div key={item.label} className="flex items-start gap-2 text-xs text-gray-700 leading-relaxed">
              <span
                className={`flex-shrink-0 px-2 py-0.5 rounded border font-medium ${
                  item.tone === 'accent'
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-red-50 border-red-300 text-red-700'
                }`}
              >
                {item.label}
              </span>
              <span>{fill(item.text)}</span>
            </div>
          ))}
        </div>
      );

    case 'fields':
      return (
        <table className="w-full border border-gray-300">
          <thead className="bg-gray-50 border-b border-gray-300">
            <tr>
              <th className={HEADER_CLASS}>Поле</th>
              <th className={HEADER_CLASS}>Откуда</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Что проверить</th>
            </tr>
          </thead>
          <tbody>
            {block.rows.map(row => (
              <tr key={row.field} className="border-b border-gray-200 last:border-b-0">
                <td className={`${CELL_CLASS} font-medium whitespace-nowrap`}>{row.field}</td>
                <td className={`${CELL_CLASS} text-gray-700`}>{fill(row.source)}</td>
                <td className="px-2 py-2 text-xs text-gray-900 align-top">{fill(row.check)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );

    case 'confirm':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {block.cards.map(card => (
            <div key={card.label} className="rounded border border-gray-300 bg-white px-3 py-2">
              <div className="text-[11px] text-gray-500 mb-1">{card.label}</div>
              <div className="text-xs font-semibold text-gray-900">{card.title}</div>
              <div className="text-xs text-gray-700 mt-0.5">{fill(card.text)}</div>
            </div>
          ))}
        </div>
      );

    case 'chips':
      return (
        <div className="flex flex-wrap gap-1.5">
          {block.items.map(item => (
            <span key={item} className="px-2 py-1 text-xs rounded border border-gray-300 bg-white text-gray-700">
              {item}
            </span>
          ))}
        </div>
      );

    case 'figure-selection':
      return <DraftGuideSelectionFigure values={data} />;

    case 'figure-dates':
      return <DraftGuideDatesFigure values={data} />;

    case 'example-purchasers':
      return <GuidePurchasersExample rows={data.purchasers} />;

    case 'example-subjects':
      return <GuideSubjectsExample subjects={data.subjects} />;

    case 'example-exclude':
      return <GuideExcludeExample />;

    case 'example-checked':
      return <GuideCheckedExample rows={data.checked} />;

    default:
      return null;
  }
}
