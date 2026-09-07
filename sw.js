const pendingVcfs = new Map();

self.addEventListener("message", event => {
  const data = event.data || {};
  if (data.type !== "STORE_VCF" || !data.token || typeof data.vcf !== "string") return;
  for (const [token, item] of pendingVcfs) {
    if (item.expires < Date.now()) pendingVcfs.delete(token);
  }
  pendingVcfs.set(data.token, {
    filename: String(data.filename || "cursisten.vcf").replace(/[\r\n"\\]/g, "-"),
    vcf: data.vcf,
    expires: Date.now() + 10 * 60 * 1000,
  });
  event.ports[0]?.postMessage({ ok: true });
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (!url.pathname.endsWith("/contacten.vcf")) return;
  event.respondWith((async () => {
    const token = url.searchParams.get("t");
    const item = token && pendingVcfs.get(token);
    if (!item || item.expires < Date.now()) {
      if (token) pendingVcfs.delete(token);
      return new Response("Het contactbestand is niet meer beschikbaar. Ga terug en tik opnieuw op de knop.", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
      });
    }
    return new Response(item.vcf, {
      headers: {
        "Content-Type": "text/vcard; charset=utf-8",
        "Content-Disposition": `attachment; filename="${item.filename}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  })());
});
