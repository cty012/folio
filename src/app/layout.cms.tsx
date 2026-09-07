import { requireLocalPage } from "@/lib/local-page";
import RootLayout from "./layout.public";
export { metadata } from "./layout.public";
export const dynamic = "force-dynamic";
export default async function LocalLayout({ children }: { children: React.ReactNode }) {
  await requireLocalPage();
  return <RootLayout>{children}</RootLayout>;
}
