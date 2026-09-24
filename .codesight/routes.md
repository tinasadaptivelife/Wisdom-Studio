# Routes

## CRUD Resources

- **`/api/projects`** GET | POST | GET/:id | PUT/:id | DELETE/:id → Project

## Other Routes

- `GET` `/api/health` `[inferred]`
- `GET` `/api/image-gen/models` `[inferred]` ✓
- `POST` `/api/image-gen/jobs` `[inferred]` ✓
- `POST` `/api/image-gen/jobs/estimate` `[inferred]` ✓
- `POST` `/api/image-gen/alchemy` `[inferred]` ✓
- `GET` `/api/image-gen/alchemy/:jobId` params(jobId) `[inferred]` ✓
- `GET` `/api/image-gen/jobs/:jobId` params(jobId) `[inferred]` ✓
- `GET` `/api/projects/:id/pdf` params(id) [db] `[inferred]` ✓
- `POST` `/api/import/docx` `[inferred]` ✓
