# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)

```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume single project - adjust based on plan.md structure

## Phase 3.1: Setup

- [ ] T001 Create project structure per implementation plan
- [ ] T002 Initialize [language] project with [framework] dependencies
- [ ] T003 [P] Configure linting and formatting tools

## Phase 3.2: Manual Testing (MVP Approach) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: Manual testing procedures written and validated before ANY implementation**

- [ ] T004 [P] Manual test checklist for issue reporting in docs/manual-testing/test_issue_reporting.md
- [ ] T005 [P] Manual test checklist for offline functionality in docs/manual-testing/test_offline.md
- [ ] T006 [P] Manual test checklist for PWA installation in docs/manual-testing/test_pwa_install.md
- [ ] T007 [P] Manual test checklist for SMS fallback in docs/manual-testing/test_sms_fallback.md

## Phase 3.3: Core Implementation (ONLY after manual tests are documented)

- [ ] T008 [P] Issue model in src/models/issue.js
- [ ] T009 [P] IssueService for CRUD operations in src/services/issue_service.js
- [ ] T010 [P] Service Worker for offline functionality in src/sw.js
- [ ] T011 POST /api/issues endpoint
- [ ] T012 GET /api/issues endpoint
- [ ] T013 PWA manifest configuration
- [ ] T014 Offline queue implementation

## Phase 3.4: Integration

- [ ] T015 Connect IssueService to PostgreSQL DB
- [ ] T016 Image upload to Cloudinary
- [ ] T017 SMS integration with EngageSpark
- [ ] T018 Mapbox location services

## Phase 3.5: Polish

- [ ] T019 [P] PWA performance optimization
- [ ] T020 [P] Offline sync reliability testing
- [ ] T021 [P] Update README.md with setup instructions
- [ ] T022 Remove code duplication
- [ ] T023 Run manual testing procedures from docs/manual-testing/

## Dependencies

- Tests (T004-T007) before implementation (T008-T014)
- T008 blocks T009, T015
- T016 blocks T018
- Implementation before polish (T019-T023)

## Parallel Example

```
# Launch T004-T007 together:
Task: "Contract test POST /api/users in tests/contract/test_users_post.py"
Task: "Contract test GET /api/users/{id} in tests/contract/test_users_get.py"
Task: "Integration test registration in tests/integration/test_registration.py"
Task: "Integration test auth in tests/integration/test_auth.py"
```

## Notes

- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Commit after each task
- Avoid: vague tasks, same file conflicts

## Task Generation Rules

_Applied during main() execution_

1. **From Contracts**:
   - Each contract file → contract test task [P]
   - Each endpoint → implementation task
2. **From Data Model**:
   - Each entity → model creation task [P]
   - Relationships → service layer tasks
3. **From User Stories**:

   - Each story → integration test [P]
   - Quickstart scenarios → validation tasks

4. **Ordering**:
   - Setup → Tests → Models → Services → Endpoints → Polish
   - Dependencies block parallel execution

## Validation Checklist

_GATE: Checked by main() before returning_

- [ ] All contracts have corresponding tests
- [ ] All entities have model tasks
- [ ] All tests come before implementation
- [ ] Parallel tasks truly independent
- [ ] Each task specifies exact file path
- [ ] No task modifies same file as another [P] task
