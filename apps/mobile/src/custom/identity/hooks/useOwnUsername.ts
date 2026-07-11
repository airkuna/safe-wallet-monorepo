import { useAppSelector } from '@/src/store/hooks'
import { selectActiveSafe } from '@/src/store/activeSafeSlice'
import { selectOwnUsername } from '../store/identitySlice'

/** Username of the active Safe (registered in the create flow), or null. */
export const useOwnUsername = (): string | null => {
  const activeSafe = useAppSelector(selectActiveSafe)
  const username = useAppSelector((state) =>
    activeSafe ? selectOwnUsername(state, activeSafe.chainId, activeSafe.address) : undefined,
  )
  return username ?? null
}
