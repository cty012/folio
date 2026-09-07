export async function api<T>(body: object | string): Promise<T> {
  const response = await fetch(typeof body === "string" ? body : "/api/cms/", typeof body === "string" ? { cache: "no-store" } : {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Unable to save. Please try again.");
  return result;
}
