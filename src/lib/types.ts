export interface Profile {
    id: string;
    full_name: string;
    avatar_url: string | null;
    phone: string | null;
    city?: string | null;
    is_verified: boolean;
    rating: number;
    role: 'user' | 'admin' | string;
    created_at: string;
}

export interface AdCategory {
    id: string;
    name: string;
    slug: string;
}

export interface Ad {
    id: string;
    user_id: string;
    category_id: string;
    title: string;
    description: string;
    price: number | null;
    salary_from: number | null;
    salary_to: number | null;
    city: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    images: string[];
    condition: 'new' | 'used' | 'secondary' | 'new_building' | string;
    status: 'active' | 'pending' | 'archived' | 'rejected' | string;
    delivery_possible: boolean;
    specifications: Record<string, string>;
    created_at: string;
    updated_at: string;
    promoted_until?: string | null;
    is_vip?: boolean;
    is_color_highlight?: boolean;
    views_count?: number;
    contacts_count?: number;

    // Joined relations
    profiles?: Partial<Profile>;
    category?: Partial<AdCategory>;
    categories?: { name: string };
}

export interface Banner {
    id: string;
    title: string;
    image_url: string;
    link_url: string | null;
    is_active: boolean;
    position: 'top' | 'sidebar';
    sort_order: number;
    impressions_count?: number;
    clicks_count?: number;
    content?: string;
    type?: 'image' | 'text';
    button_text?: string;
    background_color?: string;
    icon_name?: string;
}
export interface City {
    id: string;
    name: string;
}

export interface Report {
    id: string;
    reporter_id: string;
    ad_id: string;
    reason: string;
    content: string | null;
    status: 'pending' | 'resolved' | 'dismissed';
    created_at: string;
    ad?: { title: string };
    reporter?: { full_name: string };
}

export interface Review {
    id: string;
    reviewer_id: string;
    user_id: string;
    ad_id: string | null;
    rating: number;
    content: string;
    created_at: string;
    reviewer?: { full_name: string };
}

export interface AdminSettings {
    user_id: string;
    telegram_chat_id: string | null;
    notify_new_ads: boolean;
    notify_new_users: boolean;
    updated_at: string;
}
export interface Transaction {
    id: string;
    user_id: string;
    ad_id: string | null;
    amount: number;
    currency: string;
    status: 'pending' | 'success' | 'failed';
    payment_id: string | null;
    payment_method: string | null;
    package_type: string | null;
    created_at: string;
    updated_at: string;
    // Joined
    profiles?: { full_name: string };
    ads?: { title: string };
}
