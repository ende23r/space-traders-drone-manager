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

type Agent = z.infer<typeof schemas.Agent>;
// type Ship = z.infer<typeof schemas.Ship>;
// type Meta = z.infer<typeof schemas.Meta>;
// type Waypoint = z.infer<typeof schemas.Waypoint>;

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
  return { agent: data?.data || noDataAgent, ...metadata };
}

export function useContracts() {
  const [bearerToken] = useLocalStorage("bearerToken", "");
  return useQuery({
    queryKey: ["get-contracts"],
    queryFn: () => api["get-contracts"](bearerOptions(bearerToken)),
    enabled: !!bearerToken,
    retry: false,
  });
}

/**
 * Only want to refetch this function when:
 * 1. The player buys a new ship
 * 2. The player triggers a change in ship state
 * 3. A scheduled ship update has likely happened (e.g. ship reached destination, cooldown done)
 */
export function useMyShips() {
  const [bearerToken] = useLocalStorage("bearerToken", "");
  return useQuery({
    queryKey: ["get-my-ships"],
    queryFn: () => api["get-my-ships"](bearerOptions(bearerToken)),
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
  return waypoints;
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
  });
}

async function acceptContract(bearerToken: string, contractId: string) {
  const options = {
    headers: bearerPostHeaders(bearerToken),
    params: {
      contractId,
    },
  };
  const result = api["accept-contract"](undefined, options);
  globalQueryClient.invalidateQueries({ queryKey: ["get-contracts"] });
  return result;
}

export function useAcceptContractMutation(contractId: string) {
  const [bearerToken] = useLocalStorage("bearerToken", "");
  return useMutation({
    mutationKey: ["accept-contract"],
    mutationFn: () => acceptContract(bearerToken, contractId),
  });
}

async function negotiateContract(bearerToken: string, shipSymbol: string) {
  const options = {
    headers: bearerPostHeaders(bearerToken),
    params: { shipSymbol },
  };
  const result = api["negotiateContract"](undefined, options);
  globalQueryClient.invalidateQueries({ queryKey: ["get-contracts"] });
  return result;
}

export function useNegotiateContractMutation() {
  const [bearerToken] = useLocalStorage("bearerToken", "");
  return useMutation({
    mutationKey: ["negotiateContract"],
    mutationFn: ({ shipSymbol }: { shipSymbol: string }) =>
      negotiateContract(bearerToken, shipSymbol),
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
  console.log({ extractionData: response.data })
  scheduleUpdate({
    callback: () => globalQueryClient.invalidateQueries({ queryKey: ["get-my-ships"] }),
    scheduledTime: new Date(response.data.cooldown.expiration || "")
  })
  return response.data;
}

export function useExtractMutation(shipSymbol: string) {
  const [bearerToken] = useLocalStorage("bearerToken", "");
  return useMutation({
    mutationKey: ["extract-resources", shipSymbol],
    mutationFn: () => triggerExtract(bearerToken, shipSymbol),
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
  });
}

export const globalQueryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      toast(error.toString());
    },
    onSuccess: (_data, query) => {
      toast(`Successfully fetched query for key ${query.queryKey}`);
    },
  }),
});
