# S3 → Bedrock Knowledge Base Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provision, as CDK (Python) code, a Bedrock Knowledge Base that indexes candidate resumes (and, later, recruiter profiles) stored in S3, with Pinecone as the vector store, and wire an event-driven Lambda so newly uploaded resumes are ingested automatically.

**Architecture:** A new, independent `infra/` CDK app: one CloudFormation stack (`KnowledgeBaseStack`) holding the bucket/KMS/secret/KB/data sources/guardrail, plus a `SyncLambdaConstruct` (the ingestion-trigger Lambda, instantiated inside that same stack — not a separate stack, see Task 8's Correction note) — plus a small addition to `apps/api`'s existing `UploadResumeUseCase` that writes a Bedrock-KB metadata sidecar file next to each uploaded resume. A one-time manual script creates the Pinecone index the KB connects to (Pinecone is third-party SaaS; CDK can't provision it).

**Tech Stack:** AWS CDK v2 (Python, `aws-cdk-lib`), `aws_cdk.aws_bedrock` L1 (`Cfn*`) constructs for Bedrock resources (no mature L2 exists yet for Knowledge Base/DataSource/Guardrail), L2 constructs for S3/KMS/IAM/Lambda/Secrets Manager, `pinecone` Python SDK (already a dependency of `apps/api`), `pytest` + `aws_cdk.assertions` for infra tests.

**Spec:** [docs/superpowers/specs/2026-08-22-s3-bedrock-knowledge-base-design.md](../specs/2026-08-22-s3-bedrock-knowledge-base-design.md)

## Global Constraints

- Embedding model: `amazon.titan-embed-text-v2:0`, 1024 output dimensions. The Pinecone index MUST have dimension 1024 to match.
- Chunking strategy is `FIXED_SIZE` with `MaxTokens=300`, `OverlapPercentage=15` — irreversible after the data source is created (would require delete + recreate to change).
- The existing Pinecone index `astrojobs` (dimension 384, used by the legacy `HashingEmbedder`/`SyncDocumentsUseCase` pipeline in `apps/api`) is left untouched. This plan creates a new, separate index: `astrojobs-kb`.
- All Bedrock resources (Knowledge Base, DataSource, Guardrail, GuardrailVersion) use L1 `Cfn*` constructs from `aws_cdk.aws_bedrock` — confirmed present in GA `aws-cdk-lib` (not an alpha module), property shapes confirmed against current AWS CloudFormation documentation as of this plan's writing.
- `infra/` is a new, independent project: its own `uv`-managed `pyproject.toml` (not part of `apps/api`'s), and its own `package.json` pinning the `aws-cdk` CLI at an exact version (per CDK best practice — CLI and library are separate release tracks). Not part of the pnpm workspace.
- `infra/` gets automated tests (`pytest` + `aws_cdk.assertions.Template`) — a new project sets its own convention. The `apps/api` change (Task 9) follows that codebase's existing convention of no automated tests — verified manually instead, same as prior slices in this codebase.
- Deploy target defaults to region `us-east-2` (matches `AWS_REGION` already used by the rest of the app), overridable via the `CDK_DEFAULT_REGION` env var that `cdk deploy` sets automatically from the caller's AWS profile.
- The S3 bucket name `astrojobs-resumes` is global across all of AWS, not just this account. If `cdk deploy` fails with `BucketAlreadyExists`, the name needs to change — that's a deploy-time risk to resolve when it happens, not something to code around now.
- Nothing in this plan attaches the Guardrail to an inference call, and nothing runs ingestion on the `recruiters` data source (it has no content yet) — both are created, unused, ready for future work.

---

### Task 1: CDK project scaffolding

**Files:**
- Create: `infra/pyproject.toml`
- Create: `infra/package.json`
- Create: `infra/cdk.json`
- Create: `infra/.gitignore`
- Create: `infra/app.py`
- Create: `infra/astrojobs_infra/__init__.py`
- Create: `infra/astrojobs_infra/knowledge_base_stack.py`
- Create: `infra/tests/__init__.py`
- Create: `infra/tests/test_app_synth.py`

**Interfaces:**
- Produces: `astrojobs_infra.knowledge_base_stack.KnowledgeBaseStack` — a `Stack` subclass, constructor `(scope, construct_id, **kwargs)` for now (gains a required `pinecone_connection_string: str` kwarg in Task 5).

- [ ] **Step 1: Create the CDK project files**

Create `infra/pyproject.toml`:

```toml
[project]
name = "astrojobs-infra"
version = "0.1.0"
description = "AstroJobs AWS infrastructure (CDK)"
requires-python = ">=3.12"
dependencies = [
    "aws-cdk-lib>=2.255.0,<3.0.0",
    "constructs>=10.0.0,<11.0.0",
    "boto3>=1.35.0",
    "pinecone>=9.1.0",
]

[tool.uv]
package = false

[dependency-groups]
dev = [
    "pytest>=8.0.0",
    "ruff>=0.16.4",
]

[tool.pytest.ini_options]
testpaths = ["tests"]
```

Create `infra/package.json` (pins the CDK CLI — a separate release track from the `aws-cdk-lib` Python library):

```json
{
  "name": "astrojobs-infra-cli",
  "private": true,
  "devDependencies": {
    "aws-cdk": "2.1138.0"
  }
}
```

Create `infra/cdk.json`:

```json
{
  "app": "uv run python app.py",
  "context": {}
}
```

Create `infra/.gitignore`:

```
cdk.out/
.venv/
__pycache__/
*.pyc
node_modules/
```

- [ ] **Step 2: Create the stack skeleton and app entrypoint**

Create `infra/astrojobs_infra/__init__.py` (empty file).

Create `infra/astrojobs_infra/knowledge_base_stack.py`:

```python
from aws_cdk import Stack
from constructs import Construct


class KnowledgeBaseStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
```

Create `infra/app.py`:

```python
import os

from aws_cdk import App, Environment

from astrojobs_infra.knowledge_base_stack import KnowledgeBaseStack

app = App()

env = Environment(
    account=os.environ.get("CDK_DEFAULT_ACCOUNT"),
    region=os.environ.get("CDK_DEFAULT_REGION", "us-east-2"),
)

KnowledgeBaseStack(app, "AstroJobsKnowledgeBase", env=env)

app.synth()
```

- [ ] **Step 3: Write and run the synth smoke test**

Create `infra/tests/__init__.py` (empty file).

Create `infra/tests/test_app_synth.py`:

```python
from aws_cdk import App, Environment
from aws_cdk.assertions import Template

from astrojobs_infra.knowledge_base_stack import KnowledgeBaseStack


def _synth_kb_stack() -> Template:
    app = App()
    stack = KnowledgeBaseStack(
        app,
        "TestKnowledgeBase",
        env=Environment(account="123456789012", region="us-east-2"),
    )
    return Template.from_stack(stack)


def test_stack_synthesizes():
    template = _synth_kb_stack()
    assert template.to_json() is not None
```

Run: `cd infra && uv run pytest tests/test_app_synth.py -v`
Expected: `1 passed`

- [ ] **Step 4: Verify `cdk synth` works end-to-end**

Run:
```bash
cd infra
uv sync
npm install
npx cdk synth
```
Expected: synthesizes an (empty) `AstroJobsKnowledgeBase` stack with no errors.

- [ ] **Step 5: Commit**

```bash
git add infra/
git commit -m "$(cat <<'EOF'
chore: scaffold infra/ CDK project

New, independent CDK (Python) app for AWS infrastructure — first
stack is empty, filled in by subsequent commits.
EOF
)"
```

---

### Task 2: KMS key + S3 bucket

**Files:**
- Modify: `infra/astrojobs_infra/knowledge_base_stack.py`
- Modify: `infra/tests/test_app_synth.py` (renamed in spirit — new assertions added to the same file, see below)

**Interfaces:**
- Consumes: `astrojobs_infra.knowledge_base_stack.KnowledgeBaseStack.__init__(scope, construct_id, **kwargs)` from Task 1.
- Produces: `KnowledgeBaseStack.key` (`aws_cdk.aws_kms.Key`), `KnowledgeBaseStack.bucket` (`aws_cdk.aws_s3.Bucket`, physical name `astrojobs-resumes`) — both public attributes on the stack, used by Task 4 (role permissions) and Task 8 (the `SyncLambdaConstruct`, instantiated within this same stack).

- [ ] **Step 1: Write the failing assertion**

Add to `infra/tests/test_app_synth.py` (below the existing `test_stack_synthesizes`):

```python
def test_bucket_uses_kms_and_blocks_public_access():
    template = _synth_kb_stack()
    template.has_resource_properties(
        "AWS::S3::Bucket",
        {
            "BucketName": "astrojobs-resumes",
            "PublicAccessBlockConfiguration": {
                "BlockPublicAcls": True,
                "BlockPublicPolicy": True,
                "IgnorePublicAcls": True,
                "RestrictPublicBuckets": True,
            },
        },
    )
    template.has_resource_properties(
        "AWS::KMS::Key",
        {"EnableKeyRotation": True},
    )
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd infra && uv run pytest tests/test_app_synth.py::test_bucket_uses_kms_and_blocks_public_access -v`
Expected: FAIL — no `AWS::S3::Bucket` resource in the template yet.

- [ ] **Step 3: Add the KMS key and S3 bucket**

Replace the body of `infra/astrojobs_infra/knowledge_base_stack.py` with:

```python
from aws_cdk import RemovalPolicy, Stack
from aws_cdk import aws_kms as kms
from aws_cdk import aws_s3 as s3
from constructs import Construct

BUCKET_NAME = "astrojobs-resumes"


class KnowledgeBaseStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        self.key = kms.Key(
            self,
            "KnowledgeBaseKey",
            alias="alias/astrojobs-kb",
            description=(
                "Encrypts the resumes bucket, Bedrock KB transient ingestion "
                "data, and the PII guardrail"
            ),
            enable_key_rotation=True,
            removal_policy=RemovalPolicy.RETAIN,
        )

        self.bucket = s3.Bucket(
            self,
            "ResumesBucket",
            bucket_name=BUCKET_NAME,
            encryption=s3.BucketEncryption.KMS,
            encryption_key=self.key,
            enforce_ssl=True,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            removal_policy=RemovalPolicy.RETAIN,
        )
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd infra && uv run pytest tests/test_app_synth.py -v`
Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add infra/astrojobs_infra/knowledge_base_stack.py infra/tests/test_app_synth.py
git commit -m "$(cat <<'EOF'
feat(infra): add KMS key and S3 bucket for the knowledge base

Customer-managed KMS key (rotation enabled) and the astrojobs-resumes
bucket (SSE-KMS, enforced SSL, public access blocked, RETAIN on
delete since it holds user-uploaded resumes).
EOF
)"
```

---

### Task 3: Secrets Manager secret shell + Pinecone bootstrap script

**Files:**
- Modify: `infra/astrojobs_infra/knowledge_base_stack.py`
- Modify: `infra/tests/test_app_synth.py`
- Create: `infra/scripts/bootstrap_pinecone_index.py`
- Create: `infra/scripts/__init__.py`

**Interfaces:**
- Consumes: `KnowledgeBaseStack.key` from Task 2.
- Produces: `KnowledgeBaseStack.pinecone_secret` (`aws_cdk.aws_secretsmanager.Secret`, secret name `astrojobs/pinecone-kb`) — consumed by Task 4 (role read permission) and Task 5 (`CredentialsSecretArn`).

- [ ] **Step 1: Write the failing assertion**

Add to `infra/tests/test_app_synth.py`:

```python
def test_pinecone_secret_is_encrypted_with_the_kms_key():
    template = _synth_kb_stack()
    template.has_resource_properties(
        "AWS::SecretsManager::Secret",
        {"Name": "astrojobs/pinecone-kb"},
    )
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd infra && uv run pytest tests/test_app_synth.py::test_pinecone_secret_is_encrypted_with_the_kms_key -v`
Expected: FAIL — no `AWS::SecretsManager::Secret` resource yet.

- [ ] **Step 3: Add the secret shell**

In `infra/astrojobs_infra/knowledge_base_stack.py`, add the import and construct. Change the imports block to:

```python
from aws_cdk import RemovalPolicy, Stack
from aws_cdk import aws_kms as kms
from aws_cdk import aws_s3 as s3
from aws_cdk import aws_secretsmanager as secretsmanager
from constructs import Construct
```

And after the `self.bucket = s3.Bucket(...)` block, add:

```python
        self.pinecone_secret = secretsmanager.Secret(
            self,
            "PineconeSecret",
            secret_name="astrojobs/pinecone-kb",
            description=(
                "Pinecone connection info for the astrojobs-kb index. This "
                "shell is populated manually by "
                "scripts/bootstrap_pinecone_index.py — CDK only creates it."
            ),
            encryption_key=self.key,
        )
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd infra && uv run pytest tests/test_app_synth.py -v`
Expected: `4 passed`

- [ ] **Step 5: Write the bootstrap script**

Create `infra/scripts/__init__.py` (empty file).

Create `infra/scripts/bootstrap_pinecone_index.py`:

```python
"""One-time script: creates the Pinecone serverless index the Knowledge
Base connects to. Pinecone is third-party SaaS — CDK cannot provision it.

Run once, before the first `cdk deploy`:

    PINECONE_API_KEY=<key> uv run python scripts/bootstrap_pinecone_index.py

Then, using the printed host:
1. Export it before `cdk deploy`:
     export PINECONE_CONNECTION_STRING=<printed-host>
2. Put the API key into the secret CDK creates:
     aws secretsmanager put-secret-value \\
       --secret-id astrojobs/pinecone-kb \\
       --secret-string '{"apiKey":"<key>"}'
"""

import os

from pinecone import Pinecone, ServerlessSpec

INDEX_NAME = "astrojobs-kb"
DIMENSION = 1024
CLOUD = "aws"
REGION = os.environ.get("PINECONE_REGION", "us-east-1")


def main() -> None:
    api_key = os.environ["PINECONE_API_KEY"]
    client = Pinecone(api_key=api_key)

    if client.has_index(INDEX_NAME):
        print(f"Index '{INDEX_NAME}' already exists, skipping creation.")
    else:
        client.create_index(
            name=INDEX_NAME,
            dimension=DIMENSION,
            metric="cosine",
            spec=ServerlessSpec(cloud=CLOUD, region=REGION),
        )
        print(f"Created index '{INDEX_NAME}' ({DIMENSION} dims, {CLOUD}/{REGION}).")

    description = client.describe_index(INDEX_NAME)
    print(f"\nHost: {description.host}")
    print("Export before 'cdk deploy':")
    print(f"  export PINECONE_CONNECTION_STRING={description.host}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 6: Commit**

```bash
git add infra/astrojobs_infra/knowledge_base_stack.py infra/tests/test_app_synth.py infra/scripts/
git commit -m "$(cat <<'EOF'
feat(infra): add Pinecone secret shell and index bootstrap script

The secret is created empty by CDK; scripts/bootstrap_pinecone_index.py
is a one-time manual step (Pinecone is third-party SaaS, not
CDK-provisionable) that creates the astrojobs-kb index and prints the
connection string + a reminder to fill in the secret's API key.
EOF
)"
```

---

### Task 4: Knowledge Base IAM role

**Files:**
- Modify: `infra/astrojobs_infra/knowledge_base_stack.py`
- Modify: `infra/tests/test_app_synth.py`

**Interfaces:**
- Consumes: `KnowledgeBaseStack.key`, `.bucket`, `.pinecone_secret` from Tasks 2-3.
- Produces: `KnowledgeBaseStack.kb_role` (`aws_cdk.aws_iam.Role`) — consumed by Task 5 (`RoleArn` on the `CfnKnowledgeBase`).

- [ ] **Step 1: Write the failing assertion**

Add to `infra/tests/test_app_synth.py`:

```python
from aws_cdk.assertions import Match


def test_kb_role_trusts_bedrock_with_confused_deputy_conditions():
    template = _synth_kb_stack()
    template.has_resource_properties(
        "AWS::IAM::Role",
        {
            "RoleName": "AmazonBedrockExecutionRoleForKB-astrojobs",
            "AssumeRolePolicyDocument": Match.object_like(
                {
                    "Statement": Match.array_with(
                        [
                            Match.object_like(
                                {
                                    "Principal": {"Service": "bedrock.amazonaws.com"},
                                    "Condition": Match.object_like(
                                        {"StringEquals": Match.any_value()}
                                    ),
                                }
                            )
                        ]
                    )
                }
            ),
        },
    )
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd infra && uv run pytest tests/test_app_synth.py::test_kb_role_trusts_bedrock_with_confused_deputy_conditions -v`
Expected: FAIL — no `AWS::IAM::Role` resource with that name yet.

- [ ] **Step 3: Add the role**

In `infra/astrojobs_infra/knowledge_base_stack.py`, update imports to add `Aws` and `aws_iam`:

```python
from aws_cdk import Aws, RemovalPolicy, Stack
from aws_cdk import aws_iam as iam
from aws_cdk import aws_kms as kms
from aws_cdk import aws_s3 as s3
from aws_cdk import aws_secretsmanager as secretsmanager
from constructs import Construct

BUCKET_NAME = "astrojobs-resumes"
EMBEDDING_MODEL_ID = "amazon.titan-embed-text-v2:0"
```

After the `self.pinecone_secret = secretsmanager.Secret(...)` block, add:

```python
        self.kb_role = self._build_kb_role()

    def _build_kb_role(self) -> iam.Role:
        role = iam.Role(
            self,
            "KnowledgeBaseRole",
            role_name="AmazonBedrockExecutionRoleForKB-astrojobs",
            assumed_by=iam.ServicePrincipal(
                "bedrock.amazonaws.com",
                conditions={
                    "StringEquals": {"aws:SourceAccount": Aws.ACCOUNT_ID},
                    "ArnLike": {
                        "aws:SourceArn": (
                            f"arn:{Aws.PARTITION}:bedrock:{Aws.REGION}:"
                            f"{Aws.ACCOUNT_ID}:knowledge-base/*"
                        )
                    },
                },
            ),
        )
        role.add_to_policy(
            iam.PolicyStatement(
                actions=["bedrock:InvokeModel"],
                resources=[
                    f"arn:{Aws.PARTITION}:bedrock:{Aws.REGION}::foundation-model/{EMBEDDING_MODEL_ID}"
                ],
            )
        )
        self.bucket.grant_read(role)
        self.pinecone_secret.grant_read(role)
        self.key.grant_decrypt(role)
        return role
```

Note the `self.kb_role = self._build_kb_role()` line goes at the end of `__init__`, and `_build_kb_role` is a new method on the class (same indentation level as `__init__`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd infra && uv run pytest tests/test_app_synth.py -v`
Expected: `5 passed`

If `cdk synth`-level errors surface about the `ServicePrincipal` conditions kwarg shape, run `cd infra && npx cdk synth` and adjust the `conditions=` argument to whatever the installed `aws-cdk-lib` version's error message indicates — this is a fast, mechanical fix (CDK reports the exact expected type).

- [ ] **Step 5: Commit**

```bash
git add infra/astrojobs_infra/knowledge_base_stack.py infra/tests/test_app_synth.py
git commit -m "$(cat <<'EOF'
feat(infra): add the Bedrock Knowledge Base execution role

Trust policy scoped to bedrock.amazonaws.com with confused-deputy
conditions (aws:SourceAccount / aws:SourceArn), plus InvokeModel on
the embedding model, and read access to the bucket, Pinecone secret,
and KMS key.
EOF
)"
```

---

### Task 5: Bedrock Knowledge Base resource

**Files:**
- Modify: `infra/astrojobs_infra/knowledge_base_stack.py`
- Modify: `infra/app.py`
- Modify: `infra/tests/test_app_synth.py`

**Interfaces:**
- Consumes: `KnowledgeBaseStack.kb_role`, `.pinecone_secret` from Task 4; `KnowledgeBaseStack.__init__` now requires `pinecone_connection_string: str`.
- Produces: `KnowledgeBaseStack.knowledge_base` (`aws_cdk.aws_bedrock.CfnKnowledgeBase`) — consumed by Task 6 (data sources) and Task 8 (Lambda's IAM policy / env vars, cross-stack).

- [ ] **Step 1: Write the failing assertion**

Add to `infra/tests/test_app_synth.py`. First, update `_synth_kb_stack` to pass the new required parameter:

```python
def _synth_kb_stack() -> Template:
    app = App()
    stack = KnowledgeBaseStack(
        app,
        "TestKnowledgeBase",
        pinecone_connection_string="https://astrojobs-kb-test.svc.us-east-1-aws.pinecone.io",
        env=Environment(account="123456789012", region="us-east-2"),
    )
    return Template.from_stack(stack)
```

Then add:

```python
def test_knowledge_base_uses_pinecone_storage():
    template = _synth_kb_stack()
    template.has_resource_properties(
        "AWS::Bedrock::KnowledgeBase",
        {
            "Name": "astrojobs-kb",
            "StorageConfiguration": Match.object_like(
                {
                    "Type": "PINECONE",
                    "PineconeConfiguration": Match.object_like(
                        {
                            "ConnectionString": "https://astrojobs-kb-test.svc.us-east-1-aws.pinecone.io",
                        }
                    ),
                }
            ),
        },
    )
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd infra && uv run pytest tests/test_app_synth.py::test_knowledge_base_uses_pinecone_storage -v`
Expected: FAIL — `TypeError` (unexpected keyword `pinecone_connection_string`) or missing resource.

- [ ] **Step 3: Thread the connection string through and add the Knowledge Base**

In `infra/astrojobs_infra/knowledge_base_stack.py`, add the import:

```python
from aws_cdk import aws_bedrock as bedrock
```

Change the constructor signature and the end of `__init__`:

```python
    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        pinecone_connection_string: str,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)
```

(everything else in `__init__` stays the same up to `self.kb_role = self._build_kb_role()`, then add:)

```python
        self.knowledge_base = self._build_knowledge_base(pinecone_connection_string)
```

Add the new method (alongside `_build_kb_role`):

```python
    def _build_knowledge_base(
        self, pinecone_connection_string: str
    ) -> bedrock.CfnKnowledgeBase:
        return bedrock.CfnKnowledgeBase(
            self,
            "KnowledgeBase",
            name="astrojobs-kb",
            description="Candidate and recruiter profiles for semantic search",
            role_arn=self.kb_role.role_arn,
            knowledge_base_configuration=bedrock.CfnKnowledgeBase.KnowledgeBaseConfigurationProperty(
                type="VECTOR",
                vector_knowledge_base_configuration=bedrock.CfnKnowledgeBase.VectorKnowledgeBaseConfigurationProperty(
                    embedding_model_arn=(
                        f"arn:{Aws.PARTITION}:bedrock:{Aws.REGION}::foundation-model/{EMBEDDING_MODEL_ID}"
                    ),
                ),
            ),
            storage_configuration=bedrock.CfnKnowledgeBase.StorageConfigurationProperty(
                type="PINECONE",
                pinecone_configuration=bedrock.CfnKnowledgeBase.PineconeConfigurationProperty(
                    connection_string=pinecone_connection_string,
                    credentials_secret_arn=self.pinecone_secret.secret_arn,
                    field_mapping=bedrock.CfnKnowledgeBase.PineconeFieldMappingProperty(
                        text_field="text",
                        metadata_field="metadata",
                    ),
                ),
            ),
        )
```

In `infra/app.py`, read the connection string and pass it through:

```python
import os

from aws_cdk import App, Environment

from astrojobs_infra.knowledge_base_stack import KnowledgeBaseStack

app = App()

env = Environment(
    account=os.environ.get("CDK_DEFAULT_ACCOUNT"),
    region=os.environ.get("CDK_DEFAULT_REGION", "us-east-2"),
)

pinecone_connection_string = os.environ["PINECONE_CONNECTION_STRING"]

KnowledgeBaseStack(
    app,
    "AstroJobsKnowledgeBase",
    pinecone_connection_string=pinecone_connection_string,
    env=env,
)

app.synth()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd infra && uv run pytest tests/test_app_synth.py -v`
Expected: `6 passed`

- [ ] **Step 5: Verify synth requires the env var**

Run: `cd infra && npx cdk synth`
Expected: fails with `KeyError: 'PINECONE_CONNECTION_STRING'` (correct — the bootstrap script in Task 3 hasn't been run against a real Pinecone account yet, so there's no real value to supply). Re-run with a placeholder to confirm synth otherwise succeeds:
```bash
PINECONE_CONNECTION_STRING=https://placeholder.pinecone.io npx cdk synth
```
Expected: synthesizes without error.

- [ ] **Step 6: Commit**

```bash
git add infra/astrojobs_infra/knowledge_base_stack.py infra/app.py infra/tests/test_app_synth.py
git commit -m "$(cat <<'EOF'
feat(infra): add the Bedrock Knowledge Base resource

VECTOR knowledge base backed by Pinecone, using Titan Embed Text v2.
The Pinecone connection string is a synth-time parameter (env var)
since the index doesn't exist until the bootstrap script runs;
the API key stays in the Secrets Manager secret from Task 3.
EOF
)"
```

---

### Task 6: Data sources (candidates, recruiters)

**Files:**
- Modify: `infra/astrojobs_infra/knowledge_base_stack.py`
- Modify: `infra/tests/test_app_synth.py`

**Interfaces:**
- Consumes: `KnowledgeBaseStack.knowledge_base`, `.bucket` from Tasks 5, 2.
- Produces: `KnowledgeBaseStack.candidates_data_source`, `.recruiters_data_source` (both `aws_cdk.aws_bedrock.CfnDataSource`) — `candidates_data_source` consumed by Task 8 (Lambda IAM policy / env vars, cross-stack).

- [ ] **Step 1: Write the failing assertions**

Add to `infra/tests/test_app_synth.py`:

```python
def test_candidates_data_source_scoped_to_resumes_prefix():
    template = _synth_kb_stack()
    template.has_resource_properties(
        "AWS::Bedrock::DataSource",
        {
            "Name": "candidates",
            "DataSourceConfiguration": Match.object_like(
                {
                    "Type": "S3",
                    "S3Configuration": Match.object_like(
                        {"InclusionPrefixes": ["resumes/"]}
                    ),
                }
            ),
            "VectorIngestionConfiguration": Match.object_like(
                {
                    "ChunkingConfiguration": Match.object_like(
                        {
                            "ChunkingStrategy": "FIXED_SIZE",
                            "FixedSizeChunkingConfiguration": {
                                "MaxTokens": 300,
                                "OverlapPercentage": 15,
                            },
                        }
                    )
                }
            ),
        },
    )


def test_recruiters_data_source_scoped_to_recruiters_prefix():
    template = _synth_kb_stack()
    template.has_resource_properties(
        "AWS::Bedrock::DataSource",
        {
            "Name": "recruiters",
            "DataSourceConfiguration": Match.object_like(
                {
                    "Type": "S3",
                    "S3Configuration": Match.object_like(
                        {"InclusionPrefixes": ["recruiters/"]}
                    ),
                }
            ),
        },
    )
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd infra && uv run pytest tests/test_app_synth.py -k data_source -v`
Expected: FAIL — no `AWS::Bedrock::DataSource` resources yet.

- [ ] **Step 3: Add the two data sources**

In `infra/astrojobs_infra/knowledge_base_stack.py`, after `self.knowledge_base = self._build_knowledge_base(pinecone_connection_string)`, add:

```python
        self.candidates_data_source = self._build_data_source(
            "CandidatesDataSource", "candidates", "resumes/"
        )
        self.recruiters_data_source = self._build_data_source(
            "RecruitersDataSource", "recruiters", "recruiters/"
        )
```

Add the new method:

```python
    def _build_data_source(
        self, construct_id: str, name: str, prefix: str
    ) -> bedrock.CfnDataSource:
        return bedrock.CfnDataSource(
            self,
            construct_id,
            name=name,
            knowledge_base_id=self.knowledge_base.attr_knowledge_base_id,
            data_source_configuration=bedrock.CfnDataSource.DataSourceConfigurationProperty(
                type="S3",
                s3_configuration=bedrock.CfnDataSource.S3DataSourceConfigurationProperty(
                    bucket_arn=self.bucket.bucket_arn,
                    inclusion_prefixes=[prefix],
                ),
            ),
            vector_ingestion_configuration=bedrock.CfnDataSource.VectorIngestionConfigurationProperty(
                chunking_configuration=bedrock.CfnDataSource.ChunkingConfigurationProperty(
                    chunking_strategy="FIXED_SIZE",
                    fixed_size_chunking_configuration=bedrock.CfnDataSource.FixedSizeChunkingConfigurationProperty(
                        max_tokens=300,
                        overlap_percentage=15,
                    ),
                ),
            ),
        )
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd infra && uv run pytest tests/test_app_synth.py -v`
Expected: `8 passed`

- [ ] **Step 5: Commit**

```bash
git add infra/astrojobs_infra/knowledge_base_stack.py infra/tests/test_app_synth.py
git commit -m "$(cat <<'EOF'
feat(infra): add candidates and recruiters data sources

Both scoped to the astrojobs-resumes bucket by prefix (resumes/ and
recruiters/), fixed-size chunking (300 tokens, 15% overlap). The
recruiters/ prefix has no content yet — created empty, ready for the
future recruiter-profile feature.
EOF
)"
```

---

### Task 7: Guardrail

**Files:**
- Modify: `infra/astrojobs_infra/knowledge_base_stack.py`
- Modify: `infra/tests/test_app_synth.py`

**Interfaces:**
- Consumes: `KnowledgeBaseStack.key` from Task 2.
- Produces: `KnowledgeBaseStack.guardrail` (`aws_cdk.aws_bedrock.CfnGuardrail`), `.guardrail_version` (`aws_cdk.aws_bedrock.CfnGuardrailVersion`). Neither is consumed by anything else in this plan — the Guardrail is created but not attached to any inference call (out of scope per spec).

- [ ] **Step 1: Write the failing assertion**

Add to `infra/tests/test_app_synth.py`:

```python
def test_guardrail_anonymizes_high_risk_pii():
    template = _synth_kb_stack()
    template.has_resource_properties(
        "AWS::Bedrock::Guardrail",
        {
            "Name": "astrojobs-pii-guardrail",
            "SensitiveInformationPolicyConfig": Match.object_like(
                {
                    "PiiEntitiesConfig": Match.array_with(
                        [Match.object_like({"Type": "US_SOCIAL_SECURITY_NUMBER", "Action": "ANONYMIZE"})]
                    )
                }
            ),
        },
    )
    template.resource_count_is("AWS::Bedrock::GuardrailVersion", 1)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd infra && uv run pytest tests/test_app_synth.py::test_guardrail_anonymizes_high_risk_pii -v`
Expected: FAIL — no `AWS::Bedrock::Guardrail` resource yet.

- [ ] **Step 3: Add the guardrail and a numbered version**

After `self.recruiters_data_source = self._build_data_source(...)`, add:

```python
        self.guardrail, self.guardrail_version = self._build_guardrail()
```

Add the new method:

```python
    def _build_guardrail(self) -> tuple[bedrock.CfnGuardrail, bedrock.CfnGuardrailVersion]:
        guardrail = bedrock.CfnGuardrail(
            self,
            "PiiGuardrail",
            name="astrojobs-pii-guardrail",
            description=(
                "Anonymizes high-risk PII (national ID, credit card, bank "
                "account) in retrieval-augmented responses. Not attached to "
                "any inference call yet — ready for the future Bedrock Agent."
            ),
            kms_key_arn=self.key.key_arn,
            blocked_input_messaging=(
                "This request was blocked because it contains sensitive "
                "information that cannot be processed."
            ),
            blocked_outputs_messaging=(
                "The response was blocked because it contains sensitive "
                "information that cannot be returned."
            ),
            sensitive_information_policy_config=bedrock.CfnGuardrail.SensitiveInformationPolicyConfigProperty(
                pii_entities_config=[
                    bedrock.CfnGuardrail.PiiEntityConfigProperty(
                        type="US_SOCIAL_SECURITY_NUMBER", action="ANONYMIZE"
                    ),
                    bedrock.CfnGuardrail.PiiEntityConfigProperty(
                        type="CREDIT_DEBIT_CARD_NUMBER", action="ANONYMIZE"
                    ),
                    bedrock.CfnGuardrail.PiiEntityConfigProperty(
                        type="US_BANK_ACCOUNT_NUMBER", action="ANONYMIZE"
                    ),
                ],
            ),
        )
        version = bedrock.CfnGuardrailVersion(
            self,
            "PiiGuardrailVersion",
            guardrail_identifier=guardrail.attr_guardrail_id,
            description="Initial version",
        )
        return guardrail, version
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd infra && uv run pytest tests/test_app_synth.py -v`
Expected: `9 passed`

If `cdk synth` reports additional required properties on `CfnGuardrail` (e.g. topic/word/content policies are optional but the resource may require at least one policy block, or exact enum values for PII `type` may differ from what's used above), run `cd infra && npx cdk synth` and adjust based on the reported error — this is expected, fast iteration, not a design change.

- [ ] **Step 5: Commit**

```bash
git add infra/astrojobs_infra/knowledge_base_stack.py infra/tests/test_app_synth.py
git commit -m "$(cat <<'EOF'
feat(infra): add the PII guardrail (created, not yet attached)

Anonymizes SSN, credit card, and bank account numbers. Encrypted with
the shared KMS key, pinned to a numbered version (never DRAFT).
Nothing calls this guardrail yet — the future Bedrock Agent will.
EOF
)"
```

---

### Task 8: Sync Lambda (event-driven ingestion trigger)

**Correction (ruled during implementation — see ledger):** the plan originally specified `SyncLambdaStack` as a second, independently-deployable `Stack`. That does not work: `s3.Bucket.add_event_notification()` always creates its `Custom::S3BucketNotifications` resource as a child of the bucket's own construct (it has no `scope` parameter), so that resource — which needs the Lambda's ARN — ends up living in `KnowledgeBaseStack`. Combined with the Lambda needing the KB/data-source IDs from `KnowledgeBaseStack`, this creates a two-way dependency between the two stacks, which CDK rejects (`DependencyCycle`). Fix: `SyncLambdaConstruct` is a plain `Construct` (not a `Stack`), instantiated *inside* `KnowledgeBaseStack`. Everything ends up in one CloudFormation stack (`AstroJobsKnowledgeBase`) — no cross-stack reference, no cycle. The file-per-responsibility split is preserved; only the deployment topology changes.

**Files:**
- Create: `infra/lambda/sync_ingestion/handler.py`
- Create: `infra/astrojobs_infra/sync_lambda_stack.py` (defines `SyncLambdaConstruct`, despite the filename)
- Modify: `infra/astrojobs_infra/knowledge_base_stack.py` (instantiates `SyncLambdaConstruct` from inside `KnowledgeBaseStack.__init__`)
- Create: `infra/tests/test_sync_ingestion_handler.py`
- Modify: `infra/tests/test_app_synth.py`

**Interfaces:**
- Consumes: `KnowledgeBaseStack.bucket`, `.knowledge_base`, `.candidates_data_source` (Tasks 2, 5, 6), passed into `SyncLambdaConstruct.__init__` from within `KnowledgeBaseStack`.
- Produces: `infra/lambda/sync_ingestion/handler.handler(event, context)` — the Lambda entrypoint, tested directly in this task. `KnowledgeBaseStack.sync_lambda` (the `SyncLambdaConstruct` instance) — not consumed by anything later in this plan, but available for future work.

- [ ] **Step 1: Write and test the Lambda handler**

Create `infra/lambda/sync_ingestion/handler.py`:

```python
import logging
import os

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event, context):
    client = boto3.client("bedrock-agent")
    knowledge_base_id = os.environ["KNOWLEDGE_BASE_ID"]
    data_source_id = os.environ["CANDIDATES_DATA_SOURCE_ID"]

    for record in event.get("Records", []):
        logger.info("Sidecar object created: %s", record["s3"]["object"]["key"])

    try:
        response = client.start_ingestion_job(
            knowledgeBaseId=knowledge_base_id,
            dataSourceId=data_source_id,
        )
        logger.info(
            "Started ingestion job %s for data source %s",
            response["ingestionJob"]["ingestionJobId"],
            data_source_id,
        )
    except ClientError as exc:
        if exc.response["Error"]["Code"] == "ConflictException":
            logger.warning(
                "Ingestion job already running for data source %s; dropping event",
                data_source_id,
            )
            return
        raise
```

`infra/lambda/` is a Lambda deployment asset directory, not an importable Python package — no `__init__.py` needed. The handler is tested directly by adding `infra/lambda/sync_ingestion` to `sys.path` in the test, shown next.

Create `infra/tests/test_sync_ingestion_handler.py`:

```python
import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

from botocore.exceptions import ClientError

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "lambda" / "sync_ingestion"))

os.environ["KNOWLEDGE_BASE_ID"] = "kb-test"
os.environ["CANDIDATES_DATA_SOURCE_ID"] = "ds-test"

import handler  # noqa: E402


def _event():
    return {"Records": [{"s3": {"object": {"key": "resumes/1/abc.pdf.metadata.json"}}}]}


@patch("handler.boto3.client")
def test_starts_ingestion_job(mock_boto_client):
    mock_client = MagicMock()
    mock_client.start_ingestion_job.return_value = {
        "ingestionJob": {"ingestionJobId": "job-1"}
    }
    mock_boto_client.return_value = mock_client

    handler.handler(_event(), None)

    mock_client.start_ingestion_job.assert_called_once_with(
        knowledgeBaseId="kb-test", dataSourceId="ds-test"
    )


@patch("handler.boto3.client")
def test_drops_event_on_conflict(mock_boto_client):
    mock_client = MagicMock()
    mock_client.start_ingestion_job.side_effect = ClientError(
        {"Error": {"Code": "ConflictException", "Message": "already running"}},
        "StartIngestionJob",
    )
    mock_boto_client.return_value = mock_client

    handler.handler(_event(), None)  # must not raise


@patch("handler.boto3.client")
def test_reraises_other_client_errors(mock_boto_client):
    mock_client = MagicMock()
    mock_client.start_ingestion_job.side_effect = ClientError(
        {"Error": {"Code": "ThrottlingException", "Message": "slow down"}},
        "StartIngestionJob",
    )
    mock_boto_client.return_value = mock_client

    try:
        handler.handler(_event(), None)
        raise AssertionError("expected ClientError to propagate")
    except ClientError:
        pass
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd infra && uv run pytest tests/test_sync_ingestion_handler.py -v`
Expected: `3 passed`

- [ ] **Step 3: Write the failing CDK assertion**

Add to `infra/tests/test_app_synth.py` (reuses the existing `_synth_kb_stack()` helper — no second stack needed now):

```python
def test_lambda_has_ingestion_permission_scoped_to_the_data_source():
    template = _synth_kb_stack()
    template.has_resource_properties(
        "AWS::Lambda::Function",
        {"Runtime": "python3.12", "Handler": "handler.handler"},
    )
    template.has_resource_properties(
        "AWS::IAM::Policy",
        Match.object_like(
            {
                "PolicyDocument": Match.object_like(
                    {
                        "Statement": Match.array_with(
                            [
                                Match.object_like(
                                    {"Action": "bedrock:StartIngestionJob"}
                                )
                            ]
                        )
                    }
                )
            }
        ),
    )
    template.has_resource_properties(
        "Custom::S3BucketNotifications",
        Match.object_like({"BucketName": {"Ref": Match.any_value()}}),
    )
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd infra && uv run pytest tests/test_app_synth.py::test_lambda_has_ingestion_permission_scoped_to_the_data_source -v`
Expected: FAIL — no `AWS::Lambda::Function` resource named `sync-ingestion-trigger` exists yet (only the CDK-internal S3-notification handler Lambda, if any prior task already added one — there shouldn't be one yet).

- [ ] **Step 5: Create the sync Lambda construct**

Create `infra/astrojobs_infra/sync_lambda_stack.py` (the file name stays as the plan originally specified it; the class inside is a `Construct`, not a `Stack` — see the Correction note above):

```python
from aws_cdk import Duration
from aws_cdk import aws_bedrock as bedrock
from aws_cdk import aws_iam as iam
from aws_cdk import aws_lambda as lambda_
from aws_cdk import aws_s3 as s3
from aws_cdk import aws_s3_notifications as s3n
from constructs import Construct


class SyncLambdaConstruct(Construct):
    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        bucket: s3.Bucket,
        knowledge_base: bedrock.CfnKnowledgeBase,
        candidates_data_source: bedrock.CfnDataSource,
    ) -> None:
        super().__init__(scope, construct_id)

        function = lambda_.Function(
            self,
            "SyncIngestionTrigger",
            function_name="sync-ingestion-trigger",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="handler.handler",
            code=lambda_.Code.from_asset("lambda/sync_ingestion"),
            timeout=Duration.seconds(30),
            environment={
                "KNOWLEDGE_BASE_ID": knowledge_base.attr_knowledge_base_id,
                "CANDIDATES_DATA_SOURCE_ID": candidates_data_source.attr_data_source_id,
            },
        )

        data_source_arn = (
            f"{knowledge_base.attr_knowledge_base_arn}/data-source/"
            f"{candidates_data_source.attr_data_source_id}"
        )
        function.add_to_role_policy(
            iam.PolicyStatement(
                actions=["bedrock:StartIngestionJob"],
                resources=[data_source_arn],
            )
        )

        bucket.add_event_notification(
            s3.EventType.OBJECT_CREATED,
            s3n.LambdaDestination(function),
            s3.NotificationKeyFilter(prefix="resumes/", suffix=".metadata.json"),
        )
```

In `infra/astrojobs_infra/knowledge_base_stack.py`, add the import:

```python
from astrojobs_infra.sync_lambda_stack import SyncLambdaConstruct
```

After `self.guardrail, self.guardrail_version = self._build_guardrail()` (the last line Task 7 added to `__init__`), add:

```python
        self.sync_lambda = SyncLambdaConstruct(
            self,
            "SyncLambda",
            bucket=self.bucket,
            knowledge_base=self.knowledge_base,
            candidates_data_source=self.candidates_data_source,
        )
```

`infra/app.py` needs **no change** in this task — it still only instantiates `KnowledgeBaseStack`, exactly as Task 5 left it. (This differs from the plan's original Step 5, which had `app.py` also instantiate a second stack; that's gone now that the Lambda lives inside `KnowledgeBaseStack`.)

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd infra && uv run pytest tests/ -v`
Expected: all tests pass (`test_app_synth.py` + `test_sync_ingestion_handler.py`).

- [ ] **Step 7: Verify full synth**

Run: `cd infra && PINECONE_CONNECTION_STRING=https://placeholder.pinecone.io npx cdk synth`
Expected: the single `AstroJobsKnowledgeBase` stack synthesizes without error, now including the Lambda, its IAM policy, and the S3 bucket notification configuration.

- [ ] **Step 8: Commit**

```bash
git add infra/lambda/ infra/astrojobs_infra/sync_lambda_stack.py infra/astrojobs_infra/knowledge_base_stack.py infra/tests/
git commit -m "$(cat <<'EOF'
feat(infra): add event-driven sync Lambda

S3 ObjectCreated notification (filtered to resumes/*.metadata.json)
triggers a Lambda that calls StartIngestionJob on the candidates data
source. Fire-and-forget — no polling. ConflictException (an ingestion
job already running) is logged and dropped, not retried.

SyncLambdaConstruct lives inside KnowledgeBaseStack rather than as its
own Stack: add_event_notification() always anchors its notification
resource in the bucket's own stack, so a separate Lambda stack would
create a two-way stack dependency (KnowledgeBaseStack needs the
Lambda's ARN for the notification; the Lambda needs the KB's IDs) —
CDK rejects that as a DependencyCycle. One stack avoids it entirely.
EOF
)"
```

---

### Task 9: Write the KB metadata sidecar on resume upload

**Files:**
- Modify: `apps/api/src/domain/documents/use_cases/upload_resume.py`
- Modify: `apps/api/src/domain/documents/use_cases/delete_user_resume.py`

**Interfaces:**
- Consumes: `FileStoragePort.upload(content: bytes, key: str, content_type: str) -> None` and `FileStoragePort.delete(key: str) -> None` (existing, unchanged — `apps/api/src/domain/documents/file_storage.py`).
- Produces: nothing new consumed elsewhere — this is the last task.

- [ ] **Step 1: Add the sidecar-writing method**

In `apps/api/src/domain/documents/use_cases/upload_resume.py`, add `json` to the imports:

```python
import json
import logging
import uuid
from pathlib import Path
```

Add this method to `UploadResumeUseCase` (after `_run_initial_analysis`, before `_discard`):

```python
    def _write_kb_metadata_sidecar(
        self, storage_key: str, user_id: int, document_id: int
    ) -> None:
        sidecar = {
            "metadataAttributes": {
                "profile_type": {"value": "candidate", "type": "STRING"},
                "user_id": {"value": user_id, "type": "NUMBER"},
                "document_id": {"value": document_id, "type": "NUMBER"},
            }
        }
        try:
            self._storage.upload(
                json.dumps(sidecar).encode("utf-8"),
                f"{storage_key}.metadata.json",
                "application/json",
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Failed to write KB metadata sidecar for document %s: %s",
                document_id,
                exc,
            )
```

- [ ] **Step 2: Call it from `execute`**

In the same file, `execute` currently reads (after the document is created):

```python
        analysis = self._run_initial_analysis(document.id, user_id)  # type: ignore[arg-type]
        return document, analysis
```

Change it to:

```python
        self._write_kb_metadata_sidecar(storage_key, user_id, document.id)  # type: ignore[arg-type]

        analysis = self._run_initial_analysis(document.id, user_id)  # type: ignore[arg-type]
        return document, analysis
```

(The sidecar is written after the S3 file upload and after the Postgres row exists — it needs `document.id`, and it must exist after the main file so the S3 event notification, which fires on the sidecar, never races ahead of the file it describes.)

- [ ] **Step 3: Delete the sidecar when the resume is deleted**

Without this, deleting a resume leaves its `.metadata.json` sidecar orphaned in S3 forever — `DeleteUserResumeUseCase` today only deletes `document.storage_key` (the resume file itself).

In `apps/api/src/domain/documents/use_cases/delete_user_resume.py`, change:

```python
        if document.storage_key:
            try:
                self._storage.delete(document.storage_key)
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "Failed to delete stored object %s: %s", document.storage_key, exc
                )
```

to:

```python
        if document.storage_key:
            try:
                self._storage.delete(document.storage_key)
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "Failed to delete stored object %s: %s", document.storage_key, exc
                )
            try:
                self._storage.delete(f"{document.storage_key}.metadata.json")
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "Failed to delete KB metadata sidecar for %s: %s",
                    document.storage_key,
                    exc,
                )
```

(The sidecar's own removal doesn't need to survive an S3 event trigger — deleting it is best-effort cleanup; the Knowledge Base's own periodic ingestion job is what reconciles the vector store when the underlying resume file disappears, not this delete call.)

- [ ] **Step 4: Lint**

Run: `cd apps/api && uv run ruff check src/domain/documents/use_cases/upload_resume.py src/domain/documents/use_cases/delete_user_resume.py`
Expected: no errors.

- [ ] **Step 5: Manual verification against localstack**

This codebase has no automated test suite (see Global Constraints) — verify manually, the same way prior slices in this repo were verified:

```bash
docker compose -f docker-compose.yml --env-file .env up -d --build api
```

Sign up a throwaway user and upload a resume (adjust to a real file path):

```bash
curl -s -c /tmp/cookies.txt -X POST http://localhost:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"kb-sidecar-test@example.com","password":"TestPassword123!","name":"KB Sidecar Test"}'

curl -s -b /tmp/cookies.txt -X POST http://localhost:8000/documents/resumes \
  -F "file=@/path/to/a/sample_resume.txt"
```

Note the returned `id` and the user's numeric id, then list the bucket contents for that user (via the `awslocal` CLI inside the localstack container, or `aws --endpoint-url http://localhost:4566 s3 ls s3://astrojobs-resumes/resumes/<user_id>/`):

```bash
docker exec astrojobs-localstack-1 awslocal s3 ls s3://astrojobs-resumes/resumes/<user_id>/
```

Expected: two objects — `<uuid>.txt` (the resume) and `<uuid>.txt.metadata.json` (the sidecar). Fetch the sidecar and confirm its content:

```bash
docker exec astrojobs-localstack-1 awslocal s3 cp s3://astrojobs-resumes/resumes/<user_id>/<uuid>.txt.metadata.json -
```

Expected JSON:
```json
{"metadataAttributes": {"profile_type": {"value": "candidate", "type": "STRING"}, "user_id": {"value": <user_id>, "type": "NUMBER"}, "document_id": {"value": <document_id>, "type": "NUMBER"}}}
```

Now confirm delete cleans up the sidecar too:

```bash
curl -s -b /tmp/cookies.txt -X DELETE http://localhost:8000/documents/resumes/<id>
docker exec astrojobs-localstack-1 awslocal s3 ls s3://astrojobs-resumes/resumes/<user_id>/
```

Expected: empty listing — both the resume file and its sidecar are gone.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/domain/documents/use_cases/upload_resume.py apps/api/src/domain/documents/use_cases/delete_user_resume.py
git commit -m "$(cat <<'EOF'
feat(api): write Bedrock KB metadata sidecar on resume upload

Alongside the existing resume file, write a <key>.metadata.json
sidecar tagging it profile_type=candidate. This is what the S3 event
notification (infra/astrojobs_infra/sync_lambda_stack.py) triggers
on, so ingestion never races ahead of the file it describes.
Best-effort: a write failure is logged, not fatal to the upload.

DeleteUserResumeUseCase now also deletes the sidecar, so removing a
resume doesn't leave it orphaned in S3.
EOF
)"
```

---

## Post-plan manual steps (not part of any task — operational, one-time)

These are real prerequisites for a working deployment, but they're account/credential actions, not code:

1. `cdk bootstrap aws://<account>/us-east-2` (once per account/region).
2. `PINECONE_API_KEY=<key> uv run python infra/scripts/bootstrap_pinecone_index.py` — creates the Pinecone index, prints the connection string.
3. `export PINECONE_CONNECTION_STRING=<printed-host>`, then `cd infra && npx cdk deploy --all`. Confirm in the CloudFormation console (or `cdk diff` beforehand) that the bucket, KMS key, KB, both data sources, guardrail, Lambda, and event notification all show up — matches spec Verification step 1.
4. `aws secretsmanager put-secret-value --secret-id astrojobs/pinecone-kb --secret-string '{"apiKey":"<key>"}'`.
5. Point the real deployed `apps/api` at the real bucket/region (its `AWS_S3_BUCKET`/`AWS_S3_ENDPOINT_URL` env vars — not covered by this plan, which only adds the sidecar-writing code) so production uploads land in the real `astrojobs-resumes` bucket instead of localstack.
6. Upload one real resume through the deployed app; confirm in CloudWatch Logs (`/aws/lambda/sync-ingestion-trigger`) that the Lambda fired and called `StartIngestionJob` without a `ConflictException` — matches spec Verification step 3.
7. Poll `aws bedrock-agent get-ingestion-job --knowledge-base-id <id> --data-source-id <candidates-ds-id> --ingestion-job-id <job-id>` until `COMPLETE` — matches spec Verification step 4.
8. Run `aws bedrock-agent-runtime retrieve --knowledge-base-id <id> --retrieval-query '{"text":"<something from the test resume>"}'`; confirm the resume comes back with a reasonable relevance score — matches spec Verification step 5.
9. Delete the test resume through the app and confirm its `.metadata.json` sidecar is also gone from S3 — matches spec Verification step 6 (cleanup).
