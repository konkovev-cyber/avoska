/**
 * Utility for geolocation detective
 */

export async function getCurrentCity(): Promise<string | null> {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve(null);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    // Use OpenStreetMap Nominatim for free reverse geocoding
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
                        {
                            headers: {
                                'Accept-Language': 'ru'
                            }
                        }
                    );
                    const data = await response.json();

                    // Try to get city, town or village
                    const city = data.address.city || data.address.town || data.address.village || data.address.state;
                    resolve(city || null);
                } catch (error) {
                    console.error('Reverse geocoding error:', error);
                    resolve(null);
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                resolve(null);
            },
            { timeout: 5000 }
        );
    });
}

export function getStoredCity(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('user_city');
}

export function setStoredCity(city: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('user_city', city);
}

export async function initCity(): Promise<string> {
    const stored = getStoredCity();
    if (stored) return stored;

    const detected = await getCurrentCity();
    if (detected) {
        setStoredCity(detected);
        return detected;
    }

    return 'Горячий Ключ'; // Default fallback
}
