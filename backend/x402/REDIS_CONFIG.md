# Redis Replay Store Configuration

## Overview

The x402 middleware supports two replay protection strategies:

1. **In-Memory Store** (default) - Simple, single-server only
2. **Redis Store** (production) - Distributed, multi-server safe

## Configuration

### Environment Variable

Add to `backend/.env`:

```bash
# Optional: Redis connection URL
# If not set, falls back to in-memory store
REDIS_URL=redis://localhost:6379

# Or with authentication:
REDIS_URL=redis://:password@hostname:6379

# Or Redis Cloud / Upstash:
REDIS_URL=rediss://default:password@hostname:6379
```

### Automatic Fallback

If Redis connection fails, the middleware automatically falls back to in-memory store for that request. This ensures service availability even during Redis outages.

## Local Development with Redis

### Option 1: Docker

```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### Option 2: Windows (Memurai)

Download and install [Memurai](https://www.memurai.com/) (Redis-compatible for Windows).

### Option 3: WSL2

```bash
wsl
sudo apt-get update
sudo apt-get install redis-server
redis-server --daemonize yes
```

## Production Deployment

### Managed Redis Services

1. **Upstash** (serverless, pay-per-request)
   - Free tier: 10k commands/day
   - Global edge caching
   - https://upstash.com/

2. **Redis Cloud** (Redis Labs)
   - Free tier: 30 MB
   - https://redis.com/

3. **AWS ElastiCache**
   - Managed Redis clusters
   - VPC-integrated

4. **Railway / Render**
   - Add-on Redis instances
   - $5-10/month

### Redis Configuration

Recommended settings for production:

```redis
# Persistence (optional, replay store can be ephemeral)
save ""

# Memory limit with LRU eviction
maxmemory 256mb
maxmemory-policy allkeys-lru

# Security
requirepass <strong-password>
```

## Key Schema

Redis keys follow the pattern:

```
x402:sig:<transaction_signature>
```

Example:
```
x402:sig:5Kn2...7xYz
```

**Value**: Unix timestamp (ms) when signature was first seen

**TTL**: 24 hours (86400 seconds)

## Health Check

The middleware exports a status function:

```typescript
import { getReplayStoreStatus } from './x402/middleware-redis';

app.get('/health', (req, res) => {
  const replayStore = getReplayStoreStatus();
  res.json({
    status: 'ok',
    replay_store: replayStore
  });
});
```

Response:
```json
{
  "status": "ok",
  "replay_store": {
    "type": "redis",
    "connected": true
  }
}
```

## Migration from In-Memory to Redis

1. Set `REDIS_URL` environment variable
2. Restart server
3. Middleware automatically uses Redis
4. No data migration needed (replay cache is ephemeral)

## Monitoring

### Redis Commands Used

- `EXISTS x402:sig:<sig>` - Check if signature consumed
- `SETEX x402:sig:<sig> 86400 <timestamp>` - Mark signature as consumed

### Metrics to Track

- Redis connection status
- Fallback invocations (indicates Redis issues)
- Signature hit/miss rate
- Memory usage

### Alerts

- Redis connection failures
- High fallback rate
- Memory approaching limit

## Performance

### Redis vs In-Memory

| Metric | In-Memory | Redis |
|--------|-----------|-------|
| Latency | ~0.01ms | ~1-5ms |
| Throughput | Very High | High |
| Horizontal Scaling | No | Yes |
| Persistence | No | Optional |
| Memory Limit | Node heap | Configurable |

### Load Testing

Expected performance (Redis Cloud, 1 vCPU):

- **Throughput**: 5,000+ requests/sec
- **p50 Latency**: 2ms
- **p99 Latency**: 10ms

## Troubleshooting

### Redis Connection Fails

**Symptoms**: Logs show "Redis not connected" warnings

**Solutions**:
1. Check `REDIS_URL` format
2. Verify Redis server is running
3. Check network/firewall rules
4. Verify authentication credentials

**Fallback**: Middleware automatically uses in-memory store

### High Memory Usage

**Symptoms**: Redis memory approaching limit

**Solutions**:
1. Increase `maxmemory` limit
2. Enable `maxmemory-policy allkeys-lru`
3. Reduce `REPLAY_TTL_MS` (default 24h)
4. Monitor signature consumption rate

### Signature Not Persisting

**Symptoms**: Same signature accepted multiple times

**Solutions**:
1. Check Redis connection status
2. Verify TTL is set correctly (`TTL x402:sig:<sig>`)
3. Check Redis persistence config
4. Verify clock sync across servers

## Cost Estimation

### Upstash (Serverless)

- Free tier: 10k commands/day (5k payments verified)
- Paid: $0.20 per 100k commands
- **Cost for 1M payments/month**: ~$4

### Redis Cloud

- Free tier: 30 MB (~150k signatures)
- 250 MB: $5/month (~1.25M signatures)
- **Cost for 1M payments/month**: $5

### AWS ElastiCache

- cache.t3.micro: ~$12/month
- cache.t3.small: ~$24/month
- **Cost for 1M payments/month**: $12-24

## Security Considerations

### Authentication

Always require password in production:

```bash
REDIS_URL=redis://:strong-password@hostname:6379
```

### Encryption

Use TLS for Redis connections:

```bash
REDIS_URL=rediss://hostname:6379  # Note: rediss:// not redis://
```

### Network Isolation

- Deploy Redis in same VPC as backend
- Use security groups to restrict access
- Avoid exposing Redis to public internet

### Key Expiration

TTL is enforced by Redis automatically. No manual cleanup needed.

## Testing

### Verify Redis Connection

```bash
redis-cli -u $REDIS_URL ping
# Response: PONG
```

### Check Consumed Signatures

```bash
redis-cli -u $REDIS_URL --scan --pattern "x402:sig:*"
```

### Inspect Signature

```bash
redis-cli -u $REDIS_URL GET "x402:sig:5Kn2...7xYz"
redis-cli -u $REDIS_URL TTL "x402:sig:5Kn2...7xYz"
```

### Clear All Signatures (Testing Only)

```bash
redis-cli -u $REDIS_URL --scan --pattern "x402:sig:*" | xargs redis-cli -u $REDIS_URL DEL
```
