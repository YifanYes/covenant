INSERT INTO "map_activities" (
  "id",
  "activityId",
  "status",
  "progress",
  "target",
  "startedAt",
  "deadline",
  "completedAt"
) VALUES
-- Defense North Gate
(
  gen_random_uuid(),
  'defense_north_gate',
  'ACTIVE',
  0,
  50,
  NOW(),
  NOW() + INTERVAL '30 days',
  NULL
),
-- Assault Ships
(
  gen_random_uuid(),
  'assault_ships',
  'ACTIVE',
  0,
  50,
  NOW(),
  NOW() + INTERVAL '14 days',
  NULL
),
-- Defense South Wall
(
  gen_random_uuid(),
  'defense_south_wall',
  'ACTIVE',
  0,
  50,
  NOW(),
  NOW() + INTERVAL '21 days',
  NULL
);