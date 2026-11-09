---
name: agent-desktop
description: Controle e automação do computador/desktop para testes, inspeções de janelas, formulários e validações sem roubar o cursor do usuário (headless semantic accessibility via UI Automation / UIA).
requirements:
  - agent-desktop
---

# Agent Desktop — Automação Semântica e Condução do Computador Sem Roubar o Cursor

O **agent-desktop** (da Vercel Labs) é uma ferramenta para agentes de IA operarem e inspecionarem aplicações desktop (Windows, macOS e Linux) diretamente através da **Árvore de Acessibilidade do Sistema Operacional (UI Automation / UIA)**.

Em vez de capturar screenshots cegos ou mover fisicamente o cursor do mouse e roubar o foco da janela do usuário, o `agent-desktop` opera por **ações semânticas headless por padrão**, permitindo que o agente inspecione o estado da interface, clique em botões, preencha formulários, verifique alertas e execute testes em segundo plano sem perturbar o trabalho do usuário.

> **Regra Mandatória no Windows (PowerShell):**
> 1. Use sempre `agent-desktop.cmd` no Windows para evitar bloqueios de ExecutionPolicy de scripts `.ps1`.
> 2. Sempre envolva as referências (`@ref`) em aspas simples no PowerShell: `'@s8f3k2p9:e1'`. O caractere `@` solto é o operador de splatting do PowerShell e descarta o argumento se não estiver entre aspas.
> 3. **Modo Semântico Headless (Padrão):** Opera elementos sem mover o ponteiro do mouse nem roubar o foco do usuário. Use `set-value` para inserir texto sem síntese física de teclado. Só use `--headed` se explicitamente autorizado pelo operador para ações físicas de ponteiro.

---

## 1. O Loop Observe -> Act -> Verify

O agente segue estritamente o ciclo de três fases:
1. **Observe (Snapshot):** Captura a estrutura da árvore da janela ou do app com identificadores qualificados de referência (`@ref`).
   ```powershell
   agent-desktop.cmd snapshot --app "msedge" -i --compact
   ```
   - `-i`: mantém apenas elementos interativos (botões, links, caixas de texto).
   - `--root '@ref'`: faz drill-down em uma subárvore específica.
   - `--skeleton`: mapa raso para aplicações complexas.

2. **Act (Ação Semântica):** Executa a ação desejada no elemento referenciado.
   ```powershell
   agent-desktop.cmd click '@s8f3k2p9:e5'
   agent-desktop.cmd set-value '@s8f3k2p9:e8' 'Texto de teste'
   ```

3. **Verify (Confirmação):** Re-inspeciona o elemento ou a região para confirmar que a ação produziu o efeito esperado.
   ```powershell
   agent-desktop.cmd get '@s8f3k2p9:e8' value
   agent-desktop.cmd is '@s8f3k2p9:e5' enabled
   ```

---

## 2. Comandos Principais no Windows

| Comando | Descrição | Comportamento Semântico Headless (Sem Roubar o Cursor) |
|---|---|---|
| `snapshot` | Captura a árvore UIA da aplicação em JSON estruturado com `@ref` | Não altera foco nem cursor. |
| `find` | Localiza elementos por nome, papel (`role`) ou texto | Leitura passiva. |
| `click` | Dispara ação de clique semântico (UIA Invoke/Toggle pattern) | **Não move o cursor do mouse.** |
| `set-value` | Define o valor de inputs/caixas de texto diretamente via acessibilidade | **Não rouba o foco do teclado.** |
| `clear` | Limpa o conteúdo de campos de texto | Semântico e atômico. |
| `get` | Lê propriedades (`text`, `value`, `role`, `bounds`) | Leitura passiva. |
| `is` | Verifica estado (`visible`, `enabled`, `focused`, `checked`) | Leitura passiva. |
| `toggle` / `check` / `uncheck` | Alterna checkboxes e switches de forma idempotente | Semântico. |
| `select` | Seleciona opções em dropdowns e selects | Semântico. |
| `scroll` / `scroll-to` | Rola elementos ou traz para a área visível | Semântico. |
| `wait` | Aguarda elementos (`--element`), janelas (`--window`) ou eventos | Substitui `sleep` por sincronização ativa. |
| `list-windows` / `list-apps` | Lista janelas e processos de interface ativos | Diagnóstico e descoberta de PID/Title. |
| `status` | Exibe a saúde do adaptador UIA e do sistema operacional | Diagnóstico inicial. |

---

## 3. Gestão de Referências (`@ref`) e Estabilidade

- Refs qualificados (`@snapshot_id:eN`, ex: `'@s8f3k2p9:e1'`) são válidos para o snapshot correspondente.
- Se o DOM ou a interface sofrer mutação (abrir modal, trocar página), o ref fica obsoleto (`STALE_REF`). Basta tirar um novo snapshot da região e usar o novo ref gerado.
- Elementos com mesmo nome/papel que não puderem ser diferenciados retornam `AMBIGUOUS_TARGET`. Nesses casos, capture com `--root` o contêiner específico (ex: a linha da tabela ou o modal) para isolar o elemento alvo.

---

## 4. Guia Específico de Plataforma (Windows)


# agent-desktop

agent-desktop is a CLI that reads and operates desktop apps through the OS accessibility tree. Every command prints one JSON envelope (`ok`, `data` or `error`). It is a tool, not an agent: the observe, act and verify loop runs in you.

## Shell syntax

Examples use a POSIX shell. In PowerShell, quote every ref (`'@s8f3k2p9:e1'`), because a bare `@token` is the splatting operator. Use `$env:NAME = 'value'` instead of `export`, and `| ConvertFrom-Json` instead of `$(...)` and `jq`. The Windows skill has the PowerShell forms.

## First run

1. Run `agent-desktop status`. It reports the platform, permissions and `supported_surfaces`.
2. Run `agent-desktop skills get platform`. It loads the skill for the OS the binary runs on (macOS, Windows or Linux).
3. For flags and syntax, run `agent-desktop <command> --help`. This skill does not repeat flag lists.

## The loop

Use `find` when you know the role or exact name. Otherwise map the app first and drill into one region.

```
agent-desktop snapshot --skeleton --app "Notes" -i --compact   # shallow map, children_count on cut branches
agent-desktop snapshot --root @s8f3k2p9:e3 -i --compact        # drill into one region
agent-desktop click @s8f3k2p9:e12                              # act on a qualified ref
agent-desktop snapshot --root @s8f3k2p9:e3 -i --compact        # verify: re-read the same region
```

- A small app needs no skeleton. Take a full `snapshot -i`.
- `-i` keeps interactive nodes only, so a row's static-text label is dropped. To tell which row a repeated button belongs to, drill that row's container with `--root` and leave out `-i`. On Windows and Linux that reads the row but does not make its button actionable: a button repeated in other rows is a twin in the window and its ref is refused (see Refs).
- A `--root` drill adds its refs to the same snapshot id. Refs outside the drilled subtree, and the drilled root itself, stay valid; refs that were already inside it are replaced, so an old ref there returns `STALE_REF`.
- Never skeleton a surface (`--surface menu`, `sheet`, `alert`). A surface is already focused.
- An action that opens a menu, sheet or alert lists it in `data.surfaces`. Target that overlay next.
- After an async step, use `wait` (see `commands-system.md`). A fixed sleep is a race.

## Refs

- Output refs are qualified: `@<snapshot_id>:e<N>`, for example `@s8f3k2p9:e1`. Pass them to later commands as they are.
- Refs are valid for one snapshot. After any UI change, re-drill the affected region or take a new snapshot.
- Only addressable elements get refs. Static text and inert containers do not.
- A command re-identifies the element before it acts. On macOS the ref carries the element's own address, so identical twins each keep their ref. On Windows and Linux a ref resolves only when it was the only element in the window its snapshot captured with its role, native id, name and description, counted even below a skeleton or depth cut, and exactly one live element still matches. Identical twins there have no ref path: only `--headed mouse-click --xy X,Y` can choose one, it takes the foreground, and a Linux Wayland session refuses it.
- `STALE_REF`: the element is gone or no longer matches. `details.kind` is `saved_ref_absent`, or `retained_object_stale` on macOS. Take a fresh snapshot and use the new ref.
- `AMBIGUOUS_TARGET`: an identical element appeared (`saved_ref_ambiguous`), or the ref was not proven unique at capture (`identity_not_unique`). Repeating the ref or re-snapshotting identical twins gives the same refusal; act on a control that is unique in the window. `identity_not_unique` also follows a snapshot that could not read the whole window in time: retake it with a larger `--timeout-ms`.
- `TIMEOUT` with `details.kind: resolution_identity_unknown`: a live read did not answer, so identity is unproven. Nothing was sent; retry.
- `SNAPSHOT_NOT_FOUND`: the snapshot id expired. Snapshot again.

## Delivery and retry

Action results carry `data.disposition` and errors carry `error.disposition`, each with `delivery` and `retry`. Observation commands such as `snapshot` have none on success; their errors, and every `INVALID_ARGS` refusal, carry `not_delivered` and `retry: safe`.

- Retry or substitute an action only when `disposition.retry` is `safe`. Only `not_delivered` is safe.
- Any other delivery value means the action may have landed. A repeat can click, type or submit twice, and `toggle` can undo itself.
- On a result that is not safe, read the live state (`get`, `is`, or a fresh snapshot) and decide from that. `details.post_state` helps when present.
- Branch on `error.code` and `error.disposition`. Message and suggestion text can change.
- `details.retryable: false` means waiting cannot change the outcome. Try a different approach.

## Headless and headed

Ref actions are headless by default. They use semantic accessibility calls and do not take focus, move the cursor, synthesize keys or use the clipboard. If no semantic path exists, the action fails closed. Use the global `--headed` flag only when the user explicitly permits physical input, such as double-click, hover, drag, or focus. Never switch to headed mode to recover from a headless failure. Raw coordinates (`--xy`) never imply focus. Which actions need `--headed` differs by OS: read the platform skill.

## References

Load one only when you need it: `agent-desktop skills get desktop <reference>`.

| Reference | Open it when |
|-----------|--------------|
| `commands-observation` | You need `snapshot`, `find`, `get`, `is`, `screenshot`, `list-surfaces` semantics, partial trees, or the `--root` rules |
| `commands-interaction` | You choose between click, type, set-value, select, toggle, scroll, press and mouse commands, or you debug an action error |
| `commands-system` | You launch or close apps, manage windows, use the clipboard, `wait`, `batch`, sessions, multi-agent cursors, tracing, or load skills |
| `workflows` | You want worked patterns (forms, menus, dialogs, waiting for a new window, scroll-find, drag) and the anti-patterns list |

---

# agent-desktop-windows

This file covers only what differs on Windows. The observe-act loop, refs, JSON
envelope, sessions and tracing are the same on every platform.

Requires Windows 10 1809+ / Windows Server 2019+ (x64 or ARM64). Run it in the
interactive desktop session of the signed-in user. Session 0 (services and
SYSTEM tasks), Server Core, the secure desktop (UAC prompts, the sign-in
screen), a locked desktop and another user's session are not supported:
observation, actions and capture there fail or return nothing.

## Capability Table

| Group | Commands | Status on Windows |
|-------|----------|-------------------|
| Observation | `snapshot`, `find`, `get`, `is`, `screenshot` | Works. Surfaces are `window`, `focused`, a Chromium modal as `sheet`, and an open application menu as `menu` |
| Surfaces | `list-surfaces` | Works. Lists `window`, `focused` and `sheet` per process, plus `menu` with `item_count` while a menu is open |
| Shell surfaces | `open-system-surface` | Works for `start-menu`, `taskbar`, `system-tray`, `system-tray-overflow` and `action-center`, and returns the window `snapshot --surface <kind>` reads. `quick-settings` returns `INVALID_ARGS` naming `action-center` |
| Ref interaction | `click`, `right-click`, `type`, `set-value`, `clear`, `select`, `toggle`, `check`, `uncheck`, `expand`, `collapse`, `scroll`, `scroll-to` | Works, semantic in headless and `--headed` mode. `right-click` and `type` need `--headed` and return `POLICY_DENIED` headless |
| Multi-click and focus | `double-click`, `triple-click`, `focus` | Works with global `--headed` only |
| Keyboard and mouse | `press`, `hover`, `drag`, `mouse-click`, `mouse-move`, `mouse-wheel` | Works. Cursor-moving input needs `--headed`. First Contact covers `press --app` |
| Held input | `key-down`, `key-up`, `mouse-down`, `mouse-up` | Fails closed on every platform with `ACTION_NOT_SUPPORTED`. A headless `mouse-down` or `mouse-up` returns `POLICY_DENIED` first |
| App and window | `launch`, `close-app`, `list-windows`, `list-apps`, `focus-window`, `resize-window`, `move-window`, `minimize`, `maximize`, `restore` | Works. First Contact covers the name `launch` takes |
| Displays | `list-displays` | Works |
| Clipboard | `clipboard-get`, `clipboard-set`, `clipboard-clear` | Works; typed text and image content |
| Wait | `wait` | Works for ms, `--element`, `--window`, `--text`, `--menu`, `--menu-closed`, `--event` and `--notification` |
| Notifications | `list-notifications`, `dismiss-notification`, `dismiss-all-notifications`, `notification-action` | Works over the Action Center. Pass `--headed` when the center is closed |
| Cursor overlay | `cursor-overlay` | Works. `enable` returns `data.rendered: true` only after the renderer acknowledges over its pipe. See `references/shell-and-overlay.md` |
| System | `status`, `permissions`, `version`, `batch`, `skills`, `session`, `trace` | Works |

## First Contact

- **Quote every ref in PowerShell.** PowerShell reads a bare `@token` as its
  splatting operator and deletes the argument before the binary sees it, so
  `set-value @s8f3k2p9:e1 hi` fails `INVALID_ARGS`. Write
  `set-value '@s8f3k2p9:e1' hi`. cmd.exe and bash need no quoting.
- **A window behind another window is drivable. A minimized one is not.**
  Every element of a minimized window reports `offscreen` and ref actions
  fail. Run `restore --app <image>` and snapshot again. Do not use
  `focus-window` by reflex: it steals the user's foreground.
- **No permission dialog exists.** `permissions` reports `automation` as
  `not_required`. Elevation boundaries are the only access control.
- **Chromium and Electron apps read thin before they settle.** Pass a longer
  `--timeout-ms` to `snapshot` instead of concluding the tree is empty.
- **Blocked shortcuts.** `alt+f4`, `win+l`, `win+d`, `alt+tab`, `win+r`,
  `win+x`, `win+e`, `ctrl+shift+esc` and their modifier supersets are refused
  without `--force`. In combos, `cmd` and `meta` are the Windows key, so
  `meta+c` is a shell shortcut. Write `ctrl+c` to copy.
- **`type` needs `--headed`.** It is keystroke synthesis through `SendInput`,
  so a strict-headless `type` returns `POLICY_DENIED`. Use `set-value`, or pass
  `--headed`. It ends `delivered_unverified` (`verification_scope:
  "unavailable"`) when the field exposes no readable Text selection, and can
  verify when one is readable: confirm with a fresh `get`.
- **`press --app` writes to the foreground queue** with no per-process
  targeting. A headless press to a non-frontmost app fails closed. A
  non-interactive caller (service, scheduled task, CI job) gets
  `delivered_unverified`.
- **`launch` takes an absolute path or a bare name** under System32 or the
  Windows directory, with or without `.exe` (`notepad` or `notepad.exe`), not
  a display name. Use `list-apps` to find a running app.
- **Notifications:** `list-notifications` with the Action Center closed needs
  `--headed`. Single-item `dismiss-notification` and `notification-action` need
  `--headed` and `--expected-app` or `--expected-title` for the entry at INDEX.
- **Surfaces:** an open or context menu is the `menu` surface. Windows does
  not advertise a `menubar` surface.
- **Commands that raise shell chrome take the foreground.** Strict headless
  refuses them with `POLICY_DENIED` before anything is raised.
- **Stateful actions run once, then verify by re-reading.** `delivered_verified`
  means the readback matched. `ACTION_FAILED` with
  `details.kind: "post_action_verification"` means the action landed but the
  readback differs: read `details.post_state` and do not retry. A `set-value`
  the app reformats reads as failed. See `references/troubleshooting.md`.
- **Unsigned binary warnings are expected.** See `references/troubleshooting.md`.

## What differs on Windows

- Ref actions are semantic UI Automation calls in headless and `--headed` mode, except `right-click`, `double-click`, `triple-click`, `type` and `focus`, which are physical or take focus and need `--headed`.
- A ref resolves only when it was the only element in the window its snapshot captured with its role, native id, name and description, and exactly one live element still matches. Uniqueness counts the whole window, not the shallow tree a `--skeleton` or `--max-depth` snapshot presents, so a twin below the cut still refuses the ref. Identical twins, such as several identical `Delete` buttons, are refused with `AMBIGUOUS_TARGET`, `details.kind: identity_not_unique`, before anything reaches the app; a live second match is `saved_ref_ambiguous`, and a removed element is `STALE_REF`, `saved_ref_absent`. Take a fresh snapshot after a list changes, and use `--headed mouse-click --xy` when you must pick one of two identical controls.
- The cursor overlay plays its per-action travel only for headless semantic actions. A `--headed` action moves the real cursor instead.

## References

- `references/shell-and-overlay.md`: open it for `open-system-surface`, tray
  and taskbar surfaces, notifications, the cursor overlay, hosted (UWP) window
  identity and menu detection coverage.
- `references/permissions-and-elevation.md`: integrity levels, UIPI, blocked
  combos, protected processes, the cross-process interaction lease.
- `references/chromium-and-electron.md`: settle timing, covered-window hazard,
  WPF wrong-provider trap, unnamed web content.
- `references/troubleshooting.md`: symptom-to-cause map, action verification
  outcomes, saving a document headless, install warnings.

Read any file from the binary:
`agent-desktop skills get agent-desktop-windows references/troubleshooting.md`.