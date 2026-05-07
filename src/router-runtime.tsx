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

function isReactElementLike(node: unknown): node is {
  type: unknown;
  key?: React.Key | null;
  props?: { children?: React.ReactNode };
} {
  if (!node || typeof node !== "object") {
    return false;
  }

  try {
    return "type" in node && "props" in node;
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

  if (isReactElementLike(node) && isRouteChildrenType(node.type)) {
    return routeChildren;
  }

  const isValidElement = React.isValidElement(node);
  if (!isValidElement && !isReactElementLike(node)) {
    return node;
  }

  if (isValidElement && isRouteChildrenType(node.type)) {
    return routeChildren;
  }

  const props = (node as { props?: { children?: React.ReactNode } }).props ?? {};
  if (!("children" in props)) {
    return node;
  }

  const nextChildren = injectRouteChildren(props.children, routeChildren);
  if (nextChildren === props.children) {
    return node;
  }

  if (isValidElement) {
    if (Array.isArray(nextChildren)) {
      return React.cloneElement(node, undefined, ...nextChildren);
    }

    return React.cloneElement(node, undefined, nextChildren);
  }

  const elementLike = node as {
    type: React.ElementType;
    key?: React.Key | null;
    props?: Record<string, unknown>;
  };
  const nextProps = {
    ...(elementLike.props ?? {}),
    children: nextChildren,
    ...(elementLike.key !== undefined && elementLike.key !== null ? { key: elementLike.key } : {}),
  };

  return React.createElement(elementLike.type, nextProps);
}
