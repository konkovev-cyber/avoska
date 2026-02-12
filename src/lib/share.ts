/**
 * Get the shareable URL for the current page
 * In production web: uses window.location.href
 * In Capacitor app: constructs URL using production domain
 */
export function getShareableUrl(adId?: string): string {
    // Check if running in Capacitor (mobile app)
    const isCapacitor = typeof window !== 'undefined' && (
        window.location.protocol === 'capacitor:' ||
        window.location.protocol === 'ionic:' ||
        (window.location.protocol === 'http:' && window.location.hostname === 'localhost')
    );

    if (isCapacitor) {
        // Always return production URL for mobile app
        if (adId) {
            return `https://avoska.plus/ad?id=${adId}`;
        }
        // If no adId, try to extract from current URL
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const currentAdId = urlParams.get('id');
            if (currentAdId) {
                return `https://avoska.plus/ad?id=${currentAdId}`;
            }
        }
        return 'https://avoska.plus';
    }

    // Return current URL for web
    return typeof window !== 'undefined' ? window.location.href : '';
}
