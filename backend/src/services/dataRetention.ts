import { query } from "../db/connection";

export interface RetentionResult {
  deleted: number;
  cutoff: string;
}

export async function purgeOldReports(ageDays = 365): Promise<RetentionResult> {
  const cutoffQuery = `NOW() - INTERVAL '${ageDays} days'`;
  const del = await query(`DELETE FROM reports WHERE created_at < ${cutoffQuery}`);
  return { deleted: del.rowCount || 0, cutoff: cutoffQuery };
}
