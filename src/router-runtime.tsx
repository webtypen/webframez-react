import React from "react";

const ROUTE_CHILDREN_TAG = "webframez-route-children";
const ROUTE_CHILDREN_SENTINEL = "__webframezRouteChildren";
const ROUTE_CHILDREN_DISPLAY_NAME = "WebframezRouteChildren";

type RouteChildrenType = {
  (): React.ReactNode;
  displayName?: string;
  [ROUTE_CHILDREN_SENTINEL]?: boolean;
};

const RouteChildrenImpl: RouteChildrenType = () => React.createElement(ROUTE_CHILDREN_TAG);
RouteChildrenImpl.displayName = ROUTE_CHILDREN_DISPLAY_NAME;
RouteChildrenImpl[ROUTE_CHILDREN_SENTINEL] = true;

export const RouteChildren = RouteChildrenImpl;

function isRouteChildrenType(type: unknown) {
  if (type === ROUTE_CHILDREN_TAG || type === RouteChildren) {
    return true;
  }

  if (!type || (typeof type !== "function" && typeof type !== "object")) {
    return false;
  }

  try {
    const candidate = type as {
      displayName?: string;
      name?: string;
      [ROUTE_CHILDREN_SENTINEL]?: boolean;
    };

    return (
      candidate[ROUTE_CHILDREN_SENTINEL] === true ||
      candidate.displayName === ROUTE_CHILDREN_DISPLAY_NAME ||
      candidate.name === "RouteChildren"
    );
  } catch {
    return false;
  }
}

export function injectRouteChildren(
  node: React.ReactNode,
  routeChildren: React.ReactNode
): React.ReactNode {
  if (node === null || node === undefined || typeof node === "boolean") {
    return node;
  }

  if (Array.isArray(node)) {
    let changed = false;
    const next = node.map((child) => {
      const injected = injectRouteChildren(child, routeChildren);
      if (injected !== child) {
        changed = true;
      }
      return injected;
    });
    return changed ? next : node;
  }

  if (!React.isValidElement(node)) {
    return node;
  }

  if (isRouteChildrenType(node.type)) {
    return routeChildren;
  }

  const props = node.props as { children?: React.ReactNode };
  if (!("children" in props)) {
    return node;
  }

  const nextChildren = injectRouteChildren(props.children, routeChildren);
  if (nextChildren === props.children) {
    return node;
  }

  if (Array.isArray(nextChildren)) {
    return React.cloneElement(node, undefined, ...nextChildren);
  }

  return React.cloneElement(node, undefined, nextChildren);
}
