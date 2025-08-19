/**
 * Basic setup test to verify our testing infrastructure works
 */

describe('Setup Tests', () => {
  it('should be able to run tests', () => {
    expect(true).toBe(true)
  })

  it('should have access to environment variables', () => {
    // This should work in our test environment
    expect(process.env.NODE_ENV).toBeDefined()
  })

  it('should be able to perform arithmetic', () => {
    const result = 2 + 2
    expect(result).toBe(4)
  })
})
