(async () => {
  "use strict";
  const status = document.getElementById("status");
  const params = new URLSearchParams(location.hash.slice(1));
  history.replaceState(null, "", location.pathname);
  const expiresIn = Number(params.get("expires_in"));
  try {
    await ComprAuth.setSession({
      access_token: params.get("access_token"), refresh_token: params.get("refresh_token"),
      expires_at: Math.floor(Date.now() / 1000) + (Number.isFinite(expiresIn) ? expiresIn : 3600)
    });
    const me = await ComprApi.me();
    status.textContent = `Je bent ingelogd. Plan: ${me.plan}. Resterende zoekopdrachten: ${me.usage?.remaining ?? "onbeperkt"}.`;
  } catch {
    status.textContent = "De login kon niet worden afgerond. Vraag een nieuwe link aan.";
  }
})();
