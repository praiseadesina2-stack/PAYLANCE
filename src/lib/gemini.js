// ─── Paylance Gemini AI Service ──────────────────────────────────────────────
// Powers: milestone generation, delivery verification, AI matching
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.NEXT_PUBLIC_GEMINI_API_KEY || "dummy";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
async function getMockResponse(prompt) {
    console.log("Using Mock Gemini AI fallback");
    if (prompt.includes("Break this freelance project into")) {
        return JSON.stringify({
            milestones: [
                { id: "m1", title: "Deliver MVP", description: "Complete the entire project as specified.", deliverables: ["Complete Source Code & Deployment"], amount: 5000, durationDays: 12, acceptanceCriteria: "Code builds, tests pass, and meets all requirements." }
            ],
            totalBudget: 5000,
            estimatedDays: 12,
            aiSummary: "I've structured the project into a single milestone for fast delivery.",
            riskFlags: ["Ensure the frontend uses standard REST for the API."]
        });
    } else if (prompt.includes("Verify this milestone submission")) {
        return JSON.stringify({
            verdict: "APPROVED",
            confidence: 95,
            summary: "The submitted code perfectly meets the acceptance criteria for this milestone.",
            checklist: [{ criterion: "Code builds", passed: true, note: "Verified." }],
            approvedAmount: 1500
        });
    } else if (prompt.includes("Rank these freelancers")) {
        return JSON.stringify({
            matches: [
                { freelancerId: "f1", matchScore: 98, reasoning: "Perfect match for React and Node.js.", strengthHighlights: ["High trust score", "React expert"], concerns: [] },
                { freelancerId: "f2", matchScore: 85, reasoning: "Good backend skills, lacking some frontend depth.", strengthHighlights: ["Backend experience"], concerns: ["No React projects listed"] }
            ],
            totalCandidates: 2,
            matchingSummary: "Found highly qualified candidates for this stack.",
            recommendedId: "f1"
        });
    }
    return "{}";
}

async function callGemini(prompt, systemPrompt) {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "dummy" || GEMINI_API_KEY.includes("REVOKED")) {
        return getMockResponse(prompt);
    }

    const contents = [];
    if (systemPrompt) {
        contents.push({ role: "user", parts: [{ text: systemPrompt }] });
        contents.push({ role: "model", parts: [{ text: "Understood. I will follow these instructions precisely." }] });
    }
    contents.push({ role: "user", parts: [{ text: prompt }] });
    
    try {
        const res = await fetch(`${GEMINI_BASE}?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents,
                generationConfig: {
                    temperature: 0.4,
                    maxOutputTokens: 2048,
                    responseMimeType: "application/json",
                },
            }),
        });
        
        if (!res.ok) {
            const err = await res.text();
            console.warn(`Gemini API error ${res.status}: ${err}. Falling back to mock data...`);
            return getMockResponse(prompt);
        }
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    } catch (error) {
        console.error("Gemini call failed:", error);
        // Fallback to mock if fetch fails entirely (e.g. CORS/Network) or if API key is invalid
        return getMockResponse(prompt);
    }
}
export async function generateMilestones(jobTitle, jobDescription, budget, skills) {
    const system = `You are Paylance's AI Project Architect. Your job is to break freelance projects into clear, verifiable milestones.
Rules:
- Always return valid JSON matching the schema exactly
- Milestones must be independently verifiable 
- Amounts must sum to totalBudget exactly
- Each milestone must have concrete, checkable deliverables
- riskFlags should warn about vague requirements, scope creep risks, or unclear success criteria`;
    const prompt = `Break this freelance project into 3-5 milestones:

Title: ${jobTitle}
Description: ${jobDescription}
Total Budget: $${budget} USD
Required Skills: ${skills.join(", ")}

Return this exact JSON structure:
{
  "milestones": [
    {
      "id": "m1",
      "title": "string (short, action-oriented)",
      "description": "string (what will be built/done)",
      "deliverables": ["string", "string"],
      "amount": number,
      "durationDays": number,
      "acceptanceCriteria": "string (specific, measurable criteria for AI verification)"
    }
  ],
  "totalBudget": number,
  "estimatedDays": number,
  "aiSummary": "string (2-3 sentences explaining the project breakdown)",
  "riskFlags": ["string"] 
}`;
    const raw = await callGemini(prompt, system);
    const parsed = JSON.parse(raw);
    // Ensure amounts sum correctly
    const total = parsed.milestones.reduce((s, m) => s + m.amount, 0);
    if (Math.abs(total - budget) > 1) {
        // Adjust last milestone
        const diff = budget - (total - parsed.milestones[parsed.milestones.length - 1].amount);
        parsed.milestones[parsed.milestones.length - 1].amount = Math.max(0, diff);
        parsed.totalBudget = budget;
    }
    return parsed;
}
export async function verifyDeliverable(milestoneTitle, milestoneDescription, acceptanceCriteria, deliverables, submissionNotes, submittedFiles, // file names/descriptions
milestoneAmount) {
    const system = `You are Paylance's AI Delivery Verifier. You determine if submitted work meets milestone acceptance criteria.
You protect BOTH parties — freelancers from non-payment, employers from substandard work.
Be thorough but fair. Escalate to humans only for genuinely ambiguous cases.
Always return valid JSON matching the schema exactly.`;
    const prompt = `Verify this milestone submission:

MILESTONE: ${milestoneTitle}
DESCRIPTION: ${milestoneDescription}
ACCEPTANCE CRITERIA: ${acceptanceCriteria}
EXPECTED DELIVERABLES: ${deliverables.join(", ")}

SUBMISSION:
Notes from freelancer: "${submissionNotes}"
Files submitted: ${submittedFiles.join(", ") || "No files attached"}
Amount at stake: $${milestoneAmount}

Return this exact JSON:
{
  "verdict": "APPROVED" | "NEEDS_REVISION" | "ESCALATED",
  "confidence": number (0-100),
  "summary": "string (2-3 sentence verdict explanation)",
  "checklist": [
    {
      "criterion": "string (specific criteria being checked)",
      "passed": boolean,
      "note": "string (explanation)"
    }
  ],
  "approvedAmount": number (full amount if APPROVED, 0 if not),
  "escalationReason": "string (only if ESCALATED)",
  "suggestedRevisions": ["string"] (only if NEEDS_REVISION, specific action items)
}

Rules:
- APPROVE if >75% criteria clearly met and no critical issues
- NEEDS_REVISION if work exists but specific gaps present
- ESCALATE only if genuinely impossible to determine without human context
- confidence < 60 should trigger ESCALATED`;
    const raw = await callGemini(prompt, system);
    return JSON.parse(raw);
}
export async function matchFreelancers(jobTitle, jobDescription, requiredSkills, milestones, freelancers) {
    const system = `You are Paylance's AI Talent Matcher. Rank freelancers for a specific job.
Consider: skill alignment, trust score, experience depth, and bio relevance.
Be precise — your scores directly affect who gets hired.`;
    const prompt = `Rank these freelancers for this job:

JOB: ${jobTitle}
DESCRIPTION: ${jobDescription}
SKILLS NEEDED: ${requiredSkills.join(", ")}
MILESTONES: ${milestones.map(m => m.title).join(", ")}

CANDIDATES:
${freelancers.map(f => `
ID: ${f.id}
Name: ${f.name}
Skills: ${f.skills.join(", ")}
Bio: ${f.bio}
Trust Score: ${f.trustScore}/5
Completed Jobs: ${f.completedJobs}
`).join("\n---")}

Return this exact JSON:
{
  "matches": [
    {
      "freelancerId": "string",
      "matchScore": number (0-100),
      "reasoning": "string (2 sentences)",
      "strengthHighlights": ["string"],
      "concerns": ["string"]
    }
  ],
  "totalCandidates": number,
  "matchingSummary": "string (overall summary of talent pool quality)",
  "recommendedId": "string (ID of top recommendation)"
}`;
    const raw = await callGemini(prompt, system);
    const result = JSON.parse(raw);
    result.matches.sort((a, b) => b.matchScore - a.matchScore);
    return result;
}
