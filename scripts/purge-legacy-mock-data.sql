-- One-time PostgreSQL cleanup for legacy mock biometric test data.
--
-- SAFETY RULES:
-- 1. Take a Railway PostgreSQL backup before running this file.
-- 2. Run it unchanged first. It will show preview counts and then stop.
-- 3. Confirm that every previewed row is test/mock data.
-- 4. To permit deletion, uncomment the SET statement below and run the file again.
-- 5. This never deletes employees, users, departments, work locations, or WebAuthn credentials.

-- Uncomment only after reviewing the preview and taking a backup:
-- SET app.confirm_legacy_mock_purge = 'YES';

SELECT 'mock attendance events' AS category, COUNT(*) AS rows_to_delete
FROM attendance_events
WHERE verification_method = 'MockFace'
   OR biometric_verification_session_id IN (
       SELECT id
       FROM biometric_verification_sessions
       WHERE verification_method = 'MockFace'
   )
UNION ALL
SELECT 'mock verification sessions', COUNT(*)
FROM biometric_verification_sessions
WHERE verification_method = 'MockFace'
UNION ALL
SELECT 'mock recognition attempts', COUNT(*)
FROM biometric_recognition_attempts
WHERE provider_name ILIKE 'Mock%'
UNION ALL
SELECT 'mock enrolments', COUNT(*)
FROM biometric_enrolments
WHERE provider_name ILIKE 'Mock%'
   OR external_reference ILIKE 'mock-%';

DO $cleanup_guard$
BEGIN
    IF current_setting(
        'app.confirm_legacy_mock_purge',
        true
    ) IS DISTINCT FROM 'YES' THEN
        RAISE EXCEPTION
            'Preview only: no rows were deleted. Back up the database, review the counts, then uncomment the confirmation SET statement.';
    END IF;
END
$cleanup_guard$;

BEGIN;

DELETE FROM attendance_events
WHERE verification_method = 'MockFace'
   OR biometric_verification_session_id IN (
       SELECT id
       FROM biometric_verification_sessions
       WHERE verification_method = 'MockFace'
   );

DELETE FROM biometric_verification_sessions
WHERE verification_method = 'MockFace';

DELETE FROM biometric_recognition_attempts
WHERE provider_name ILIKE 'Mock%';

DELETE FROM biometric_enrolments
WHERE provider_name ILIKE 'Mock%'
   OR external_reference ILIKE 'mock-%';

DELETE FROM biometric_profiles AS profile
WHERE NOT EXISTS (
    SELECT 1
    FROM biometric_enrolments AS enrolment
    WHERE enrolment.biometric_profile_id = profile.id
);

COMMIT;

RESET app.confirm_legacy_mock_purge;
