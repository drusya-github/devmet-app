# Webhooks Module

This module handles GitHub webhook events for real-time repository activity tracking.

## Overview

When repositories are connected to DevMetrics, GitHub webhooks are automatically configured to send events to our API. This module receives, validates, and processes those webhook events.

## Features

- ✅ **HMAC SHA-256 Signature Verification**: Secures webhooks against unauthorized requests
- ✅ **Async Processing**: Queues events for background processing
- ✅ **Multiple Event Types**: Supports push, pull_request, issues, pull_request_review, and more
- ✅ **Repository Validation**: Ensures webhooks are for connected repositories
- ✅ **Comprehensive Logging**: Tracks all webhook receipts and processing
- ✅ **Error Handling**: Graceful handling of invalid or malformed webhooks
- ✅ **Idempotency**: Uses delivery ID to prevent duplicate processing

## Architecture

```
GitHub → Webhook Endpoint → Signature Verification → Queue → Worker (Task 21)
                                    ↓
                              Immediate 200 OK
```

### Flow

1. **GitHub sends webhook** to `POST /api/webhooks/github`
2. **Extract headers**: Event type, delivery ID, signature
3. **Verify signature**: HMAC SHA-256 with webhook secret
4. **Validate repository**: Check if repo is connected
5. **Validate payload**: Zod schema validation
6. **Queue event**: Add to Bull queue for async processing
7. **Return 200 OK**: Immediately to prevent GitHub timeout
8. **Worker processes** (Task 21): Updates database with event data

## Files

### Core Files

- **`webhooks.types.ts`**: TypeScript type definitions for webhook events
- **`webhooks.validation.ts`**: Zod schemas for payload validation
- **`webhooks.service.ts`**: Business logic and signature verification
- **`webhooks.controller.ts`**: HTTP request handlers
- **`webhooks.routes.ts`**: Route registration
- **`webhooks.queue.ts`**: Bull queue configuration

### Test Files

- **`__tests__/sample-payloads/`**: Sample webhook payloads for testing
  - `push.json` - Push event (commits)
  - `pull_request.json` - Pull request opened/closed/merged
  - `issues.json` - Issue opened/closed
  - `pull_request_review.json` - PR review submitted

## API Endpoints

### POST /api/webhooks/github

Main webhook endpoint that receives events from GitHub.

**Authentication**: None (secured by HMAC signature)  
**Rate Limiting**: Disabled (must receive all events from GitHub)

**Headers Required**:
```
X-GitHub-Event: push|pull_request|issues|pull_request_review
X-GitHub-Delivery: <UUID>
X-Hub-Signature-256: sha256=<HMAC>
```

**Response**:
```json
{
  "success": true,
  "message": "Webhook received and queued for processing",
  "deliveryId": "12345678-1234-1234-1234-123456789abc",
  "receivedAt": "2023-11-10T12:00:00.000Z"
}
```

### GET /api/webhooks/health

Health check endpoint for webhook service.

**Authentication**: None

**Response**:
```json
{
  "status": "healthy",
  "service": "webhooks",
  "timestamp": "2023-11-10T12:00:00.000Z",
  "queue": {
    "waiting": 0,
    "active": 0,
    "completed": 150,
    "failed": 2,
    "delayed": 0
  }
}
```

### GET /api/webhooks/stats

Get webhook processing statistics.

**Authentication**: Required (JWT)

**Response**:
```json
{
  "success": true,
  "stats": {
    "queue": {
      "waiting": 0,
      "active": 2,
      "completed": 150,
      "failed": 2,
      "delayed": 0,
      "total": 154
    },
    "totalReceived": 154,
    "totalProcessed": 150,
    "totalFailed": 2
  },
  "timestamp": "2023-11-10T12:00:00.000Z"
}
```

## Supported Event Types

| Event Type | Description | Tracked Data |
|------------|-------------|--------------|
| `push` | Code commits pushed | Commits, authors, files changed |
| `pull_request` | PR opened/closed/merged | PR metadata, state changes |
| `pull_request_review` | PR review submitted | Review comments, approval state |
| `pull_request_review_comment` | Comments on PR | Review feedback |
| `issues` | Issue opened/closed | Issue metadata, state changes |
| `issue_comment` | Comments on issues | Issue discussions |
| `create` | Branch/tag created | Branch creation events |
| `delete` | Branch/tag deleted | Branch deletion events |

## Security

### Signature Verification

All webhooks are verified using HMAC SHA-256 signature:

```typescript
// GitHub sends signature in X-Hub-Signature-256 header
// Format: sha256=<hex_signature>

const hmac = crypto.createHmac('sha256', webhookSecret);
hmac.update(rawPayloadBody);
const expectedSignature = hmac.digest('hex');

// Timing-safe comparison
const isValid = crypto.timingSafeEqual(
  Buffer.from(receivedSignature, 'hex'),
  Buffer.from(expectedSignature, 'hex')
);
```

### Two-Level Secrets

1. **Repository-specific secret**: Stored in `repositories.webhookSecret`
2. **Global fallback secret**: `GITHUB_WEBHOOK_SECRET` environment variable

The service tries repository-specific secret first, then falls back to global secret.

### Repository Validation

Webhooks are only processed if:
- Repository exists in database
- Repository is connected to an organization
- Signature verification passes

## Configuration

### Environment Variables

```env
# Required
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here

# Redis (for queue)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Webhook Configuration on GitHub

When a repository is connected (Task 18), a webhook is automatically created with:

- **URL**: `${API_URL}/api/webhooks/github`
- **Content type**: `application/json`
- **Secret**: Repository-specific or global secret
- **Events**: push, pull_request, pull_request_review, issues, etc.
- **SSL verification**: Required

## Queue Configuration

Webhooks are processed asynchronously using Bull queues:

- **Queue Name**: `webhooks`
- **Redis DB**: 1 (shared with import queue)
- **Concurrency**: 3 workers (Task 21)
- **Retry**: 3 attempts with exponential backoff (2s, 4s, 8s)
- **Timeout**: 2 minutes per job
- **Cleanup**: Keeps last 100 completed, 500 failed jobs

## Error Handling

### Signature Verification Failed
- Returns 401 Unauthorized
- Logs error with delivery ID
- GitHub will retry webhook

### Repository Not Found
- Returns 200 OK (to prevent retry)
- Logs warning
- Webhook ignored

### Invalid Payload
- Returns 400 Bad Request
- Logs validation errors
- GitHub will retry webhook

### Queue Error
- Returns 500 Internal Server Error
- Logs error details
- GitHub will retry webhook

### Unsupported Event Type
- Returns 200 OK (acknowledged)
- Logs debug message
- Webhook ignored gracefully

## Testing

### Manual Testing with Sample Payloads

```bash
# Generate signature
SECRET="your_webhook_secret"
PAYLOAD='{"repository":{"id":123456789}}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')

# Send test webhook
curl -X POST http://localhost:3001/api/webhooks/github \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -H "X-GitHub-Delivery: $(uuidgen)" \
  -H "X-Hub-Signature-256: sha256=$SIGNATURE" \
  -d @sample-payloads/push.json
```

### Integration Tests

```bash
# Run webhook tests
npm test -- webhooks

# Run with coverage
npm run test:coverage -- webhooks
```

## Monitoring

### Queue Monitoring

```bash
# Check queue stats
curl http://localhost:3001/api/webhooks/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Logs

```bash
# Watch webhook logs
tail -f logs/combined.log | grep "webhook"

# Filter by event type
tail -f logs/combined.log | grep "event=push"

# Filter by repository
tail -f logs/combined.log | grep "repositoryId=123456789"
```

## Performance

- **Signature Verification**: ~1-2ms
- **Repository Validation**: ~5-10ms (database query)
- **Queue Add**: ~5-10ms
- **Total Response Time**: ~20-30ms

Target: Respond within 100ms to prevent GitHub timeouts.

## Next Steps

**Task 21** will implement:
- Webhook worker/processor
- Event-specific handlers (push, PR, issues)
- Database updates from webhook events
- Metrics calculation triggers

## Troubleshooting

### Webhook Not Received

1. Check GitHub webhook delivery tab
2. Verify webhook URL is accessible from internet
3. Check firewall/network settings
4. Verify webhook is active on GitHub

### Signature Verification Failed

1. Verify `GITHUB_WEBHOOK_SECRET` is correct
2. Check repository's `webhookSecret` field
3. Ensure raw body is used for verification
4. Check for extra whitespace/encoding issues

### Queue Not Processing

1. Check Redis connection
2. Verify worker is running (Task 21)
3. Check queue statistics
4. Review failed jobs for errors

## References

- [GitHub Webhooks Documentation](https://docs.github.com/en/developers/webhooks-and-events/webhooks)
- [Securing Webhooks](https://docs.github.com/en/developers/webhooks-and-events/webhooks/securing-your-webhooks)
- [Bull Queue Documentation](https://github.com/OptimalBits/bull)




