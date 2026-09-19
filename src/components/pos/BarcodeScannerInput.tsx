import { useState, useRef, useEffect } from 'react';
import { Scan, Search } from 'lucide-react';

interface BarcodeScannerInputProps {
  onScan: (skuOrSearch: string) => void;
  placeholder?: string;
}

export default function BarcodeScannerInput({ onScan, placeholder = "Scan barcode or enter SKU..." }: BarcodeScannerInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onScan(value.trim());
      setValue('');
    }
  };

  // Keep scanner ready by focusing input if clicked on container
  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} onClick={handleContainerClick} className="relative flex-1">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-primary">
        <Scan size={18} className="animate-pulse" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-12 pr-10 py-3.5 bg-card border-2 border-primary/20 rounded-2xl text-sm font-bold placeholder:text-muted-foreground focus:border-primary outline-none transition-all shadow-sm"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground hover:text-foreground px-2 py-1 bg-foreground/5 rounded-lg"
        >
          Clear
        </button>
      )}
    </form>
  );
}
