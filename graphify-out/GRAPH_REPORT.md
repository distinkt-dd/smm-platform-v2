# Graph Report - smm-platform-v2  (2026-11-24)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 991 nodes · 2198 edges · 68 communities (42 shown, 26 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `389f86c6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60

## God Nodes (most connected - your core abstractions)
1. `@nestjs/common` - 44 edges
2. `PrismaService` - 27 edges
3. `TUserPublic` - 24 edges
4. `apiRequest()` - 23 edges
5. `createAppStore()` - 21 edges
6. `compilerOptions` - 20 edges
7. `useAppDispatch` - 19 edges
8. `useAppSelector` - 19 edges
9. `@nestjs/testing` - 19 edges
10. `ValidationError` - 18 edges

## Surprising Connections (you probably didn't know these)
- `renderForm()` --calls--> `ProfileForm()`  [EXTRACTED]
  frontend/tests/profile-form.test.tsx → frontend/src/widgets/profile/ProfileForm.tsx
- `eslint@^10.14.0` --declares--> `eslint`  [EXTRACTED]
  frontend/package.json → backend/package.json
- `eslint-config-prettier@^10.1.8` --declares--> `eslint-config-prettier`  [EXTRACTED]
  frontend/package.json → backend/package.json
- `@eslint/js@^10.0.1` --declares--> `@eslint/js`  [EXTRACTED]
  frontend/package.json → backend/package.json
- `globals@^17.13.0` --declares--> `globals`  [EXTRACTED]
  frontend/package.json → backend/package.json

## Import Cycles
- None detected.

## Communities (68 total, 26 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (66): createFact(), CreateFactRequest, deleteFact(), throwFactError(), updateFact(), UpdateFactRequest, factMessages, factSchema (+58 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (38): ProfileRequestError, MainLayout(), useAppDispatch, useAppSelector, Button(), ButtonProps, ConfirmationDialog(), Props (+30 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (22): @nestjs/jwt@^12.0.3, TUserForRelation, TUserPrivate, TUserPublic, TUserResponse, AuthController, CREATED_USER, REGISTRATION (+14 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (13): Service, JwtAuthGuard, CreateServiceDto, UpdateServiceDto, SERVICE_PUBLIC_SELECT, ServiceRepository, ServicesController, CREATE_DTO (+5 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (12): ConfirmedFact, CreateFactDto, UpdateFactDto, FactsController, CREATE_DTO, FACT, request, FactsService (+4 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (11): ProfileDto, toDto(), VALID, validatePayload(), FactsModule, ProfileController, ProfileModule, ProfileService (+3 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (34): login(), logout(), me(), register(), credentialsSchema, AuthCredentials, AuthUser, LoginRequest (+26 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (21): embedded-postgres@^18.6.0-beta.19, supertest@^7.0.0, AppModule, allowedOrigins, corsOptions, CsrfGuard, BACKEND_ROOT, cookieToken() (+13 more)

### Community 8 - "Community 8"
Cohesion: 0.13
Nodes (8): EnvConfig, AuthRepository, CREATED_ROW, RELATION_USER, fromCookie(), JwtStrategy, TokenModule, @nestjs/common

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (29): VITE_API_URL, build, environment, ports, args, context, environment, healthcheck (+21 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (27): dependencies, argon2@^0.45.1, class-transformer@^0.5.1, class-validator@^0.15.1, cookie-parser@^1.4.7, multer@^2.5.0, @nestjs/common@^12.0.1, @nestjs/platform-express@^12.0.1 (+19 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (25): compilerOptions, rootDir, exclude, extends, include, compilerOptions, allowSyntheticDefaultImports, declaration (+17 more)

### Community 12 - "Community 12"
Cohesion: 0.08
Nodes (24): devDependencies, @nestjs/cli@^12.0.0, @nestjs/schematics@^12.0.0, @nestjs/testing@^12.0.1, smtp-server@^3.21.3, source-map-support@^0.5.21, @swc/core@^1.16.21, @types/mailparser@^3.9.0 (+16 more)

### Community 13 - "Community 13"
Cohesion: 0.17
Nodes (14): createAppStore(), ProfilePage(), profile, renderForm(), user, values, profile, setup() (+6 more)

### Community 14 - "Community 14"
Cohesion: 0.17
Nodes (8): App(), HomePage(), AuthLayout(), NotFoundPage(), Props, ProtectedRoute(), show(), react-router

### Community 15 - "Community 15"
Cohesion: 0.14
Nodes (4): HealthController, HealthStatus, PrismaService, @nestjs/testing

### Community 16 - "Community 16"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 17 - "Community 17"
Cohesion: 0.11
Nodes (18): eslint@^10.14.0, eslint-config-prettier@^10.1.8, eslint, eslint-config-prettier, devDependencies, eslint@^10.14.0, eslint-config-prettier@^10.1.8, @playwright/test@^1.64.1 (+10 more)

### Community 18 - "Community 18"
Cohesion: 0.15
Nodes (8): @nestjs/config@^12.1.1, @nestjs/core@^12.0.1, EnvModule, AuthModule, HealthModule, PrismaModule, @nestjs/config, @nestjs/core

### Community 19 - "Community 19"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 20 - "Community 20"
Cohesion: 0.12
Nodes (15): author, description, oxlint-tsgolint@^7.0.2001, @types/smtp-server@^3.5.13, engines, node, license, name (+7 more)

### Community 21 - "Community 21"
Cohesion: 0.13
Nodes (14): @testing-library/jest-dom@^7.0.1, @types/react-dom@^19.3.0, vitest@^5.0.5, engines, node, vitest, name, overrides (+6 more)

### Community 22 - "Community 22"
Cohesion: 0.25
Nodes (6): LoginForm(), LoginPage(), RegisterForm(), RegisterPage(), FormContainer(), FormContainerProps

### Community 23 - "Community 23"
Cohesion: 0.15
Nodes (13): scripts, build, format, lint, start, start:debug, start:dev, start:prod (+5 more)

### Community 24 - "Community 24"
Cohesion: 0.18
Nodes (6): AppDispatch, RootState, sessionMiddleware(), store, profile, values

### Community 26 - "Community 26"
Cohesion: 0.20
Nodes (10): dependencies, react@^19.3.1, react-dom@^19.3.1, react-redux@^9.3.1, react-router@^8.5.1, @reduxjs/toolkit@^2.14.0, validator@^13.15.35, zod@^4.6.7 (+2 more)

### Community 27 - "Community 27"
Cohesion: 0.39
Nodes (6): "users", users_email_key, "confirmed_facts", "master_profiles", master_profiles_user_id_key, "services"

### Community 28 - "Community 28"
Cohesion: 0.25
Nodes (4): fact, profile, showPage(), user

### Community 29 - "Community 29"
Cohesion: 0.29
Nodes (6): env, node, rules, typescript/no-explicit-any, typescript/no-floating-promises, $schema

### Community 30 - "Community 30"
Cohesion: 0.33
Nodes (3): Env, envSchema, validEnv

### Community 31 - "Community 31"
Cohesion: 0.33
Nodes (5): login(), profile, service, showPage(), user

### Community 32 - "Community 32"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 33 - "Community 33"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 34 - "Community 34"
Cohesion: 0.33
Nodes (4): @tailwindcss/vite@^4.3.0, @vitejs/plugin-react@^6.1.2, @tailwindcss/vite, @vitejs/plugin-react

### Community 35 - "Community 35"
Cohesion: 0.40
Nodes (4): dotenv@^18.0.9, prisma@^7.10.1, dotenv, prisma

### Community 36 - "Community 36"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, preview

### Community 37 - "Community 37"
Cohesion: 0.67
Nodes (3): @eslint/js@^10.0.1, @eslint/js, @eslint/js@^10.0.1

### Community 38 - "Community 38"
Cohesion: 0.67
Nodes (3): globals@^17.13.0, globals, globals@^17.13.0

### Community 39 - "Community 39"
Cohesion: 0.67
Nodes (3): oxlint@^1.58.0, oxlint, oxlint@^1.90.0

### Community 40 - "Community 40"
Cohesion: 0.67
Nodes (3): @types/node@^24.0.0, @types/node, @types/node@^24.19.2

### Community 41 - "Community 41"
Cohesion: 0.67
Nodes (3): typescript@^6.0.2, typescript, typescript@~6.0.2

### Community 42 - "Community 42"
Cohesion: 0.67
Nodes (3): typescript-eslint@^8.72.1, typescript-eslint, typescript-eslint@^8.72.1

## Knowledge Gaps
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@nestjs/common` connect `Community 8` to `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 10`, `Community 15`, `Community 18`, `Community 20`, `Community 25`?**
  _High betweenness centrality (0.197) - this node is a cross-community bridge._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05899122807017544 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Community 1` to `Community 26`, `Community 21`, `Community 14`, `Community 22`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.056022408963585436 - nodes in this community are weakly interconnected._
- **Why does `@reduxjs/toolkit` connect `Community 6` to `Community 24`, `Community 0`, `Community 26`, `Community 21`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.052313883299798795 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.07644110275689223 - nodes in this community are weakly interconnected._