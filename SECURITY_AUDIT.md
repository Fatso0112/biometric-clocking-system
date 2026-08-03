# Security Audit Review

## GHSA-qwww-vcr4-c8h2

### Dependency

- react-router: 7.18.1
- react-router-dom: 7.18.1

### Assessment

GitHub states that GHSA-qwww-vcr4-c8h2 only affects applications
using React Router's unstable React Server Components APIs.

This application is a client-rendered Vite SPA using BrowserRouter.
It does not use:

- React Server Components
- React Router RSC mode
- ServerRouter
- RSC route configuration
- RSC server request handlers
- React Router SSR or framework mode

The vulnerable code path is therefore not reachable in the current
application architecture.

React Router 7.18.1 is retained because it is the latest v7 release.
The advisory is fixed in React Router 8.3.0, which requires a planned
React Router v8, React and Node migration.

This exception must be reviewed again before introducing SSR,
framework mode or React Server Components.
