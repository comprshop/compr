(function initialiseAccountPage() {
  "use strict";
  const COOLDOWN_SECONDS = 30;
  const requestForm = document.getElementById("requestForm");
  const verifyForm = document.getElementById("verifyForm");
  const email = document.getElementById("email");
  const otp = document.getElementById("otp");
  const emailError = document.getElementById("emailError");
  const otpError = document.getElementById("otpError");
  const sendCode = document.getElementById("sendCode");
  const verifyCode = document.getElementById("verifyCode");
  const changeEmail = document.getElementById("changeEmail");
  const successPanel = document.getElementById("successPanel");
  const status = document.getElementById("status");
  const closeAccount = document.getElementById("closeAccount");
  let pendingEmail = "";
  let requestPending = false;
  let verifyPending = false;
  let cooldownEndsAt = 0;
  let cooldownTimer = null;

  const t = value => ComprI18n.translate(value);
  function genericError() { return t("We couldn't complete that request. Please try again."); }
  function validEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254; }
  function updateCooldown() {
    const remaining = Math.max(0, Math.ceil((cooldownEndsAt - Date.now()) / 1000));
    sendCode.disabled = requestPending || remaining > 0;
    sendCode.textContent = remaining ? `${t("Send again in")} ${remaining}s` : t("Send code");
    if (!remaining && cooldownTimer) { clearInterval(cooldownTimer); cooldownTimer = null; }
  }
  function startCooldown() {
    cooldownEndsAt = Date.now() + COOLDOWN_SECONDS * 1000;
    updateCooldown();
    cooldownTimer = setInterval(updateCooldown, 1000);
  }
  async function requestCode(event) {
    event.preventDefault();
    if (requestPending || Date.now() < cooldownEndsAt) return;
    const value = email.value.trim();
    emailError.textContent = "";
    email.removeAttribute("aria-invalid");
    if (!validEmail(value)) {
      email.setAttribute("aria-invalid", "true");
      emailError.textContent = t("Enter a valid email address.");
      email.focus();
      return;
    }
    requestPending = true;
    sendCode.disabled = true;
    status.textContent = t("Sending your secure sign-in code...");
    try {
      await ComprAuth.signInWithEmail(value);
      pendingEmail = value;
      requestForm.classList.add("hidden");
      verifyForm.classList.remove("hidden");
      successPanel.classList.remove("hidden");
      status.textContent = t("Check your email and use the newest COMPR code or magic link.");
      otp.focus();
      startCooldown();
    } catch {
      status.textContent = genericError();
    } finally {
      requestPending = false;
      updateCooldown();
    }
  }
  async function submitCode(event) {
    event.preventDefault();
    if (verifyPending) return;
    const code = otp.value.trim();
    otpError.textContent = "";
    otp.removeAttribute("aria-invalid");
    if (!pendingEmail || !/^\d{8}$/.test(code)) {
      otp.setAttribute("aria-invalid", "true");
      otpError.textContent = t("Enter the 8-digit code from your newest COMPR email.");
      otp.focus();
      return;
    }
    verifyPending = true;
    verifyCode.disabled = true;
    status.textContent = t("Signing you in...");
    try {
      await ComprAuth.verifyEmailOtp(pendingEmail, code);
      verifyForm.classList.add("hidden");
      successPanel.classList.remove("hidden");
      successPanel.querySelector("h2").textContent = t("You're signed in");
      successPanel.querySelector("p").textContent = t("Return to COMPR to continue.");
      status.textContent = "";
      closeAccount.textContent = t("Return to COMPR");
      closeAccount.focus();
    } catch {
      status.textContent = genericError();
    } finally {
      verifyPending = false;
      verifyCode.disabled = false;
    }
  }
  function resetEmail() {
    pendingEmail = "";
    otp.value = "";
    otpError.textContent = "";
    verifyForm.classList.add("hidden");
    successPanel.classList.add("hidden");
    requestForm.classList.remove("hidden");
    status.textContent = "";
    email.focus();
  }
  function closePage() {
    if (history.length > 1) history.back(); else window.close();
  }
  requestForm.addEventListener("submit", requestCode);
  verifyForm.addEventListener("submit", submitCode);
  changeEmail.addEventListener("click", resetEmail);
  closeAccount.addEventListener("click", closePage);
  document.addEventListener("keydown", event => { if (event.key === "Escape") closePage(); });
  window.addEventListener("pagehide", () => { if (cooldownTimer) clearInterval(cooldownTimer); }, { once: true });
  email.focus();
})();
