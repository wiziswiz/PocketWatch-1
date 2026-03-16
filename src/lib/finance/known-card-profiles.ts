/**
 * Authoritative card profiles for popular US credit cards.
 * Used as the primary data source — AI is fallback for unknown cards only.
 * This data is CORRECT and should never be overridden by AI.
 *
 * Profiles split across two files for size limits:
 * - This file: Amex + Chase (core profiles + lookup function)
 * - known-card-profiles-data.ts: Citi, Capital One, Discover, BOA, Amazon, Blue Biz
 */

import type { CardAIEnrichedData } from "@/app/api/finance/cards/ai-enrich/route"
import { KNOWN_PROFILES_EXTENDED } from "./known-card-profiles-data"

export interface KnownCardProfile {
  readonly keywords: readonly string[]
  readonly data: CardAIEnrichedData & {
    cardNetwork: string
    rewardType: string
    rewardProgram: string | null
    annualFee: number
    baseRewardRate: number
    foreignTransactionFee: string
  }
}

const KNOWN_PROFILES_CORE: readonly KnownCardProfile[] = [
  // ── Amex Platinum ──
  {
    keywords: ["platinum", "card"],
    data: {
      cardNetwork: "amex",
      rewardType: "points",
      rewardProgram: "Amex Membership Rewards",
      annualFee: 895,
      baseRewardRate: 1,
      foreignTransactionFee: "None",
      rewardMultipliers: [
        { category: "Flights", rate: 5, unit: "Points", description: "Booked directly with airlines or through Amex Travel" },
        { category: "Hotels", rate: 5, unit: "Points", description: "Booked through Amex Travel (prepaid only)" },
        { category: "All Other Purchases", rate: 1, unit: "Points", description: "On all other eligible purchases" },
      ],
      transferPartners: [
        { name: "Delta SkyMiles", ratio: "1:1", shortCode: "DL" },
        { name: "Hilton Honors", ratio: "1:2", shortCode: "HH" },
        { name: "British Airways Avios", ratio: "1:1", shortCode: "BA" },
        { name: "ANA Mileage Club", ratio: "1:1", shortCode: "NH" },
        { name: "Singapore Airlines KrisFlyer", ratio: "1:1", shortCode: "SQ" },
        { name: "Cathay Pacific Asia Miles", ratio: "1:1", shortCode: "CX" },
        { name: "Air France/KLM Flying Blue", ratio: "1:1", shortCode: "AF" },
        { name: "Virgin Atlantic Flying Club", ratio: "1:1", shortCode: "VS" },
        { name: "Marriott Bonvoy", ratio: "1:1", shortCode: "MB" },
        { name: "JetBlue TrueBlue", ratio: "1:0.8", shortCode: "B6" },
        { name: "Emirates Skywards", ratio: "1:1", shortCode: "EK" },
        { name: "Qantas Frequent Flyer", ratio: "1:1", shortCode: "QF" },
        { name: "Aeroplan", ratio: "1:1", shortCode: "AC" },
        { name: "Avianca LifeMiles", ratio: "1:1", shortCode: "AV" },
        { name: "Etihad Guest", ratio: "1:1", shortCode: "EY" },
        { name: "Hawaiian Airlines", ratio: "1:1", shortCode: "HA" },
        { name: "Choice Privileges", ratio: "1:1", shortCode: "CH" },
      ],
      benefits: [
        { name: "Centurion Lounge Access", description: "Complimentary access to 40+ Centurion Lounges worldwide for you and up to 2 guests (or immediate family). Includes food, drinks, and premium amenities. Guest policy: free for Platinum cardholders.", icon: "flight", value: 500 },
        { name: "Priority Pass Select", description: "Complimentary Priority Pass Select membership with unlimited visits to 1,400+ airport lounges worldwide. Additional guests $35 each.", icon: "flight", value: 429 },
        { name: "Airline Fee Credit", description: "Up to $200 per calendar year in statement credits for incidental fees (baggage, seat upgrades, in-flight purchases) with one selected qualifying airline. Must enroll and select airline each year.", icon: "flight", value: 200 },
        { name: "Hotel Credit (Amex Travel)", description: "Up to $200 per calendar year in statement credits for prepaid Fine Hotels + Resorts or The Hotel Collection bookings through Amex Travel.", icon: "hotel", value: 200 },
        { name: "Uber Credit", description: "$200 in annual Uber credits: $15/month plus $20 bonus in December. US Uber Eats and Uber rides. Added to Uber account automatically.", icon: "local_taxi", value: 200 },
        { name: "Saks Fifth Avenue Credit", description: "Up to $100 in annual Saks Fifth Avenue credits: $50 January–June, $50 July–December. Enrolled automatically.", icon: "shopping_bag", value: 100 },
        { name: "Global Entry / TSA PreCheck Credit", description: "Statement credit up to $100 every 4 years for Global Entry ($100) or TSA PreCheck ($78) application fee.", icon: "verified_user", value: 100 },
        { name: "CLEAR Plus Credit", description: "Up to $189 per year in statement credits for a CLEAR Plus membership.", icon: "verified_user", value: 189 },
        { name: "Equinox Credit", description: "Up to $300 per calendar year ($25/month) in statement credits for select Equinox memberships.", icon: "fitness_center", value: 300 },
        { name: "Digital Entertainment Credit", description: "Up to $240 per year ($20/month) in statement credits for eligible digital entertainment subscriptions including Disney+, Hulu, ESPN+, The New York Times, and Peacock.", icon: "subscriptions", value: 240 },
        { name: "Walmart+ Credit", description: "Up to $155 per year in statement credits for a Walmart+ membership.", icon: "shopping_cart", value: 155 },
        { name: "Fine Hotels + Resorts", description: "Booking perks at 1,000+ premium hotels: complimentary room upgrade, noon check-in/4pm checkout, complimentary breakfast for two, $100 hotel credit per stay.", icon: "hotel" },
        { name: "Global Dining Access by Resy", description: "Access to exclusive restaurant reservations and events through Resy. Priority access and special dining experiences at select restaurants.", icon: "restaurant" },
        { name: "Trip Cancellation/Interruption Insurance", description: "Covers up to $10,000 per trip and $20,000 per year for pre-paid, non-refundable travel expenses when trip is cancelled or interrupted due to covered reasons (illness, severe weather, jury duty).", icon: "flight", value: 10000 },
        { name: "Trip Delay Insurance", description: "Covers up to $500 per trip for reasonable expenses (meals, lodging, toiletries) when your trip is delayed more than 6 hours or requires an overnight stay.", icon: "flight", value: 500 },
        { name: "Baggage Insurance", description: "Covers up to $2,000 for carry-on and $3,000 for checked baggage if damaged, lost, or stolen by a common carrier. Up to $500 for high-risk items.", icon: "luggage", value: 3000 },
        { name: "Car Rental Loss and Damage Insurance", description: "Covers theft or damage to eligible rental vehicles when you decline the rental company's CDW/LDW. Covers up to the actual cash value. Primary coverage — no need to file through personal auto insurance first. Covers rentals up to 30 consecutive days.", icon: "car_rental", value: 50000 },
        { name: "Purchase Protection", description: "Covers eligible purchases against accidental damage or theft within 90 days of purchase. Up to $10,000 per occurrence, $50,000 per calendar year.", icon: "shield", value: 10000 },
        { name: "Extended Warranty", description: "Extends the original manufacturer's warranty by up to 2 additional years on warranties of 5 years or less. Maximum $10,000 per occurrence, $50,000 per calendar year.", icon: "verified_user", value: 10000 },
        { name: "Return Protection", description: "Return eligible items within 90 days of purchase for up to $300 per item when the merchant won't accept the return. Up to $1,000 per calendar year.", icon: "assignment_return", value: 300 },
        { name: "Platinum Concierge", description: "24/7 personal concierge service for travel reservations, dining, entertainment tickets, event planning, gift sourcing, and research assistance.", icon: "support_agent" },
      ],
      paymentFeatures: [
        { label: "Pay Over Time", description: "Carry a balance on purchases over $100 with interest" },
        { label: "Plan It", description: "Split eligible purchases of $100+ into monthly payments with a fixed fee" },
      ],
    },
  },
  // ── Amex Gold ──
  {
    keywords: ["american express", "gold"],
    data: {
      cardNetwork: "amex",
      rewardType: "points",
      rewardProgram: "Amex Membership Rewards",
      annualFee: 325,
      baseRewardRate: 1,
      foreignTransactionFee: "None",
      rewardMultipliers: [
        { category: "Restaurants", rate: 4, unit: "Points", description: "Worldwide dining including takeout and delivery" },
        { category: "U.S. Supermarkets", rate: 4, unit: "Points", description: "Up to $25,000/year then 1x. Does not include superstores like Walmart/Target." },
        { category: "Flights", rate: 3, unit: "Points", description: "Booked directly with airlines or through Amex Travel" },
        { category: "All Other Purchases", rate: 1, unit: "Points", description: "On all other eligible purchases" },
      ],
      transferPartners: [
        { name: "Delta SkyMiles", ratio: "1:1", shortCode: "DL" },
        { name: "Hilton Honors", ratio: "1:2", shortCode: "HH" },
        { name: "British Airways Avios", ratio: "1:1", shortCode: "BA" },
        { name: "ANA Mileage Club", ratio: "1:1", shortCode: "NH" },
        { name: "Singapore Airlines KrisFlyer", ratio: "1:1", shortCode: "SQ" },
        { name: "Air France/KLM Flying Blue", ratio: "1:1", shortCode: "AF" },
        { name: "Virgin Atlantic Flying Club", ratio: "1:1", shortCode: "VS" },
        { name: "Marriott Bonvoy", ratio: "1:1", shortCode: "MB" },
        { name: "Aeroplan", ratio: "1:1", shortCode: "AC" },
      ],
      benefits: [
        { name: "Dining Credit", description: "Up to $120 in annual dining credits ($10/month) at participating restaurants including Grubhub, The Cheesecake Factory, Goldbelly, Wine.com, Milk Bar, and select Resy restaurants.", icon: "restaurant", value: 120 },
        { name: "Uber Cash Credit", description: "$120 in annual Uber credits ($10/month). Valid for Uber Eats and Uber rides in the US.", icon: "local_taxi", value: 120 },
        { name: "Dunkin' Credit", description: "Up to $84 in annual credits ($7/month) at Dunkin' when you pay with your Gold Card.", icon: "coffee", value: 84 },
        { name: "Purchase Protection", description: "Covers eligible purchases against accidental damage or theft within 90 days. Up to $10,000 per occurrence.", icon: "shield", value: 10000 },
        { name: "Extended Warranty", description: "Extends manufacturer's warranty by up to 1 additional year on warranties of 5 years or less. Up to $10,000 per claim.", icon: "verified_user", value: 10000 },
        { name: "Trip Delay Insurance", description: "Up to $300 per trip for expenses when delayed 6+ hours.", icon: "flight", value: 300 },
        { name: "Baggage Insurance", description: "Up to $1,250 for carry-on and $500 for checked baggage.", icon: "luggage", value: 1250 },
        { name: "Car Rental Loss & Damage Insurance", description: "Secondary coverage for rental vehicle theft/damage when you decline CDW/LDW.", icon: "car_rental" },
      ],
      paymentFeatures: [],
    },
  },
  // ── Amex Blue Cash Everyday ──
  {
    keywords: ["blue cash", "everyday"],
    data: {
      cardNetwork: "amex",
      rewardType: "cashback",
      rewardProgram: null,
      annualFee: 0,
      baseRewardRate: 1,
      foreignTransactionFee: "2.7%",
      rewardMultipliers: [
        { category: "U.S. Supermarkets", rate: 3, unit: "Cash Back", description: "Up to $6,000/year then 1%. Does not include superstores like Walmart/Target." },
        { category: "U.S. Online Retail", rate: 3, unit: "Cash Back", description: "Purchases at eligible U.S. online retailers" },
        { category: "U.S. Gas Stations", rate: 3, unit: "Cash Back", description: "At standalone U.S. gas stations" },
        { category: "All Other Purchases", rate: 1, unit: "Cash Back", description: "" },
      ],
      transferPartners: [],
      benefits: [
        { name: "Purchase Protection", description: "Covers eligible purchases against accidental damage or theft within 90 days. Up to $1,000 per occurrence, $25,000 per year.", icon: "shield", value: 1000 },
        { name: "Extended Warranty", description: "Extends the original manufacturer's warranty by up to 1 additional year on warranties of 5 years or less. Up to $10,000 per occurrence.", icon: "verified_user", value: 10000 },
        { name: "Car Rental Loss & Damage Insurance", description: "Secondary coverage for rental vehicle theft or damage when you decline CDW/LDW.", icon: "car_rental" },
        { name: "Return Protection", description: "Return eligible items within 90 days when the merchant won't accept the return. Up to $300 per item.", icon: "assignment_return", value: 300 },
        { name: "Roadside Assistance", description: "24/7 roadside assistance hotline for towing, tire changes, lockout service, and jump starts. Up to 4 service calls per year.", icon: "car_crash" },
      ],
      paymentFeatures: [],
    },
  },
  // ── Chase Sapphire Reserve ── (annual fee increased to $795 effective June 2025)
  {
    keywords: ["sapphire", "reserve"],
    data: {
      cardNetwork: "visa",
      rewardType: "points",
      rewardProgram: "Chase Ultimate Rewards",
      annualFee: 795,
      baseRewardRate: 1,
      foreignTransactionFee: "None",
      rewardMultipliers: [
        { category: "Travel", rate: 3, unit: "Points", description: "After earning $300 annual travel credit. Includes flights, hotels, car rentals, trains, taxis, tolls, campgrounds." },
        { category: "Dining", rate: 3, unit: "Points", description: "Restaurants and eligible delivery services worldwide" },
        { category: "All Other Purchases", rate: 1, unit: "Points", description: "On all other eligible purchases" },
      ],
      transferPartners: [
        { name: "United MileagePlus", ratio: "1:1", shortCode: "UA" },
        { name: "Southwest Rapid Rewards", ratio: "1:1", shortCode: "WN" },
        { name: "World of Hyatt", ratio: "1:1", shortCode: "HY" },
        { name: "IHG One Rewards", ratio: "1:1", shortCode: "IH" },
        { name: "Marriott Bonvoy", ratio: "1:1", shortCode: "MB" },
        { name: "British Airways Avios", ratio: "1:1", shortCode: "BA" },
        { name: "Air France/KLM Flying Blue", ratio: "1:1", shortCode: "AF" },
        { name: "Singapore Airlines KrisFlyer", ratio: "1:1", shortCode: "SQ" },
        { name: "Virgin Atlantic Flying Club", ratio: "1:1", shortCode: "VS" },
        { name: "Aeroplan", ratio: "1:1", shortCode: "AC" },
        { name: "Emirates Skywards", ratio: "1:1", shortCode: "EK" },
        { name: "JetBlue TrueBlue", ratio: "1:1", shortCode: "B6" },
      ],
      benefits: [
        { name: "Annual Travel Credit", description: "$300 annual statement credit for any travel purchases. Applied automatically.", icon: "flight", value: 300 },
        { name: "Hotel Credit (The Edit)", description: "Up to $500/year ($250 semi-annually) for hotel stays booked through Chase Travel's The Edit collection.", icon: "hotel", value: 500 },
        { name: "Dining Credit (Sapphire Exclusive Tables)", description: "Up to $300/year ($150 semi-annually) at Sapphire Exclusive Tables restaurants.", icon: "restaurant", value: 300 },
        { name: "Entertainment Credit (StubHub/viagogo)", description: "Up to $300/year ($150 semi-annually) on StubHub and viagogo purchases.", icon: "confirmation_number", value: 300 },
        { name: "Apple Subscriptions Credit", description: "Up to $250/year for Apple TV+ and Apple Music subscriptions.", icon: "subscriptions", value: 250 },
        { name: "Peloton Credit", description: "Up to $120/year ($10/month) for Peloton memberships through 12/31/2027.", icon: "fitness_center", value: 120 },
        { name: "Priority Pass Select", description: "Complimentary Priority Pass Select membership with unlimited lounge visits. Guests $35 each.", icon: "flight", value: 429 },
        { name: "Global Entry / TSA PreCheck Credit", description: "Up to $120 credit every 4 years for Global Entry or TSA PreCheck application fee.", icon: "verified_user", value: 120 },
        { name: "DoorDash DashPass", description: "Complimentary DashPass membership for reduced delivery fees.", icon: "restaurant", value: 120 },
        { name: "Trip Cancellation/Interruption Insurance", description: "Up to $10,000 per person and $20,000 per trip for non-refundable travel expenses.", icon: "flight", value: 10000 },
        { name: "Trip Delay Reimbursement", description: "Up to $500 per ticket for expenses when delayed 6+ hours. Covers meals, lodging, toiletries.", icon: "flight", value: 500 },
        { name: "Primary Car Rental Insurance", description: "Primary coverage for theft or collision damage to rental vehicles. No need to file through personal insurance first.", icon: "car_rental", value: 75000 },
        { name: "Purchase Protection", description: "Covers new purchases against damage or theft for 120 days. Up to $10,000 per claim, $50,000 per year.", icon: "shield", value: 10000 },
        { name: "Extended Warranty", description: "Extends manufacturer's warranty by 1 additional year on warranties of 3 years or less.", icon: "verified_user", value: 10000 },
        { name: "Baggage Delay Insurance", description: "Up to $100/day for 5 days for necessities when bags delayed 6+ hours.", icon: "luggage", value: 500 },
        { name: "Lost Luggage Reimbursement", description: "Up to $3,000 per passenger for lost luggage and contents.", icon: "luggage", value: 3000 },
      ],
      paymentFeatures: [],
    },
  },
  // ── Chase Sapphire Preferred ──
  {
    keywords: ["sapphire", "preferred"],
    data: {
      cardNetwork: "visa",
      rewardType: "points",
      rewardProgram: "Chase Ultimate Rewards",
      annualFee: 95,
      baseRewardRate: 1,
      foreignTransactionFee: "None",
      rewardMultipliers: [
        { category: "Travel", rate: 2, unit: "Points", description: "All travel purchases" },
        { category: "Dining", rate: 3, unit: "Points", description: "Restaurants and eligible delivery" },
        { category: "Online Groceries", rate: 3, unit: "Points", description: "Online grocery purchases (excluding Target, Walmart, wholesale clubs)" },
        { category: "Streaming", rate: 3, unit: "Points", description: "Select streaming services" },
        { category: "All Other Purchases", rate: 1, unit: "Points", description: "" },
      ],
      transferPartners: [
        { name: "United MileagePlus", ratio: "1:1", shortCode: "UA" },
        { name: "Southwest Rapid Rewards", ratio: "1:1", shortCode: "WN" },
        { name: "World of Hyatt", ratio: "1:1", shortCode: "HY" },
        { name: "IHG One Rewards", ratio: "1:1", shortCode: "IH" },
        { name: "Marriott Bonvoy", ratio: "1:1", shortCode: "MB" },
        { name: "British Airways Avios", ratio: "1:1", shortCode: "BA" },
      ],
      benefits: [
        { name: "Trip Cancellation/Interruption Insurance", description: "Up to $10,000 per person, $20,000 per trip.", icon: "flight", value: 10000 },
        { name: "Primary Car Rental Insurance", description: "Primary coverage for rental vehicle theft or collision damage.", icon: "car_rental" },
        { name: "Purchase Protection", description: "Covers new purchases for 120 days against damage or theft. Up to $500 per claim.", icon: "shield", value: 500 },
        { name: "Extended Warranty", description: "Extends manufacturer's warranty by 1 year on warranties of 3 years or less.", icon: "verified_user" },
        { name: "Trip Delay Reimbursement", description: "Up to $500 per ticket for expenses when delayed 12+ hours.", icon: "flight", value: 500 },
        { name: "Baggage Delay Insurance", description: "Reimbursement for essentials when bags are delayed 6+ hours.", icon: "luggage" },
      ],
      paymentFeatures: [],
    },
  },
  // ── Chase Freedom Unlimited ──
  {
    keywords: ["freedom", "unlimited"],
    data: {
      cardNetwork: "visa",
      rewardType: "cashback",
      rewardProgram: "Chase Ultimate Rewards",
      annualFee: 0,
      baseRewardRate: 1.5,
      foreignTransactionFee: "3%",
      rewardMultipliers: [
        { category: "Travel (via Chase)", rate: 5, unit: "Cash Back", description: "Travel purchased through Chase Travel℠" },
        { category: "Dining", rate: 3, unit: "Cash Back", description: "Restaurants and eligible delivery" },
        { category: "Drugstores", rate: 3, unit: "Cash Back", description: "Drugstore purchases" },
        { category: "All Other Purchases", rate: 1.5, unit: "Cash Back", description: "" },
      ],
      transferPartners: [],
      benefits: [
        { name: "Purchase Protection", description: "Covers new purchases for 120 days against damage or theft. Up to $500 per claim, $50,000 per year.", icon: "shield", value: 500 },
        { name: "Extended Warranty", description: "Extends manufacturer's warranty by 1 year on warranties of 3 years or less.", icon: "verified_user" },
        { name: "Zero Liability Protection", description: "Not responsible for unauthorized charges on your account.", icon: "security" },
      ],
      paymentFeatures: [],
    },
  },
  // ── Chase Freedom Flex ──
  {
    keywords: ["freedom", "flex"],
    data: {
      cardNetwork: "mastercard",
      rewardType: "cashback",
      rewardProgram: "Chase Ultimate Rewards",
      annualFee: 0,
      baseRewardRate: 1,
      foreignTransactionFee: "3%",
      rewardMultipliers: [
        { category: "Rotating Quarterly Categories", rate: 5, unit: "Cash Back", description: "Up to $1,500 in combined purchases per quarter. Activation required each quarter." },
        { category: "Travel (via Chase)", rate: 5, unit: "Cash Back", description: "Travel purchased through Chase Travel℠" },
        { category: "Dining", rate: 3, unit: "Cash Back", description: "Restaurants and eligible delivery" },
        { category: "Drugstores", rate: 3, unit: "Cash Back", description: "Drugstore purchases" },
        { category: "All Other Purchases", rate: 1, unit: "Cash Back", description: "" },
      ],
      transferPartners: [],
      benefits: [
        { name: "Purchase Protection", description: "Covers new purchases for 120 days. Up to $500 per claim.", icon: "shield", value: 500 },
        { name: "Extended Warranty", description: "Extends manufacturer's warranty by 1 year on warranties of 3 years or less.", icon: "verified_user" },
        { name: "Cell Phone Protection", description: "Up to $800 per claim ($1,000/year) for damage or theft when you pay your monthly bill with this card. $50 deductible.", icon: "smartphone", value: 800 },
        { name: "Trip Cancellation/Interruption Insurance", description: "Up to $1,500 per person, $6,000 per trip.", icon: "flight", value: 1500 },
        { name: "Auto Rental Collision Damage Waiver", description: "Secondary coverage for rental vehicles.", icon: "car_rental" },
      ],
      paymentFeatures: [],
    },
  },
]

const ALL_PROFILES: readonly KnownCardProfile[] = [
  ...KNOWN_PROFILES_CORE,
  ...KNOWN_PROFILES_EXTENDED,
]

/**
 * Look up a known card profile by card name + issuer.
 * Returns the full enrichment data if found, undefined otherwise.
 */
export function getKnownCardProfile(cardName: string, issuer?: string): KnownCardProfile["data"] | undefined {
  const combined = `${issuer ?? ""} ${cardName}`.toLowerCase()

  let bestMatch: KnownCardProfile | undefined
  let bestKeywordCount = 0

  for (const profile of ALL_PROFILES) {
    const allMatch = profile.keywords.every((kw) => combined.includes(kw))
    if (allMatch && profile.keywords.length > bestKeywordCount) {
      bestMatch = profile
      bestKeywordCount = profile.keywords.length
    }
  }

  return bestMatch?.data
}
