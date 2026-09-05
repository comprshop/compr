document.addEventListener("DOMContentLoaded", () => {
  document.documentElement.dataset.comprPlatform = "safari";
  const chromeReview = document.getElementById("chromeStoreReview");
  if (chromeReview) chromeReview.hidden = true;
});
