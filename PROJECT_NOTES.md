# V1.1 Implementation Notes

This V1.1 build is based directly on the supplied `vector-space-skills-academy-v1.zip`.

## Preservation rule
The V1 public navigation, page structure, branding, footer, student dashboard, course catalogue, checkout and learning routes are preserved. V1.1 does **not** replace the application with a new sidebar/admin shell and does not add scaffold-only side-menu items.

## V1.1 additions
- `/admin/courses` Course Management
- `/admin/courses/new` Create Course
- `/admin/courses/[id]` Course Builder
- Course create/edit/publish/unpublish
- Module create/delete/reorder
- Lesson create/delete/reorder
- Lesson types: VIDEO, ARTICLE, PDF, LIVE, LINK, QUIZ, ASSIGNMENT
- Lesson duration and resource URL fields
- Admin dashboard Course Management card now links to the real Course Management page
- Prisma Course -> Order relation added so the existing Order model validates correctly

## Navigation
The original V1 header remains the application navigation:
Courses, Learning Paths, Batches, Login, Get Started.

No new global sidebar was introduced.

## Verification
The generated source was inspected against the supplied V1 project. Dependency installation was attempted in the offline build environment but timed out, so `prisma validate`, TypeScript compilation and `next build` could not be executed here. Run these locally after `npm install`:

```text
npx prisma generate
npx prisma validate
npx tsc --noEmit
npm run build
```
