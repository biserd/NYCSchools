import {useQuery,useQueryClient} from '@tanstack/react-query';
import {apiRequest} from '@/lib/queryClient';
import type {ParentAssistantStatus} from '@shared/parent-assistant';
export function useFamilyAssistant(userId?:string) {
 return useQuery<ParentAssistantStatus>({queryKey:['parent-assistant',userId],enabled:!!userId,gcTime:0,staleTime:30000,refetchOnWindowFocus:'always',queryFn:async()=>(await apiRequest('GET','/api/tuck/assistant')).json()});
}
export function useRefreshFamily(userId:string) {
 const query=useQueryClient();
 return async()=>{await Promise.all([query.invalidateQueries({queryKey:['tuck-overview',userId]}),query.invalidateQueries({queryKey:['parent-assistant',userId]})]);};
}
