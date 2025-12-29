import Redis from 'ioredis'


export const redisClient= new Redis({
    //127.0.0.1:6379
    host:"127.0.0.1",
    port: 6379
})


