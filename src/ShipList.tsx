import { useState, useContext } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";
import { schemas } from "./packages/SpaceTradersAPI";
import {
  globalQueryClient,
  useExtractMutation,
  useFuelShipMutation,
  useHQLocations,
  useJettisonMutation,
  useMyShips,
  useNavigateMutation,
  useSwitchDockingMutation,
} from "./Api";
import { z } from "zod";
import { toast } from "react-toastify";
import { DateContext } from "./App";
import { ExpandMore } from "@mui/icons-material";

type Ship = z.infer<typeof schemas.Ship>;
type ShipNav = z.infer<typeof schemas.ShipNav>;
type Waypoint = z.infer<typeof schemas.Waypoint>;

function computeDistance(shipNav: ShipNav, destinationNav: Waypoint) {
  const originNav = shipNav.route.destination;
  const distance = Math.sqrt(
    Math.pow(destinationNav.x - originNav.x, 2) +
    Math.pow(destinationNav.y - originNav.y, 2),
  );
  return distance;
}

const validMiningWaypointTypes = [
  "ASTEROID",
  "ASTEROID_FIELD",
  "ENGINEERED_ASTEROID",
];

function TimedProgress(props: {
  startTimestamp: number;
  endTimestamp: number;
}) {
  const { startTimestamp, endTimestamp } = props;
  const date = useContext(DateContext);

  const totalTime = Math.max(endTimestamp - startTimestamp, 1);
  const elapsedTime = Math.max(date.getTime() - startTimestamp, 1);
  const progress = Math.min((elapsedTime / totalTime) * 100, 100);
  return <LinearProgress variant="determinate" value={progress} />;
}

function ExtractButton(props: { ship: Ship }) {
  const { ship } = props;

  const date = useContext(DateContext);
  const { mutate: triggerExtract, data } = useExtractMutation(ship.symbol);

  const inOrbit = ship.nav.status === "IN_ORBIT";
  const validMiningLocation = validMiningWaypointTypes.includes(
    ship.nav.route.destination.type,
  );
  const onCooldown = ship.cooldown.remainingSeconds > 0;
  const extractionDisabled = !inOrbit || !validMiningLocation || onCooldown;
  const disabledTooltip = (
    <div>
      1. In Orbit {checkOrX(inOrbit)}
      <br />
      2. At Asteroid {checkOrX(validMiningLocation)}
      <br />
      3. Not on cooldown {checkOrX(!onCooldown)}
    </div>
  );

  const endTimestamp =
    Date.parse(data?.cooldown.expiration || "") ||
    Date.now() + ship.cooldown.remainingSeconds * 1000;
  const remainingSecs = Math.floor(
    Math.max(endTimestamp - date.getTime(), 0) / 1000,
  );

  return (
    <Tooltip title={disabledTooltip}>
      <Button
        disabled={extractionDisabled}
        onClick={async () => {
          triggerExtract();
        }}
      >
        Extract{" "}
        {ship.cooldown.remainingSeconds > 0 ? `(${remainingSecs} s)` : ""}
      </Button>
    </Tooltip>
  );
}

const checkOrX = (b: boolean) => (b ? "✅" : "❌");

function ShipCard(props: { ship: Ship }) {
  const { ship } = props;

  const { data: locationsData } = useHQLocations();
  const navLocations = locationsData || [];

  const [destination, setDestination] = useState<string>(
    ship.nav.waypointSymbol,
  );

  const { mutate: switchDocked } = useSwitchDockingMutation(ship.symbol);
  const { mutate: triggerNavigation } = useNavigateMutation(ship.symbol);
  const { arrival, departureTime } = ship.nav.route;
  const navProgress = (
    <TimedProgress
      startTimestamp={Date.parse(departureTime)}
      endTimestamp={Date.parse(arrival)}
    />
  );

  const { mutate: fuelShip } = useFuelShipMutation(ship.symbol);
  const { mutate: jettison } = useJettisonMutation(ship.symbol);

  const destinationNav =
    navLocations.find((loc) => loc.symbol === destination) || null;
  const distToDest = destinationNav
    ? computeDistance(ship.nav, destinationNav)
    : -1;
  const distanceIndicator = destinationNav ? (
    <Typography>Distance to Target: {distToDest} units.</Typography>
  ) : null;

  const docked = ship.nav.status === "DOCKED";
  const inOrbit = ship.nav.status === "IN_ORBIT";
  const noNewDest = destination === ship.nav.waypointSymbol;
  const noFuel = distToDest > ship.fuel.current;
  const navigationDisabled = !inOrbit || noNewDest || noFuel;
  const navTooltip = (
    <div>
      Navigation requires 3 things:
      <br />
      1. Ship in orbit {checkOrX(inOrbit)}
      <br />
      2. Destination set {checkOrX(!noNewDest)}
      <br />
      3. 1 unit of fuel per unit of distance {checkOrX(!noFuel)}
    </div>
  );

  const fullFuel = ship.fuel.current === ship.fuel.capacity;
  const fuellingDisabled = !docked || fullFuel;
  const fuellingTooltip = (
    <div>
      1. Ship docked {checkOrX(docked)}
      <br />
      2. Tank not full {checkOrX(!fullFuel)}
    </div>
  );

  const inTransit = ship.nav.status === "IN_TRANSIT";

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
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              Cargo: {ship.cargo.units}/{ship.cargo.capacity}
            </AccordionSummary>
            <AccordionDetails>
              {ship.cargo.inventory.map((item) => (
                <Stack direction="row">
                  <Typography>
                    {item.name}: {item.units}
                  </Typography>
                  <Button
                    onClick={() =>
                      jettison({ cargoSymbol: item.symbol, units: item.units })
                    }
                  >
                    Drop
                  </Button>
                </Stack>
              ))}
            </AccordionDetails>
          </Accordion>
        </div>
        <div>
          <Switch
            disabled={inTransit}
            checked={ship.nav.status !== "DOCKED"}
            onChange={() =>
              switchDocked(
                { navStatus: ship.nav.status },
                {
                  onError: (error: any) => {
                    toast(error.toString());
                  },
                  onSuccess: () => {
                    globalQueryClient.invalidateQueries({
                      queryKey: ["get-my-ships"],
                    });
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
          {navProgress}
          {distanceIndicator}
        </div>
      </CardContent>
      <CardActions>
        <Tooltip title={navTooltip}>
          <span>
            <Button
              variant="contained"
              disabled={navigationDisabled}
              onClick={() =>
                triggerNavigation({ destinationWaypointSymbol: destination })
              }
            >
              Punch It!
            </Button>
          </span>
        </Tooltip>
        <ExtractButton ship={ship} />
        <Tooltip title={fuellingTooltip}>
          <span>
            <Button disabled={fuellingDisabled} onClick={() => fuelShip()}>
              Fill 'er up! (price not available)
            </Button>
          </span>
        </Tooltip>
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
