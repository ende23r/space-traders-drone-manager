import { z } from "zod";
import { Button, TextField } from "@mui/material";
import { SetStateAction, createContext, useCallback, useContext,   useState } from "react"
import { useLocalStorage } from "./hooks/useLocalStorage";
import { api, schemas } from "./packages/SpaceTradersAPI";
import { bearerOptions, useMyAgent } from "./Api";
import { getSystemSymbol } from "./Util";
import { useQuery } from "@tanstack/react-query";

type Contract = z.infer<typeof schemas.Contract>;

export const BearerTokenContext = createContext("");
export const BearerTokenDispatchContext = createContext<any>((s: string) => { return s; });
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

function BearerAuthSetup(props: {defaultAgentSymbol: string}) {
  const { defaultAgentSymbol } = props;
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
        value={agentSymbol || defaultAgentSymbol}
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
function GameContextProvider(props: {  children: any}) {
  const { children} = props;
  const [bearerToken, setBearerToken] = useState("")
  // const [contract, setContract] = useState<Contract>()
  // const [shipList, setShipList] = useState<any[]>([])
  // const [waypointList, setWaypointList] = useState<any[]>([])

  const {data: agentData} = useQuery({
    queryKey: ["get-my-agent", bearerToken],
    queryFn: () => api["get-my-agent"](bearerOptions(bearerToken)),
    enabled: !!bearerToken,
    retry: false
  })  
  /*
  let homeSystem = ""
  if (status === "success") {
    homeSystem = getSystemSymbol(agentData);
  }
  */

  return (
  <>
    <BearerTokenContext.Provider value={bearerToken}>
    <BearerTokenDispatchContext.Provider value={setBearerToken}>
{/*    <ContractContext.Provider value={contract}>
    <NavigationContext.Provider value={waypointList}>
    <ShipContext.Provider value={shipList}>
*/}        <BearerAuthSetup defaultAgentSymbol={agentData?.data.symbol || ""} />
        {/*children*/}
{/*    </ShipContext.Provider>
    </NavigationContext.Provider>
    </ContractContext.Provider>
*/}    </BearerTokenDispatchContext.Provider>
    </BearerTokenContext.Provider>
  </>);
}

export default GameContextProvider;