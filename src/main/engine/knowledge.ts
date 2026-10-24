import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ModelId, Surface } from '@shared/catalog'
import { knowledgeDir } from '../config'

// Kartlar her istekte diskten okunur: knowledge/ altındaki bir düzenleme bir sonraki istekte geçerli olur.
export function card(path: string): string {
  return readFileSync(join(knowledgeDir(), path), 'utf8').trim()
}

export const targetCard = (model: ModelId) => card(`targets/${model}.md`)
export const surfaceCard = (surface: Surface) => card(`surfaces/${surface}.md`)
