"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { searchPlaces, type PlaceCandidate } from "@/lib/actions/places";

export function LocationCombobox({
  name,
  defaultValue,
  placeholder,
  id,
}: {
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  id?: string;
}) {
  const [value, setValue] = React.useState(defaultValue ?? "");
  const [suggestions, setSuggestions] = React.useState<PlaceCandidate[]>([]);
  const [open, setOpen] = React.useState(false);
  const [activeIdx, setActiveIdx] = React.useState(-1);
  const [pending, startTransition] = React.useTransition();
  const lastQueryRef = React.useRef<string>("");
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const reactId = React.useId();
  const listId = `location-combobox-list-${reactId}`;

  React.useEffect(() => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      lastQueryRef.current = "";
      return;
    }
    if (trimmed === lastQueryRef.current) return;
    const handle = window.setTimeout(() => {
      lastQueryRef.current = trimmed;
      startTransition(async () => {
        const results = await searchPlaces(trimmed);
        // ユーザがその後別の文字を打って lastQueryRef が変わっていれば破棄
        if (lastQueryRef.current === trimmed) {
          setSuggestions(results);
        }
      });
    }, 350);
    return () => window.clearTimeout(handle);
  }, [value]);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const choose = (s: PlaceCandidate) => {
    setValue(s.name);
    setSuggestions([]);
    setOpen(false);
    setActiveIdx(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(suggestions.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      if (activeIdx >= 0 && activeIdx < suggestions.length) {
        e.preventDefault();
        choose(suggestions[activeIdx]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showList = open && suggestions.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        name={name}
        value={value}
        autoComplete="off"
        placeholder={placeholder}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          activeIdx >= 0 ? `${listId}-option-${activeIdx}` : undefined
        }
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setActiveIdx(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 w-full max-h-64 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md"
        >
          {suggestions.map((s, i) => {
            const isActive = i === activeIdx;
            return (
              <li
                key={`${s.name}-${i}`}
                id={`${listId}-option-${i}`}
                role="option"
                aria-selected={isActive}
              >
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(s)}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={
                    "w-full px-3 py-2 text-left text-sm" +
                    (isActive ? " bg-accent text-accent-foreground" : "")
                  }
                >
                  <div className="font-medium leading-tight">{s.name}</div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {s.address}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {pending && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
          検索中…
        </span>
      )}
    </div>
  );
}
