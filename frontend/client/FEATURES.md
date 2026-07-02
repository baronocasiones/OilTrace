# OilTrace Mobile — Feature Specifications

> **Purpose**: Detailed, spec-driven planning for each feature before implementation begins.
> This is the *design* document — `APP_STATE.md` is the *status* document.
>
> **Workflow**:
> 1. Write the spec here before coding starts.
> 2. Get it reviewed/approved.
> 3. Implement against the spec.
> 4. Mark ✅ in `APP_STATE.md` when done.

---

## Template (copy for each new feature)

```markdown
### F-XXX — [Feature Name]

**Status**: Draft | Approved | In Progress | Done  
**Phase**: [Phase number from APP_STATE.md]  
**Dependencies**: [F-XXX, F-XXX or "None"]

#### Goal
One sentence: what problem does this feature solve for the user?

#### User Stories
- As a [role], I want to [action], so that [outcome].

#### Screens / UI
List every screen or modal this feature introduces. For each:
- **Screen name** (`app/(group)/screen-name.tsx`)
  - Key elements
  - Navigation: where does it go from/to?

#### API Contracts
List every backend endpoint this feature calls.
| Method | Endpoint | Request Body | Response |
|--------|----------|-------------|----------|

#### State / Data
- What goes in Zustand store?
- What is fetched on mount vs. on demand?

#### Edge Cases & Error Handling
- What happens when the network is offline?
- What if the API returns an error?

#### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

#### Notes
Any implementation notes, constraints, or open questions.
```

---

## F-001 — Project Bootstrap

**Status**: Draft  
**Phase**: 0 — Project Bootstrap  
**Dependencies**: None

### Goal
Initialize the Expo + React Native project with routing, design system, and base architecture so all future features have a consistent foundation.

### User Stories
- As a developer, I want a running Expo project with file-based routing, so that screens can be added without boilerplate.

### Screens / UI
- Root layout with `Stack` navigator
- Splash / loading screen

### Decisions to Make
- [ ] Expo Router v3 or v4?
- [ ] State management: Zustand (preferred) or Context?
- [ ] Styling: NativeWind or StyleSheet?
- [ ] Design tokens: manual `theme/` folder or a UI library (e.g., Tamagui, Gluestack)?

### Acceptance Criteria
- [ ] `npx expo start` runs without errors
- [ ] File-based routing is set up (`app/` directory)
- [ ] `APP_STATE.md` updated to ✅ for F-001

---

## F-002 — Auth (Login / Register)

**Status**: Draft  
**Phase**: 1 — Auth & Onboarding  
**Dependencies**: F-001

### Goal
Allow consumers and drivers to create accounts and log in, receiving a JWT to authenticate subsequent API calls.

### User Stories
- As a consumer, I want to register with my phone number and password so I can track my oil pickups.
- As a driver, I want to log in so I can see my job queue.

### Screens / UI
- `app/(auth)/login.tsx` — Email + password fields, Login button, link to Register
- `app/(auth)/register.tsx` — Name, phone, email, password, role selector (Consumer / Driver), Submit
- `app/(auth)/_layout.tsx` — Stack layout, no bottom tabs

### API Contracts
| Method | Endpoint | Request Body | Response |
|--------|----------|-------------|----------|
| POST | `/auth/register` | `{name, phone, email, password, role}` | `{user, token}` |
| POST | `/auth/login` | `{email, password}` | `{user, token}` |

### State / Data
- JWT stored in `expo-secure-store`
- User object in Zustand `authStore`

### Edge Cases & Error Handling
- Invalid credentials → show inline error message
- Network offline → toast "No internet connection"
- Token expiry → redirect to login screen

### Acceptance Criteria
- [ ] Consumer can register and land on consumer dashboard
- [ ] Driver can register and land on driver dashboard
- [ ] JWT persists across app restarts
- [ ] `APP_STATE.md` updated to ✅ for F-002

---

<!-- Add more feature specs below as development progresses -->
