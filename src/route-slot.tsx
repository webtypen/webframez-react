"use client";

import React from "react";

const RouteChildrenSlotContext = React.createContext<React.ReactNode>(null);

export function RouteChildrenSlotProvider({
  children,
  page,
}: {
  children: React.ReactNode;
  page: React.ReactNode;
}) {
  return (
    <RouteChildrenSlotContext.Provider value={page}>
      {children}
    </RouteChildrenSlotContext.Provider>
  );
}

export function RouteChildrenSlot() {
  return <>{React.useContext(RouteChildrenSlotContext)}</>;
}
