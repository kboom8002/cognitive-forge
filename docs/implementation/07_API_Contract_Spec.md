# 07. API Contract Spec

Success response: { data, meta }. Error response: { error: { code, message, details } }.

## Public APIs
GET /api/public/apps/:slug
POST /api/public/apps/:slug/run
POST /api/public/apps/:slug/graph-run
GET /api/public/graph-runs/:id

Resolve app by slug server-side. Do not accept version IDs from public requests. Sanitize all responses recursively.
