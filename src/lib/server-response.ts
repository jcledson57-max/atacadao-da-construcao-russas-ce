// Preserve the server-function protocol on success; never retry account mutations.
export async function checkedServerResponse(response: Response): Promise<Response> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!response.ok) {
    if (response.status === 401) throw new Error('Sua sessão expirou. Entre novamente para salvar o usuário.');
    if (response.status === 403) throw new Error('O acesso foi recusado. Reabra o painel no endereço do site e entre novamente.');
    if (response.status === 404) throw new Error('O serviço de usuários não está disponível neste endereço. Acesse o painel publicado no Lovable.');
    // A valid serialized error must still be decoded by TanStack.
    if (contentType.includes('application/json') && response.headers.get('x-tss-serialized') === 'true') return response;
    throw new Error('Não foi possível concluir a operação. Confira a lista de usuários antes de tentar novamente.');
  }
  if (!contentType.includes('application/json') && !contentType.includes('application/x-tss-framed')) {
    throw new Error('O serviço de usuários retornou uma resposta inválida. Reabra o painel no endereço publicado no Lovable.');
  }
  return response;
}