---
name: feedback-short-simple-explanations
description: "Keep answers short and in simple English - no long explanations, no jargon"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 753c2b8d-aa6f-4175-94f5-6b527a750de6
  modified: 2026-09-29T08:17:05.397Z
---

Keep every answer short and simple. Use plain, everyday English words. Do not write long
explanations, and do not use jargon or fancy vocabulary.

**Why:** The user is Indian and has said his English vocabulary is not strong. Long, wordy answers
full of technical jargon are hard for him to read and slow him down. He needs to read an answer once
and understand it.

**How to apply:**

- Short answers. A few lines, not a page. Say the main point first.
- Simple words. "use" not "leverage", "start" not "initiate", "same" not "identical",
  "happens each time" not "on every invocation".
- Explain a technical term the first time it is needed, in a few plain words. Then keep using it.
- Tables and short bullet lists are good. Long paragraphs are not.
- Do not repeat the same point in different words.
- Do not add extra background, side notes, or "worth knowing" sections unless asked.
- Detail is still fine in files and docs. This rule is about chat answers.

**Confirmed-good example** (user explicitly said "always try to explain things in short like you
did here", 2026-09-29, re a QBO invoice line rejection bug):

> QBO invoice line needs: Amount = Qty Ã— Rate.
>
> For a payer who only pays part of a shift (like $60 of a $194 shift), we send:
> - Amount = $60 (correct, the payer's share)
> - Qty = 2 hours, Rate = $97/hr (full shift, not reduced to this payer's share)
>
> 2 Ã— 97 = 194, not 60. QBO sees the mismatch and rejects it.
>
> So the bug: Amount is scaled to the payer's share, but Qty and Rate are not.

Pattern to copy: state the rule/expectation in one line, show the actual numbers plugged in as a
short bullet list, do the arithmetic out loud, then one closing line naming the bug in plain words.
No headers, no restating the same point twice.

Related: [[feedback_use_askuserquestion_popups]], [[feedback_understand_ticket_first]].
