const translations = {
    nl: {
        title: "COMPR voor Safari",
        eyebrow: "Een duidelijkere check vóór het afrekenen",
        iosTitle: "Zet COMPR aan in Safari.",
        iosLead: "Ga naar het product dat je wilt kopen. COMPR toont alleen een alternatief als de overeenkomst betrouwbaar genoeg is.",
        benefit1Title: "Betrouwbaar vergelijken", benefit1Body: "Alleen dezelfde uitvoering en de volledige prijs.",
        benefit2Title: "Jij houdt controle", benefit2Body: "COMPR controleert pas wanneer jij daarom vraagt.",
        benefit3Title: "Flexibel abonnement", benefit3Body: "Kies maandelijks of jaarlijks en beheer dit via Apple.",
        appleSignIn: "Log in met Apple",
        appleNote: "Log één keer in om COMPR en je abonnement veilig te koppelen.",
        appleSuccess: "Je bent ingelogd. Open COMPR nu in Safari.",
        appleError: "Inloggen lukte niet. Controleer de Apple-instellingen en probeer opnieuw.",
        settingsButton: "Open COMPR-instellingen",
        settingsNote: "Je komt direct bij COMPR onder Safari-extensies.",
        step1Title: "Sta de extensie toe",
        step1Body: "Tik op de knop hierboven en zet <strong>Sta extensie toe</strong> aan.",
        step2Title: "Ga naar jouw product",
        step2Body: "Open in Safari de productpagina waarop je COMPR wilt gebruiken.",
        step3Title: "Check de betrouwbare match",
        step3Body: "Open COMPR vanuit het Safari-menu en kies <strong>Vind dit goedkoper</strong>. Als er geen betrouwbare match staat, betekent dat er geen beter betrouwbaar product is.",
        microcopy: "Blijft COMPR grijs? Laat een ouder of beheerder de webmateriaalbeperking in Schermtijd controleren.",
        macEyebrow: "COMPR voor Safari",
        macTitle: "Zet COMPR aan in Safari.",
        macUnknown: "Open Safari-instellingen en schakel de COMPR-extensie in.",
        macOn: "COMPR staat aan. Open een productpagina en start je prijscheck vanuit Safari.",
        macOff: "COMPR staat nog uit. Open Safari-instellingen om de extensie in te schakelen.",
        macButton: "Open Safari-instellingen",
        footer: "Check voordat je koopt."
    },
    en: {
        title: "COMPR for Safari",
        eyebrow: "A clearer check before checkout",
        iosTitle: "Turn on COMPR in Safari.",
        iosLead: "Go to the product you want to buy. COMPR only shows an alternative when the match is reliable enough.",
        benefit1Title: "Reliable comparisons", benefit1Body: "Only the same variant and the complete price.",
        benefit2Title: "You stay in control", benefit2Body: "COMPR checks only when you ask it to.",
        benefit3Title: "Flexible subscription", benefit3Body: "Choose monthly or yearly and manage it through Apple.",
        appleSignIn: "Sign in with Apple",
        appleNote: "Sign in once to securely link COMPR and your subscription.",
        appleSuccess: "You're signed in. Open COMPR in Safari.",
        appleError: "Sign-in failed. Check the Apple settings and try again.",
        settingsButton: "Open COMPR Settings",
        settingsNote: "This opens COMPR directly in Safari Extensions Settings.",
        step1Title: "Allow the extension",
        step1Body: "Tap the button above and turn on <strong>Allow Extension</strong>.",
        step2Title: "Go to your product",
        step2Body: "In Safari, open the product page where you want to use COMPR.",
        step3Title: "Check the reliable match",
        step3Body: "Open COMPR from the Safari menu and choose <strong>Find This Cheaper</strong>. If no reliable match appears, it means no better reliable product was found.",
        microcopy: "Is COMPR greyed out? Ask a parent or administrator to review the web content restriction in Screen Time.",
        macEyebrow: "COMPR for Safari",
        macTitle: "Turn on COMPR in Safari.",
        macUnknown: "Open Safari Settings and enable the COMPR extension.",
        macOn: "COMPR is on. Open a product page and start your price check from Safari.",
        macOff: "COMPR is off. Open Safari Settings to enable the extension.",
        macButton: "Open Safari Settings",
        footer: "Check before you buy."
    }
};

function setLanguage(requestedLanguage) {
    const language = requestedLanguage === "nl" ? "nl" : "en";
    const copy = translations[language];
    document.documentElement.lang = language;
    document.title = copy.title;

    document.querySelectorAll("[data-i18n]").forEach((element) => {
        element.textContent = copy[element.dataset.i18n];
    });
    document.querySelectorAll("[data-i18n-html]").forEach((element) => {
        element.innerHTML = copy[element.dataset.i18nHtml];
    });
}

function show(platform, enabled, useSettingsInsteadOfPreferences) {
    document.body.classList.add(`platform-${platform}`);

    if (useSettingsInsteadOfPreferences) {
        document.querySelector("button.open-preferences").innerText = translations[document.documentElement.lang].macButton;
    }

    if (typeof enabled === "boolean") {
        document.body.classList.toggle("state-on", enabled);
        document.body.classList.toggle("state-off", !enabled);
    } else {
        document.body.classList.remove("state-on", "state-off");
    }

    window.scrollTo(0, 0);
}

function postAction(action) {
    webkit.messageHandlers.controller.postMessage(action);
}

function appleSignInCompleted(success) {
    const language = document.documentElement.lang === "nl" ? "nl" : "en";
    const button = document.querySelector("button.apple-sign-in");
    button.removeAttribute("aria-busy");
    document.querySelector(".apple-status").textContent = translations[language][success ? "appleSuccess" : "appleError"];
}

function appleSignInStarted() {
    const language = document.documentElement.lang === "nl" ? "nl" : "en";
    document.querySelector(".apple-status").textContent = language === "nl"
        ? "Bevestig het inloggen in het Apple-venster."
        : "Confirm sign-in in the Apple window.";
}

document.querySelector("button.apple-sign-in").addEventListener("click", (event) => {
    event.currentTarget.setAttribute("aria-busy", "true");
    postAction("sign-in-with-apple");
});
document.querySelector("button.open-extension-settings").addEventListener("click", () => postAction("open-extension-settings"));
document.querySelector("button.open-preferences").addEventListener("click", () => postAction("open-preferences"));
