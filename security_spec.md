# Security Specification & Payload-First TDD (DocuMind AI)

## 1. Data Invariants

1. **Identity Integrity**: Every document in `users`, `documents`, `knowledgeBase`, `rules`, `questions`, and `evaluations` is strictly owned by a verified authenticated user (`request.auth.uid`) with `request.auth.token.email_verified == true`.
2. **PII Isolation**: User records in `users/{userId}` (containing `email` and `name`) prohibit collection `list` queries and restrict `get`, `create`, `update`, and `delete` strictly to `request.auth.uid == userId`.
3. **Referential Consistency**: Facts in `knowledgeBase` referencing a source `documentId` (other than `"manual"`) must verify via `exists()` and `get()` that `/documents/{documentId}` exists and belongs to the same `request.auth.uid`.
4. **Immutable Ownership & Creation Timestamps**: `userId`, `documentId`/`factId`/`ruleId`/`questionId`/`evaluationId`, and `createdAt`/`uploadDate`/`timestamp` cannot be altered after creation.
5. **Strict Payload Boundaries**: Every string, number, enum, and bounded array (`reasoningSteps <= 30`, `matchedFactIds <= 50`, `inferredFactIds <= 50`) is size-validated and key-allowlisted (`hasAll` + `hasOnly` on create; `affectedKeys().hasOnly(...)` on update).

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)

1. **Unauthenticated Read/List**: Unauthenticated request reading `/documents` or `/knowledgeBase`.
2. **Unverified Email Spoofing**: Authenticated token with `email_verified: false` writing to `/documents/doc1`.
3. **Cross-Tenant User PII Read**: User B attempting `get` on `/users/userA`.
4. **Users Collection Scraping**: Any authenticated user attempting `list` on `/users`.
5. **Self-Assigned Admin Role Escalation**: User A creating `/users/userA` with `role: "admin"`.
6. **Shadow Field Injection (Ghost Field)**: User A creating `/knowledgeBase/fact1` with extra field `isAdminApproved: true`.
7. **Identity Spoofing on Document Create**: User A creating `/documents/doc1` with `userId: "userB"`.
8. **Orphaned Fact Injection**: User A creating `/knowledgeBase/fact1` referencing `documentId: "non_existent_doc"`.
9. **Cross-Tenant Parent Hijack**: User A creating `/knowledgeBase/fact1` referencing User B's `documentId`.
10. **Path Variable ID Poisoning**: User A writing `/documents/bad$id..123` or a 500-char ID string.
11. **Timestamp Forgery**: User A creating `/documents/doc1` with backdated `uploadDate` not equal to `request.time`.
12. **Immutable Owner Mutation on Update**: User A updating `/documents/doc1` to change `userId` to `"userB"` or mutate `uploadDate`.
