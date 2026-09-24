# Projects

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Projects subsystem handles **6 routes** and touches: db.

## Routes

- `GET` `/api/projects` [db] `[inferred]`
  `backend/routes/projects.js`
- `GET` `/api/projects/:id` params(id) [db] `[inferred]`
  `backend/routes/projects.js`
- `POST` `/api/projects` [db] `[inferred]`
  `backend/routes/projects.js`
- `PUT` `/api/projects/:id` params(id) [db] `[inferred]`
  `backend/routes/projects.js`
- `GET` `/api/projects/:id/pdf` params(id) [db] `[inferred]`
  `backend/routes/projects.js`
- `DELETE` `/api/projects/:id` params(id) [db] `[inferred]`
  `backend/routes/projects.js`

## Source Files

Read these before implementing or modifying this subsystem:
- `backend/routes/projects.js`

---
_Back to [overview.md](./overview.md)_