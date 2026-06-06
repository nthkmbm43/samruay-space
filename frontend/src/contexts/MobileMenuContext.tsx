'use client';

import React, { createContext, useContext, useState } from 'react';

type MobileMenuContextType = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  toggle: () => void;
};

const MobileMenuContext = createContext<MobileMenuContextType | undefined>(undefined);

export function MobileMenuProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen((prev) => !prev);

  return (
    <MobileMenuContext.Provider value={{ isOpen, setIsOpen, toggle }}>
      {children}
    </MobileMenuContext.Provider>
  );
}

export function useMobileMenu() {
  const context = useContext(MobileMenuContext);
  if (context === undefined) {
    throw new Error('useMobileMenu must be used within a MobileMenuProvider');
  }
  return context;
}
