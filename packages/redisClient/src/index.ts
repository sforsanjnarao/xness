import Redis from 'ioredis'


export function redisClient(){
    const redis= new Redis({
        //127.0.0.1:6379
        host:"127.0.0.1",
        port: 6379 as number
    })

    redis.on('connect',()=>{
        console.log('connected tot he redis client')
    })
    return redis
}



