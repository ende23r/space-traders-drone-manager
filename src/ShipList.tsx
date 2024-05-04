import { useState } from 'react'
import { Button, Card, CardActions, CardContent, CardHeader, MenuItem,  Select, Switch, Typography } from '@mui/material';
import { api, schemas } from './packages/SpaceTradersAPI';
import { globalQueryClient, useHQLocations, useMyShips, useShipNav, useSwitchDockingMutation } from './Api';
import { z } from "zod";
import { toast } from 'react-toastify';
import { useLocalStorage } from './hooks/useLocalStorage';

type Ship = z.infer<typeof schemas.Ship>;

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

  const [bearerToken] = useLocalStorage("bearerToken", "");
  const {data: locationsData} = useHQLocations();
  const navLocations = locationsData || [{symbol: ship.nav.waypointSymbol}];

  const [destination, setDestination] = useState<string>(ship.nav.waypointSymbol)
  const [cooldown, toggleCooldown] = useState(false)

  const {mutate: switchDocked} = useSwitchDockingMutation(ship.symbol);
  
  return (
    <Card variant="outlined">
      <CardHeader title={ship.symbol} subheader={`${ship.registration.role} (${ship.registration.factionSymbol})`} />
      <CardContent>
      <Typography>(Fuel: {ship.fuel.current}/{ship.fuel.capacity})</Typography>
      <div>Cargo: {ship.cargo.units}/{ship.cargo.capacity}</div>
      <div>
        <Switch
          checked={ship.nav.status !== "DOCKED"}
          onChange={() => switchDocked({navStatus: ship.nav.status}, {
                onError: (error: any) => {
                toast(error.toString());
              },
              onSuccess: (data: any) => {
                globalQueryClient.invalidateQueries({queryKey: ["get-my-ships"]});
                toast(`Successfully sent mutation with data ${JSON.stringify(data)}`);
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
  const { data } = useMyShips();
  const shipList = data?.data || [];
  return (
    <>
      <Typography variant="h2">Ship List!</Typography>
      {shipList.map((ship) => <ShipCard key={ship.symbol} ship={ship} />)}
    </>
  );
}

export default ShipList;
