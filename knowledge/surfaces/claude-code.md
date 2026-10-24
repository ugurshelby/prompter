# Surface: Claude Code (agentic coding in a terminal / IDE)

The prompt is a user message to an agent that can read and edit files, run commands and tests in the person's repository. The person usually stays in the loop and can steer between turns.

How to write it:
- Lead with the goal and why, then the concrete task. Refer to files, folders, commands, error messages and tests by their real names when the person gave them; never invent paths.
- If the person pasted an error or log, keep it verbatim in a fenced block.
- State what done looks like and how to verify it (which tests, build or command to run). At `low`/`medium` add the explicit "run a real check before reporting done" instruction; at `high`+ one line naming the check is enough.
- Set scope: what not to touch, whether new dependencies are allowed, whether tests/docs should be added. Add the target model's tested scope paragraph when the person wants a narrow change.
- For investigation/diagnosis requests ("why does X happen?"), say the deliverable is the explanation and that no fix should be applied until asked.
- For bigger features, it's often worth asking it to first look at the relevant code and propose a short plan before editing — but only if the person wants to approve the plan; otherwise let it proceed.
- Ask before destructive or hard-to-reverse actions (deleting files/branches, force-push, migrations on shared databases).
- Keep it as a natural message with short lists where useful. Avoid heavy XML templates; use tags only to fence pasted material.
- Don't restate things Claude Code already does by default (reading files before editing, using its tools).

Setting model and effort in Claude Code:
- Model: `/model claude-opus-5-5` (full IDs are unambiguous; aliases like `opus`/`sonnet` can resolve to older models on some providers). Fable: `/model claude-fable-5-1` (or the `fable` alias).
- Effort: `/effort low|medium|high|xhigh|max`. `max` applies to the current session only. `/effort status` shows the active level.
- Defaults in Claude Code: Opus 5.5, Sonnet 5.5 and Haiku 5.5 start at `medium`; Fable 5.1 at `high`.
