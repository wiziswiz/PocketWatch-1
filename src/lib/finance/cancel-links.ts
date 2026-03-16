/**
 * Direct cancellation URLs for well-known subscription services.
 * These link to the actual account/cancellation page where users can cancel.
 */

interface CancelInfo {
  url: string
  /** Brief note about the cancellation process */
  note?: string
}

/**
 * Merchant keyword → cancel page URL.
 * Keys are lowercase substrings matched against merchant names.
 * More specific keys checked first via the lookup function.
 */
const CANCEL_LINKS: Record<string, CancelInfo> = {
  // Streaming & entertainment
  netflix: { url: "https://www.netflix.com/cancelplan", note: "Keep access until end of billing period" },
  spotify: { url: "https://www.spotify.com/account/subscription/", note: "You'll keep Premium until the end of your billing period" },
  hulu: { url: "https://secure.hulu.com/account", note: "Go to Account → Cancel" },
  "disney+": { url: "https://www.disneyplus.com/account/subscription", note: "Select your subscription to cancel" },
  "disney plus": { url: "https://www.disneyplus.com/account/subscription" },
  disneyplus: { url: "https://www.disneyplus.com/account/subscription" },
  "prime video": { url: "https://www.amazon.com/gp/video/settings/", note: "Manage Prime Video Channels separately" },
  "amazon prime": { url: "https://www.amazon.com/mc/pipelines/cancel", note: "End Membership → confirm" },
  "amzn prime": { url: "https://www.amazon.com/mc/pipelines/cancel" },
  amazon: { url: "https://www.amazon.com/gp/subscriptions/" },
  audible: { url: "https://www.audible.com/account/cancel-membership", note: "Keep unused credits after cancelling" },
  "youtube premium": { url: "https://www.youtube.com/paid_memberships", note: "Manage → Deactivate" },
  "youtube music": { url: "https://www.youtube.com/paid_memberships" },
  "apple music": { url: "https://support.apple.com/en-us/HT202039", note: "Settings → Apple ID → Subscriptions on your device" },
  "apple tv": { url: "https://support.apple.com/en-us/HT202039" },
  "apple one": { url: "https://support.apple.com/en-us/HT211659" },
  "apple arcade": { url: "https://support.apple.com/en-us/HT202039" },
  icloud: { url: "https://support.apple.com/en-us/HT207594", note: "Downgrade to free 5GB plan instead of cancelling" },
  "hbo max": { url: "https://www.max.com/account/subscription", note: "Now called Max" },
  max: { url: "https://www.max.com/account/subscription" },
  "paramount+": { url: "https://www.paramountplus.com/account/", note: "Account → Cancel Subscription" },
  "paramount plus": { url: "https://www.paramountplus.com/account/" },
  peacock: { url: "https://www.peacocktv.com/account/plan", note: "Change Plan → Cancel" },
  crunchyroll: { url: "https://www.crunchyroll.com/account/subscription", note: "Premium → Cancel" },
  "discovery+": { url: "https://www.discoveryplus.com/account" },
  "espn+": { url: "https://plus.espn.com/account" },
  showtime: { url: "https://www.sho.com/order/subscriber" },
  starz: { url: "https://www.starz.com/account/" },
  tidal: { url: "https://account.tidal.com/subscription" },
  deezer: { url: "https://www.deezer.com/account/subscription" },
  pandora: { url: "https://www.pandora.com/account/manage" },
  "siriusxm": { url: "https://care.siriusxm.com/subscribe/cancel", note: "Must call or chat to cancel — they'll offer retention deals" },
  "sirius xm": { url: "https://care.siriusxm.com/subscribe/cancel" },

  // Gaming
  xbox: { url: "https://account.microsoft.com/services/", note: "Turn off recurring billing" },
  "game pass": { url: "https://account.microsoft.com/services/" },
  playstation: { url: "https://store.playstation.com/en-us/latest", note: "Settings → Account → Subscriptions on console" },
  "ps plus": { url: "https://store.playstation.com/en-us/latest" },
  nintendo: { url: "https://accounts.nintendo.com/", note: "Shop Menu → Nintendo Switch Online → Turn Off Auto-Renewal" },
  "ea play": { url: "https://myaccount.ea.com/cp-ui/subscriptions" },

  // Software & productivity
  adobe: { url: "https://account.adobe.com/plans", note: "May have early termination fee for annual plans" },
  "microsoft 365": { url: "https://account.microsoft.com/services/" },
  "office 365": { url: "https://account.microsoft.com/services/" },
  "google one": { url: "https://one.google.com/settings" },
  "google workspace": { url: "https://admin.google.com/ac/billing" },
  dropbox: { url: "https://www.dropbox.com/account/plan", note: "Downgrade to Basic (free)" },
  notion: { url: "https://www.notion.so/my-account", note: "Settings → Plans → Downgrade" },
  slack: { url: "https://slack.com/intl/en-us/help/articles/218915077", note: "Workspace admin must downgrade" },
  zoom: { url: "https://zoom.us/account/billing", note: "Admin → Billing → Cancel" },
  openai: { url: "https://platform.openai.com/account/billing/overview", note: "For ChatGPT Plus: https://chat.openai.com/settings/subscription" },
  chatgpt: { url: "https://chat.openai.com/settings/subscription" },
  github: { url: "https://github.com/settings/billing/plans" },
  figma: { url: "https://www.figma.com/settings/", note: "Admin → Billing → Downgrade" },
  canva: { url: "https://www.canva.com/settings/billing", note: "Downgrade to Free plan" },
  grammarly: { url: "https://account.grammarly.com/subscription", note: "Cancel Subscription link at bottom" },
  evernote: { url: "https://www.evernote.com/BillingInfo.action" },
  todoist: { url: "https://todoist.com/app/settings/subscription" },

  // Security & VPN
  "1password": { url: "https://my.1password.com/settings/billing" },
  lastpass: { url: "https://lastpass.com/update_card.php", note: "Cancel Auto-Renew" },
  nordvpn: { url: "https://my.nordaccount.com/dashboard/nordvpn/", note: "Turn off auto-renewal" },
  expressvpn: { url: "https://www.expressvpn.com/subscriptions", note: "Turn off auto-renewal" },
  surfshark: { url: "https://my.surfshark.com/account/subscription" },
  proton: { url: "https://account.proton.me/u/0/subscription" },

  // Cloud & dev tools
  vercel: { url: "https://vercel.com/dashboard/settings/billing" },
  heroku: { url: "https://dashboard.heroku.com/account/billing" },
  netlify: { url: "https://app.netlify.com/account/billing" },
  digitalocean: { url: "https://cloud.digitalocean.com/account/billing" },
  cloudflare: { url: "https://dash.cloudflare.com/?to=/:account/billing" },

  // Fitness & health
  "planet fitness": { url: "https://www.planetfitness.com/", note: "Must cancel in person or by certified letter — check your location" },
  peloton: { url: "https://members.onepeloton.com/settings/subscriptions" },
  strava: { url: "https://www.strava.com/settings/subscription" },
  headspace: { url: "https://my.headspace.com/profile/subscriptions", note: "Can also cancel through app store if subscribed there" },
  calm: { url: "https://www.calm.com/account/manage" },
  noom: { url: "https://web.noom.com/account/subscription" },
  whoop: { url: "https://app.whoop.com/account", note: "Must contact support to cancel" },

  // Education
  duolingo: { url: "https://www.duolingo.com/settings/account", note: "Super Duolingo → Cancel" },
  coursera: { url: "https://www.coursera.org/account-settings" },
  skillshare: { url: "https://www.skillshare.com/settings/payments" },
  masterclass: { url: "https://www.masterclass.com/account/edit", note: "Cancel Membership link" },

  // News & media
  "new york times": { url: "https://myaccount.nytimes.com/seg/subscription", note: "Must call to cancel — they'll try hard to retain you" },
  nyt: { url: "https://myaccount.nytimes.com/seg/subscription" },
  "wall street journal": { url: "https://customercenter.wsj.com/", note: "Must call to cancel" },
  wsj: { url: "https://customercenter.wsj.com/" },
  "washington post": { url: "https://www.washingtonpost.com/my-post/subscriptions/" },
  "the athletic": { url: "https://theathletic.com/settings/manage-subscription" },
  medium: { url: "https://medium.com/me/settings" },
  substack: { url: "https://substack.com/account/settings", note: "Manage per-publication in each newsletter" },

  // Telecom
  "t-mobile": { url: "https://my.t-mobile.com/account/profile-settings" },
  verizon: { url: "https://www.verizon.com/signin/", note: "My Verizon → Account → Manage Plan" },
  xfinity: { url: "https://www.xfinity.com/support/cancel", note: "May require calling retention" },
  comcast: { url: "https://www.xfinity.com/support/cancel" },
  spectrum: { url: "https://www.spectrum.net/account/", note: "Must call or visit store to cancel" },

  // Insurance
  "state farm": { url: "https://proofing.statefarm.com/login-ui/", note: "Contact your agent to cancel" },
  geico: { url: "https://www.geico.com/web-and-mobile/login/", note: "Must call to cancel: 1-800-861-8380" },
  progressive: { url: "https://account.progressive.com/access/login", note: "Call or chat to cancel" },
  lemonade: { url: "https://www.lemonade.com/app/settings" },

  // Food & delivery
  "doordash dashpass": { url: "https://www.doordash.com/consumer/membership/" },
  dashpass: { url: "https://www.doordash.com/consumer/membership/" },
  "uber one": { url: "https://account.uber.com/spending/subscriptions" },
  "grubhub+": { url: "https://www.grubhub.com/account/memberships" },
  instacart: { url: "https://www.instacart.com/store/account/manage_plan" },
  hellofresh: { url: "https://www.hellofresh.com/my-account/deliveries/menu", note: "Must deactivate plan (not just skip)" },
  "hello fresh": { url: "https://www.hellofresh.com/my-account/deliveries/menu" },

  // Social & dating
  bumble: { url: "https://bumble.com/en/help/how-do-i-cancel-my-subscription", note: "Cancel through App Store / Play Store" },
  tinder: { url: "https://tinder.com/settings", note: "Cancel through App Store / Play Store" },
  discord: { url: "https://discord.com/settings/subscriptions" },

  // Finance
  ynab: { url: "https://app.ynab.com/settings/subscription" },
  copilot: { url: "https://copilot.money/", note: "Cancel through App Store" },

  // Shopping & lifestyle
  "costco membership": { url: "https://www.costco.com/my-account.html", note: "Can cancel online or at any warehouse" },
  chewy: { url: "https://www.chewy.com/app/account/autoship" },
  barkbox: { url: "https://www.barkbox.com/account" },
  "bark box": { url: "https://www.barkbox.com/account" },
  "dollar shave": { url: "https://www.dollarshaveclub.com/account" },
  ipsy: { url: "https://www.ipsy.com/glambag/settings" },
  birchbox: { url: "https://www.birchbox.com/account" },
  patreon: { url: "https://www.patreon.com/settings/memberships", note: "Cancel per-creator memberships" },
  twitch: { url: "https://www.twitch.tv/subscriptions", note: "Don't renew individual channel subs" },
  linkedin: { url: "https://www.linkedin.com/mypreferences/d/manage-advertising-preferences" },
}

/**
 * Look up the direct cancellation URL for a merchant.
 * Returns null if no known cancel link exists.
 */
export function getCancelUrl(merchantName: string): CancelInfo | null {
  const lower = merchantName.toLowerCase().replace(/\s*••••\d+$/, "").trim()

  // Exact match first
  if (CANCEL_LINKS[lower]) return CANCEL_LINKS[lower]

  // Substring match — check if merchant name contains a known key
  // Sort keys by length descending so more specific matches win
  const sortedKeys = Object.keys(CANCEL_LINKS).sort((a, b) => b.length - a.length)
  for (const key of sortedKeys) {
    if (lower.includes(key)) return CANCEL_LINKS[key]
  }

  return null
}
