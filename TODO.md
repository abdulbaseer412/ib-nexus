# IB Nexus — Professional Light Mode System Implementation

## 1. Core Design System (`src/app/globals.css`)
- [x] Rebuild `:root` (light) with full semantic token set: background, surface, surface-alt, card, card-secondary, elevated, dropdown, input, hover, active, text-primary/secondary/muted/faint, accent, accent-hover, accent-soft, border, border-strong, divider, success, warning, danger, info, shadow-sm/md/lg, ring
- [x] Keep `.dark` tokens byte-identical to current
- [x] Add semantic utility classes (`.bg-background`, `.text-primary`, `.border-subtle`, etc.)
- [x] Upgrade `.card` with layered shadow (light) + keep dark shadow
- [x] Rework `.btn` variants to use brand-blue in light. unchanged in dark
- [x] Add smooth theme transition (150–250ms) with reduced-motion respect

## 2. Landing Page (`src/components/LandingPage.js`)
- [x] Replace `bg-[#050505]` → `bg-background`, `bg-[#090B10]` → `bg-surface`
- [x] Replace `text-white` → `text-primary`, `text-[#B3B7C4]` → `text-secondary`, `text-[#80879A]` → `text-muted`
- [x] Replace `bg-white/[.03]`/`.035` → `bg-card-secondary`, `bg-white/[.05]` → `bg-surface-alt`
- [x] Replace `border-white/*` → `border-subtle`, `text-[#6CA4FF]` → `text-accent`, `bg-[#4F8CFF]/10` → `bg-accent-soft`
- [x] Replace `hover:text-white` → `hover:text-primary`, `hover:bg-white/[.06]` → `hover:bg-hover`

## 3. Dynamic Public Pages (`src/app/[...slug]/page.js`)
- [x] Replace page background, section backgrounds, cards, text tokens
- [x] Update breadcrumbs, FAQ, footer, legal, help, about, features, subject pages

## 4. Contact Page (`src/app/contact/page.js`)
- [x] Replace form/inputs/card backgrounds, borders, text tokens, footer

## 5. Home Slot Page (`src/app/page.js`)
- [x] Replace `bg-[#050505]`, text tokens, CTA buttons

## 6. Navbar (`src/components/NavbarClient.js`)
- [x] Replace dropdown `bg-[#0d1017]/95` → `bg-dropdown` (elevated + blur + shadow)
- [x] Replace `border-white/10`, `border-white/8` → `border-subtle`
- [x] Replace text tokens (`text-[#B3B7C4]` → `text-secondary`, `text-[#80879A]` → `text-muted`, `text-white` → `text-primary`)
- [x] Replace hover states (`hover:bg-white/[.06]` → `hover:bg-hover`)
- [x] Replace active menu item `bg-[#4F8CFF]/10` → `bg-accent-soft`

## 7. User Menu (`src/components/UserMenu.js`)
- [x] Replace gray/dark utility pairs with semantic tokens
- [x] Dropdown uses elevated white in light mode

## 8. Legal Pages (`src/components/legal/`)
- [x] `LegalPageShell.js`: background, breadcrumbs, TOC, back-to-top, footer
- [x] `primitives.js`: paragraphs, headings, lists, callouts, links

## 9. Auth Components (`src/components/auth/`)
- [x] `AuthDivider.js` — border + text tokens
- [x] `FormMessage.js` — success/warning/error/info backgrounds and borders
- [x] `ProviderHint.js` — cards, buttons, text tokens
- [x] `WelcomeBackCard.js` — card, text, button
- [x] `OAuthButton.js` — compact/secondary buttons
- [x] `PasswordInput.js` — eye toggle, strength meter
- [x] `auth-styles.js` — keep `.field`/`.btn` semantic classes

## 10. Auth & Account Pages
- [x] `login/SignInForm.js` — headings, secondary buttons, links
- [x] `signup/SignUpForm.js` — headings, secondary buttons, links
- [x] `auth/forgot-password/*` — page wrapper, form, links
- [x] `auth/reset-password/*` — page wrapper, form, links
- [x] `onboarding/*` — page wrapper, form card
- [x] `profile/*` — page wrapper, form card
- [x] `settings/page.js` — page wrapper, list items
- [x] `settings/security/*` — page wrapper, cards, modal

## 11. Misc Components
- [x] `HomeGuestActions.js` — secondary button
- [x] `ui/ProgramSelect.js` — select/combobox, dropdown
- [x] `ui/index.js` — minor token updates if needed

## 12. Cleanup & Verification
- [x] Remove `.landing` hardcoded overrides once components are semantic
- [x] Run `npm run build` and verify no errors
- [ ] Visually verify Dark Mode is identical
- [ ] Verify Light Mode shows layered hierarchy (warm-gray page, white cards, gray inputs, blue accents, elevated dropdowns)
