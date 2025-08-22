/**
 * API Route for Testing LLM Provider Connections
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { AnthropicParser } from '@/lib/llm-parsers/anthropic-parser'
import { GeminiParser } from '@/lib/llm-parsers/gemini-parser'
import { SettingsService } from '@/lib/settings-service'

async function POST(request: NextRequest, user: AuthUser) {
  try {
    const { provider, apiKey } = await request.json()

    if (!provider || !apiKey) {
      return NextResponse.json(
        { success: false, error: 'Provider and API key are required' },
        { status: 400 }
      )
    }

    // Test text for validation
    const testText = 'Invoice #12345\nDate: 2024-01-15\nVendor: Test Company\nTotal: $100.00'
    
    let result: { success: boolean; error?: string } = { success: false }

    try {
      switch (provider) {
        case 'anthropic':
          result = await testAnthropicConnection(apiKey, testText)
          break
        case 'gemini':
          result = await testGeminiConnection(apiKey, testText)
          break
        case 'openai':
          result = await testOpenAIConnection(apiKey, testText)
          break
        default:
          return NextResponse.json(
            { success: false, error: 'Unknown provider' },
            { status: 400 }
          )
      }

      // If test is successful, store the API key in database
      if (result.success) {
        const settingsService = new SettingsService(user.id)
        await settingsService.setApiKey(provider, apiKey)
        console.log(`Successfully tested and stored API key for ${provider}`)
      }
    } catch (error) {
      result = {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Provider test error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function testAnthropicConnection(apiKey: string, testText: string): Promise<{ success: boolean; error?: string }> {
  try {
    const parser = new AnthropicParser({
      apiKey,
      model: 'claude-3-5-sonnet-20241022',
      timeout: 10000,
      maxRetries: 1
    })

    const result = await parser.parseInvoice({
      text: testText,
      options: {
        temperature: 0.1,
        maxTokens: 500
      }
    })

    return {
      success: result.success,
      error: result.success ? undefined : result.error || 'Test parsing failed'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Anthropic connection failed'
    }
  }
}

async function testGeminiConnection(apiKey: string, testText: string): Promise<{ success: boolean; error?: string }> {
  try {
    const parser = new GeminiParser({
      apiKey,
      model: 'gemini-1.5-flash',
      timeout: 10000,
      maxRetries: 1
    })

    const result = await parser.parseInvoice({
      text: testText,
      options: {
        temperature: 0.1,
        maxTokens: 500
      }
    })

    return {
      success: result.success,
      error: result.success ? undefined : result.error || 'Test parsing failed'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gemini connection failed'
    }
  }
}

async function testOpenAIConnection(apiKey: string, testText: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Basic OpenAI API test - simplified for now
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: 'Test connection: extract invoice number from: ' + testText
        }],
        max_tokens: 50,
        temperature: 0.1
      })
    })

    if (response.ok) {
      return { success: true }
    } else {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      return {
        success: false,
        error: `OpenAI API error: ${errorData.error?.message || 'Connection failed'}`
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'OpenAI connection failed'
    }
  }
}

// Apply authentication middleware
const protectedPOST = withAuth(POST, {
  resource: 'settings',
  action: 'update',
  requireAuth: true,
})

export { protectedPOST as POST }