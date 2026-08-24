export async function detectCountryCode(): Promise<string | null> {
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) return null;
    const data = await res.json();
    return data.country_code || null; // e.g. 'TZ'
  } catch (err) {
    console.warn('IP-based country detection failed:', err);
    return null;
  }
}
