import { schemas } from "./packages/SpaceTradersAPI";
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
  Typography,
} from "@mui/material";
import { z } from "zod";
import { useLocations, usePurchaseShipMutation, useShipyard } from "./Api";
import { ExpandMore } from "@mui/icons-material";

// type Shipyard = z.infer<typeof schemas.Shipyard>;
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

function ShipSaleList({ shipyardSymbol }: { shipyardSymbol: string }) {
  const { data: shipyardData } = useShipyard(shipyardSymbol);
  if (!shipyardData) {
    return null;
  }
  return (
    <>
      <Typography>
        Ship Types:{" "}
        {shipyardData.data.shipTypes
          .map((shipType) => shipType.type)
          .join(", ")}
      </Typography>
      <Typography>
        Modification Fee: {shipyardData.data.modificationsFee}
      </Typography>
      {shipyardData.data.ships
        ? shipyardData.data.ships.map((ship, index) => (
            <ShipPurchaseOption
              key={`${shipyardSymbol}:${index}`}
              data={ship}
              waypointSymbol={shipyardSymbol}
            />
          ))
        : null}
    </>
  );
}

function ShipyardList(props: { systemSymbol: string }) {
  const { systemSymbol } = props;
  const { data: navData } = useLocations(systemSymbol);
  const navLocations = navData || [];
  const shipyardLocations = navLocations.filter((navloc) =>
    navloc.traits.some((trait: any) => trait.symbol === "SHIPYARD"),
  );
  const shipyardSymbols = shipyardLocations.map((navloc) => navloc.symbol);
  return (
    <div>
      <Typography variant="h3">Shipyard List!</Typography>
      {shipyardSymbols.map((symbol) => (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h4">{symbol}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <ShipSaleList shipyardSymbol={symbol} />
          </AccordionDetails>
        </Accordion>
      ))}
    </div>
  );
}

export default ShipyardList;
