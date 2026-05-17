Read PROJECT_STATUS.md and identify the next phase with status ⬜ (Not started).

Implement ONLY that single phase:

1. Read the phase description carefully — it specifies exact files, methods, and tests
2. Read CLAUDE.md for conventions, security rules, and version constraints
3. Read the existing source files referenced by the phase (types, schemas, channels, services)
4. Implement all unchecked tasks in the phase
5. Write the co-located tests specified in the phase
6. Run `npx vitest run` — fix any failures
7. Run `npx tsc --noEmit` — fix any type errors
8. Check off all completed tasks in PROJECT_STATUS.md
9. Update the phase status to ✅ in both the task list and the overview table
10. Add a changelog entry at the bottom with today's date

If any tests from previous phases break, fix the regression before proceeding.
If you encounter a blocker, add it to the "Blocked / Known issues" section and stop.

Do NOT implement more than one phase unless I explicitly ask you to continue.
