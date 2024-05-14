import { useEffect, useState } from "react";
import { api, schemas } from "./packages/SpaceTradersAPI";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import { z } from "zod";
import { getSystemSymbol } from "./Util";
import { useLocations, usePurchaseShipMutation } from "./Api";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { ExpandMore } from "@mui/icons-material";

type Shipyard = z.infer<typeof schemas.Shipyard>;
type ShipyardShip = z.infer<typeof schemas.ShipyardShip>;

function ShipPurchaseOption(props: {
  data: ShipyardShip;
  waypointSymbol: string;
}) {
  const { data, waypointSymbol } = props;
  const { mutate: purchaseShip } = usePurchaseShipMutation(
    waypointSymbol,
    data.type,
  );
  return (
    <Card>
      <CardHeader title={data.name} />
      <CardContent>
        <Typography>Price: {data.purchasePrice}</Typography>
        <Typography>
          Crew: {data.crew.required}/{data.crew.capacity}
        </Typography>
        <Typography>Fuel Capacity: {data.frame.fuelCapacity}</Typography>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            Mounts ({data.mounts.length})
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {data.mounts.map((mount) => (
                <ListItem>
                  <ListItemText primary={mount.symbol} />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      </CardContent>
      <CardActions>
        <Button variant="contained" onClick={() => purchaseShip()}>
          Purchase
        </Button>
      </CardActions>
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
