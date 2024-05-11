import {
  Button,
  Stack,
  Select,
  MenuItem,
  Typography,
  Paper,
  Container,
} from "@mui/material";
import { useState } from "react";
import { z } from "zod";

import {
  Ship,
  useBuyGoodMutation,
  useLocations,
  useMarketDetails,
  useMyAgent,
  useMyShips,
  useSellGoodMutation,
} from "./Api";
import { getSystemSymbol } from "./Util";

import { schemas } from "./packages/SpaceTradersAPI";

type Market = z.infer<typeof schemas.Market>;
type MarketTradeGood = z.infer<typeof schemas.MarketTradeGood>;
// type TradeSymbol = z.infer<typeof schemas.TradeSymbol>;

function TradeGood(props: { tradeGood: MarketTradeGood; ship: Ship }) {
  const { tradeGood, ship } = props;
  const { mutate: buyGood } = useBuyGoodMutation();
  const { mutate: sellGood } = useSellGoodMutation();

  const shipStock =
    ship.cargo.inventory.find((item) => item.symbol === tradeGood.symbol)
      ?.units || 0;

  return (
    <>
      <Typography>
        {tradeGood.symbol} ({tradeGood.type})
      </Typography>
      <Stack direction="row">
        <Typography>Buy Price: {tradeGood.purchasePrice}</Typography>
        <Button
          disabled={
            ship.nav.status !== "DOCKED" ||
            ship.cargo.units === ship.cargo.capacity
          }
          onClick={() => {
            buyGood({
              shipSymbol: ship.symbol,
              cargoSymbol: tradeGood.symbol,
              units: 1,
            });
          }}
        >
          Buy 1
        </Button>
      </Stack>
      <Stack direction="row">
        <Typography>Sell Price: {tradeGood.sellPrice}</Typography>
        <Button
          disabled={ship.nav.status !== "DOCKED" || shipStock === 0}
          onClick={() => {
            sellGood({
              shipSymbol: ship.symbol,
              cargoSymbol: tradeGood.symbol,
              units: 1,
            });
          }}
        >
          Sell 1
        </Button>
        <Button
          disabled={ship.nav.status !== "DOCKED" || shipStock === 0}
          onClick={() => {
            sellGood({
              shipSymbol: ship.symbol,
              cargoSymbol: tradeGood.symbol,
              units: shipStock,
            });
          }}
        >
          Sell All
        </Button>
      </Stack>
    </>
  );
}

function Market(props: { waypointSymbol: string }) {
  const { waypointSymbol } = props;

  const { data: marketData } = useMarketDetails(waypointSymbol);
  const { data: shipData } = useMyShips();
  const shipList = shipData?.data || [];
  const tradeShips = shipList.filter(
    (ship) => ship.nav.waypointSymbol === waypointSymbol,
  );

  const [selectedShipSymbol, setSelectedShipSymbol] = useState(
    tradeShips[0]?.symbol || "",
  );
  const selectedShip = shipList.find(
    (ship) => ship.symbol === selectedShipSymbol,
  );

  if (!marketData) {
    return (
      <Paper>
        <Typography>No market data available</Typography>
      </Paper>
    );
  }

  let tradeGoodsContainer;
  if (marketData.tradeGoods && selectedShip) {
    tradeGoodsContainer = (
      <Container>
        <Typography variant="h4">TradeGoods</Typography>
        {marketData.tradeGoods.map((tradeGood) => (
          <TradeGood tradeGood={tradeGood} ship={selectedShip} />
        ))}
      </Container>
    );
  }

  return (
    <Paper>
      <Typography variant="h3">Market {marketData.symbol}</Typography>
      <Container>
        <Select
          label="Selected Trade Ship"
          value={selectedShipSymbol}
          onChange={(event) => setSelectedShipSymbol(event.target.value)}
        >
          {tradeShips.map((ship) => (
            <MenuItem value={ship.symbol}>{ship.symbol}</MenuItem>
          ))}
        </Select>
        <Typography variant="h4">Imports</Typography>
        {marketData.imports.map((impor) => impor.symbol).join(", ")}
        <Typography variant="h4">Exports</Typography>
        {marketData.exports.map((expor) => expor.symbol).join(", ")}
      </Container>
      {tradeGoodsContainer}
    </Paper>
  );
}

function TradeScreen() {
  // const shipList = shipData?.data || [];
  const { agent } = useMyAgent();
  const systemSymbol = getSystemSymbol(agent.headquarters || "");
  const { data: navData } = useLocations(systemSymbol);
  const marketLocations =
    navData?.filter((navLoc) =>
      navLoc.traits.map((trait) => trait.symbol).includes("MARKETPLACE"),
    ) || [];

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
