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
    status: 'active' | 'archived' | 'rejected' | string;
    delivery_possible: boolean;
    specifications: Record<string, string>;
    created_at: string;
    updated_at: string;
    is_vip?: boolean;
    is_turbo?: boolean;
    pinned_until?: string | null;

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
    sort_order: number;
}
