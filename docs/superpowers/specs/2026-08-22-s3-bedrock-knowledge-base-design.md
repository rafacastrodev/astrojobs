# S3 → Bedrock Knowledge Base Design

**Date:** 2026-08-22
**Status:** Design approved, not yet implemented

## Summary

First infrastructure slice of a larger architecture (S3 → Bedrock Knowledge Base → Pinecone → Bedrock Agent → EKS/FastAPI/ALB). This slice provisions, via a new AWS CDK (Python) project, the pieces needed for a Bedrock Knowledge Base to index candidate resumes (and, later, recruiter profiles) stored in S3, with Pinecone as the vector store. It also wires an event-driven sync so newly uploaded resumes are automatically picked up.

Everything else in the full diagram (Bedrock Agent, VPC/EKS/ALB, Pinecone-side setup beyond index creation) is out of scope and will get its own spec.

## Goals

- A Bedrock Knowledge Base that can be queried for candidate resumes, structured so a `recruiters/` data source can be added later without rework.
- Reuse the existing `astrojobs-resumes` S3 bucket and its current resume upload flow — no duplicate copy pipeline.
- Real embeddings (Titan Embed Text v2) replacing the placeholder `HashingEmbedder`/direct-Pinecone pipeline for this new KB (the old pipeline is left alone, not migrated, not deleted).
- New resumes become searchable automatically, without blocking the upload request.
- Reinforced protection for PII (customer-managed KMS everywhere applicable; a Guardrail resource ready for the future Agent).
- All of this reproducible as code (CDK), not console clicks.

## Out of scope

- Creating the `recruiters/` data source's actual content — the "recruiter profile" concept does not exist in the domain yet. The data source and prefix are provisioned empty and ready.
- The Bedrock Agent, VPC/EKS/ALB, and anything downstream of the Knowledge Base.
- Migrating or retiring the existing `SyncDocumentsUseCase` / `HashingEmbedder` / Pinecone index `astrojobs` (dimension 384) — left running as-is.
- Attaching the Guardrail to any inference call (nothing calls the KB yet besides manual verification).
- Handling the "ingestion job already running" race beyond logging and dropping the event (see Known limitation).

## Architecture

### Resources (all in new `infra/` CDK app, Python)

- **S3 bucket** `astrojobs-resumes` — created by this stack (does not exist in real AWS yet), SSE-KMS with the new customer-managed key, `enforceSSL`, `RemovalPolicy.RETAIN`.
- **KMS key** (customer-managed) — reused for: bucket encryption, KB transient-data encryption during ingestion, Guardrail configuration encryption.
- **Secrets Manager secret** — shell created by CDK; the actual Pinecone API key value is set out-of-band (see Bootstrap step). Referenced by the KB's Pinecone storage configuration.
- **Bedrock Knowledge Base** (`astrojobs-kb`) — vector KB, embedding model `amazon.titan-embed-text-v2:0` @ 1024 dimensions, storage configuration pointing at the new Pinecone index (`astrojobs-kb`, 1024 dims, serverless).
- **Two Data Sources** on that KB:
  - `candidates` — S3, scoped to the existing `resumes/` prefix in `astrojobs-resumes`. `fixed_size` chunking (200-300 tokens, 10-20% overlap).
  - `recruiters` — S3, scoped to a new (currently empty) `recruiters/` prefix. Same chunking config, for consistency. Created but never ingested in this slice (empty data sources aren't ingested — see Verification); it exists so the future recruiter-profile feature can start writing there without an infra change.
- **IAM role** for the KB (`AmazonBedrockExecutionRoleForKB-astrojobs`) — trust policy for `bedrock.amazonaws.com` with `aws:SourceAccount`/`aws:SourceArn` confused-deputy conditions; `bedrock:InvokeModel` on the Titan Embed v2 model ARN; `s3:GetObject`/`s3:ListBucket` on the bucket; `secretsmanager:GetSecretValue` on the Pinecone secret; `kms:Decrypt`/`kms:GenerateDataKey` on the KMS key.
- **Guardrail** (`astrojobs-pii-guardrail`) — encrypted with the KMS key, versioned (a numbered version, never DRAFT referenced by anything). PII policy: `ANONYMIZE` for high-risk identifiers (national ID/SSN-equivalent, credit card, bank account numbers); name/email/phone left unmasked since surfacing contact info is the product's purpose. Created but not attached to anything yet.
- **Lambda** (`sync-ingestion-trigger`) — receives S3 event notifications, calls `bedrock-agent:StartIngestionJob` on the `candidates` data source. No polling, no waiting for completion.
- **IAM role** for the Lambda — trust for `lambda.amazonaws.com`; `bedrock:StartIngestionJob` scoped to the specific KB+data-source ARN; standard CloudWatch Logs permissions.
- **S3 Event Notification** on the bucket — `s3:ObjectCreated:*`, filtered to suffix `.metadata.json` under prefix `resumes/`, targeting the Lambda.

### Application change (apps/api)

`UploadResumeUseCase` (already writes the resume file to `resumes/{user_id}/{uuid}{ext}`) additionally writes a Bedrock KB metadata sidecar object at the same key + `.metadata.json`, containing:

```json
{
  "metadataAttributes": {
    "profile_type": {"value": "candidate", "type": "STRING"},
    "user_id": {"value": "<user_id>", "type": "NUMBER"},
    "document_id": {"value": "<document_id>", "type": "NUMBER"}
  }
}
```

The sidecar is written **after** the main file (it's the trigger for the S3 event notification, so the resume file is guaranteed to already exist when the Lambda runs). This write is fire-and-forget from the use case's point of view — failure to write the sidecar is logged, not fatal to the upload (same pattern as the existing initial-analysis best-effort call).

### Data flow

1. User uploads a resume → `UploadResumeUseCase` stores the file + sidecar in S3 (as today, plus the new sidecar).
2. S3 event notification on the sidecar object fires → Lambda calls `StartIngestionJob` on the `candidates` data source.
3. Bedrock KB ingestion job runs (chunk → embed via Titan → upsert into Pinecone `astrojobs-kb` index), asynchronously, outside the request/response cycle.
4. Once complete, the resume is retrievable via `bedrock-agent-runtime retrieve` / `retrieve-and-generate` (consumed by the future Agent — not built in this slice).

### Known limitation

Bedrock KB allows only one ingestion job at a time per data source. If a second upload's event fires while a job is already running, the Lambda gets `ConflictException`, logs it, and drops the event — that resume is only picked up by the *next* successful trigger. Acceptable at current volume; revisit (e.g., a queue + debounce) if upload volume grows.

## Bootstrap (manual, one-time, before first `cdk deploy`)

1. Run `infra/scripts/bootstrap_pinecone_index.py` to create the `astrojobs-kb` Pinecone serverless index (1024 dimensions), reusing the connection pattern already in `apps/api/src/infrastructure/services/pinecone_service.py`.
2. Put the index host and API key into the Secrets Manager secret the stack created (`aws secretsmanager put-secret-value` or console) — never committed to code.

## CDK project layout

```
infra/
  app.py
  cdk.json
  pyproject.toml
  astrojobs_infra/
    knowledge_base_stack.py     # bucket, KMS, secret shell, KB role, KB, 2 data sources, Guardrail
    sync_lambda_stack.py        # Lambda, S3 event notification, Lambda role
  lambda/
    sync_ingestion/handler.py
  scripts/
    bootstrap_pinecone_index.py
  tests/
    test_knowledge_base_stack.py   # aws_cdk.assertions.Template-based checks
```

New top-level directory, sibling to `apps/`, with its own `uv`-managed `pyproject.toml` — independent lifecycle from `apps/api`, not part of the pnpm workspace.

## Errors / edge cases

- Sidecar write failure on upload: logged, upload still succeeds (matches existing best-effort pattern for the initial Bedrock analysis).
- Lambda `ConflictException` (ingestion already running): logged and dropped (see Known limitation).
- Ingestion `FAILED`: surfaces in `get-ingestion-job` / CloudWatch Logs; no in-app visibility yet (no UI consumes KB status in this slice).
- Unsupported file formats or oversized files in the data source: silently skipped by Bedrock ingestion (AWS platform behavior, not something this slice adds handling for).

## Verification

No production data exists yet, so verification is manual against a real `cdk deploy`:

1. Deploy the stack; confirm bucket, KMS key, KB, 2 data sources, Guardrail, Lambda, and event notification all exist.
2. Upload a test resume through the running API; confirm the `.metadata.json` sidecar appears in S3 next to the resume.
3. Confirm in CloudWatch Logs that the Lambda fired and called `StartIngestionJob`.
4. Poll `get-ingestion-job` until `COMPLETE`.
5. Run `bedrock-agent-runtime retrieve` with a query matching the test resume's content; confirm it comes back with a reasonable relevance score.
6. Clean up the test resume/data afterward.
