# Teach cards: shape and rules (v2, 2026-10-13)

Owner direction: "clear teaching and understanding is the goal; drills bolt onto it". A teach card is the one piece of
teaching a learner gets for a technique before the drills. It must stand alone: a learner who has met the prerequisites
but not this technique should be able to read the card once and then attempt a micro item.

## Shape (Markdown, in `techniques[].teach`)

Six labelled sections, each its own paragraph, in this order. Labels are italic with a colon. Blank line between
sections. Formulas that the learner must use go in display math (`$$ … $$`) on their own line, never inline inside a
sentence. Length 90–160 words excluding math.

```
*When:* one or two sentences: the situation that calls for this technique, and how to recognise it.

*Why:* one to three sentences: the idea that makes the move work, or what goes wrong without it. Intuition, not proof.

*Move:*
$$ the formula or rule, displayed $$
Then the steps, as a short numbered list or two sentences: what to write first, what to compute, what to check.

*Example:* a concrete instance with numbers, worked to the answer. Display math for the computation.
$$ … = … $$

*Trap:* the usual wrong move and why it is wrong. One or two sentences.

*Check:* one sentence: a quick sanity test on the answer (units, limits, sign, size).
```

## Rules

- Every symbol used is named in the card or is standard for the pack's floor. Name the quantity on first use.
- The Example uses the same notation as the Move and reaches a number or closed form, never "and so on".
- Prose is short sentences. No "note that", no "it is easy to see". No nested parentheses.
- KaTeX core fonts only (`\mathbb`, `\mathcal`, `\mathbf` fine; no `\mathfrak`, `\mathscr`, `\mathtt`, `\mathsf`,
  `\boldsymbol`). Markdown lists and bold are allowed; headings are not (the card title is the technique name).
- No item-specific content: the Example must not duplicate a drill item's numbers.
- Data-science cards: SQL or pandas in a fenced code block; the Example shows the input table and the result.
- Physics cards: give the constant values the Move needs; state the sign convention.

## Rendering

`engine/app.js` shows the card under the technique name. `engine/app.css` `.teach` gives each paragraph spacing and
sets the italic labels; display math is centred by KaTeX. Cards are validated at build (LaTeX, fonts) like items.

## Review

Each rewritten card is checked by a separate reviewer for: factual errors, missing section, undefined symbol, Example
that does not reach an answer, length, and whether a cold reader could attempt a micro item after it.
