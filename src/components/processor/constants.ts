export const mutationTypes = [
  { id: "missense", label: "Missense", format: "[rsID]  Protein_ID:p.RefPosAlt", placeholder: "NP_000123.1:p.Arg175His", description: "Single amino acid substitution (Protein HGVS)" },
  { id: "indel", label: "Indel", format: "[rsID]  Protein_ID:p.RefPosdel/ins", placeholder: "NP_000123.1:p.Arg45del", description: "In-frame insertion or deletion (Protein HGVS)" },
  { id: "frameshift", label: "Frameshift", format: "[rsID]  Transcript_ID:c.Posdel/ins", placeholder: "NM_000123.3:c.102del", description: "Reading frame disruption (cDNA HGVS)" },
  { id: "stoploss", label: "Stop-loss", format: "[rsID]  Transcript_ID:c.PosRef>Alt", placeholder: "NM_000123.3:c.300T>C", description: "Stop codon mutation extending sequence (cDNA HGVS)" },
];
