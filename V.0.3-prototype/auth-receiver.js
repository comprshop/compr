(async () => {
  "use strict";
  const status = document.getElementById("status");
  const params = new URLSearchParams(location.hash.slice(1));
  history.replaceState(null, "", location.pathname);
  const allowedParameters = new Set(["access_token", "refresh_token", "expires_at", "expires_in", "token_type", "type"]);
  const unexpectedParameter = [...params.keys()].some(key => !allowedParameters.has(key));
  const expiresIn = Number(params.get("expires_in"));
  let sessionStored = false;
  try {
    if (location.search || unexpectedParameter || params.get("token_type") !== "bearer" ||
        !["magiclink", "signup"].includes(params.get("type")) ||
        !Number.isFinite(expiresIn) || expiresIn <= 0 || expiresIn > 604800) throw new Error("INVALID_AUTH_CALLBACK");
    await ComprAuth.setSession({
      access_token: params.get("access_token"), refresh_token: params.get("refresh_token"),
      expires_at: Math.floor(Date.now() / 1000) + expiresIn
    });
    sessionStored = true;
    const me = await ComprApi.me();
    status.textContent = `Je bent ingelogd. Plan: ${me.plan}. Resterende zoekopdrachten: ${me.usage?.remaining ?? "onbekend"}.`;
  } catch {
    if (sessionStored) await ComprAuth.clearSession().catch(() => {});
    status.textContent = "De login kon niet worden afgerond. Vraag een nieuwe link aan.";
  }
})();
