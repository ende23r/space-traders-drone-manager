import { useState } from "react";
import {
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  MenuItem,
  Select,
  Switch,
  Typography,
} from "@mui/material";
import { schemas } from "./packages/SpaceTradersAPI";
import {
  globalQueryClient,
  useExtractMutation,
  useFuelShipMutation,
  useHQLocations,
  useMyShips,
  useNavigateMutation,
  useSwitchDockingMutation,
} from "./Api";
import { z } from "zod";
import { toast } from "react-toastify";

type Ship = z.infer<typeof schemas.Ship>;
type ShipNav = z.infer<typeof schemas.ShipNav>;
type Waypoint = z.infer<typeof schemas.Waypoint>;

function computeRemainingCooldownFraction(cooldown: any) {
  return (
    (cooldown.totalSeconds - cooldown.remainingSeconds + 0.01) /
    (cooldown.totalSeconds + 0.01)
  );
}


function computeDistance(shipNav: ShipNav, destinationNav: Waypoint) {
  const originNav = shipNav.route.destination;
  const distance = Math.sqrt(
    Math.pow(destinationNav.x - originNav.x, 2) +
    Math.pow(destinationNav.y - originNav.y, 2),
  );
  return distance;
}

const validMiningWaypointTypes = [
  "ASTEROID", "ASTEROID_FIELD", "ENGINEERED_ASTEROID"
]

function ShipCard(props: { ship: Ship }) {
  const { ship } = props;

  const { data: locationsData } = useHQLocations();
  const navLocations = locationsData || [];

  const [destination, setDestination] = useState<string>(
    ship.nav.waypointSymbol,
  );

  const { mutate: switchDocked } = useSwitchDockingMutation(ship.symbol);
  const { mutate: triggerNavigation, /*data: navigateMutationData */ } = useNavigateMutation(ship.symbol);
  // console.log({ navigateMutationData })
  // This has nav.route.arrivalTime so we could use that to schedule the next ship update

  const { mutate: triggerExtract, /*data: extractData */ } = useExtractMutation(ship.symbol);
  const { mutate: fuelShip } = useFuelShipMutation(ship.symbol);

  const extractionDisabled = ship.nav.status !== "IN_ORBIT" || !validMiningWaypointTypes.includes(ship.nav.route.destination.type) || ship.cooldown.remainingSeconds > 0
  const destinationNav =
    navLocations.find((loc) => loc.symbol === destination) || null;
  const distanceIndicator = destinationNav ? (
    <Typography>
      Distance to Target: {computeDistance(ship.nav, destinationNav)} units.
    </Typography>
  ) : null;

  return (
    <Card variant="outlined">
      <CardHeader
        title={ship.symbol}
        subheader={`${ship.registration.role} (${ship.registration.factionSymbol})`}
      />
      <CardContent>
        <Typography>
          (Fuel: {ship.fuel.current}/{ship.fuel.capacity})
        </Typography>
        <div>
          Cargo: {ship.cargo.units}/{ship.cargo.capacity}
        </div>
        <div>
          <Switch
            checked={ship.nav.status !== "DOCKED"}
            onChange={() =>
              switchDocked(
                { navStatus: ship.nav.status },
                {
                  onError: (error: any) => {
                    toast(error.toString());
                  },
                  onSuccess: (data: any) => {
                    globalQueryClient.invalidateQueries({
                      queryKey: ["get-my-ships"],
                    });
                    toast(
                      `Successfully sent mutation with data ${JSON.stringify(data)}`,
                    );
                  },
                },
              )
            }
          />
          {ship.nav.status} at {ship.nav.route.destination.symbol} (
          {ship.nav.route.destination.x}, {ship.nav.route.destination.y})
        </div>
        <div>
          Navigation:{" "}
          <progress value={computeRemainingCooldownFraction(ship.cooldown)} />
          <Select
            label="Destination"
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
          >
            {navLocations.map((nav) => (
              <MenuItem value={nav.symbol}>
                {nav.symbol} ({nav.x}, {nav.y})
              </MenuItem>
            ))}
          </Select>
          {distanceIndicator}
        </div>
        <div>
          Cooldown:{" "}
          <progress value={computeRemainingCooldownFraction(ship.cooldown)} />{" "}
        </div>
      </CardContent>
      <CardActions>
        <Button
          variant="contained"
          onClick={() => triggerNavigation({ destinationWaypointSymbol: destination })
          }
        >
          Punch It!
        </Button>
        <Button
          disabled={extractionDisabled}
          onClick={async () => {
            triggerExtract();
          }}
        >
          Extract
        </Button>
        <Button onClick={() => fuelShip()}>
          Fill 'er up!
        </Button>
      </CardActions>
    </Card>
  );
}

function ShipList() {
  const { data } = useMyShips();
  const shipList = data?.data || [];
  return (
    <>
      <Typography variant="h2">Ship List!</Typography>
      {shipList.map((ship) => (
        <ShipCard key={ship.symbol} ship={ship} />
      ))}
    </>
  );
}

export default ShipList;
