# 🛠️ ComeOnUnity — Development Environment Setup Guide

> **Complete Setup for macOS with Claude Code, VSCode, and MCP Integrations**  
> *Version 1.0 | January 2026*

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Status](#project-status)
3. [Claude Code Setup](#claude-code-setup)
4. [MCP (Model Context Protocol) Configuration](#mcp-configuration)
5. [VSCode Configuration](#vscode-configuration)
6. [Supabase Setup](#supabase-setup)
7. [Environment Variables](#environment-variables)
8. [Additional Services Setup](#additional-services-setup)
9. [Recommended Workflow](#recommended-workflow)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| macOS | 13+ (Ventura or later) | `sw_vers` |
| Node.js | 20+ LTS | `node --version` |
| npm | 10+ | `npm --version` |
| Git | 2.40+ | `git --version` |
| Homebrew | Latest | `brew --version` |

### Install Prerequisites (if needed)

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js via nvm (recommended)
brew install nvm
mkdir ~/.nvm
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
echo '[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"' >> ~/.zshrc
source ~/.zshrc
nvm install 20
nvm use 20
nvm alias default 20

# Install Git (usually pre-installed)
brew install git

# Install GitHub CLI (useful for auth)
brew install gh
```

---

## Project Status

### ✅ Already Set Up

The following has already been initialized in your project:

```
comeonunity/
├── .git/                    # GitHub: git@github.com:LAN-SOLO/comeonunity.git
├── node_modules/
├── app/                     # Next.js App Router
├── components/
│   └── ui/                  # shadcn components
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── dropdown-menu.tsx
│       ├── sheet.tsx
│       ├── dialog.tsx
│       └── avatar.tsx
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

**Installed Dependencies:**
- `@supabase/supabase-js` — Supabase client
- `@supabase/ssr` — Server-side rendering support
- shadcn/ui components (button, card, input, label, dropdown-menu, sheet, dialog, avatar)

**Supabase Project:**
- Project Ref: `pnswkyciqbrxfazltqqq`
- MCP URL: `https://mcp.supabase.com/mcp?project_ref=pnswkyciqbrxfazltqqq`

---

## Claude Code Setup

### Install Claude Code CLI

```bash
# Install Claude Code globally via npm
npm install -g @anthropic-ai/claude-code

# Verify installation
claude --version

# Authenticate (opens browser)
claude auth login
```

### Claude Code Configuration

Create Claude Code config file:

**~/.claude/config.json:**

```json
{
  "model": "claude-sonnet-4-20250514",
  "maxTokens": 8192,
  "temperature": 0,
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp?project_ref=pnswkyciqbrxfazltqqq"
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-filesystem", "/Users/$USER/Projects/comeonunity"]
    },
    "github": {
      "command": "npx", 
      "args": ["-y", "@anthropic-ai/mcp-server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  },
  "defaultPromptTemplate": "You are working on ComeOnUnity, a community platform built with Next.js 15, React 19, TypeScript, Tailwind CSS, and Supabase. Follow the project's design system and security guidelines."
}
```

### Working with Claude Code

```bash
# Start Claude Code in project directory
cd ~/Projects/comeonunity
claude

# Start with specific context
claude --context "Working on authentication feature"

# Use with file reference
claude --file src/app/api/auth/route.ts "Add rate limiting to this endpoint"
```

### Useful Claude Code Commands

| Command | Description |
|---------|-------------|
| `claude` | Start interactive session |
| `claude "prompt"` | Single prompt |
| `claude --file <path>` | Include file context |
| `claude --diff` | Show proposed changes as diff |
| `claude --apply` | Apply changes directly |
| `claude mcp list` | List connected MCP servers |
| `claude mcp status` | Check MCP connection status |

---

## MCP Configuration

### What is MCP?

Model Context Protocol (MCP) allows Claude to interact directly with external services like Supabase, GitHub, and your filesystem.

### MCP Servers for ComeOnUnity

#### 1. Supabase MCP (Already Connected)

```
URL: https://mcp.supabase.com/mcp?project_ref=pnswkyciqbrxfazltqqq
```

**Capabilities:**
- Query database tables
- Execute SQL
- Manage schema
- View RLS policies
- Access storage

**Usage in Claude:**
```
"Use Supabase MCP to create the communities table"
"Query all users from the user_profiles table"
"Show me the RLS policies on the items table"
```

#### 2. GitHub MCP

**Install and Configure:**

```bash
# Generate GitHub token
# Go to: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
# Permissions needed: repo, read:org

# Set environment variable
echo 'export GITHUB_TOKEN="ghp_your_token_here"' >> ~/.zshrc
source ~/.zshrc
```

**Add to Claude config (~/.claude/config.json):**

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

**Capabilities:**
- Create/read issues
- Manage pull requests
- Access repository content
- View commits

#### 3. Filesystem MCP

**Add to Claude config:**

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y", 
        "@anthropic-ai/mcp-server-filesystem",
        "/Users/YOUR_USERNAME/Projects/comeonunity"
      ]
    }
  }
}
```

**Capabilities:**
- Read/write files
- Navigate directories
- Search files

#### 4. Browser/Fetch MCP (Optional)

For web research and documentation lookup:

```json
{
  "mcpServers": {
    "fetch": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-fetch"]
    }
  }
}
```

### Complete MCP Configuration

**~/.claude/config.json (Full Example):**

```json
{
  "model": "claude-sonnet-4-20250514",
  "maxTokens": 8192,
  "temperature": 0,
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp?project_ref=pnswkyciqbrxfazltqqq"
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@anthropic-ai/mcp-server-filesystem",
        "/Users/YOUR_USERNAME/Projects/comeonunity"
      ]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "fetch": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-fetch"]
    }
  },
  "systemPrompt": "You are assisting with ComeOnUnity development. Tech stack: Next.js 15, React 19, TypeScript, Tailwind CSS, Supabase. Follow Apple-inspired design system. Prioritize security and type safety."
}
```

### Verify MCP Connections

```bash
# Start Claude and check connections
claude

# In Claude session:
> mcp list
> mcp status supabase
> mcp test supabase "SELECT 1"
```

---

## VSCode Configuration

### Recommended Extensions

Install these extensions for optimal development:

```bash
# Install via command line
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension formulahendry.auto-rename-tag
code --install-extension christian-kohler.path-intellisense
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension prisma.prisma
code --install-extension GitHub.copilot
code --install-extension eamodio.gitlens
code --install-extension usernamehw.errorlens
code --install-extension yoavbls.pretty-ts-errors
code --install-extension streetsidesoftware.code-spell-checker
```

**Extension List:**

| Extension | Purpose |
|-----------|---------|
| ESLint | Code linting |
| Prettier | Code formatting |
| Tailwind CSS IntelliSense | Tailwind autocomplete |
| Auto Rename Tag | HTML/JSX tag renaming |
| Path Intellisense | File path autocomplete |
| TypeScript Next | Latest TS features |
| GitHub Copilot | AI code completion |
| GitLens | Git supercharged |
| Error Lens | Inline error display |
| Pretty TS Errors | Readable TypeScript errors |
| Code Spell Checker | Typo detection |

### VSCode Settings

**.vscode/settings.json:**

```json
{
  // Editor
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },
  "editor.tabSize": 2,
  "editor.wordWrap": "on",
  "editor.minimap.enabled": false,
  "editor.bracketPairColorization.enabled": true,
  "editor.guides.bracketPairs": true,
  "editor.inlineSuggest.enabled": true,
  
  // Files
  "files.autoSave": "onFocusChange",
  "files.exclude": {
    "**/.git": true,
    "**/.next": true,
    "**/node_modules": true
  },
  
  // TypeScript
  "typescript.updateImportsOnFileMove.enabled": "always",
  "typescript.suggest.autoImports": true,
  "typescript.preferences.importModuleSpecifier": "relative",
  
  // Tailwind
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ],
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  },
  
  // ESLint
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  
  // Git
  "git.enableSmartCommit": true,
  "git.confirmSync": false,
  "git.autofetch": true,
  
  // Terminal
  "terminal.integrated.defaultProfile.osx": "zsh",
  "terminal.integrated.fontSize": 13,
  
  // Emmet
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  }
}
```

### VSCode Keyboard Shortcuts

**.vscode/keybindings.json:**

```json
[
  {
    "key": "cmd+shift+p",
    "command": "workbench.action.showCommands"
  },
  {
    "key": "cmd+p",
    "command": "workbench.action.quickOpen"
  },
  {
    "key": "cmd+shift+f",
    "command": "workbench.action.findInFiles"
  },
  {
    "key": "cmd+shift+e",
    "command": "workbench.view.explorer"
  },
  {
    "key": "cmd+b",
    "command": "workbench.action.toggleSidebarVisibility"
  },
  {
    "key": "cmd+j",
    "command": "workbench.action.togglePanel"
  },
  {
    "key": "ctrl+`",
    "command": "workbench.action.terminal.toggleTerminal"
  }
]
```

### Launch Configurations

**.vscode/launch.json:**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    },
    {
      "name": "Next.js: debug full stack",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev",
      "serverReadyAction": {
        "pattern": "- Local:.+(https?://.+)",
        "uriFormat": "%s",
        "action": "debugWithChrome"
      }
    }
  ]
}
```

### Snippets

**.vscode/typescriptreact.code-snippets:**

```json
{
  "React Server Component": {
    "prefix": "rsc",
    "body": [
      "export default async function ${1:ComponentName}() {",
      "  return (",
      "    <div>",
      "      $0",
      "    </div>",
      "  )",
      "}"
    ],
    "description": "React Server Component"
  },
  "React Client Component": {
    "prefix": "rcc",
    "body": [
      "'use client'",
      "",
      "import { useState } from 'react'",
      "",
      "export function ${1:ComponentName}() {",
      "  const [state, setState] = useState($2)",
      "",
      "  return (",
      "    <div>",
      "      $0",
      "    </div>",
      "  )",
      "}"
    ],
    "description": "React Client Component"
  },
  "API Route Handler": {
    "prefix": "api",
    "body": [
      "import { NextResponse } from 'next/server'",
      "import { createClient } from '@/lib/supabase/server'",
      "",
      "export async function ${1|GET,POST,PUT,DELETE|}(request: Request) {",
      "  const supabase = await createClient()",
      "  const { data: { user } } = await supabase.auth.getUser()",
      "",
      "  if (!user) {",
      "    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })",
      "  }",
      "",
      "  $0",
      "",
      "  return NextResponse.json({ success: true })",
      "}"
    ],
    "description": "Next.js API Route Handler"
  },
  "Zod Schema": {
    "prefix": "zod",
    "body": [
      "import { z } from 'zod'",
      "",
      "export const ${1:schemaName}Schema = z.object({",
      "  $0",
      "})",
      "",
      "export type ${1:schemaName}Input = z.infer<typeof ${1:schemaName}Schema>"
    ],
    "description": "Zod Schema Definition"
  }
}
```

---

## Supabase Setup

### Access Supabase Dashboard

```
URL: https://supabase.com/dashboard/project/pnswkyciqbrxfazltqqq
```

### Install Supabase CLI

```bash
# Install via Homebrew
brew install supabase/tap/supabase

# Login
supabase login

# Link to project
cd ~/Projects/comeonunity
supabase link --project-ref pnswkyciqbrxfazltqqq
```

### Supabase CLI Commands

| Command | Description |
|---------|-------------|
| `supabase status` | Check local/remote status |
| `supabase db diff` | Show schema differences |
| `supabase db push` | Push migrations to remote |
| `supabase db pull` | Pull remote schema |
| `supabase db dump` | Dump database |
| `supabase gen types typescript` | Generate TypeScript types |

### Generate TypeScript Types

```bash
# Generate types from database schema
supabase gen types typescript --project-id pnswkyciqbrxfazltqqq > src/lib/database.types.ts

# Add to package.json scripts
```

**package.json:**

```json
{
  "scripts": {
    "db:types": "supabase gen types typescript --project-id pnswkyciqbrxfazltqqq > src/lib/database.types.ts"
  }
}
```

### Local Development with Supabase

```bash
# Start local Supabase (optional, for offline development)
supabase start

# Stop local
supabase stop
```

---

## Environment Variables

### Create Environment Files

**Create `.env.local`:**

```bash
touch .env.local
echo ".env*.local" >> .gitignore
```

**.env.local:**

```env
# ===========================================
# ComeOnUnity Environment Variables
# ===========================================

# Supabase (from Supabase Dashboard → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://pnswkyciqbrxfazltqqq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=ComeOnUnity

# Security
ENCRYPTION_KEY=generate_32_byte_hex_key_here

# Upstash Redis (for rate limiting)
# Get from: https://console.upstash.com/
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

# Resend (for emails)
# Get from: https://resend.com/api-keys
RESEND_API_KEY=re_your_api_key

# Stripe (for payments - add later)
# STRIPE_SECRET_KEY=sk_test_xxx
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
# STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Generate Encryption Key

```bash
# Generate 32-byte hex key
openssl rand -hex 32
```

### Environment Variable Validation

**src/lib/env.ts:**

```typescript
import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  ENCRYPTION_KEY: z.string().length(64),
})

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
})
```

---

## Additional Services Setup

### 1. Upstash Redis (Rate Limiting)

```bash
# 1. Create account at https://console.upstash.com/
# 2. Create new Redis database
# 3. Copy REST URL and Token to .env.local

# Install package
npm install @upstash/ratelimit @upstash/redis
```

### 2. Resend (Transactional Emails)

```bash
# 1. Create account at https://resend.com/
# 2. Verify your domain (or use onboarding domain for testing)
# 3. Create API key
# 4. Add to .env.local

# Install package
npm install resend
```

### 3. PostHog (Analytics - Optional)

```bash
# 1. Create account at https://posthog.com/
# 2. Create project
# 3. Get API key

# Install
npm install posthog-js
```

### 4. Sentry (Error Tracking - Optional)

```bash
# Install
npx @sentry/wizard@latest -i nextjs
```

---

## Remaining Dependencies to Install

Run these commands to complete the setup:

```bash
cd ~/Projects/comeonunity

# Forms & Validation
npm install zod react-hook-form @hookform/resolvers

# Calendar
npm install @fullcalendar/core @fullcalendar/react @fullcalendar/daygrid \
  @fullcalendar/timegrid @fullcalendar/interaction

# i18n
npm install next-intl

# Date handling
npm install date-fns

# Security - 2FA
npm install otplib qrcode
npm install -D @types/qrcode

# Rate Limiting
npm install @upstash/ratelimit @upstash/redis

# Email
npm install resend

# ID Generation
npm install nanoid

# Additional shadcn components
npx shadcn@latest add form toast select badge tabs table textarea \
  separator calendar popover command switch tooltip alert sonner

# Testing (Dev dependencies)
npm install -D vitest @vitejs/plugin-react jsdom \
  @testing-library/react @testing-library/jest-dom
npm install -D @playwright/test
npx playwright install

# Linting & Formatting
npm install -D husky lint-staged prettier
```

---

## Recommended Workflow

### Daily Development Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    DAILY WORKFLOW                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. START SESSION                                               │
│     ├── Open VSCode: code ~/Projects/comeonunity                │
│     ├── Open Terminal (⌃`)                                       │
│     ├── Pull latest: git pull origin main                       │
│     └── Start dev server: npm run dev                           │
│                                                                  │
│  2. WORK WITH CLAUDE                                            │
│     ├── Open new terminal tab                                   │
│     ├── Start Claude: claude                                    │
│     ├── Describe task: "Implement login form with Zod validation"│
│     └── Review & apply changes                                  │
│                                                                  │
│  3. COMMIT CHANGES                                              │
│     ├── Stage changes: git add .                                │
│     ├── Commit: git commit -m "feat(auth): add login form"      │
│     └── Push: git push origin main                              │
│                                                                  │
│  4. END SESSION                                                 │
│     ├── Stop dev server: Ctrl+C                                 │
│     ├── Push any remaining changes                              │
│     └── Update task tracker                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Terminal Tabs Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Tab 1: Dev Server        │ Tab 2: Claude        │ Tab 3: Git  │
│ npm run dev              │ claude               │ git status  │
│                          │                      │ git diff    │
└──────────────────────────────────────────────────────────────┘
```

### Claude Interaction Tips

**Effective Prompts:**

```
# For new features
"Create the community creation API endpoint following our validation patterns
and security guidelines. Include rate limiting and audit logging."

# For debugging
"This API returns 500 error. Here's the code and error log. 
Use Supabase MCP to check if the RLS policy might be blocking."

# For refactoring
"Refactor this component to use our design system. 
Follow the Apple-inspired patterns from our style guide."

# For testing
"Write integration tests for the items API. 
Cover success cases and error handling."
```

**Working with MCP:**

```
# Database operations
"Use Supabase MCP to create the audit_logs table with the schema from our spec"

# Query data
"Use Supabase MCP to show me all RLS policies on the communities table"

# File operations
"Read src/lib/supabase/server.ts and add error handling"
```

### Git Workflow

```bash
# Start new feature
git checkout -b feature/auth-login
# ... make changes ...
git add .
git commit -m "feat(auth): implement login form"
git push origin feature/auth-login
git checkout main
git merge feature/auth-login
git push origin main
git branch -d feature/auth-login

# Quick fix on main
git add .
git commit -m "fix(ui): correct button alignment"
git push origin main

# Create version tag
git tag -a v0.1.0-foundation -m "Foundation: project setup complete"
git push origin v0.1.0-foundation
```

---

## Troubleshooting

### Common Issues

#### 1. MCP Connection Failed

```bash
# Check MCP server status
claude mcp status

# Restart Claude
claude --restart

# Verify config syntax
cat ~/.claude/config.json | jq .
```

#### 2. Supabase Connection Issues

```bash
# Test connection
supabase status

# Check credentials in .env.local
cat .env.local | grep SUPABASE

# Test with curl
curl -H "apikey: YOUR_ANON_KEY" \
  https://pnswkyciqbrxfazltqqq.supabase.co/rest/v1/
```

#### 3. TypeScript Errors

```bash
# Regenerate types
npm run db:types

# Clear TypeScript cache
rm -rf .next
rm -rf node_modules/.cache
npm run dev
```

#### 4. Module Not Found

```bash
# Clear and reinstall
rm -rf node_modules
rm package-lock.json
npm install
```

#### 5. Port Already in Use

```bash
# Find process on port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

#### 6. Git Push Rejected

```bash
# Pull with rebase
git pull --rebase origin main

# Force push (only if you know what you're doing)
git push --force-with-lease origin main
```

### Useful Debugging Commands

```bash
# Check Node version
node --version

# Check npm packages
npm list --depth=0

# Check environment
env | grep NEXT

# Check Supabase connection
supabase db ping

# Verify TypeScript
npx tsc --noEmit

# Run ESLint
npm run lint

# Check for security issues
npm audit
```

---

## Quick Reference Card

### Essential Commands

| Task | Command |
|------|---------|
| Start dev server | `npm run dev` |
| Build production | `npm run build` |
| Run tests | `npm run test` |
| Lint code | `npm run lint` |
| Generate DB types | `npm run db:types` |
| Start Claude | `claude` |
| Git status | `git status` |
| Git commit | `git commit -m "type: message"` |

### Project URLs

| Service | URL |
|---------|-----|
| Local Dev | http://localhost:3000 |
| Supabase Dashboard | https://supabase.com/dashboard/project/pnswkyciqbrxfazltqqq |
| GitHub Repo | https://github.com/LAN-SOLO/comeonunity |
| Supabase MCP | https://mcp.supabase.com/mcp?project_ref=pnswkyciqbrxfazltqqq |

### Keyboard Shortcuts (VSCode)

| Shortcut | Action |
|----------|--------|
| `⌘P` | Quick open file |
| `⌘⇧P` | Command palette |
| `⌘⇧F` | Search in files |
| `⌃\`` | Toggle terminal |
| `⌘B` | Toggle sidebar |
| `⌘J` | Toggle panel |
| `⌘/` | Toggle comment |
| `⌥⇧F` | Format document |

---

## Next Steps

After completing this setup:

1. ✅ Verify all MCP connections work
2. ✅ Test Supabase connection
3. ✅ Run `npm run dev` successfully
4. ✅ Make a test commit and push
5. → Begin Phase 1 (Foundation) from Development Plan

---

*ComeOnUnity Setup Guide v1.0 | January 2026*
