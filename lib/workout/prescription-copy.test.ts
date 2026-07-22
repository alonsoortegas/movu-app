import { describe, expect, it } from 'vitest'
import { formatPrescription, getBlockInstruction } from './prescription-copy'

const esLabels = {
  sets: 'series',
  reps: 'repeticiones',
  perceivedEffort: 'esfuerzo percibido',
  repsInReserve: 'repeticiones en reserva',
}

describe('formatPrescription', () => {
  it('writes sets and repetitions as complete labels', () => {
    expect(
      formatPrescription({
        sets: 4,
        reps: '12',
        targetRpe: null,
        targetRir: null,
        labels: esLabels,
      }),
    ).toEqual(['4 series × 12 repeticiones'])
  })

  it('expands RPE and RIR instead of showing unexplained abbreviations', () => {
    expect(
      formatPrescription({
        sets: 3,
        reps: '8-10',
        targetRpe: '8',
        targetRir: '1-2',
        labels: esLabels,
      }),
    ).toEqual([
      '3 series × 8-10 repeticiones',
      'RPE (esfuerzo percibido) 8',
      'RIR (repeticiones en reserva) 1-2',
    ])
  })

  it('omits absent prescription parts', () => {
    expect(
      formatPrescription({
        sets: null,
        reps: null,
        targetRpe: null,
        targetRir: null,
        labels: esLabels,
      }),
    ).toEqual([])
  })
})

describe('getBlockInstruction', () => {
  it('uses circuit instructions for grouped exercises', () => {
    expect(getBlockInstruction(1)).toBe('circuit')
  })

  it('uses straight-set instructions for ungrouped exercises', () => {
    expect(getBlockInstruction(null)).toBe('straight_sets')
  })
})
