import { jobTextLooksUnsafe } from './jobText'

describe('job text safety', () => {
  it.each([
    '<img src=x onerror=alert(1)>QA XSS Probe',
    '<script>alert(2)</script>',
    'Testing stored XSS <script>alert(3)</script>',
    'javascript:alert(1)',
    'Hello\u0000world',
  ])('rejects markup: %s', (value) => {
    expect(jobTextLooksUnsafe(value)).toBe(true)
  })

  it.each([
    'Senior Backend Engineer',
    'Build APIs in C++ and salary > 80k',
    'React 18+, Node.js, and PostgreSQL',
  ])('accepts plain job copy: %s', (value) => {
    expect(jobTextLooksUnsafe(value)).toBe(false)
  })
})
