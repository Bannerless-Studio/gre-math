# Teach cards: shape and rules (v3, 2026-10-13)

Owner direction: "clear teaching and understanding is the goal; drills bolt onto it". A teach card is the one piece of
teaching a learner gets for a technique before the drills. It must stand alone: a learner who has met the prerequisites
but not this technique should be able to read the card once and then attempt a micro item.

## Shape (Markdown, in `techniques[].teach`)

Two unlabelled teaching paragraphs, then three labelled key points. Blank line between paragraphs. Formulas the
learner must use go in display math (`$$ … $$`) on their own line, never inline inside a sentence. Length 90–170
words excluding math. (v3, owner 2026-10-13: the labelled When/Why/How of v2 read like a form; the owner wants the
situation and the move told as one natural passage, the intuition as a second, and the key points kept.)

```
When you <situation that calls for the technique, and how to recognise it>, <the move: what to write first, what
to compute, what to check>. Two to four sentences, whole and natural, as a tutor would say it.
$$ the formula or rule, displayed $$

The core intuition here is <the idea that makes the move work, or what goes wrong without it>. One to three
sentences. Intuition, not proof.

*Example:* a concrete instance with numbers, worked to the answer. Display math for the computation.
$$ … = … $$

*Trap:* the usual wrong move and why it is wrong. One or two sentences.

*Check:* one sentence: a quick sanity test on the answer (units, limits, sign, size).
```

Reference card (owner's sample, physics "Significant figures and error propagation"): "When you combine measured
numbers and must decide how many digits the answer deserves, or how large its uncertainty is, keep the fewest
significant figures for a product or quotient. [rest of the move] / The core intuition here is: a result cannot be
more precise than its least precise input. Extra digits claim precision the data never had. / *Example:* … *Trap:* …
*Check:* …". The first paragraph need not start with the literal words "When you"; vary the opening naturally.

## Rules

- Every symbol used is named in the card or is standard for the pack's floor. Name the quantity on first use.
- The Example uses the same notation as the move paragraph and reaches a number or closed form, never "and so on".
  It does not repeat the Check.
- Prose is short sentences. No "note that", no "it is easy to see". No nested parentheses. No labels other than the
  three key points; no headings (the card title is the technique name).
- KaTeX core fonts only (`\mathbb`, `\mathcal`, `\mathbf` fine; no `\mathfrak`, `\mathscr`, `\mathtt`, `\mathsf`,
  `\boldsymbol`). Markdown lists and bold are allowed.
- No item-specific content: the Example must not duplicate a drill item's numbers.
- Data-science cards: SQL or pandas in a fenced code block; the Example shows the input table and the result.
- Physics cards: give the constant values the move needs; state the sign convention.

## Rendering

`engine/app.js` shows the card under the technique name. `engine/app.css` `.teach` gives each paragraph spacing and
sets the italic labels; display math is centred by KaTeX. Cards are validated at build (LaTeX, fonts) like items.

## Review

Each rewritten card is checked by a separate reviewer for: factual errors, missing key point, undefined symbol,
Example that does not reach an answer, length, and whether a cold reader could attempt a micro item after it.
