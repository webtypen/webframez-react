import type { HeadConfig } from "./types";

const ABSOLUTE_ASSET_URL_PATTERN = /^(?:[a-zA-Z][a-zA-Z\d+\-.]*:|\/\/|#)/;

export function normalizeAssetsBaseUrl(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed === "/") {
    return "/";
  }

  return trimmed.replace(/\/+$/, "");
}

export function resolveHeadAssetUrl(assetUrl: string, assetsBaseUrl?: string) {
  const normalizedAssetUrl = assetUrl.trim();
  const normalizedAssetsBaseUrl = normalizeAssetsBaseUrl(assetsBaseUrl);

  if (!normalizedAssetUrl || !normalizedAssetsBaseUrl) {
    return normalizedAssetUrl;
  }

  if (ABSOLUTE_ASSET_URL_PATTERN.test(normalizedAssetUrl)) {
    return normalizedAssetUrl;
  }

  if (
    normalizedAssetsBaseUrl !== "/" &&
    (normalizedAssetUrl === normalizedAssetsBaseUrl ||
      normalizedAssetUrl.startsWith(`${normalizedAssetsBaseUrl}/`))
  ) {
    return normalizedAssetUrl;
  }

  if (normalizedAssetsBaseUrl === "/") {
    return normalizedAssetUrl.startsWith("/") ? normalizedAssetUrl : `/${normalizedAssetUrl}`;
  }

  if (normalizedAssetUrl.startsWith("/")) {
    return `${normalizedAssetsBaseUrl}${normalizedAssetUrl}`;
  }

  return `${normalizedAssetsBaseUrl}/${normalizedAssetUrl}`;
}

export function normalizeHeadConfig(
  head?: HeadConfig,
  inheritedAssetsBaseUrl?: string,
) {
  if (!head) {
    return undefined;
  }

  const effectiveAssetsBaseUrl =
    normalizeAssetsBaseUrl(head.assetsBaseUrl) ??
    normalizeAssetsBaseUrl(inheritedAssetsBaseUrl);

  const normalizedHead: HeadConfig = {
    ...head,
    ...(effectiveAssetsBaseUrl ? { assetsBaseUrl: effectiveAssetsBaseUrl } : {}),
  };

  if (normalizedHead.favicon) {
    normalizedHead.favicon = resolveHeadAssetUrl(
      normalizedHead.favicon,
      effectiveAssetsBaseUrl,
    );
  }

  if (normalizedHead.links) {
    normalizedHead.links = normalizedHead.links.map((link) => ({
      ...link,
      href: resolveHeadAssetUrl(link.href, effectiveAssetsBaseUrl),
    }));
  }

  return normalizedHead;
}
