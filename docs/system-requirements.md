# Requirements

## Non-Technical Requirements

### User Profiles

- [x] Users can create either a professional or recruiter profile.
- [x] Each user has access only to features associated with their profile type.
- [x] Professionals can manage their professional information and resumes.
- [x] Recruiters can create and manage job openings.

### Resumes and Job Openings

- [x] Professionals can upload a resume.
- [x] Recruiters can create new job openings.
- [x] Job openings include a title, required technologies, seniority level, work arrangement, location, contract type, and description.
- [x] The system analyzes uploaded resumes and extracts relevant professional information.

### Job Applications

- [x] Professionals can browse available job openings.
- [x] Professionals can apply for job openings using an uploaded resume.
- [x] Professionals can view the status of their applications.
- [x] Duplicate applications to the same job opening are prevented.

### Recruiter Application Management

- [x] Recruiters can view applications submitted to their own job openings.
- [x] Recruiters can access the candidate’s relevant professional information.
- [x] Recruiters can update an application’s status.
- [x] Professionals are informed when their application status changes.

## Technical Requirements

### Authentication and Authorization

- [x] The system must support `professional` and `recruiter` user roles.
- [x] Protected endpoints must require authenticated access.
- [x] Role-based authorization must prevent professionals from accessing recruiter operations and vice versa.
- [x] Users must only access resumes, jobs, and applications they own or are authorized to view.

### Resume Processing

- [x] The API must accept PDF, DOCX, TXT, and Markdown resume files.
- [x] Uploaded files must be validated for type, size, and unsafe content.
- [x] Personally identifiable information must be removed before sending resume content to AI services.
- [x] Resume analysis must return structured data, including ATS score, ATS category, summary, findings, experience, technologies, and companies.
- [x] Resume embeddings must be stored in pgVector during development and Pinecone in production.
- [x] Failed analysis or indexing operations must support retry without requiring another upload.

### Job Management

- [ ] Recruiters must be able to create, list, update, and close their own job openings.
- [x] Job payloads must be validated on the backend.
- [x] Technologies must be selected from the canonical technology catalog.
- [x] Technology names and aliases must be normalized before storage.
- [x] Job embeddings must use the same OpenAI embedding model and dimensions as resume embeddings.

### Applications

- [x] The database must store the professional, recruiter-owned job, selected resume, application status, and timestamps.
- [x] A database constraint must prevent duplicate applications for the same professional and job.
- [x] Applying must verify that the job is open and the resume belongs to the professional.
- [x] Recruiters must only receive applications associated with jobs they own.
- [x] Application statuses must use a controlled set such as `submitted`, `reviewing`, `accepted`, and `rejected`.
- [x] Status changes must be validated and recorded.

### API and Interface

- [x] The API must expose authenticated endpoints for submitting and listing applications.
- [x] Recruiter endpoints must support listing applications by job opening.
- [x] The frontend must provide loading, success, empty, and error states.
- [x] API request and response contracts must be documented in OpenAPI.
- [x] Generated TypeScript types must remain synchronized with the API schema.

### Quality and Security

- [x] Business rules must be covered by automated tests.
- [x] Ownership and role checks must have authorization tests.
- [x] User-facing errors must not expose internal services, credentials, or stack traces.
- [ ] Resume and application data must be deleted or anonymized according to the platform’s privacy policy.
- [x] Database migrations must preserve existing users, resumes, jobs, analyses, and applications.
