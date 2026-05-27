import { createContext, useContext, useState, type ReactNode } from "react";

interface SearchContextType {
  search: string;
  setSearch: (v: string) => void;
  heroVisible: boolean;
  setHeroVisible: (v: boolean) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState("");
  const [heroVisible, setHeroVisible] = useState(true);

  return (
    <SearchContext.Provider value={{ search, setSearch, heroVisible, setHeroVisible }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearchContext(): SearchContextType {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearchContext must be used within SearchProvider");
  return ctx;
}
