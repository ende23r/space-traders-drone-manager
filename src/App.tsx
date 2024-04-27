import { useState, useRef  } from 'react'
import  Button  from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import './App.css'

async function checkBearerToken(token:string) {
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


function App() {
  const [_bearerToken, registerBearerToken] = useState("")
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
        {/*<!-- TODO: basic actions -->*/}
      </div>
    </>
  )
}

export default App
