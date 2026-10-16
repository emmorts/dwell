# Security Policy

## Supported versions

Security fixes are made on the `main` branch, and the hosted app at
[dwell.auxarena.com](https://dwell.auxarena.com) is updated from it. Older commits and self-hosted copies
are not patched; update to the latest `main` to receive fixes.

## Reporting a vulnerability

**Please do not open a public issue for a security problem.** Report it privately by email to
[tomas@stropus.dev](mailto:tomas@stropus.dev) with the subject `Dwell security report`.

Please include:

- A description of the problem and its impact.
- Steps to reproduce it, or a proof of concept.
- The affected commit, or the page or feature involved.
- Your name or handle, if you would like to be credited.

Use a test Spotify account and remove real tokens, account details and private playlist data from anything
you send.

## What to expect

- You will receive an acknowledgement of your report.
- The problem will be investigated, and you will be kept informed of progress.
- A fix will be prepared and deployed, and you will be asked how you would like to be credited.
- Please keep the details private until a fix is available.

## Scope

**In scope:** the code in this repository and the hosted app at dwell.auxarena.com.

**Out of scope:**

- Spotify's own services, apps and Web API. Report those to Spotify.
- Denial-of-service or load testing against the hosted app.
- Social engineering, and attacks that require control of the user's device or browser.
- Configuration of self-hosted deployments beyond the defaults in this repository.

## How Dwell handles data

Dwell is a static, client-side app with no backend. Spotify sign-in uses OAuth 2.0 with PKCE, so no client
secret is used. Access and refresh tokens are kept in the browser's `localStorage` so that the session
survives a page reload. A cross-site scripting bug that could read those tokens is therefore treated as
security-relevant, and reports of such issues are welcome.
