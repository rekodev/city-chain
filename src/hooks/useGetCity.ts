import { useQuery } from '@tanstack/react-query';
import { fetchCity } from '@/server/city';

export function useGetCity(name: string) {
  return useQuery({
    queryKey: ['city', name],
    queryFn: () => fetchCity({ data: name }),
    enabled: !!name,
    staleTime: Infinity
  });
}
