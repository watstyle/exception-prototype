# Tasks Iframe Prototype

A React + Vite monorepo for testing cross-origin iframe integration between a host platform shell and a Groundtruth-owned iframe app.

## Apps

- `@groundtruth/host-app` (`http://localhost:5173`) - host shell with category list and iframe container.
- `@groundtruth/iframe-app` (`http://localhost:5174`) - list/detail iframe UI.
- `@groundtruth/contracts` - shared `postMessage` event contracts + runtime guards.

## Quick Start

```bash
npm install
npm run dev
```

## Test Commands

```bash
npm run test:unit
npm run test:e2e
```
