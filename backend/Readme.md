# Real-Time Collaborative Kanban Board Backend

A production-grade, multi-tenant backend API and WebSocket server built with Node.js, Express, Socket.io, and Prisma (PostgreSQL).

## 🚀 Setup Instructions

1. **Install Dependencies:**
   ```bash
   npm install
Environment Variables (.env):

Code snippet
# PostgreSQL Connection (Supabase/PgBouncer)
DATABASE_URL="postgres://user:password@host:6543/db?pgbouncer=true"
DIRECT_URL="postgres://user:password@host:5432/db"

# JWT Secret
JWT_SECRET="your-super-secret-key"

# Optional: Redis for WebSocket Scaling
REDIS_URL="redis://localhost:6379"
Database Migrations:

Bash
npx prisma migrate dev --name init
npx prisma generate
Run the Server:

Bash
npm run dev
🏗 Architecture & Tenancy Model
This system utilizes a Strict Multi-Tenant Architecture based on Row-Level/Query-Level isolation:

Hierarchy: Organization -> Tenant (Branch) -> Boards.

Data Isolation: Every business entity (Board, Column, Task) contains a tenantId. Every single database query strictly requires this tenantId, mathematically preventing cross-tenant data leakage.

Role-Based Access (RBAC): Users are tied to tenants via a Membership table, allowing them to have different roles (e.g., TENANT_ADMIN, MEMBER) in different branches.

⚡ Concurrency & Conflict Resolution Strategy
Handling real-time drag-and-drop across multiple users introduces complex edge cases like concurrent edits.

We handle this using Optimistic Locking:

Every Task record has a version integer.

When a user moves or edits a task, they send their known version to the server.

The server attempts an atomic update: UPDATE tasks SET ... WHERE id = ? AND version = ?.

Resolution: If the update fails (count === 0), it means another user modified the task first. The server rejects the update and emits a task:conflict WebSocket event to the client, triggering an optimistic UI rollback.

🌐 WebSocket Scaling
Socket.io is scoped strictly using tenantId rooms. To scale horizontally to multiple Node.js instances, a Redis Adapter is optionally configured. This Pub/Sub model ensures that a user connected to Server A will see real-time cursor/drag events from a user connected to Server B