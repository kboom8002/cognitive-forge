# 10. Seed Fixtures & Demo Data Spec

## P0 Apps
/a/corporate-pr-suite
/a/book-to-agent
/a/prompt-improvement-practice

## Scripts
pnpm fixtures:validate
pnpm seed:demo
pnpm smoke:runtime
pnpm smoke:api
pnpm smoke:security
pnpm release:check

## Release Gates
Core schemas compile, P0 fixtures validate, seed runs, three apps run, public no-leak checks pass, trace/usage written, build/typecheck pass.
