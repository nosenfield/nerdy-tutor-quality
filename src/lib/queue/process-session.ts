/**
 * Session Processing Logic
 * 
 * Processes a single session through the rules engine and creates flags.
 * Integrates with existing rules engine functions.
 */

import { db, sessions } from "@/lib/db";
import { eq } from "drizzle-orm";
import type { Session } from "@/lib/types/session";
import type { RuleResult, RuleContext } from "@/lib/scoring/rules-engine";
import {
  getTutorStats,
  detectNoShow,
  detectLateness,
  detectEarlyEnd,
  detectPoorFirstSession,
  detectHighRescheduleRate,
  detectChronicLateness,
  detectDecliningRatingTrend,
  DEFAULT_RULES_ENGINE_CONFIG,
} from "@/lib/scoring/rules-engine";
import { createFlagsFromRuleResults } from "./create-flags";
import { subDays } from "date-fns";

/**
 * Process a single session through the rules engine
 * 
 * Fetches session from database, runs all rules, and creates flags.
 * 
 * @param sessionId - Session ID to process
 * @returns Array of created flag IDs
 */
export async function processSession(sessionId: string): Promise<string[]> {
  // Fetch session from database
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.sessionId, sessionId))
    .limit(1);

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const sessionData = session as Session;
  const tutorId = sessionData.tutorId;

  // Calculate time window for aggregate rules (last 30 days)
  const windowEnd = new Date();
  const windowStart = subDays(windowEnd, 30);

  // Get tutor statistics for aggregate rules
  const tutorStats = await getTutorStats(
    tutorId,
    windowStart,
    windowEnd,
    DEFAULT_RULES_ENGINE_CONFIG.latenessThresholdMinutes,
    DEFAULT_RULES_ENGINE_CONFIG.earlyEndThresholdMinutes
  );

  // Create rule context
  const context: RuleContext = {
    session: sessionData,
    tutorStats,
    config: DEFAULT_RULES_ENGINE_CONFIG,
  };

  // Run all rules
  const ruleResults: RuleResult[] = [];

  // Session-level rules (operate on single session)
  ruleResults.push(detectNoShow(context));
  ruleResults.push(detectLateness(context));
  ruleResults.push(detectEarlyEnd(context));
  ruleResults.push(detectPoorFirstSession(context));

  // Aggregate-level rules (operate on tutor statistics)
  ruleResults.push(detectHighRescheduleRate(context));
  ruleResults.push(detectChronicLateness(context));

  // Declining rating trend (async, requires database query)
  const decliningRatingResult = await detectDecliningRatingTrend(
    context,
    tutorId
  );
  ruleResults.push(decliningRatingResult);

  // Filter to only triggered rules
  const triggeredRules = ruleResults.filter((result) => result.triggered);

  console.log(
    `Processing session ${sessionId} for tutor ${tutorId}: ${triggeredRules.length} rules triggered`
  );

  // Create flags from triggered rules
  const flagIds = await createFlagsFromRuleResults(
    triggeredRules,
    tutorId,
    sessionId
  );

  console.log(
    `Created ${flagIds.length} flags for session ${sessionId} (tutor ${tutorId})`
  );

  return flagIds;
}

/**
 * Process multiple sessions
 * 
 * Convenience function for processing multiple sessions.
 * 
 * @param sessionIds - Array of session IDs to process
 * @returns Map of session ID to created flag IDs
 */
export async function processSessions(
  sessionIds: string[]
): Promise<Map<string, string[]>> {
  const results = new Map<string, string[]>();

  for (const sessionId of sessionIds) {
    try {
      const flagIds = await processSession(sessionId);
      results.set(sessionId, flagIds);
    } catch (error) {
      console.error(`Error processing session ${sessionId}:`, error);
      results.set(sessionId, []);
    }
  }

  return results;
}

