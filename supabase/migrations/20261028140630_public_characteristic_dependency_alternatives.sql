-- Product pages already expose primary characteristic conditions to anonymous
-- visitors; expose their OR alternatives with the same read-only scope.
CREATE POLICY attribute_dependency_alternatives_public_read
  ON public.attribute_dependency_alternatives
  FOR SELECT TO anon USING (true);
GRANT SELECT ON public.attribute_dependency_alternatives TO anon;
