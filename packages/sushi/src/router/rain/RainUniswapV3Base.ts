import { Address, Log, parseAbiItem, parseEventLogs } from 'viem'
import { erc20Abi, tickLensAbi } from '../../abi/index.js'
import { Token } from '../../currency/index.js'
import { CLTick, RToken, UniV3Pool } from '../../tines/index.js'
import { DataFetcherOptions } from '../data-fetcher.js'
import {
  NUMBER_OF_SURROUNDING_TICKS,
  PoolFilter,
  StaticPoolUniV3,
  UniswapV3BaseProvider,
  V3Pool,
  bitmapIndex,
} from '../liquidity-providers/UniswapV3Base.js'
import { type PoolCode, UniV3PoolCode } from '../pool-codes/index.js'

// extends V3Pool from UniswapV3Base
export interface RainV3Pool extends V3Pool {
  tickSpacing: number
  ticks: Map<number, CLTick[]>
  reserve0: bigint
  reserve1: bigint
  liquidity: bigint
  blockNumber: bigint
}

export const tickSpacingAbi = [
  {
    inputs: [],
    name: 'tickSpacing',
    outputs: [{ internalType: 'int24', name: '', type: 'int24' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

export const UniV3EventsAbi = [
  parseAbiItem(
    'event Mint(address sender, address indexed owner, int24 indexed tickLower, int24 indexed tickUpper, uint128 amount, uint256 amount0, uint256 amount1)',
  ),
  parseAbiItem(
    'event Collect(address indexed owner, address recipient, int24 indexed tickLower, int24 indexed tickUpper, uint128 amount0, uint128 amount1)',
  ),
  parseAbiItem(
    'event Burn(address indexed owner, int24 indexed tickLower, int24 indexed tickUpper, uint128 amount, uint256 amount0, uint256 amount1)',
  ),
  parseAbiItem(
    'event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)',
  ),
  parseAbiItem(
    'event Flash(address indexed sender, address indexed recipient, uint256 amount0, uint256 amount1, uint256 paid0, uint256 paid1)',
  ),
  parseAbiItem(
    'event CollectProtocol(address indexed sender, address indexed recipient, uint128 amount0, uint128 amount1)',
  ),
  parseAbiItem(
    'event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, int24 tickSpacing, address pool)',
  ),
]

export abstract class RainUniswapV3BaseProvider extends UniswapV3BaseProvider {
  pools: Map<string, RainV3Pool> = new Map()
  nonExistentPools: Map<string, number> = new Map()
  eventsAbi = UniV3EventsAbi
  newTicksQueue: [RainV3Pool, number[]][] = []

  override getActiveTick = (tickCurrent: number, tickSpacing?: number) =>
    typeof tickCurrent === 'number' && typeof tickSpacing === 'number'
      ? Math.floor(tickCurrent / tickSpacing) * tickSpacing
      : undefined

  override async fetchPoolData(
    t0: Token,
    t1: Token,
    excludePools?: Set<string> | PoolFilter,
    options?: DataFetcherOptions,
  ): Promise<RainV3Pool[]> {
    let staticPools = this.getStaticPools(t0, t1)
    if (excludePools)
      staticPools = staticPools.filter((p) => !excludePools.has(p.address))

    const tradeId = this.getTradeId(t0, t1)
    if (!this.poolsByTrade.has(tradeId))
      this.poolsByTrade.set(
        tradeId,
        staticPools.map((pool) => pool.address.toLowerCase()),
      )

    const slot0 = await this.client
      .multicall({
        multicallAddress: this.client.chain?.contracts?.multicall3
          ?.address as Address,
        allowFailure: true,
        blockNumber: options?.blockNumber,
        contracts: staticPools.map(
          (pool) =>
            ({
              address: pool.address as Address,
              chainId: this.chainId,
              abi: [
                {
                  inputs: [],
                  name: 'slot0',
                  outputs: [
                    {
                      internalType: 'uint160',
                      name: 'sqrtPriceX96',
                      type: 'uint160',
                    },
                    { internalType: 'int24', name: 'tick', type: 'int24' },
                    {
                      internalType: 'uint16',
                      name: 'observationIndex',
                      type: 'uint16',
                    },
                    {
                      internalType: 'uint16',
                      name: 'observationCardinality',
                      type: 'uint16',
                    },
                    {
                      internalType: 'uint16',
                      name: 'observationCardinalityNext',
                      type: 'uint16',
                    },
                    {
                      internalType: 'uint8',
                      name: 'feeProtocol',
                      type: 'uint8',
                    },
                    { internalType: 'bool', name: 'unlocked', type: 'bool' },
                  ],
                  stateMutability: 'view',
                  type: 'function',
                },
              ],
              functionName: 'slot0',
            }) as const,
        ),
      })
      .catch((e) => {
        console.warn(
          `${this.getLogPrefix()} - INIT: multicall failed, message: ${
            e.message
          }`,
        )
        return undefined
      })

    const tickSpacings = await this.getTickSpacing(staticPools, options)

    const existingPools: RainV3Pool[] = []

    staticPools.forEach((pool, i) => {
      const poolAddress = pool.address.toLowerCase()
      if (this.pools.has(poolAddress)) return
      if (this.nonExistentPools.get(poolAddress) ?? 0 > 1) return
      if (slot0 === undefined || !slot0[i]) {
        this.handleNonExistentPool(poolAddress)
        return
      }
      const sqrtPriceX96 = slot0[i]!.result?.[0]
      const tick = slot0[i]!.result?.[1]
      if (!sqrtPriceX96 || sqrtPriceX96 === 0n || typeof tick !== 'number') {
        this.handleNonExistentPool(poolAddress)
        return
      }
      let tickSpacing = this.TICK_SPACINGS[pool.fee]!
      if (typeof tickSpacings?.[i] !== 'undefined') {
        const ts = tickSpacings[i]
        if (typeof ts === 'number') {
          tickSpacing = ts
        } else {
          if (ts?.status === 'success') {
            tickSpacing = ts.result
          }
        }
      }
      const activeTick = this.getActiveTick(tick, tickSpacing)
      if (typeof activeTick !== 'number') {
        this.handleNonExistentPool(poolAddress)
        return
      }
      existingPools.push({
        ...pool,
        sqrtPriceX96,
        activeTick,
        tickSpacing,
        ticks: new Map(),
        reserve0: 0n,
        reserve1: 0n,
        liquidity: 0n,
        blockNumber: options?.blockNumber ?? 0n,
      })
    })

    return existingPools
  }

  override getIndexes(existingPools: RainV3Pool[]): [number[], number[]] {
    const minIndexes = existingPools.map((pool) =>
      bitmapIndex(
        pool.activeTick - NUMBER_OF_SURROUNDING_TICKS,
        pool.tickSpacing,
      ),
    )
    const maxIndexes = existingPools.map((pool) =>
      bitmapIndex(
        pool.activeTick + NUMBER_OF_SURROUNDING_TICKS,
        pool.tickSpacing,
      ),
    )
    return [minIndexes, maxIndexes]
  }

  override async fetchPoolsForToken(
    t0: Token,
    t1: Token,
    excludePools?: Set<string> | PoolFilter,
    options?: DataFetcherOptions,
  ): Promise<void> {
    const existingPools = await this.fetchPoolData(
      t0,
      t1,
      excludePools,
      options,
    )
    if (existingPools.length === 0) return

    const [liquidity, reserves, ticks] = await Promise.all([
      this.getLiquidity(existingPools, options),
      this.getReserves(existingPools, options),
      this.getTicks(existingPools, options),
    ])
    existingPools.forEach((pool, i) => {
      if (
        liquidity === undefined ||
        reserves === undefined ||
        ticks === undefined
      )
        return
      if (
        liquidity[i] === undefined ||
        reserves[i] === undefined ||
        ticks[i] === undefined
      )
        return
      this.pools.set(pool.address.toLowerCase(), {
        ...pool,
        reserve0: reserves[i]![0],
        reserve1: reserves[i]![1],
        liquidity: liquidity[i]!,
        ticks: ticks[i]!,
      })
    })
  }

  override getCurrentPoolList(t0: Token, t1: Token): PoolCode[] {
    const tradeId = this.getTradeId(t0, t1)
    const poolsByTrade = this.poolsByTrade.get(tradeId) ?? []
    return Array.from(this.pools.values())
      .filter((pool) => poolsByTrade.includes(pool.address.toLowerCase()))
      .map((pool) => {
        const v3Pool = new UniV3Pool(
          pool.address,
          pool.token0 as RToken,
          pool.token1 as RToken,
          pool.fee / 1_000_000,
          pool.reserve0,
          pool.reserve1,
          pool.activeTick,
          pool.liquidity,
          pool.sqrtPriceX96,
          this.getMaxTickDiapason(pool.activeTick, pool),
        )

        return new UniV3PoolCode(
          v3Pool,
          this.getType(),
          this.getPoolProviderName(),
        )
      })
  }

  async getReserves(
    existingPools: RainV3Pool[],
    options?: DataFetcherOptions,
  ): Promise<([bigint, bigint] | undefined)[]> {
    const results = await this.client
      .multicall({
        multicallAddress: this.client.chain?.contracts?.multicall3
          ?.address as Address,
        allowFailure: true,
        blockNumber: options?.blockNumber,
        contracts: existingPools.flatMap(
          (pool) =>
            [
              {
                chainId: this.chainId,
                address: pool.token0.wrapped.address as Address,
                args: [pool.address as Address],
                abi: erc20Abi,
                functionName: 'balanceOf',
              },
              {
                chainId: this.chainId,
                address: pool.token1.wrapped.address as Address,
                args: [pool.address as Address],
                abi: erc20Abi,
                functionName: 'balanceOf',
              },
            ] as const,
        ),
      })
      .catch((e) => {
        console.warn(
          `${this.getLogPrefix()} - INIT: multicall failed, message: ${
            e.message
          }`,
        )
        return Array.from({ length: existingPools.length }, () => undefined)
      })

    const reserves = []
    for (let i = 0; i < results.length; i += 2) {
      const res0 = results?.[i]?.result
      const res1 = results?.[i + 1]?.result
      if (typeof res0 === 'bigint' && typeof res1 === 'bigint') {
        reserves.push([res0, res1] as [bigint, bigint])
      } else {
        reserves.push(undefined)
      }
    }
    return reserves
  }

  async getLiquidity(
    existingPools: RainV3Pool[],
    options?: DataFetcherOptions,
  ): Promise<(bigint | undefined)[]> {
    const results = await this.client
      .multicall({
        multicallAddress: this.client.chain?.contracts?.multicall3
          ?.address as Address,
        allowFailure: true,
        blockNumber: options?.blockNumber,
        contracts: existingPools.map(
          (pool) =>
            ({
              chainId: this.chainId,
              address: pool.address as Address,
              abi: [
                {
                  inputs: [],
                  name: 'liquidity',
                  outputs: [
                    { internalType: 'uint128', name: '', type: 'uint128' },
                  ],
                  stateMutability: 'view',
                  type: 'function',
                },
              ],
              functionName: 'liquidity',
            }) as const,
        ),
      })
      .catch((e) => {
        console.warn(
          `${this.getLogPrefix()} - INIT: multicall failed, message: ${
            e.message
          }`,
        )
        return Array.from({ length: existingPools.length }, () => undefined)
      })

    const liquidities = []
    for (let i = 0; i < results.length; i++) {
      const liquidity = results?.[i]?.result
      if (typeof liquidity === 'bigint') {
        liquidities.push(liquidity)
      } else {
        liquidities.push(undefined)
      }
    }
    return liquidities
  }

  async getTicks(
    existingPools: RainV3Pool[],
    options?: DataFetcherOptions,
  ): Promise<Map<number, CLTick[]>[] | undefined> {
    const [minIndexes, maxIndexes] = this.getIndexes(existingPools)
    const wordList = existingPools.map((pool, i) => {
      const minIndex = minIndexes[i]!
      const maxIndex = maxIndexes[i]!

      return [
        pool,
        Array.from({ length: maxIndex - minIndex + 1 }, (_, i) => minIndex + i),
      ] as [RainV3Pool, number[]]
    })
    return await this.getTicksInner(wordList, options)
  }

  async getTicksInner(
    existingPools: [RainV3Pool, number[]][],
    options?: DataFetcherOptions,
  ): Promise<Map<number, CLTick[]>[] | undefined> {
    const wordList = existingPools.flatMap(([pool, words], i) => {
      return words.flatMap((j) => ({
        chainId: this.chainId,
        address: this.tickLens[
          this.chainId as keyof typeof this.tickLens
        ] as Address,
        args: [pool.address, j] as const,
        abi: tickLensAbi,
        functionName: 'getPopulatedTicksInWord' as const,
        index: [i, j],
      }))
    })

    const tickResults = await this.client
      .multicall({
        multicallAddress: this.client.chain?.contracts?.multicall3
          ?.address as Address,
        allowFailure: true,
        contracts: wordList,
        blockNumber: options?.blockNumber,
      })
      .catch((e) => {
        console.warn(
          `${this.getLogPrefix()} - INIT: multicall failed, message: ${
            e.message
          }`,
        )
        return undefined
      })

    if (!tickResults) return undefined

    const poolTicks: Map<number, CLTick[]>[] = []
    tickResults.forEach((t, i) => {
      const index = wordList[i]!.index[0]!
      const wordIndex = wordList[i]!.index[1]!
      if (poolTicks[index] === undefined) poolTicks[index] = new Map()
      poolTicks[index]!.set(
        wordIndex,
        (t?.result || [])
          .map((tick) => ({
            index: tick.tick,
            DLiquidity: tick.liquidityNet,
          }))
          .sort((a, b) => a.index - b.index),
      )
    })
    return poolTicks
  }

  // fetches pool tickSpacing, this will be used
  // instead of hardcoded TICK_SPACINGS values
  async getTickSpacing(pools: StaticPoolUniV3[], options?: DataFetcherOptions) {
    const calldata = {
      multicallAddress: this.client.chain?.contracts?.multicall3
        ?.address as Address,
      allowFailure: true,
      blockNumber: options?.blockNumber,
      contracts: pools.map(
        (pool) =>
          ({
            address: pool.address as Address,
            chainId: this.chainId,
            abi: tickSpacingAbi,
            functionName: 'tickSpacing',
          }) as const,
      ),
    }
    return await this.client.multicall(calldata).catch((e) => {
      console.warn(
        `${this.getLogPrefix()} - INIT: multicall failed, message: ${
          e.message
        }`,
      )
      return undefined
    })
  }

  getMaxTickDiapason(tick: number, pool: RainV3Pool): CLTick[] {
    const currentTickIndex = bitmapIndex(tick, pool.tickSpacing)
    if (!pool.ticks.has(currentTickIndex)) return []
    let minIndex
    let maxIndex
    for (minIndex = currentTickIndex; pool.ticks.has(minIndex); --minIndex);
    for (maxIndex = currentTickIndex + 1; pool.ticks.has(maxIndex); ++maxIndex);
    if (maxIndex - minIndex <= 1) return []

    let poolTicks: CLTick[] = []
    for (let i = minIndex + 1; i < maxIndex; ++i)
      poolTicks = poolTicks.concat(pool.ticks.get(i)!)

    const lowerUnknownTick =
      (minIndex + 1) * pool.tickSpacing * 256 - pool.tickSpacing
    console.assert(
      poolTicks.length === 0 || lowerUnknownTick < poolTicks[0]!.index,
      'Error 236: unexpected min tick index',
    )
    poolTicks.unshift({
      index: lowerUnknownTick,
      DLiquidity: 0n,
    })
    const upperUnknownTick = maxIndex * pool.tickSpacing * 256
    console.assert(
      poolTicks[poolTicks.length - 1]!.index < upperUnknownTick,
      'Error 244: unexpected max tick index',
    )
    poolTicks.push({
      index: upperUnknownTick,
      DLiquidity: 0n,
    })

    return poolTicks
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
          eventName: 'PoolCreated',
        })[0]!
        this.nonExistentPools.delete(event.args.pool.toLowerCase())
      } catch {}
    } else {
      const pool = this.pools.get(logAddress) as RainV3Pool | undefined
      if (pool) {
        try {
          const event = parseEventLogs({ logs: [log], abi: this.eventsAbi })[0]!
          switch (event.eventName) {
            case 'Mint': {
              const { amount, amount0, amount1 } = event.args
              const { tickLower, tickUpper } = event.args
              if (log.blockNumber! >= pool.blockNumber) {
                pool.blockNumber = log.blockNumber!
                if (
                  tickLower !== undefined &&
                  tickUpper !== undefined &&
                  amount !== undefined
                ) {
                  const tick = pool.activeTick
                  if (tickLower <= tick && tick < tickUpper)
                    pool.liquidity += amount
                }
                if (amount1 !== undefined && amount0 !== undefined) {
                  pool.reserve0 += amount0
                  pool.reserve1 += amount1
                }
                if (
                  tickLower !== undefined &&
                  tickUpper !== undefined &&
                  amount !== undefined
                ) {
                  this.addTick(tickLower, amount, pool)
                  this.addTick(tickUpper, -amount, pool)
                }
              }
              break
            }
            case 'Burn': {
              const { amount } = event.args
              const { tickLower, tickUpper } = event.args
              if (log.blockNumber! >= pool.blockNumber) {
                pool.blockNumber = log.blockNumber!
                if (
                  tickLower !== undefined &&
                  tickUpper !== undefined &&
                  amount !== undefined
                ) {
                  const tick = pool.activeTick
                  if (tickLower <= tick && tick < tickUpper)
                    pool.liquidity -= amount
                }
                if (
                  tickLower !== undefined &&
                  tickUpper !== undefined &&
                  amount !== undefined
                ) {
                  this.addTick(tickLower, -amount, pool)
                  this.addTick(tickUpper, amount, pool)
                }
              }
              break
            }
            case 'Collect':
            case 'CollectProtocol': {
              if (log.blockNumber! >= pool.blockNumber) {
                pool.blockNumber = log.blockNumber!
                const { amount0, amount1 } = event.args
                if (amount0 !== undefined && amount1 !== undefined) {
                  pool.reserve0 -= amount0
                  pool.reserve1 -= amount1
                }
              }
              break
            }
            case 'Flash': {
              if (log.blockNumber! >= pool.blockNumber) {
                pool.blockNumber = log.blockNumber!
                const { paid0, paid1 } = event.args
                if (paid0 !== undefined && paid1 !== undefined) {
                  pool.reserve0 += paid0
                  pool.reserve1 += paid1
                }
              }
              break
            }
            case 'Swap': {
              if (log.blockNumber! >= pool.blockNumber) {
                pool.blockNumber = log.blockNumber!
                const { amount0, amount1, sqrtPriceX96, liquidity, tick } =
                  event.args
                if (amount0 !== undefined && amount1 !== undefined) {
                  pool.reserve0 += amount0
                  pool.reserve1 += amount1
                }
                if (sqrtPriceX96 !== undefined) pool.sqrtPriceX96 = sqrtPriceX96
                if (liquidity !== undefined) pool.liquidity = liquidity
                if (tick !== undefined) {
                  pool.activeTick =
                    Math.floor(tick / pool.tickSpacing) * pool.tickSpacing
                  const newTicks = this.onPoolTickChange(pool.activeTick, pool)
                  const queue = this.newTicksQueue.find(
                    (v) => v[0].address === pool.address,
                  )
                  if (queue) {
                    for (const tick of newTicks) {
                      if (!queue[1].includes(tick)) queue[1].push(tick)
                    }
                  } else {
                    this.newTicksQueue.push([pool, newTicks])
                  }
                }
              }
              break
            }
            default:
          }
        } catch {}
      }
    }
  }

  override async afterProcessLog(untilBlock: bigint) {
    const newTicksQueue = [...this.newTicksQueue.splice(0)]
    try {
      if (newTicksQueue.length) {
        const newTicks = await this.getTicksInner(newTicksQueue, {
          blockNumber: untilBlock,
        })
        newTicksQueue.forEach(([pool], i) => {
          newTicks?.[i]?.forEach((newTick, index) => {
            pool.ticks.set(index, newTick)
          })
        })
      }
    } catch {
      // if unsuccessfull to get new ticks, put them back on queue for next try
      newTicksQueue.forEach(([pool, newTicks]) => {
        const queue = this.newTicksQueue.find(
          (v) => v[0].address === pool.address,
        )
        if (queue) {
          for (const tick of newTicks) {
            if (!queue[1].includes(tick)) queue[1].push(tick)
          }
        } else {
          this.newTicksQueue.push([pool, newTicks])
        }
      })
      throw ''
    }
  }

  addTick(tick: number, amount: bigint, pool: RainV3Pool) {
    const tickWord = bitmapIndex(tick, pool.tickSpacing)
    const ticks = pool.ticks.get(tickWord)
    if (ticks !== undefined) {
      if (ticks.length === 0 || tick < ticks[0]!.index) {
        ticks.unshift({ index: tick, DLiquidity: amount })
        return
      }
      if (tick === ticks[0]!.index) {
        ticks[0]!.DLiquidity = ticks[0]!.DLiquidity + amount
        if (ticks[0]!.DLiquidity === 0n) ticks.splice(0, 1)
        return
      }

      let start = 0
      let end = ticks.length
      while (end - start > 1) {
        const middle = Math.floor((start + end) / 2)
        const index = ticks[middle]!.index
        if (index < tick) start = middle
        else if (index > tick) end = middle
        else {
          ticks[middle]!.DLiquidity = ticks[middle]!.DLiquidity + amount
          if (ticks[middle]!.DLiquidity === 0n) ticks.splice(middle, 1)
          return
        }
      }
      ticks.splice(start + 1, 0, { index: tick, DLiquidity: amount })
    }
  }

  onPoolTickChange(tick: number, pool: RainV3Pool): number[] {
    const currentTickWord = bitmapIndex(tick, pool.tickSpacing)
    const minWord = bitmapIndex(
      tick - NUMBER_OF_SURROUNDING_TICKS,
      pool.tickSpacing,
    )
    const maxWord = bitmapIndex(
      tick + NUMBER_OF_SURROUNDING_TICKS,
      pool.tickSpacing,
    )

    const direction = currentTickWord - minWord <= maxWord - currentTickWord
    const wordNumber = maxWord - minWord
    const newTicks: number[] = []
    for (let i = wordNumber; i >= 0; --i) {
      const wordIndex = currentTickWord + this.getJump(i, direction)
      const wordState = pool.ticks.get(wordIndex)
      if (wordState === undefined) newTicks.push(wordIndex)
    }
    return newTicks
  }

  // if positiveFirst == true returns 0, 1, -1, 2, -2, 3, -3, ...
  // if positiveFirst == false returns 0, -1, 1, -2, 2, -3, 3, ...
  getJump(index: number, positiveFirst: boolean): number {
    let res
    if (index % 2 === 0) res = -index / 2
    else res = (index + 1) / 2
    return positiveFirst ? res : -res
  }

  handleNonExistentPool(poolAddress: string) {
    const v = this.nonExistentPools.get(poolAddress)
    if (v) {
      this.nonExistentPools.set(poolAddress, v + 1)
    } else {
      this.nonExistentPools.set(poolAddress, 1)
    }
  }
}
