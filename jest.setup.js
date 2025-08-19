import '@testing-library/jest-dom'

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock fetch for API testing
global.fetch = jest.fn()

// Mock Web APIs for Next.js API routes
global.Request = jest.fn().mockImplementation((url, options) => ({
  url,
  method: options?.method || 'GET',
  headers: new Map(Object.entries(options?.headers || {})),
  json: jest.fn().mockResolvedValue({}),
  text: jest.fn().mockResolvedValue(''),
  ...options,
}))

global.Response = jest.fn().mockImplementation((body, options) => ({
  body,
  status: options?.status || 200,
  headers: new Map(Object.entries(options?.headers || {})),
  json: jest.fn().mockResolvedValue(body),
  text: jest.fn().mockResolvedValue(body),
  ...options,
}))

global.Headers = jest.fn().mockImplementation(init => {
  const map = new Map()
  if (init) {
    if (Array.isArray(init)) {
      init.forEach(([key, value]) => map.set(key, value))
    } else if (typeof init === 'object') {
      Object.entries(init).forEach(([key, value]) => map.set(key, value))
    }
  }
  return map
})

// Mock next/router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
}))
