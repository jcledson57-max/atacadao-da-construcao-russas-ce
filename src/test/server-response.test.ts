import { describe, expect, it } from 'vitest';
import { checkedServerResponse } from '@/lib/server-response';

describe('Account RPC response handling', () => {
  it('passes the serialized result through without consuming its body', async () => {
    const response = Response.json({ result: { id: 'saved-account' } }, { headers: { 'x-tss-serialized': 'true' } });
    expect(await checkedServerResponse(response)).toBe(response);
    expect(response.bodyUsed).toBe(false);
  });
  it('preserves serialized application errors for the framework', async () => {
    const response = Response.json({ error: 'rejected' }, { status: 500, headers: { 'x-tss-serialized': 'true' } });
    expect(await checkedServerResponse(response)).toBe(response);
  });
  it('rejects a headerless forbidden response before the framework invariant', async () => {
    await expect(checkedServerResponse(new Response(null, { status: 403 }))).rejects.toThrow('O acesso foi recusado');
  });
  it('does not treat a static site HTML fallback as a saved account', async () => {
    await expect(checkedServerResponse(new Response('<html></html>', { headers: { 'content-type': 'text/html' } }))).rejects.toThrow('resposta inválida');
  });
  it('rejects a headerless successful response instead of claiming the account was saved', async () => {
    await expect(checkedServerResponse(new Response(null))).rejects.toThrow('resposta inválida');
  });
});