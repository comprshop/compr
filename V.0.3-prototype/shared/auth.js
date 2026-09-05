const ComprAuth = (() => {
  const SESSION_KEY = "comprAuthSession";
  let refreshPromise = null;
  let guestPromise = null;
  let sessionGeneration = 0;

  async function request(path, options = {}) {
    if (!ComprRuntimeConfig.supabaseUrl || !ComprRuntimeConfig.supabaseAnonKey) {
      throw new Error("SUPABASE_NOT_CONFIGURED");
    }
    const response = await fetch(`${ComprRuntimeConfig.supabaseUrl}/auth/v1${path}`, {
      ...options,
      headers: { apikey: ComprRuntimeConfig.supabaseAnonKey, "Content-Type": "application/json", ...(options.headers || {}) }
    });
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
    const redirect = encodeURIComponent(ComprRuntimeConfig.authCallbackUrl);
    return request(`/otp?redirect_to=${redirect}`, { method: "POST", body: JSON.stringify({ email, create_user: true }) });
  }

  async function verifyEmailOtp(email, token) {
    const payload = await request("/verify", { method: "POST",
      body: JSON.stringify({ email, token, type: "email" }) });
    return setSession(payload);
  }

  async function setSession(session, expectedGeneration = sessionGeneration) {
    const safe = session?.access_token && session?.refresh_token ? {
      access_token: session.access_token, refresh_token: session.refresh_token,
      expires_at: session.expires_at || Math.floor(Date.now() / 1000) + Number(session.expires_in || 3600)
    } : null;
    if (!safe) throw new Error("INVALID_AUTH_SESSION");
    if (expectedGeneration !== sessionGeneration) throw new Error("STALE_AUTH_SESSION");
    await ComprBrowser.storage.local.set({ [SESSION_KEY]: safe });
    return safe;
  }

  async function getSession() {
    const stored = (await ComprBrowser.storage.local.get([SESSION_KEY]))[SESSION_KEY];
    if (!stored?.access_token || !stored?.refresh_token) return null;
    if (Number(stored.expires_at) > Math.floor(Date.now() / 1000) + 60) return stored;
    if (!refreshPromise) {
      const expectedGeneration = sessionGeneration;
      refreshPromise = request("/token?grant_type=refresh_token", { method: "POST",
        body: JSON.stringify({ refresh_token: stored.refresh_token }) })
        .then(session => setSession(session, expectedGeneration))
        .catch(async error => {
          if (error?.status === 400 || error?.status === 401) {
            await clearSession();
            error.code = "AUTH_REQUIRED";
          }
          throw error;
        })
        .finally(() => { refreshPromise = null; });
    }
    return refreshPromise;
  }

  async function clearSession() {
    sessionGeneration += 1;
    await ComprBrowser.storage.local.remove(SESSION_KEY);
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
    await clearSession();
  }

  return { signInWithEmail, verifyEmailOtp, ensureGuestSession, setSession, getSession, clearSession, signOut };
})();
