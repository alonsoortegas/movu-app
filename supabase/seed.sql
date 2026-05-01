-- Invite codes
insert into invite_codes (code, max_uses, note) values
  ('MOVU-ALONSO-01', 1,  'Alonso personal'),
  ('MOVU-SEBAS-01',  1,  'Sebas personal'),
  ('MOVU-TEST-01',   99, 'Dev/testing batch'),
  ('MOVU-BETA-01',   5,  'Beta cohort A'),
  ('MOVU-BETA-02',   5,  'Beta cohort B');

-- Waitlist entries
insert into waitlist (email, name, city, goal, status) values
  ('ana@example.com',     'Ana García',     'CDMX',   'lose_weight',  'waiting'),
  ('juan@example.com',    'Juan López',     'CDMX',   'build_muscle', 'waiting'),
  ('maria@example.com',   'María Torres',   'CDMX',   'habits',       'waiting'),
  ('carlos@example.com',  'Carlos Ruiz',    'Bogotá', 'compete',      'waiting'),
  ('sofia@example.com',   'Sofía Morales',  'CDMX',   'lose_weight',  'invited'),
  ('pedro@example.com',   'Pedro Jiménez',  'CDMX',   'build_muscle', 'waiting'),
  ('luisa@example.com',   'Luisa Ramírez',  'CDMX',   'habits',       'waiting'),
  ('diego@example.com',   'Diego Castro',   'CDMX',   'compete',      'converted'),
  ('valeria@example.com', 'Valeria Núñez',  'CDMX',   'build_muscle', 'waiting'),
  ('sergio@example.com',  'Sergio Peña',    'CDMX',   'habits',       'waiting');
