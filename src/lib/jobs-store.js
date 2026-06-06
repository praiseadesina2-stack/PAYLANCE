// ─── Paylance Extended Store ──────────────────────────────────────────────────
// Extends the existing Zustand store with jobs, contracts, and escrow management
// Drop this alongside the existing lib/store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
export const useJobsStore = create()(persist((set, get) => ({
    jobs: [],
    addJob: (job) => set((s) => ({ jobs: [job, ...s.jobs] })),
    updateJob: (id, patch) => set((s) => ({
        jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)),
    })),
    fundEscrow: (jobId) => set((s) => ({
        jobs: s.jobs.map((j) => j.id === jobId
            ? {
                ...j,
                escrow: {
                    ...j.escrow,
                    status: "FUNDED",
                    funded: j.escrow.total,
                    ilpTxId: `ilp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                },
            }
            : j),
    })),
    hireFreelancer: (jobId, freelancerId, freelancerName) => set((s) => ({
        jobs: s.jobs.map((j) => j.id === jobId
            ? {
                ...j,
                status: "IN_PROGRESS",
                freelancerId,
                freelancerName,
                milestones: j.milestones.map((m, i) => ({
                    ...m,
                    status: (i === 0 ? "IN_PROGRESS" : "LOCKED"),
                })),
            }
            : j),
    })),
    submitMilestone: (jobId, milestoneId, notes, files) => set((s) => ({
        jobs: s.jobs.map((j) => j.id === jobId
            ? {
                ...j,
                milestones: j.milestones.map((m) => m.id === milestoneId
                    ? {
                        ...m,
                        status: "UNDER_REVIEW",
                        submittedAt: new Date().toISOString(),
                        submissionNotes: notes,
                        submittedFiles: files,
                    }
                    : m),
            }
            : j),
    })),
    recordVerdict: (jobId, milestoneId, result) => set((s) => ({
        jobs: s.jobs.map((j) => j.id === jobId
            ? {
                ...j,
                milestones: j.milestones.map((m) => m.id === milestoneId
                    ? {
                        ...m,
                        // UNDER_REVIEW_AI_COMPLETE means AI reviewed but employer hasn't approved yet
                        status: result.verdict === 'UNDER_REVIEW_AI_COMPLETE'
                            ? 'UNDER_REVIEW'
                            : result.verdict === "APPROVED"
                                ? "APPROVED"
                                : result.verdict === "NEEDS_REVISION"
                                    ? "NEEDS_REVISION"
                                    : "ESCALATED",
                        verificationResult: result,
                    }
                    : m),
            }
            : j),
    })),
    releaseMilestonePayment: (jobId, milestoneId) => set((s) => ({
        jobs: s.jobs.map((j) => {
            if (j.id !== jobId)
                return j;
            const milestone = j.milestones.find((m) => m.id === milestoneId);
            if (!milestone)
                return j;
            const newReleased = j.escrow.released + milestone.amount;
            const allApproved = j.milestones
                .filter((m) => m.id !== milestoneId)
                .every((m) => m.status === "APPROVED");
            // Unlock next milestone
            let nextUnlocked = false;
            const newMilestones = j.milestones.map((m) => {
                if (m.id === milestoneId)
                    return { ...m, paidAt: new Date().toISOString() };
                if (!nextUnlocked && m.status === "LOCKED") {
                    nextUnlocked = true;
                    return { ...m, status: "IN_PROGRESS" };
                }
                return m;
            });
            return {
                ...j,
                status: allApproved ? "COMPLETED" : j.status,
                milestones: newMilestones,
                escrow: {
                    ...j.escrow,
                    released: newReleased,
                    status: newReleased >= j.escrow.total
                        ? "RELEASED"
                        : "PARTIAL_RELEASE",
                },
            };
        }),
    })),
    unlockDownload: (jobId, files) => set((s) => ({
        jobs: s.jobs.map((j) => j.id === jobId
            ? { ...j, downloadUnlocked: true, finalFiles: files }
            : j),
    })),
    getJobById: (id) => get().jobs.find((j) => j.id === id),
    getEmployerJobs: (employerId) => get().jobs.filter((j) => j.employerId === employerId),
    getFreelancerContracts: (freelancerId) => get().jobs.filter((j) => j.freelancerId === freelancerId),
}), { name: "Paylance-jobs" }));
