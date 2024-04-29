import { z } from "zod";
import { Button, TextField } from "@mui/material";
import { createContext, useCallback, useContext,   useState } from "react"
import { useLocalStorage } from "./hooks/useLocalStorage";
import { api, schemas } from "./packages/SpaceTradersAPI";

type Contract = z.infer<typeof schemas.Contract>;

export const BearerTokenContext = createContext("");
export const BearerTokenDispatchContext = createContext(async (_: string) => {});
export const ContractContext = createContext({} as any);
export const NavigationContext = createContext<any[]>([]);
export const NavigationDispatchContext = createContext((_: string | undefined) => {});
export const ShipContext = createContext<any[]>([]);
export const ShipDispatchContext = createContext((_: string) => {});

// API for requests with a BODY: function [alias](body: BodyParam, config?: ZodiosRequestOptions): Promise<Response>;
async function checkBearerToken(token: string) {
  const options = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  const response = await api["get-my-agent"](options);
  return response.data;
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
  console.log(response);
  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }
  return await response.json();
}

async function getContracts(bearerToken: string) {
  const options = {
    headers: {
      Authorization: `Bearer ${bearerToken}`
    }
  };
  const response = await api["get-contracts"](options);
  return response.data[0];
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

async function queryNavigationInfo(system: string) {
  const response = await api["get-system-waypoints"]({params: {systemSymbol: system}});
  const {total, limit} = response.meta;
  if (total <= limit) {
    return response.data;
  }

  const waypoints = response.data;
  let page = 2;
  while (waypoints.length < total) {
    const pageResponse = await api["get-system-waypoints"]({params: {systemSymbol: system}, queries: {page}});
    waypoints.push(...pageResponse.data);
    page += 1;
  }
  return waypoints;
}

function BearerAuthSetup() {
  const registerBearerToken = useContext(BearerTokenDispatchContext);
  const [bearerToken, setBearerToken] = useLocalStorage("bearerToken", "");
  const [agentSymbol, setAgentSymbol] = useState("");
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
          const data = await generateBearerToken(agentSymbol);
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
  const [contract, setContract] = useState<Contract>()
  const [shipList, setShipList] = useState<any[]>([])
  const [waypointList, setWaypointList] = useState<any[]>([])


  const tryRegisterBearerToken = async (token: string) => {
    const userData = await checkBearerToken(token);
    const [sector, system] = userData.headquarters.split("-");
    const homeSystem = `${sector}-${system}`;
        setHomeSystem(homeSystem)
    registerBearerToken(token);
    await pollContract(token);
    await pollNavigation(homeSystem);
    await pollShips(token);
  }

  const pollContract = useCallback(async(token: string) => {
    const data = await getContracts(token);
    setContract(data);
  }, [bearerToken, setContract]);

  const pollShips = useCallback(async(token: string) => {
    const data = await queryShipInfo(token);
    setShipList(data);
  }, [bearerToken, setShipList]);

  const pollNavigation = useCallback(async(newHomeSystem: string | undefined) => {
    const data = await queryNavigationInfo(newHomeSystem || homeSystem);
    setWaypointList(data);
  }, [bearerToken, setWaypointList]);

  return (
  <>
    <BearerTokenContext.Provider value={bearerToken}>
    <BearerTokenDispatchContext.Provider value={tryRegisterBearerToken}>
    <ContractContext.Provider value={contract}>
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
    </ContractContext.Provider>
    </BearerTokenDispatchContext.Provider>
    </BearerTokenContext.Provider>
  </>);
}

export default GameContextProvider;