// AI Service for generating bug reports
// Uses Anthropic Claude API when available, falls back to rule-based generation

let anthropic = null

async function getAnthropicClient() {
  if (!anthropic) {
    try {
      const { Anthropic } = await import('@anthropic-ai/sdk')
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (apiKey) {
        anthropic = new Anthropic({ apiKey })
      }
    } catch (err) {
      console.log('Anthropic SDK not available, using fallback generation')
    }
  }
  return anthropic
}

export async function generateBugReport({ title, project, severity, errorInput }) {
  const client = await getAnthropicClient()

  if (client) {
    return generateWithClaude(client, { title, project, severity, errorInput })
  }

  return generateFallback({ title, project, severity, errorInput })
}

async function generateWithClaude(client, { title, project, severity, errorInput }) {
  const systemPrompt = `You are an expert bug report analyst. Generate a structured, comprehensive bug report from the provided error information. Your output must be valid JSON with these exact fields:
{
  "title": "concise bug title",
  "severity": "critical|high|medium|low",
  "summary": "2-3 sentence summary",
  "steps": ["step 1", "step 2", ...],
  "expected": "expected behavior description",
  "actual": "actual behavior description",
  "rootCause": "root cause analysis",
  "fix": "suggested code fix or solution",
  "tags": ["tag1", "tag2", ...],
  "confidence": 0-100
}`

  const userPrompt = `
Project: ${project || 'Not specified'}
Initial Severity: ${severity || 'medium'}
Error/Issue Information:
${errorInput}

Generate a comprehensive bug report in JSON format.
`

  const response = await client.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  })

  const content = response.content[0].text
  const jsonMatch = content.match(/\{[\s\S]*\}/)

  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0])
    return {
      title: parsed.title,
      severity: parsed.severity,
      summary: parsed.summary,
      steps: parsed.steps,
      expected: parsed.expected,
      actual: parsed.actual,
      rootCause: parsed.rootCause,
      fix: parsed.fix,
      tags: parsed.tags,
      confidence: parsed.confidence
    }
  }

  // Fallback if JSON parsing fails
  return generateFallback({ title, project, severity, errorInput })
}

function generateFallback({ title, project, severity, errorInput }) {
  // Rule-based generation when AI is not available
  const severityLower = (severity || 'medium').toLowerCase()

  // Determine severity based on keywords
  let determinedSeverity = severityLower
  const errorLower = errorInput.toLowerCase()

  if (errorLower.includes('fatal') || errorLower.includes('crash') || errorLower.includes('exception')) {
    determinedSeverity = 'high'
  }
  if (errorLower.includes('undefined') || errorLower.includes('null') || errorLower.includes('cannot read')) {
    determinedSeverity = errorLower.includes('critical') ? 'critical' : determinedSeverity
  }

  // Extract key information from error
  const stackMatch = errorInput.match(/at\s+(\S+)\s+\(([^)]+):(\d+):(\d+)\)/)
  const errorTypeMatch = errorInput.match(/(Error|TypeError|ReferenceError|SyntaxError|RangeError):\s*(.+)/i)

  const fileLocation = stackMatch ? `${stackMatch[2]}:${stackMatch[3]}` : 'unknown location'
  const functionName = stackMatch ? stackMatch[1] : 'unknown function'
  const errorType = errorTypeMatch ? errorTypeMatch[1] : 'Error'
  const errorMessage = errorTypeMatch ? errorTypeMatch[2].trim() : 'An error occurred'

  // Generate structured report
  const generatedTitle = title || `${errorType}: ${errorMessage.substring(0, 50)}`

  const summary = `A ${determinedSeverity} severity bug was encountered in the ${project || 'application'}. The error "${errorMessage}" occurs at ${fileLocation} in the ${functionName} function. This issue prevents the expected functionality from working correctly and requires immediate attention.`

  const steps = [
    'Trigger the specific action or condition that leads to this error',
    'Observe the application behavior when the error occurs',
    `The error manifests at ${fileLocation} in the ${functionName} function`,
    'Record any console output or error messages displayed'
  ]

  const expected = `The application should handle this edge case gracefully without throwing an error. The ${functionName} function should return a valid result or handle the null/undefined case appropriately.`

  const actual = `Currently, the application throws a ${errorType} with the message: "${errorMessage}". This causes the application to fail or display an error state to the user.`

  const rootCause = `The root cause appears to be improper null/undefined handling in the ${functionName} function at ${fileLocation}. The code attempts to access properties or methods on objects that may be null or undefined, causing the runtime error. Additionally, there may be missing input validation or error handling logic.`

  const fix = `// Suggested fix for ${functionName}:

function ${functionName}(params) {
  // Add null/undefined checks
  if (!params || params === null) {
    console.warn('Invalid parameters provided to ${functionName}');
    return null; // or appropriate default value
  }

  // Add validation for specific properties
  if (!params.requiredProperty) {
    throw new Error('Missing required property');
  }

  // Safe access with optional chaining
  const result = params.data?.map(item => processItem(item)) || [];

  return result;
}`

  const tags = [
    project || 'general',
    determinedSeverity,
    errorType.toLowerCase(),
    'runtime-error'
  ].filter((v, i, a) => a.indexOf(v) === i) // unique

  // Calculate confidence based on how much info we have
  let confidence = 60
  if (errorInput.length > 200) confidence += 10
  if (stackMatch) confidence += 10
  if (errorTypeMatch) confidence += 10
  if (title) confidence += 5
  confidence = Math.min(confidence, 95)

  return {
    title: generatedTitle,
    severity: determinedSeverity,
    summary,
    steps,
    expected,
    actual,
    rootCause,
    fix,
    tags,
    confidence
  }
}