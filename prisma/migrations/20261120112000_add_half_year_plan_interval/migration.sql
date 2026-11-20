-- Add the half-year interval before inserting any plan that uses it.
ALTER TYPE "PlanInterval" ADD VALUE IF NOT EXISTS 'HALF_YEAR';
