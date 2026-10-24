# Target models (Claude, current lineup, October 2026)

All four have a 1M-token context window, 128K max output, adaptive thinking, vision, tool use, and support all five effort levels: `low`, `medium`, `high`, `xhigh`, `max`. Knowledge cutoff: June 2026.

| Model | ID | Positioning | Latency | Price (input / output per MTok) | Default effort (API) | Default effort (Claude Code) |
|---|---|---|---|---|---|---|
| Claude Fable 5.1 | `claude-fable-5-1` | Most capable. Demanding reasoning and long-horizon agentic work; tasks larger than a single sitting. Investigates before acting, verifies more often, sustains long autonomous sessions. | Slower | $10 / $50 | `high` | `high` |
| Claude Opus 5.5 | `claude-opus-5-5` | Recommended starting point for most serious work. Long-running agentic coding and knowledge work, code review, financial/analytical work, dense visual inputs, computer use. Thinking is always on. | Moderate | $4 / $20 | `medium` | `medium` |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | Best combination of speed and intelligence. Day-to-day engineering with a clear scope, agentic and latency-sensitive workloads, chat. | Fast | $2 / $10 | `high` | `medium` |
| Claude Haiku 5.5 | `claude-haiku-5-5` | Fastest and cheapest. High-volume, latency-sensitive work: classification, extraction, routing, short tool tasks, simple chat, sub-agents. | Fastest | from $0.10 / $0.50 | `medium` | `medium` |

## Choosing a model

Choose the cheapest model and effort combination that will reliably do the job well. Latency and cost usually improve more from picking the right model than from prompt tricks.

- **Opus 5.5** is the default answer for anything that needs real judgment: multi-file or multi-step coding in a real repo, debugging an unclear failure, architecture and design, careful analysis of long documents, writing that must be right. At `medium` it matches or beats the previous generation's Opus at `high` on coding and knowledge work, with fewer tokens.
- **Sonnet 5.5** when the task is well specified and bounded: implement a clearly described feature, a focused fix where the cause is known, refactors with a clear target, everyday questions, drafting and editing, quick data work. Also when speed matters more than the last bit of quality.
- **Haiku 5.5** for simple, mechanical or high-volume work: rename/format/convert, short factual answers, classification, extraction with a clear schema, small scripts, quick lookups. In long agent prompts at `low` it may skip a search, stop early or skip a check; if the task is long or instruction-heavy, prefer Sonnet.
- **Fable 5.1** only when the task is genuinely frontier-hard or very long-horizon: multi-hour autonomous engineering, deep research with many sources, hard proofs or algorithms, security audits of large codebases, or when Opus 5.5 at high effort is likely to fall short. It is 2.5× Opus's price, so don't recommend it for ordinary work. At `low`, Fable 5.1 can be cost-competitive with Opus/Sonnet at higher effort while scoring higher — worth mentioning as an alternative for hard but short tasks.

Signals that push up (bigger model or higher effort): ambiguity the model must resolve on its own, many interacting parts, unfamiliar or large codebase, correctness that is hard to verify, long unattended runs, security or money at stake, subtle reasoning (math, concurrency, legal nuance).

Signals that push down: the person will review each step and steer, the change is small or mechanical, the answer is short, speed matters, the task will run many times.
