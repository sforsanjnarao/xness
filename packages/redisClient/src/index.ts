import Redis from 'ioredis'


export function redisClient() {
    const redis = new Redis({
        host: process.env.REDIS_HOST || "localhost",
        // host: process.env.REDIS_HOST || "redis",
        port: Number(process.env.REDIS_PORT) || 6379
    })

    redis.on('connect', () => {
        console.log('connected tot he redis client')
    })
    return redis
}



