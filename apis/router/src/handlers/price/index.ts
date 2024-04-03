import { Request, Response } from 'express'
import { RequestStatistics } from '../../RequestStatistics.js'
import { CHAIN_ID, ROUTER_CONFIG } from '../../config.js'
import { extractorClient } from '../../index.js'
import { priceUpdateInterval, prices } from '../../prices.js'
import { Currency, allPricesSchema, singleAddressSchema } from './schema.js'

const priceStatistics = new RequestStatistics('Prices', 60_000) // update log once per min
priceStatistics.start()

export const pricesHandler = (req: Request, res: Response) => {
  const { currency, oldPrices } = allPricesSchema.parse(req.query)
  res.setHeader('Cache-Control', `maxage=${priceUpdateInterval}`)
  if (
    ROUTER_CONFIG[CHAIN_ID]?.['experimantalPriceIncrementalMode'] === true &&
    oldPrices !== true
  )
    res.json(
      currency === Currency.USD ? extractorClient?.getPrices() ?? {} : {},
    )
  else res.json(prices[currency])
  priceStatistics.addAllRequest()
}

export const priceByAddressHandler = (req: Request, res: Response) => {
  const { currency, address } = singleAddressSchema.parse({
    ...req.query,
    ...req.params,
  })
  res.setHeader('Cache-Control', `maxage=${priceUpdateInterval}`)
  if (ROUTER_CONFIG[CHAIN_ID]?.['experimantalPriceIncrementalMode'] === true) {
    if (currency === Currency.USD) {
      const price = extractorClient?.getPrice(address)
      if (price !== undefined) {
        res.json(price)
        priceStatistics.addKnownRequest()
      } else {
        res.json()
        priceStatistics.addUnKnownRequest()
      }
    } else res.json()
  } else {
    if (
      prices[currency] === undefined ||
      prices[currency][address] === undefined
    ) {
      res.json()
      priceStatistics.addUnKnownRequest()
      return
    }
    res.json(prices[currency][address])
    priceStatistics.addKnownRequest()
  }
}