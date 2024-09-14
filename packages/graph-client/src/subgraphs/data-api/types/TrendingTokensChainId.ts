// This file is auto-generated by scripts/update-data-api-types.ts
import type { ChainId } from 'sushi/chain'

export const TrendingTokensChainIds = [42161,42170,43114,8453,288,56288,56,42220,1,250,122,100,1666600000,1284,137,534352,2222,1088,199,7000,1116,108,10,59144,1101,81457,2046399126,30,25,5000,324] as const
export type TrendingTokensChainId = typeof TrendingTokensChainIds[number]
export function isTrendingTokensChainId(value: ChainId): value is TrendingTokensChainId {return TrendingTokensChainIds.includes(value as TrendingTokensChainId)}