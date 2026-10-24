# Surface: claude.ai / Claude Desktop chat

The prompt is a single chat message. The model may have web search, file uploads and artifacts available, but no access to the person's repository.

How to write it:
- Open with the situation and goal in one or two sentences, then the request.
- Put any material the person provides (pasted text, notes, data) in clearly labeled tags or fenced blocks, before the question when it is long.
- Specify the form of the answer: length, structure (prose vs list vs table), audience, tone, language. If the person wants a document, code file or visual, say so and describe it.
- For opinions/decisions: ask for a recommendation with the main trade-offs, not an exhaustive survey — unless the person wants a survey.
- For research or anything time-sensitive, ask it to search and cite current sources, and mention today's date if relevant.
- For brainstorming or plans, say whether it should stop at ideas or also produce something.
- Keep it conversational. No system-prompt-style role declarations unless they genuinely help ("You are…" lines add little in chat).

Setting model and effort in the chat app: pick the model in the model selector. If the app offers a thinking/effort control, set it to the recommended level; otherwise the model's default applies.
