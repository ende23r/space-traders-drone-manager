import { useContext, useState } from 'react'
import { Button, Card, CardActions, CardContent, CardHeader, MenuItem,  Select, Switch, Typography } from '@mui/material';
import { BearerTokenContext, NavigationContext, ShipContext } from './GameContextProvider';
import { api, schemas } from './packages/SpaceTradersAPI';
import { bearerPostOptions } from './Api';
import { useMutation } from '@tanstack/react-query';
import { z } from "zod";
import { toast } from 'react-toastify';

type Ship = z.infer<typeof schemas.Ship>;
type ShipNavStatus = z.infer<typeof schemas.ShipNavStatus>;

async function switchDockedStatus(bearerToken: string, shipSymbol: string, status: ShipNavStatus) {
  const method = status === "DOCKED" ? "orbit-ship" : "dock-ship";

  const options = {
    headers: bearerPostOptions(bearerToken).headers,
    params: {
       shipSymbol
    }
  }
  const response = await api[method](/*body=*/undefined, options);
  return response.data;
}

function computeRemainingCooldownFraction(cooldown: any) {
  return (cooldown.totalSeconds - cooldown.remainingSeconds + 0.01) / (cooldown.totalSeconds + 0.01);
}

async function triggerNavigation(bearerToken: string, shipSymbol: string, destinationWaypoint: string) {
  const body = {waypointSymbol: destinationWaypoint}
  const options = {
    headers: {
      Authorization: `Bearer ${bearerToken}`
    },
    params: {
      shipSymbol
    }
  };
  const response = await api["navigate-ship"](body, options);
  return response.data;
}

async function extract(bearerToken: string, shipSymbol: string) {
  const options = {
    headers: {
      Authorization: `Bearer ${bearerToken}`
    },
    params: {
      shipSymbol
    }
  }
  const response = await api["extract-resources"]({}, options);
  return response.data;
}

async function fuelShip(bearerToken: string, shipSymbol: string) {
  const options = {
    headers: {
      Authorization: `Bearer ${bearerToken}`
    },
    params: {
      shipSymbol
    }
  }
  const response = await api["refuel-ship"]({}, options);
  return response.data;
}

function ShipCard(props: {ship: Ship}) {
  const {ship} = props;

  const bearerToken = useContext(BearerTokenContext);
  const navLocations = useContext(NavigationContext);

  const [destination, setDestination] = useState<string>(ship.nav.waypointSymbol)
  const [cooldown, toggleCooldown] = useState(false)

  const {data: _dockingData, mutate: triggerSwitchDockedStatus} = useMutation({
    mutationKey: [bearerToken, "switch-docked", ship.symbol, ship.nav.status],
    mutationFn: ({shipSymbol, navStatus}: any) => switchDockedStatus(bearerToken, shipSymbol, navStatus),
  })
  
  return (
    <Card variant="outlined">
      <CardHeader title={ship.symbol} subheader={`${ship.registration.role} (${ship.registration.factionSymbol})`} />
      <CardContent>
      <Typography>(Fuel: {ship.fuel.current}/{ship.fuel.capacity})</Typography>
      <div>Cargo: {ship.cargo.units}/{ship.cargo.capacity}</div>
      <div>
        <Switch
          value={ship.nav.status !== "DOCKED"}
          onChange={() => triggerSwitchDockedStatus({shipSymbol: ship.symbol, shipNavStatus: ship.nav.status}, {
                onError: (error) => {
                toast(error.toString());
              },
              onSuccess: (data) => {
                toast(`Successfully fetched query for data ${JSON.stringify(data)}`);
              }}
          )}
        />
        {ship.nav.status} at {ship.nav.route.destination.symbol} ({ship.nav.route.destination.x}, {ship.nav.route.destination.y})
      </div>
      <div>
        Navigation: <progress value={computeRemainingCooldownFraction(ship.cooldown)} />
        <Select label="Destination" value={destination} onChange={(event) => setDestination(event.target.value)}>
          {navLocations.map((nav) => <MenuItem value={nav.symbol}>{nav.symbol}</MenuItem>)}
        </Select>
      </div>
      <div>Cooldown: <progress value={computeRemainingCooldownFraction(ship.cooldown)} /> </div>
      </CardContent>
      <CardActions>
        <Button variant="contained" onClick={() => triggerNavigation(bearerToken, ship.symbol, destination)}>
          Punch It!
        </Button>
        <Button
          disabled={cooldown}
          onClick={async () => {
            const data = await extract(bearerToken, ship.symbol)
            toggleCooldown(true);
            setTimeout(() => toggleCooldown(false), data.cooldown.totalSeconds * 1000)
          }}>
          Extract
        </Button>
        <Button onClick={() => fuelShip(bearerToken, ship.symbol)}>
          Fill 'er up!
        </Button>
      </CardActions>
    </Card>
  )
}

function ShipList() {
  const shipList = useContext(ShipContext);
  return (
    <>
      <Typography variant="h2">Ship List!</Typography>
      {shipList.map((ship) => <ShipCard key={ship.symbol} ship={ship} />)}
    </>
  );
}

export default ShipList;
