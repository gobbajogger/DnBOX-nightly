# R045: feature-request inbox and owner voting

**State: preparation only; design/approval unresolved.** The handoff says R045 waits for the owner's thumbs-up, but does not include that pending proposal. The latest checklist requests R045 voting; it does not specify whether the intended system is issue reactions, Discussions or a separate application. No backend, account, permission, subscription or repository setting is enabled here.

## Existing implementation and safe preparation

This repository is browser/installer source. Its issue-template contact links route bug and feature reports to the existing canonical production-repository inbox, preserving the README reporting instruction instead of creating competing nightly forms. Browser/tool context is collected in the canonical form. A submitted issue is an inbox entry, not an accepted feature or delivery promise. Community reactions must not be represented as owner approval.

## Proposed minimal design, not activated

Use existing GitHub feature-request issues as the public inbox. Check duplicates and link related requests. The verified owner's thumbs-up on a specific documented proposal could mark it selected for prioritization, not approve unrelated actions, payments, settings, publication or device writes. Keep source implementation, exact verification, integration and delivery as separate statuses. A polling bot must never infer consent from reaction totals, an assistant's reaction or an unverified author.

Before implementation, recover the original proposal or obtain a concrete decision about destination, eligible owner identity, vote semantics, ordering, abuse/duplicates and whether automation or a website view is wanted. Any read-only sync should have a named owner and durable testable inputs; any writes require their actual scope of authority. Do not enable Discussions or install a bot merely to complete this checklist.

**Accountable owner:** repository steward for recovery/design; project lead for resolving the missing owner decision. **Next evidence required:** the exact accepted R045 design and applicable approval, then implementation and local tests against that design. The issue templates are delivered preparation, not a completed voting system.

