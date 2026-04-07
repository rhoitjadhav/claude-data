---
name: deploy
argument-hint: [environment]
---

Deploy to $ARGUMENTS:
1. `npm run build` -- confirm build succeeds
2. `npm test` -- all tests green
3. `npm run lint` -- no lint errors
4. Push to the target branch / trigger deployment pipeline
5. Verify deployment succeeded -- check logs and health endpoints
6. Report deployment status
