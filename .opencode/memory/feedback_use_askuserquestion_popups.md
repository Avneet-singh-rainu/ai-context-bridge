---
name: feedback-use-askuserquestion-popups
description: "Prefer the AskUserQuestion popup tool over plain chat-text questions/confirmations, since the user sometimes misses inline text messages"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 2fc83b20-653f-4b07-a296-f3c727adaf98
  modified: 2026-08-18T10:33:27.610Z
---

For confirmations and clarifying questions (e.g. "want me to do X, then Y?", picking between
approaches), default to the `AskUserQuestion` tool (popup) rather than just asking in plain
chat text.

**Why:** the user explicitly said they sometimes don't see plain chat-text questions and can
forget to answer them, so a question left as ordinary text risks silently stalling the
conversation.

**How to apply:** whenever a genuine yes/no confirmation or a choice between approaches is
needed (matching CLAUDE.md rule 1 - "ask, don't assume" - and the executing-actions-with-care
guidance on risky/hard-to-reverse actions), reach for `AskUserQuestion` instead of ending a
message with a plain question. Doesn't apply to purely informational updates/status text that
don't need a response, only to things that are actually blocking on the user's decision.

**Confirmed repeat miss #1 (2026-08-18, same session this was first saved in):** ended a message
with a plain-text question ("Want me to pull the invoice's original balance from dev...?")
immediately after saving this memory - the user had to call it out again ("i almost missed
this question").

**Confirmed repeat miss #2 (2026-08-18, same session, right after miss #1 was fixed):** ended a
message with "Want me to stage this file too?" as plain text - a trivial-seeming yes/no that
felt too small to bother with a popup for. The user's reaction: "how many time do i have to
tell you for the popup." **There is no "too trivial" exception** - a one-word yes/no like
"stage this file?" is exactly as easy to miss as a bigger decision, and this rule exists
specifically because the user misses/forgets plain-text questions regardless of how small they
are.

**Concrete self-check before sending ANY message (not optional, not judgment-based):** if the
message ends in a `?` and asks the user to decide/confirm/choose anything - no matter how minor
it seems ("stage this?", "commit now?", "want the log too?") - stop before sending and issue an
`AskUserQuestion` call instead. Never rate a question as "too small to need a popup." The only
exemption is genuinely rhetorical or non-blocking phrasing that isn't actually asking for a
decision (e.g. "Let me know if that changes anything" as a closing aside, not a real question).

**Confirmed repeat miss #3 (2026-08-18/19, same session, a new failure mode):** ended a message
with a plain-text question ("Want me to save this as a quick reference doc... or is this enough
to work from as-is?"). The conversation then branched into a side clarification (an unrelated
`AskUserQuestion` about recalibrating the grooming-questions request) before the original
question was ever answered - and it got silently dropped, never resurfaced as a popup, until the
user circled back two turns later to point it out again. **The gap:** the self-check only
guarded the newest outgoing message; it didn't track that an EARLIER plain-text question was
still dangling unanswered. Fix: before sending any message, also check whether a prior message
in the conversation asked a plain-text question that was never actually answered by the user -
if one exists, resurface and answer it via `AskUserQuestion` too (don't just let it get buried
by whatever comes next), even if the current turn is about something else entirely.
