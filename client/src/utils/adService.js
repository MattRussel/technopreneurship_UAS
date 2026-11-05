import { supabase } from '../lib/supabase';

export const INITIAL_ADS = [
  {
    id: 'ad-starbucks',
    title: 'Starbucks Coffee',
    tagline: 'Free Upsize with your SmartPark Parking Pass!',
    description: 'Show your digital parking pass at Starbucks Ground Floor to enjoy a free size upgrade on any handcrafted beverage.',
    category: 'Food & Beverage',
    promoCode: 'PARKSTARBUCKS',
    discount: 'Free Upsize',
    badge: 'Popular',
    location: 'Ground Floor, Unit G-12',
    validUntil: 'Nov 30, 2026',
    icon: '☕',
    bgGradient: 'linear-gradient(135deg, #006241 0%, #1e3932 100%)',
    textColor: '#FFFFFF',
    status: 'active',
    impressions: 1240,
    clicks: 312,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ad-cinema-xxi',
    title: 'Cinema XXI Mall',
    tagline: 'Buy 1 Get 1 Free Popcorn Combo with Parking Ticket',
    description: 'Watch the latest blockbusters and get a complimentary Medium Caramel Popcorn when purchasing tickets with SmartPark pass.',
    category: 'Entertainment',
    promoCode: 'XXIPARKFREE',
    discount: 'Buy 1 Get 1',
    badge: 'Hot Deal',
    location: 'Level 3, Unit 305',
    validUntil: 'Dec 15, 2026',
    icon: '🎬',
    bgGradient: 'linear-gradient(135deg, #7F1D1D 0%, #991B1B 50%, #450A0A 100%)',
    textColor: '#FFFFFF',
    status: 'active',
    impressions: 980,
    clicks: 245,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ad-hm',
    title: 'H&M Department Store',
    tagline: 'Mid-Season Sale: Extra 15% Off for Mall Parkers',
    description: 'Enjoy exclusive extra discounts on our newest autumn-winter collections by presenting your active SmartPark pass at checkout.',
    category: 'Shopping',
    promoCode: 'HM15PARK',
    discount: 'Extra 15% OFF',
    badge: 'Limited Time',
    location: 'Level 1, Unit 102-104',
    validUntil: 'Nov 20, 2026',
    icon: '🛍️',
    bgGradient: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
    textColor: '#FFFFFF',
    status: 'active',
    impressions: 820,
    clicks: 168,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ad-ev-charge',
    title: 'Shell Recharge Fast Charging',
    tagline: '20% Cashback on EV Charging at Basement 1',
    description: 'Charge your EV at SmartPark B1 charging stations and receive 20% cashback directly to your e-wallet.',
    category: 'Automotive',
    promoCode: 'SHELLEV20',
    discount: '20% Cashback',
    badge: 'Eco Partner',
    location: 'Basement 1, EV Zone',
    validUntil: 'Dec 31, 2026',
    icon: '⚡',
    bgGradient: 'linear-gradient(135deg, #B45309 0%, #78350F 100%)',
    textColor: '#FFFFFF',
    status: 'active',
    impressions: 650,
    clicks: 142,
    createdAt: new Date().toISOString(),
  },
];

const LOCAL_STORAGE_KEY = 'smartpark_advertisements';

/**
 * Fetch all advertisements from Supabase or localStorage
 */
export async function getAdvertisements() {
  try {
    const { data, error } = await supabase
      .from('advertisements')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((d) => ({
        id: d.id,
        title: d.title,
        tagline: d.tagline,
        description: d.description || d.tagline,
        category: d.category,
        promoCode: d.promo_code,
        discount: d.discount,
        badge: d.badge || 'Promo',
        location: d.location || 'Mall Tenant',
        validUntil: d.valid_until || 'Ongoing',
        icon: d.icon || '📢',
        bgGradient: d.bg_gradient || 'linear-gradient(135deg, #1E293B, #0F172A)',
        textColor: d.text_color || '#FFFFFF',
        status: d.status || 'active',
        impressions: d.impressions || 0,
        clicks: d.clicks || 0,
        createdAt: d.created_at,
      }));
    }
  } catch (err) {
    console.warn('[AdService] Could not fetch from Supabase:', err);
  }

  // Fallback to localStorage
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // ignore
    }
  }

  // Initial seed to localStorage
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_ADS));
  return INITIAL_ADS;
}

/**
 * Save advertisement list to localStorage
 */
function saveLocalAds(ads) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(ads));
}

/**
 * Track an impression (view) for an ad
 */
export async function trackAdImpression(adId) {
  try {
    await supabase.rpc('increment_ad_impressions', { target_ad_id: adId });
  } catch {
    // fallback
  }

  // Update local
  try {
    const current = await getAdvertisements();
    const updated = current.map((a) =>
      a.id === adId ? { ...a, impressions: (a.impressions || 0) + 1 } : a
    );
    saveLocalAds(updated);
  } catch {}
}

/**
 * Track a click / claim for an ad
 */
export async function trackAdClick(adId) {
  try {
    await supabase.rpc('increment_ad_clicks', { target_ad_id: adId });
  } catch {
    // fallback
  }

  // Update local
  try {
    const current = await getAdvertisements();
    const updated = current.map((a) =>
      a.id === adId ? { ...a, clicks: (a.clicks || 0) + 1 } : a
    );
    saveLocalAds(updated);
  } catch {}
}

/**
 * Create a new advertisement (Admin)
 */
export async function createAdvertisement(adData) {
  const newAd = {
    ...adData,
    id: `ad-${Date.now()}`,
    impressions: 0,
    clicks: 0,
    createdAt: new Date().toISOString(),
    status: 'active',
  };

  // Try Supabase insert
  try {
    const { data, error } = await supabase.from('advertisements').insert({
      title: newAd.title,
      tagline: newAd.tagline,
      description: newAd.description,
      category: newAd.category,
      promo_code: newAd.promoCode,
      discount: newAd.discount,
      badge: newAd.badge,
      location: newAd.location,
      valid_until: newAd.validUntil,
      icon: newAd.icon,
      bg_gradient: newAd.bgGradient,
      text_color: newAd.textColor,
      status: 'active',
    }).select().single();

    if (!error && data) {
      newAd.id = data.id;
    }
  } catch (err) {
    console.warn('[AdService] Error inserting to Supabase:', err);
  }

  const current = await getAdvertisements();
  const updated = [newAd, ...current];
  saveLocalAds(updated);
  return newAd;
}

/**
 * Toggle ad status active / paused (Admin)
 */
export async function toggleAdStatus(adId, newStatus) {
  try {
    await supabase
      .from('advertisements')
      .update({ status: newStatus })
      .eq('id', adId);
  } catch {}

  const current = await getAdvertisements();
  const updated = current.map((a) =>
    a.id === adId ? { ...a, status: newStatus } : a
  );
  saveLocalAds(updated);
  return updated;
}

/**
 * Delete an advertisement (Admin)
 */
export async function deleteAdvertisement(adId) {
  try {
    await supabase.from('advertisements').delete().eq('id', adId);
  } catch {}

  const current = await getAdvertisements();
  const updated = current.filter((a) => a.id !== adId);
  saveLocalAds(updated);
  return updated;
}

