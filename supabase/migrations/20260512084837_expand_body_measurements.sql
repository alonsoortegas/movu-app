alter table body_measurements
  add column if not exists visceral_fat_level numeric,
  add column if not exists bmr_kcal numeric,
  add column if not exists phase_angle numeric,
  add column if not exists total_body_water_l numeric,
  add column if not exists protein_kg numeric,
  add column if not exists mineral_kg numeric,
  add column if not exists waist_hip_ratio numeric;
