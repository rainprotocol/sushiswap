import type { Address } from 'viem'
import { ChainId } from '../chain/index.js'

// v1
export const ROUTE_PROCESSOR_SUPPORTED_CHAIN_IDS = [
  ChainId.ARBITRUM,
  ChainId.ARBITRUM_NOVA,
  ChainId.AVALANCHE,
  ChainId.BOBA,
  ChainId.BOBA_AVAX,
  ChainId.BOBA_BNB,
  ChainId.BSC,
  ChainId.BTTC,
  ChainId.CELO,
  ChainId.ETHEREUM,
  ChainId.FANTOM,
  ChainId.FUSE,
  ChainId.GNOSIS,
  ChainId.HARMONY,
  ChainId.KAVA,
  ChainId.METIS,
  ChainId.MOONBEAM,
  ChainId.MOONRIVER,
  ChainId.OPTIMISM,
  ChainId.POLYGON,
] as const
export type RouteProcessorChainId =
  (typeof ROUTE_PROCESSOR_SUPPORTED_CHAIN_IDS)[number]
export const ROUTE_PROCESSOR_ADDRESS: Record<
  RouteProcessorChainId,
  `0x${string}`
> = {
  [ChainId.ARBITRUM]: '0x9c6522117e2ed1fE5bdb72bb0eD5E3f2bdE7DBe0',
  [ChainId.ARBITRUM_NOVA]: '0xaB235da7f52d35fb4551AfBa11BFB56e18774A65',
  [ChainId.AVALANCHE]: '0x400d75dAb26bBc18D163AEA3e83D9Ea68F6c1804',
  [ChainId.BOBA]: '0x80C7DD17B01855a6D2347444a0FCC36136a314de',
  [ChainId.BOBA_AVAX]: '0x80C7DD17B01855a6D2347444a0FCC36136a314de',
  [ChainId.BOBA_BNB]: '0x80C7DD17B01855a6D2347444a0FCC36136a314de',
  [ChainId.BSC]: '0x7cf167390E2526Bc03F3CF6852A7AF1CEC3e243d',
  [ChainId.BTTC]: '0x2F255d3f3C0A3726c6c99E74566c4b18E36E3ce6',
  [ChainId.CELO]: '0xf78031CBCA409F2FB6876BDFDBc1b2df24cF9bEf',
  [ChainId.ETHEREUM]: '0x19dBa5df5383168f760617aaDD23322BC5F9Ff7b',
  [ChainId.FANTOM]: '0x3D2f8ae0344d38525d2AE96Ab750B83480c0844F',
  [ChainId.FUSE]: '0x1be211D8DA40BC0ae8719c6663307Bfc987b1d6c',
  [ChainId.GNOSIS]: '0x1e9B24073183d5c6B7aE5FB4b8f0b1dd83FDC77a',
  [ChainId.HARMONY]: '0x2F255d3f3C0A3726c6c99E74566c4b18E36E3ce6',
  [ChainId.KAVA]: '0xaa26771d497814E81D305c511Efbb3ceD90BF5bd',
  [ChainId.METIS]: '0x1e9B24073183d5c6B7aE5FB4b8f0b1dd83FDC77a',
  [ChainId.MOONBEAM]: '0x6c5A9e667297b409B5dD9850b38889ab84110c2A',
  [ChainId.MOONRIVER]: '0x9e4791ad13f14783C7B2A6A7bD8D6DDD1DC95847',
  [ChainId.OPTIMISM]: '0x96E04591579f298681361C6122Dc4Ef405c19385',
  [ChainId.POLYGON]: '0x0dc8E47a1196bcB590485eE8bF832c5c68A52f4B',
} as const
export const isRouteProcessorChainId = (
  chainId: ChainId,
): chainId is RouteProcessorChainId =>
  ROUTE_PROCESSOR_SUPPORTED_CHAIN_IDS.includes(chainId as RouteProcessorChainId)

// v2
export const ROUTE_PROCESSOR_2_SUPPORTED_CHAIN_IDS = [
  ChainId.ARBITRUM,
  ChainId.ARBITRUM_NOVA,
  ChainId.AVALANCHE,
  ChainId.BOBA,
  ChainId.BSC,
  ChainId.ETHEREUM,
  ChainId.FANTOM,
  ChainId.FUSE,
  ChainId.GNOSIS,
  ChainId.MOONBEAM,
  ChainId.MOONRIVER,
  ChainId.OPTIMISM,
  ChainId.POLYGON,
  ChainId.POLYGON_ZKEVM,
] as const
export type RouteProcessor2ChainId =
  (typeof ROUTE_PROCESSOR_2_SUPPORTED_CHAIN_IDS)[number]
export const ROUTE_PROCESSOR_2_ADDRESS: Record<
  RouteProcessor2ChainId,
  `0x${string}`
> = {
  [ChainId.ARBITRUM]: '0xA7caC4207579A179c1069435d032ee0F9F150e5c',
  [ChainId.ARBITRUM_NOVA]: '0x1c5771e96C9d5524fb6e606f5B356d08C40Eb194',
  [ChainId.AVALANCHE]: '0xbACEB8eC6b9355Dfc0269C18bac9d6E2Bdc29C4F',
  [ChainId.BOBA]: '0x2f686751b19a9d91cc3d57d90150bc767f050066',
  [ChainId.BSC]: '0xD75F5369724b513b497101fb15211160c1d96550',
  [ChainId.ETHEREUM]: '0x044b75f554b886A065b9567891e45c79542d7357',
  [ChainId.FANTOM]: '0x3e603C14aF37EBdaD31709C4f848Fc6aD5BEc715',
  [ChainId.FUSE]: '0x2f686751b19a9d91cc3d57d90150Bc767f050066',
  [ChainId.GNOSIS]: '0x145d82bCa93cCa2AE057D1c6f26245d1b9522E6F',
  [ChainId.MOONBEAM]: '0x1838b053E0223F05FB768fa79aA07Df3f0f27480',
  [ChainId.MOONRIVER]: '0x3d2f8ae0344d38525d2ae96ab750b83480c0844f',
  [ChainId.OPTIMISM]: '0xF0cBce1942A68BEB3d1b73F0dd86C8DCc363eF49',
  [ChainId.POLYGON]: '0x5097CBB61D3C75907656DC4e3bbA892Ff136649a',
  [ChainId.POLYGON_ZKEVM]: '0x93395129bd3fcf49d95730D3C2737c17990fF328',
} as const
export const isRouteProcessor2ChainId = (
  chainId: ChainId,
): chainId is RouteProcessor2ChainId =>
  ROUTE_PROCESSOR_2_SUPPORTED_CHAIN_IDS.includes(
    chainId as RouteProcessor2ChainId,
  )

// v3
export const ROUTE_PROCESSOR_3_SUPPORTED_CHAIN_IDS = [
  ChainId.ARBITRUM,
  ChainId.ARBITRUM_NOVA,
  ChainId.AVALANCHE,
  ChainId.BASE,
  ChainId.BOBA,
  ChainId.BOBA_AVAX,
  ChainId.BOBA_BNB,
  ChainId.BSC,
  ChainId.BTTC,
  ChainId.CELO,
  ChainId.CORE,
  ChainId.ETHEREUM,
  ChainId.FANTOM,
  ChainId.FUSE,
  ChainId.GNOSIS,
  ChainId.HAQQ,
  ChainId.HARMONY,
  ChainId.HECO,
  ChainId.KAVA,
  ChainId.METIS,
  ChainId.MOONBEAM,
  ChainId.MOONRIVER,
  ChainId.OKEX,
  ChainId.OPTIMISM,
  ChainId.PALM,
  ChainId.POLYGON,
  ChainId.POLYGON_ZKEVM,
  ChainId.TELOS,
  ChainId.THUNDERCORE,
  ChainId.LINEA,
] as const
export type RouteProcessor3ChainId =
  (typeof ROUTE_PROCESSOR_3_SUPPORTED_CHAIN_IDS)[number]
export const ROUTE_PROCESSOR_3_ADDRESS: Record<
  RouteProcessor3ChainId,
  `0x${string}`
> = {
  [ChainId.ARBITRUM]: '0xfc506AaA1340b4dedFfd88bE278bEe058952D674',
  [ChainId.ARBITRUM_NOVA]: '0x05689fCfeE31FCe4a67FbC7Cab13E74F80A4E288',
  [ChainId.AVALANCHE]: '0x717b7948AA264DeCf4D780aa6914482e5F46Da3e',
  [ChainId.BASE]: '0x0BE808376Ecb75a5CF9bB6D237d16cd37893d904',
  [ChainId.BOBA]: '0xbe811a0d44e2553d25d11cb8dc0d3f0d0e6430e6',
  [ChainId.BOBA_AVAX]: '0xF4d73326C13a4Fc5FD7A064217e12780e9Bd62c3',
  [ChainId.BOBA_BNB]: '0xF4d73326C13a4Fc5FD7A064217e12780e9Bd62c3',
  [ChainId.BSC]: '0x400d75dAb26bBc18D163AEA3e83D9Ea68F6c1804',
  [ChainId.BTTC]: '0x7A4af156379f512DE147ed3b96393047226d923F',
  [ChainId.CELO]: '0x2f686751b19a9d91cc3d57d90150Bc767f050066',
  [ChainId.CORE]: '0x0BE808376Ecb75a5CF9bB6D237d16cd37893d904',
  [ChainId.ETHEREUM]: '0x827179dD56d07A7eeA32e3873493835da2866976',
  [ChainId.FANTOM]: '0x2214A42d8e2A1d20635c2cb0664422c528B6A432',
  [ChainId.FUSE]: '0xaa26771d497814E81D305c511Efbb3ceD90BF5bd',
  [ChainId.GNOSIS]: '0xBBDe1d67297329148Fe1ED5e6B00114842728e65',
  [ChainId.HAQQ]: '0x0BE808376Ecb75a5CF9bB6D237d16cd37893d904',
  [ChainId.HARMONY]: '0xBBDe1d67297329148Fe1ED5e6B00114842728e65',
  [ChainId.HECO]: '0x0769fd68dFb93167989C6f7254cd0D766Fb2841F',
  [ChainId.KAVA]: '0x145d82bCa93cCa2AE057D1c6f26245d1b9522E6F',
  [ChainId.METIS]: '0x258f7E97149afd7D7F84fa63b10e4A3f0C38B788',
  [ChainId.MOONBEAM]: '0x843D0AAD40295f2198ef528ad747CDF6AB9000e4',
  [ChainId.MOONRIVER]: '0x7af71799C40F952237eAA4D81A77C1af49125113',
  [ChainId.OKEX]: '0x0BE808376Ecb75a5CF9bB6D237d16cd37893d904',
  [ChainId.OPTIMISM]: '0x4C5D5234f232BD2D76B96aA33F5AE4FCF0E4BFAb',
  [ChainId.PALM]: '0xF4d73326C13a4Fc5FD7A064217e12780e9Bd62c3',
  [ChainId.POLYGON]: '0x0a6e511Fe663827b9cA7e2D2542b20B37fC217A6',
  [ChainId.POLYGON_ZKEVM]: '0x2f686751b19a9d91cc3d57d90150Bc767f050066',
  [ChainId.TELOS]: '0x80C7DD17B01855a6D2347444a0FCC36136a314de',
  [ChainId.THUNDERCORE]: '0x1b9d177CcdeA3c79B6c8F40761fc8Dc9d0500EAa',
  [ChainId.LINEA]: '0x0b17dF2CDEf8f0fCb7847e287726C6a8c1415A1f',
} as const
export const isRouteProcessor3ChainId = (
  chainId: ChainId,
): chainId is RouteProcessor3ChainId =>
  ROUTE_PROCESSOR_3_SUPPORTED_CHAIN_IDS.includes(
    chainId as RouteProcessor3ChainId,
  )

// v3.1
export const ROUTE_PROCESSOR_3_1_SUPPORTED_CHAIN_IDS = [
  ChainId.ARBITRUM,
  ChainId.BASE,
  // ChainId.BSC,
  ChainId.ETHEREUM,
  ChainId.POLYGON,
] as const
export type RouteProcessor3_1ChainId =
  (typeof ROUTE_PROCESSOR_3_1_SUPPORTED_CHAIN_IDS)[number]
export const ROUTE_PROCESSOR_3_1_ADDRESS: Record<
  RouteProcessor3_1ChainId,
  `0x${string}`
> = {
  [ChainId.ARBITRUM]: '0x3c1fBA3bCEE7CE410B155a8C71F9fF1312852C82',
  [ChainId.BASE]: '0x9B77032075806975B3bd3bcFc69E5DE36ee6D176',
  // [ChainId.BSC]: '0xbACEB8eC6b9355Dfc0269C18bac9d6E2Bdc29C4F',
  [ChainId.ETHEREUM]: '0x8516944E89f296eb6473d79aED1Ba12088016c9e',
  [ChainId.POLYGON]: '0x9cfEAdcC38377283aDB944205c5238d04d4dD8A1',
} as const
export const isRouteProcessor3_1ChainId = (
  chainId: ChainId,
): chainId is RouteProcessor3_1ChainId =>
  ROUTE_PROCESSOR_3_1_SUPPORTED_CHAIN_IDS.includes(
    chainId as RouteProcessor3_1ChainId,
  )

// v3.2
export const ROUTE_PROCESSOR_3_2_SUPPORTED_CHAIN_IDS = [
  ChainId.ARBITRUM,
  ChainId.ARBITRUM_NOVA,
  ChainId.AVALANCHE,
  ChainId.BASE,
  ChainId.BSC,
  ChainId.CELO,
  ChainId.ETHEREUM,
  ChainId.FANTOM,
  ChainId.GNOSIS,
  ChainId.HAQQ,
  // ChainId.HARMONY,
  ChainId.LINEA,
  // ChainId.MOONRIVER,
  ChainId.OPTIMISM,
  ChainId.POLYGON,
  ChainId.POLYGON_ZKEVM,
  ChainId.SCROLL,
  ChainId.FILECOIN,
  ChainId.ZETACHAIN,
] as const
export type RouteProcessor3_2ChainId =
  (typeof ROUTE_PROCESSOR_3_2_SUPPORTED_CHAIN_IDS)[number]
export const ROUTE_PROCESSOR_3_2_ADDRESS: Record<
  RouteProcessor3_2ChainId,
  `0x${string}`
> = {
  [ChainId.ARBITRUM]: '0x09bD2A33c47746fF03b86BCe4E885D03C74a8E8C',
  [ChainId.ARBITRUM_NOVA]: '0x3DB923FBaB372ab8c796Fef9bb8341CdB37cB9eC',
  [ChainId.AVALANCHE]: '0x8f54301F315C56c112D492D9443047D4745dbe9e',
  [ChainId.BASE]: '0x83eC81Ae54dD8dca17C3Dd4703141599090751D1',
  [ChainId.BSC]: '0xd36990D74b947eC4Ad9f52Fe3D49d14AdDB51E44',
  [ChainId.CELO]: '0xaB235da7f52d35fb4551AfBa11BFB56e18774A65',
  [ChainId.ETHEREUM]: '0x5550D13389bB70F45fCeF58f19f6b6e87F6e747d',
  [ChainId.FANTOM]: '0xFB70AD5a200d784E7901230E6875d91d5Fa6B68c',
  [ChainId.GNOSIS]: '0x7A4af156379f512DE147ed3b96393047226d923F',
  [ChainId.HAQQ]: '0x1be211D8DA40BC0ae8719c6663307Bfc987b1d6c',
  // [ChainId.HARMONY]: '0x7A4af156379f512DE147ed3b96393047226d923F',
  [ChainId.LINEA]: '0x0BE808376Ecb75a5CF9bB6D237d16cd37893d904',
  // [ChainId.MOONRIVER]: '0xF70c086618dcf2b1A461311275e00D6B722ef914',
  [ChainId.OPTIMISM]: '0xEb94EcA012eC0bbB254722FdDa2CE7475875A52B',
  [ChainId.POLYGON]: '0xE7eb31f23A5BefEEFf76dbD2ED6AdC822568a5d2',
  [ChainId.POLYGON_ZKEVM]: '0xbE811A0D44E2553d25d11CB8DC0d3F0D0E6430E6',
  [ChainId.SCROLL]: '0xCA6Fe749878841b96F620Ec79638B13dAaD3D320',
  [ChainId.FILECOIN]: '0xCdBCd51a5E8728E0AF4895ce5771b7d17fF71959',
  [ChainId.ZETACHAIN]: '0xb46e319390De313B8cc95EA5aa30C7bBFD79Da94',
} as const
export const isRouteProcessor3_2ChainId = (
  chainId: ChainId,
): chainId is RouteProcessor3_2ChainId =>
  ROUTE_PROCESSOR_3_2_SUPPORTED_CHAIN_IDS.includes(
    chainId as RouteProcessor3_2ChainId,
  )

// v4
export const ROUTE_PROCESSOR_4_SUPPORTED_CHAIN_IDS = [
  ChainId.ETHEREUM,
  ChainId.ARBITRUM,
  ChainId.OPTIMISM,
  ChainId.BASE,
  ChainId.POLYGON,
  ChainId.AVALANCHE,
  ChainId.BSC,
  ChainId.LINEA,
  ChainId.ARBITRUM_NOVA,
  ChainId.GNOSIS,
  ChainId.FANTOM,
  ChainId.BTTC,
  ChainId.CELO,
  ChainId.FILECOIN,
  ChainId.HAQQ,
  ChainId.KAVA,
  ChainId.METIS,
  ChainId.THUNDERCORE,
  ChainId.SCROLL,
  ChainId.ZETACHAIN,
  ChainId.MOONBEAM,
  ChainId.MOONRIVER,
  ChainId.POLYGON_ZKEVM,
  ChainId.FUSE,
  ChainId.HARMONY,
  ChainId.TELOS,
  ChainId.BOBA,
  ChainId.BOBA_BNB,
  ChainId.CORE,
  ChainId.CRONOS,
  ChainId.BLAST,
  ChainId.SKALE_EUROPA,
  ChainId.ROOTSTOCK,
] as const
export type RouteProcessor4ChainId =
  (typeof ROUTE_PROCESSOR_4_SUPPORTED_CHAIN_IDS)[number]
export const ROUTE_PROCESSOR_4_ADDRESS: Record<
  RouteProcessor4ChainId,
  `0x${string}`
> = {
  [ChainId.ETHEREUM]: '0xe43ca1Dee3F0fc1e2df73A0745674545F11A59F5',
  [ChainId.ARBITRUM]: '0x544bA588efD839d2692Fc31EA991cD39993c135F',
  [ChainId.OPTIMISM]: '0x1f2FCf1d036b375b384012e61D3AA33F8C256bbE',
  [ChainId.BASE]: '0x0389879e0156033202c44bf784ac18fc02edee4f',
  [ChainId.POLYGON]: '0x46B3fDF7b5CDe91Ac049936bF0bDb12c5d22202e',
  [ChainId.AVALANCHE]: '0xCdBCd51a5E8728E0AF4895ce5771b7d17fF71959',
  [ChainId.BSC]: '0x33d91116e0370970444B0281AB117e161fEbFcdD',
  [ChainId.LINEA]: '0x46b3fdf7b5cde91ac049936bf0bdb12c5d22202e',
  [ChainId.ARBITRUM_NOVA]: '0xCdBCd51a5E8728E0AF4895ce5771b7d17fF71959',
  [ChainId.GNOSIS]: '0x46b3fdf7b5cde91ac049936bf0bdb12c5d22202e',
  [ChainId.FANTOM]: '0x46b3fdf7b5cde91ac049936bf0bdb12c5d22202e',
  [ChainId.BTTC]: '0x93c31c9C729A249b2877F7699e178F4720407733',
  [ChainId.CELO]: '0xCdBCd51a5E8728E0AF4895ce5771b7d17fF71959',
  [ChainId.FILECOIN]: '0x1f2FCf1d036b375b384012e61D3AA33F8C256bbE',
  [ChainId.HAQQ]: '0xc3Ec4e1511c6935ed2F92b9A61881a1B95bB1566',
  [ChainId.KAVA]: '0xB45e53277a7e0F1D35f2a77160e91e25507f1763',
  [ChainId.METIS]: '0xB45e53277a7e0F1D35f2a77160e91e25507f1763',
  [ChainId.THUNDERCORE]: '0x57bfFa72db682f7eb6C132DAE03FF36bBEB0c459',
  [ChainId.SCROLL]: '0x734583f62Bb6ACe3c9bA9bd5A53143CA2Ce8C55A',
  [ChainId.ZETACHAIN]: '0x640129e6b5C31B3b12640A5b39FECdCa9F81C640',
  [ChainId.MOONBEAM]: '0xB45e53277a7e0F1D35f2a77160e91e25507f1763',
  [ChainId.MOONRIVER]: '0x46B3fDF7b5CDe91Ac049936bF0bDb12c5d22202e',
  [ChainId.POLYGON_ZKEVM]: '0x57bfFa72db682f7eb6C132DAE03FF36bBEB0c459',
  [ChainId.FUSE]: '0x46B3fDF7b5CDe91Ac049936bF0bDb12c5d22202e',
  [ChainId.HARMONY]: '0x9B3336186a38E1b6c21955d112dbb0343Ee061eE',
  [ChainId.TELOS]: '0x1400feFD6F9b897970f00Df6237Ff2B8b27Dc82C',
  [ChainId.BOBA]: '0xe43ca1Dee3F0fc1e2df73A0745674545F11A59F5',
  [ChainId.BOBA_BNB]: '0xCdBCd51a5E8728E0AF4895ce5771b7d17fF71959',
  [ChainId.CORE]: '0x0389879e0156033202C44BF784ac18fC02edeE4f',
  [ChainId.CRONOS]: '0xCdBCd51a5E8728E0AF4895ce5771b7d17fF71959',
  [ChainId.BLAST]: '0xCdBCd51a5E8728E0AF4895ce5771b7d17fF71959',
  [ChainId.SKALE_EUROPA]: '0xbA61F775730C0a3E3361717195ee86785ee33055',
  [ChainId.ROOTSTOCK]: '0xb46e319390De313B8cc95EA5aa30C7bBFD79Da94',
} as const
export const isRouteProcessor4ChainId = (
  chainId: ChainId,
): chainId is RouteProcessor4ChainId =>
  ROUTE_PROCESSOR_4_SUPPORTED_CHAIN_IDS.includes(
    chainId as RouteProcessor4ChainId,
  )

// v5
export const ROUTE_PROCESSOR_5_SUPPORTED_CHAIN_IDS = [
  ChainId.ETHEREUM,
  ChainId.ARBITRUM,
  ChainId.OPTIMISM,
  ChainId.BASE,
  ChainId.POLYGON,
  ChainId.AVALANCHE,
  ChainId.BSC,
  ChainId.LINEA,
  ChainId.ARBITRUM_NOVA,
  ChainId.GNOSIS,
  ChainId.FANTOM,
  ChainId.BTTC,
  ChainId.CELO,
  ChainId.FILECOIN,
  ChainId.HAQQ,
  ChainId.KAVA,
  ChainId.METIS,
  ChainId.THUNDERCORE,
  ChainId.SCROLL,
  ChainId.ZETACHAIN,
  ChainId.MOONBEAM,
  ChainId.MOONRIVER,
  ChainId.POLYGON_ZKEVM,
  ChainId.FUSE,
  ChainId.HARMONY,
  ChainId.TELOS,
  ChainId.BOBA,
  ChainId.BOBA_BNB,
  ChainId.CORE,
  ChainId.CRONOS,
  ChainId.BLAST,
  ChainId.SKALE_EUROPA,
  ChainId.ROOTSTOCK,
  ChainId.CRONOS,
] as const
export type RouteProcessor5ChainId =
  (typeof ROUTE_PROCESSOR_5_SUPPORTED_CHAIN_IDS)[number]
export const ROUTE_PROCESSOR_5_ADDRESS: Record<
  RouteProcessor5ChainId,
  Address
> = {
  [ChainId.ETHEREUM]: '0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55',
  [ChainId.ARBITRUM]: '0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55',
  [ChainId.OPTIMISM]: '0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55',
  [ChainId.BASE]: '0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55',
  [ChainId.POLYGON]: '0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55',
  [ChainId.AVALANCHE]: '0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55',
  [ChainId.BSC]: '0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55',
  [ChainId.LINEA]: '0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55',
  [ChainId.ARBITRUM_NOVA]: '0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55',
  [ChainId.GNOSIS]: '0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55',
  [ChainId.FANTOM]: '0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55',
  [ChainId.BTTC]: '0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55',
  [ChainId.CELO]: '0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55',
  [ChainId.FILECOIN]: '0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55',
  [ChainId.HAQQ]: '0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55',
  [ChainId.KAVA]: '0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55',
  [ChainId.METIS]: '0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55',
  [ChainId.THUNDERCORE]: '0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55',
  [ChainId.SCROLL]: '0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55',
  [ChainId.ZETACHAIN]: '0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55',
  [ChainId.MOONBEAM]: '0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55',
  [ChainId.MOONRIVER]: '0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55',
  [ChainId.POLYGON_ZKEVM]: '0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55',
  [ChainId.FUSE]: '0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55',
  [ChainId.HARMONY]: '0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55',
  [ChainId.TELOS]: '0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55',
  [ChainId.BOBA]: '0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55',
  [ChainId.BOBA_BNB]: '0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55',
  [ChainId.CORE]: '0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55',
  [ChainId.CRONOS]: '0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55',
  [ChainId.BLAST]: '0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55',
  [ChainId.SKALE_EUROPA]: '0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55',
  [ChainId.ROOTSTOCK]: '0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55',
} as const
export const isRouteProcessor5ChainId = (
  chainId: ChainId,
): chainId is RouteProcessor5ChainId =>
  ROUTE_PROCESSOR_5_SUPPORTED_CHAIN_IDS.includes(
    chainId as RouteProcessor5ChainId,
  )
