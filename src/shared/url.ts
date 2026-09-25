const TRACKING_PARAM = /^(utm_|ref$|ref_|fbclid$|gclid$)/i;

export function cleanUrl(raw: string): string {
  try {
    const url = new URL(raw);
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAM.test(key)) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return raw;
  }
}
