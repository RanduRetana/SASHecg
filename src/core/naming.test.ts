import { expect, test } from 'bun:test'
import { pageFileName, zipFileName } from './naming'

test('los nombres de página son estables y con al menos tres dígitos', () => {
  expect(pageFileName(1, 100)).toBe('ecg-001.pdf')
  expect(pageFileName(12, 20)).toBe('ecg-012.pdf')
  expect(pageFileName(100, 100)).toBe('ecg-100.pdf')
  expect(pageFileName(1, 1000)).toBe('ecg-0001.pdf')
  expect(pageFileName(42, 1000)).toBe('ecg-0042.pdf')
})

test('el ZIP usa el nombre original, sin ruta ni extensión', () => {
  expect(zipFileName('informe-ecg.pdf')).toBe('informe-ecg-anonimizado.zip')
  expect(zipFileName('Informe ECG.PDF')).toBe('Informe-ECG-anonimizado.zip')
  expect(zipFileName('carpeta/electrocardiograma marzo.pdf')).toBe('electrocardiograma-marzo-anonimizado.zip')
  expect(zipFileName('C:\\descargas\\turno.12.pdf')).toBe('turno.12-anonimizado.zip')
  expect(zipFileName('   .pdf')).toBe('informe-anonimizado.zip')
})
