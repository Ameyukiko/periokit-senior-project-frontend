








export const calculateCALValue = (
  pd: string | number,
  rec: string | number,
): number => {
  const p = parseInt(String(pd)) || 0;
  const r = parseInt(String(rec)) || 0;
  return p + r;
};




export const calculatePrognosisMN = (data: any): string => {
  if (!data || data.cut || data.extracted) return "N/A";
  if (data.implant) return "Good (Fixed)";


  const buccalCAL = data.buccal?.cal || [];
  const lingualCAL = data.lingual?.cal || [];
  const allCAL = [...buccalCAL, ...lingualCAL].map(
    (v) => parseInt(String(v)) || 0,
  );
  const maxCAL = allCAL.length > 0 ? Math.max(...allCAL) : 0;


  const allFur = [
    ...(data.fur?.buccal || []),
    ...(data.fur?.lingual || []),
  ].map((v) => parseInt(String(v)) || 0);
  const maxFur = allFur.length > 0 ? Math.max(0, ...allFur) : 0;


  const mobility = parseInt(String(data.mo)) || 0;


  if (maxCAL > 8 || mobility >= 3) return "Hopeless";
  if (maxCAL > 6 || maxFur >= 2 || mobility >= 2) return "Questionable";
  if (maxCAL > 5 || maxFur === 2) return "Poor";
  if (maxCAL >= 4 || maxFur === 1) return "Fair";

  return "Good";
};




export const calculatePrognosisKC = (data: any): string => {
  if (!data || data.cut || data.extracted) return "N/A";
  if (data.implant) return "Favorable";

  const mn = calculatePrognosisMN(data);

  switch (mn) {
    case "Good":
    case "Fair":
      return "Favorable";
    case "Poor":
      return "Questionable";
    case "Questionable":
      return "Unfavorable";
    case "Hopeless":
      return "Hopeless";
    default:
      return "Favorable";
  }
};




export const calculatePercentage = (active: number, total: number): string => {
  if (total === 0) return "0%";
  return `${Math.round((active / total) * 100)}%`;
};




export const calculateToothBopPercentage = (data: any): string => {
  if (!data || data.cut || data.extracted) return "0%";
  const buccalBop = data.buccal?.bop || [];
  const lingualBop = data.lingual?.bop || [];
  const activeCount = [...buccalBop, ...lingualBop].filter(
    (v) => v === true,
  ).length;
  return calculatePercentage(activeCount, 6);
};




export const calculateToothPiPercentage = (data: any): string => {
  if (!data || data.cut || data.extracted) return "0%";
  const buccalPi = data.buccal?.pi || [];
  const lingualPi = data.lingual?.pi || [];
  const activeCount = [...buccalPi, ...lingualPi].filter(
    (v) => v === true,
  ).length;
  return calculatePercentage(activeCount, 6);
};




export const getSafePDValues = (pdArray: any[]): string[] => {
  if (!Array.isArray(pdArray)) return ["0", "0", "0"];
  return pdArray.map((v) =>
    v !== null && v !== undefined && v !== "" ? String(v) : "0",
  );
};




export const getSafeCALValues = (calArray: any[]): string[] => {
  if (!Array.isArray(calArray)) return ["0", "0", "0"];
  return calArray.map((v) =>
    v !== null && v !== undefined && v !== "" ? String(v) : "0",
  );
};
