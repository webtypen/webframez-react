import type { ReactNode } from "react";

export type RouteParams = Record<string, string>;
export type RouteSearchParams = Record<string, string | string[]>;

export type AbortRouteOptions = {
  status?: number;
  message?: string;
  payload?: unknown;
};

export type RouteContext<TData = unknown> = {
  pathname: string;
  params: RouteParams;
  searchParams: RouteSearchParams;
  cookies: Record<string, string>;
  data?: TData;
  abort: (options?: AbortRouteOptions) => never;
};

export type InferPageData<TDataResolver> =
  TDataResolver extends (...args: any[]) => any
    ? Awaited<ReturnType<TDataResolver>>
    : TDataResolver;
export type PageProps<TData = unknown> = RouteContext<InferPageData<TData>>;
export type PagePropsFromData<TDataResolver extends (...args: any[]) => any> =
  PageProps<InferPageData<TDataResolver>>;

export type ErrorPageProps<TData = unknown> = RouteContext<TData> & {
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

export type ClientNavigationPayload = {
  model: ReactNode;
  head: HeadConfig;
};

export type HeadResolver<TContext = RouteContext> = (
  context: TContext
) => HeadConfig | Promise<HeadConfig>;

export type PageDataResolver<TData = unknown> = (
  context: RouteContext
) => TData | Promise<TData>;

export type PageModule<TData = unknown> = {
  default: (props: PageProps<TData>) => ReactNode | Promise<ReactNode>;
  Head?: HeadResolver<PageProps<TData>>;
  Data?: PageDataResolver<TData>;
};

export type LayoutModule = {
  default: (props: RouteContext) => ReactNode | Promise<ReactNode>;
  Head?: HeadResolver<RouteContext>;
};

export type ErrorModule = {
  default: (props: ErrorPageProps) => ReactNode | Promise<ReactNode>;
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
