(async () => {
  "use strict";
  const COMPR_EXTENSION_ID = "fpikkglicmmlhkcmnobecnkpomfnnclh";
  const status = document.getElementById("status");
  const continueLink = document.getElementById("continue");
  const params = new URLSearchParams(location.hash.slice(1));
  const hadQuery = Boolean(location.search);
  history.replaceState(null, "", location.pathname);
  const allowedParameters = new Set(["access_token", "refresh_token", "expires_at", "expires_in", "token_type", "type", "error", "error_code", "error_description"]);
  const unexpectedParameter = [...params.keys()].some(key => !allowedParameters.has(key));
  const expiresIn = Number(params.get("expires_in"));
  const session = {
    access_token: params.get("access_token"),
    refresh_token: params.get("refresh_token"),
    expires_at: Math.floor(Date.now() / 1000) + (Number.isFinite(expiresIn) ? expiresIn : 3600)
  };
  const expectedOrigin = location.protocol === "https:" && location.hostname === "getcompr.nl" && location.port === "";
  if (!expectedOrigin || hadQuery || unexpectedParameter || params.get("error") ||
      params.get("token_type") !== "bearer" || !["magiclink", "signup"].includes(params.get("type")) ||
      !session.access_token || !session.refresh_token ||
      !Number.isFinite(expiresIn) || expiresIn <= 0 || expiresIn > 604800) {
    status.textContent = "De loginlink is ongeldig of verlopen. Vraag vanuit COMPR een nieuwe link aan.";
    return;
  }
  const receiverUrl = `chrome-extension://${COMPR_EXTENSION_ID}/auth-receiver.html`;
  const receiverParams = new URLSearchParams();
  for (const name of ["access_token", "refresh_token", "expires_at", "expires_in", "token_type", "type"]) {
    const value = params.get(name);
    if (value !== null) receiverParams.set(name, value);
  }
  const receiverTarget = `${receiverUrl}#${receiverParams}`;
  continueLink.href = receiverUrl;
  continueLink.rel = "noreferrer";
  continueLink.addEventListener("click", event => {
    event.preventDefault();
    location.replace(receiverTarget);
  });
  continueLink.hidden = false;
  try {
    const saved = JSON.parse(localStorage.getItem("compr-founding-interest") || "null");
    if (saved && ["pro", "ultimate"].includes(saved.plan)) {
      const response = await fetch("https://taosgvfdnblnopaywimf.supabase.co/rest/v1/rpc/compr_register_founding_interest", {
        method: "POST",
        headers: {
          apikey: "sb_publishable_cZtYQI3ApFTw8kU2a2AoBQ_nGdlSw1W",
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ p_plan: saved.plan, p_source: saved.source || "website" })
      });
      if (!response.ok) throw new Error("interest_registration_failed");
      localStorage.removeItem("compr-founding-interest");
      status.textContent = "Je e-mailadres en Founding Access-interesse zijn bevestigd. Rond de login af in COMPR.";
      return;
    }
  } catch {
    status.textContent = "Je e-mailadres is bevestigd. Je Founding Access-interesse kon nog niet worden opgeslagen; probeer het formulier later opnieuw.";
    return;
  }
  status.textContent = "Je e-mailadres is bevestigd. Rond de login af in COMPR.";
})();
