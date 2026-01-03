- running postgresql from docker
steps:
    - Creating the Docker Postgres instance
        docker run -d -e POSTGRES_DB=mydb -e POSTGRES_PASSWORD=testpass123 -e POSTGRES_USER=postgres -p "6500:5432" postgres

    - Now let’s take a look at the prisma DATABASE_URL
            DATABASE_URL="postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@localhost:{PORT}/{POSTGRES_DB}?schema=public"

    - Docker Compose Example

        services:
        postgres:
            container_name: postgres
            image: postgres
            environment:
            - POSTGRES_USER=postgres
            - POSTGRES_PASSWORD=postgres
            - POSTGRES_DB=mydb
            ports:
            - 6500:5432
            volumes:
            - postgres_data:/var/lib/postgresql/data/





form [text](https://www.prisma.io/docs/guides/docker)



1. Set up your Node.js and Prisma application
    1.1. Initialize your project
    1.2. Install required dependencies
    1.3. Set up Prisma ORM
    1.4. Create an Express.js server
    
2. Set up a PostgreSQL database with Docker Compose
    2.1. Create a Docker Compose file for PostgreSQL
    2.2. Start the PostgreSQL container
    2.3. Perform database migrations
    2.4. Test the application
    2.5. Clean up the standalone database
    
3. Run the app and database together with Docker Compose
    3.1. Option 1: Use Linux Alpine (node:alpine) as a base image
    3.1. Option 2: Use Linux Debian (node:slim) as a base image
    3.2. Create and configure a Docker Compose file
    3.3. Configure environment variable for the container
    3.4. Build and run the application
    3.5. Bonus: Add Prisma Studio for database management