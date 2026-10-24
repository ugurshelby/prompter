# Writing for Claude Sonnet 5.5

Strengths: speed with strong intelligence; efficient agentic coding on well-specified tasks; chat and latency-sensitive work. Default effort `high` on the API, `medium` in Claude Code. Effort levels are recalibrated versus Sonnet 5.

## Behaviors and the tested fixes

- **Adds unrequested files at every effort** (tests, docs, small helper files that fit repo conventions; more at high effort). If the person wants only the requested change:
  "When the work the user asked for is done and checked, stop and report. Don't add features, tests, files, docs or refactors that weren't asked for. If you think one would help, mention it at the end instead of doing it."
  At `xhigh`/`max` this also makes changes smaller.
- **Extra review / hardening rounds at `xhigh`/`max`**, including reviewer sub-agents:
  "When the work the user asked for is done and its checks pass, stop and report. Don't start extra rounds of review or hardening on your own, and don't launch reviewer sub-agents unless the user asked for a review. If you think a deeper review is worth doing, say so at the end."
  (Cut session cost by about a third at `max` with the same quality.) Routine work belongs at `high` or below.
- **Starts building when asked for ideas** ("show me what you can do with this"):
  "When the user asks for ideas, options or a plan, give them that and stop. Don't start building or changing anything until they say to go ahead."
- **Stops early / asks for approval at low-medium effort** in multi-part work. First consider higher effort; otherwise:
  "Keep working until everything the user asked for is done, and only stop to ask when you can't go on without the user or before a risky step."
- **Skips real verification at `low`:**
  "When you change code that can be run, built, or type-checked, run a real check that exercises the change before reporting it done: the project's tests, type-checker, or build, or the changed command itself. A syntax-only check, or a check command that failed to start, does not count. Only if no real check can run here, say which one you did not run and why instead of reporting the change as done."
- **Answers from training data for things that change** (when a search tool exists; remove "minimize tool calls"-style lines first):
  "Use the search tool to check specifics that may have changed since your training, such as what is allowed, required or charged, even when you feel confident. For researched work such as a report or a comparison, gather current sources rather than writing from your training knowledge."
- **Reasoning tasks with JSON-only output** (aggregation, applying rules, ranking) — at low/medium it often answers without thinking. Add at the end: "Think the problem through before you answer." Or use `xhigh`.
- **Dense charts and technical drawings:** much more accurate when it has a crop/zoom or code tool.
