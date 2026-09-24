# ImageGen

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The ImageGen subsystem handles **6 routes**.

## Routes

- `GET` `/api/image-gen/models` `[inferred]`
  `backend/routes/imageGen.js`
- `POST` `/api/image-gen/jobs` `[inferred]`
  `backend/routes/imageGen.js`
- `POST` `/api/image-gen/jobs/estimate` `[inferred]`
  `backend/routes/imageGen.js`
- `POST` `/api/image-gen/alchemy` `[inferred]`
  `backend/routes/imageGen.js`
- `GET` `/api/image-gen/alchemy/:jobId` params(jobId) `[inferred]`
  `backend/routes/imageGen.js`
- `GET` `/api/image-gen/jobs/:jobId` params(jobId) `[inferred]`
  `backend/routes/imageGen.js`

## Source Files

Read these before implementing or modifying this subsystem:
- `backend/routes/imageGen.js`

---
_Back to [overview.md](./overview.md)_