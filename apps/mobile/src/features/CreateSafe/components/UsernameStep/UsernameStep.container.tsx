import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import { CommonActions } from '@react-navigation/native'
import { useAppDispatch, useAppSelector } from '@/src/store/hooks'
import { selectActiveSafe } from '@/src/store/activeSafeSlice'
import {
  isIdentityEnabled,
  normalizeUsername,
  registerUsername,
  setOwnUsername,
  toFullEnsName,
} from '@/src/custom/identity'
import { useUsernameAvailability } from '../../hooks/useUsernameAvailability'
import { UsernameStepView } from './UsernameStepView'

/**
 * Optional "Choose your name" step shown right after a Safe is created
 * (identity-enabled brands only). The account already exists at this point —
 * every exit (confirm, skip, failure) lands on home; the user is never
 * trapped here.
 */
export const UsernameStepContainer = () => {
  const navigation = useNavigation()
  const params = useLocalSearchParams<{ safeAddress?: string; chainId?: string }>()
  const activeSafe = useAppSelector(selectActiveSafe)
  const dispatch = useAppDispatch()

  // The create flow passes the freshly predicted Safe explicitly; the active
  // Safe (set by useCreateSafe just before navigating) is the fallback.
  const safeAddress = params.safeAddress ?? activeSafe?.address
  const chainId = params.chainId ?? activeSafe?.chainId

  const [username, setUsername] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [error, setError] = useState<string>()
  const availability = useUsernameAvailability(username)

  const goHome = useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({
        routes: [{ key: '(tabs)', name: '(tabs)' }],
      }),
    )
  }, [navigation])

  const stepAvailable = isIdentityEnabled() && Boolean(safeAddress) && Boolean(chainId)
  useEffect(() => {
    if (!stepAvailable) {
      goHome()
    }
  }, [stepAvailable, goHome])

  const normalized = normalizeUsername(username)
  const fullEnsName = useMemo(
    () => (stepAvailable && normalized ? toFullEnsName(normalized) : undefined),
    [stepAvailable, normalized],
  )

  const handleUsernameChange = (value: string) => {
    setUsername(value.toLowerCase())
    setError(undefined)
  }

  const handleConfirm = async () => {
    if (!safeAddress || !chainId) {
      return
    }

    setIsRegistering(true)
    setError(undefined)
    try {
      await registerUsername(username, safeAddress)
      dispatch(setOwnUsername({ chainId, safeAddress, username: normalized ?? username }))
      goHome()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. You can retry or skip for now.')
    } finally {
      setIsRegistering(false)
    }
  }

  if (!stepAvailable) {
    return null
  }

  return (
    <UsernameStepView
      username={username}
      onUsernameChange={handleUsernameChange}
      availability={availability}
      fullEnsName={fullEnsName}
      onConfirm={handleConfirm}
      onSkip={goHome}
      isRegistering={isRegistering}
      error={error}
    />
  )
}
