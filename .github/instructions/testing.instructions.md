---
applyTo: "**/*.spec.ts"
---

# Testing Instructions — Angular / Karma / Jasmine

## TestBed setup

- Always use `TestBed.configureTestingModule` — import only what the component under test actually needs
- For services: `TestBed.inject(MyService)` — never `new MyService()` directly
- Use `NO_ERRORS_SCHEMA` only as a last resort; prefer importing or mocking child components

## HTTP mocking

- Import `HttpClientTestingModule`; inject `HttpTestingController`
- Always call `httpTestingController.verify()` in `afterEach` to assert no unexpected requests

## Spies

- `spyOn(service, 'method').and.returnValue(of(...))` for sync observables
- `spyOn(service, 'method').and.returnValue(throwError(() => new Error('...')))` for error paths
- `jasmine.createSpyObj` for full service mocks

## Async

- Use `fakeAsync` + `tick()` / `flush()` for timers and microtasks
- Use `async` + `await fixture.whenStable()` for real Promise-based flows

## Change detection

- Call `fixture.detectChanges()` once after setup, then again after any input change
- Never call it inside loops — prefer explicit triggers

## Coverage targets

| Layer                            | Target |
| -------------------------------- | ------ |
| Smart components (containers)    | ≥ 80%  |
| Services                         | ≥ 80%  |
| Pure pipes, utility functions    | 100%   |
| Dumb (presentational) components | ≥ 60%  |

## What to test

- Happy path with typical valid input
- Edge cases: null, undefined, empty array, 0, very long strings
- API error paths: 400, 401, 404, 500
- Form validation: required fields, min/max length, pattern, cross-field rules

## Hard rules

- No `any` in test files — use proper types or `unknown`
- No `fdescribe` / `fit` committed — focused tests block CI
- No `console.log` or `console.error` in test files
- Test descriptions must read as plain English: `it('should display error when form is invalid')`
- Each `it` block tests exactly one behaviour
