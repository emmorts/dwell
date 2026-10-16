# Contributing to Dwell

Thanks for taking the time to contribute. Everyone taking part in this project is expected to follow the
[Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to help

- **Report a bug** or **suggest a feature** using the issue templates.
- **Improve the docs**, including this guide and the README.
- **Send a pull request** for an open issue. Issues labelled `good first issue` are a good starting point.

For larger changes, please open an issue first so we can agree on the approach before you invest time in it.

## Development setup

See [Getting started](README.md#getting-started) in the README. In short:

```sh
bun install       # or: bun run mirror install, on a network that blocks registry.npmjs.org
cp .env.example .env
bun run dev
bun run mirror setup   # once per clone: enables the pre-commit lockfile guard
```

The app uses Bun 1.2.15, which `mise.toml` pins. Use the same version so `bun.lock` keeps one format.

## Before you open a pull request

Run these locally. Continuous checks expect them to pass.

```sh
bun run check       # type-check Svelte and TypeScript
bun run test        # unit tests
bun run lock:check  # bun.lock must contain only public npm URLs
bun run build       # production build
```

Also check UI changes at a 375px-wide viewport as well as on desktop. Look for horizontal overflow and for
labels or buttons that wrap onto a second line.

## Code guidelines

- **Imports.** Import shared code from routes and from other folders with `#lib/...`, for example
  `import { login } from '#lib/spotify'`. Relative imports are only for files in the same directory, such as a
  component and its sibling sub-components.
- **Where code goes.** Pure logic (no Svelte, no I/O) lives in `src/lib/*.ts` with a `*.test.ts` next to it.
  Reusable UI goes in `src/lib/components/`. Keep route files thin: they compose components and own page state.
- **Styling.** Use the design tokens and component classes in `src/app.css`. Do not add ad hoc colours,
  fonts or one-off utility combinations that repeat an existing class.
- **Copy.** Use plain words in user-facing text (playlist, song, filter). Avoid internal or jargon terms.
- **Accessibility.** Keep labels on form controls, `alt` text on meaningful images, and state changes announced
  with live regions where the user would otherwise miss them.
- **Tests.** Cover behaviour that users would notice if it broke, such as boundaries, de-duplication, error
  messages and ordering. Avoid tests that only restate the implementation.

## Dependencies and the lockfile

`bun.lock` must always record public `https://registry.npmjs.org/` URLs, because the production build installs
from them. Add or change dependencies with the mirror wrapper, which restores public URLs afterwards:

```sh
bun run mirror add <package>
bun run mirror remove <package>
```

If the pre-commit guard refuses a commit, run `bun run mirror fix` and stage `bun.lock` again. Commit only the
dependency changes you intend, and check the diff of `package.json` after `add` or `remove`, because Bun
reformats that file.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/) with a short, imperative subject:

```
feat(library): add playlist search
fix(auth): clear the session after a revoked token
docs: explain the mirror workflow
```

Common types in this repository are `feat`, `fix`, `refactor`, `test`, `docs`, `build` and `chore`. Keep each
commit to one logical change.

## Pull requests

1. Fork the repository and create a branch from `main`.
2. Make focused changes. Split unrelated work into separate pull requests.
3. Fill in the pull request template, linking the issue it resolves.
4. Make sure the checks above pass.
5. If this is your first contribution, add yourself to [CONTRIBUTORS.md](CONTRIBUTORS.md) in the same pull request.

A maintainer will review your change. Feedback is normal and is about the code, not about you. Please respond to
review comments or ask a question if something is unclear.

## Reporting security issues

Please do not open a public issue for a security vulnerability. Email the maintainer at
[tomas@stropus.dev](mailto:tomas@stropus.dev) instead.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
