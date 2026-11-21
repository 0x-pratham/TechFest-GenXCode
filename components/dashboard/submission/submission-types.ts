export interface ParticipantSubmissionRecord {
  id: string;
  registration_id: string;
  problem_statement_id: string;
  project_title: string;
  description: string;
  solution_features: string;
  github_url: string;
  production_url: string;
  presentation_path: string | null;
  status: string;
  submitted_at: string | null;
  updated_at?: string | null;
}

export interface ProblemOption {
  id: string;
  title: string;
  domain: string | null;
}

export const SUBMISSION_STATUS_META: Record<
  string,
  { label: string; summary: string; badgeClass: string }
> = {
  pending: {
    label: "Submitted · Awaiting review",
    summary: "Your entry is locked in and queued for the judging panel.",
    badgeClass: "border-[#dfcdf5] bg-[#f6f0fd] text-[#6828a2]",
  },
  under_review: {
    label: "Under review",
    summary: "Judges are actively evaluating your repository, demo, and deck.",
    badgeClass: "border-[#dfcdf5] bg-[#f6f0fd] text-[#6828a2]",
  },
  shortlisted: {
    label: "Shortlisted",
    summary: "Congratulations — your project made the shortlist for live pitching.",
    badgeClass: "border-[#bfe6c9] bg-[#eefaf1] text-[#1b7a37]",
  },
  winner: {
    label: "Winner",
    summary: "Your project has been selected as a GenXCode Tech Fest winner.",
    badgeClass: "border-[#d8b4fe] bg-[#1b053e] text-[#f9f6f1]",
  },
  rejected: {
    label: "Evaluated · Not shortlisted",
    summary: "Thank you for building and submitting your project at GenXCode.",
    badgeClass: "border-[#e3dbd0] bg-[#faf7f2] text-[#5e536b]",
  },
};