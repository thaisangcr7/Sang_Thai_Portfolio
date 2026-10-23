# Project tree format (for sangthai.dev zoomable architecture explorer)

Each project = ONE JSON file. The site shows the root's branches as a big tree
("overview"), then the visitor taps a branch to zoom in and see its children,
and can tap a child that has children to zoom one more level.

```json
{
  "id": "avenotes",
  "name": "Avenotes",
  "tagline": "≤70 chars, what the whole system is",
  "children": [ BRANCH, BRANCH, ... ],          // 6-10 branches
  "links": [                                    // how branches connect (overview arrows), 6-14 of them
    { "from": "branch-id", "to": "branch-id", "label": "≤24 chars, e.g. 'audio stream'" }
  ]
}
```

Every node (branch, child, grandchild) looks like:

```json
{
  "id": "kebab-case-unique-in-file",
  "title": "≤32 chars",
  "kind": "input | process | ai | agent | store | output | test | security | tool | infra | ui",
  "status": "live | coming | proposal",          // omit = live. "coming" ONLY if a roadmap/ADR/issue/TODO/doc in the repo says it's planned or in progress
  "summary": "≤150 chars, plain casual English: what it does and why",
  "detail": "optional ≤320 chars: how it works, key numbers, design choice",
  "tech": ["FastAPI", "pgvector"],              // ≤6, real names from the code
  "flags": ["ai","agent","test","security","tool"],  // any that apply. ai = uses an LLM/ML model. agent = an LLM that chooses actions/tools in a loop. tool = MCP/tool-calling/dev tooling. test = tests/evals/CI checks. security = auth, isolation, secrets, threat model
  "metric": "optional short number, e.g. '959 backend tests'",
  "flow": true,                                  // optional: children are ordered steps (draws arrows between them)
  "source": "repo-relative path(s) that prove this node, e.g. backend/app/services/answer.py; docs/adr/0011.md",
  "children": [ ... ]                            // 0-8 children; grandchildren 0-6
}
```

Size target: 45-110 nodes total. Deep is good: the owner said the old diagrams were
"too simple versus what I designed". Show every real function and how it connects.

Branches should cover, where they exist: inputs (all of them, not just one), processing
/pipelines, AI architecture (models, prompts, routing, grounding, tuning/answer-shaping,
evals), agents/tool use, storage, outputs/UX features, testing, security, infra/deploy/ops,
dev tooling (e.g. Claude Code with CLAUDE.md/AGENTS.md rules, CI), and roadmap items marked
"coming".

HARD RULES
- Every claim must be backed by a file in the repo (or the facts brief you were given). Put
  the path in "source". No guessing. If unsure, leave it out.
- Public website: no secrets, keys, internal URLs/IPs, emails, people's names, user counts,
  revenue, prices.
- Never use the word "solo".
- Don't call keyword search "RAG" or "embeddings" if it isn't vector search. Don't call
  something an "agent" unless an LLM actually picks tools/actions in a loop.
- Plain casual English, no hype words ("revolutionary", "seamless", "cutting-edge").
- Output valid JSON only (no comments) to the path you were given. Validate it with
  `python3 -c "import json;json.load(open(PATH))"` before finishing.
- Keep it public-safe; ATLAS stays at public-talk level (no internal names, systems, people or figures).
  were unsure about and left out.
