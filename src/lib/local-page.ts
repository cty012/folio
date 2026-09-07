import { headers } from "next/headers";
import { notFound } from "next/navigation";

// Guard each data-producing page, not only its layout: layouts and pages can
// render concurrently, and an error layout does not suppress serialized props.
export async function requireLocalPage() {
  const host = (await headers()).get("host");
  if (process.env.FOLIO_MODE !== "cms" || !host || !/^(127\.0\.0\.1|localhost|\[::1\])(:[0-9]+)?$/.test(host)) notFound();
}
