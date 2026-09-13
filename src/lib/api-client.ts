async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = typeof body.error === "string" ? body.error : JSON.stringify(body.error);
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(url: string) => fetch(url).then((r) => handle<T>(r)),
  post: <T>(url: string, data?: unknown) =>
    fetch(url, {
      method: "POST",
      headers: data ? { "Content-Type": "application/json" } : undefined,
      body: data ? JSON.stringify(data) : undefined,
    }).then((r) => handle<T>(r)),
  patch: <T>(url: string, data: unknown) =>
    fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => handle<T>(r)),
  delete: <T>(url: string) => fetch(url, { method: "DELETE" }).then((r) => handle<T>(r)),
};
