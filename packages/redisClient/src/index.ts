import Redis from 'ioredis'


export function redisClient() {
    // Support REDIS_URL (Render.com) or REDIS_HOST/REDIS_PORT (Docker Compose)
    const redis = process.env.REDIS_URL
        ? new Redis(process.env.REDIS_URL)
        : new Redis({
            host: process.env.REDIS_HOST || "redis",
            port: Number(process.env.REDIS_PORT) || 6379
        })

    redis.on('connect', () => {
        console.log('connected tot he redis client')
    })
    return redis
}



