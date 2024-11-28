import {
  Address,
  Hex,
  Log,
  PublicClient,
  encodeAbiParameters,
  getAddress,
  keccak256,
  parseAbiItem,
  parseEventLogs,
} from 'viem'
import { ChainId } from '../../chain/index.js'
import { Token } from '../../currency/index.js'
import { DataFetcherOptions } from '../data-fetcher.js'
import { getCurrencyCombinations } from '../get-currency-combinations.js'
import { memoizer } from '../memoizer.js'
import {
  PoolFilter,
  StaticPoolUniV3,
  UniswapV3BaseProvider,
  V3Pool,
} from './UniswapV3Base.js'

export const AlgebraEventsAbi = [
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
  parseAbiItem('event Fee(uint16 fee)'),
  parseAbiItem('event TickSpacing(int24 newTickSpacing)'),
  // for factory, new pool created
  parseAbiItem(
    'event Pool(address indexed token0, address indexed token1, address pool)',
  ),
]

export abstract class AlgebraV1BaseProvider extends UniswapV3BaseProvider {
  override TICK_SPACINGS: Record<string, number> = {}
  override eventsAbi = AlgebraEventsAbi as any

  readonly BASE_FEE = 100
  DEFAULT_TICK_SPACING = 1

  poolDeployer: Record<number, Address> = {}

  constructor(
    chainId: ChainId,
    web3Client: PublicClient,
    factory: Record<number, Address>,
    initCodeHash: Record<number, string>,
    tickLens: Record<number, Address>,
    poolDeployer: Record<number, Address>,
    isTest = false,
  ) {
    super(chainId, web3Client, factory, initCodeHash, tickLens, isTest)
    this.poolDeployer = poolDeployer
    if (!(chainId in this.poolDeployer)) {
      throw new Error(
        `${this.getType()} cannot be instantiated for chainid ${chainId}, no poolDeployer address`,
      )
    }
  }

  override async fetchPoolData(
    t0: Token,
    t1: Token,
    excludePools?: Set<string> | PoolFilter,
    options?: DataFetcherOptions,
  ): Promise<V3Pool[]> {
    let staticPools = this.getStaticPools(t0, t1)
    if (excludePools)
      staticPools = staticPools.filter((p) => !excludePools.has(p.address))

    const tradeId = this.getTradeId(t0, t1)
    if (!this.poolsByTrade.has(tradeId))
      this.poolsByTrade.set(
        tradeId,
        staticPools.map((pool) => pool.address.toLowerCase()),
      )

    const multicallMemoize = await memoizer.fn(this.client.multicall)

    const globalStateData = {
      multicallAddress: this.client.chain?.contracts?.multicall3?.address!,
      allowFailure: true,
      blockNumber: options?.blockNumber,
      contracts: staticPools.map(
        (pool) =>
          ({
            address: pool.address,
            chainId: this.chainId,
            abi: [
              {
                inputs: [],
                name: 'globalState',
                outputs: [
                  { internalType: 'uint160', name: 'price', type: 'uint160' },
                  { internalType: 'int24', name: 'tick', type: 'int24' },
                  { internalType: 'uint16', name: 'fee', type: 'uint16' },
                  {
                    internalType: 'uint16',
                    name: 'timepointIndex',
                    type: 'uint16',
                  },
                  {
                    internalType: 'uint8',
                    name: 'communityFeeToken0',
                    type: 'uint8',
                  },
                  {
                    internalType: 'uint8',
                    name: 'communityFeeToken1',
                    type: 'uint8',
                  },
                  { internalType: 'bool', name: 'unlocked', type: 'bool' },
                ],
                stateMutability: 'view',
                type: 'function',
              },
            ] as const,
            functionName: 'globalState',
          }) as const,
      ),
    }
    const globalState = options?.memoize
      ? await (multicallMemoize(globalStateData) as Promise<any>).catch((e) => {
          console.warn(
            `${this.getLogPrefix()} - INIT: multicall failed, message: ${
              e.message
            }`,
          )
          return undefined
        })
      : await this.client.multicall(globalStateData).catch((e) => {
          console.warn(
            `${this.getLogPrefix()} - INIT: multicall failed, message: ${
              e.message
            }`,
          )
          return undefined
        })

    let poolsTickSpacing:
      | (
          | number
          | {
              error?: undefined
              result: number
              status: 'success'
            }
          | {
              error: Error
              result?: undefined
              status: 'failure'
            }
        )[]
      | undefined

    try {
      const tickSpacingsData = {
        multicallAddress: this.client.chain?.contracts?.multicall3?.address!,
        allowFailure: true,
        blockNumber: options?.blockNumber,
        contracts: staticPools.map(
          (pool) =>
            ({
              address: pool.address,
              chainId: this.chainId,
              abi: [
                {
                  inputs: [],
                  name: 'tickSpacing',
                  outputs: [{ internalType: 'int24', name: '', type: 'int24' }],
                  stateMutability: 'view',
                  type: 'function',
                },
              ] as const,
              functionName: 'tickSpacing',
            }) as const,
        ),
      }
      poolsTickSpacing = options?.memoize
        ? await (multicallMemoize(tickSpacingsData) as Promise<any>).catch(
            (e) => {
              console.warn(
                `${this.getLogPrefix()} - INIT: multicall failed, message: ${
                  e.message
                }`,
              )
              return undefined
            },
          )
        : await this.client.multicall(tickSpacingsData).catch((e) => {
            console.warn(
              `${this.getLogPrefix()} - INIT: multicall failed, message: ${
                e.message
              }`,
            )
            return undefined
          })
    } catch (_error) {}

    const existingPools: V3Pool[] = []

    staticPools.forEach((pool, i) => {
      const poolAddress = pool.address.toLowerCase()
      if (this.innerPools.has(poolAddress)) return
      if (this.nonExistentPools.get(poolAddress) ?? 0 > 1) return
      if (globalState === undefined || !globalState[i]) {
        const v = this.nonExistentPools.get(poolAddress)
        if (v) {
          this.nonExistentPools.set(poolAddress, v + 1)
        } else {
          this.nonExistentPools.set(poolAddress, 1)
        }
        return
      }
      let thisPoolTickSpacing = this.DEFAULT_TICK_SPACING
      if (typeof poolsTickSpacing?.[i] !== 'undefined') {
        const ts = poolsTickSpacing[i]
        if (typeof ts === 'number') {
          thisPoolTickSpacing = ts
        } else {
          if (ts?.status === 'success') {
            thisPoolTickSpacing = ts.result
          }
        }
      }
      const sqrtPriceX96 = globalState[i]!.result?.[0] // price
      const tick = globalState[i]!.result?.[1] // tick
      if (!sqrtPriceX96 || sqrtPriceX96 === 0n || typeof tick !== 'number') {
        const v = this.nonExistentPools.get(poolAddress)
        if (v) {
          this.nonExistentPools.set(poolAddress, v + 1)
        } else {
          this.nonExistentPools.set(poolAddress, 1)
        }
        return
      }
      const fee = globalState[i]!.result?.[2] // fee
      if (!fee) {
        const v = this.nonExistentPools.get(poolAddress)
        if (v) {
          this.nonExistentPools.set(poolAddress, v + 1)
        } else {
          this.nonExistentPools.set(poolAddress, 1)
        }
        return
      }
      const activeTick = this.getActiveTick(tick, thisPoolTickSpacing)
      if (typeof activeTick !== 'number') {
        const v = this.nonExistentPools.get(poolAddress)
        if (v) {
          this.nonExistentPools.set(poolAddress, v + 1)
        } else {
          this.nonExistentPools.set(poolAddress, 1)
        }
        return
      }
      this.TICK_SPACINGS[poolAddress] = thisPoolTickSpacing
      existingPools.push({
        ...pool,
        fee,
        sqrtPriceX96,
        activeTick,
        reserve0: 0n,
        reserve1: 0n,
        liquidity: 0n,
        ticks: new Map(),
        tickSpacing: thisPoolTickSpacing,
        blockNumber: options?.blockNumber ?? 0n,
      })
    })

    return existingPools
  }

  override getStaticPools(t1: Token, t2: Token): StaticPoolUniV3[] {
    const allCombinations = getCurrencyCombinations(this.chainId, t1, t2)
    const currencyCombinations: [Token, Token][] = []
    allCombinations.forEach(([currencyA, currencyB]) => {
      if (currencyA && currencyB) {
        const tokenA = currencyA.wrapped
        const tokenB = currencyB.wrapped
        if (tokenA.equals(tokenB)) return
        currencyCombinations.push(
          tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA],
        )
      }
    })
    return currencyCombinations.map(([currencyA, currencyB]) => ({
      address: getAlgebraPoolAddress(
        this.poolDeployer[this.chainId as keyof typeof this.poolDeployer]!,
        currencyA.wrapped.address,
        currencyB.wrapped.address,
        this.initCodeHash[
          this.chainId as keyof typeof this.initCodeHash
        ] as `0x${string}`,
      ),
      token0: currencyA,
      token1: currencyB,
      fee: this.BASE_FEE,
    }))
  }

  // algebra doesnt have the fee/ticks setup the same way univ3 has
  override async ensureFeeAndTicks(): Promise<boolean> {
    return true
  }

  override processLog(log: Log) {
    const factory =
      this.factory[this.chainId as keyof typeof this.factory]!.toLowerCase()
    const logAddress = log.address.toLowerCase()
    if (logAddress === factory) {
      try {
        const event = parseEventLogs({
          logs: [log],
          abi: this.eventsAbi as typeof AlgebraEventsAbi,
          eventName: 'Pool',
        })[0]!
        this.nonExistentPools.delete(event.args.pool.toLowerCase())
      } catch {
        /**/
      }
    } else {
      const pool = this.innerPools.get(logAddress) as V3Pool | undefined
      if (pool) {
        try {
          const event = parseEventLogs({
            logs: [log],
            abi: this.eventsAbi as typeof AlgebraEventsAbi,
          })[0]!
          switch (event.eventName) {
            case 'Mint': {
              const { amount, amount0, amount1 } = event.args
              const { tickLower, tickUpper } = event.args
              if (log.blockNumber! >= pool.blockNumber) {
                pool.blockNumber = log.blockNumber!
                if (
                  tickLower !== undefined &&
                  tickUpper !== undefined &&
                  amount
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
                  amount
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
                  amount
                ) {
                  const tick = pool.activeTick
                  if (tickLower <= tick && tick < tickUpper)
                    pool.liquidity -= amount
                }
                if (
                  tickLower !== undefined &&
                  tickUpper !== undefined &&
                  amount
                ) {
                  this.addTick(tickLower, -amount, pool)
                  this.addTick(tickUpper, amount, pool)
                }
              }
              break
            }
            case 'Collect': {
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
            case 'Fee': {
              if (log.blockNumber! >= pool.blockNumber) {
                pool.blockNumber = log.blockNumber!
                pool.fee = event.args.fee
              }
              break
            }
            case 'TickSpacing': {
              if (log.blockNumber! >= pool.blockNumber) {
                pool.blockNumber = log.blockNumber!
                pool.tickSpacing = event.args.newTickSpacing
              }
              break
            }
            default:
          }
        } catch {
          /**/
        }
      }
    }
  }
}

// from packages/extractor/src/AlgebraExtractor.ts
export function getAlgebraPoolAddress(
  poolDeployer: Address,
  tokenA: Address,
  tokenB: Address,
  initCodeHash: Hex,
): Address {
  const constructorArgumentsEncoded = encodeAbiParameters(
    [
      { name: 'TokenA', type: 'address' },
      { name: 'TokenB', type: 'address' },
    ],
    [tokenA, tokenB],
  )
  const create2Inputs = [
    '0xff',
    poolDeployer,
    keccak256(constructorArgumentsEncoded as Hex),
    initCodeHash,
  ]
  const sanitizedInputs = `0x${create2Inputs.map((i) => i.slice(2)).join('')}`

  return getAddress(`0x${keccak256(sanitizedInputs as Hex).slice(-40)}`)
}
