import type React from "react";

export type LinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to: string;
  basename?: string;
};

export function Link(props: LinkProps): React.ReactElement;

export type RedirectProps = {
  to: string;
  basename?: string;
  replace?: boolean;
};

export function Redirect(props: RedirectProps): null;
