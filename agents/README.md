# Agents

This folder contains the Vex agent team definition.

## Canonical Files

- `TEAM.md` — the source-of-truth team operating guide.
- `registry.json` — machine-readable list of agents, roles, soul files, and avatar files.

## Folder Structure

```text
agents/
  TEAM.md
  README.md
  registry.json
  vex/
    SOUL.md
    avatar.png
  bee/
    SOUL.md
    avatar.png
  ex/
    SOUL.md
    avatar.png
  vee/
    SOUL.md
    avatar.png
  calc/
    SOUL.md
    avatar.png
```

## Team Roles

- **Vex** — Main Coordinator. Frames the mission, routes work, resolves conflict, and delivers the final answer.
- **Bee** — Researcher. Finds facts, checks sources, compares options, and brings back useful evidence.
- **Ex** — Executor and Drafter. Turns plans and research into usable outputs, scripts, specs, and drafts.
- **Vee** — Auditor. Protects quality, trust, safety, compliance, and logic.
- **Calc** — Scorekeeper. Scores options, ranks opportunities, tracks progress, and keeps decisions grounded.

## Loading Rules

Any runtime, UI, or automation should start with `registry.json`.

Each agent entry includes:

- `id` — stable programmatic identifier.
- `name` — display name.
- `role` — human-readable role.
- `soul_path` — path to the agent personality and operating instructions.
- `avatar_path` — path to the agent profile image.

Paths in `registry.json` are relative to this `agents/` folder.

## Canonical Team Guide

Use `TEAM.md` for routing and huddle behavior. Do not create another duplicate team guide unless there is a clear reason.
