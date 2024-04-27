import { useState, useRef  } from 'react'
// import  Box  from '@mui/material/Box';
import  Button  from '@mui/material/Button'
import TextField from '@mui/material/TextField'
// import Grid from '@mui/material/Grid'; // Grid version 1
import Grid from '@mui/material/Unstable_Grid2'; // Grid version 2

async function checkBearerToken(token: string) {
  const options = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  const response = await fetch("https://api.spacetraders.io/v2/my/agent", options);
  const responseData = await response.json();
  console.log(responseData);
  return response.ok;
}

async function updateShipInfo(token: string) {
  const options = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  const response = await fetch("https://api.spacetraders.io/v2/my/ships", options);
  const responseData = await response.json();
  console.log(responseData);
  return response.ok;
}

function App() {
  const [bearerToken, registerBearerToken] = useState("")
  const textRef = useRef({value: ""});

  const submit = async () => {
    const currentToken = textRef.current.value;
    if(await checkBearerToken(currentToken)) {
      registerBearerToken(currentToken);
    }
  }

  return (
    <>
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
              Ship List
              <Button variant="contained" onClick={() => updateShipInfo(bearerToken)}>Update Ship Info</Button>
            </p>
            <div>

            </div>
          </Grid>
          <Grid xs={6}>Details and Actions</Grid>
        </Grid>
      </div>
    </>
  )
}

export default App
