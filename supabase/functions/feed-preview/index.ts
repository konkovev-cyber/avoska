import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { XMLParser } from "https://esm.sh/fast-xml-parser@4"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const { url } = await req.json();
        if (!url) throw new Error('URL is required');

        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch XML: ${res.statusText}`);

        const xmlText = await res.text();
        const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
        const jsonObj = parser.parse(xmlText);

        const ads = jsonObj.Ads?.Ad || jsonObj.ads?.ad || jsonObj.yml_catalog?.shop?.offers?.offer || [];
        const adsArray = Array.isArray(ads) ? ads : [ads];

        const sample = adsArray.slice(0, 3).map((ad: any) => ({
            title: ad.Title || ad.name || 'Без названия',
            price: ad.Price || ad.price || '0',
            category: ad.Category || ad.categoryId || 'Не указана',
            imagesCount: (ad.Images && ad.Images.Image) ? (Array.isArray(ad.Images.Image) ? ad.Images.Image.length : 1) : (ad.picture ? (Array.isArray(ad.picture) ? ad.picture.length : 1) : 0)
        }));

        return new Response(JSON.stringify({
            totalCount: adsArray.length,
            sample,
            allAds: adsArray.map((ad: any) => ({ raw: ad }))
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
})
