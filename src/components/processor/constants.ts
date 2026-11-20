export const mutationTypes = [
  {
    id: "missense",
    label: "Missense",
    format: "[rsID]  Protein_ID:p.RefPosAlt",
    placeholder: "NP_000537.3:p.Arg175His",
    description: "Single amino acid substitution (Protein HGVS)"
  },
  {
    id: "indel",
    label: "Indel",
    format: "[rsID]  Protein_ID:p.RefPosdel/ins",
    placeholder: "NP_000537.3:p.Glu258del",
    description: "In-frame insertion or deletion (Protein HGVS)"
  },
  {
    id: "frameshift",
    label: "Frameshift",
    format: "[rsID]  Transcript_ID:c.Posdel/ins",
    placeholder: "NM_000546.6:c.524del",
    description: "Reading frame disruption (cDNA HGVS)"
  },
  {
    id: "stoploss",
    label: "Stop-loss",
    format: "[rsID]  Transcript_ID:c.PosRef>Alt",
    placeholder: "NM_000546.6:c.1180T>C",
    description: "Stop codon mutation extending sequence (cDNA HGVS)"
  },
];
