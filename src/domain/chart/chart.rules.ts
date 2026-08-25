type FurcationSites = {
  buccal: number
  palatal?: number
  lingual?: number
}

export const isUpperTooth = (id: number | string) => {
  const idNum = Number(id)
  return (idNum >= 11 && idNum <= 18) || (idNum >= 21 && idNum <= 28)
}

export const getFurcationSites = (id: number | string): FurcationSites => {
  const idNum = Number(id)

  // Upper molars (18, 17, 16, 26, 27, 28): 3 roots (MB, DB, Palatal) -> buccal furcation 1, palatal furcation 2
  if ([18, 17, 16, 26, 27, 28].includes(idNum)) return { buccal: 1, palatal: 2 }

  // Lower molars (48, 47, 46, 38, 37, 36): 2 roots (Mesial, Distal) -> buccal + lingual furcation 1 each
  if ([48, 47, 46, 38, 37, 36].includes(idNum)) return { buccal: 1, lingual: 1 }

  // All other teeth (including premolars 14, 24, 34, 44) are typically single-rooted, no furcation
  return { buccal: 0, palatal: 0, lingual: 0 }
}
