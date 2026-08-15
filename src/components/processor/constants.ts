export const mutationTypes = [
  {
    id: "missense",
    label: "Missense",
    format: "[rsID]  Protein_ID:p.RefPosAlt",
    placeholder: "NP_000537.3:p.Arg175His",
    sampleInput: "NP_000537.3:p.Arg175His\nNP_000537.3:p.Arg248Trp\nNP_000537.3:p.Pro72Arg",
    description: "Single amino acid substitution (Protein HGVS)"
  },
  {
    id: "indel",
    label: "Indel",
    format: "[rsID]  Protein_ID:p.RefPosdel/ins",
    placeholder: "NP_000537.3:p.Glu258del",
    sampleInput: "NP_000537.3:p.Glu258del\nNP_000537.3:p.Pro177_His178insGly",
    description: "In-frame insertion or deletion (Protein HGVS)"
  },
  {
    id: "frameshift",
    label: "Frameshift",
    format: "[rsID]  Transcript_ID:c.Posdel/ins",
    placeholder: "NM_000546.6:c.524del",
    sampleInput: "NM_000546.6:c.524del\nNM_000546.6:c.743dup",
    description: "Reading frame disruption (cDNA HGVS)"
  },
  {
    id: "stoploss",
    label: "Stop-loss",
    format: "[rsID]  Transcript_ID:c.PosRef>Alt",
    placeholder: "NM_000546.6:c.1180T>C",
    sampleInput: "NM_000546.6:c.1180T>C",
    description: "Stop codon mutation extending sequence (cDNA HGVS)"
  },
];
