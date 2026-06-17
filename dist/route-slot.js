"use client";

// src/route-slot.tsx
import React from "react";
import { Fragment, jsx } from "react/jsx-runtime";
var ROUTE_CHILDREN_SLOT_SENTINEL = "__webframezRouteChildrenSlot";
var ROUTE_CHILDREN_SLOT_DISPLAY_NAME = "WebframezRouteChildrenSlot";
var RouteChildrenSlotContext = React.createContext(null);
function RouteChildrenSlotProvider({
  children,
  page
}) {
  return /* @__PURE__ */ jsx(RouteChildrenSlotContext.Provider, { value: page, children });
}
function RouteChildrenSlot() {
  return /* @__PURE__ */ jsx(Fragment, { children: React.useContext(RouteChildrenSlotContext) });
}
RouteChildrenSlot.displayName = ROUTE_CHILDREN_SLOT_DISPLAY_NAME;
RouteChildrenSlot[ROUTE_CHILDREN_SLOT_SENTINEL] = true;
export {
  RouteChildrenSlot,
  RouteChildrenSlotProvider
};
