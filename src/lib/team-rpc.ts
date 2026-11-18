import { createMiddleware } from '@tanstack/react-start';
import { checkedServerResponse } from './server-response';

export const teamRpc = createMiddleware({ type: 'function' }).client(async ({ next }) => {
  return next({
    fetch: async (input, init) => checkedServerResponse(await fetch(input, init)),
  });
});