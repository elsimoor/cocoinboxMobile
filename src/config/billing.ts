// Billing / upgrade related mobile app config
// Adjust SUCCESS_PATH_KEYWORDS to match the query params or path fragments
// your frontend uses after a successful Stripe checkout.
// It is heuristic-based so you can refine later.

export const UPGRADE_SUCCESS_PATH_KEYWORDS = [
  'upgraded=1', // query param pattern
  'upgrade-success', // explicit success slug
  'subscription', // landing on subscription management page implies success
  'dashboard' // often redirected to dashboard post-upgrade with flag
];

// Minimum delay between successive automatic refresh attempts (ms)
export const UPGRADE_REFRESH_DEBOUNCE = 4000;

// Exponential retry delays (ms) for polling profile after payment until Pro detected
export const UPGRADE_RETRY_DELAYS = [2000, 4000, 8000, 16000, 30000];
export const UPGRADE_MAX_RETRIES = UPGRADE_RETRY_DELAYS.length;

