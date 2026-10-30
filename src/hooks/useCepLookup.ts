import { useEffect, useRef, useState } from 'react';
import { CepAddress, lookupCep } from '../services/cep';

export function useCepLookup(cep: string, onAddress: (address: CepAddress) => void, enabled = true) {
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [cepMessage, setCepMessage] = useState('');
  const request = useRef<AbortController | null>(null);
  const latest = useRef({ cep, enabled });
  latest.current = { cep, enabled };

  useEffect(() => {
    request.current?.abort();
    setIsSearchingCep(false);
    setCepMessage('');
    return () => { request.current?.abort(); };
  }, [cep, enabled]);

  const handleLookupCep = async () => {
    if (!enabled) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setCepMessage('');
    setIsSearchingCep(true);
    try {
      const address = await lookupCep(cep, controller.signal);
      if (controller.signal.aborted || request.current !== controller || latest.current.cep !== cep || !latest.current.enabled) return;
      onAddress(address);
      setCepMessage('Endereço encontrado. Confira os dados e informe o número e complemento.');
    } catch (error) {
      if (!controller.signal.aborted && request.current === controller) {
        setCepMessage(error instanceof Error && !(error instanceof TypeError)
          ? error.message : 'Não foi possível consultar o CEP. Preencha o endereço manualmente.');
      }
    } finally {
      if (!controller.signal.aborted && request.current === controller) setIsSearchingCep(false);
    }
  };

  return { isSearchingCep, cepMessage, handleLookupCep };
}
