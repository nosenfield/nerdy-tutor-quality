/**
 * Flag Creation Logic
 * 
 * Converts RuleResult objects to FlagInsert records and saves them to the database.
 * Handles duplicate flag prevention.
 */

import { db, flags } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import type { RuleResult } from "@/lib/scoring/rules-engine";
import type { FlagInsert } from "@/lib/types/flag";
import type { Session } from "@/lib/types/session";

/**
 * Check if a flag already exists for a tutor
 * 
 * Prevents duplicate flags for the same issue.
 */
async function flagExists(
  tutorId: string,
  flagType: string,
  sessionId?: string
): Promise<boolean> {
  const existingFlags = await db
    .select()
    .from(flags)
    .where(
      and(
        eq(flags.tutorId, tutorId),
        eq(flags.flagType, flagType),
        eq(flags.status, "open")
      )
    )
    .limit(1);

  return existingFlags.length > 0;
}

/**
 * Convert RuleResult to FlagInsert
 */
function ruleResultToFlag(
  ruleResult: RuleResult,
  tutorId: string,
  sessionId?: string
): FlagInsert {
  return {
    tutorId,
    sessionId: sessionId || null,
    flagType: ruleResult.flagType,
    severity: ruleResult.severity,
    title: ruleResult.title,
    description: ruleResult.description,
    recommendedAction: ruleResult.recommendedAction || null,
    supportingData: ruleResult.supportingData
      ? (ruleResult.supportingData as unknown as Record<string, unknown>)
      : null,
    status: "open",
  };
}

/**
 * Create flags from RuleResults
 * 
 * Converts RuleResults to FlagInsert records and saves them to the database.
 * Skips flags that already exist (duplicate prevention).
 * 
 * @param ruleResults - Array of RuleResults from rules engine
 * @param tutorId - Tutor ID
 * @param sessionId - Optional session ID (for session-level flags)
 * @returns Array of created flag IDs
 */
export async function createFlagsFromRuleResults(
  ruleResults: RuleResult[],
  tutorId: string,
  sessionId?: string
): Promise<string[]> {
  const createdFlagIds: string[] = [];

  for (const ruleResult of ruleResults) {
    // Skip if rule didn't trigger
    if (!ruleResult.triggered) {
      continue;
    }

    // Check if flag already exists
    const exists = await flagExists(tutorId, ruleResult.flagType, sessionId);
    if (exists) {
      console.log(
        `Flag already exists for tutor ${tutorId}, type ${ruleResult.flagType}`
      );
      continue;
    }

    // Convert RuleResult to FlagInsert
    const flagInsert = ruleResultToFlag(ruleResult, tutorId, sessionId);

    // Insert flag into database
    try {
      const [insertedFlag] = await db
        .insert(flags)
        .values(flagInsert)
        .returning({ id: flags.id });

      if (insertedFlag) {
        createdFlagIds.push(insertedFlag.id);
        console.log(
          `Created flag ${insertedFlag.id} for tutor ${tutorId}, type ${ruleResult.flagType}`
        );
      }
    } catch (error) {
      console.error(
        `Error creating flag for tutor ${tutorId}, type ${ruleResult.flagType}:`,
        error
      );
      // Continue processing other flags even if one fails
    }
  }

  return createdFlagIds;
}

/**
 * Create a single flag from a RuleResult
 * 
 * Convenience function for creating a single flag.
 */
export async function createFlagFromRuleResult(
  ruleResult: RuleResult,
  tutorId: string,
  sessionId?: string
): Promise<string | null> {
  const flagIds = await createFlagsFromRuleResults(
    [ruleResult],
    tutorId,
    sessionId
  );
  return flagIds.length > 0 ? flagIds[0] : null;
}

