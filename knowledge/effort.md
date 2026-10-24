# Effort

Effort is the main control over how much a Claude model thinks, and so over quality, latency and cost. Levels: `low`, `medium`, `high`, `xhigh`, `max`. Level names do not mean the same amount of thinking across models. Asking for "less thinking" in the prompt is unreliable; lower the effort instead. Thinking tokens count toward `max_tokens` and are billed as output.

## What each level is for

| Level | Use it for |
|---|---|
| `low` | Quick exchanges where the person reviews each result: brainstorming, a first sketch, a small change like a rename, simple chat, short tool tasks, sub-agents. Fastest and cheapest; the model scopes tightly and may skip verification. |
| `medium` | Day-to-day work with a clear scope, such as implementing a well-described feature. Default on Opus 5.5 and Haiku 5.5 (and on Sonnet 5.5 in Claude Code). |
| `high` | Work where verification matters or edge cases are likely: fixing a bug in an existing codebase, knowledge work, strict instruction following, longer agent tasks. Default on Sonnet 5.5 (API) and Fable 5.1. |
| `xhigh` | Long-horizon agentic and coding tasks (30+ minutes, large token budgets) where deeper reasoning pays off. |
| `max` | Hard problems the model should work through alone, such as finding security vulnerabilities. Diminishing returns and prone to overthinking; reserve it. |

## Per model

- **Opus 5.5:** start at `medium` (default). Thinking can't be turned off. Opus 5.5 thinks more than older Opus at the same level, especially at `xhigh`/`max`. Use `high` for hard debugging and verification-heavy work, `xhigh` for long autonomous coding, `low` for quick iterative work (coding at `low` is still close to `medium`). At `xhigh`/`max`, `max_tokens` should be at least 64k.
- **Sonnet 5.5:** default `high` on the API. Agentic coding and multi-step tool use: `medium` for well-specified tasks, `high` for harder or longer ones. Chat and latency-sensitive work: `medium` or `low` (above `medium` it briefly thinks before almost every reply, which delays the first token). Use `xhigh`/`max` only where there is a clear quality gain; at those levels it tends to start extra review/hardening rounds and launch reviewer sub-agents. For agentic coding via the API: `max_tokens` 128000 and streaming.
- **Haiku 5.5:** start at `medium` for most work including agentic coding. `low` for chat, short tool tasks and simple high-volume requests (risk: skips a search, stops early, skips a check in long agent prompts). `high` for knowledge work, longer agent tasks, strict instruction following. `xhigh`/`max` rarely make sense — compare with Sonnet 5.5 instead.
- **Fable 5.1:** start at `high` (default). Step up to `xhigh`/`max` for the most capability-sensitive agentic and coding work; step down to `medium`/`low` for routine or latency-sensitive work. At `low` it searches less often. At `xhigh`/`max` it may draft long deliverables in its thinking and then write them again, so prefer `high` for single long deliverables.

## How the prompt should change with effort

- **low:** Be explicit and complete; the model won't fill gaps. Use a short checklist when the task has several parts. If the work must be verified (tests, build), say so explicitly — at low effort the model may report done without a real check. If the task needs multistep reasoning, one plain sentence such as "This task involves multistep reasoning; work through it carefully before answering." helps. Keep the prompt short; no long background.
- **medium:** State the goal, the scope, and what done looks like. Name the verification step for code changes. Mention the riskiest edge case if there is one. In long agentic tasks, models at low/medium are more likely to stop and check in; if the person wants it to run to completion, say so.
- **high:** Give the model room for judgment: context, goal, constraints and the finish line matter more than steps. Describe the outcome, not the procedure. Add scope guards if the person wants a narrow change, because the model will otherwise add tests, docs and small extras that fit repo conventions.
- **xhigh / max:** Spend words on boundaries and stopping conditions: what is in scope, what must not be touched, when to stop and report, and that extra review rounds or reviewer sub-agents are not wanted unless asked. For long autonomous runs, define the completion condition and which actions still need confirmation (destructive or irreversible ones). For a single long deliverable, consider recommending `high` instead.
