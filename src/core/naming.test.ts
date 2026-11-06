import { expect, test } from 'bun:test'
import { pageFileName, zipFileName } from './naming'

test('page names are stable and use at least three digits', () => {
  expect(pageFileName(1, 100)).toBe('ecg-001.pdf')
  expect(pageFileName(12, 20)).toBe('ecg-012.pdf')
  expect(pageFileName(100, 100)).toBe('ecg-100.pdf')
  expect(pageFileName(1, 1000)).toBe('ecg-0001.pdf')
  expect(pageFileName(42, 1000)).toBe('ecg-0042.pdf')
})

test('the ZIP uses the original name, without a path or extension', () => {
  expect(zipFileName('report-ecg.pdf')).toBe('report-ecg-anonymized.zip')
  expect(zipFileName('Report ECG.PDF')).toBe('Report-ECG-anonymized.zip')
  expect(zipFileName('folder/march ecg.pdf')).toBe('march-ecg-anonymized.zip')
  expect(zipFileName('C:\\downloads\\shift.12.pdf')).toBe('shift.12-anonymized.zip')
  expect(zipFileName('   .pdf')).toBe('report-anonymized.zip')
})
