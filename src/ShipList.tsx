import { useContext, useState } from 'react'
import {ShipsContext }from './ShipsContext'
import { Button, MenuItem, Paper, Select, Switch } from '@mui/material';
import { BearerTokenContext } from './BearerTokenContext';
import { NavigationContext } from './NavigationContext';

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

function triggerNavigation(bearerToken: string, shipSymbol: string, destinationWaypoint: string) {
  return -1;
}

function ShipCard(props: {ship: any}) {
  const {ship} = props;

  const bearerToken = useContext(BearerTokenContext);
  const navLocations = useContext(NavigationContext);

  const [destination, setDestination] = useState<string>(ship.nav.waypointSymbol)
  
  console.log(ship);
  return (
    <Paper>
      <div>{ship.symbol} (Fuel: {ship.fuel.current}/{ship.fuel.capacity})</div>
      <div>{ship.registration.role} ({ship.registration.factionSymbol})</div>
      <div>Cargo: {ship.cargo.units}/{ship.cargo.capacity}</div>
      <div>
        <Switch
          defaultChecked={ship.nav.status !== "DOCKED"}
          onChange={() => switchDockedStatus(ship.symbol, ship.nav.status, bearerToken )}
        />
        {ship.nav.status} at {ship.nav.waypointSymbol}
      </div>
      <div>
        Navigation: <progress value={computeRemainingCooldownFraction(ship.cooldown)} />
        <Select label="Destination" value={destination} onChange={(event) => setDestination(event.target.value)}>
          {navLocations.map((str) => <MenuItem value={str}>{str}</MenuItem>)}
          <MenuItem value={ship.nav.waypointSymbol}>{ship.nav.waypointSymbol}</MenuItem>)
        </Select>
        <Button variant="contained" onClick={() => triggerNavigation(bearerToken, ship.symbol, destination)}>Punch it!</Button>
      </div>
      <div>Cooldown: <progress value={computeRemainingCooldownFraction(ship.cooldown)} /> </div>
    </Paper>
  )
}

function ShipList() {
  const shipList = useContext(ShipsContext);
  return (
    <>
      <p>Ship List!</p>
      {shipList.map((ship) => <ShipCard key={ship.symbol} ship={ship} />)}
    </>
  );
}

export default ShipList;
