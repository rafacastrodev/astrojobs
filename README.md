# AstroJobs

AstroJobs is an AI-first platform that helps users create and improve their profiles, automate applications, and match with relevant job opportunities.

- [System Requirements](http://github.com/rafacastrodev/astrojobs/blob/main/docs/system-requirements.md)
- [Tech Stack](http://github.com/rafacastrodev/astrojobs/blob/main/docs/tech-stack.md)
- [Next Steps](http://github.com/rafacastrodev/astrojobs/blob/main/docs/next-steps.md)

## Decisions and Trade-offs

1. Monorepo Architecture

- I put the backend and the frontend in one monorepo, so we can create a contract between the front and back using protocols like gRPC, GraphQL or use generated types from OpenAI. The types was generated using OpenAI, but I decided to not implement now. The CI/CD is easily managed in a monorepo too. The negative point is the IDE tha can sometimes get confused about the language attaches the wrong language server or stale diagnostics until you reload the window.

2. Frontend

- I choose the TanStack that is a framework that you're free to connect with any library or framework like Next.js, Svelte, Vue or React.js. I choose Vite and React because the dashboard is more client side, and we can use React Server Components or server with tunnel like the landing page using NGINX, that is cheaper.

3. API

- The API is built with FastAPI, that is simple Python framework. Request and response contracts are validated with Pydantic, by default and OpenAI docs are generated from those models, and dependency injection keeps auth, persistence, and AI services testable. Python also matches the rest of the pipeline, like SQLAlchemy, embeddings, and AWS SDKs, using S3, Bedrock and other services, so we do not split the backend between a JS API and a separate Python worker.
- The tradeoff is operational, because keeping a monorepo with Python and TypeScript It's harder than just use only TypeScript, but to work with AI and embedding models Python It's a better choice.

4. Infrastructure and AI

- Storage with buckets in S3, keeping resumes, then embeddings are stored in Pinecone in production (pgVector in development). Bedrock supplies the LLM/embedding path and, where configured, Knowledge Base retrieval, so almost everything is from a single service.
- The downsides are the latency, since resumes live in S3 and vectors in Pinecone. The Vercel AI SDK on a Next.js route would feel snappier, but we would resend document text on every request and give up a dedicated vector store and Bedrock’s free LLM is not very strong, so extraction and matching are cheaper, but less accurate than a paid model.
