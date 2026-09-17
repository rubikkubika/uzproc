'use client';

import CommentCountButton from '@/app/_components/comments/CommentCountButton';

interface Props {
  count: number;
  isOpen: boolean;
  onOpen: (anchor: DOMRect) => void;
}

/** Ячейка «Комментарий»: облачко комментариев, клик открывает попап у кнопки. */
export default function DeliveryCommentsCell({ count, isOpen, onOpen }: Props) {
  return (
    <span data-delivery-comments className="inline-flex">
      <CommentCountButton
        count={count}
        isOpen={isOpen}
        onClick={(e) => onOpen(e.currentTarget.getBoundingClientRect())}
      />
    </span>
  );
}
