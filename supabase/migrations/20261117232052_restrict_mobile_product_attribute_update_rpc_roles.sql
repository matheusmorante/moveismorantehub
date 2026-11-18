REVOKE ALL ON FUNCTION public.update_mobile_product_attribute_with_values(uuid, text, text[])
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.update_mobile_product_attribute_with_values(uuid, text, text[])
  TO authenticated;
