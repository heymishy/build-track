// Test URL parsing for project ID extraction

const testUrl = 'http://localhost:3003/api/projects/cmekxod5p00034pq9vzq2he1r/delete'

const url = new URL(testUrl)
const pathSegments = url.pathname.split('/')
console.log('URL:', testUrl)
console.log('Pathname:', url.pathname)
console.log('Path segments:', pathSegments)
console.log('Length:', pathSegments.length)
console.log('Project ID (length-2):', pathSegments[pathSegments.length - 2])
console.log('Last segment:', pathSegments[pathSegments.length - 1])

// Expected segments: ['', 'api', 'projects', 'cmekxod5p00034pq9vzq2he1r', 'delete']
// So projectId should be at index 3 or length-2
