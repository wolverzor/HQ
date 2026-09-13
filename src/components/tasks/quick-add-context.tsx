"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

interface QuickAddDefaults {
  deadline?: string | null;
}

interface QuickAddState {
  isOpen: boolean;
  defaults: QuickAddDefaults;
  open: (defaults?: QuickAddDefaults) => void;
  close: () => void;
}

const QuickAddContext = createContext<QuickAddState | null>(null);

export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [defaults, setDefaults] = useState<QuickAddDefaults>({});

  const open = useCallback((d?: QuickAddDefaults) => {
    setDefaults(d ?? {});
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo(() => ({ isOpen, defaults, open, close }), [isOpen, defaults, open, close]);

  return <QuickAddContext.Provider value={value}>{children}</QuickAddContext.Provider>;
}

export function useQuickAdd() {
  const ctx = useContext(QuickAddContext);
  if (!ctx) throw new Error("useQuickAdd must be used within QuickAddProvider");
  return ctx;
}
