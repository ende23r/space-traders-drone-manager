import { Select, MenuItem, Typography, Paper, Container, Button, TextField } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { getSystemSymbol } from "./Util";
import { api, schemas } from "./packages/SpaceTradersAPI";
import { z } from "zod";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useMyShips } from "./Api";

type Market = z.infer<typeof schemas.Market>;
type MarketTradeGood = z.infer<typeof schemas.MarketTradeGood>;
type TradeSymbol = z.infer<typeof schemas.TradeSymbol>;

async function getMarketDetails(bearerToken: string, waypointSymbol: string) {
  const options = {
    headers: {
      Authorization: `Bearer ${bearerToken}`
    },
    params: {
      systemSymbol: getSystemSymbol(waypointSymbol),
      waypointSymbol
    }
  }
  const response = await api["get-market"](options)
  return response.data;
}

async function buyGood(bearerToken: string, shipSymbol: string, tradeSymbol: TradeSymbol, units: number) {
  const body = {
    symbol: tradeSymbol,  units
  }
  const options = {
    headers: {
      Authorization: `Bearer ${bearerToken}`
    },
    params: {
      shipSymbol
    }
  }
  const response = await api["purchase-cargo"](body, options)
  return response;
}

async function sellGood(bearerToken: string, shipSymbol: string, tradeSymbol: TradeSymbol, units: number) {
  const body = {
    symbol: tradeSymbol,  units
  }
  const options = {
    headers: {
      Authorization: `Bearer ${bearerToken}`
    },
    params: {
      shipSymbol
    }
  }
  const response = await api["sell-cargo"](body, options)
  return response;
}

function TradeGood(props: {tradeGood: MarketTradeGood, shipSymbol: string}) {
  const { tradeGood, shipSymbol } = props;
  const [bearerToken] = useLocalStorage("bearerToken", "");

  const buyQuantityRef = useRef({value: "1"});
  const sellQuantityRef = useRef({value: "1"});
  
  return <Container>
      <Typography>{tradeGood.symbol} ({tradeGood.type})</Typography>
    <Typography>Buy Price: {tradeGood.purchasePrice}</Typography>
    <Button
      onClick={() => {
        if(!buyQuantityRef.current) { return; }
        buyGood(bearerToken, shipSymbol, tradeGood.symbol, 1)
      }}
      >Buy</Button>
    <TextField
      id="outlined-number"
      label="Buy Quantity"
      type="number"
      inputRef={buyQuantityRef}
      defaultValue={1}
      InputLabelProps={{
        shrink: true,
      }}
    />
    <Typography>Sell Price: {tradeGood.sellPrice}</Typography>
    <Button
      onClick={() => {
        if(!sellQuantityRef.current) {
          return;
        }
        sellGood(bearerToken, shipSymbol, tradeGood.symbol, parseInt(sellQuantityRef.current.value, 10))
      }}
      >Sell</Button>
    <TextField
      id="outlined-number"
      label="Sell Quantity"
      type="number"
      inputRef={sellQuantityRef}
      defaultValue={1}
      InputLabelProps={{
        shrink: true,
      }}
    />
    </Container>;  
}

function Market(props: {waypointSymbol: string, shipSymbol: string}) {
  const { waypointSymbol, shipSymbol } = props;
  const [bearerToken] = useLocalStorage("bearerToken", "");

  const [marketData, setMarketData] = useState<Market>();

  useEffect(() => {
    const pollMarket = async() => {
    if (waypointSymbol) {
        setMarketData(await getMarketDetails(bearerToken, waypointSymbol))
      }
  }
    pollMarket();
  }, [bearerToken, waypointSymbol, setMarketData])

  if (!marketData) {
    return <Paper><Typography>No market data available</Typography></Paper>
  }

  let tradeGoodsContainer;
  if (marketData.tradeGoods) {
    tradeGoodsContainer = (
      <Container>
        <Typography variant="h4">TradeGoods</Typography>
        {marketData.tradeGoods.map((tradeGood) => <TradeGood tradeGood={tradeGood} shipSymbol={shipSymbol} />)}
      </Container>
    )
  }
  
  return <Paper>
    <Typography variant="h3">Market {marketData.symbol}</Typography>
    <Container>
      <Typography variant="h4">Imports</Typography>
      {marketData.imports.map((impor) => impor.symbol)}
    </Container>
    {tradeGoodsContainer}
    </Paper>
}

function TradeScreen() {
  const {data: shipData} = useMyShips();
  const shipList = shipData?.data || [];
  const shipSymbols = shipList.map((ship) => ship.symbol);

  const [activeShip, setActiveShip] = useState(shipSymbols[0] || "")
  const activeShipData = shipList.find((ship) => ship.symbol === activeShip);

  return <>
    <Select label="Active Ship" value={activeShip} onChange={(event) => setActiveShip(event.target.value)}>
      {shipSymbols.map((symbol) => <MenuItem value={symbol}>{symbol}</MenuItem>)}
    </Select>
    <Market waypointSymbol={activeShipData?.nav.waypointSymbol || ""} shipSymbol={activeShip} />
  </>
}

export default TradeScreen
