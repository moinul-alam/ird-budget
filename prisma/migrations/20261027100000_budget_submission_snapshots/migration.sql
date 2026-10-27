-- Freeze a submission's code-wise sheet the moment it is submitted.
--
-- Until now the sheet was only ever derived: the office's own view, the dashboard total
-- and every report recomputed it from the forms plus the admin config, so any later rate
-- change silently moved an already-submitted budget. These two tables hold the captured
-- sheet instead, and the status change to 'submitted' is written in the same transaction
-- that writes them — so "submitted" can never exist without a frozen sheet to match.
--
-- Display fields (code, name, category) are copied per row rather than read through a
-- relation: a code renamed or re-categorised later must still render as submitted.

-- AlterTable
ALTER TABLE "office_submissions" ADD COLUMN "last_data_write_at" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "office_budget_snapshots" (
    "id" BIGSERIAL NOT NULL,
    "submission_id" BIGINT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "config_fingerprint" VARCHAR(64) NOT NULL,
    "captured_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "office_budget_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "office_budget_snapshot_rows" (
    "id" BIGSERIAL NOT NULL,
    "snapshot_id" BIGINT NOT NULL,
    "economic_code_id" BIGINT,
    "code" VARCHAR(50) NOT NULL,
    "name" TEXT NOT NULL,
    "category_id" BIGINT,
    "category_code" VARCHAR(50) NOT NULL DEFAULT '',
    "category_name" TEXT NOT NULL DEFAULT '',
    "category_sort_order" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_manual" BOOLEAN NOT NULL DEFAULT false,
    "allow_manual_override" BOOLEAN NOT NULL DEFAULT false,
    "source_forms" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "auto_value" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "manual_value" DECIMAL(16,2),
    "final_value" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "office_budget_snapshot_rows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "office_budget_snapshots_submission_id_version_key" ON "office_budget_snapshots"("submission_id", "version");

-- CreateIndex
CREATE INDEX "office_budget_snapshot_rows_snapshot_id_idx" ON "office_budget_snapshot_rows"("snapshot_id");

-- AddForeignKey
ALTER TABLE "office_budget_snapshots" ADD CONSTRAINT "office_budget_snapshots_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "office_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_budget_snapshot_rows" ADD CONSTRAINT "office_budget_snapshot_rows_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "office_budget_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_budget_snapshot_rows" ADD CONSTRAINT "office_budget_snapshot_rows_economic_code_id_fkey" FOREIGN KEY ("economic_code_id") REFERENCES "ref_economic_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
