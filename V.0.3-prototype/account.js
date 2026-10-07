(function initialiseAccountPage() {
  "use strict";
  const appleSignIn = document.getElementById("appleSignIn");
  const appleSignInHint = document.getElementById("appleSignInHint");
  const status = document.getElementById("status");
  const closeAccount = document.getElementById("closeAccount");
  const t = value => ComprI18n.translate(value);

  async function refreshSession() {
    const session = await ComprAuth.getSession().catch(() => null);
    if (!session) return false;
    status.textContent = t("You're signed in. Reopen COMPR to continue.");
    appleSignIn.classList.add("hidden");
    appleSignInHint.textContent = t("Your Apple Account is securely connected.");
    return true;
  }

  appleSignIn.addEventListener("click", async () => {
    appleSignIn.setAttribute("aria-busy", "true");
    status.textContent = t("Opening the COMPR app…");
    try {
      const opened = await ComprAuth.openAppleSignIn();
      status.textContent = opened
        ? t("Finish signing in with Apple in the COMPR app, then return here.")
        : t("Open the COMPR app and tap Sign in with Apple.");
    } catch {
      status.textContent = t("Open the COMPR app and tap Sign in with Apple.");
    } finally {
      appleSignIn.removeAttribute("aria-busy");
    }
  });

  function closePage() { if (history.length > 1) history.back(); else window.close(); }
  closeAccount.addEventListener("click", closePage);
  document.addEventListener("keydown", event => { if (event.key === "Escape") closePage(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) void refreshSession(); });
  void refreshSession();
})();
