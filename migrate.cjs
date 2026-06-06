const fs = require('fs');
const path = require('path');

const NEXT_DIR = path.join(__dirname, '../app');
const VITE_DIR = path.join(__dirname, 'src');

const MAPPINGS = [
  { from: 'layout.tsx', to: 'layouts/RootLayout.tsx' },
  { from: 'dashboard/layout.tsx', to: 'layouts/DashboardLayout.tsx' },
  { from: 'page.tsx', to: 'pages/LandingPage.tsx' },
  { from: 'auth/login/page.tsx', to: 'pages/auth/Login.tsx' },
  { from: 'auth/register/page.tsx', to: 'pages/auth/Register.tsx' },
  { from: 'dashboard/employer/page.tsx', to: 'pages/dashboard/employer/Overview.tsx' },
  { from: 'dashboard/employer/jobs/page.tsx', to: 'pages/dashboard/employer/Jobs.tsx' },
  { from: 'dashboard/employer/jobs/new/page.tsx', to: 'pages/dashboard/employer/NewJob.tsx' },
  { from: 'dashboard/employer/contracts/page.tsx', to: 'pages/dashboard/employer/Contracts.tsx' },
  { from: 'dashboard/employer/jobs/[id]/contract/page.tsx', to: 'pages/dashboard/employer/ContractDetails.tsx' },
  { from: 'dashboard/employer/jobs/[id]/matches/page.tsx', to: 'pages/dashboard/employer/Matches.tsx' },
  { from: 'dashboard/employer/network/page.tsx', to: 'pages/dashboard/employer/Network.tsx' },
  { from: 'dashboard/employer/sessions/page.tsx', to: 'pages/dashboard/employer/Sessions.tsx' },
  { from: 'dashboard/employer/settings/page.tsx', to: 'pages/dashboard/employer/Settings.tsx' },
  { from: 'dashboard/freelancer/page.tsx', to: 'pages/dashboard/freelancer/Overview.tsx' },
  { from: 'dashboard/freelancer/contracts/page.tsx', to: 'pages/dashboard/freelancer/Contracts.tsx' },
  { from: 'dashboard/freelancer/contracts/[id]/submit/[milestoneId]/page.tsx', to: 'pages/dashboard/freelancer/SubmitMilestone.tsx' },
  { from: 'dashboard/freelancer/opportunities/page.tsx', to: 'pages/dashboard/freelancer/Opportunities.tsx' },
  { from: 'dashboard/freelancer/sessions/page.tsx', to: 'pages/dashboard/freelancer/Sessions.tsx' },
  { from: 'dashboard/sessions/room/[id]/page.tsx', to: 'pages/dashboard/sessions/Room.tsx' },
  { from: 'dashboard/wallet/page.tsx', to: 'pages/dashboard/Wallet.tsx' }
];

function transformContent(content, isLayout) {
  let result = content;

  // Next.js Link
  result = result.replace(/import Link from "next\/link";?/g, 'import { Link } from "react-router-dom";');
  
  // Next.js Navigation
  if (result.includes('next/navigation')) {
    result = result.replace(/import \{([^}]+)\} from "next\/navigation";?/g, (match, imports) => {
      let routerImports = [];
      if (imports.includes('useRouter')) routerImports.push('useNavigate');
      if (imports.includes('usePathname')) routerImports.push('useLocation');
      if (imports.includes('useParams')) routerImports.push('useParams');
      if (routerImports.length === 0) return '';
      return `import { ${routerImports.join(', ')} } from "react-router-dom";`;
    });
  }

  // Replace hook calls
  result = result.replace(/const router = useRouter\(\);?/g, 'const navigate = useNavigate();');
  result = result.replace(/const pathname = usePathname\(\);?/g, 'const location = useLocation();\n  const pathname = location.pathname;');
  result = result.replace(/router\.push\((.*?)\)/g, 'navigate($1)');

  // Fix Metadata (just strip it to avoid errors)
  result = result.replace(/export const metadata: Metadata = \{[\s\S]*?\};/g, '');
  result = result.replace(/import type \{ Metadata \} from "next";?/g, '');

  // Handle Layouts specifically
  if (isLayout) {
    if (!result.includes('react-router-dom')) {
      result = 'import { Outlet } from "react-router-dom";\n' + result;
    } else {
      result = result.replace(/import \{([^}]+)\} from "react-router-dom";?/, (match, imports) => {
        if (!imports.includes('Outlet')) {
          return `import { ${imports}, Outlet } from "react-router-dom";`;
        }
        return match;
      });
    }

    if (result.includes('DashboardLayout')) {
        result = result.replace(/\{children\}/g, '<Outlet />');
        result = result.replace(/\{ children \}: \{ children: React\.ReactNode \}/g, '');
        result = result.replace(/DashboardLayout\(\)/g, 'DashboardLayout()');
    }
  }

  // Handle RootLayout
  if (result.includes('RootLayout')) {
      // RootLayout shouldn't have <html>, <head>, <body>
      result = result.replace(/<html[^>]*>([\s\S]*?)<\/html>/gi, '<>$1</>');
      result = result.replace(/<head>([\s\S]*?)<\/head>/gi, '');
      result = result.replace(/<body>(\{children\})<\/body>/gi, '<Outlet />');
  }

  // Next.js params in pages: e.g. function Page({ params }: { params: { id: string } })
  // In React Router, we use useParams().
  if (result.includes('params.id') || result.includes('params.milestoneId') || result.includes('params:')) {
    if (!result.includes('useParams')) {
      if (result.includes('react-router-dom')) {
        result = result.replace(/import \{([^}]+)\} from "react-router-dom";?/, `import { $1, useParams } from "react-router-dom";`);
      } else {
        result = `import { useParams } from "react-router-dom";\n` + result;
      }
    }
    result = result.replace(/function [a-zA-Z]+\(\{\s*params\s*\}:[^)]+\)\s*\{/, (match) => {
      return match.replace(/\{\s*params\s*\}:[^)]+/, '') + '\n  const params = useParams();\n';
    });
    // Fallback if no type definition
    result = result.replace(/function [a-zA-Z]+\(\{\s*params\s*\}\)\s*\{/, (match) => {
      return match.replace(/\{\s*params\s*\}/, '') + '\n  const params = useParams();\n';
    });
  }

  return result;
}

MAPPINGS.forEach(mapping => {
  const source = path.join(NEXT_DIR, mapping.from);
  const dest = path.join(VITE_DIR, mapping.to);
  
  if (!fs.existsSync(source)) {
    console.warn('Source not found:', source);
    return;
  }

  const isLayout = mapping.from.includes('layout.tsx');
  let content = fs.readFileSync(source, 'utf8');
  content = transformContent(content, isLayout);

  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  fs.writeFileSync(dest, content);
  console.log(`Migrated ${mapping.from} -> ${mapping.to}`);
});
