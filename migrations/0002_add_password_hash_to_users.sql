-- Add password hash column to users table
-- Prüfe zuerst, ob die Spalte bereits existiert
SELECT CASE 
  WHEN COUNT(*) = 0 THEN
    'ALTER TABLE users ADD COLUMN password_hash TEXT;'
  ELSE
    'SELECT 1;' -- Dummy-Anweisung, wenn die Spalte bereits existiert
END AS sql_to_run
FROM pragma_table_info('users') 
WHERE name = 'password_hash';