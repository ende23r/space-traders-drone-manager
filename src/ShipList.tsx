import { useContext, useState } from 'react'
import { Button, Card, CardActions, CardContent, CardHeader, MenuItem,  Select, Switch, Typography } from '@mui/material';
import { BearerTokenContext, NavigationContext, ShipContext } from './GameContextProvider';
import { api } from './packages/SpaceTradersAPI';

async function switchDockedStatus(shipSymbol: string, status: string, token: string) {
  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  let url = `https://api.spacetraders.io/v2/my/ships/${shipSymbol}`
  if (status === "DOCKED") {
    url += "/orbit"
  } else {
    url += "/dock"
  }
  
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }
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

function ShipCard(props: {ship: any}) {
  const {ship} = props;

  const bearerToken = useContext(BearerTokenContext);
  const navLocations = useContext(NavigationContext);

  const [destination, setDestination] = useState<string>(ship.nav.waypointSymbol)
  const [cooldown, toggleCooldown] = useState(false)
  
  return (
    <Card variant="outlined">
      <CardHeader title={ship.symbol} subheader={`${ship.registration.role} (${ship.registration.factionSymbol})`} />
      <CardContent>
      <Typography>(Fuel: {ship.fuel.current}/{ship.fuel.capacity})</Typography>
      <div>Cargo: {ship.cargo.units}/{ship.cargo.capacity}</div>
      <div>
        <Switch
          defaultChecked={ship.nav.status !== "DOCKED"}
          onChange={() => switchDockedStatus(ship.symbol, ship.nav.status, bearerToken )}
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
