import type { HeadConfig } from "./types";

const ABSOLUTE_ASSET_URL_PATTERN = /^(?:[a-zA-Z][a-zA-Z\d+\-.]*:|\/\/|#)/;

export function normalizeHeadBasename(value?: string) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") {
    return "";
  }

  return trimmed.replace(/\/+$/, "");
}

export function resolveHeadAssetUrl(assetUrl: string, basename?: string) {
  const normalizedAssetUrl = assetUrl.trim();
  const normalizedBasename = normalizeHeadBasename(basename);

  if (!normalizedAssetUrl || !normalizedBasename) {
    return normalizedAssetUrl;
  }

  if (ABSOLUTE_ASSET_URL_PATTERN.test(normalizedAssetUrl)) {
    return normalizedAssetUrl;
  }

  if (normalizedAssetUrl.startsWith("/")) {
    return normalizedAssetUrl;
  }

  if (
    normalizedBasename !== "/" &&
    (normalizedAssetUrl === normalizedBasename ||
      normalizedAssetUrl.startsWith(`${normalizedBasename}/`))
  ) {
    return normalizedAssetUrl;
  }

  if (normalizedBasename === "/") {
    return normalizedAssetUrl.startsWith("/") ? normalizedAssetUrl : `/${normalizedAssetUrl}`;
  }

  if (normalizedAssetUrl.startsWith("/")) {
    return `${normalizedBasename}${normalizedAssetUrl}`;
  }

  return `${normalizedBasename}/${normalizedAssetUrl}`;
}

export function normalizeHeadConfig(head?: HeadConfig, inheritedBasename?: string) {
  if (!head) {
    return undefined;
  }

  const effectiveBasename =
    normalizeHeadBasename(head.basename) ??
    normalizeHeadBasename(inheritedBasename);
  const normalizedRouteBasePath = normalizeHeadBasename(head.routeBasePath);
  const normalizedTransportBasePath = normalizeHeadBasename(
    head.transportBasePath,
  );

  const normalizedHead: HeadConfig = {
    ...head,
    ...(effectiveBasename !== undefined ? { basename: effectiveBasename } : {}),
    ...(normalizedRouteBasePath !== undefined
      ? { routeBasePath: normalizedRouteBasePath }
      : {}),
    ...(normalizedTransportBasePath !== undefined
      ? { transportBasePath: normalizedTransportBasePath }
      : {}),
  };

  if (normalizedHead.favicon) {
    normalizedHead.favicon = resolveHeadAssetUrl(
      normalizedHead.favicon,
      effectiveBasename,
    );
  }

  if (normalizedHead.links) {
    normalizedHead.links = normalizedHead.links.map((link) => ({
      ...link,
      href: resolveHeadAssetUrl(link.href, effectiveBasename),
    }));
  }

  return normalizedHead;
}
