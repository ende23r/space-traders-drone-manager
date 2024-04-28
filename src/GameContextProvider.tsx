import { Button, TextField } from "@mui/material";
import { createContext, useCallback, useRef, useState } from "react"

export const BearerTokenContext = createContext("");
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

function GameContextProvider(props: {children: any}) {
  const {children} = props;
  const [bearerToken, registerBearerToken] = useState("")
  const [homeSystem, setHomeSystem] = useState("")
  const [shipList, setShipList] = useState<any[]>([])
  const [waypointList, setWaypointList] = useState<any[]>([])

  const textRef = useRef({value: ""});

  const tryRegisterBearerToken = async () => {
    const currentToken = textRef.current.value;
    const userData = await checkBearerToken(currentToken);
    const [sector, system] = userData.data.headquarters.split("-");
    setHomeSystem(`${sector}-${system}`)
    registerBearerToken(currentToken);
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
    <div>
      <TextField
        id="outlined-multiline-static"
        label="Bearer Token"
        multiline
        rows={4}
        inputRef={textRef}
      />
        <Button variant="contained" onClick={tryRegisterBearerToken}>Register Bearer Token</Button>
    </div>
    <BearerTokenContext.Provider value={bearerToken}>
    <NavigationContext.Provider value={waypointList}>
    <NavigationDispatchContext.Provider value={pollNavigation}>
    <ShipContext.Provider value={shipList}>
    <ShipDispatchContext.Provider value={pollShips}>
        {children}
    </ShipDispatchContext.Provider>
    </ShipContext.Provider>
    </NavigationDispatchContext.Provider>
    </NavigationContext.Provider>
    </BearerTokenContext.Provider>
  </>);
}

export default GameContextProvider;