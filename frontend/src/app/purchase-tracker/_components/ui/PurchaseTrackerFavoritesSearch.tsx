import { SearchIcon } from './icons';

interface PurchaseTrackerFavoritesSearchProps {
  query: string;
  onQueryChange: (value: string) => void;
}

/** Отдельная строка поиска по избранному (в левом блоке под вкладками). */
export default function PurchaseTrackerFavoritesSearch({ query, onQueryChange }: PurchaseTrackerFavoritesSearchProps) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl bg-white px-3 py-2"
      style={{ border: '1.5px solid #DFE3EB', boxShadow: '0 1px 2px rgba(16,24,40,.05)' }}
    >
      <SearchIcon />
      <input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Поиск в избранном"
        className="min-w-0 flex-1 border-none bg-transparent text-[13px] text-[#101828] outline-none placeholder:text-[#98A2B3]"
      />
    </div>
  );
}
