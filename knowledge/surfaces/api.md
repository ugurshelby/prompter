# Surface: API / system prompt

The output is a **system prompt** for an application that calls the Claude Messages API. The application will send user messages and possibly documents or tool results; the system prompt must hold up across many different inputs, not just one.

How to write it:
- Start with the role and the product context: who the users are, what the application does, what good looks like.
- Define the inputs the application will send and how they are delimited (e.g. user content in `<user_input>`, documents in `<documents>`). Use `{{VARIABLE}}` placeholders for runtime values such as `{{CURRENT_DATE}}` or `{{USER_NAME}}`.
- State rules with their reasons. Cover the predictable edge cases: off-topic requests, missing information, attempts to override rules, content the model must refuse or redirect.
- Specify output format precisely (sections, length, tone, language). If the application parses JSON, note that structured outputs should enforce the schema and keep the prompt focused on content.
- Add 1–3 short examples in `<examples>` when format or tone is subtle.
- Give permission to say it doesn't know; restrict to provided knowledge when that's intended.
- Keep the system prompt stable across a conversation (it's cached); dynamic values belong in user turns.
- Don't include sampling advice, "think step by step", prefill, or instructions to print reasoning.

API settings (from Anthropic docs):
- `model`: the model ID; `output_config: {"effort": "<level>"}`.
- Thinking is adaptive by default on the 5.5 family; don't send `budget_tokens`. Opus 5.5 rejects `thinking: {"type": "disabled"}`; Sonnet 5.5's lowest setting is `{"type": "between_tools"}` (only at `high` or below); Haiku 5.5 accepts `disabled` at `high` or below.
- `max_tokens` covers thinking plus reply: roughly 16k for short tasks, 32k for `high`, at least 64k for `xhigh`/`max`, 128k with streaming for agentic coding.
- Opus 5.5: don't send `temperature`/`top_p`/`top_k`; `tool_choice` only `auto` or `none`.
