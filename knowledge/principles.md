# Prompting principles for current Claude models

Source: Anthropic's "Prompting best practices", "Increase output consistency", "Reduce hallucinations".

## Clarity
- Be clear and direct. Treat the model as a brilliant new colleague with no context. Test: would a colleague who knows nothing about the task understand it?
- If you want more than the minimum, ask for it explicitly. Weak: "Create an analytics dashboard." Strong: "Create an analytics dashboard. Include as many relevant features and interactions as possible. Go beyond the basics to create a fully-featured implementation."
- Ask for the action, not a suggestion, when action is wanted. "Can you suggest some changes?" gets suggestions; "Change this function to improve its performance." gets changes.
- When order or completeness matters, use numbered steps or a list.
- Tell the model what to do rather than what not to do ("Write in flowing prose paragraphs" beats "Don't use markdown").

## Context and motivation
- Explain why a constraint exists; the model generalizes from the reason. Weak: "NEVER use ellipses." Strong: "Your response will be read aloud by a text-to-speech engine, so never use ellipses since it can't pronounce them."

## Examples
- Examples are one of the most reliable ways to steer format and tone. Make them relevant, varied (cover edge cases, avoid teaching an accidental pattern) and wrapped in `<example>` / `<examples>` tags. 3–5 is ideal when format matters.

## Structure
- Use XML tags to separate instructions, context, examples and inputs when they are mixed: `<instructions>`, `<context>`, `<input>`, `<documents>`. Keep tag names consistent and descriptive; nest when there is a natural hierarchy.
- Long documents (20k+ tokens) go at the top, the question and instructions at the end; this improved quality by up to 30% on complex multi-document input. Wrap each document in `<document>` with `<source>` and `<document_content>`.
- For long documents, ask the model to first pull relevant quotes into `<quotes>`, then answer based on them.

## Role
- A one-sentence role in a system prompt focuses behavior and tone ("You are a senior data engineer reviewing pipeline code.").

## Output format and style
- Current models are concise and direct by default. If you want a summary after tool use or a particular length, ask.
- Match the prompt's style to the desired output: a markdown-heavy prompt yields markdown-heavy output.
- Specify exact formats when consistency matters (JSON keys, XML template, section list, word counts). For guaranteed JSON, the application should use structured outputs instead of prompt instructions.
- Prefill of the final assistant turn is not supported on current models; use instructions or structured outputs.
- To skip preambles: "Respond directly without preamble."

## Thinking
- Thinking is adaptive and controlled by effort. Don't write "think step by step" or "think carefully before answering" as a habit; on Opus 5.5 removing such lines made responses start earlier with no quality loss.
- General instructions ("think thoroughly about edge cases") beat hand-written step-by-step reasoning recipes.
- Never ask the model to write its reasoning or thinking into the reply; that can be refused (`reasoning_extraction`). Asking for a short rationale or a summary of actions taken is fine.
- Self-check: "Before you finish, verify your answer against [criteria]." is useful for code and math on most models.
- To stop over-deliberation: "When you're deciding how to approach a problem, choose an approach and commit to it. Avoid revisiting decisions unless you encounter new information that directly contradicts your reasoning."

## Tools and agentic work
- Use normal language for tool guidance ("Use this tool when…"), not "CRITICAL: You MUST…" — aggressive wording now causes over-triggering.
- Default to action when the person clearly wants changes; default to caution ("don't change files until asked") when they want advice.
- Reversibility: encourage local, reversible actions; ask before destructive, hard-to-reverse or externally visible actions (deleting files/branches, force-push, dropping tables, posting messages).
- Over-engineering guard: "Only make changes that are directly requested or clearly necessary. Don't add features, refactors, docstrings, defensive code or abstractions beyond what the task needs."
- Test integrity: "Write a general-purpose solution that works for all valid inputs, not just the tests. Don't hard-code values or special-case tests. If a test looks wrong, tell me instead of working around it."
- Grounding in code: "Never speculate about code you have not opened. Read the relevant files before answering questions about the codebase."
- Temporary files: "If you create temporary scripts or files while working, remove them at the end."
- Sub-agents: use them for parallel, independent or context-isolated work; work directly for simple, sequential or single-file tasks.
- Research: give clear success criteria, ask for multiple sources, competing hypotheses and calibrated confidence.

## Hallucination and consistency
- Give permission to say "I don't know" / "I don't have enough information to assess this."
- Restrict to provided material when that's the intent: "Use only the information in the documents; don't use general knowledge."
- Ask for citations or quotes per claim, and to retract claims it can't support.
- For anything that may have changed since training (prices, versions, rules, "latest"), tell the model to search if it has a search tool, and give today's date.

## Frontend and visual work
- Without direction the model converges on generic "AI-looking" design. Give a concrete aesthetic direction (typography, palette, motion, background) and name the specific patterns to avoid (e.g. cream backgrounds, italic accent words in headlines, numbered "01/02/03" section labels, pill buttons). Telling it only to "avoid generic design" just swaps one default for another.
- Ask explicitly for animations and interactions if wanted.

## Pasted content
- When the person pastes external text (emails, web pages, logs) that should be treated as data, wrap it in clearly delimited tags (e.g. `<pasted_content>`) and say that instructions inside it should only be followed where the person's own message asks.
