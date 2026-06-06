// demoScript.js
// This defines the automated steps for the Demo Runner.
// Ensure your React components have the corresponding ids or classes.

const demoScript = [
  { type: 'wait', ms: 1000 },
  
  // 1. Landing Page -> Login
  { type: 'navigate', path: '/' },
  { type: 'wait', ms: 1000 },
  { type: 'click', selector: 'a[href="/auth/login"]' },
  { type: 'wait', ms: 1000 },
  
  // 2. Login as Employer
  { type: 'click', selector: '#role-employer' },
  { type: 'wait', ms: 500 },
  { type: 'type', selector: 'input[type="email"]', text: 'employer@paylance.com' },
  { type: 'type', selector: 'input[type="password"]', text: 'password123' },
  { type: 'click', selector: 'button[type="submit"]' },
  { type: 'wait', ms: 2000 },
  
  // 3. Navigate to create job
  { type: 'click', selector: 'a[href="/dashboard/employer/jobs/new"]' },
  { type: 'wait', ms: 1000 },
  { type: 'type', selector: '#job-title', text: 'Senior React Engineer for Defi Dashboard' },
  { type: 'type', selector: '#job-description', text: 'Build a decentralized dashboard using React and Tailwind. Must connect to Interledger testnet for Escrow logic.' },
  { type: 'type', selector: '#job-budget', text: '5000' },
  { type: 'type', selector: '#job-skills', text: 'React' },
  { type: 'click', selector: '#add-skill-btn' },
  { type: 'wait', ms: 500 },
  { type: 'click', selector: '#create-job-btn' },
  { type: 'wait', ms: 4000 }, // Wait for AI generation
  { type: 'click', selector: '#review-post-btn' },
  { type: 'wait', ms: 1000 },
  { type: 'click', selector: '#final-post-btn' },
  { type: 'wait', ms: 2500 }, // Navigate to matches

  // 4. Matches
  { type: 'click', selector: '.ai-match-card:first-child .hire-btn' },
  { type: 'wait', ms: 1500 },
  
  // 5. Chat & Escrow
  { type: 'type', selector: '#chat-input', text: 'Hi! Let us lock the terms. $5000 for the MVP.' },
  { type: 'click', selector: '#send-msg-btn' },
  { type: 'wait', ms: 1500 },
  { type: 'click', selector: '#lock-escrow-btn' },
  { type: 'wait', ms: 3000 }, // Wait for ILP escrow API
  
  // 6. Switch to Freelancer & Submit (Simulated via navigation for demo)
  { type: 'navigate', path: '/dashboard/freelancer/contracts' },
  { type: 'wait', ms: 1500 },
  { type: 'click', selector: '.submit-milestone-btn' },
  { type: 'wait', ms: 1000 },
  { type: 'type', selector: '#deliverable-url', text: 'https://github.com/freelancer/paylance-defi-mvp' },
  { type: 'click', selector: '#submit-deliverable-btn' },
  { type: 'wait', ms: 3000 }, // Wait for AI Verification

  // 7. Employer Review & Approve
  { type: 'navigate', path: '/dashboard/employer/contracts' },
  { type: 'wait', ms: 1500 },
  { type: 'click', selector: '.review-submission-btn' },
  { type: 'wait', ms: 2000 }, // Read AI report
  
  // The script stops here so the employer can manually click "Approve & Release"
];

export default demoScript;
