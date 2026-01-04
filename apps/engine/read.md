### internal structure of engine


```js
graph TD
    %% --- External Systems ---
    RedisInput[("Redis Stream\n(trading-engine)")]
    RedisOutput[("Redis Stream\n(callback-queue)")]
    Database[("PostgreSQL\n(Prisma)")]

    %% --- The Core Engine ---
    subgraph "Trading Engine Process (Node.js)"
        
        %% --- Initialization ---
        LoadState[("loadState()\nPopulate Memory from DB")]
        
        %% --- Event Loop ---
        EventLoop{"Event Loop\n(redisClient.xread)"}
        Router{"Message Router\n(switch kind)"}

        %% --- In-Memory State (The "Hot" Store) ---
        subgraph "In-Memory State Store (Maps)"
            StateOrders[("Orders Map\nMap<id, engineOrder>")]
            StateBalances[("Balances Map\nMap<userId, Map<asset, val>>")]
            StatePrices[("Prices Map\nMap<symbol, {bid, ask}>")]
        end

        %% --- Logic Handlers ---
        subgraph "Business Logic Handlers"
            H_Price["handlePriceUpdate()"]
            H_Create["handleCreateOrder()"]
            H_Close["handleCloseOrder()"]
            H_Balance["handleBalanceUpdate()"]
        end

        %% --- Risk Engine ---
        subgraph "Risk Management"
            RiskCheck{"checkOrderRisk()"}
            CalcPnL["calcPnl()\n(Integer Math)"]
            LiqLogic["Liquidation / TP / SL Logic"]
        end

        %% --- Persistence Layer ---
        subgraph "Async Persistence"
            DBQueue["dbQueue Array\n(Buffer)"]
            Batcher["processDbQueue()\n(setInterval 1000ms)"]
        end
    end

    %% --- Flows ---

    %% Initialization
    Database -->|Fetch Open Orders & Wallets| LoadState
    LoadState --> StateOrders
    LoadState --> StateBalances

    %% Main Input Loop
    RedisInput -->|1. Consume Message| EventLoop
    EventLoop -->|2. Extract Payload| Router

    %% Routing
    Router -->|"kind: price-update"| H_Price
    Router -->|"kind: create-order"| H_Create
    Router -->|"kind: close-order"| H_Close
    Router -->|"kind: balance-update"| H_Balance

    %% Price Handler Flow (The Heavy Lifter)
    H_Price -->|Update Cache| StatePrices
    H_Price -->|Iterate Open Orders| RiskCheck
    RiskCheck -.->|Read| StateOrders
    RiskCheck -.->|Calculate| CalcPnL
    RiskCheck -->|Condition Met?| LiqLogic
    LiqLogic -->|Trigger Close| H_Close

    %% Create Order Flow
    H_Create -.->|Read Price| StatePrices
    H_Create -.->|Check Margin| StateBalances
    H_Create -->|Deduct Balance| StateBalances
    H_Create -->|Store Order| StateOrders
    H_Create -->|Push Task| DBQueue
    H_Create -->|Ack| RedisOutput

    %% Close Order Flow
    H_Close -.->|Read| StateOrders
    H_Close -->|Credit Balance + PnL| StateBalances
    H_Close -->|Remove| StateOrders
    H_Close -->|Push Task| DBQueue
    H_Close -->|Ack| RedisOutput

    %% Balance Update Flow
    H_Balance -->|Update Map| StateBalances

    %% DB Persistence Flow (Async)
    H_Create & H_Close & H_Balance -.->|Push| DBQueue
    Batcher -->|Splice Batch| DBQueue
    Batcher -->|Bulk Write| Database

    %% Styling
    style RedisInput fill:#ffeba0,stroke:#d4a017
    style RedisOutput fill:#ffeba0,stroke:#d4a017
    style Database fill:#d1e7dd,stroke:#0f5132
    style StateOrders fill:#f8d7da,stroke:#842029
    style StateBalances fill:#f8d7da,stroke:#842029
    style StatePrices fill:#f8d7da,stroke:#842029
```