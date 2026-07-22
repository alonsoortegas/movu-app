insert into public.exercise_catalog (
  slug, name_es, name_en, name_de, primary_muscle_group,
  secondary_muscle_groups, workout_types, default_tracking
) values
  ('back-squat', 'Sentadilla con barra', 'Back squat', 'Kniebeuge mit Langhantel', 'legs', '{glutes,core}', '{strength}', 'reps'),
  ('deadlift', 'Peso muerto', 'Deadlift', 'Kreuzheben', 'back', '{glutes,legs,core}', '{strength}', 'reps'),
  ('bench-press', 'Press de banca', 'Bench press', 'Bankdrücken', 'chest', '{triceps,shoulders}', '{strength}', 'reps'),
  ('overhead-press', 'Press militar', 'Overhead press', 'Schulterdrücken', 'shoulders', '{triceps,core}', '{strength}', 'reps'),
  ('barbell-row', 'Remo con barra', 'Barbell row', 'Langhantelrudern', 'back', '{biceps,core}', '{strength}', 'reps'),
  ('pull-up', 'Dominada', 'Pull-up', 'Klimmzug', 'back', '{biceps,core}', '{strength}', 'reps'),
  ('lat-pulldown', 'Jalón al pecho', 'Lat pulldown', 'Latzug', 'back', '{biceps}', '{strength}', 'reps'),
  ('leg-press', 'Prensa de pierna', 'Leg press', 'Beinpresse', 'legs', '{glutes}', '{strength}', 'reps'),
  ('hip-thrust', 'Hip thrust', 'Hip thrust', 'Hip Thrust', 'glutes', '{legs,core}', '{strength}', 'reps'),
  ('walking-lunge', 'Desplante caminando', 'Walking lunge', 'Gehende Ausfallschritte', 'legs', '{glutes,core}', '{strength,functional-fitness}', 'reps'),
  ('plank', 'Plancha', 'Plank', 'Unterarmstütz', 'core', '{}', '{strength,functional-fitness}', 'time'),
  ('ski-erg', 'SkiErg', 'SkiErg', 'SkiErg', 'back', '{arms,core,legs}', '{functional-fitness}', 'distance'),
  ('sled-push', 'Empuje de trineo', 'Sled push', 'Schlitten schieben', 'legs', '{glutes,core}', '{functional-fitness}', 'distance'),
  ('sled-pull', 'Jalón de trineo', 'Sled pull', 'Schlitten ziehen', 'back', '{arms,legs,core}', '{functional-fitness}', 'distance'),
  ('burpee-broad-jump', 'Burpee con salto largo', 'Burpee broad jump', 'Burpee-Weitsprung', 'legs', '{chest,core}', '{functional-fitness}', 'distance'),
  ('rowing', 'Remo en ergómetro', 'Rowing', 'Ruderergometer', 'back', '{legs,arms,core}', '{functional-fitness,cardio}', 'distance'),
  ('farmers-carry', 'Caminata del granjero', 'Farmers carry', 'Farmers Walk', 'arms', '{shoulders,core,legs}', '{functional-fitness,strength}', 'distance'),
  ('sandbag-lunge', 'Desplante con saco', 'Sandbag lunge', 'Sandsack-Ausfallschritt', 'legs', '{glutes,core}', '{functional-fitness}', 'distance'),
  ('wall-balls', 'Wall balls', 'Wall balls', 'Wall Balls', 'legs', '{shoulders,core}', '{functional-fitness}', 'reps')
on conflict do nothing;
