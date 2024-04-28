import { useState, useRef  } from 'react'
// import  Box  from '@mui/material/Box';
import  Button  from '@mui/material/Button'
import TextField from '@mui/material/TextField'
// import Grid from '@mui/material/Grid'; // Grid version 1
import Grid from '@mui/material/Unstable_Grid2'; // Grid version 2

import { BearerTokenContext } from './BearerTokenContext';
import { ShipsContext } from './ShipsContext';
import { NavigationContext } from './NavigationContext';
import ShipList from './ShipList';

async function checkBearerToken(token: string) {
  const options = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  const response = await fetch("https://api.spacetraders.io/v2/my/agent", options);
  if (!response.ok) {
    return false;
  }
  // Update ship and nav info
  return true;
}

async function updateShipInfo(token: string, updateShipCallback: any) {
  const options = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  const response = await fetch("https://api.spacetraders.io/v2/my/ships", options);
  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }
  return updateShipCallback((await response.json()).data);
}

function App() {
  const [bearerToken, registerBearerToken] = useState("")
  const [shipList, setShipList] = useState<any[]>([])
  const textRef = useRef({value: ""});

  const submit = async () => {
    const currentToken = textRef.current.value;
    if(await checkBearerToken(currentToken)) {
      registerBearerToken(currentToken);
    }
  }

  return (
    <BearerTokenContext.Provider value={bearerToken}>
    <NavigationContext.Provider value={["XXX"]}>
    <ShipsContext.Provider value={shipList}>
      <div>
<TextField
          id="outlined-multiline-static"
          label="Bearer Token"
          multiline
          rows={4}
          inputRef={textRef}
        />
        <Button variant="contained" onClick={submit}>Register Bearer Token</Button>
</div>
      <div>
        <Grid container spacing={1}>
          <Grid xs={6}>
            <p>
              <Button variant="contained" onClick={() => {
                updateShipInfo(bearerToken, setShipList)
              }}>
                Update Ship Info
              </Button>
            </p>
            <div>
              <ShipList />
            </div>
          </Grid>
          <Grid xs={6}>Details and Actions</Grid>
        </Grid>
      </div>
    </ShipsContext.Provider>
    </NavigationContext.Provider>
    </BearerTokenContext.Provider>
  )
}

export default App
