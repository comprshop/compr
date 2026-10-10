const ComprAuth = (() => {
  const projectRef = ComprRuntimeConfig.authProjectRef || "";
  if (projectRef && (projectRef !== "uhvukecryuvosuascics" ||
      ComprRuntimeConfig.apiBaseUrl !== "https://compr-backend-sandbox.onrender.com" ||
      ComprRuntimeConfig.supabaseUrl !== `https://${projectRef}.supabase.co`)) {
    throw new Error("SANDBOX_RUNTIME_MISMATCH");
  }
  const SESSION_KEY = projectRef ? `comprAuthSession:${projectRef}` : "comprAuthSession";
  function sessionIdentity(session) {
    if (!projectRef) return session?.user?.id || session?.user_id || null;
    try {
      const payload = JSON.parse(atob(session.access_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload.iss !== `${ComprRuntimeConfig.supabaseUrl}/auth/v1` ||
          !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(payload.sub)) return null;
      // Identity is only a storage namespace. The backend still verifies every token.
      if (session.user?.id && session.user.id !== payload.sub) return null;
      return payload.sub;
    } catch { return null; }
  }
  let refreshPromise = null;
  let guestPromise = null;
  let sessionGeneration = 0;

  async function sendNative(message, timeoutMs = 2500) {
    let timer;
    return Promise.race([
      ComprBrowser.runtime.sendNativeMessage("nl.getcompr.compr", message).catch(() => null),
      new Promise(resolve => { timer = setTimeout(() => resolve(null), timeoutMs); })
    ]).finally(() => clearTimeout(timer));
  }

  async function request(path, options = {}) {
    if (!ComprRuntimeConfig.supabaseUrl || !ComprRuntimeConfig.supabaseAnonKey) {
      throw new Error("SUPABASE_NOT_CONFIGURED");
    }
    const controller = (options.signal || typeof AbortController === "undefined") ? null : new AbortController();
    const timeout = controller ? setTimeout(() => controller.abort(), 12000) : null;
    let response;
    try {
      response = await fetch(`${ComprRuntimeConfig.supabaseUrl}/auth/v1${path}`, {
        ...options,
        signal: options.signal || controller?.signal,
        headers: { apikey: ComprRuntimeConfig.supabaseAnonKey, "Content-Type": "application/json", ...(options.headers || {}) }
      });
    } catch (error) {
      if (controller?.signal.aborted) { const timeoutError = new Error("Authentication timed out"); timeoutError.code = "AUTH_TIMEOUT"; throw timeoutError; }
      throw error;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error_description || payload.message || payload.msg || "AUTH_REQUEST_FAILED");
      error.code = payload.code || payload.error_code || (response.status === 429 ? "RATE_LIMITED" : "AUTH_REQUEST_FAILED");
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  async function signInWithEmail(email) {
    if (projectRef) throw new Error("SANDBOX_NATIVE_AUTH_ONLY");
    const redirect = encodeURIComponent(ComprRuntimeConfig.authCallbackUrl);
    return request(`/otp?redirect_to=${redirect}`, { method: "POST", body: JSON.stringify({ email, create_user: true }) });
  }

  async function verifyEmailOtp(email, token) {
    const payload = await request("/verify", { method: "POST",
      body: JSON.stringify({ email, token, type: "email" }) });
    return setSession(payload);
  }

  async function setSession(session, expectedGeneration = sessionGeneration) {
    const owner = sessionIdentity(session);
    if (projectRef && !owner) throw new Error("INVALID_AUTH_PROJECT");
    const safe = session?.access_token && session?.refresh_token ? {
      access_token: session.access_token, refresh_token: session.refresh_token,
      ...(owner ? { user: { id: owner } } : {}),
      ...(projectRef ? { projectRef } : {}),
      expires_at: session.expires_at || Math.floor(Date.now() / 1000) + Number(session.expires_in || 3600)
    } : null;
    if (!safe) throw new Error("INVALID_AUTH_SESSION");
    if (expectedGeneration !== sessionGeneration) throw new Error("STALE_AUTH_SESSION");
    await ComprBrowser.storage.local.set({ [SESSION_KEY]: safe });
    if (projectRef && ComprRuntimeConfig.platform === "safari") {
      await sendNative({ action: "auth.storeSession", projectRef, session: safe }).catch(() => null);
    }
    return safe;
  }

  async function getSession() {
    let stored = (await ComprBrowser.storage.local.get([SESSION_KEY]))[SESSION_KEY];
    if (projectRef && stored && !sessionIdentity(stored)) stored = null;
    if (ComprRuntimeConfig.platform === "safari") {
      const native = await sendNative({ action: "auth.session" });
      if (native?.ok === true && native.session?.access_token && native.session?.refresh_token && (!projectRef || sessionIdentity(native.session))) {
        const nativeExpiry=Number(native.session.expires_at||0),storedExpiry=Number(stored?.expires_at||0);
        if(!stored?.access_token||!stored?.refresh_token||nativeExpiry>storedExpiry)stored=await setSession(native.session);
      }
    }
    if (!stored?.access_token || !stored?.refresh_token) return null;
    if (projectRef && !stored.user?.id) stored = await setSession(stored);
    if (Number(stored.expires_at) > Math.floor(Date.now() / 1000) + 60) return stored;
    if (!refreshPromise) {
      const expectedGeneration = sessionGeneration;
      refreshPromise = request("/token?grant_type=refresh_token", { method: "POST",
        body: JSON.stringify({ refresh_token: stored.refresh_token }) })
        .then(session => setSession(session, expectedGeneration))
        .catch(async error => {
          if (error?.status === 400 || error?.status === 401) {
            await clearSession({ clearNative: true });
            error.code = "AUTH_REQUIRED";
          }
          throw error;
        })
        .finally(() => { refreshPromise = null; });
    }
    return refreshPromise;
  }

  async function clearSession({ clearNative = false } = {}) {
    sessionGeneration += 1;
    await ComprBrowser.storage.local.remove(SESSION_KEY);
    if (clearNative && ComprRuntimeConfig.platform === "safari") {
      await sendNative({ action: "auth.clear" });
    }
  }

  async function ensureGuestSession() {
    if (ComprRuntimeConfig.platform !== "safari" || ComprRuntimeConfig.guestMode !== true) {
      const error = new Error("Guest mode is unavailable"); error.code = "GUEST_MODE_DISABLED"; throw error;
    }
    const existing = await getSession();
    if (existing) return existing;
    if (!guestPromise) {
      const expectedGeneration = sessionGeneration;
      guestPromise = fetch(`${ComprRuntimeConfig.apiBaseUrl}/v1/guest/status`, {
        method: "GET", headers: { Accept: "application/json" }
      }).then(async response => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.enabled !== true) {
          const error = new Error("Guest beta is unavailable"); error.code = "GUEST_ACCESS_DISABLED"; throw error;
        }
        return request("/signup", { method: "POST", body: "{}" });
      })
        .then(session => setSession(session, expectedGeneration))
        .finally(() => { guestPromise = null; });
    }
    return guestPromise;
  }

  async function signOut() {
    const session = await getSession().catch(() => null);
    if (session) await request("/logout?scope=global", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } }).catch(() => {});
    await clearSession({ clearNative: true });
  }

  async function openAppleSignIn() {
    if (ComprRuntimeConfig.platform !== "safari") return false;
    const response = await sendNative({ action: "auth.openApp" }, 5000);
    return response?.ok === true;
  }

  return { signInWithEmail, verifyEmailOtp, ensureGuestSession, setSession, getSession, clearSession, signOut, openAppleSignIn };
})();
