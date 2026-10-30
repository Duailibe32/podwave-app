export interface CepAddress {
  street: string;
  bairro: string;
  city: string;
  state: string;
}

export async function lookupCep(value: string, signal?: AbortSignal): Promise<CepAddress> {
  const cep = value.replace(/\D/g, '');
  if (!/^\d{8}$/.test(cep)) throw new Error('Informe um CEP com 8 dígitos.');

  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 8000);
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controller.signal });
    if (!response.ok) throw new Error('Não foi possível consultar o CEP. Você pode preencher o endereço manualmente.');
    const data = await response.json();
    if (data?.erro) throw new Error('CEP não encontrado. Confira os números ou preencha o endereço manualmente.');
    if (typeof data?.localidade !== 'string' || !data.localidade.trim() || !/^[A-Z]{2}$/.test(data?.uf || '')) {
      throw new Error('Resposta de CEP inválida. Preencha o endereço manualmente.');
    }
    return {
      street: typeof data.logradouro === 'string' ? data.logradouro : '',
      bairro: typeof data.bairro === 'string' ? data.bairro : '',
      city: data.localidade,
      state: data.uf,
    };
  } catch (error) {
    if (controller.signal.aborted && !signal?.aborted) throw new Error('A consulta demorou demais. Tente novamente ou preencha o endereço manualmente.');
    if (error instanceof TypeError || error instanceof SyntaxError) throw new Error('Não foi possível consultar o CEP. Preencha o endereço manualmente.');
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
