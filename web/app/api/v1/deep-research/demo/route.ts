
import { NextRequest, NextResponse } from 'next/server'

// Debug logging - always enabled in development, can be enabled via DEBUG=true
const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true'

function log(level: 'info' | 'warn' | 'error', tag: string, data: any) {
    const timestamp = new Date().toISOString()
    const prefix = `[Playground:${tag}]`
    const emoji = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '📝'

    if (level === 'error') {
        console.error(`${timestamp} ${emoji} ${prefix}`, typeof data === 'object' ? JSON.stringify(data, null, 2) : data)
    } else if (DEBUG || level === 'warn') {
        console.log(`${timestamp} ${emoji} ${prefix}`, typeof data === 'object' ? JSON.stringify(data, null, 2) : data)
    }
}

// Helper to get the base URL
function getBaseUrl() {
    if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
    return 'http://localhost:3000'
}

export async function POST(req: NextRequest) {
    const requestId = `demo_${Date.now().toString(36)}`
    const startTime = performance.now()

    log('info', 'request:start', { requestId })

    // 1. Get the demo key from env
    const demoKey = process.env.test_key || process.env.DEMO_API_KEY

    if (!demoKey) {
        log('error', 'config:missing', { requestId, error: 'No demo key configured' })
        return NextResponse.json(
            { error: 'Demo configuration missing. Please contact support.' },
            { status: 500 }
        )
    }

    log('info', 'config:ok', { requestId, keyPrefix: demoKey.substring(0, 8) + '...' })

    try {
        // 2. Parse the request body
        const body = await req.json()
        log('info', 'request:body', {
            requestId,
            mode: body.mode || 'report',
            query: body.query?.substring(0, 50) || '[compare mode]',
            preset: body.preset || 'general',
            stream: body.stream ?? true,
            agentic_loop: body.agentic_loop ?? false
        })

        // 3. Forward to the main Deep Research API
        const targetUrl = `${getBaseUrl()}/api/v1/deep-research`
        log('info', 'proxy:start', { requestId, targetUrl })

        const proxyStart = performance.now()
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${demoKey}`,
            },
            body: JSON.stringify(body),
        })

        log('info', 'proxy:response', {
            requestId,
            status: response.status,
            statusText: response.statusText,
            proxyLatencyMs: Math.round(performance.now() - proxyStart),
            contentType: response.headers.get('content-type')
        })

        // 4. Check actual response content type from the API
        const apiContentType = response.headers.get('content-type') || ''
        const isStreamResponse = apiContentType.includes('text/event-stream')

        // Handle streaming response ONLY if API actually returned SSE
        if (body.stream && response.body && isStreamResponse) {
            log('info', 'stream:start', { requestId })

            let chunkCount = 0
            let totalBytes = 0

            // Create a ReadableStream from the response body to pass through
            const stream = new ReadableStream({
                async start(controller) {
                    const reader = response.body!.getReader()
                    try {
                        while (true) {
                            const { done, value } = await reader.read()
                            if (done) {
                                log('info', 'stream:complete', {
                                    requestId,
                                    chunkCount,
                                    totalBytes,
                                    totalLatencyMs: Math.round(performance.now() - startTime)
                                })
                                break
                            }
                            chunkCount++
                            totalBytes += value.length
                            controller.enqueue(value)
                        }
                    } catch (err: any) {
                        log('error', 'stream:error', {
                            requestId,
                            error: err.message,
                            chunkCount,
                            totalBytes
                        })
                        controller.error(err)
                    } finally {
                        controller.close()
                    }
                }
            })

            return new NextResponse(stream, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                },
            })
        }

        // 5. Handle standard JSON response
        const data = await response.json()

        log('info', 'json:complete', {
            requestId,
            status: response.status,
            hasReport: !!data.report,
            hasFacts: !!data.facts,
            sourcesCount: data.sources?.length || 0,
            totalLatencyMs: Math.round(performance.now() - startTime)
        })

        if (!response.ok) {
            log('warn', 'json:error', { requestId, error: data.error || 'Unknown error', status: response.status })
        }

        return NextResponse.json(data, { status: response.status })

    } catch (error: any) {
        log('error', 'fatal', {
            requestId,
            error: error.message,
            stack: error.stack?.split('\n').slice(0, 3).join(' -> '),
            totalLatencyMs: Math.round(performance.now() - startTime)
        })
        return NextResponse.json(
            { error: 'Internal demo server error', details: error.message },
            { status: 500 }
        )
    }
}
