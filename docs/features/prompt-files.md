# Prompt Files

## Implementation

Introduced on 2026-08-08 in commit `3920b8d` (`Adding Files Functionality`), followed immediately by an error-fix commit `4e0310d`.

## Storage model

Files are persisted as `PromptAttachment` records containing metadata plus Base64-encoded bytes in Firebase Realtime Database.

## Limits

- 2 MiB maximum per file.
- 20 files maximum per Prompt.
- 10 MiB maximum total per Prompt.
- Empty files are rejected.

Batch validation calculates the resulting count and byte total before writing.

## Operations

- Upload one or more files.
- Download a stored file by reconstructing a Blob in the browser.
- Remove a file.
- Preserve attachment information in Global Version snapshots.
- Duplicate Prompt workflows copy attachments so the duplicate can retain file context.

## Presentation

Attachments are classified as image, PDF, text, archive or generic file based on MIME type and filename extension.

## Current architectural tradeoff

Inline Base64 storage is simple and keeps files inside the same owner-scoped Firebase model, but it is not an object-storage architecture. Limits are therefore deliberately conservative.
