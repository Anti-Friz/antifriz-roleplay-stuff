---
description: 'Foundry VTT V13 API guardrails — auto-loaded for module code that touches Foundry hooks, documents, applications, FilePicker/ImagePopout, canvas, sockets, or UI APIs. Routes the agent to foundry-v13-* skills and the shared FFG/FOUNDRY/foundryAPI reference.'
applyTo: 'src/**,module.json,DOCS/foundryAPI/**'
---

# Foundry V13 API Guardrails (auto-loaded)

These rules apply when editing Foundry API integration in the AntiFriz roleplay module.

## Source Of Truth

Use the FFG workspace API snapshot as the primary Foundry V13 reference:

- `c:\Users\Yaroslav\source\repos\Test_AI_thigs\MDs\RPG_RULES\FFG\FOUNDRY\foundryAPI\AGENT_INDEX.md`
- `c:\Users\Yaroslav\source\repos\Test_AI_thigs\MDs\RPG_RULES\FFG\FOUNDRY\foundryAPI\api.md`

The local `DOCS/foundryAPI` folder can be useful for nearby context, but the FFG `FOUNDRY/foundryAPI` snapshot is the shared source of truth.

## Discovery — load the skill BEFORE API work

| If the task involves... | Load skill |
|---|---|
| Broad Foundry API lookup, namespaces, signatures, public/private status, version-sensitive API choices | `foundry-v13-api-lookup` |
| Documents, DataModels, TypeDataModels, schema fields, embedded docs, flags, UUIDs, compendiums | `foundry-v13-documents-datamodels` |
| Hook names/signatures, init/setup/ready, render hooks, AppV2 header hooks, document hooks, canvas hooks | `foundry-v13-hooks` |
| ApplicationV2, DocumentSheetV2, DialogV2, FilePicker, ImagePopout, TextEditor, ContextMenu, Foundry UI | `foundry-v13-applications-ui` |

If the task touches TRL/Svelte application structure, also load the appropriate `trl-*` skill.

## Non-negotiable Invariants

1. Check the exact local V13 API page before using a version-sensitive API.
2. Respect public/protected/private/internal API status from `api.md` and the symbol page.
3. Treat underscored members as unsafe until the docs prove they are a protected override point.
4. Do not mix AppV1 and AppV2 hook signatures from memory.
5. Preserve existing module patterns for TRL apps, TJSDocument state, hooks, settings, flags, and namespaced V13 APIs.
