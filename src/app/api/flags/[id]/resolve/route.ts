/**
 * Flag Resolve API Endpoint
 * 
 * POST /api/flags/[id]/resolve - Mark flag as resolved
 * 
 * Request Body:
 * {
 *   resolution_notes: string,
 *   coach_agreed: boolean,
 *   intervention_type?: string,
 *   intervention_description?: string
 * }
 * 
 * Returns:
 * {
 *   flag: Flag,
 *   intervention?: Intervention
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { db, flags, interventions } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const resolveFlagSchema = z.object({
  resolution_notes: z.string().min(1, "Resolution notes are required"),
  coach_agreed: z.boolean(),
  intervention_type: z.string().optional(),
  intervention_description: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const flagId = id;

    // Get flag by ID
    const flagList = await db
      .select()
      .from(flags)
      .where(eq(flags.id, flagId))
      .limit(1);

    if (flagList.length === 0) {
      return NextResponse.json(
        {
          error: "Flag not found",
          message: `No flag found with id: ${flagId}`,
        },
        { status: 404 }
      );
    }

    const flag = flagList[0];

    // Parse and validate request body
    const body = await request.json();
    const validationResult = resolveFlagSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validationResult.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const params_data = validationResult.data;

    // Update flag status to resolved
    const updatedFlag = await db
      .update(flags)
      .set({
        status: "resolved",
        resolvedAt: new Date(),
        resolvedBy: "coach", // TODO: Get from auth context
        resolutionNotes: params_data.resolution_notes,
        coachAgreed: params_data.coach_agreed,
        updatedAt: new Date(),
      })
      .where(eq(flags.id, flagId))
      .returning();

    if (updatedFlag.length === 0) {
      return NextResponse.json(
        {
          error: "Internal server error",
          message: "Failed to update flag",
        },
        { status: 500 }
      );
    }

    const resolvedFlag = updatedFlag[0];

    // Create intervention if intervention_type is provided
    let intervention: (typeof interventions.$inferSelect) | null = null;
    if (params_data.intervention_type && params_data.intervention_description) {
      const newIntervention = await db
        .insert(interventions)
        .values({
          flagId: flagId,
          tutorId: flag.tutorId,
          interventionType: params_data.intervention_type,
          description: params_data.intervention_description,
          coachId: "coach", // TODO: Get from auth context
          interventionDate: new Date(),
        })
        .returning();

      if (newIntervention.length > 0) {
        intervention = newIntervention[0];
      }
    }

    // Transform to API format (camelCase to snake_case)
    const transformFlag = (flag: typeof resolvedFlag) => ({
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
    });

    const transformIntervention = (intervention: (typeof interventions.$inferSelect) | null) => {
      if (!intervention) return null;
      return {
        id: intervention.id,
        flag_id: intervention.flagId,
        tutor_id: intervention.tutorId,
        intervention_type: intervention.interventionType,
        description: intervention.description,
        coach_id: intervention.coachId,
        intervention_date: intervention.interventionDate.toISOString(),
        follow_up_date: intervention.followUpDate?.toISOString() || null,
        outcome: intervention.outcome,
        outcome_notes: intervention.outcomeNotes,
        created_at: intervention.createdAt.toISOString(),
      };
    };

    return NextResponse.json(
      {
        flag: transformFlag(resolvedFlag),
        ...(intervention ? { intervention: transformIntervention(intervention) } : {}),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error resolving flag:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to resolve flag",
      },
      { status: 500 }
    );
  }
}

