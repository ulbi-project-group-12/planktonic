# Architecture Decision Records

An ADR is a short record of one architectural decision: the context, what we chose, what we rejected and why, and the consequences. ADRs go through a normal PR; a mismatch between the code and an accepted ADR is a bug in one of the two.

## Numbering

- File name: `NNNN-kebab-case-title.md`, a four-digit number and an English slug (`0003-data-model.md`).
- Numbers are never reused. A number is taken when the ticket that will write the ADR is created, so ADRs may be merged out of order.
- An accepted ADR is not rewritten. To change a decision, write a new ADR and set the old one to `Superseded by ADR-NNNN`.
- Status: `Proposed` → `Accepted` (the lead accepts it, in the PR or in its ticket) → `Superseded by ADR-NNNN` or `Deprecated`.
- Prose may be in Russian, like the tracker docs; identifiers, table and column names stay in English.

## Index

| ADR                               | Title                             | Status   | Ticket |
| --------------------------------- | --------------------------------- | -------- | ------ |
| [0001](0001-realtime-protocol.md) | Realtime protocol                 | Accepted | UL-134 |
| [0002](0002-permission-model.md)  | Permission model                  | Accepted | UL-136 |
| [0003](0003-data-model.md)        | Data model                        | Accepted | UL-212 |
| 0004                              | Observability (Alloy / GlitchTip) | Planned  | UL-167 |

> UL-167 and UL-170 used to call the observability ADR "ADR-0003". That number belongs to the data model (UL-212, created first), so observability is ADR-0004.

## Template

```markdown
# ADR-NNNN: <title>

- **Status:** Proposed
- **Date:** YYYY-MM-DD
- **Participants:** <who decided>
- **Ticket:** UL-n

## Context

Why the decision is needed now; links to STACK sections, tickets and meetings.

## Decision

What we chose. One subsection or table row per decision, each with a one-line reason.

## Consequences

What becomes easier or harder; what other tickets must now do.

## Rejected options

Each option with the reason it was rejected, so the question is answered by a link instead of a new debate.

## Deferred / open questions

What is not decided yet, why, and which ticket revisits it.
```
