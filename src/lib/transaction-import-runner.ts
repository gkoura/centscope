import type { ImportPlan } from "./transaction-import-plan.ts"

export type ImportCheckpoint = {
    plan: ImportPlan
    nextBatch: number
    imported: number
    skipped: number
}
export type ImportProgress = {
    completed: number
    total: number
    imported: number
    skipped: number
}
export function importProgress(checkpoint: ImportCheckpoint): ImportProgress {
    return {
        completed: checkpoint.imported + checkpoint.skipped,
        total: checkpoint.plan.total,
        imported: checkpoint.imported,
        skipped: checkpoint.skipped,
    }
}

// Advance the checkpoint only after a server-confirmed commit. An uncertain batch
// is sent again on retry, where the database idempotency keys prevent duplicates.
export async function processImportPlan(
    checkpoint: ImportCheckpoint,
    processBatch: (
        token: string
    ) => Promise<{ imported?: number; skipped?: number; message?: string }>,
    onProgress: (progress: ImportProgress) => void,
    shouldPause: () => boolean
): Promise<boolean> {
    while (checkpoint.nextBatch < checkpoint.plan.batches.length) {
        if (shouldPause()) return false
        const result = await processBatch(
            checkpoint.plan.batches[checkpoint.nextBatch]
        )
        if (result.message) throw new Error(result.message)
        if (
            !Number.isInteger(result.imported) ||
            !Number.isInteger(result.skipped) ||
            result.imported! < 0 ||
            result.skipped! < 0 ||
            result.imported! + result.skipped! <= 0
        )
            throw new Error(
                "Unable to confirm this batch. Retry the import safely."
            )
        checkpoint.imported += result.imported!
        checkpoint.skipped += result.skipped!
        checkpoint.nextBatch++
        onProgress(importProgress(checkpoint))
    }
    return true
}
