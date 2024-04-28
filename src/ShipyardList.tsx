import { useContext, useEffect, useState } from "react";
import { NavigationContext } from "./GameContextProvider";
import { api, schemas } from "./packages/SpaceTradersAPI";
import { Card, MenuItem, Select, Typography } from "@mui/material";
import { z } from "zod";

type Shipyard = z.infer<typeof schemas.Shipyard>;

function getSystemSymbol(navSymbol: string) {
  const [sector, system] = navSymbol.split("-");
  return `${sector}-${system}`;
}

function ShipSaleList(props: {data: Shipyard | undefined}) {
  const { data } = props;
  if (!data) { return null; }
  return <Card>
    <Typography variant={"h3"}>{data.symbol}</Typography>
    <Typography>Modification Fee: {data.modificationsFee}</Typography>
    {data.shipTypes.map((shipType) => shipType.type)}
    </Card>;
}

function ShipyardList() {
  const navLocations = useContext(NavigationContext);
  const shipyardLocations = navLocations.filter((navloc) => navloc.traits.some((trait: any) => trait.symbol === "SHIPYARD"))
  const shipyardSymbols = shipyardLocations.map((navloc) => navloc.symbol);

  const [shipyardSelected, selectShipyard] = useState(shipyardSymbols[0] || "");
  const [shipyardData, setShipyardData] = useState<Shipyard>();

  useEffect(() => {
    const queryShipyard = async() => {
      const response = await api["get-shipyard"]({params: {systemSymbol: getSystemSymbol(shipyardSelected), waypointSymbol: shipyardSelected}});
      setShipyardData(response.data);
    }
    if (shipyardSelected) {
      queryShipyard()
    }
  }, [shipyardSelected])

  return <div>
    <Typography variant="h2">Shipyard List!</Typography>
    <div>
      <Select
          value={shipyardSelected}
          label="Shipyard"
          onChange={(e) => selectShipyard(e.target.value)}
        >
        {shipyardSymbols.map((symbol) => <MenuItem value={symbol}>{symbol}</MenuItem>)}
      </Select>
    </div>
    <div>
      <ShipSaleList data={shipyardData} />
    </div>
    </div>;
}

export default ShipyardList;
