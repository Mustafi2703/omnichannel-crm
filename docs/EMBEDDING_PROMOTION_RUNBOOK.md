# Embedding promotion runbook

This application uses one embedding index per environment. Chat configuration
(`LLM_*`, `NVIDIA_*`, and `OPENAI_*`) remains independent from retrieval.

## Index identity

Every chunk belongs to a tenant-scoped identity:

`provider / model / dimensions / version`

Retrieval embeds the customer message with the active environment configuration
and filters to that exact identity. A staging NVIDIA vector can therefore never
be searched by production OpenAI traffic.

The app does not dual-write embedding indexes. Re-indexing a document replaces
its chunks with the configured environment's index. Staging and production use
separate databases and preserve their own index for testing and launch history.

## Staging: NVIDIA validation

1. Apply the `20260901010000_versioned_embedding_indexes` migration.
2. Put the exact NVIDIA embedding endpoint, model name, output dimension, and
   credential in the staging server's secret `.env` file. Do not use chat
   settings as embedding settings.

   ```dotenv
   EMBEDDING_PROVIDER=nvidia
   EMBEDDING_API_KEY=<NVIDIA embedding credential>
   EMBEDDING_BASE_URL=<exact NVIDIA OpenAI-compatible embedding endpoint>
   EMBEDDING_MODEL=<exact NVIDIA embedding model>
   EMBEDDING_DIMENSIONS=<confirmed model output dimension>
   EMBEDDING_INDEX_VERSION=staging-v1
   ```

3. Run the preflight before uploading any document:

   ```bash
   docker compose run --rm app npm run embeddings:prepare -- ea-global-water-staging
   ```

   It sends one harmless query-type smoke-test string, verifies the returned dimension
   matches `EMBEDDING_DIMENSIONS`, creates the matching partial HNSW pgvector
   index, and prints the resulting identity. A mismatch fails closed.
   NVIDIA's 2,048-dimensional output uses pgvector's `halfvec` HNSW expression:
   the source vector is retained, while the ANN index/search representation is
   half precision to avoid pgvector's 2,000-dimension `vector` HNSW limit.
4. Upload only client-approved EA Global Water documents. The repository's
   `EAGLOBALWATER_SAFE_KNOWLEDGE_BASE.md` is currently a draft and must be
   approved before it is indexed for client use.
5. Complete `docs/evaluation/EA_GLOBAL_WATER_STAGING_EMBEDDING_EVAL.csv` using
   the widget and inbox in normal usage. Record source, behaviour, handoff,
   latency, and failures for every row.
6. Approve NVIDIA only when retrieval and safety results meet the agreed gate.
   Pricing/discount, medical, unsupported, and maintenance questions must
   demonstrate the required handoff or limitation behaviour.

## Production: OpenAI promotion rehearsal and cutover

After NVIDIA staging approval, configure the production server only:

```dotenv
EMBEDDING_PROVIDER=openai
EMBEDDING_API_KEY=<production OpenAI key>
EMBEDDING_BASE_URL=
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
EMBEDDING_INDEX_VERSION=production-v1
```

Run the same preflight with the production tenant slug, then upload/re-index the
same approved source documents. Run the exact evaluation CSV offline before
launch. Production may launch only if the OpenAI result is at least as safe and
useful as the approved staging result.

Production retrieval selects only `openai / text-embedding-3-small / 1536 /
production-v1`. Keep the NVIDIA staging index in staging for validation only;
it never serves production traffic.

## Ongoing approved knowledge changes

1. Update and evaluate the approved source in NVIDIA staging.
2. After approval, update and evaluate the same source in OpenAI production.

This is an intentional promotion process, not permanent dual indexing. Change
`EMBEDDING_INDEX_VERSION` only for a planned re-index/re-evaluation, never as a
silent runtime experiment.
