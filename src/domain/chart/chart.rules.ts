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


  if ([18, 17, 16, 26, 27, 28].includes(idNum)) return { buccal: 1, palatal: 2 }


  if ([48, 47, 46, 38, 37, 36].includes(idNum)) return { buccal: 1, lingual: 1 }


  return { buccal: 0, palatal: 0, lingual: 0 }
}
