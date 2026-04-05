# API Documentation - Multi-Tenant Kanban Board

## Base URL
```
http://localhost:8080/api/v1
```

## Authentication

All requests require JWT authentication via Authorization header:
```
Authorization: Bearer <jwt_token>
```

Tenant context provided via header:
```
x-tenant-id: <tenant_id>
```

---

## Authentication Endpoints

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "token": "jwt_token_here"
}
```

### POST /auth/login
Authenticate user and get JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "token": "jwt_token_here"
}
```

---

## Organization Management

### POST /organizations
Create a new organization with initial tenant. Auto-assigns creator as ORG_ADMIN.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "orgName": "Acme Corp",
  "tenantName": "Bangalore Office"
}
```

**Response (201):**
```json
{
  "message": "Organization created successfully",
  "organization": {
    "id": "org_id",
    "name": "Acme Corp"
  },
  "tenant": {
    "id": "tenant_id",
    "name": "Bangalore Office"
  },
  "membership": {
    "userId": "user_id",
    "organizationId": "org_id",
    "tenantId": "tenant_id",
    "role": "ORG_ADMIN"
  }
}
```

### POST /organizations/tenants
Create a new tenant within an organization. Requires ORG_ADMIN role.

**Headers:**
- `Authorization: Bearer <token>`
- `x-tenant-id: <existing_tenant_id>`

**Request Body:**
```json
{
  "organizationId": "org_id",
  "tenantName": "Delhi Office"
}
```

**Response (201):**
```json
{
  "tenant": {
    "id": "tenant_id",
    "name": "Delhi Office",
    "organizationId": "org_id"
  }
}
```

### POST /organizations/invite
Invite a user to join a tenant. Requires ORG_ADMIN or TENANT_ADMIN role.

**Headers:**
- `Authorization: Bearer <token>`
- `x-tenant-id: <tenant_id>`

**Request Body:**
```json
{
  "email": "user@example.com",
  "role": "MEMBER"
}
```

**Response (201):**
```json
{
  "message": "User invited successfully",
  "membership": {
    "userId": "user_id",
    "organizationId": "org_id",
    "tenantId": "tenant_id",
    "role": "MEMBER"
  }
}
```

### GET /organizations/my-tenants
Get all tenants the authenticated user has access to.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
[
  {
    "id": "membership_id",
    "userId": "user_id",
    "organizationId": "org_id",
    "tenantId": "tenant_id",
    "role": "MEMBER",
    "tenant": {
      "id": "tenant_id",
      "name": "Bangalore Office"
    },
    "organization": {
      "id": "org_id",
      "name": "Acme Corp"
    }
  }
]
```

---

## Board Management

### GET /boards
Get all boards for the active tenant.

**Headers:**
- `Authorization: Bearer <token>`
- `x-tenant-id: <tenant_id>`

**Response (200):**
```json
[
  {
    "id": "board_id",
    "name": "Project Alpha",
    "columns": [
      {
        "id": "column_id",
        "name": "To Do",
        "position": 1,
        "tasks": [
          {
            "id": "task_id",
            "title": "Implement login",
            "description": "Add user authentication",
            "position": 1,
            "version": 1
          }
        ]
      }
    ]
  }
]
```

### POST /boards
Create a new board in the active tenant.

**Headers:**
- `Authorization: Bearer <token>`
- `x-tenant-id: <tenant_id>`

**Request Body:**
```json
{
  "name": "New Project Board"
}
```

**Response (201):**
```json
{
  "id": "board_id",
  "name": "New Project Board",
  "tenantId": "tenant_id"
}
```

### PUT /boards/:id
Update a board's name.

**Headers:**
- `Authorization: Bearer <token>`
- `x-tenant-id: <tenant_id>`

**Request Body:**
```json
{
  "name": "Updated Board Name"
}
```

**Response (200):**
```json
{
  "message": "Board updated successfully"
}
```

### DELETE /boards/:id
Delete a board. Requires admin role.

**Headers:**
- `Authorization: Bearer <token>`
- `x-tenant-id: <tenant_id>`

**Response (204):** No content

---

## Column Management

### POST /columns
Create a new column in a board.

**Headers:**
- `Authorization: Bearer <token>`
- `x-tenant-id: <tenant_id>`

**Request Body:**
```json
{
  "name": "In Progress",
  "boardId": "board_id",
  "position": 2
}
```

**Response (201):**
```json
{
  "id": "column_id",
  "name": "In Progress",
  "boardId": "board_id",
  "position": 2
}
```

### PUT /columns/:id
Update a column's name or position.

**Headers:**
- `Authorization: Bearer <token>`
- `x-tenant-id: <tenant_id>`

**Request Body:**
```json
{
  "name": "In Review",
  "position": 3
}
```

**Response (200):**
```json
{
  "message": "Column updated successfully"
}
```

### DELETE /columns/:id
Delete a column. Requires admin role.

**Headers:**
- `Authorization: Bearer <token>`
- `x-tenant-id: <tenant_id>`

**Response (204):** No content

---

## Task Management

### GET /tasks/board/:boardId
Get all tasks for a specific board.

**Headers:**
- `Authorization: Bearer <token>`
- `x-tenant-id: <tenant_id>`

**Response (200):**
```json
[
  {
    "id": "task_id",
    "title": "Implement feature",
    "description": "Add new functionality",
    "position": 1,
    "columnId": "column_id",
    "version": 2
  }
]
```

### POST /tasks
Create a new task.

**Headers:**
- `Authorization: Bearer <token>`
- `x-tenant-id: <tenant_id>`

**Request Body:**
```json
{
  "title": "New Task",
  "description": "Task description",
  "columnId": "column_id",
  "position": 1
}
```

**Response (201):**
```json
{
  "id": "task_id",
  "title": "New Task",
  "description": "Task description",
  "columnId": "column_id",
  "position": 1,
  "version": 1
}
```

### PUT /tasks/:id
Update a task (supports drag-and-drop with concurrency control).

**Headers:**
- `Authorization: Bearer <token>`
- `x-tenant-id: <tenant_id>`

**Request Body:**
```json
{
  "title": "Updated Task",
  "description": "Updated description",
  "columnId": "column_id",
  "position": 2,
  "version": 1
}
```

**Response (200):**
```json
{
  "id": "task_id",
  "title": "Updated Task",
  "description": "Updated description",
  "columnId": "column_id",
  "position": 2,
  "version": 2
}
```

**Conflict Response (409):**
```json
{
  "error": "Conflict detected. The task was modified by another user or does not exist. Please refresh."
}
```

### DELETE /tasks/:id
Delete a task. Requires admin role.

**Headers:**
- `Authorization: Bearer <token>`
- `x-tenant-id: <tenant_id>`

**Response (204):** No content

---

## Activity & Undo

### GET /activity
Get activity logs for the active tenant.

**Headers:**
- `Authorization: Bearer <token>`
- `x-tenant-id: <tenant_id>`

**Response (200):**
```json
[
  {
    "id": "log_id",
    "action": "TASK_CREATED",
    "entityType": "TASK",
    "entityId": "task_id",
    "userId": "user_id",
    "tenantId": "tenant_id",
    "data": {
      "task": {
        "title": "New Task",
        "description": "Description",
        "columnId": "column_id",
        "position": 1,
        "version": 1
      }
    },
    "createdAt": "2024-01-01T10:00:00Z",
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
]
```

### POST /activity/undo
Undo the last action performed by the current user.

**Headers:**
- `Authorization: Bearer <token>`
- `x-tenant-id: <tenant_id>`

**Request Body:** None

**Response (200):**
```json
{
  "message": "Action undone successfully",
  "undoneAction": "TASK_CREATED",
  "result": {
    "action": "TASK_DELETED",
    "entityId": "task_id"
  }
}
```

**Conflict Response (409):**
```json
{
  "error": "Cannot undo this action - the item may have been modified by another user"
}
```

---

## WebSocket Events

### Connection
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:8080', {
  auth: { token: 'jwt_token' },
  query: { tenantId: 'tenant_id' }
});
```

### Events

#### task:created
Emitted when a new task is created.
```javascript
socket.on('task:created', (task) => {
  console.log('New task:', task);
  // Update UI with new task
});
```

#### task:updated
Emitted when a task is updated.
```javascript
socket.on('task:updated', (task) => {
  console.log('Task updated:', task);
  // Update UI with modified task
});
```

#### task:moved
Emitted when a task is moved (drag-and-drop).
```javascript
socket.on('task:moved', (task) => {
  console.log('Task moved:', task);
  // Update task position in UI
});
```

#### task:deleted
Emitted when a task is deleted.
```javascript
socket.on('task:deleted', ({ id }) => {
  console.log('Task deleted:', id);
  // Remove task from UI
});
```

#### presence:update
Emitted when users join/leave the tenant.
```javascript
socket.on('presence:update', (users) => {
  console.log('Active users:', users);
  // Update presence indicators
});
```

#### task:conflict
Emitted when a conflict is detected.
```javascript
socket.on('task:conflict', (data) => {
  console.log('Conflict:', data.message);
  // Reload board data
  fetchBoards();
});
```

---

## Error Responses

### Common Error Codes
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Missing/invalid JWT token
- **403 Forbidden**: Insufficient permissions or invalid tenant access
- **404 Not Found**: Resource not found
- **409 Conflict**: Concurrent modification detected
- **500 Internal Server Error**: Server error

### Error Response Format
```json
{
  "error": "Error message description"
}
```

---

## Rate Limiting
- API requests are rate limited per user
- WebSocket connections monitored for abuse
- Implement exponential backoff for retries

---

## Versioning
- API versioned via URL path: `/api/v1/`
- Breaking changes will increment version number
- Deprecation notices provided for old versions