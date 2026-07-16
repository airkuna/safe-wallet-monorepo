import React, { useCallback, useRef, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import type { Code } from 'react-native-vision-camera'
import { ScrollView, Text, XStack, YStack } from 'tamagui'
import { QrCamera, ScanErrorOverlay, useCameraPermissionFlow } from '@/src/components/Camera'
import { SafeButton } from '@/src/components/SafeButton'
import { SafeInput } from '@/src/components/SafeInput/SafeInput'
import { checkinTicket } from '../api/client'
import { isEventsBackendConfigured } from '../api/config'
import type { CheckinResponse } from '../api/types'
import { parseTicketQrPayload } from '../logic/qrPayload'
import {
  findPriorOkScan,
  getLocalEntryCount,
  recordEntryScan,
  tokenFingerprint,
  useEntryLog,
} from '../state/useEntryLog'
import { setScannerToken, useScannerToken } from '../state/useScannerAuth'
import { evStrings } from '../strings'

/**
 * Skener ulaza (E3) — organizatorov mod, POTPUNO ODVOJEN od payment skenera:
 * reusa host `QrCamera` (kamera + permission flow), ali payload ide isključivo
 * u `parseTicketQrPayload` — `resolveScannedAddress` (payment choke-point) se
 * ovdje NIKAD ne poziva, pa ticket QR ne može završiti u Send flowu (i
 * obrnuto: payment QR je ovdje glasno odbijen kao "nije QR ulaznice").
 *
 * Autorizacija skeniranja je ISKLJUČIVO server-side (`redeem_ticket` RPC:
 * org admin role) — pristupni token ovdje je samo transport kredencijala,
 * a ulaz u ekran namjerno nije "zaključan" jer klijentski check ne bi ništa
 * dokazivao. Online-only MVP: bez potvrde servera ulaz se NE priznaje.
 */

type ScanOutcome =
  | { kind: 'response'; response: CheckinResponse; localDuplicate: boolean }
  | { kind: 'failure'; message: string }

const scanStrings = evStrings.scanner

const resultHeadline = (response: CheckinResponse): { ok: boolean; title: string } => {
  switch (response.status) {
    case 'checked_in':
      return { ok: true, title: scanStrings.resultOk }
    case 'already_checked_in':
      return { ok: false, title: scanStrings.resultDuplicate }
    case 'void':
      return { ok: false, title: scanStrings.resultVoid }
    case 'not_found':
      return { ok: false, title: scanStrings.resultNotFound }
  }
}

const formatScanTime = (iso: string | null | undefined): string | undefined => {
  if (iso === null || iso === undefined) {
    return undefined
  }
  const parsed = new Date(iso)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toLocaleString('hr-HR')
}

const TokenGate = ({ onSave }: { onSave: (token: string) => void }) => {
  const [draft, setDraft] = useState('')

  return (
    <ScrollView
      flex={1}
      backgroundColor="$backgroundPaper"
      testID="ev-scanner-token-gate"
      contentContainerStyle={{ padding: '$4' }}
    >
      <YStack gap="$3">
        <Text fontSize="$6" fontWeight="700">
          {scanStrings.tokenTitle}
        </Text>
        <Text fontSize="$3" color="$colorSecondary">
          {scanStrings.tokenHint}
        </Text>
        <SafeInput
          value={draft}
          onChangeText={setDraft}
          placeholder={scanStrings.tokenPlaceholder}
          autoCapitalize="none"
          autoCorrect={false}
          testID="ev-scanner-token-input"
        />
        <SafeButton disabled={draft.trim().length === 0} onPress={() => onSave(draft)} testID="ev-scanner-token-save">
          {scanStrings.tokenSave}
        </SafeButton>
      </YStack>
    </ScrollView>
  )
}

const ResultView = ({
  outcome,
  entryCount,
  onNext,
  onChangeToken,
}: {
  outcome: ScanOutcome
  entryCount: number
  onNext: () => void
  onChangeToken: () => void
}) => {
  const isResponse = outcome.kind === 'response'
  const headline = isResponse ? resultHeadline(outcome.response) : undefined
  const ok = headline?.ok === true
  const response = isResponse ? outcome.response : undefined
  const firstEntry = formatScanTime(response?.checked_in_at)

  return (
    <ScrollView
      flex={1}
      backgroundColor="$backgroundPaper"
      testID="ev-scanner-result"
      contentContainerStyle={{ padding: '$4', paddingBottom: '$10' }}
    >
      <YStack gap="$3" alignItems="center" paddingTop="$6">
        <Text fontSize={72} testID="ev-scanner-result-icon">
          {ok ? '✅' : '⛔'}
        </Text>
        <Text fontSize="$6" fontWeight="700" textAlign="center" testID="ev-scanner-result-title">
          {headline?.title ?? scanStrings.rejectedFallback}
        </Text>

        {outcome.kind === 'failure' && (
          <Text fontSize="$3" color="$colorSecondary" textAlign="center" testID="ev-scanner-result-message">
            {outcome.message}
          </Text>
        )}

        {response !== undefined && (
          <YStack gap="$1" alignItems="center">
            {typeof response.holder_name === 'string' && response.holder_name.length > 0 && (
              <Text fontSize="$6" fontWeight="600" textAlign="center" testID="ev-scanner-result-holder">
                {response.holder_name}
              </Text>
            )}
            {typeof response.tier_title === 'string' && response.tier_title.length > 0 && (
              <Text fontSize="$4" color="$colorSecondary" testID="ev-scanner-result-tier">
                {response.tier_title}
              </Text>
            )}
            {response.serial !== undefined && (
              <Text fontSize="$3" color="$colorSecondary">
                {response.serial}
              </Text>
            )}
            {!ok && firstEntry !== undefined && (
              <Text fontSize="$3" color="$error" testID="ev-scanner-result-first-entry">
                {scanStrings.firstEntryAt}: {firstEntry}
              </Text>
            )}
            {!ok && typeof response.checked_in_by_email === 'string' && (
              <Text fontSize="$3" color="$colorSecondary">
                {scanStrings.scannedBy}: {response.checked_in_by_email}
              </Text>
            )}
          </YStack>
        )}

        <XStack gap="$2" alignItems="center">
          <Text fontSize="$3" color="$colorSecondary" testID="ev-scanner-entry-count">
            {scanStrings.entryCounter}: {entryCount}
          </Text>
        </XStack>

        <SafeButton onPress={onNext} testID="ev-scanner-next">
          {scanStrings.scanNext}
        </SafeButton>
        <SafeButton secondary size="$sm" onPress={onChangeToken} testID="ev-scanner-change-token">
          {scanStrings.tokenChange}
        </SafeButton>
      </YStack>
    </ScrollView>
  )
}

export const SkenerUlaza = () => {
  const { permission, requestPermission, openSettings } = useCameraPermissionFlow()
  const scannerToken = useScannerToken()
  const entryLog = useEntryLog()
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [formatError, setFormatError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null)
  const [showTokenGate, setShowTokenGate] = useState(false)
  const busyRef = useRef(false)

  const formatErrorRef = useRef(formatError)
  formatErrorRef.current = formatError
  const outcomeRef = useRef(outcome)
  outcomeRef.current = outcome

  const handleFocusEffect = useCallback(() => {
    if (permission === 'granted' && !formatErrorRef.current && !outcomeRef.current) {
      setIsCameraActive(true)
      busyRef.current = false
    }
    return () => {
      setIsCameraActive(false)
    }
  }, [permission])

  useFocusEffect(handleFocusEffect)

  const serverCount = outcome?.kind === 'response' ? outcome.response.checked_in_count : undefined
  const entryCount = serverCount ?? getLocalEntryCount()

  const finishScan = useCallback((nextOutcome: ScanOutcome) => {
    setOutcome(nextOutcome)
    setIsCameraActive(false)
    busyRef.current = false
  }, [])

  const onScan = useCallback(
    (codes: Code[]) => {
      if (codes.length === 0 || !isCameraActive || busyRef.current) {
        return
      }
      const raw = codes[0].value ?? ''
      const qrToken = parseTicketQrPayload(raw)
      if (qrToken === null) {
        // Payment/adresni/junk QR — glasno odbij; NIKAD ne prosljeđuj dalje.
        setFormatError(scanStrings.invalidFormat)
        setIsCameraActive(false)
        return
      }

      busyRef.current = true
      const fingerprint = tokenFingerprint(qrToken)

      // Lokalni anti-double-entry pre-check (isti uređaj, bez mreže).
      const prior = findPriorOkScan(fingerprint)
      if (prior !== undefined) {
        recordEntryScan({ ...prior, result: 'duplicate', atMs: Date.now() })
        finishScan({
          kind: 'response',
          localDuplicate: true,
          response: {
            status: 'already_checked_in',
            serial: prior.serial,
            holder_name: prior.holderName,
            tier_title: prior.tierTitle,
            checked_in_at: new Date(prior.atMs).toISOString(),
          },
        })
        return
      }

      const authToken = scannerToken ?? ''
      void checkinTicket(qrToken, authToken).then((result) => {
        if (result.kind === 'unreachable') {
          recordEntryScan({ tokenFingerprint: fingerprint, result: 'error', atMs: Date.now() })
          finishScan({ kind: 'failure', message: scanStrings.offline })
          return
        }
        if (result.kind === 'rejected') {
          recordEntryScan({ tokenFingerprint: fingerprint, result: 'rejected', atMs: Date.now() })
          finishScan({
            kind: 'failure',
            message: scanStrings.rejected[result.code] ?? scanStrings.rejectedFallback,
          })
          return
        }
        const { response } = result
        recordEntryScan({
          tokenFingerprint: fingerprint,
          serial: response.serial,
          holderName: response.holder_name ?? undefined,
          tierTitle: response.tier_title ?? undefined,
          result: response.status === 'checked_in' ? 'ok' : 'duplicate',
          atMs: Date.now(),
        })
        finishScan({ kind: 'response', response, localDuplicate: false })
      })
    },
    [isCameraActive, scannerToken, finishScan],
  )

  const onNextScan = useCallback(() => {
    setOutcome(null)
    setFormatError(null)
    if (permission === 'granted') {
      setIsCameraActive(true)
    }
  }, [permission])

  const onTryAgain = useCallback(() => {
    setFormatError(null)
    if (permission === 'granted') {
      setIsCameraActive(true)
    }
  }, [permission])

  const onSaveToken = useCallback((token: string) => {
    setScannerToken(token)
    setShowTokenGate(false)
  }, [])

  if (!isEventsBackendConfigured()) {
    return (
      <YStack flex={1} backgroundColor="$backgroundPaper" padding="$4" testID="ev-scanner-unavailable">
        <Text fontSize="$3" color="$colorSecondary">
          {scanStrings.notConfigured}
        </Text>
      </YStack>
    )
  }

  if (scannerToken === undefined || showTokenGate) {
    return <TokenGate onSave={onSaveToken} />
  }

  if (outcome !== null) {
    return (
      <ResultView
        outcome={outcome}
        entryCount={entryCount}
        onNext={onNextScan}
        onChangeToken={() => {
          setOutcome(null)
          setShowTokenGate(true)
        }}
      />
    )
  }

  return (
    <QrCamera
      permission={permission}
      isCameraActive={isCameraActive}
      onScan={onScan}
      onActivateCamera={() => setIsCameraActive(true)}
      onRequestPermission={requestPermission}
      onPressSettings={openSettings}
      heading={formatError ? undefined : scanStrings.heading}
      lensTone={formatError ? 'error' : 'neutral'}
      dimLens={Boolean(formatError)}
      centerOverlay={
        formatError ? (
          <ScanErrorOverlay message={formatError} onTryAgain={onTryAgain} testID="ev-scanner-try-again" />
        ) : undefined
      }
      footer={
        <YStack gap="$1">
          <Text textAlign="center">{scanStrings.footer}</Text>
          <Text textAlign="center" fontSize="$2" color="$colorSecondary">
            {scanStrings.entryCounter}: {entryLog.filter((record) => record.result === 'ok').length}
          </Text>
        </YStack>
      }
    />
  )
}
