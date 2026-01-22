INSERT INTO investments (id, "investmentId", "factionName", status, "currentAmount", "targetAmount", "startedAt", deadline)
VALUES 
  (
    gen_random_uuid(),
    'anti_demon_barrier',
    'HOLY_KNIGHTS',
    'ACTIVE',
    0,
    5800,
    NOW(),
    NOW() + INTERVAL '30 days'
  ),
  (
    gen_random_uuid(),
    'providence_purification',
    'HOLY_KNIGHTS',
    'ACTIVE',
    0,
    8000,
    NOW(),
    NOW() + INTERVAL '30 days'
  ),
  (
    gen_random_uuid(),
    'dark_heart_operation',
    'HOLY_KNIGHTS',
    'ACTIVE',
    0,
    10000,
    NOW(),
    NOW() + INTERVAL '30 days'
  ),
  (
    gen_random_uuid(),
    'gen2_armament_program',
    'HOLY_KNIGHTS',
    'ACTIVE',
    0,
    6900,
    NOW(),
    NOW() + INTERVAL '21 days'
  )
ON CONFLICT DO NOTHING;
