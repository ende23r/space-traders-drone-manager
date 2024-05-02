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

import { useQuery } from "@tanstack/react-query";

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
import {api } from "./packages/SpaceTradersAPI";
import { useContext } from "react";
import { BearerTokenContext } from "./GameContextProvider";

export const bearerOptions = (token: string) => ({
  headers: {
    Authorization: `Bearer ${token}`
  }
});
export const bearerHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`
});

export const bearerPostOptions = (token: string) => {
  const options = bearerOptions(token);
  return {
    headers: {
      method: "POST",
      ...options.headers
    }
  };
}

export const bearerPostHeaders = (token: string) => {
  const headers = bearerHeaders(token);
  return {
    method: "POST",
    ...headers
  };
}

export function useMyShips() {
  const bearerToken = useContext(BearerTokenContext);
  return useQuery({
    queryKey: ["get-my-ships"],
    queryFn: () => api["get-my-ships"](bearerOptions(bearerToken))
  })  
}

export function useMyAgent(args: any) {
  const bearerToken = useContext(BearerTokenContext);
  return useQuery({
    queryKey: ["get-my-agent"],
    queryFn: () => api["get-my-agent"](bearerOptions(bearerToken)),
    ...args
  })  
}
