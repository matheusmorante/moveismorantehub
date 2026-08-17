INSERT INTO materials (name) VALUES
  ('Madeira Maciça'),
  ('Madeira Maciça/MDF'),
  ('MDF'),
  ('MDP'),
  ('MDP/MDF'),
  ('Inox'),
  ('Marmorite'),
  ('Vidro')
ON CONFLICT (name) DO NOTHING;
