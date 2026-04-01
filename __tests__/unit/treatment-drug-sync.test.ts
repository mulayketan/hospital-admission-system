import { parseTreatmentLines } from '@/lib/treatment-drug-sync'

describe('parseTreatmentLines', () => {
  it('parses INJ lines with BD and STAT', () => {
    const lines = parseTreatmentLines('INJ PAN 40 MG BD\nINJ EMSET 8 MG STAT')
    expect(lines).toHaveLength(2)
    expect(lines[0].drugName).toContain('INJ PAN')
    expect(lines[0].frequency).toBe('BD')
    expect(lines[0].route).toBe('IV')
    expect(lines[1].frequency).toBe('STAT')
  })

  it('parses TAB and infers oral route', () => {
    const lines = parseTreatmentLines('TAB DYNAPAR STAT')
    expect(lines).toHaveLength(1)
    expect(lines[0].route).toBe('Oral (TAB)')
    expect(lines[0].frequency).toBe('STAT')
  })

  it('skips NS || POINT style lines', () => {
    const lines = parseTreatmentLines('INJ PAN BD\nNS || POINT')
    expect(lines).toHaveLength(1)
  })

  it('strips trailing GIVEN and detects IM', () => {
    const lines = parseTreatmentLines('INJ DYNAPAR IM GIVEN')
    expect(lines).toHaveLength(1)
    expect(lines[0].route).toBe('INJ (IM)')
    expect(lines[0].drugName.toUpperCase()).toContain('DYNAPAR')
  })
})
