const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? '';

const normalizedApiBaseUrl = rawApiBaseUrl.replace(/\/+$/, '');

export function buildApiUrl(pathname: string): string {
  const normalizedPathname = pathname.startsWith('/') ? pathname : `/${pathname}`;

  if (!normalizedApiBaseUrl) {
    return normalizedPathname;
  }

  return `${normalizedApiBaseUrl}${normalizedPathname}`;
}
