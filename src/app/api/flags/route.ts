/**
 * Flags API Endpoint
 * 
 * GET /api/flags - List flags with filters and pagination
 * 
 * Query Parameters:
 * - tutor_id: Filter by tutor ID
 * - status: Filter by status ('open' | 'in_progress' | 'resolved' | 'dismissed')
 * - severity: Filter by severity ('low' | 'medium' | 'high' | 'critical')
 * - limit: Number of results per page (1-100, default: 50)
 * - offset: Number of results to skip (default: 0)
 * 
 * Returns:
 * {
 *   flags: Flag[],
 *   pagination: {
 *     limit: number,
 *     offset: number,
 *     total: number
 *   }
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { db, flags } from "@/lib/db";
import { flagsQuerySchema } from "@/lib/utils/validation";
import { eq, and, count, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const queryParams = {
      tutor_id: searchParams.get("tutor_id") || undefined,
      status: searchParams.get("status") || undefined,
      severity: searchParams.get("severity") || undefined,
      limit: searchParams.get("limit") || "50",
      offset: searchParams.get("offset") || "0",
    };

    // Validate query parameters with Zod
    const validationResult = flagsQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: validationResult.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const params = validationResult.data;

    // Build filter conditions
    const conditions = [];

    if (params.tutor_id) {
      conditions.push(eq(flags.tutorId, params.tutor_id));
    }

    if (params.status) {
      conditions.push(eq(flags.status, params.status));
    }

    if (params.severity) {
      conditions.push(eq(flags.severity, params.severity));
    }

    // Get total count before pagination
    const totalResult = await db
      .select({ count: count() })
      .from(flags)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = totalResult[0]?.count || 0;

    // Get flags with pagination
    const flagsList = await db
      .select()
      .from(flags)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(flags.createdAt))
      .limit(params.limit)
      .offset(params.offset);

    // Transform to API format (camelCase to snake_case)
    const flagsResponse = flagsList.map((flag) => ({
      id: flag.id,
      tutor_id: flag.tutorId,
      session_id: flag.sessionId,
      flag_type: flag.flagType,
      severity: flag.severity,
      title: flag.title,
      description: flag.description,
      recommended_action: flag.recommendedAction,
      supporting_data: flag.supportingData,
      status: flag.status,
      resolved_at: flag.resolvedAt?.toISOString() || null,
      resolved_by: flag.resolvedBy,
      resolution_notes: flag.resolutionNotes,
      coach_agreed: flag.coachAgreed,
      created_at: flag.createdAt.toISOString(),
      updated_at: flag.updatedAt.toISOString(),
    }));

    return NextResponse.json(
      {
        flags: flagsResponse,
        pagination: {
          limit: params.limit,
          offset: params.offset,
          total,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching flags:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to fetch flags",
      },
      { status: 500 }
    );
  }
}

