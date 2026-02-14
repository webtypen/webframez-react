import type { Root } from "react-dom/client";

export type ClientOptions = {
  rootId?: string;
  rscEndpoint?: string;
};

export type RouterClient = {
  push: (href: string) => void;
  replace: (href: string) => void;
  refresh: () => void;
};

export type CookieOptions = {
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
  maxAge?: number;
  expires?: Date;
};

export type CookieClient = {
  all: () => Record<string, string>;
  get: (name: string) => string | undefined;
  set: (name: string, value: string, options?: CookieOptions) => void;
  remove: (name: string, options?: Omit<CookieOptions, "maxAge" | "expires">) => void;
};

export function mountWebframezClient(options?: ClientOptions): Root;
export function useRouter(): RouterClient;
export function useCookie(): CookieClient;
