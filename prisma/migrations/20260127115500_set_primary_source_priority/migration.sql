-- Set priority = 1 for all existing primary serie sources
UPDATE serie_source SET priority = 1 WHERE is_primary = true;
