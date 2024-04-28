import { Button, TextField } from "@mui/material";
import { createContext, useCallback, useContext, useRef, useState } from "react"

export const BearerTokenContext = createContext("");
export const BearerTokenDispatchContext = createContext(async (_: string) => {});
export const NavigationContext = createContext<any[]>([]);
export const NavigationDispatchContext = createContext(() => {});
export const ShipContext = createContext<any[]>([]);
export const ShipDispatchContext = createContext(() => {});

async function checkBearerToken(token: string) {
  const options = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  const response = await fetch("https://api.spacetraders.io/v2/my/agent", options);
  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }
  return await response.json();
}

async function generateBearerToken(playerSymbol: string) {
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "symbol": playerSymbol,
      "faction": "COSMIC"
    })
  };
  const response = await fetch("https://api.spacetraders.io/v2/register", options);
  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }
  return await response.json();
}

async function queryShipInfo(token: string) {
  const options = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  const response = await fetch("https://api.spacetraders.io/v2/my/ships", options);
  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }
  return (await response.json()).data;
}

async function queryNavigationInfo(token: string, system: string) {
  const options = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  const response = await fetch(`https://api.spacetraders.io/v2/systems/${system}/waypoints`, options);
  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }
  return (await response.json()).data;
}

function BearerAuthSetup() {
  const registerBearerToken = useContext(BearerTokenDispatchContext);
  const [bearerToken, setBearerToken] = useState("");
  const [agentSymbol, setAgentSymbol] = useState("");
  const symbolTextRef = useRef({value: ""});
    return (<><div>
      <TextField
        id="outlined-multiline-static"
        label="Bearer Token"
        multiline
        rows={4}
        value={bearerToken}
        onChange={(e) => setBearerToken(e.target.value)}
      />
        <Button variant="contained" onClick={() => registerBearerToken(bearerToken)}>Register Bearer Token</Button>
    </div>
    <div>
      <TextField
        id="outlined-static"
        label="Agent Symbol (username)"
        value={agentSymbol}
        onChange={(e) => {setAgentSymbol(e.target.value)}}
      />
        <Button variant="contained" onClick={async () => {
          const data = await generateBearerToken(symbolTextRef.current.value);
        console.log({data});
        const { token } = data.data;
          await registerBearerToken(token);
        setBearerToken(token);
        }}>Register New Agent</Button>
    </div>
    </>)
}
function GameContextProvider(props: {children: any}) {
  const {children} = props;
  const [bearerToken, registerBearerToken] = useState("")
  const [homeSystem, setHomeSystem] = useState("")
  const [shipList, setShipList] = useState<any[]>([])
  const [waypointList, setWaypointList] = useState<any[]>([])


  const tryRegisterBearerToken = async (token: string) => {
    const userData = await checkBearerToken(token);
    const [sector, system] = userData.data.headquarters.split("-");
    setHomeSystem(`${sector}-${system}`)
    registerBearerToken(token);
    pollNavigation();
    pollShips();
  }

  const pollShips = useCallback(async() => {
    const data = await queryShipInfo(bearerToken);
    setShipList(data);
  }, [bearerToken, setShipList]);

  const pollNavigation = useCallback(async() => {
    const data = await queryNavigationInfo(bearerToken, homeSystem);
    console.log({navData: data})
    setWaypointList(data);
  }, [bearerToken, setWaypointList]);

  return (
  <>
    <BearerTokenContext.Provider value={bearerToken}>
    <BearerTokenDispatchContext.Provider value={tryRegisterBearerToken}>
    <NavigationContext.Provider value={waypointList}>
    <NavigationDispatchContext.Provider value={pollNavigation}>
    <ShipContext.Provider value={shipList}>
    <ShipDispatchContext.Provider value={pollShips}>
                  <BearerAuthSetup />
        {children}
    </ShipDispatchContext.Provider>
    </ShipContext.Provider>
    </NavigationDispatchContext.Provider>
    </NavigationContext.Provider>
    </BearerTokenDispatchContext.Provider>
    </BearerTokenContext.Provider>
  </>);
}

export default GameContextProvider;