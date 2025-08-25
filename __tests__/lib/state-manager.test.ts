/**
 * @jest-environment jsdom
 */
import {
  createEntityReducer,
  createInitialEntityState,
  createEntityActions,
  StateCache,
  ApiClient,
  QueryBuilder,
  handleStateError,
  StateError,
} from '@/lib/state-manager'
import type { BaseEntity, EntityState, StateAction } from '@/types'

// Mock entity for testing
interface TestEntity extends BaseEntity {
  name: string
  value: number
}

describe('State Manager', () => {
  describe('Entity Reducer', () => {
    const reducer = createEntityReducer<TestEntity>()
    let initialState: EntityState<TestEntity>

    beforeEach(() => {
      initialState = createInitialEntityState<TestEntity>()
    })

    it('should handle SET_LOADING', () => {
      const action: StateAction<TestEntity> = { type: 'SET_LOADING', payload: true }
      const newState = reducer(initialState, action)

      expect(newState.isLoading).toBe(true)
      expect(newState.error).toBeNull()
    })

    it('should handle SET_ERROR', () => {
      const action: StateAction<TestEntity> = { type: 'SET_ERROR', payload: 'Test error' }
      const newState = reducer(initialState, action)

      expect(newState.isLoading).toBe(false)
      expect(newState.error).toBe('Test error')
    })

    it('should handle SET_ENTITIES', () => {
      const entities: TestEntity[] = [
        { id: '1', name: 'Test 1', value: 10, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', name: 'Test 2', value: 20, createdAt: new Date(), updatedAt: new Date() },
      ]
      const action: StateAction<TestEntity> = { type: 'SET_ENTITIES', payload: entities }
      const newState = reducer(initialState, action)

      expect(newState.entities).toEqual(entities)
      expect(newState.isLoading).toBe(false)
      expect(newState.error).toBeNull()
      expect(newState.lastUpdated).toBeInstanceOf(Date)
    })

    it('should handle ADD_ENTITY', () => {
      const entity: TestEntity = {
        id: '1',
        name: 'Test 1',
        value: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const action: StateAction<TestEntity> = { type: 'ADD_ENTITY', payload: entity }
      const newState = reducer(initialState, action)

      expect(newState.entities).toContain(entity)
      expect(newState.entities.length).toBe(1)
      expect(newState.lastUpdated).toBeInstanceOf(Date)
    })

    it('should handle UPDATE_ENTITY', () => {
      const entity: TestEntity = {
        id: '1',
        name: 'Test 1',
        value: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const stateWithEntity = { ...initialState, entities: [entity] }

      const action: StateAction<TestEntity> = {
        type: 'UPDATE_ENTITY',
        payload: { id: '1', updates: { name: 'Updated Test', value: 15 } },
      }
      const newState = reducer(stateWithEntity, action)

      expect(newState.entities[0].name).toBe('Updated Test')
      expect(newState.entities[0].value).toBe(15)
      expect(newState.entities[0].id).toBe('1') // ID unchanged
      expect(newState.lastUpdated).toBeInstanceOf(Date)
    })

    it('should handle REMOVE_ENTITY', () => {
      const entities: TestEntity[] = [
        { id: '1', name: 'Test 1', value: 10, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', name: 'Test 2', value: 20, createdAt: new Date(), updatedAt: new Date() },
      ]
      const stateWithEntities = { ...initialState, entities, selectedId: '1' }

      const action: StateAction<TestEntity> = { type: 'REMOVE_ENTITY', payload: '1' }
      const newState = reducer(stateWithEntities, action)

      expect(newState.entities).toHaveLength(1)
      expect(newState.entities[0].id).toBe('2')
      expect(newState.selectedId).toBeNull() // Selected item removed
    })

    it('should handle SET_SELECTED', () => {
      const action: StateAction<TestEntity> = { type: 'SET_SELECTED', payload: 'test-id' }
      const newState = reducer(initialState, action)

      expect(newState.selectedId).toBe('test-id')
    })

    it('should handle SET_FILTERS', () => {
      const filters = { status: 'active', category: 'test' }
      const action: StateAction<TestEntity> = { type: 'SET_FILTERS', payload: filters }
      const newState = reducer(initialState, action)

      expect(newState.filters).toEqual(filters)
    })

    it('should handle SET_PAGINATION', () => {
      const pagination = { page: 2, limit: 10, total: 100, hasMore: true }
      const action: StateAction<TestEntity> = { type: 'SET_PAGINATION', payload: pagination }
      const newState = reducer(initialState, action)

      expect(newState.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 100,
        hasMore: true,
      })
    })

    it('should handle RESET_STATE', () => {
      const modifiedState = {
        ...initialState,
        entities: [
          { id: '1', name: 'Test', value: 10, createdAt: new Date(), updatedAt: new Date() },
        ],
        selectedId: '1',
        isLoading: true,
        error: 'Some error',
      }

      const action: StateAction<TestEntity> = { type: 'RESET_STATE' }
      const newState = reducer(modifiedState, action)

      expect(newState).toEqual(createInitialEntityState<TestEntity>())
    })
  })

  describe('Entity Actions', () => {
    let mockDispatch: jest.Mock
    let state: EntityState<TestEntity>
    let actions: ReturnType<typeof createEntityActions<TestEntity>>

    beforeEach(() => {
      mockDispatch = jest.fn()
      state = createInitialEntityState<TestEntity>()
      actions = createEntityActions<TestEntity>(mockDispatch, state)
    })

    it('should dispatch SET_LOADING', () => {
      actions.setLoading(true)
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_LOADING', payload: true })
    })

    it('should dispatch SET_ERROR', () => {
      actions.setError('Test error')
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_ERROR', payload: 'Test error' })
    })

    it('should dispatch SET_ENTITIES', () => {
      const entities: TestEntity[] = [
        { id: '1', name: 'Test', value: 10, createdAt: new Date(), updatedAt: new Date() },
      ]
      actions.setEntities(entities)
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_ENTITIES', payload: entities })
    })

    it('should find entity by ID', () => {
      const entity: TestEntity = {
        id: '1',
        name: 'Test',
        value: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const stateWithEntity = { ...state, entities: [entity] }
      const actionsWithState = createEntityActions<TestEntity>(mockDispatch, stateWithEntity)

      const found = actionsWithState.findById('1')
      expect(found).toEqual(entity)

      const notFound = actionsWithState.findById('999')
      expect(notFound).toBeUndefined()
    })

    it('should find many entities by predicate', () => {
      const entities: TestEntity[] = [
        { id: '1', name: 'Test 1', value: 10, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', name: 'Test 2', value: 20, createdAt: new Date(), updatedAt: new Date() },
        { id: '3', name: 'Other', value: 30, createdAt: new Date(), updatedAt: new Date() },
      ]
      const stateWithEntities = { ...state, entities }
      const actionsWithState = createEntityActions<TestEntity>(mockDispatch, stateWithEntities)

      const testEntities = actionsWithState.findMany(e => e.name.startsWith('Test'))
      expect(testEntities).toHaveLength(2)
      expect(testEntities.map(e => e.id)).toEqual(['1', '2'])
    })

    it('should handle API response with single entity', () => {
      const entity: TestEntity = {
        id: '1',
        name: 'Test',
        value: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const response = { success: true, data: entity }

      actions.handleApiResponse(response)
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'ADD_ENTITY', payload: entity })
    })

    it('should handle API response with array of entities', () => {
      const entities: TestEntity[] = [
        { id: '1', name: 'Test 1', value: 10, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', name: 'Test 2', value: 20, createdAt: new Date(), updatedAt: new Date() },
      ]
      const response = { success: true, data: entities }

      actions.handleApiResponse(response)
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_ENTITIES', payload: entities })
    })

    it('should handle API error response', () => {
      const response = { success: false, error: 'API Error' }

      actions.handleApiResponse(response)
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_ERROR', payload: 'API Error' })
    })

    it('should wrap operations with loading state', async () => {
      const mockOperation = jest.fn().mockResolvedValue('result')

      const result = await actions.withLoadingState(mockOperation)

      expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_LOADING', payload: true })
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_LOADING', payload: false })
      expect(result).toBe('result')
    })

    it('should handle operation errors in withLoadingState', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Operation failed'))

      await expect(actions.withLoadingState(mockOperation)).rejects.toThrow('Operation failed')

      expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_LOADING', payload: true })
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_ERROR',
        payload: 'Operation failed',
      })
    })
  })

  describe('StateCache', () => {
    let cache: StateCache

    beforeEach(() => {
      cache = new StateCache()
    })

    it('should set and get cached data', () => {
      const data = { id: '1', name: 'Test' }
      cache.set('test-key', data)

      const retrieved = cache.get('test-key')
      expect(retrieved).toEqual(data)
    })

    it('should return null for non-existent keys', () => {
      const retrieved = cache.get('non-existent')
      expect(retrieved).toBeNull()
    })

    it('should return null for expired data', done => {
      const data = { id: '1', name: 'Test' }
      cache.set('test-key', data, 10) // 10ms TTL

      setTimeout(() => {
        const retrieved = cache.get('test-key')
        expect(retrieved).toBeNull()
        done()
      }, 20)
    })

    it('should check if key exists and is not expired', () => {
      const data = { id: '1', name: 'Test' }
      cache.set('test-key', data)

      expect(cache.has('test-key')).toBe(true)
      expect(cache.has('non-existent')).toBe(false)
    })

    it('should clear specific key', () => {
      cache.set('key1', 'data1')
      cache.set('key2', 'data2')

      cache.clear('key1')

      expect(cache.has('key1')).toBe(false)
      expect(cache.has('key2')).toBe(true)
    })

    it('should clear all keys', () => {
      cache.set('key1', 'data1')
      cache.set('key2', 'data2')

      cache.clear()

      expect(cache.has('key1')).toBe(false)
      expect(cache.has('key2')).toBe(false)
    })

    it('should provide cache statistics', () => {
      cache.set('key1', 'data1')
      cache.set('key2', 'data2')

      const stats = cache.getStats()
      expect(stats.size).toBe(2)
      expect(stats.keys).toEqual(['key1', 'key2'])
      expect(stats.memory).toBeGreaterThan(0)
    })
  })

  describe('QueryBuilder', () => {
    let builder: QueryBuilder

    beforeEach(() => {
      builder = QueryBuilder.create()
    })

    it('should build empty query', () => {
      expect(builder.build()).toBe('')
    })

    it('should build query with where conditions', () => {
      const query = builder.where('status', 'active').where('category', 'test').build()

      expect(query).toContain('status=active')
      expect(query).toContain('category=test')
    })

    it('should skip undefined values in where', () => {
      const query = builder
        .where('status', 'active')
        .where('category', undefined)
        .where('name', '')
        .build()

      expect(query).toBe('?status=active')
    })

    it('should build query with whereIn', () => {
      const query = builder.whereIn('status', ['active', 'pending']).build()

      expect(query).toBe('?status=active%2Cpending')
    })

    it('should build query with pagination', () => {
      const query = builder.paginate(2, 50).build()

      expect(query).toContain('page=2')
      expect(query).toContain('limit=50')
    })

    it('should build query with sorting', () => {
      const query = builder.sort('name', 'desc').build()

      expect(query).toContain('sortBy=name')
      expect(query).toContain('sortOrder=desc')
    })

    it('should build query with search', () => {
      const query = builder.search('test search').build()

      expect(query).toBe('?search=test+search')
    })

    it('should skip empty search', () => {
      const query = builder.search('  ').build()

      expect(query).toBe('')
    })

    it('should build query with range', () => {
      const query = builder.range('price', 10, 100).build()

      expect(query).toContain('priceMin=10')
      expect(query).toContain('priceMax=100')
    })

    it('should build query with date range', () => {
      const query = builder.dateRange('created', '2023-01-01', '2023-12-31').build()

      expect(query).toContain('createdStart=2023-01-01')
      expect(query).toContain('createdEnd=2023-12-31')
    })

    it('should build complex query', () => {
      const query = builder
        .where('status', 'active')
        .whereIn('category', ['test', 'prod'])
        .paginate(2, 25)
        .sort('name')
        .search('test')
        .range('price', 0, 1000)
        .build()

      expect(query).toMatch(/^\?/)
      expect(query).toContain('status=active')
      expect(query).toContain('category=test%2Cprod')
      expect(query).toContain('page=2')
      expect(query).toContain('limit=25')
      expect(query).toContain('search=test')
      expect(query).toContain('priceMin=0')
      expect(query).toContain('priceMax=1000')
    })
  })

  describe('Error Handling', () => {
    it('should create StateError', () => {
      const error = new StateError('Test error', 'TEST_ERROR', 'field')

      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_ERROR')
      expect(error.field).toBe('field')
      expect(error.name).toBe('StateError')
    })

    it('should handle StateError in handleStateError', () => {
      const original = new StateError('Original error', 'ORIGINAL')
      const handled = handleStateError(original)

      expect(handled).toBe(original)
    })

    it('should handle regular Error in handleStateError', () => {
      const original = new Error('Regular error')
      const handled = handleStateError(original)

      expect(handled).toBeInstanceOf(StateError)
      expect(handled.message).toBe('Regular error')
      expect(handled.code).toBe('UNKNOWN_ERROR')
    })

    it('should handle unknown errors in handleStateError', () => {
      const handled = handleStateError('string error')

      expect(handled).toBeInstanceOf(StateError)
      expect(handled.message).toBe('An unknown error occurred')
      expect(handled.code).toBe('UNKNOWN_ERROR')
    })
  })
})
