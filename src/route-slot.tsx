"use client";

import React from "react";

const ROUTE_CHILDREN_SLOT_SENTINEL = "__webframezRouteChildrenSlot";
const ROUTE_CHILDREN_SLOT_DISPLAY_NAME = "WebframezRouteChildrenSlot";

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

(RouteChildrenSlot as any).displayName = ROUTE_CHILDREN_SLOT_DISPLAY_NAME;
(RouteChildrenSlot as any)[ROUTE_CHILDREN_SLOT_SENTINEL] = true;
