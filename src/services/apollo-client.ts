import {
  ApolloClient,
  createHttpLink,
  InMemoryCache,
  from,
} from "@apollo/client/core";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { getAccessToken } from "./token-storage";
import {
  handleUnauthorizedSession,
  registerApolloResetHandler,
} from "./session";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// GraphQL must go through the backend API boundary, not Supabase directly.
const httpLink = createHttpLink({
  uri: `${API_URL}/graphql`,
});

const authLink = setContext((_, { headers }) => {
  const token = getAccessToken();

  return {
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
});

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      if (
        err.extensions?.code === "UNAUTHENTICATED" ||
        err.message?.toLowerCase().includes("unauthorized") ||
        err.message?.includes("401")
      ) {
        handleUnauthorizedSession();
        break;
      }
    }
  }

  // For Network Error, e.g., 401
  if (
    networkError &&
    "statusCode" in networkError &&
    networkError.statusCode === 401
  ) {
    handleUnauthorizedSession();
  }
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});

registerApolloResetHandler(async () => {
  await apolloClient.clearStore();
});
