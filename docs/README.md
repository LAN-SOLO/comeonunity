# ComeOnUnity Documentation

This directory contains all project documentation for the ComeOnUnity platform.

**Last Updated:** January 2026

---

## Documentation Index

| Document | Description | Audience |
|----------|-------------|----------|
| [PRODUCT_SPEC.md](./PRODUCT_SPEC.md) | Product requirements, user stories, database schema, API endpoints | Product, Development |
| [PROJECT_SPEC.md](./PROJECT_SPEC.md) | Technical implementation guide, code examples, security patterns | Development |
| [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) | Sprint planning, testing strategy, deployment pipeline | Development, Project Management |
| [SETUP_GUIDE.md](./SETUP_GUIDE.md) | Environment setup, tooling configuration, workflow | Development |
| [STYLE_GUIDE.md](./STYLE_GUIDE.md) | Design standards, component patterns, documentation guidelines | Development, Design |

---

## Quick Links

### For Developers

- **Getting Started:** [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- **Code Patterns:** [PROJECT_SPEC.md](./PROJECT_SPEC.md)
- **UI Components:** [STYLE_GUIDE.md](./STYLE_GUIDE.md)
- **API Reference:** [PRODUCT_SPEC.md](./PRODUCT_SPEC.md#api-endpoints)

### For Project Management

- **Timeline:** [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md#development-phases)
- **User Stories:** [PRODUCT_SPEC.md](./PRODUCT_SPEC.md#user-stories-moscow)
- **Success Metrics:** [PRODUCT_SPEC.md](./PRODUCT_SPEC.md#success-metrics)

---

## Project Configuration

The main project configuration file is `CLAUDE.md` in the repository root. It contains:
- Framework versions
- Path aliases
- Installed components
- Development commands

---

## Tech Stack Summary

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js | 16 |
| UI Library | React | 19 |
| Language | TypeScript | Strict mode |
| Styling | Tailwind CSS | v4 |
| Components | shadcn/ui | New York style |
| Backend | Supabase | Latest |
| Authentication | Supabase Auth | + 2FA (TOTP) |

---

## Documentation Standards

When updating documentation:

1. **Keep versions current** - Update framework/library versions when they change
2. **Include examples** - All patterns should have working code examples
3. **Cross-reference** - Link to related documentation
4. **Date updates** - Note the last updated date on each document

See [STYLE_GUIDE.md#documentation-standards](./STYLE_GUIDE.md#documentation-standards) for full guidelines.

---

## Key Requirements

### Color Picker Requirement

**All color selection options must include the `ColorPicker` component.**

See [STYLE_GUIDE.md#color-selection](./STYLE_GUIDE.md#color-selection) for implementation details.

### Security Requirements

- Two-factor authentication (TOTP)
- Rate limiting on all auth endpoints
- Audit logging for admin actions
- Row-level security on all tables

See [PRODUCT_SPEC.md#security-checklist](./PRODUCT_SPEC.md#security-checklist) for the complete checklist.

---

## Contributing to Documentation

1. Follow the naming convention: `UPPER_SNAKE_CASE.md`
2. Include a table of contents for files > 100 lines
3. Update the "Last Updated" date when making changes
4. Add new documents to this index

---

*ComeOnUnity Documentation | January 2026*
