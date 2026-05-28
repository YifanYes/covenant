-- Seed dashboard with stress-scale test data for /dashboard validation.
--   10 areas, 20 objectives, 100 tasks, 12 habits, ~90 days of completions.
--   2 stale areas + 2 stale objectives + 2 stale habits trigger the Blindspot widget.
--
-- USAGE
--   1. Replace PLACEHOLDER_EMAIL@example.com below with the target user's email.
--   2. psql "$DATABASE_URL" -f prisma/manual/seed-dashboard.sql
--      (or: pnpm prisma db execute --file prisma/manual/seed-dashboard.sql --schema prisma/schema.prisma)
--
-- Idempotent: re-running emits a NOTICE and skips. Rollback at bottom of file.

DO $$
DECLARE
  target_email   text := 'PLACEHOLDER_EMAIL@example.com';
  target_user_id text;
  now_ts         timestamp := now();
  area_ids       bigint[] := '{}';
  obj_ids        bigint[] := '{}';
  habit_ids      bigint[] := '{}';
  task_ids       bigint[] := '{}';
  new_id         bigint;
  status_todo_id      bigint;
  status_doing_id     bigint;
  status_done_id      bigint;
  task_status_id      bigint;
  colors         text[] := ARRAY['green','purple','orange','red','blue','yellow','teal','lime','green','purple'];
  icons          text[] := ARRAY['Money','Zap','Users','Heart','Briefcase','HumanRun','Gamepad','Visible','Money','Zap'];
  i                   int;
  k                   int;
  day_offset          int;
  task_status         text;
  task_impact         text;
  task_effort         text;
  task_due            timestamp;
  task_completed      timestamp;
  task_updated        timestamp;
  task_obj_idx        int;
  task_area_idx       int;
  habit_timespan      text;
  habit_recurr        int;
  completions_per_day int;
BEGIN
  SELECT id INTO target_user_id FROM users WHERE email = target_email;
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found with email %', target_email;
  END IF;

  -- Ensure default TODO/DOING/DONE statuses exist for this user, then capture their IDs.
  INSERT INTO user_task_statuses ("userId", label, "isDefault", "createdAt", "updatedAt")
  VALUES
    (target_user_id, 'TODO',  true,  now_ts, now_ts),
    (target_user_id, 'DOING', false, now_ts, now_ts),
    (target_user_id, 'DONE',  false, now_ts, now_ts)
  ON CONFLICT ("userId", label) DO NOTHING;

  SELECT id INTO status_todo_id  FROM user_task_statuses WHERE "userId" = target_user_id AND label = 'TODO';
  SELECT id INTO status_doing_id FROM user_task_statuses WHERE "userId" = target_user_id AND label = 'DOING';
  SELECT id INTO status_done_id  FROM user_task_statuses WHERE "userId" = target_user_id AND label = 'DONE';

  IF EXISTS (SELECT 1 FROM areas WHERE "userId" = target_user_id AND name LIKE 'SEED %') THEN
    RAISE NOTICE 'Seed already present for %, skipping', target_email;
  ELSE
    ---------------------------------------------------------------- AREAS
    FOR i IN 1..10 LOOP
      INSERT INTO areas (name, color, icon, "userId", "createdAt", "updatedAt")
      VALUES (
        'SEED Area ' || lpad(i::text, 2, '0'),
        colors[i],
        icons[i],
        target_user_id,
        now_ts - interval '90 days',
        now_ts
      )
      RETURNING id INTO new_id;
      area_ids := area_ids || new_id;
    END LOOP;

    ---------------------------------------------------------- OBJECTIVES
    FOR i IN 1..20 LOOP
      INSERT INTO objectives (name, description, "userId", "createdAt", "updatedAt")
      VALUES (
        'SEED Obj ' || lpad(i::text, 2, '0'),
        'Seeded objective for dashboard validation',
        target_user_id,
        now_ts - interval '90 days',
        now_ts
      )
      RETURNING id INTO new_id;
      obj_ids := obj_ids || new_id;

      -- Primary area link. Stale objs 19/20 attach to stale areas 9/10.
      INSERT INTO "_AreaToObjective" ("A", "B") VALUES (
        CASE
          WHEN i = 19 THEN area_ids[9]
          WHEN i = 20 THEN area_ids[10]
          ELSE area_ids[((i - 1) % 8) + 1]
        END,
        new_id
      );
      -- ~1/3 of active objectives link to a second area for variety.
      IF i % 3 = 0 AND i < 19 THEN
        INSERT INTO "_AreaToObjective" ("A", "B")
        VALUES (area_ids[(i % 8) + 1], new_id);
      END IF;
    END LOOP;

    --------------------------------------------------------------- HABITS
    FOR i IN 1..12 LOOP
      IF i <= 8 THEN
        habit_timespan := 'DAILY';
        habit_recurr := ((i - 1) % 3) + 1;
      ELSIF i <= 11 THEN
        habit_timespan := 'WEEKLY';
        habit_recurr := 1;
      ELSE
        habit_timespan := 'MONTHLY';
        habit_recurr := 1;
      END IF;

      INSERT INTO habits (name, description, recurrence, timespan, "userId", "createdAt", "updatedAt")
      VALUES (
        'SEED Habit ' || lpad(i::text, 2, '0'),
        'Seeded habit for dashboard validation',
        habit_recurr,
        habit_timespan,
        target_user_id,
        now_ts - interval '90 days',
        now_ts
      )
      RETURNING id INTO new_id;
      habit_ids := habit_ids || new_id;

      INSERT INTO "_AreaToHabit" ("A", "B")
      VALUES (area_ids[((i - 1) % 8) + 1], new_id);
      INSERT INTO "_HabitToObjective" ("A", "B")
      VALUES (new_id, obj_ids[((i - 1) % 18) + 1]);
    END LOOP;

    ---------------------------------------------------- HABIT COMPLETIONS
    -- Habits 1..10 active (~80% completion rate over 90 days)
    -- Habits 11, 12 stale: only one ancient completion each.
    FOR i IN 1..10 LOOP
      IF i <= 8 THEN
        -- DAILY: each of last 90 days at ~80% prob; recurrence completions per "active" day
        SELECT recurrence INTO completions_per_day FROM habits WHERE id = habit_ids[i];
        FOR day_offset IN 0..89 LOOP
          IF random() < 0.80 THEN
            FOR k IN 1..completions_per_day LOOP
              INSERT INTO habit_completions ("habitId", "userId", "completedAt")
              VALUES (
                habit_ids[i],
                target_user_id,
                now_ts - (day_offset || ' days')::interval - (k * 2 || ' hours')::interval
              );
            END LOOP;
          END IF;
        END LOOP;
      ELSE
        -- WEEKLY: one completion every 7 days at ~85% prob
        FOR day_offset IN 0..89 LOOP
          IF day_offset % 7 = 0 AND random() < 0.85 THEN
            INSERT INTO habit_completions ("habitId", "userId", "completedAt")
            VALUES (
              habit_ids[i],
              target_user_id,
              now_ts - (day_offset || ' days')::interval
            );
          END IF;
        END LOOP;
      END IF;
    END LOOP;
    -- Stale habits
    INSERT INTO habit_completions ("habitId", "userId", "completedAt")
    VALUES (habit_ids[11], target_user_id, now_ts - interval '25 days');
    INSERT INTO habit_completions ("habitId", "userId", "completedAt")
    VALUES (habit_ids[12], target_user_id, now_ts - interval '40 days');

    ---------------------------------------------------------------- TASKS
    FOR i IN 1..100 LOOP
      IF i = 29 THEN
        -- Stale DONE: area 9 + obj 19, completed 30d ago
        task_status := 'DONE';
        task_impact := 'LOW';  task_effort := 'LOW';
        task_completed := now_ts - interval '30 days';
        task_updated := task_completed;
        task_due := NULL;
        task_area_idx := 9;
        task_obj_idx := 19;
      ELSIF i = 30 THEN
        -- Stale DONE: area 10 + obj 20, completed 40d ago
        task_status := 'DONE';
        task_impact := 'LOW';  task_effort := 'LOW';
        task_completed := now_ts - interval '40 days';
        task_updated := task_completed;
        task_due := NULL;
        task_area_idx := 10;
        task_obj_idx := 20;
      ELSIF i <= 28 THEN
        -- Active DONE tasks (1..28): spread across last 12 days
        task_status := 'DONE';
        IF i <= 12 THEN
          task_impact := 'HIGH'; task_effort := 'HIGH';  -- MAJOR_PROJECT (12)
        ELSIF i <= 20 THEN
          task_impact := 'HIGH'; task_effort := 'LOW';   -- QUICK_WIN (8)
        ELSIF i <= 24 THEN
          task_impact := 'LOW';  task_effort := 'HIGH';  -- THANKLESS_TASK (4)
        ELSE
          task_impact := 'LOW';  task_effort := 'LOW';   -- FILL_IN (4)
        END IF;
        task_completed := now_ts - ((i % 12) || ' days')::interval;
        task_updated := task_completed;
        task_due := NULL;
        -- Skew: 10 DONE tasks → area 1, remainder spread over areas 2..8
        IF i <= 10 THEN
          task_area_idx := 1;
        ELSE
          task_area_idx := ((i - 11) % 7) + 2;
        END IF;
        task_obj_idx := ((i - 1) % 18) + 1;
      ELSIF i <= 50 THEN
        -- DOING (31..50)
        task_status := 'DOING';
        task_impact := CASE WHEN i % 2 = 0 THEN 'HIGH' ELSE 'LOW' END;
        task_effort := CASE WHEN i % 3 = 0 THEN 'HIGH' ELSE 'LOW' END;
        task_completed := NULL;
        task_updated := now_ts - ((i % 10) || ' days')::interval;
        IF i <= 35 THEN
          task_due := now_ts - ((i - 30) || ' days')::interval;  -- overdue
        ELSE
          task_due := now_ts + ((i - 35) || ' days')::interval;  -- future
        END IF;
        task_area_idx := ((i - 31) % 8) + 1;
        task_obj_idx := ((i - 31) % 18) + 1;
      ELSE
        -- TODO (51..100)
        task_status := 'TODO';
        task_impact := CASE WHEN i % 2 = 0 THEN 'HIGH' ELSE 'LOW' END;
        task_effort := CASE WHEN i % 3 = 0 THEN 'HIGH' ELSE 'LOW' END;
        task_completed := NULL;
        task_updated := now_ts - ((i % 5) || ' days')::interval;
        IF i <= 65 THEN
          task_due := now_ts + ((i % 2) || ' days')::interval;        -- today/tomorrow (Upcoming widget, 15 tasks)
        ELSIF i <= 75 THEN
          task_due := now_ts - ((i - 65) || ' days')::interval;       -- overdue (10)
        ELSIF i <= 90 THEN
          task_due := now_ts + (((i - 75) * 3) || ' days')::interval; -- future
        ELSE
          task_due := NULL;
        END IF;
        task_area_idx := ((i - 51) % 8) + 1;
        task_obj_idx := ((i - 51) % 18) + 1;
      END IF;

      task_status_id := CASE task_status
        WHEN 'TODO'  THEN status_todo_id
        WHEN 'DOING' THEN status_doing_id
        WHEN 'DONE'  THEN status_done_id
      END;

      INSERT INTO tasks (title, description, "statusId", "order", "dueDate", "userId",
                         "createdAt", "updatedAt", color, effort, impact, "completedAt")
      VALUES (
        'SEED Task ' || lpad(i::text, 3, '0'),
        'Seeded task for dashboard validation',
        task_status_id,
        i,
        task_due,
        target_user_id,
        now_ts - interval '60 days',
        task_updated,
        NULL,
        task_effort,
        task_impact,
        task_completed
      )
      RETURNING id INTO new_id;
      task_ids := task_ids || new_id;

      INSERT INTO "_AreaToTask" ("A", "B") VALUES (area_ids[task_area_idx], new_id);
      INSERT INTO "_ObjectiveToTask" ("A", "B") VALUES (obj_ids[task_obj_idx], new_id);
    END LOOP;

    RAISE NOTICE 'Seeded dashboard data for % (10 areas, 20 objectives, 12 habits, 100 tasks)', target_email;
  END IF;
END $$;

-- ROLLBACK (replace <user-id> with users.id of the target):
--   DELETE FROM habit_completions WHERE "habitId" IN (SELECT id FROM habits WHERE "userId" = '<user-id>' AND name LIKE 'SEED %');
--   DELETE FROM habits     WHERE "userId" = '<user-id>' AND name LIKE 'SEED %';
--   DELETE FROM tasks      WHERE "userId" = '<user-id>' AND title LIKE 'SEED %';
--   DELETE FROM objectives WHERE "userId" = '<user-id>' AND name LIKE 'SEED %';
--   DELETE FROM areas      WHERE "userId" = '<user-id>' AND name LIKE 'SEED %';
-- Implicit M2M join-table rows cascade automatically.
