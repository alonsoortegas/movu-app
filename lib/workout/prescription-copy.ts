export interface PrescriptionLabels {
  sets: string
  reps: string
  perceivedEffort: string
  repsInReserve: string
}

export interface PrescriptionCopyInput {
  sets: number | null
  reps: string | null
  targetRpe: string | null
  targetRir: string | null
  labels: PrescriptionLabels
}

export function formatPrescription({
  sets,
  reps,
  targetRpe,
  targetRir,
  labels,
}: PrescriptionCopyInput): string[] {
  const parts: string[] = []

  if (sets != null && reps) {
    parts.push(`${sets} ${labels.sets} × ${reps} ${labels.reps}`)
  } else if (sets != null) {
    parts.push(`${sets} ${labels.sets}`)
  } else if (reps) {
    parts.push(`${reps} ${labels.reps}`)
  }

  if (targetRpe) parts.push(`RPE (${labels.perceivedEffort}) ${targetRpe}`)
  if (targetRir) parts.push(`RIR (${labels.repsInReserve}) ${targetRir}`)

  return parts
}

export function getBlockInstruction(
  supersetGroup: number | null,
): 'circuit' | 'straight_sets' {
  return supersetGroup == null ? 'straight_sets' : 'circuit'
}
