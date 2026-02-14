import type React from "react";

export type RouteParams = Record<string, string>;
export type RouteSearchParams = Record<string, string | string[]>;

export type AbortRouteOptions = {
  status?: number;
  message?: string;
  payload?: unknown;
};

export type RouteContext = {
  pathname: string;
  params: RouteParams;
  searchParams: RouteSearchParams;
  cookies: Record<string, string>;
  abort: (options?: AbortRouteOptions) => never;
};

export type PageProps = RouteContext;

export type ErrorPageProps = RouteContext & {
  statusCode: number;
  message: string;
  payload?: unknown;
};

export type HeadMetaTag = {
  name?: string;
  property?: string;
  content: string;
  httpEquiv?: string;
  charset?: string;
};

export type HeadLinkTag = {
  rel: string;
  href: string;
  type?: string;
  sizes?: string;
  media?: string;
};

export type HeadConfig = {
  title?: string;
  description?: string;
  favicon?: string;
  meta?: HeadMetaTag[];
  links?: HeadLinkTag[];
};

export type HeadResolver<TContext = RouteContext> = (
  context: TContext
) => HeadConfig | Promise<HeadConfig>;

export type PageModule = {
  default: (props: PageProps) => React.ReactNode;
  Head?: HeadResolver<RouteContext>;
};

export type LayoutModule = {
  default: (props: RouteContext) => React.ReactNode;
  Head?: HeadResolver<RouteContext>;
};

export type ErrorModule = {
  default: (props: ErrorPageProps) => React.ReactNode;
  Head?: HeadResolver<ErrorPageProps>;
};

export type CreateHtmlShellOptions = {
  title?: string;
  rscEndpoint?: string;
  clientScriptUrl?: string;
  headTags?: string;
  rootHtml?: string;
  basename?: string;
  liveReloadPath?: string;
  liveReloadServerId?: string;
};

export type SendRSCOptions = {
  moduleMap?: Record<string, unknown>;
  onError?: (error: unknown) => void;
  statusCode?: number;
  contentType?: string;
};
