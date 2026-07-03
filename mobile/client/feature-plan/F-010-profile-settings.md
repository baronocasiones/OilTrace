# F-010 — Profile & Settings

**Status**: Done  
**Phase**: 8 — Settings & Profile  
**Dependencies**: F-001, F-003 (for business_name reuse in mock)

### Goal
Give consumers a central place to view and edit their business profile, manage account settings, switch the app theme, and access app information — all within a glassmorphic hub screen consistent with the rest of the OilTrace consumer experience.

### User Stories
- As a consumer, I want to view my business profile (name, address, contact) so I know what information is on file.
- As a consumer, I want to edit my business details so they stay accurate as my business changes.
- As a consumer, I want to update my phone number and change my password so my account stays secure.
- As a consumer, I want to switch between light, dark, and dim themes so the app is comfortable to use in any lighting.
- As a consumer, I want to see app version and legal links so I can reference them if needed.
- As a consumer, I want to log out of my account so I can switch users or secure my session.

### Screens / UI

#### `app/(consumer)/profile.tsx` — Profile Hub (Tab 4 of 4)

A `ScrollView` with five sections. Uses `useProfileStore` for data.

**Section A — Profile Header** (`GlassCard elevated`):
- Avatar circle (44×44) with initials derived from `business_name` (e.g., "AM" for "Aling Maria's Karinderya"). Background uses `colors.accent` at 12% opacity, text in `colors.accent`.
- `Heading size="lg"` for business name.
- `Badge variant="premium"` displaying "Consumer".
- `BodyText muted` for address summary below the badge.
- **Loading state**: Skeleton circle + two skeleton text bars.
- **Error state**: This section stays; the card shows a small inline error with retry.

**Section B — Menu Rows** (`GlassCard` with `interactive` rows):
- "Business Profile" row: icon container (accent) + `BodyText` label + chevron (`>`). Tapping navigates to `profile/edit-business`.
- "Account Settings" row: icon container (accent) + `BodyText` label + chevron (`>`). Tapping navigates to `profile/edit-account`.
- Each row uses `g.rowBetween` for layout, with a subtle divider between rows.

**Section C — App Preferences** (`GlassCard`):
- `Label` "Theme" at top.
- `ThemeSwitcher` component (3-way segmented control) below the label.
- The `ThemeSwitcher` is an inline Reanimated pill with three SVG icon buttons (sun / moon / horizon) and a sliding accent indicator. Active icon uses `colors.accent`; inactive icons use `colors.muted`.

**Section D — App Info** (`GlassCard`):
- `BodyText` "Version 1.0.0" in muted.
- `BodyText accent` "Terms of Service" — tappable, opens a URL via `expo-web-browser`.
- `BodyText accent` "Privacy Policy" — tappable, opens a URL via `expo-web-browser`.
- Subtle divider between each row.

**Section E — Logout**:
- `Button variant="glass-danger" fullWidth` labeled "Log Out".
- On press, shows React Native `Alert.alert()` confirmation dialog: "Log Out" / "Are you sure you want to log out?" with "Cancel" and "Log Out" buttons.
- On confirm, clears profile store persisted state and navigates to the entry route (future: auth screen).

**Global states across all sections on this screen**:
- **Loading** (first load, no cached data): Show 3 skeleton `GlassCard` placeholders with shimmer effect using `Animated.Value` opacity pulse on `colors.border` backgrounds.
- **Error** (no data, fetch failed): Full-screen centered state with alert-circle icon, `Heading size="sm"` "Something went wrong", `BodyText muted` "Pull to refresh or tap retry", and `Button variant="glass"` "Retry".
- **Offline**: `g.errorBox` banner at top reading "You're offline — showing cached data". All sections render with cached data. Edit buttons navigate but forms disable their save buttons.
- **Empty** (first launch): Mock data is always available, so this state does not occur in mock mode. In production, this would show a prompt to complete profile setup.

---

#### `app/(consumer)/profile/edit-business.tsx` — Edit Business Profile

A form screen pushed onto the tab stack. Uses Expo Router's stack header for back navigation.

- **Header**: Expo Router stack header with back arrow. Title: "Edit Business Profile".
- **Form card** (`GlassCard elevated`):
  - `OilInput` label="Business Name" — pre-filled with current value, editable.
  - `OilInput` label="Address" — pre-filled, editable, multiline.
  - `OilInput` label="Contact Number" — pre-filled, editable, keyboardType="phone-pad".
  - Business type selector: 4 options displayed as tappable rows within the card:
    - Karinderya
    - Restaurant
    - Canteen
    - Other
    - Selected option has `colors.accent` left border and accent text. Unselected options use `colors.muted`.
- **Actions**:
  - `Button variant="solid-teal" fullWidth` "Save Changes" — calls `updateBusiness()`, shows success toast via `Alert.alert()`, then `router.back()`.
  - `Button variant="glass" fullWidth` "Cancel" — calls `router.back()` without saving.
- **Saving state**: Save button shows loading spinner. Both buttons disabled during save.
- **Error state**: Inline `g.errorText` below the form: "Could not save changes. Please try again."
- **Offline state**: `g.errorBox` banner at top: "Connect to internet to edit profile". All `OilInput` fields set to `editable={false}`. Save button hidden, only Cancel button visible.
- **Validation**: All fields required. Business name min 2 chars. Contact number must match simple PH phone pattern. Show inline `error` prop on `OilInput` for validation failures.

---

#### `app/(consumer)/profile/edit-account.tsx` — Edit Account

A form screen with account info section and change password section.

- **Header**: Expo Router stack header with back arrow. Title: "Account Settings".

**Section 1 — Account Info** (`GlassCard elevated`):
- `OilInput` label="Email" — pre-filled, `editable={false}`, muted styling to indicate read-only. Helper text: "Contact support to change your email."
- `OilInput` label="Phone" — pre-filled, editable, keyboardType="phone-pad".

**Section 2 — Change Password** (`GlassCard elevated`):
- Section separator with `Label` "Change Password" and `BodyText muted` "Leave blank to keep your current password."
- `OilInput` label="Current Password" — `secureTextEntry`, placeholder "Enter current password".
- `OilInput` label="New Password" — `secureTextEntry`, placeholder "Min. 6 characters".
- `OilInput` label="Confirm New Password" — `secureTextEntry`, placeholder "Re-enter new password".

**Actions**:
- `Button variant="solid-teal" fullWidth` "Save Changes" — validates and calls `updateAccount()` and/or `updatePassword()`.
- `Button variant="glass" fullWidth` "Cancel" — `router.back()`.

**Client-side validation**:
- If any password field is filled, all three password fields are required.
- New password min 6 characters.
- Confirm password must match new password.
- Phone must match simple PH phone pattern.
- Show inline `error` prop on `OilInput` for each validation failure.

**States**:
- **Saving**: Save button shows loading spinner. Both buttons disabled.
- **Error**: Inline `g.errorText`: "Could not save changes. Please try again." Specific password error if mock password check fails: "Current password is incorrect."
- **Success**: `Alert.alert()` "Changes saved" with OK button. Then `router.back()`.
- **Offline**: `g.errorBox` banner. All fields `editable={false}`. Save button hidden.

---

### API Contracts

All endpoints are mocked in Phase 8. Real API integration deferred to backend availability.

| Method | Endpoint | Request Body | Response |
|--------|----------|-------------|----------|
| GET | `/consumers/me/profile` | — | `ProfileData` |
| PUT | `/consumers/me/profile/business` | `Partial<BusinessProfile>` | `BusinessProfile` |
| PUT | `/consumers/me/profile/account` | `{ phone }` | `AccountInfo` |
| PUT | `/consumers/me/profile/password` | `{ current_password, new_password }` | `{ success }` |

**GET /consumers/me/profile** response shape:
```json
{
  "business": {
    "business_name": "Aling Maria's Karinderya",
    "address": "123 Rizal St, Brgy. San Isidro, General Trias, Cavite",
    "contact_number": "09171234567",
    "business_type": "karinderya"
  },
  "account": {
    "email": "alingmaria@email.com",
    "phone": "09171234567"
  },
  "preferences": {
    "theme": "light"
  }
}
```

### State / Data

- **Zustand store**: `useProfileStore` — holds `ProfileData`, loading/error/saving state, offline flag.
- **Persistence**: Zustand `persist` middleware with `createJSONStorage(() => AsyncStorage)`. Cache key: `@oiltrace_profile_store`.
- **Partialize**: Excludes `isLoading`, `isSaving`, `saveError` from persistence.
- **Fetch on mount**: Profile hub calls `fetchProfile()` in `useEffect` on mount.
- **On demand**:
  - `updateBusiness(updates)` — simulates 800ms API delay, updates store, persists.
  - `updateAccount(updates)` — simulates 800ms API delay, updates store, persists.
  - `updatePassword(current, newPassword)` — simulates 1000ms API delay, validates current password against mock (mock password: "password123").
  - `setTheme(mode)` — updates store AND calls `ThemeContext.setMode()` to keep UI in sync.
- **Mock data**: `src/mocks/profile.ts` returns a single profile record. The mock password for validation is `"password123"`.
- **Theme sync**: The `setTheme()` action reads the current `ThemeContext.setMode()` via a passed reference or the component coordinates both calls.

### Edge Cases & Error Handling

- **Offline with cache** → Show banner "You're offline — showing cached data" + display cached profile. All edit forms disable save buttons and make fields read-only.
- **Offline without cache** → Show centered error: "Connect to internet to view your profile" + retry button.
- **API error on fetch** → Show error box with "Something went wrong. Pull to retry." + pull-to-refresh on `ScrollView`.
- **API error on save** → Inline error text below the form: "Could not save changes. Please try again."
- **Password change fails (wrong current password)** → Inline error on current password field: "Current password is incorrect."
- **Password validation fails** → Inline errors on respective fields: "Password must be at least 6 characters." / "Passwords do not match."
- **Form validation fails** → Inline errors on empty required fields. Save button still tappable — validation runs on press.
- **Logout** → `Alert.alert()` confirmation. On confirm, clear AsyncStorage key for profile store, reset store to initial state, navigate to `/` (entry redirect).
- **Theme persistence** → `ThemeContext` must read from AsyncStorage on mount and write on `setMode()` so the theme survives app restart. Default to `'light'` if no stored value.
- **Theme toggle while offline** → Works normally. Theme is a purely local preference with no API dependency.

### Acceptance Criteria

- [ ] Profile hub screen renders with business name, avatar initials, Consumer badge, and address.
- [ ] Menu rows navigate to `profile/edit-business` and `profile/edit-account`.
- [ ] ThemeSwitcher toggles between light, dark, and dim modes with spring animation.
- [ ] Theme choice persists across app restarts.
- [ ] App Info section shows version and tappable Terms/Privacy links.
- [ ] Logout button shows confirmation dialog and clears store on confirm.
- [ ] Edit Business screen pre-fills form fields from store, saves updates, and returns to hub.
- [ ] Edit Account screen allows phone update and password change with validation.
- [ ] All forms show inline validation errors for invalid input.
- [ ] Offline banner displays on hub and edit screens; save buttons are disabled when offline.
- [ ] Loading skeletons display on first load.
- [ ] Error state with retry displays when fetch fails.
- [ ] Pull-to-refresh reloads profile data on hub screen.
- [ ] `npx tsc --noEmit` passes with zero errors.
- [ ] `APP_STATE.md` updated to ✅ for F-010.

### Notes

- Reuses: `GlassCard`, `Button` (solid-teal, glass, glass-danger), `Badge` (premium), `Heading`, `BodyText`, `Label`, `OilInput`, `createGlobalStyles`.
- New UI primitive: `ThemeSwitcher` — a reusable 3-way segmented control using `react-native-reanimated` for the sliding pill animation. Uses inline SVG icons from the design system (sun, moon, horizon).
- `ThemeContext` needs a persistence fix — currently always initializes to `'light'`. This is a one-line change to read/write AsyncStorage on mount/setMode.
- Two hidden routes registered in `(consumer)/_layout.tsx`: `profile/edit-business` and `profile/edit-account` (both with `href: null`) — same pattern as `history/[id]`.
- Avatar initials derived from first letters of business name words (e.g., "Aling Maria's Karinderya" → "AM").
- No role switcher, language picker, or notification toggle in this phase.
- Mock password for change-password validation: `"password123"`.
- Terms of Service and Privacy Policy open placeholder URLs via `expo-web-browser`.
