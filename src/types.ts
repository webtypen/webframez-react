import type React from "react";

export type RouteParams = Record<string, string | string[]>;
export type RouteSearchParams = Record<string, string | string[]>;
export type RouteRequestHeaders = Record<string, string | string[] | undefined>;

export type RouteRequestContext = {
  host: string | null;
  pathname: string;
  originalPathname: string;
  headers: RouteRequestHeaders;
};

export type AbortRouteOptions = {
  status?: number;
  message?: string;
  payload?: unknown;
};

export type RouteContext<TData = any> = {
  pathname: string;
  params: RouteParams;
  searchParams: RouteSearchParams;
  cookies: Record<string, string>;
  request: RouteRequestContext;
  data?: TData;
  abort: (options?: AbortRouteOptions) => never;
};

export type InferPageData<TDataResolver> =
  TDataResolver extends (...args: any[]) => any
    ? Awaited<ReturnType<TDataResolver>>
    : TDataResolver;
export type PageProps<TData = any> = RouteContext<InferPageData<TData>>;
export type PagePropsFromData<TDataResolver extends (...args: any[]) => any> =
  PageProps<InferPageData<TDataResolver>>;

export type ErrorPageProps<TData = any> = RouteContext<TData> & {
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
  basename?: string;
  favicon?: string;
  meta?: HeadMetaTag[];
  links?: HeadLinkTag[];
};

export type ClientNavigationPayload = {
  model: React.ReactNode;
  head: HeadConfig;
};

export type HeadResolver<TContext = RouteContext> = (
  context: TContext,
) => HeadConfig | Promise<HeadConfig>;

export type PageDataResolver<TData = any> = (
  context: RouteContext,
) => TData | Promise<TData>;

export type RouteMiddlewareResult = Record<string, unknown> | undefined | void;
export type RouteMiddlewareResolver<TData = any> = (
  context: RouteContext<TData>,
) => RouteMiddlewareResult | Promise<RouteMiddlewareResult>;
export type RouteMiddlewareRegistry = Record<string, RouteMiddlewareResolver<any>>;
export type RouteMiddlewareConfig = string | string[];

export type PageModule<TData = any> = {
  default: (
    props: PageProps<TData>,
  ) => React.ReactNode | Promise<React.ReactNode>;
  Head?: HeadResolver<PageProps<TData>>;
  Data?: PageDataResolver<TData>;
  middlewares?: RouteMiddlewareConfig;
};

export type LayoutModule = {
  default: (props: RouteContext) => React.ReactNode | Promise<React.ReactNode>;
  Head?: HeadResolver<RouteContext>;
};

export type ErrorModule = {
  default: (
    props: ErrorPageProps,
  ) => React.ReactNode | Promise<React.ReactNode>;
  Head?: HeadResolver<ErrorPageProps>;
};

export type CreateHtmlShellOptions = {
  title?: string;
  rscEndpoint?: string;
  clientScriptUrl?: string;
  headTags?: string;
  rootHtml?: string;
  initialFlightData?: string;
  clientRenderMode?: "hydrate" | "mount";
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
