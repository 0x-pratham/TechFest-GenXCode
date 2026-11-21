export type SubmissionStatus =
  | "pending"
  | "under_review"
  | "shortlisted"
  | "rejected"
  | "winner";

export interface EnrichedSubmission {
  id: string;
  project_title: string;
  description: string | null;
  solution_features: string | null;
  github_url: string | null;
  production_url: string | null;
  signed_deck_url: string | null;
  status: SubmissionStatus | string;
  score: number | null;
  judge_remarks: string | null;
  submitted_at: string | null;
  participant_name: string;
  participant_email: string;
  application_number: string;
  problem_title: string;
  problem_domain: string | null;
}

export const STATUS_OPTIONS: ReadonlyArray<{
  value: SubmissionStatus;
  label: string;
}> = [
  { value: "pending", label: "Pending review" },
  { value: "under_review", label: "Under review" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "rejected", label: "Not selected" },
  { value: "winner", label: "Winner" },
];

export const STATUS_BADGE_STYLES: Record<string, string> = {
  pending: "border-[#e3dbd0] bg-[#faf7f2] text-[#5e536b]",
  under_review: "border-[#dfcdf5] bg-[#f6f0fd] text-[#6828a2]",
  shortlisted: "border-[#bfe6c9] bg-[#eefaf1] text-[#1b7a37]",
  rejected: "border-[#f5c2c7] bg-[#fff1f2] text-[#be123c]",
  winner: "border-[#d8b4fe] bg-[#1b053e] text-[#f9f6f1]",
};