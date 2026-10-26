/** Source checks annotate canonical DBNs; they do not create additional schools. */
export const LANGUAGE_CHECKED = '2026-10-25';
export const LANGUAGE_DIRECTORY_SOURCE = 'https://infohub.nyced.org/in-our-schools/programs/english-language-learners-programs-and-services';
export const LANGUAGE_EVIDENCE: Array<{dbn:string;language:string;source:string;scope:string}> = [
  {dbn:'01M020',language:'Spanish',source:LANGUAGE_DIRECTORY_SOURCE,scope:'Official listing: dual-language bilingual education; elementary school category'},
  {dbn:'01M332',language:'Spanish',source:LANGUAGE_DIRECTORY_SOURCE,scope:'Official listing: dual-language bilingual education; middle-school category'},
  {dbn:'02M001',language:'Spanish',source:LANGUAGE_DIRECTORY_SOURCE,scope:'Official listing: dual-language bilingual education; elementary school category'},
  {dbn:'01M184',language:'Mandarin',source:'https://www.ps184m.org/',scope:'School mission explicitly describes English/Mandarin immersive dual-language instruction; NYCPS lists K–8 school category'},
];
export const languageEvidenceFor = (dbn:string, language?:string) => LANGUAGE_EVIDENCE.filter(r=>r.dbn===dbn && (!language || r.language.toLowerCase()===language.toLowerCase()));
