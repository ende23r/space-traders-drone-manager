import { Select, MenuItem, Typography, Paper, Container } from "@mui/material";
import { useEffect, useState } from "react";
import { getSystemSymbol } from "./Util";
import { api, schemas } from "./packages/SpaceTradersAPI";
import { z } from "zod";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useLocations, useMyAgent } from "./Api";

type Market = z.infer<typeof schemas.Market>;
// type MarketTradeGood = z.infer<typeof schemas.MarketTradeGood>;
// type TradeSymbol = z.infer<typeof schemas.TradeSymbol>;

async function getMarketDetails(bearerToken: string, waypointSymbol: string) {
  const options = {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
    },
    params: {
      systemSymbol: getSystemSymbol(waypointSymbol),
      waypointSymbol,
    },
  };
  const response = await api["get-market"](options);
  return response.data;
}

/*
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
*/

/*
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
}*/

function Market(props: { waypointSymbol: string }) {
  const { waypointSymbol } = props;
  const [bearerToken] = useLocalStorage("bearerToken", "");

  const [marketData, setMarketData] = useState<Market>();

  useEffect(() => {
    const pollMarket = async () => {
      if (waypointSymbol) {
        setMarketData(await getMarketDetails(bearerToken, waypointSymbol));
      }
    };
    pollMarket();
  }, [bearerToken, waypointSymbol, setMarketData]);

  if (!marketData) {
    return (
      <Paper>
        <Typography>No market data available</Typography>
      </Paper>
    );
  }

  let tradeGoodsContainer;
  if (marketData.tradeGoods) {
    tradeGoodsContainer = (
      <Container>
        <Typography variant="h4">TradeGoods</Typography>
        {JSON.stringify(marketData.tradeGoods)}
        {/*marketData.tradeGoods.map((tradeGood) => <TradeGood tradeGood={tradeGood} shipSymbol={shipSymbol} />)*/}
      </Container>
    );
  }

  return (
    <Paper>
      <Typography variant="h3">Market {marketData.symbol}</Typography>
      <Container>
        <Typography variant="h4">Imports</Typography>
        {marketData.imports.map((impor) => impor.symbol)}
        <Typography variant="h4">Exports</Typography>
        {marketData.exports.map((expor) => expor.symbol)}
      </Container>
      {tradeGoodsContainer}
    </Paper>
  );
}

function TradeScreen() {
  // const {data: shipData} = useMyShips();
  // const shipList = shipData?.data || [];
  const { data: agentData } = useMyAgent();
  const systemSymbol = getSystemSymbol(agentData.data.headquarters);
  const { data: navData } = useLocations(systemSymbol);
  const marketLocations =
    navData?.filter((navLoc) =>
      navLoc.traits.map((trait) => trait.symbol).includes("MARKETPLACE"),
    ) || [];
  console.log({ navData, marketLocations });

  const [marketSymbol, setMarketSymbol] = useState(
    marketLocations[0]?.symbol || "",
  );

  return (
    <>
      <Select
        label="Selected Marketplace"
        value={marketSymbol}
        onChange={(event) => setMarketSymbol(event.target.value)}
      >
        {marketLocations.map((navLoc) => (
          <MenuItem value={navLoc.symbol}>{navLoc.symbol}</MenuItem>
        ))}
      </Select>
      <Market waypointSymbol={marketSymbol} />
    </>
  );
}

export default TradeScreen;
