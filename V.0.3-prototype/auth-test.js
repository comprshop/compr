const email = document.getElementById("email");
const status = document.getElementById("status");

document.getElementById("send").addEventListener("click", async () => {
  status.textContent = "Code aanvragen…";
  try { await ComprAuth.signInWithEmail(email.value.trim()); status.textContent = "Magic Link verstuurd. Open de link in je e-mail en kom daarna hier terug."; }
  catch (error) { status.textContent = `Fout: ${error.message}`; }
});

document.getElementById("verify").addEventListener("click", async () => {
  status.textContent = "Inloggen…";
  try {
    const me = await ComprApi.me();
    status.textContent = `Ingelogd\nPlan: ${me.plan}\nResterende zoekopdrachten: ${me.usage?.remaining ?? "onbeperkt"}`;
  } catch (error) { status.textContent = `Fout (${error.code || "AUTH"}): ${error.message}`; }
});

document.getElementById("logout").addEventListener("click", async () => {
  await ComprAuth.signOut(); status.textContent = "Uitgelogd.";
});
