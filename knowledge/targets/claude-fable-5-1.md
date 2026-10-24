# Writing for Claude Fable 5.1

Strengths: the most capable model; demanding reasoning and long-horizon agentic work; runs very long tasks without much methodology guidance when the goal is clear. Default effort `high`; thinking always on. Describe the outcome, not the steps — let it plan the path.

## Behaviors and the tested fixes

- **Fewer progress updates** during long tool chains (more so at high effort). For human-in-the-loop work:
  "Before you start, say in a line what you're about to do; brief updates while you work help the user follow along. Close with a short recap that stands on its own — what you found, what you did, and what's next — so a reader who only sees the last message has the full picture."
  Remove lines like "hold all findings for the final response" and "keep it short" first.
- **Ends the turn before the work is done** on long asynchronous work ("Next, I'll…", "Shall I apply this?"). For autonomous runs:
  "You are operating autonomously. The user is not watching in real time and cannot answer questions mid-task, so asking 'Want me to…?' or 'Shall I…?' will block the work. For reversible actions that follow from the original request, proceed without asking. Stop only for destructive actions or genuine scope changes the user must decide. Offering follow-ups after the task is done is fine; asking permission before doing the work is not."
  Not for pair programming where the person wants to steer.
- **Scope as deliverable:** "The user's request — or the plan they approved — sets the scope, and the scope is the deliverable: don't quietly narrow, widen, or swap it. Make routine judgment calls yourself, and check in only when different readings would lead to materially different work. If one part turns out to be blocked, complete every other part in full and say exactly what you left out and why."
- **Extras beyond the task** (fixing nearby code, extending behavior, extra committed tests):
  "If, while working or testing, you find a pre-existing bug, a performance concern, or behavior the task doesn't mention, don't fix, optimize or extend it in this change unless the requested behavior cannot work without it; report it as a follow-up in your summary. Commit tests only where the task asks for them or this repository already keeps tests for this kind of change. This is about extras only: implement every behavior the task asks for, completely."
- **Rewrites whole files for small edits:** "The number of tokens used to edit files is best minimized, all else being equal. Therefore, when it will not affect the end result, try to surgically edit a file rather than rewrite the entire thing."
- **Dense prose:** "Please remove all mannered prose." (Mannered prose = metaphor and flourish instead of direct statement.)
- **Less formatting in chat:** it already uses fewer bullets and less bold. Remove anti-markdown rules; if structure is needed, say when lists are appropriate.
- **Searches less at `low`:** tell it that recognizing a name is not knowing its current state, especially in fast-moving areas, and to search the name as written.
- **Long deliverables at `xhigh`/`max`** may be drafted in thinking and then written again. Prefer `high`; if using `xhigh`/`max`, tell it reasoning plus reply share one output limit and not to compose the whole deliverable twice.
- **Safeguard false positives:** ask "Are there any bugs in this program?" instead of "Does this compile without errors?"; give context for lesser-known languages.
