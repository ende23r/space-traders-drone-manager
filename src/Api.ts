// Naive API methods look like this:
/*
async function checkBearerToken(token: string) {
  const options = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  const response = await api["get-my-agent"](options);
  return response.data;
}
*/
// API for requests with a BODY: function [alias](body: BodyParam, config?: ZodiosRequestOptions): Promise<Response>;

// We want to guarantee the following for every new API method:
// 1. It has access to the bearer token (provided by Bearer context)
//   a. It should not run until it has access to the bearer token
//   b. Exception: the method for signing up for a new user should run to get us the bearer token in the first place
// 2. It provides some information about whether it is loading or not
// 3. We should be able to retrigger when appropriate
//   a. Sometimes we want new data even when no "key" has changed. For example, after we sell to a marketplace, we want to see updated prices.
// 4. It should be able to write this data to frontend state.
//   a. Ideally to a shared Context
//   b. Ideally through a Reducer
// 5. [the data it produces] should be ~globally accessible
//   a. It's fine if it uses widely shared state, like the bearer token
//   b. It needs to be a hook!
//   c. We need some kind of interface that encapsulates the storage and the API calls together.
// 6. It should not cause performance issues as we scale
//   a. If we call a useState hook in multiple components... do we cause the state to be saved in multiple places?
//   b. If we don't want to do that, where do we store our data?
//
// Conclusion: I think I want a "transparent" data layer
// Where you can call a function like useShipInfo
// And it returns one of:
// 1. A loading state, indicating that it's loading that data
// 2. The fresh data, after it's done loading
// 3. Cached data, fetched at some point in the past
// Such that 2 and 3 are identical to the caller
// Does react-query help with this?
// It automatically caches queries by key
// Cacheable:
// - symbols
// - nav locations
// - nav traits
// - contract
import {
  useQuery,
  QueryCache,
  QueryClient,
  useMutation,
} from "@tanstack/react-query";
import { toast } from "react-toastify";
import { z } from "zod";
import { api, schemas } from "./packages/SpaceTradersAPI";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { getSystemSymbol } from "./Util";
import { scheduleUpdate } from "./Scheduler";
import { handleAxiosError } from "./AxiosErrorHandling";

export type Agent = z.infer<typeof schemas.Agent>;
export type Ship = z.infer<typeof schemas.Ship>;
// type Meta = z.infer<typeof schemas.Meta>;
// type Waypoint = z.infer<typeof schemas.Waypoint>;
export type TradeSymbol = z.infer<typeof schemas.TradeSymbol>;
export type ShipNavFlightMode = z.infer<typeof schemas.ShipNavFlightMode>;

const noDataAgent: Agent = {
  symbol: "",
  headquarters: "",
  credits: 0,
  startingFaction: "",
  shipCount: 0,
};

/*
const _noDataMeta: Meta = {
  total: 0,
  page: 1,
  limit: 10,
};
*/

export function useBearerToken() {
  return useLocalStorage("bearerToken", "");
}

export const bearerOptions = (token: string) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
export const bearerHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

export const bearerPostOptions = (token: string) => {
  const options = bearerOptions(token);
  return {
    headers: {
      method: "POST",
      ...options.headers,
    },
  };
};

export const bearerPostHeaders = (token: string) => {
  const headers = bearerHeaders(token);
  return {
    method: "POST",
    ...headers,
  };
};

export const bearerPatchHeaders = (token: string) => {
  const headers = bearerHeaders(token);
  return {
    method: "PATCH",
    ...headers,
  };
};

export function useServerStatus() {
  return useQuery({
    queryKey: ["get-status"],
    queryFn: () => api["get-status"](),
  });
}

/**
 * We only want to re-fetch this function when:
 * 1. The player buys a ship
 * 2. The player spends or earns money
 */
export function useMyAgent() {
  const [bearerToken] = useLocalStorage("bearerToken", "");
  const { data, ...metadata } = useQuery({
    queryKey: ["get-my-agent"],
    queryFn: () => api["get-my-agent"](bearerOptions(bearerToken)),
    enabled: !!bearerToken,
    retry: false,
    // Make this function never re-fetch
    staleTime: Infinity,
  });
  return { agent: data?.data || noDataAgent, bearerToken, ...metadata };
}

export function useContracts() {
  const [bearerToken] = useLocalStorage("bearerToken", "");
  return useQuery({
    queryKey: ["get-contracts"],
    queryFn: () => api["get-contracts"](bearerOptions(bearerToken)),
    enabled: !!bearerToken,
    retry: false,
    // Make this function never re-fetch
    staleTime: Infinity,
  });
}

/**
 * Only want to refetch this function when:
 * 1. The player buys a new ship
 * 2. The player triggers a change in ship state
 * 3. A scheduled ship update has likely happened (e.g. ship reached destination, cooldown done)
 */
async function queryMyShips(bearerToken: string) {
  const options = {
    headers: bearerHeaders(bearerToken),
    queries: {
      page: 1,
      limit: 20,
    },
  };
  const firstResult = await api["get-my-ships"](options);
  const ships = firstResult.data;
  while (ships.length < firstResult.meta.total) {
    options.queries.page += 1;
    const nextResult = await api["get-my-ships"](options);
    ships.push(...nextResult.data);
  }
  return ships;
}

export function useMyShips() {
  const [bearerToken] = useLocalStorage("bearerToken", "");
  return useQuery({
    queryKey: ["get-my-ships"],
    queryFn: () => queryMyShips(bearerToken),
    enabled: !!bearerToken,
    retry: false,
    // Make this function never re-fetch
    staleTime: Infinity,
  });
}

async function queryNavigationInfo(system: string) {
  if (!system) {
    return [];
  }
  const response = await api["get-system-waypoints"]({
    params: { systemSymbol: system },
  });
  const { total, limit } = response.meta;
  if (total <= limit) {
    return response.data;
  }

  const waypoints = response.data;
  let page = 2;
  while (waypoints.length < total) {
    const pageResponse = await api["get-system-waypoints"]({
      params: { systemSymbol: system },
      queries: { page },
    });
    waypoints.push(...pageResponse.data);
    page += 1;
  }
  return waypoints.sort((a, b) => a.symbol.localeCompare(b.symbol));
}

export function useLocations(systemSymbol: string) {
  return useQuery({
    queryKey: ["get-system-waypoints", systemSymbol],
    queryFn: () => queryNavigationInfo(systemSymbol),
    enabled: !!systemSymbol,
    retry: false,
    // Make this function never re-fetch
    staleTime: Infinity,
  });
}

export function useHQLocations() {
  const { agent } = useMyAgent();
  const systemSymbol = getSystemSymbol(agent.headquarters);
  return useQuery({
    queryKey: ["get-locations", systemSymbol],
    queryFn: () => queryNavigationInfo(systemSymbol),
    enabled: !!systemSymbol,
    retry: false,
  });
}

export function useShipNav(shipSymbol: string) {
  const [bearerToken] = useLocalStorage("bearerToken", "");
  const options = {
    headers: bearerHeaders(bearerToken),
    params: { shipSymbol },
  };
  return useQuery({
    queryKey: ["get-ship-nav", shipSymbol],
    queryFn: () => api["get-ship-nav"](options),
    enabled: !!bearerToken,
    retry: false,
  });
}

type ShipNavStatus = z.infer<typeof schemas.ShipNavStatus>;

async function switchDockedStatus(
  bearerToken: string,
  shipSymbol: string,
  status: ShipNavStatus,
) {
  const method = status === "DOCKED" ? "orbit-ship" : "dock-ship";

  const options = {
    headers: bearerPostOptions(bearerToken).headers,
    params: {
      shipSymbol,
    },
  };
  const response = await api[method](/*body=*/ undefined, options);
  return response.data;
}

export function useSwitchDockingMutation(shipSymbol: string) {
  const [bearerToken] = useLocalStorage("bearerToken", "");
  return useMutation({
    mutationKey: ["switch-docked", shipSymbol],
    mutationFn: ({ navStatus }: any) =>
      switchDockedStatus(bearerToken, shipSymbol, navStatus),
    onError: handleAxiosError,
  });
}

async function acceptContract(bearerToken: string, contractId: string) {
  const options = {
    headers: bearerPostHeaders(bearerToken),
    params: {
      contractId,
    },
  };
  const result = await api["accept-contract"](undefined, options);
  globalQueryClient.invalidateQueries({ queryKey: ["get-contracts"] });
  return result;
}

export function useAcceptContractMutation(contractId: string) {
  const [bearerToken] = useLocalStorage("bearerToken", "");
  return useMutation({
    mutationKey: ["accept-contract"],
    mutationFn: () => acceptContract(bearerToken, contractId),
    onSuccess: (response) => {
      toast(`Received $${response.data.contract.terms.payment.onAccepted}`);
    },
    onError: handleAxiosError,
  });
}

async function negotiateContract(bearerToken: string, shipSymbol: string) {
  const options = {
    headers: bearerPostHeaders(bearerToken),
    params: { shipSymbol },
  };
  const result = await api["negotiateContract"](undefined, options);
  globalQueryClient.invalidateQueries({ queryKey: ["get-contracts"] });
  return result;
}

export function useNegotiateContractMutation() {
  const [bearerToken] = useLocalStorage("bearerToken", "");
  return useMutation({
    mutationKey: ["negotiateContract"],
    mutationFn: ({ shipSymbol }: { shipSymbol: string }) =>
      negotiateContract(bearerToken, shipSymbol),
    onError: handleAxiosError,
  });
}
// Other contract functions:
// Deliver, fulfill

/* Shipyards
  useEffect(() => {
    const queryShipyard = async() => {
      const response = await api["get-shipyard"]({params: {systemSymbol: getSystemSymbol(shipyardSelected), waypointSymbol: shipyardSelected},
        headers: {
          Authorization: `Bearer ${bearerToken}`
        }
      });
      setShipyardData(response.data);
    }
    if (shipyardSelected) {
      queryShipyard()
    }
  }, [shipyardSelected])
*/

async function triggerNavigation(
  bearerToken: string,
  shipSymbol: string,
  waypointSymbol: string,
) {
  const body = { waypointSymbol };
  const options = {
    headers: bearerPostHeaders(bearerToken),
    params: {
      shipSymbol,
    },
  };
  const response = await api["navigate-ship"](body, options);
  globalQueryClient.invalidateQueries({ queryKey: ["get-my-ships"] });
  scheduleUpdate({
    callback: () => {
      globalQueryClient.invalidateQueries({ queryKey: ["get-my-ships"] });
      globalQueryClient.invalidateQueries({
        queryKey: ["get-shipyard", waypointSymbol],
      });
    },
    scheduledTime: new Date(response.data.nav.route.arrival),
  });
  return response.data;
}
export function useNavigateMutation(shipSymbol: string) {
  const [bearerToken] = useLocalStorage("bearerToken", "");
  return useMutation({
    mutationKey: ["navigate-ship", shipSymbol],
    mutationFn: ({
      destinationWaypointSymbol,
    }: {
      destinationWaypointSymbol: string;
    }) => triggerNavigation(bearerToken, shipSymbol, destinationWaypointSymbol),
    onError: handleAxiosError,
  });
}

async function triggerExtract(bearerToken: string, shipSymbol: string) {
  const options = {
    headers: bearerPostHeaders(bearerToken),
    params: {
      shipSymbol,
    },
  };
  const response = await api["extract-resources"]({}, options);
  globalQueryClient.invalidateQueries({ queryKey: ["get-my-ships"] });
  scheduleUpdate({
    callback: () =>
      globalQueryClient.invalidateQueries({ queryKey: ["get-my-ships"] }),
    scheduledTime: new Date(response.data.cooldown.expiration || ""),
  });
  return response.data;
}

export function useExtractMutation(shipSymbol: string) {
  const [bearerToken] = useLocalStorage("bearerToken", "");
  return useMutation({
    mutationKey: ["extract-resources", shipSymbol],
    mutationFn: () => triggerExtract(bearerToken, shipSymbol),
    onSuccess: (data) => {
      toast(`Extracted ${JSON.stringify(data.extraction.yield)}.`);
    },
    onError: handleAxiosError,
  });
}

async function fuelShip(bearerToken: string, shipSymbol: string) {
  const options = {
    headers: bearerPostHeaders(bearerToken),
    params: {
      shipSymbol,
    },
  };
  const response = await api["refuel-ship"]({}, options);
  globalQueryClient.invalidateQueries({ queryKey: ["get-my-ships"] });
  return response.data;
}

export function useFuelShipMutation(shipSymbol: string) {
  const [bearerToken] = useLocalStorage("bearerToken", "");
  return useMutation({
    mutationKey: ["refuel-ship", shipSymbol],
    mutationFn: () => fuelShip(bearerToken, shipSymbol),
    onError: handleAxiosError,
  });
}

async function jettisonCargo(
  bearerToken: string,
  shipSymbol: string,
  cargoSymbol: TradeSymbol,
  units: number,
) {
  const options = {
    headers: bearerPostHeaders(bearerToken),
    params: {
      shipSymbol,
    },
  };
  const body = {
    symbol: cargoSymbol,
    units,
  };
  const response = await api["jettison"](body, options);
  globalQueryClient.invalidateQueries({ queryKey: ["get-my-ships"] });
  return response.data;
}

export function useJettisonMutation(shipSymbol: string) {
  const [bearerToken] = useLocalStorage("bearerToken", "");
  return useMutation({
    mutationKey: ["jettison", shipSymbol],
    mutationFn: ({
      cargoSymbol,
      units,
    }: {
      cargoSymbol: TradeSymbol;
      units: number;
    }) => jettisonCargo(bearerToken, shipSymbol, cargoSymbol, units),
    onSuccess: () => {
      toast(`Successfully jettisoned cargo.`);
    },
    onError: handleAxiosError,
  });
}

async function transferCargo(
  bearerToken: string,
  fromShipSymbol: string,
  destShipSymbol: string,
  cargoSymbol: TradeSymbol,
  units: number,
) {
  const options = {
    headers: bearerPostHeaders(bearerToken),
    params: {
      shipSymbol: fromShipSymbol,
    },
  };
  const body = {
    shipSymbol: destShipSymbol,
    tradeSymbol: cargoSymbol,
    units,
  };
  const response = await api["transfer-cargo"](body, options);
  globalQueryClient.invalidateQueries({ queryKey: ["get-my-ships"] });
  return response.data;
}

export function useTransferMutation(shipSymbol: string) {
  const [bearerToken] = useLocalStorage("bearerToken", "");
  return useMutation({
    mutationKey: ["transfer-cargo", shipSymbol],
    mutationFn: ({
      destShipSymbol,
      cargoSymbol,
      units,
    }: {
      destShipSymbol: string;
      cargoSymbol: TradeSymbol;
      units: number;
    }) =>
      transferCargo(
        bearerToken,
        shipSymbol,
        destShipSymbol,
        cargoSymbol,
        units,
      ),
    onSuccess: () => {
      toast(`Transfered cargo from ${shipSymbol}.`);
    },
    onError: handleAxiosError,
  });
}

async function deliverContract(
  bearerToken: string,
  contractId: string,
  fromShipSymbol: string,
  cargoSymbol: TradeSymbol,
  units: number,
) {
  const options = {
    headers: bearerPostHeaders(bearerToken),
    params: {
      contractId,
    },
  };
  const body = {
    shipSymbol: fromShipSymbol,
    tradeSymbol: cargoSymbol,
    units,
  };
  const response = await api["deliver-contract"](body, options);
  globalQueryClient.invalidateQueries({ queryKey: ["get-my-ships"] });
  globalQueryClient.invalidateQueries({ queryKey: ["get-contracts"] });
  return response.data;
}

export function useDeliverContractMutation(contractId: string) {
  const [bearerToken] = useLocalStorage("bearerToken", "");
  return useMutation({
    mutationKey: ["deliver-contract", contractId],
    mutationFn: ({
      fromShipSymbol,
      cargoSymbol,
      units,
    }: {
      fromShipSymbol: string;
      cargoSymbol: TradeSymbol;
      units: number;
    }) =>
      deliverContract(
        bearerToken,
        contractId,
        fromShipSymbol,
        cargoSymbol,
        units,
      ),
    onSuccess: () => {
      toast(`Delivered cargo for contract ${contractId}.`);
    },
    onError: handleAxiosError,
  });
}

async function getMarketDetails(bearerToken: string, waypointSymbol: string) {
  const options = {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
    },
    params: {
      systemSymbol: getSystemSymbol(waypointSymbol),
      waypointSymbol,
    },
  };
  const response = await api["get-market"](options);
  return response.data;
}

export function useMarketDetails(waypointSymbol: string) {
  const [bearerToken] = useLocalStorage("bearerToken", "");
  return useQuery({
    queryKey: ["get-market", waypointSymbol],
    queryFn: () => getMarketDetails(bearerToken, waypointSymbol),
    enabled: !!bearerToken && !!waypointSymbol,
    retry: false,
    // Make this function never re-fetch
    // staleTime: Infinity,
  });
}

async function buyGood(
  bearerToken: string,
  shipSymbol: string,
  tradeSymbol: TradeSymbol,
  units: number,
) {
  const body = {
    symbol: tradeSymbol,
    units,
  };
  const options = {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
    },
    params: {
      shipSymbol,
    },
  };
  const response = await api["purchase-cargo"](body, options);
  globalQueryClient.invalidateQueries({ queryKey: ["get-my-ships"] });
  globalQueryClient.invalidateQueries({ queryKey: ["get-my-agent"] });
  return response;
}

export function useBuyGoodMutation() {
  const [bearerToken] = useLocalStorage("bearerToken", "");
  return useMutation({
    mutationKey: ["purchase-cargo"],
    mutationFn: ({
      shipSymbol,
      cargoSymbol,
      units,
    }: {
      shipSymbol: string;
      cargoSymbol: TradeSymbol;
      units: number;
    }) => buyGood(bearerToken, shipSymbol, cargoSymbol, units),
    onSuccess: (_data, vars) => {
      toast(`Bought ${vars.cargoSymbol}.`);
    },
    onError: handleAxiosError,
  });
}

async function sellGood(
  bearerToken: string,
  shipSymbol: string,
  tradeSymbol: TradeSymbol,
  units: number,
) {
  const body = {
    symbol: tradeSymbol,
    units,
  };
  const options = {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
    },
    params: {
      shipSymbol,
    },
  };
  const response = await api["sell-cargo"](body, options);
  globalQueryClient.invalidateQueries({ queryKey: ["get-my-ships"] });
  globalQueryClient.invalidateQueries({ queryKey: ["get-my-agent"] });
  return response;
}

export function useSellGoodMutation() {
  const [bearerToken] = useLocalStorage("bearerToken", "");
  return useMutation({
    mutationKey: ["purchase-cargo"],
    mutationFn: ({
      shipSymbol,
      cargoSymbol,
      units,
    }: {
      shipSymbol: string;
      cargoSymbol: TradeSymbol;
      units: number;
    }) => sellGood(bearerToken, shipSymbol, cargoSymbol, units),
    onSuccess: (_data, vars) => {
      toast(`Sold ${vars.cargoSymbol}.`);
    },
    onError: handleAxiosError,
  });
}

type ShipType = z.infer<typeof schemas.ShipType>;

async function purchaseShip(
  bearerToken: string,
  shipType: ShipType,
  waypointSymbol: string,
) {
  const body = { shipType, waypointSymbol };
  const options = {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
    },
  };
  const response = await api["purchase-ship"](body, options);
  globalQueryClient.invalidateQueries({ queryKey: ["get-my-ships"] });
  globalQueryClient.invalidateQueries({ queryKey: ["get-my-agent"] });
  return response.data;
}

export function usePurchaseShipMutation(
  waypointSymbol: string,
  shipType: ShipType,
) {
  const [bearerToken] = useLocalStorage("bearerToken", "");
  return useMutation({
    mutationKey: ["purchase-ship", waypointSymbol, shipType],
    mutationFn: () => purchaseShip(bearerToken, shipType, waypointSymbol),
    onSuccess: () => {
      toast(`Purchased ${shipType}.`);
      globalQueryClient.invalidateQueries({
        queryKey: ["get-shipyard", waypointSymbol],
      });
    },
    onError: handleAxiosError,
  });
}

async function fulfillContract(bearerToken: string, contractId: string) {
  const options = {
    headers: bearerPostHeaders(bearerToken),
    params: { contractId },
  };
  const response = await api["fulfill-contract"](undefined, options);
  globalQueryClient.invalidateQueries({ queryKey: ["get-contract"] });
  globalQueryClient.invalidateQueries({ queryKey: ["get-my-agent"] });
  return response.data;
}

export function useFulfillContractMutation(contractId: string) {
  const [bearerToken] = useLocalStorage("bearerToken", "");
  return useMutation({
    mutationKey: ["fulfill-contract", contractId],
    mutationFn: () => fulfillContract(bearerToken, contractId),
    onError: handleAxiosError,
  });
}

export type FactionSymbol = z.infer<typeof schemas.FactionSymbol>;
export function useFactions() {
  return useQuery({
    queryKey: ["get-factions"],
    queryFn: () => {
      api["get-factions"];
    },
    retry: false,
    // Make this function never re-fetch
    staleTime: Infinity,
  });
}

async function registerAgent(
  agentSymbol: string,
  faction: FactionSymbol,
  registerTokenCallback: Function,
) {
  const body = {
    symbol: agentSymbol,
    faction,
  };
  const response = await api["register"](body);
  globalQueryClient.invalidateQueries();
  registerTokenCallback(response.data.token);
  return response.data;
}

export function useRegisterWithFaction() {
  return useMutation({
    mutationKey: ["register"],
    mutationFn: ({
      agentSymbol,
      faction,
      callback,
    }: {
      agentSymbol: string;
      faction: FactionSymbol;
      callback: Function;
    }) => registerAgent(agentSymbol, faction, callback),
    onError: handleAxiosError,
  });
}

async function patchShipNav(
  bearerToken: string,
  shipSymbol: string,
  { flightMode }: { flightMode: ShipNavFlightMode },
) {
  const options = {
    headers: bearerHeaders(bearerToken),
    params: {
      shipSymbol,
    },
  };
  const body = { flightMode };
  const response = await api["patch-ship-nav"](body, options);
  globalQueryClient.invalidateQueries({ queryKey: ["get-my-ships"] });
  return response.data;
}

export function usePatchShipNav(shipSymbol: string) {
  const [bearerToken] = useLocalStorage("bearerToken", "");
  return useMutation({
    mutationKey: ["patch-ship-nav"],
    mutationFn: (args: { flightMode: ShipNavFlightMode }) =>
      patchShipNav(bearerToken, shipSymbol, args),
    onError: handleAxiosError,
  });
}

const queryShipyard = async (bearerToken: string, shipyardSymbol: string) => {
  return await api["get-shipyard"]({
    params: {
      systemSymbol: getSystemSymbol(shipyardSymbol),
      waypointSymbol: shipyardSymbol,
    },
    headers: bearerHeaders(bearerToken),
  });
};

export function useShipyard(shipyardSymbol: string) {
  const [bearerToken] = useLocalStorage("bearerToken", "");
  return useQuery({
    queryKey: ["get-shipyard", shipyardSymbol],
    queryFn: () => queryShipyard(bearerToken, shipyardSymbol),
    enabled: !!bearerToken && !!shipyardSymbol.length,
    retry: false,
  });
}

export const globalQueryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      toast(error.toString());
    },
  }),
});
