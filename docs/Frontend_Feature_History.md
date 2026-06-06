# OpenLI Codex - Frontend Feature Revision History

**Version**: v0.7.0 | **Updated**: Feb 9, 2026

---

## v0.7.0 (Current)
- **Prompts Tab** - `/prompts` - Browse, filter, search prompt templates
- **New Template Modal** - Create templates with name, category, body, variables
- **Use Template Modal** - Fill variables, live preview, Copy, Send to Agent
- **Template Picker** - 📝 "Use Template" dropdown in Agent Console prompt area
- **Variable Fill Modal** - Typed inputs (string, text, enum, date, number) in Agent Console
- **sessionStorage Prefill** - Seamless prompt transfer from Prompts page → Agent Console
- **Sidebar: Prompts** - 📝 Prompts navigation link added
- **AboutModal v0.7.0** - Version history updated with Prompt & Skills Manager features
- **Key Features Grid** - "Prompt Templates" added to About modal

## v0.6.8
- **Collapsible Sidebar** - Click LI logo to collapse/expand
- **Mobile Hamburger Menu** - TopNav toggle for mobile
- **Multi-Agent SDK Dropdown** - 7 runners (Claude ✓, Codex ✓, 5 coming soon)
- **Responsive Agent Controls** - ⚙️ toggle for mobile controls
- **Projects Page Buttons** - 🔍 Scan, 📤 Upload, + Import, 🗑️ Remove
- **Unified LI Branding** - Blue gradient icon everywhere
- **Dark Mode** - Full dark mode support

## v0.6.7
- **OpenLI Branding** - Uppercase "LI" throughout UI

## v0.6.6
- **Rebranded to OpenLI Codex**
- **Dual Licensing Display** - AGPL-3.0 + Commercial

## v0.6.5
- **New Favicon** - Blue gradient "LI" icon
- **About Modal** - Click logo → version history
- **Settings Menu** - ⚙️ icon → sample users with RBAC

## v0.6.4
- **Skills Management UI** - `/admin/skills` - List, toggle skills
- **Hooks Configuration UI** - `/admin/hooks` - Security, Audit hooks
- **TopNav Skills/Hooks Links**
- **RBAC Middleware**

## v0.6.0
- **Claude Agent SDK** - Full integration
- **10 Platform Skills** - sow-generator, architecture-design, etc.
- **Pre/Post Tool Hooks** - Security, audit logging

## v0.5.0
- **File Upload Modal** - Drag-and-drop upload
- **File Browser** - Tree view of workspace files
- **RBAC Tables** - Tenants, groups, workspace_access

## v0.4.x
- **Login/Register Pages** - JWT authentication
- **Admin User Management** - Approve, reject, activate users
- **Remove Workspace Button** - 🗑️ with confirmation
- **Auto-Clear on Runner Change**

## v0.3.0
- **Dashboard Metrics** - Workspaces, Sessions, Runs counts
- **Activity Feed** - Recent runs with status
- **System Health Status** - Backend, Codex, Claude, DB
- **Projects Tab** - Workspace cards with search
- **Settings Tab** - Theme, runner config, about
- **Dark Mode** - Tailwind darkMode: "class"
- **Agents Rename** - "Codex" → "Agents"

## v0.2.x
- **Chat Page** - `/chat` ChatGPT-style UI
- **Message Bubbles** - User/Assistant styling
- **Markdown/Syntax Highlighting**
- **Tool Call Cards** - Collapsible
- **Clickable Run History**
- **Shared App Context** - State across tabs
- **Scan Local Button** - Import local folders
- **Session Continuation**
- **Dual Runner Support** - Codex + Claude

## v0.1.0 (Initial)
- **Agent Console UI**
- **Workspace Import** - GitHub URL
- **SSE Event Streaming**
- **Transcript/Raw Events Views**

---

## Key Files

| Component | Path |
|-----------|------|
| Sidebar | `components/Sidebar.tsx` |
| TopNav | `components/TopNav.tsx` |
| AppShell | `components/AppShell.tsx` |
| AboutModal | `components/AboutModal.tsx` |
| Agent Page | `(app)/codex/page.tsx` |
| Projects Page | `(app)/projects/page.tsx` |
| Dashboard | `(app)/dashboard/page.tsx` |
| Chat | `(app)/chat/page.tsx` |
| Settings | `(app)/settings/page.tsx` |
| Admin Users | `(app)/admin/users/page.tsx` |
| Admin Skills | `(app)/admin/skills/page.tsx` |
| Admin Hooks | `(app)/admin/hooks/page.tsx` |
