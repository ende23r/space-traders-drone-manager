import { useEffect, useState } from "react";
import { api, schemas } from "./packages/SpaceTradersAPI";
import { Button, Card, MenuItem, Select, Typography } from "@mui/material";
import { z } from "zod";
import { getSystemSymbol } from "./Util";
import { useLocations } from "./Api";
import { useLocalStorage } from "./hooks/useLocalStorage";

type Shipyard = z.infer<typeof schemas.Shipyard>;
type ShipyardShip = z.infer<typeof schemas.ShipyardShip>;
type ShipType = z.infer<typeof schemas.ShipType>;

// TODO: make this invalidate state of agents and ships
async function purchaseShip(
  bearerToken: string,
  shipType: ShipType,
  waypointSymbol: string,
) {
  const body = { shipType, waypointSymbol };
  const options = {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
    },
  };
  const response = await api["purchase-ship"](body, options);
  return response.data;
}

function ShipPurchaseOption(props: {
  data: ShipyardShip;
  waypointSymbol: string;
}) {
  const [bearerToken] = useLocalStorage("bearerToken", "");
  const { data, waypointSymbol } = props;
  return (
    <Card>
      <Typography>
        {data.name}
        <Button
          variant="contained"
          onClick={() => purchaseShip(bearerToken, data.type, waypointSymbol)}
        >
          Purchase
        </Button>
      </Typography>
      <Typography>Price: {data.purchasePrice}</Typography>
      <Typography>
        Crew: {data.crew.required}/{data.crew.capacity}
      </Typography>
    </Card>
  );
}

function ShipSaleList(props: { data: Shipyard | undefined }) {
  const { data } = props;
  if (!data) {
    return null;
  }
  return (
    <Card>
      <Typography variant={"h3"}>{data.symbol}</Typography>
      <Typography>Modification Fee: {data.modificationsFee}</Typography>
      {/*<Typography>{data.shipTypes.map((shipType) => shipType.type)}</Typography>*/}
      {data.ships
        ? data.ships.map((ship) => (
            <ShipPurchaseOption data={ship} waypointSymbol={data.symbol} />
          ))
        : null}
    </Card>
  );
}

function ShipyardList(props: { systemSymbol: string }) {
  const { systemSymbol } = props;
  const [bearerToken] = useLocalStorage("bearerToken", "");
  const { data: navData } = useLocations(systemSymbol);
  const navLocations = navData || [];
  const shipyardLocations = navLocations.filter((navloc) =>
    navloc.traits.some((trait: any) => trait.symbol === "SHIPYARD"),
  );
  const shipyardSymbols = shipyardLocations.map((navloc) => navloc.symbol);

  const [shipyardSelected, selectShipyard] = useState(shipyardSymbols[0] || "");
  const [shipyardData, setShipyardData] = useState<Shipyard>();

  useEffect(() => {
    const queryShipyard = async () => {
      const response = await api["get-shipyard"]({
        params: {
          systemSymbol: getSystemSymbol(shipyardSelected),
          waypointSymbol: shipyardSelected,
        },
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
      });
      setShipyardData(response.data);
    };
    if (shipyardSelected) {
      queryShipyard();
    }
  }, [shipyardSelected]);

  return (
    <div>
      <Typography variant="h2">Shipyard List!</Typography>
      <div>
        <Select
          value={shipyardSelected}
          label="Shipyard"
          onChange={(e) => selectShipyard(e.target.value)}
        >
          {shipyardSymbols.map((symbol) => (
            <MenuItem value={symbol}>{symbol}</MenuItem>
          ))}
        </Select>
      </div>
      <div>
        <ShipSaleList data={shipyardData} />
      </div>
    </div>
  );
}

export default ShipyardList;
