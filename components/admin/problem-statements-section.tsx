"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import {
  deleteProblemStatement,
  saveProblemStatement,
} from "@/app/admin/actions";
import {
  ADMIN_FIELD_CLASS,
  ADMIN_LABEL_CLASS,
  ADMIN_PRIMARY_BTN,
  ADMIN_SECONDARY_BTN,
} from "./admin-styles";

export interface AdminProblemRow {
  id: string;
  title: string;
  summary: string | null;
  domain: string | null;
  difficulty: string | null;
  max_slots: number | null;
  filled_slots: number;
  display_order: number;
  is_active: boolean;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface ProblemStatementsSectionProps {
  problems: AdminProblemRow[];
}

function parseRedirectOutcome(error: unknown): "saved" | "error" | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string"
  ) {
    const digest = (error as { digest: string }).digest;
    if (!digest.startsWith("NEXT_REDIRECT")) return null;
    if (digest.includes("error=")) return "error";
    return "saved";
  }
  return null;
}

export function ProblemStatementsSection({
  problems,
}: ProblemStatementsSectionProps) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [domain, setDomain] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [maxSlots, setMaxSlots] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [summary, setSummary] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [composerFeedback, setComposerFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [isAdding, startAddTransition] = useTransition();

  const publishedCount = problems.filter((p) => p.is_active).length;
  const draftCount = problems.length - publishedCount;
  const totalSelections = problems.reduce(
    (sum, p) => sum + (p.filled_slots || 0),
    0
  );

  function toggleCard(id: string) {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleAddProblem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isAdding) return;

    const cleanTitle = title.trim();
    const cleanSummary = summary.trim();
    if (!cleanTitle || !cleanSummary) {
      setComposerFeedback({
        type: "error",
        text: "Title and short summary are required.",
      });
      return;
    }

    const parsedOrder = Number.parseInt(displayOrder, 10);
    const trimmedMax = maxSlots.trim();
    if (trimmedMax !== "" && Number(trimmedMax) < 0) {
      setComposerFeedback({
        type: "error",
        text: "Maximum selections cannot be negative.",
      });
      return;
    }

    setComposerFeedback(null);
    const formData = new FormData();
    formData.set("title", cleanTitle);
    formData.set("domain", domain.trim());
    formData.set("difficulty", difficulty.trim());
    formData.set("max_slots", trimmedMax);
    formData.set(
      "display_order",
      Number.isFinite(parsedOrder) ? String(parsedOrder) : "0"
    );
    formData.set("summary", cleanSummary);
    if (isActive) {
      formData.set("is_active", "on");
    }

    const resetComposer = () => {
      setTitle("");
      setDomain("");
      setDifficulty("");
      setMaxSlots("");
      setDisplayOrder("0");
      setSummary("");
      setComposerFeedback({
        type: "success",
        text: `"${cleanTitle}" added to problem tracks.`,
      });
      router.refresh();
    };

    startAddTransition(async () => {
      try {
        await saveProblemStatement(formData);
        resetComposer();
      } catch (err) {
        const outcome = parseRedirectOutcome(err);
        if (outcome === "saved") {
          resetComposer();
          return;
        }
        setComposerFeedback({
          type: "error",
          text: "Could not save to database. Check your server action columns and retry.",
        });
      }
    });
  }

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-[#e3dbd0] bg-white shadow-[0_10px_32px_rgba(27,5,62,0.03)]">
      {/* Top Editorial Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#ebe4dc] bg-[#fdfcfa] px-5 py-6 sm:px-8 sm:py-7">
        <div>
          <p className="editorial text-[15px] italic text-[#6828a2]">
            Hackathon Tracks · Challenge Briefs
          </p>
          <h2 className="editorial mt-1 text-2xl font-bold tracking-[-0.02em] text-[#1b053e] sm:text-[2rem]">
            Problem statements
          </h2>
          <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-[#5c4f6e]">
            Create, order, or unpublish problem tracks. Only active statements
            appear for participant selection.
          </p>
        </div>

        <p className="font-mono text-xs font-semibold text-[#5e536b]">
          {publishedCount} ACTIVE
          {draftCount > 0 ? ` · ${draftCount} HIDDEN` : ""}
          {` · ${totalSelections} SELECTED`}
        </p>
      </div>

      <div className="p-5 sm:p-8">
        {/* New Problem Statement Composer */}
        <div className="rounded-xl border border-[#e6ddf2] bg-[#faf7ff] p-4 sm:p-6">
          <div className="mb-4 flex items-baseline justify-between border-b border-[#ebe1f7] pb-3">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#6828a2]">
                New Track
              </p>
              <h3 className="editorial mt-0.5 text-lg font-bold text-[#1b053e]">
                Add a problem statement
              </h3>
            </div>
            <span className="hidden text-xs font-medium text-[#7a6d8c] sm:inline">
              {problems.length} {problems.length === 1 ? "track" : "tracks"} total
            </span>
          </div>

          <form onSubmit={handleAddProblem} className="space-y-4">
            <div className="grid min-w-0 gap-3.5 sm:grid-cols-12 sm:gap-4">
              <label className={ADMIN_LABEL_CLASS + " min-w-0 sm:col-span-6"}>
                Title *
                <input
                  required
                  name="title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setComposerFeedback(null);
                  }}
                  disabled={isAdding}
                  className={ADMIN_FIELD_CLASS}
                  placeholder="Autonomous Campus Energy Optimizer"
                />
              </label>

              <label className={ADMIN_LABEL_CLASS + " min-w-0 sm:col-span-3"}>
                Domain
                <input
                  name="domain"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  disabled={isAdding}
                  className={ADMIN_FIELD_CLASS}
                  placeholder="FinTech, Healthcare, AI"
                />
              </label>

              <label className={ADMIN_LABEL_CLASS + " min-w-0 sm:col-span-3"}>
                Difficulty
                <input
                  name="difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  disabled={isAdding}
                  className={ADMIN_FIELD_CLASS}
                  placeholder="Beginner, Open"
                />
              </label>

              <label className={ADMIN_LABEL_CLASS + " min-w-0 sm:col-span-8"}>
                Short Summary *
                <textarea
                  required
                  name="summary"
                  rows={2}
                  value={summary}
                  onChange={(e) => {
                    setSummary(e.target.value);
                    setComposerFeedback(null);
                  }}
                  disabled={isAdding}
                  className={ADMIN_FIELD_CLASS}
                  placeholder="Brief problem overview and deliverables shown to participants."
                />
              </label>

              <div className="grid grid-cols-2 gap-3.5 sm:col-span-4">
                <label className={ADMIN_LABEL_CLASS + " min-w-0"}>
                  Max Slots
                  <input
                    name="max_slots"
                    type="number"
                    min="0"
                    value={maxSlots}
                    onChange={(e) => setMaxSlots(e.target.value)}
                    disabled={isAdding}
                    className={ADMIN_FIELD_CLASS}
                    placeholder="No limit"
                  />
                </label>

                <label className={ADMIN_LABEL_CLASS + " min-w-0"}>
                  Order
                  <input
                    name="display_order"
                    type="number"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(e.target.value)}
                    disabled={isAdding}
                    className={ADMIN_FIELD_CLASS}
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#ebe1f7] pt-4">
              <label className="inline-flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-[#3d2b54]">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={isAdding}
                  className="size-4 rounded accent-[#5f2295]"
                />
                <span>Publish immediately to participant dashboards</span>
              </label>

              <button
                type="submit"
                disabled={isAdding}
                className={`${ADMIN_PRIMARY_BTN} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {isAdding ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Adding…</span>
                  </>
                ) : (
                  <>
                    <Plus size={15} />
                    <span>Add Problem Statement</span>
                  </>
                )}
              </button>
            </div>

            {composerFeedback && (
              <p
                role={composerFeedback.type === "error" ? "alert" : "status"}
                className={`flex items-center gap-1.5 text-xs font-semibold ${
                  composerFeedback.type === "error"
                    ? "text-[#be123c]"
                    : "text-[#1b7a37]"
                }`}
              >
                {composerFeedback.type === "error" ? (
                  <AlertCircle size={13} className="shrink-0" />
                ) : (
                  <Check size={13} className="shrink-0" />
                )}
                <span>{composerFeedback.text}</span>
              </p>
            )}
          </form>
        </div>

        {/* Existing Problem Statements List */}
        {problems.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-[#dcd0ec] bg-[#fcfaff] p-8 text-center">
            <p className="editorial text-lg font-bold text-[#1b053e]">
              No problem statements added yet
            </p>
            <p className="mt-1 text-xs text-[#76678a]">
              Add your first challenge track above so participants can choose a
              problem statement.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-3.5">
            {problems.map((problem, idx) => (
              <ProblemRowCard
                key={`${problem.id}-${problem.title}-${problem.summary ?? ""}-${problem.domain ?? ""}-${problem.difficulty ?? ""}-${problem.max_slots ?? ""}-${problem.filled_slots}-${problem.display_order}-${problem.is_active}`}
                problem={problem}
                index={idx}
                isExpanded={Boolean(expandedIds[problem.id])}
                onToggle={() => toggleCard(problem.id)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

interface ProblemRowCardProps {
  problem: AdminProblemRow;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}

function ProblemRowCard({
  problem,
  index,
  isExpanded,
  onToggle,
}: ProblemRowCardProps) {
  const router = useRouter();

  const [title, setTitle] = useState(problem.title);
  const [domain, setDomain] = useState(problem.domain ?? "");
  const [difficulty, setDifficulty] = useState(problem.difficulty ?? "");
  const [maxSlots, setMaxSlots] = useState(
    problem.max_slots !== null && problem.max_slots !== undefined
      ? String(problem.max_slots)
      : ""
  );
  const [displayOrder, setDisplayOrder] = useState(
    String(problem.display_order ?? 0)
  );
  const [summary, setSummary] = useState(problem.summary ?? "");
  const [isActive, setIsActive] = useState(problem.is_active);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const originalMaxSlots =
    problem.max_slots !== null && problem.max_slots !== undefined
      ? String(problem.max_slots)
      : "";
  const originalOrder = String(problem.display_order ?? 0);

  const isDirty =
    title.trim() !== problem.title ||
    domain.trim() !== (problem.domain ?? "") ||
    difficulty.trim() !== (problem.difficulty ?? "") ||
    maxSlots.trim() !== originalMaxSlots ||
    displayOrder.trim() !== originalOrder ||
    summary.trim() !== (problem.summary ?? "") ||
    isActive !== problem.is_active;

  const hasSelections = (problem.filled_slots || 0) > 0;
  const capacityLabel =
    problem.max_slots !== null && problem.max_slots > 0
      ? `${problem.filled_slots}/${problem.max_slots} slots`
      : `${problem.filled_slots} selected`;

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSaving || !isDirty) return;

    const cleanTitle = title.trim();
    const cleanSummary = summary.trim();
    if (!cleanTitle || !cleanSummary) {
      setFeedback({
        type: "error",
        text: "Title and short summary are required.",
      });
      return;
    }

    const trimmedMax = maxSlots.trim();
    if (trimmedMax !== "" && Number(trimmedMax) < 0) {
      setFeedback({
        type: "error",
        text: "Maximum selections cannot be negative.",
      });
      return;
    }

    if (
      trimmedMax !== "" &&
      Number(trimmedMax) > 0 &&
      Number(trimmedMax) < problem.filled_slots
    ) {
      setFeedback({
        type: "error",
        text: `Already selected by ${problem.filled_slots} participants. Set max slots to at least ${problem.filled_slots} or leave blank.`,
      });
      return;
    }

    const parsedOrder = Number.parseInt(displayOrder, 10);

    setFeedback(null);
    const formData = new FormData();
    formData.set("id", problem.id);
    formData.set("title", cleanTitle);
    formData.set("domain", domain.trim());
    formData.set("difficulty", difficulty.trim());
    formData.set("max_slots", trimmedMax);
    formData.set(
      "display_order",
      Number.isFinite(parsedOrder) ? String(parsedOrder) : "0"
    );
    formData.set("summary", cleanSummary);
    if (isActive) {
      formData.set("is_active", "on");
    }

    startSaveTransition(async () => {
      try {
        await saveProblemStatement(formData);
        setFeedback({ type: "success", text: "Problem statement saved." });
        router.refresh();
      } catch (err) {
        const outcome = parseRedirectOutcome(err);
        if (outcome === "saved") {
          setFeedback({ type: "success", text: "Problem statement saved." });
          router.refresh();
          return;
        }
        setFeedback({
          type: "error",
          text: "Could not save changes. Check your server action columns and retry.",
        });
      }
    });
  }

  function handleDelete() {
    if (isDeleting || hasSelections) return;
    setFeedback(null);

    const formData = new FormData();
    formData.set("id", problem.id);

    startDeleteTransition(async () => {
      try {
        await deleteProblemStatement(formData);
        router.refresh();
      } catch (err) {
        const outcome = parseRedirectOutcome(err);
        if (outcome === "saved") {
          router.refresh();
          return;
        }
        setConfirmingDelete(false);
        setFeedback({
          type: "error",
          text: "Could not delete this track. It may already have participant selections.",
        });
      }
    });
  }

  return (
    <article
      className={`min-w-0 rounded-xl border bg-white transition-colors ${
        isExpanded
          ? "border-[#cdb0ef] shadow-[0_8px_24px_rgba(27,5,62,0.04)]"
          : "border-[#e6ddf2] hover:border-[#cdb0ef]"
      }`}
    >
      {/* Compact Summary Row */}
      <div
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className="flex cursor-pointer items-center justify-between gap-3 p-4 select-none sm:px-5"
      >
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 font-mono text-xs font-bold text-[#6828a2]">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <h3 className="editorial truncate text-lg font-bold leading-snug text-[#1b053e]">
              {problem.title}
            </h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6e6080]">
              {problem.domain && (
                <span className="inline-flex items-center gap-1 font-medium">
                  <Layers size={12} className="text-[#6828a2]" />
                  <span>{problem.domain}</span>
                </span>
              )}
              {problem.difficulty && (
                <span className="inline-flex items-center gap-1 font-medium">
                  <Sparkles size={12} className="text-[#6828a2]" />
                  <span>{problem.difficulty}</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1 font-medium">
                <Users size={12} className="text-[#6828a2]" />
                <span>{capacityLabel}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <span
            className={`font-mono text-[11px] font-bold tracking-wider ${
              problem.is_active ? "text-[#1b7a37]" : "text-[#7a6d8c]"
            }`}
          >
            {problem.is_active ? "ACTIVE" : "HIDDEN"}
          </span>

          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#5f2295]">
            <span className="hidden sm:inline">
              {isExpanded ? "Close" : "Edit"}
            </span>
            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </span>
        </div>
      </div>

      {/* Expandable Inline Editor */}
      {isExpanded && (
        <div className="border-t border-[#f0e8f8] bg-[#fdfcff] p-4 sm:p-6">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid min-w-0 gap-3.5 sm:grid-cols-12 sm:gap-4">
              <label className={ADMIN_LABEL_CLASS + " min-w-0 sm:col-span-6"}>
                Title *
                <input
                  required
                  name="title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setFeedback(null);
                  }}
                  disabled={isSaving || isDeleting}
                  className={ADMIN_FIELD_CLASS}
                />
              </label>

              <label className={ADMIN_LABEL_CLASS + " min-w-0 sm:col-span-3"}>
                Domain
                <input
                  name="domain"
                  value={domain}
                  onChange={(e) => {
                    setDomain(e.target.value);
                    setFeedback(null);
                  }}
                  disabled={isSaving || isDeleting}
                  className={ADMIN_FIELD_CLASS}
                />
              </label>

              <label className={ADMIN_LABEL_CLASS + " min-w-0 sm:col-span-3"}>
                Difficulty
                <input
                  name="difficulty"
                  value={difficulty}
                  onChange={(e) => {
                    setDifficulty(e.target.value);
                    setFeedback(null);
                  }}
                  disabled={isSaving || isDeleting}
                  className={ADMIN_FIELD_CLASS}
                />
              </label>

              <label className={ADMIN_LABEL_CLASS + " min-w-0 sm:col-span-8"}>
                Short Summary *
                <textarea
                  required
                  name="summary"
                  rows={2}
                  value={summary}
                  onChange={(e) => {
                    setSummary(e.target.value);
                    setFeedback(null);
                  }}
                  disabled={isSaving || isDeleting}
                  className={ADMIN_FIELD_CLASS}
                />
              </label>

              <div className="grid grid-cols-2 gap-3.5 sm:col-span-4">
                <label className={ADMIN_LABEL_CLASS + " min-w-0"}>
                  Max Slots
                  <input
                    name="max_slots"
                    type="number"
                    min={problem.filled_slots || 0}
                    value={maxSlots}
                    onChange={(e) => {
                      setMaxSlots(e.target.value);
                      setFeedback(null);
                    }}
                    disabled={isSaving || isDeleting}
                    className={ADMIN_FIELD_CLASS}
                    placeholder="No limit"
                  />
                </label>

                <label className={ADMIN_LABEL_CLASS + " min-w-0"}>
                  Order
                  <input
                    name="display_order"
                    type="number"
                    value={displayOrder}
                    onChange={(e) => {
                      setDisplayOrder(e.target.value);
                      setFeedback(null);
                    }}
                    disabled={isSaving || isDeleting}
                    className={ADMIN_FIELD_CLASS}
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ebe1f7] pt-4">
              <label className="inline-flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-[#3d2b54]">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={isActive}
                  onChange={(e) => {
                    setIsActive(e.target.checked);
                    setFeedback(null);
                  }}
                  disabled={isSaving || isDeleting}
                  className="size-4 rounded accent-[#5f2295]"
                />
                <span>Published and visible to participants</span>
              </label>

              <div className="flex flex-wrap items-center gap-2.5">
                {hasSelections ? (
                  <span className="text-[11px] font-medium text-[#7a6d8c]">
                    In use by {problem.filled_slots} · unpublish to hide
                  </span>
                ) : !confirmingDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    disabled={isSaving || isDeleting}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#f5c2c7] bg-[#fff8f8] px-3.5 py-2.5 text-xs font-semibold text-[#be123c] transition-colors hover:bg-[#fff1f2] disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#be123c] px-3.5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#9f1239] disabled:opacity-60"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          <span>Removing…</span>
                        </>
                      ) : (
                        <span>Confirm delete</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                      disabled={isDeleting}
                      className="rounded-xl border border-[#e3dbd0] bg-white px-3 py-2.5 text-xs font-semibold text-[#5e564f] hover:bg-[#faf7f2]"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSaving || isDeleting || !isDirty}
                  className={`${ADMIN_SECONDARY_BTN} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-[#5f2295]" />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} className="text-[#5f2295]" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {feedback && (
              <p
                role={feedback.type === "error" ? "alert" : "status"}
                className={`flex items-center gap-1.5 text-xs font-semibold ${
                  feedback.type === "error"
                    ? "text-[#be123c]"
                    : "text-[#1b7a37]"
                }`}
              >
                {feedback.type === "error" ? (
                  <AlertCircle size={13} className="shrink-0" />
                ) : (
                  <Check size={13} className="shrink-0" />
                )}
                <span>{feedback.text}</span>
              </p>
            )}
          </form>
        </div>
      )}
    </article>
  );
}