// Public runtime configuration only. Never place a service-role or Stripe secret here.
const ComprRuntimeConfig = Object.freeze({
  apiBaseUrl: "http://127.0.0.1:8787",
  supabaseUrl: "https://taosgvfdnblnopaywimf.supabase.co",
  supabaseAnonKey: "sb_publishable_cZtYQI3ApFTw8kU2a2AoBQ_nGdlSw1W",
  authCallbackUrl: "https://comprshop.github.io/compr-website/auth-callback.html",
  mode: "development",
  betaMode: true,
  betaAccessUrl: "https://comprshop.github.io/compr-website/#beta-access",
  storeReviewUrl: "https://chromewebstore.google.com/detail/compr/opgdgckljdepjokbbdgahhbocdlkggkj/reviews",
  platform: "chrome",
  guestMode: false
});
