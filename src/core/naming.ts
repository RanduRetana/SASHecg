/** At least three digits, wider when the document itself needs it. */
export function pageFileName(pageNumber: number, pageCount: number): string {
  const safePage = Math.max(1, Math.floor(pageNumber))
  const width = Math.max(3, String(Math.max(1, Math.floor(pageCount))).length)
  return `ecg-${String(safePage).padStart(width, '0')}.pdf`
}

export function zipFileName(originalName: string): string {
  const leaf = originalName.split(/[/\\]/).pop() ?? originalName
  const stripped = leaf.replace(/\.pdf$/i, '')
  const cleaned = stripped
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
  const base = cleaned || 'informe'
  return `${base}-anonimizado.zip`
}
