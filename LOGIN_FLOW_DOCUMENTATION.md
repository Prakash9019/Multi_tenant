# ✅ COMPLETE LOGIN/REGISTER FLOW (Industry Standard)

## 🎯 Problem That Was Fixed

**Before:** Login and Register were identical - both just saved token and navigated. The membership fetching happened silently in Board component.

**Now:** Login and Register **explicitly** fetch user's assigned memberships as part of the authentication flow.

---

## 📋 REGISTER FLOW (New User)

### Step 1: User Fills Form
```
Name: John Doe
Email: john@company.com
Password: secure123
```

### Step 2: Frontend Calls Backend `/auth/register`
```typescript
// Register.tsx: handleRegister()
const { data } = await apiClient.post('/auth/register', { 
  name, email, password 
});
```

### Step 3: Backend Response
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Step 4: Frontend SAVES Token
```typescript
localStorage.setItem('jwt_token', data.token);
```

### ✅ Step 5: Frontend FETCHES User's Assigned Tenants (CRITICAL!)
```typescript
// Register.tsx (NEW!)
await dispatch(fetchMyTenants()).unwrap();
// This calls: GET /organizations/my-tenants
// Backend checks: WHERE user.id = req.user.id
```

**Important:** New users will return **empty array** (0 memberships)
- This is CORRECT - they haven't been invited by admin yet
- They'll see: "Contact your admin message"

### Step 6: Navigate to Dashboard
```typescript
navigate('/');
// Board component renders with tenants = []
// Shows: "You haven't been assigned to any tenant yet"
```

---

## 📋 LOGIN FLOW (Returning User)

### Step 1: User Fills Form
```
Email: john@company.com
Password: secure123
```

### Step 2: Frontend Calls Backend `/auth/login`
```typescript
// Login.tsx: handleLogin()
const { data } = await apiClient.post('/auth/login', { 
  email, password 
});
```

### Step 3: Backend Response
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Step 4: Frontend SAVES Token
```typescript
localStorage.setItem('jwt_token', data.token);
```

### ✅ Step 5: Frontend FETCHES User's Assigned Tenants (CRITICAL!)
```typescript
// Login.tsx (NEW!)
await dispatch(fetchMyTenants()).unwrap();
// This calls: GET /organizations/my-tenants
// Backend returns all memberships for this user
```

**Possible Results:**

**Case A: User has 1 tenant (Most Common)**
```json
[
  {
    "id": "m-123",
    "userId": "u-456",
    "tenantId": "tenant-bangalore",
    "organizationId": "org-companyA",
    "role": "MEMBER",
    "tenant": {
      "id": "tenant-bangalore",
      "name": "Bangalore",
      "organizationId": "org-companyA"
    },
    "organization": {
      "id": "org-companyA",
      "name": "Company A"
    }
  }
]
```

**Redux Action Fires:**
```typescript
// kanbanSlice.ts: fetchMyTenants.fulfilled
state.tenants = [{ id: "tenant-bangalore", name: "Bangalore", ... }];
state.activeOrganization = { id: "org-companyA", name: "Company A" };
state.activeTenant = { id: "tenant-bangalore", name: "Bangalore", ... };
// AUTO-SELECT first tenant!
```

**Case B: User has multiple tenants**
```json
[
  { tenant: "Bangalore", ... },
  { tenant: "Delhi", ... }
]
```

**Redux Action Fires:**
```typescript
// AUTO-SELECT first one (Bangalore)
state.activeTenant = Bangalore;
// User can switch via Navbar selector
```

**Case C: User has 0 tenants (Not invited yet)**
```json
[]
```

**Redux Action Fires:**
```typescript
state.tenants = [];
state.activeTenant = null;  // Stay null
```

### Step 6: Navigate to Dashboard
```typescript
navigate('/');
// Board component renders

// If activeTenant is set (Case A or B):
// → Show board with data

// If activeTenant is null (Case C):
// → Show "Contact your admin" message
```

---

## 🔄 Board Component Behavior

```typescript
// Board.tsx
useEffect(() => {
  if (!activeTenant) {
    dispatch(fetchMyTenants());
  }
}, [activeTenant, dispatch]);
```

**This serves as BACKUP fallback:**
- If memberships weren't fetched during login (e.g., user directly accesses `/`)
- It will fetch them automatically
- But in normal flow, they're already loaded from Login/Register

---

## 📊 Complete Flow Diagram

```
USER FLOW
├─ REGISTER
│  ├─ Email + Password
│  ├─ POST /auth/register
│  ├─ Save JWT
│  ├─ GET /organizations/my-tenants  ✅ FETCH MEMBERSHIPS
│  ├─ If 0 memberships: Show "Contact admin"
│  └─ Navigate to '/'
│
├─ LOGIN
│  ├─ Email + Password
│  ├─ POST /auth/login
│  ├─ Save JWT
│  ├─ GET /organizations/my-tenants  ✅ FETCH MEMBERSHIPS
│  ├─ If 1+ memberships: Auto-select first
│  ├─ If 0 memberships: Show "Contact admin"
│  └─ Navigate to '/'
│
└─ ADMIN INVITES USER
   ├─ POST /organizations/invite
   ├─ { email, tenantId, role }
   ├─ Create Membership record
   └─ Next login: User sees assigned tenant
```

---

## 🔐 Security Checklist

- ✅ User can ONLY see tenants in their membership records
- ✅ No free org/tenant creation by users
- ✅ Admin controls all invitations
- ✅ Every API call includes `x-tenant-id` header for isolation
- ✅ Backend checks memberships before allowing access
- ✅ Token contains no tenant info (server-side check only)

---

## 🧪 Test Scenarios

### Scenario 1: Admin Creates Company A
```
1. Admin registers
2. Admin logs in
3. Backend creates default Org + Tenant? (Check if this is implemented)
4. Admin sees Bangalore board
```

### Scenario 2: Admin Invites User Y
```
1. Admin: POST /organizations/invite
   { email: "y@company.com", role: "MEMBER", tenantId: "bangalore" }
2. Backend creates Membership
3. User Y registers (gets 0 tenants → sees "Contact admin")
4. Admin clicks logout intentionally, then logs back in
5. User Y logs in
6. Frontend: GET /organizations/my-tenants
7. Returns: [{ tenant: Bangalore, ... }]
8. Auto-select Bangalore
9. User Y sees Bangalore board with same data as User X ✅
```

### Scenario 3: Both Move Same Task (Conflict)
```
1. X and Y both viewing Bangalore board
2. X moves task: POST /tasks/update version=1 → version=2 ✅
3. Y moves same task: POST /tasks/update version=1 → version=2 ❌
4. Backend returns 409 Conflict
5. Frontend: dispatch(fetchBoards()) → reload fresh state
6. Y sees updated board ✅
```

---

## 📝 Implementation Checklist

- ✅ Login.tsx: Explicitly dispatches fetchMyTenants after login
- ✅ Register.tsx: Explicitly tries to fetch memberships (handles 0 case)
- ✅ org.controller.ts: getMyTenants returns memberships with tenant/org
- ✅ org.routes.ts: /my-tenants is public to authenticated users
- ✅ kanbanSlice.ts: Auto-selects first tenant when memberships loaded
- ✅ Board.tsx: Shows "Contact admin" if activeTenant is null
- ✅ Navbar.tsx: Can switch between assigned tenants only

---

## ✨ Key Improvements from This Fix

1. **Explicit Flow:** Memberships are fetched IMMEDIATELY after auth
2. **Clear User Intent:** "I've been assigned to X" vs "Contact admin"
3. **Single Source of Truth:** Redux state populated from login
4. **Faster UX:** No waiting for Board component to fetch memberships
5. **Security:** List of accessible tenants is validated server-side
