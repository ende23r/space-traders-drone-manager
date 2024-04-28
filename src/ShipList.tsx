import { useContext } from 'react'
import {ShipsContext }from './ShipsContext'
import { Paper, Switch } from '@mui/material';
import { BearerTokenContext } from './BearerTokenContext';

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

function ShipCard(props: {ship: any}) {
  const bearerToken = useContext(BearerTokenContext);
  const {ship} = props;
  return (
    <Paper>
      <div>{ship.symbol} (Fuel: {ship.fuel.current}/{ship.fuel.capacity})</div>
      <div>{ship.registration.role} ({ship.registration.factionSymbol})</div>
      <div>
        <Switch
          defaultChecked={ship.nav.status !== "DOCKED"}
          onChange={() => switchDockedStatus(ship.symbol, ship.nav.status, bearerToken )}
        />
        {ship.nav.status} at {ship.nav.waypointSymbol}
      </div>
    </Paper>
  )
}

function ShipList() {
  const shipList = useContext(ShipsContext);
  return (
    <>
      <p>Ship List!</p>
      {shipList.map((ship) => <ShipCard ship={ship} />)}
    </>
  );
}

export default ShipList;
