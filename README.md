# Multi-Tenant Real-Time Collaborative Kanban Board

A production-grade, multi-tenant collaborative Kanban board application with real-time synchronization, role-based access control, and conflict resolution.

## 🏗️ Architecture Overview

### Multi-Tenant Hierarchy
```
Organization (Top Level)
├── Tenant/Branch (Workspace)
    ├── Board (Kanban Board)
        ├── Column (Lists)
            └── Task (Cards)
```

### Key Features
- **Multi-Tenant Isolation**: Strict data separation at tenant level
- **Real-Time Collaboration**: WebSocket-based live updates
- **Role-Based Access Control**: ORG_ADMIN, TENANT_ADMIN, MEMBER roles
- **Conflict Resolution**: Optimistic locking with automatic recovery
- **Undo/Redo**: User-specific action reversal
- **Presence Indicators**: See who's online in your workspace
- **Activity Logs**: Audit trail of all changes

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for horizontal scaling)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd multi-tenant-kanban
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Configure your .env file with database and JWT secrets
   npx prisma migrate dev
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8080

## 🔐 Security Model

### Authentication
- JWT-based authentication
- Automatic token refresh
- Secure password hashing (bcrypt)

### Authorization
- **ORG_ADMIN**: Can create organizations, tenants, invite users
- **TENANT_ADMIN**: Can manage tenant resources, invite users
- **MEMBER**: Can create/modify tasks and boards

### Data Isolation
- Tenant-scoped queries at database level
- x-tenant-id header validation
- Membership verification on all operations

## 📊 Database Schema

### Core Entities
- **Organization**: Top-level container
- **Tenant**: Workspace within organization
- **User**: Application users
- **Membership**: User-organization-tenant-role relationships
- **Board**: Kanban boards
- **Column**: Lists within boards
- **Task**: Cards within columns
- **ActivityLog**: Audit trail with undo support

### Key Relationships
- Organizations have many Tenants
- Tenants belong to Organizations
- Users have Memberships to Organizations/Tenants
- Boards belong to Tenants
- Columns belong to Boards
- Tasks belong to Columns and Tenants

## 🔄 Real-Time Features

### WebSocket Channels
- Tenant-scoped rooms: `tenant:${tenantId}`
- Events: task:created, task:updated, task:moved, task:deleted
- Presence updates: user join/leave notifications

### Conflict Resolution
- Optimistic locking using Task.version field
- Automatic UI rollback on conflicts
- Fresh data fetch after conflict resolution

### Undo/Redo System
- User-specific undo stack
- Reverses last action (create/delete/update)
- Conflict detection prevents invalid undos

## 🛠️ API Documentation

### Authentication Endpoints
```
POST /api/v1/auth/register  - User registration
POST /api/v1/auth/login     - User login
```

### Organization Management
```
POST /api/v1/organizations           - Create organization (auto-assigns ORG_ADMIN)
POST /api/v1/organizations/tenants   - Create tenant (ORG_ADMIN only)
POST /api/v1/organizations/invite    - Invite user to tenant (ADMIN only)
GET  /api/v1/organizations/my-tenants - Get user's memberships
```

### Board Management
```
GET  /api/v1/boards     - Get boards for active tenant
POST /api/v1/boards     - Create board
PUT  /api/v1/boards/:id - Update board
DELETE /api/v1/boards/:id - Delete board (ADMIN only)
```

### Task Management
```
GET  /api/v1/tasks/board/:boardId - Get tasks by board
POST /api/v1/tasks     - Create task
PUT  /api/v1/tasks/:id - Update task (with version for concurrency)
DELETE /api/v1/tasks/:id - Delete task (ADMIN only)
```

### Activity & Undo
```
GET  /api/v1/activity     - Get activity logs
POST /api/v1/activity/undo - Undo last user action
```

### WebSocket Events
```javascript
// Connect with auth
const socket = io('http://localhost:8080', {
  auth: { token: 'jwt_token' },
  query: { tenantId: 'tenant_id' }
});

// Listen for events
socket.on('task:created', (task) => { /* handle */ });
socket.on('task:updated', (task) => { /* handle */ });
socket.on('task:moved', (task) => { /* handle */ });
socket.on('task:deleted', ({ id }) => { /* handle */ });
socket.on('presence:update', (users) => { /* handle */ });
socket.on('task:conflict', (data) => { /* reload board */ });
```

## 🎯 User Workflows

### New User Onboarding
1. Register account
2. See "EmptyDashboard" with 2 paths:
   - **Creator Path**: Create organization → auto ORG_ADMIN → create tenant → board
   - **Joiner Path**: Wait for admin invite → refresh → access granted

### Multi-Tenant Selection
1. User with multiple memberships sees TenantSelector
2. Click workspace → auto-select tenant
3. Board loads with tenant-specific data

### Collaborative Work
1. Real-time updates via WebSocket
2. Conflict detection on concurrent edits
3. Undo available for recent actions
4. Presence shows active collaborators

## 🔧 Development

### Backend Scripts
```bash
npm run dev      # Development server
npm run build    # Production build
npm run test     # Run tests
npx prisma studio # Database GUI
```

### Frontend Scripts
```bash
npm run dev   # Development server
npm run build # Production build
npm run test  # Run tests
```

### Environment Variables
```bash
# Backend .env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
REDIS_URL="redis://..." # Optional
FRONTEND_URL="http://localhost:5173"

# Frontend .env
VITE_API_URL="http://localhost:8080/api/v1"
```

## 🚀 Deployment

### Production Checklist
- [ ] Configure production database
- [ ] Set secure JWT secrets
- [ ] Enable HTTPS
- [ ] Configure Redis for scaling
- [ ] Set up monitoring/logging
- [ ] Configure CORS properly
- [ ] Run database migrations

### Docker Support
```dockerfile
# Backend
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8080
CMD ["npm", "start"]

# Frontend
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 80
CMD ["npm", "run", "preview"]
```

## 📈 Performance & Scaling

### Optimizations
- **Database Indexing**: TenantId indexed on all tables
- **Connection Pooling**: Prisma handles connection pooling
- **WebSocket Scaling**: Redis adapter for horizontal scaling
- **Caching**: Activity logs cached in Redux

### Monitoring
- Real-time connection counts
- Database query performance
- WebSocket event throughput
- Error rates and conflict frequency

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Ensure all tests pass
5. Submit pull request

### Code Standards
- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Comprehensive test coverage

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For issues and questions:
- Check the troubleshooting guide
- Review API documentation
- Open GitHub issues for bugs
- Join our Discord for community support

---

**Built with**: Node.js, Express, TypeScript, React, Redux Toolkit, Socket.io, Prisma, PostgreSQL