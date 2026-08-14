import { useQuery } from '@tanstack/react-query';
import { getUsersOnLeaveToday } from '@/app/actions/leaves';

export function useOnLeaveUsers() {
  return useQuery({
    queryKey: ['onLeaveUsersToday'],  
    queryFn: async () => {
      const userIds = await getUsersOnLeaveToday();
      return new Set(userIds);
    },
    // Cache for 5 minutes since leave status doesn't change by the minute usually
    staleTime: 5 * 60 * 1000,
  });
}
