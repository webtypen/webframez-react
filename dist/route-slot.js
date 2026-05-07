"use client";

// src/route-slot.tsx
import React from "react";
import { Fragment, jsx } from "react/jsx-runtime";
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
export {
  RouteChildrenSlot,
  RouteChildrenSlotProvider
};
