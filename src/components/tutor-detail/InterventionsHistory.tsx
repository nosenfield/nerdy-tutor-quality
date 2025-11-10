"use client";

import { format, parseISO } from "date-fns";
import { MessageSquare, FileText, Phone, Mail } from "lucide-react";
import type { TutorDetailResponse } from "@/lib/hooks/useTutorDetailData";

interface InterventionsHistoryProps {
  interventions: TutorDetailResponse["interventions"];
}

/**
 * Get intervention type icon
 */
function getInterventionIcon(type: string) {
  const lowerType = type.toLowerCase();
  if (lowerType.includes("call") || lowerType.includes("phone")) {
    return <Phone className="h-4 w-4" />;
  }
  if (lowerType.includes("email") || lowerType.includes("mail")) {
    return <Mail className="h-4 w-4" />;
  }
  if (lowerType.includes("warning") || lowerType.includes("document")) {
    return <FileText className="h-4 w-4" />;
  }
  return <MessageSquare className="h-4 w-4" />;
}

/**
 * Interventions History Component
 * 
 * Displays history of interventions for the tutor.
 * Task 4.20
 */
export function InterventionsHistory({
  interventions,
}: InterventionsHistoryProps) {
  if (!interventions || interventions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Interventions History
        </h2>
        <div className="text-center py-8 text-gray-500">
          <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-400" />
          <p>No interventions recorded</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Interventions History
        </h2>
        <span className="text-sm text-gray-600">
          {interventions.length}{" "}
          {interventions.length === 1 ? "intervention" : "interventions"}
        </span>
      </div>

      <div className="space-y-4">
        {interventions.map((intervention) => {
          const interventionDate = parseISO(intervention.intervention_date);
          const icon = getInterventionIcon(intervention.intervention_type);

          return (
            <div
              key={intervention.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="text-gray-600">{icon}</div>
                  <span className="font-medium text-gray-900">
                    {intervention.intervention_type}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {format(interventionDate, "MMM d, yyyy")}
                </span>
              </div>

              <p className="text-sm text-gray-700 mb-2">
                {intervention.description}
              </p>

              {intervention.outcome && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    Outcome:
                  </p>
                  <p className="text-xs text-gray-700">{intervention.outcome}</p>
                  {intervention.outcome_notes && (
                    <p className="text-xs text-gray-600 mt-1">
                      {intervention.outcome_notes}
                    </p>
                  )}
                </div>
              )}

              {intervention.follow_up_date && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-600">
                    Follow-up:{" "}
                    {format(parseISO(intervention.follow_up_date), "MMM d, yyyy")}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

