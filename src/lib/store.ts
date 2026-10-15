import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const IMAGE_BUCKET = "store-images";
export const STORAGE_PREFIX = "storage:";

export type Category = { id: string; name: string; slug: string; sort_order: number; active: boolean };
export type Product = {
  id: string;
  category_id: string;
  name: string;
  description: string;
  unit: string;
  price: number;
  image_url: string | null;
  active: boolean;
  is_demo: boolean;
  sort_order: number;
  image?: string | null | undefined;
};
export type StoreSettings = {
  store_name: string;
  logo_url: string | null;
  whatsapp: string;
  address: string;
  logo?: string | null | undefined;
};

/** Images uploaded by the admin live in a private bucket; resolve them to signed URLs. */
export async function resolveImages(paths: (string | null)[]): Promise<(string | null)[]> {
  const storagePaths = paths.filter((p): p is string => !!p && p.startsWith(STORAGE_PREFIX));
  const map = new Map<string, string>();
  if (storagePaths.length) {
    const { data } = await supabase.storage
      .from(IMAGE_BUCKET)
      .createSignedUrls(
        storagePaths.map((p) => p.slice(STORAGE_PREFIX.length)),
        60 * 60 * 24 * 7,
      );
    data?.forEach((d) => d.path && d.signedUrl && map.set(STORAGE_PREFIX + d.path, d.signedUrl));
  }
  return paths.map((p) =>
    !p ? null : p.startsWith(STORAGE_PREFIX) ? (map.get(p) ?? null) : withBase(p),
  );
}

/** Prefix site-relative paths (e.g. "/images/x.jpg") with the deploy base path (GitHub Pages subfolder). */
export function withBase(p: string): string {
  if (!p.startsWith("/") || p.startsWith("//")) return p;
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return base && !p.startsWith(base + "/") ? base + p : p;
}

async function withImages(rows: Product[]): Promise<Product[]> {
  const urls = await resolveImages(rows.map((r) => r.image_url));
  return rows.map((r, i) => ({ ...r, price: Number(r.price), image: urls[i] }));
}

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async (): Promise<StoreSettings> => {
    const { data, error } = await supabase.from("store_settings").select("*").eq("id", 1).single();
    if (error) throw error;
    const [logo] = await resolveImages([data.logo_url]);
    return { ...data, logo };
  },
});

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async (): Promise<Category[]> => {
    const { data, error } = await supabase.from("categories").select("*").order("sort_order");
    if (error) throw error;
    return data;
  },
});

export const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("sort_order")
      .order("name");
    if (error) throw error;
    return withImages(data as Product[]);
  },
});
