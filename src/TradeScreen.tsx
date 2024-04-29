import { Select, MenuItem} from "@mui/material";
import { useContext, useEffect, useState } from "react";
import { BearerTokenContext, ShipContext } from "./GameContextProvider";
import { getSystemSymbol } from "./Util";
import { api } from "./packages/SpaceTradersAPI";

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

function Market(props: {waypointSymbol: string}) {
  const bearerToken = useContext(BearerTokenContext);
  const { waypointSymbol } = props;

  const [marketData, setMarketData] = useState<any>();

  useEffect(() => {
    const pollMarket = async() => {
    if (waypointSymbol) {
        setMarketData(await getMarketDetails(bearerToken, waypointSymbol))
      }
  }
    pollMarket();
  }, [bearerToken, waypointSymbol, setMarketData])
  console.log(marketData);
  
  return <div></div>;
}

function TradeScreen() {
  const shipList = useContext(ShipContext);
  const shipSymbols = shipList.map((ship) => ship.symbol);

  const [activeShip, setActiveShip] = useState(shipSymbols[0] || "")
  const activeShipData = shipList.find((ship) => ship.symbol === activeShip);

  return <>
    <Select label="Active Ship" value={activeShip} onChange={(event) => setActiveShip(event.target.value)}>
      {shipSymbols.map((symbol) => <MenuItem value={symbol}>{symbol}</MenuItem>)}
    </Select>
    <Market waypointSymbol={activeShipData.nav.waypointSymbol} />
  </>
}

export default TradeScreen
