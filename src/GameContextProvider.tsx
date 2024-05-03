import { Button, TextField } from "@mui/material";
import { useState } from "react"
import { useLocalStorage } from "./hooks/useLocalStorage";
import { api } from "./packages/SpaceTradersAPI";
import { bearerOptions } from "./Api";
import { useQuery } from "@tanstack/react-query";

// API for requests with a BODY: function [alias](body: BodyParam, config?: ZodiosRequestOptions): Promise<Response>;

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

function BearerAuthSetup(props: {defaultAgentSymbol: string}) {
  const { defaultAgentSymbol } = props;
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
        <Button variant="contained" onClick={() => setBearerToken(bearerToken)}>Register Bearer Token</Button>
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
        setBearerToken(token);
        }}>Register New Agent</Button>
    </div>
    </>)
}

function GameContextProvider(props: {  children: any}) {
  const { children } = props;
  const [bearerToken] = useLocalStorage("bearerToken", "");

  const {data: agentData } = useQuery({
    queryKey: [bearerToken, "get-my-agent"],
    queryFn: () => api["get-my-agent"](bearerOptions(bearerToken)),
    enabled: !!bearerToken,
    retry: false
  })  
  /*
  let homeSystem = ""
  if (agentStatus === "success") {
    homeSystem = getSystemSymbol(agentData.data.headquarters);
  }
  */

  return (
  <>
    <BearerAuthSetup defaultAgentSymbol={agentData?.data.symbol || ""} />
    {children}
  </>);
}

export default GameContextProvider;