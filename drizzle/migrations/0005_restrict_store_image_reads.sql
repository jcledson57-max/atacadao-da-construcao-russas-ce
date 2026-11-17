ALTER POLICY "Anyone reads store images" ON storage.objects
USING (
  bucket_id = 'store-images'
  AND (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.active AND p.image_url = 'storage:' || storage.objects.name
    )
    OR EXISTS (
      SELECT 1 FROM public.store_settings s
      WHERE s.id = 1 AND s.logo_url = 'storage:' || storage.objects.name
    )
  )
);
COMMENT ON POLICY "Anyone reads store images" ON storage.objects IS
'Visitors may read only published product images and the current store logo; active administrators may preview all store images.';