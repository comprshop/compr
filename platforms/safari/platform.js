document.addEventListener("DOMContentLoaded", () => {
  document.documentElement.dataset.comprPlatform = "safari";
  document.documentElement.classList.remove("chrome-popup");
  document.documentElement.classList.add("safari-popup");
  const chromeReview = document.getElementById("chromeStoreReview");
  if (chromeReview) {
    chromeReview.hidden = true;
    chromeReview.disabled = true;
    chromeReview.setAttribute("aria-hidden", "true");
    chromeReview.style.setProperty("display", "none", "important");
  }
});
