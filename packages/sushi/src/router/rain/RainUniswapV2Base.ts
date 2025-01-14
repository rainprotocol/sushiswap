import { Log, parseAbiItem, parseEventLogs } from 'viem'
import { Token } from '../../currency/index.js'
import { ConstantProductRPool, RToken } from '../../tines/index.js'
import { DataFetcherOptions } from '../data-fetcher.js'
import { filterOnDemandPools } from '../lib/api.js'
import {
  StaticPool,
  UniswapV2BaseProvider,
} from '../liquidity-providers/UniswapV2Base.js'
import { ConstantProductPoolCode, type PoolCode } from '../pool-codes/index.js'

// extends v2 static pool
export interface RainV2Pool extends StaticPool {
  reserve0: bigint
  reserve1: bigint
  blockNumber: bigint
}

export const UniV2EventsAbi = [
  parseAbiItem('event Sync(uint112 reserve0, uint112 reserve1)'),
  parseAbiItem(
    'event PairCreated(address indexed token0, address indexed token1, address pair, uint)',
  ),
]

export abstract class RainUniswapV2BaseProvider extends UniswapV2BaseProvider {
  nonExistentPools: Map<string, number> = new Map()
  pools: Map<string, RainV2Pool> = new Map()
  eventsAbi = UniV2EventsAbi

  override async getOnDemandPools(
    t0: Token,
    t1: Token,
    excludePools?: Set<string>,
    options?: DataFetcherOptions,
  ): Promise<void> {
    const topPoolAddresses = Array.from(this.topPools.keys())
    let pools =
      topPoolAddresses.length > 0
        ? filterOnDemandPools(
            Array.from(this.availablePools.values()),
            t0.address,
            t1.address,
            topPoolAddresses,
            this.ON_DEMAND_POOL_SIZE,
          )
        : this.getStaticPools(t0, t1)
    if (excludePools)
      pools = (pools as RainV2Pool[]).filter(
        (p) => !excludePools.has(p.address),
      )

    if (pools.length === 0) {
      return
    }

    this.poolsByTrade.set(
      this.getTradeId(t0, t1),
      pools.map((pool) => pool.address.toLowerCase() as `0x${string}`),
    )
    const poolCodesToCreate: RainV2Pool[] = []
    pools.forEach((pool) => {
      const existingPool = this.pools.get(pool.address.toLowerCase())
      const nonExistentPool = this.nonExistentPools.get(
        pool.address.toLowerCase(),
      )
      if (
        existingPool === undefined &&
        (!nonExistentPool || nonExistentPool < 2)
      ) {
        poolCodesToCreate.push({
          ...pool,
          blockNumber: options?.blockNumber ?? 0n,
        } as RainV2Pool)
      }
    })

    const reserves = await this.getReserves(
      poolCodesToCreate.map((v) => v.address),
      options,
    )
    this.setPool(poolCodesToCreate, reserves)
  }

  override getCurrentPoolList(t0: Token, t1: Token): PoolCode[] {
    const tradeId = this.getTradeId(t0, t1)
    const poolsByTrade = this.poolsByTrade.get(tradeId) ?? []
    const onDemandPoolCodes = poolsByTrade
      ? Array.from(this.pools)
          .filter(([poolAddress]) =>
            poolsByTrade.includes(poolAddress as `0x${string}`),
          )
          .map(([, pool]) => {
            const rPool = new ConstantProductRPool(
              pool.address,
              pool.token0 as RToken,
              pool.token1 as RToken,
              'fee' in pool ? pool.fee : this.fee,
              pool.reserve0,
              pool.reserve1,
            )
            return new ConstantProductPoolCode(
              rPool,
              this.getType(),
              this.getPoolProviderName(),
            )
          })
      : []

    return [...this.topPools.values(), onDemandPoolCodes].flat()
  }

  override processLog(log: Log) {
    const factory =
      this.factory[this.chainId as keyof typeof this.factory]!.toLowerCase()
    const logAddress = log.address.toLowerCase()
    if (logAddress === factory) {
      try {
        const event = parseEventLogs({
          logs: [log],
          abi: this.eventsAbi,
          eventName: 'PairCreated',
        })[0]!
        this.nonExistentPools.delete(event.args[2].toLowerCase())
      } catch {}
    } else {
      const pool = this.pools.get(logAddress as `0x${string}`)
      if (pool) {
        if (log.blockNumber! >= pool.blockNumber) {
          try {
            const event = parseEventLogs({
              logs: [log],
              abi: this.eventsAbi,
              eventName: 'Sync',
            })[0]!
            pool.blockNumber = log.blockNumber!
            pool.reserve0 = event.args.reserve0
            pool.reserve1 = event.args.reserve1
          } catch {}
        }
      }
    }
  }

  setPool(poolCodesToCreate: RainV2Pool[], reserves: any[]) {
    poolCodesToCreate.forEach((pool, i) => {
      const res0 = reserves?.[i]?.result?.[0]
      const res1 = reserves?.[i]?.result?.[1]

      if (res0 !== undefined && res1 !== undefined) {
        this.pools.set(pool.address.toLowerCase(), {
          ...pool,
          reserve0: res0,
          reserve1: res1,
        })
      } else {
        const nonExistentPool = this.nonExistentPools.get(
          pool.address.toLowerCase(),
        )
        if (nonExistentPool) {
          this.nonExistentPools.set(
            pool.address.toLowerCase(),
            nonExistentPool + 1,
          )
        } else {
          this.nonExistentPools.set(pool.address.toLowerCase(), 1)
        }
      }
    })
  }
}
