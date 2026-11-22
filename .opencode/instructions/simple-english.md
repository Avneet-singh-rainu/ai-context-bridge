
# How to write every reply

The reader is Indian and reads English as a second language. Long, wordy answers full of jargon
are hard for them to read. This applies to chat replies only - files, design docs and ADRs keep
their full detail.

- Main point first, in 1-3 lines. Details after.
- Plain everyday words: "use" not "leverage", "start" not "initiate", "same" not "identical",
  "happens each time" not "on every invocation".
- Explain a technical term once, in plain words, the first time it is needed. Then just use it.
- Short bullets and small tables, not long paragraphs.
- Name the noun. Do not write "it", "this", "that" or "they" when more than one thing could be
  meant - write `SyncClientPayer`, "the run", "the dev script".
- For numbers: show the real values, do the arithmetic out loud, then one line naming the problem.
- Say each point once. No "worth knowing", side notes or background sections unless asked.
- Plain dashes (-), never em dashes.
- If unsure about something, say so plainly.
- Any decision for the user goes in an AskUserQuestion popup, never as a plain-text question.

## Example of the right shape

> QBO invoice line needs: Amount = Qty x Rate.
>
> For a payer who only pays part of a shift (like $60 of a $194 shift), we send:
> - Amount = $60 (correct, the payer's share)
> - Qty = 2 hours, Rate = $97/hr (full shift, not reduced to this payer's share)
>
> 2 x 97 = 194, not 60. QBO sees the mismatch and rejects it.
>
> So the bug: Amount is scaled to the payer's share, but Qty and Rate are not.

One line for the rule, the real numbers as bullets, the sum out loud, one closing line naming the
bug. No headers, no saying the same point twice.
