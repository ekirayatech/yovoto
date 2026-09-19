export interface LegalArticle {
  code: string;
  title: string;
  entity: string;
  summary: string;
  keyPoints: string[];
  applicability: string;
}

export const COLOMBIAN_NORMATIVE: LegalArticle[] = [
  {
    code: 'Ley 115 de 1994 - Art. 142',
    title: 'Conformación del Gobierno Escolar',
    entity: 'Congreso de la República de Colombia',
    summary: 'Cada establecimiento educativo del Estado tendrá un Gobierno Escolar conformado por el Rector, el Consejo Directivo y el Consejo Académico, garantizando la participación de toda la comunidad educativa.',
    keyPoints: [
      'Participación democrática activa de estudiantes, docentes y directivos',
      'El Consejo Directivo cuenta con un representante de los estudiantes del último año',
      'Obligatoriedad en colegios públicos y privados de Colombia'
    ],
    applicability: 'Gobierno Escolar y Representación ante el Consejo Directivo'
  },
  {
    code: 'Decreto 1860 de 1994 - Art. 28',
    title: 'Personero de los Estudiantes',
    entity: 'Ministerio de Educación Nacional',
    summary: 'En todos los establecimientos educativos el personero de los estudiantes será un alumno que curse el último grado que ofrezca la institución, encargado de promover el ejercicio de los deberes y derechos de los estudiantes consagrados en la Constitución Política, las leyes y el Manual de Convivencia.',
    keyPoints: [
      'Debe ser elegido dentro de los treinta (30) días calendario siguientes a la iniciación de clases',
      'Votación secreta y universal por el sistema de mayoría simple',
      'El ejercicio del cargo de personero de los estudiantes es incompatible con el de representante de los estudiantes ante el Consejo Directivo'
    ],
    applicability: 'Elección de Personero(a) Estudiantil'
  },
  {
    code: 'Ley 2195 de 2022 y Ordenanzas',
    title: 'Contraloría Escolar y Veeduría Estudiantil',
    entity: 'Contraloría General y Entes Territoriales',
    summary: 'Instituye la figura del Contralor Estudiantil para promover la rendición de cuentas, la transparencia y el cuidado de los recursos públicos institucionales (Fondos de Servicios Educativos, PAE, infraestructura).',
    keyPoints: [
      'Elegido democráticamente por el censo electoral estudiantil',
      'Veeduría ciudadana y fomento de la cultura de la legalidad',
      'Articulación con las Contralorías Municipales o Departamentales'
    ],
    applicability: 'Elección de Contralor(a) Estudiantil'
  },
  {
    code: 'Art. 258 Constitución Política',
    title: 'Principio del Voto Secreto y Universal',
    entity: 'Asamblea Nacional Constituyente',
    summary: 'El voto es un derecho y un deber ciudadano. La ley garantizará el secreto del voto en recintos individuales y la transparencia mediante sistemas de verificación y conteo público.',
    keyPoints: [
      'Garantía absoluta de anonimato: la identidad del sufragante nunca queda vinculada a su voto',
      'Verificación biométrica o documental previa en la mesa electoral',
      'Publicidad y transparencia inmediata de los resultados'
    ],
    applicability: 'Cifrado y anonimización de extremo a extremo'
  },
  {
    code: 'Formulario E-14 y E-24',
    title: 'Actas de Escrutinio de Mesa y General',
    entity: 'Adaptación de Normas Registraduría Nacional',
    summary: 'Modelos de actas oficiales donde los jurados de votación registran el número de sufragantes, votos válidos por candidato, votos en blanco y observaciones, con firma obligatoria de los jurados de mesa.',
    keyPoints: [
      'Acta E-14: Escrutinio inmediato al cierre de cada mesa receptora',
      'Acta E-24: Consolidación final por la Comisión Escrutadora Institucional (Rector y Docente Líder de Democracia)',
      'Firma y constancia física/digital inmutable'
    ],
    applicability: 'Generación de Actas Oficiales y Auditoría'
  }
];
