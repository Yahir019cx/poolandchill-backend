-- ═══════════════════════════════════════════════════════════════════════════
-- ESTRUCTURA COMPLETA: [payment].[StripeConnectAccounts]
-- Ejecutar en SSMS o en tu cliente SQL para ver columnas, tipos y nullabilidad.
-- ═══════════════════════════════════════════════════════════════════════════

-- Opción 1: Columnas con tipo, longitud y si acepta NULL
SELECT
    c.name AS ColumnName,
    t.name AS DataType,
    c.max_length,
    c.precision,
    c.scale,
    c.is_nullable AS IsNullable
FROM sys.columns c
JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE c.object_id = OBJECT_ID('payment.StripeConnectAccounts')
ORDER BY c.column_id;

-- Opción 2: Más legible (INFORMATION_SCHEMA)
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    NUMERIC_PRECISION,
    NUMERIC_SCALE,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'payment'
  AND TABLE_NAME = 'StripeConnectAccounts'
ORDER BY ORDINAL_POSITION;

-- Opción 3: Resumen rápido (solo nombres)
-- SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
-- WHERE TABLE_SCHEMA = 'payment' AND TABLE_NAME = 'StripeConnectAccounts'
-- ORDER BY ORDINAL_POSITION;

-- ═══════════════════════════════════════════════════════════════════════════
-- ANÁLISIS: ¿Quién llena cada columna?
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Columna                | NULL? | xsp_RegisterStripeAccount  | xsp_GetStripeAccountByUserId
-- -----------------------|-------|----------------------------|-----------------------------
-- ID_StripeAccount       | NO    | SÍ (INSERT)               | no devuelve
-- UserId                 | NO    | SÍ                         | filtro (WHERE)
-- StripeAccountId        | NO    | SÍ                         | SÍ
-- StripeCustomerId       | YES   | SÍ                         | no
-- AccountStatus          | NO    | SÍ                         | SÍ
-- ChargesEnabled         | NO    | SÍ                         | SÍ
-- PayoutsEnabled         | NO    | SÍ                         | SÍ
-- OnboardingCompleted     | NO    | SÍ                         | SÍ
-- OnboardingUrl          | YES   | SÍ                         | no
-- DetailsSubmitted       | NO    | SÍ                         | no
-- RequirementsCurrently  | YES   | NO (nunca se llena)       | no
-- RequirementsEventually | YES   | NO                         | no
-- RequirementsPastDue     | YES   | NO                         | no
-- PayoutSchedule         | YES   | NO                         | no
-- DefaultCurrency        | NO    | SÍ (INSERT/valor fijo)    | no
-- Country                | NO    | SÍ (INSERT/valor fijo)    | no
-- Email                  | YES   | SÍ                         | no
-- BusinessType           | YES   | NO                         | no
-- CreatedAt              | NO    | SÍ (INSERT)               | no
-- UpdatedAt              | NO    | SÍ                         | no
-- LastSyncedAt           | YES   | SÍ                         | no
-- DisabledAt              | YES   | NO                         | no
-- DisabledReason          | YES   | NO                         | no
--
-- ═══════════════════════════════════════════════════════════════════════════
-- CONCLUSIONES
-- ═══════════════════════════════════════════════════════════════════════════
-- 1) Columnas que NINGÚN SP escribe (todas NULLable; opcionales o uso futuro):
--    RequirementsCurrently, RequirementsEventually, RequirementsPastDue,
--    PayoutSchedule, BusinessType, DisabledAt, DisabledReason
--
-- 2) Si quieres persistir datos de Stripe en esas columnas, habría que:
--    - Añadir parámetros al SP de registro (o crear otro SP de “sync”) y
--    - En el backend, en handleAccountUpdated (webhook) o al hacer retrieve,
--      mapear account.requirements.*, account.payout_schedule, etc., y llamar
--      al SP con esos valores.
--
-- 3) Longitudes: tabla tiene DefaultCurrency varchar(3), Country varchar(2).
--    El SP usa @DefaultCurrency VARCHAR(10), @Country VARCHAR(10). Valores
--    que envía el backend ('MXN', 'MX') caben; si quieres ser estricto, puedes
--    bajar los parámetros del SP a (3) y (2).
--
-- 4) Ninguna columna obligatoria (NOT NULL) queda sin llenar en el INSERT.
