import { SEARCH_CHIPS, SEARCH_PLACEHOLDER } from '../constants/purchase-tracker.constants';
import { SearchIcon } from './icons';

interface PurchaseTrackerSearchProps {
  query: string;
  onQueryChange: (value: string) => void;
  onChipClick: (value: string) => void;
}

/** Строка поиска с подсказками-чипами */
export default function PurchaseTrackerSearch({ query, onQueryChange, onChipClick }: PurchaseTrackerSearchProps) {
  return (
    <div className="flex flex-col gap-2.5 px-8 pt-6 pb-1">
      <div
        className="flex items-center gap-3 rounded-2xl bg-white px-[18px] py-[13px]"
        style={{ border: '1.5px solid #DFE3EB', boxShadow: '0 1px 2px rgba(16,24,40,.05)' }}
      >
        <SearchIcon />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={SEARCH_PLACEHOLDER}
          className="flex-1 border-none bg-transparent text-[15.5px] text-[#101828] outline-none placeholder:text-[#98A2B3]"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] text-[#98A2B3]">Например:</span>
        {SEARCH_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onChipClick(chip)}
            className="cursor-pointer rounded-full border-none bg-[#F2EEFC] px-3 py-[5px] text-[12.5px] font-medium text-[#6D28D9] hover:bg-[#E9E1FB]"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
