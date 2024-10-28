import {
  Address,
  Hex,
  PublicClient,
  encodeAbiParameters,
  getAddress,
  keccak256,
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

export abstract class AlgebraV1BaseProvider extends UniswapV3BaseProvider {
  override TICK_SPACINGS: Record<number, number> = {}

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

    let tickSpacings:
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
      tickSpacings = options?.memoize
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

    for (let i = 0; i < staticPools.length; i++) {
      if (globalState === undefined || !globalState[i]) continue
      const pool = staticPools[i]! 
      let thisTickSpacing = this.DEFAULT_TICK_SPACING
      if (tickSpacings !== undefined && Array.isArray(tickSpacings)) {
        if (tickSpacings[i] !== undefined) {
          const ts = tickSpacings[i]
          if (typeof ts === 'number') {
            thisTickSpacing = ts
          } else {
            if (ts?.status === 'success') {
              thisTickSpacing = ts.result
            }
          }
        }
      }
      const sqrtPriceX96 = globalState[i]!.result?.[0] // price
      const tick = globalState[i]!.result?.[1] // tick
      if (!sqrtPriceX96 || sqrtPriceX96 === 0n || typeof tick !== 'number')
        continue
      const fee = globalState[i]!.result?.[2] // fee
      if (!fee) continue
      const activeTick = Math.floor(tick / thisTickSpacing) * thisTickSpacing
      if (typeof activeTick !== 'number') continue
      this.TICK_SPACINGS[fee] = this.DEFAULT_TICK_SPACING
      existingPools.push({
        ...pool,
        fee,
        sqrtPriceX96,
        activeTick,
      })
    }

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
