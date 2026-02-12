export const recommendationService = {
    // Save last category to localStorage
    saveLastCategory(categoryId: string) {
        if (typeof window === 'undefined') return;
        localStorage.setItem('last_viewed_category', categoryId);
    },

    // Get last category
    getLastCategory() {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('last_viewed_category');
    },

    // Save search query
    saveSearchQuery(query: string) {
        if (typeof window === 'undefined' || !query) return;
        let history = JSON.parse(localStorage.getItem('search_history') || '[]');
        if (!history.includes(query)) {
            history.unshift(query);
            localStorage.setItem('search_history', JSON.stringify(history.slice(0, 5)));
        }
    }
};
