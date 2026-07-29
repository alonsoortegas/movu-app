alter table public.nutrition_plans
  add column protein_target_g real,
  add column carbs_target_g real,
  add column fat_target_g real,
  add constraint nutrition_plans_protein_target_check
    check (protein_target_g is null or protein_target_g between 0 and 1000),
  add constraint nutrition_plans_carbs_target_check
    check (carbs_target_g is null or carbs_target_g between 0 and 1000),
  add constraint nutrition_plans_fat_target_check
    check (fat_target_g is null or fat_target_g between 0 and 500);
